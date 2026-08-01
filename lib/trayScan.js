'use strict';

// The Sims 4 Tray on-disk format is undocumented by EA. This scanner groups
// files by their shared ID prefix and guesses a type from known extensions
// used by community modding tools. It's a best-effort heuristic, same spirit
// as the mod category/conflict detection - see LISEZMOI.md.

const fs = require('fs');
const path = require('path');
const { humanSize, formatDate } = require('./format');

const DATA_EXT_TYPE = {
  household: 'Ménage',
  hhi: 'Ménage',
  sgi: 'Sim',
  blueprint: 'Pièce / Terrain',
  bpi: 'Pièce / Terrain',
  room: 'Pièce',
  trayitem: 'Objet Tray',
};
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg']);

function baseKey(fileName) {
  const noExt = fileName.replace(/\.[^.]+$/, '');
  return noExt.replace(/_\d+$/, '');
}

function scanTray(folder) {
  if (!folder || !fs.existsSync(folder)) return { exists: false, groups: [] };
  let entries;
  try {
    entries = fs.readdirSync(folder, { withFileTypes: true }).filter((e) => e.isFile());
  } catch {
    return { exists: false, groups: [] };
  }

  const groups = new Map();
  for (const entry of entries) {
    const full = path.join(folder, entry.name);
    const base = baseKey(entry.name);
    const ext = path.extname(entry.name).slice(1).toLowerCase();
    if (!groups.has(base)) {
      groups.set(base, { base, files: [], exts: new Set(), size: 0, mtimeMs: 0, thumbnail: null });
    }
    const g = groups.get(base);
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    g.files.push(full);
    g.exts.add(ext);
    g.size += stat.size;
    g.mtimeMs = Math.max(g.mtimeMs, stat.mtimeMs);
    if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) g.thumbnail = full;
  }

  const result = [];
  for (const g of groups.values()) {
    let type = null;
    for (const ext of g.exts) {
      if (DATA_EXT_TYPE[ext]) { type = DATA_EXT_TYPE[ext]; break; }
    }
    if (!type) {
      const onlyImages = [...g.exts].every((e) => IMAGE_EXT.has('.' + e));
      type = onlyImages ? 'Orphelins' : 'Objet Tray';
    }
    result.push({
      base: g.base,
      type,
      files: g.files,
      size: g.size,
      sizeLabel: humanSize(g.size),
      mtimeMs: g.mtimeMs,
      mtimeLabel: formatDate(g.mtimeMs),
      thumbnail: g.thumbnail,
    });
  }
  return { exists: true, groups: result };
}

module.exports = { scanTray };
