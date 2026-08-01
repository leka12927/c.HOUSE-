'use strict';

const fs = require('fs');
const path = require('path');
const { realExt, DISABLED_SUFFIX } = require('./modsScan');

function toggleOne(fullPath, enable) {
  const { disabled } = realExt(path.basename(fullPath));
  if (enable && disabled) {
    const target = fullPath.slice(0, -DISABLED_SUFFIX.length);
    fs.renameSync(fullPath, target);
    return target;
  }
  if (!enable && !disabled) {
    const target = fullPath + DISABLED_SUFFIX;
    fs.renameSync(fullPath, target);
    return target;
  }
  return fullPath;
}

function toggleMany(paths, enable) {
  const results = [];
  for (const p of paths) {
    try {
      results.push(toggleOne(p, enable));
    } catch {
      results.push(p);
    }
  }
  return results;
}

module.exports = { toggleOne, toggleMany };
