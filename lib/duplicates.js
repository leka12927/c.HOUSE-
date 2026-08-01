'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { humanSize } = require('./format');

function hashFile(fullPath) {
  const buf = fs.readFileSync(fullPath);
  return crypto.createHash('sha1').update(buf).digest('hex');
}

// Groups files first by size (cheap), then by content hash within each
// size bucket (only reading bytes when a size collision actually occurs).
function findDuplicates(files) {
  const bySize = new Map();
  for (const full of files) {
    let size;
    try { size = fs.statSync(full).size; } catch { continue; }
    if (!bySize.has(size)) bySize.set(size, []);
    bySize.get(size).push(full);
  }

  const groups = [];
  for (const [size, candidates] of bySize) {
    if (candidates.length < 2) continue;
    const byHash = new Map();
    for (const full of candidates) {
      let hash;
      try { hash = hashFile(full); } catch { continue; }
      if (!byHash.has(hash)) byHash.set(hash, []);
      byHash.get(hash).push(full);
    }
    for (const groupFiles of byHash.values()) {
      if (groupFiles.length > 1) groups.push({ files: groupFiles, size, sizeLabel: humanSize(size) });
    }
  }
  return groups;
}

module.exports = { findDuplicates };
