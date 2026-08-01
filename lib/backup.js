'use strict';

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');

function countFiles(dir) {
  let count = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else count++;
    }
  }
  return count;
}

function backupFolderToZip(sourceFolder, destZipPath, onProgress) {
  return new Promise((resolve, reject) => {
    const total = countFiles(sourceFolder);
    let done = 0;
    const output = fs.createWriteStream(destZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(destZipPath));
    archive.on('error', reject);
    archive.on('entry', () => {
      done++;
      if (onProgress) onProgress(done, total);
    });

    archive.pipe(output);
    archive.directory(sourceFolder, false);
    archive.finalize();
  });
}

// Extracts a zip that may come from anywhere the user picks, so guard
// against zip-slip (entries whose path climbs out of destFolder via "..").
async function restoreZipToFolder(zipPath, destFolder, onProgress) {
  const directory = await unzipper.Open.file(zipPath);
  const resolvedDest = path.resolve(destFolder);
  fs.mkdirSync(resolvedDest, { recursive: true });

  const fileEntries = directory.files.filter((f) => f.type === 'File');
  const total = fileEntries.length;
  let done = 0;

  for (const file of directory.files) {
    const target = path.resolve(resolvedDest, file.path);
    if (target !== resolvedDest && !target.startsWith(resolvedDest + path.sep)) {
      continue; // unsafe entry, skip
    }
    if (file.type === 'Directory') {
      fs.mkdirSync(target, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await new Promise((resolve, reject) => {
      file.stream()
        .pipe(fs.createWriteStream(target))
        .on('finish', resolve)
        .on('error', reject);
    });
    done++;
    if (onProgress) onProgress(done, total);
  }
  return done;
}

module.exports = { backupFolderToZip, restoreZipToFolder };
