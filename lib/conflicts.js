'use strict';

const { readPackageIndex, resourceKey } = require('./dbpf');

// Flags .package files that define the same internal resource key (same
// type/group/instance). This is a technical-key comparison, not real game
// tuning-rule analysis - see LISEZMOI.md.
function findConflicts(files, limit = 300) {
  const packageFiles = files.filter((f) => f.toLowerCase().endsWith('.package'));
  const byKey = new Map();

  for (const full of packageFiles) {
    let entries;
    try { entries = readPackageIndex(full); } catch { continue; }
    const seenInThisFile = new Set();
    for (const entry of entries) {
      const key = resourceKey(entry);
      if (seenInThisFile.has(key)) continue;
      seenInThisFile.add(key);
      if (!byKey.has(key)) byKey.set(key, new Set());
      byKey.get(key).add(full);
    }
  }

  const groups = [];
  for (const fileSet of byKey.values()) {
    if (fileSet.size > 1) {
      groups.push({ files: [...fileSet] });
      if (groups.length >= limit) break;
    }
  }
  return groups;
}

module.exports = { findConflicts };
