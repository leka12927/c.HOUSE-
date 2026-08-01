'use strict';

const fs = require('fs');
const path = require('path');
const { humanSize, formatDate } = require('./format');

const MOD_EXTENSIONS = ['.package', '.ts4script'];
const DISABLED_SUFFIX = '.disabled';

const CATEGORY_KEYWORDS = [
  ['Cheveux', ['hair', 'cheveux', 'coiffure', 'wig']],
  ['Peau', ['skin', 'peau', 'skinblend', 'overlay']],
  ['Vêtements', ['cloth', 'outfit', 'dress', 'shirt', 'pant', 'vetement', 'vêtement', 'top', 'jacket', 'sweater']],
  ['Chaussures', ['shoe', 'chaussure', 'boot', 'sneaker', 'heel', 'sandal']],
  ['Maquillage', ['makeup', 'maquillage', 'lipstick', 'blush', 'eyeliner', 'eyeshadow']],
  ['Tatouages', ['tattoo', 'tatouage']],
  ['Yeux', ['eye', 'yeux', 'iris', 'lens']],
  ['Bijoux', ['jewelry', 'jewellery', 'bijou', 'earring', 'necklace', 'ring', 'bracelet']],
];

function guessCategory(name) {
  const low = name.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => low.includes(k))) return category;
  }
  return 'Autre';
}

function realExt(fileName) {
  let name = fileName;
  let disabled = false;
  if (name.toLowerCase().endsWith(DISABLED_SUFFIX)) {
    disabled = true;
    name = name.slice(0, -DISABLED_SUFFIX.length);
  }
  return { ext: path.extname(name).toLowerCase(), disabled };
}

function isModFile(fileName) {
  const { ext } = realExt(fileName);
  return MOD_EXTENSIONS.includes(ext);
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && isModFile(entry.name)) out.push(full);
  }
}

function scanMods(folder, notes) {
  if (!folder || !fs.existsSync(folder)) return { exists: false, rows: [] };
  const files = [];
  walk(folder, files);
  const rows = files.map((full) => {
    const rel = path.relative(folder, full);
    const { ext, disabled } = realExt(path.basename(full));
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      stat = { size: 0, mtimeMs: 0 };
    }
    const key = rel.split(path.sep).join('/');
    const meta = (notes && notes[key]) || {};
    return {
      full,
      rel,
      ext,
      category: guessCategory(rel),
      tags: meta.tags || [],
      note: meta.note || '',
      size: stat.size,
      sizeLabel: humanSize(stat.size),
      status: disabled ? 'Désactivé' : 'Activé',
      mtimeMs: stat.mtimeMs,
      mtimeLabel: formatDate(stat.mtimeMs),
      compat: '',
    };
  });
  return { exists: true, rows };
}

module.exports = { scanMods, isModFile, realExt, MOD_EXTENSIONS, DISABLED_SUFFIX };
