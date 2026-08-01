'use strict';

const fs = require('fs');

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows) {
  const header = ['Nom/Chemin', 'Catégorie', 'Tags', 'Compat.', 'Taille', 'Statut', 'Modifié'];
  const lines = [header.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push([
      r.rel, r.category, (r.tags || []).join('; '), r.compat || '', r.sizeLabel, r.status, r.mtimeLabel,
    ].map(csvEscape).join(','));
  }
  return lines.join('\r\n');
}

function writeCsv(filePath, rows) {
  // UTF-8 BOM so Excel renders accented characters correctly.
  fs.writeFileSync(filePath, '﻿' + rowsToCsv(rows), 'utf8');
}

module.exports = { writeCsv };
