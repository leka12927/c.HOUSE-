'use strict';

// Best-effort reader for the DBPF package format used by The Sims 4 (.package
// files). Only what's needed for this app is implemented: the header, the
// resource index table, and zlib-compressed resource bytes. Other
// compression schemes (e.g. RefPack) are not handled and simply yield no
// result - callers must treat every function here as "may return nothing".

const fs = require('fs');
const zlib = require('zlib');

const HEADER_SIZE = 96;

function parseHeader(buf) {
  if (buf.length < HEADER_SIZE || buf.toString('ascii', 0, 4) !== 'DBPF') return null;
  return {
    indexEntryCount: buf.readUInt32LE(0x24),
    indexSize: buf.readUInt32LE(0x2c),
    indexOffset: buf.readUInt32LE(0x40),
  };
}

function parseIndexEntries(buf, count) {
  const entries = [];
  const end = buf.length;
  let pos = 0;
  if (pos + 4 > end) return entries;

  const flags = buf.readUInt32LE(pos); pos += 4;
  let constType = null, constGroup = null, constInstHi = null;
  if (flags & 0x1) { constType = buf.readUInt32LE(pos); pos += 4; }
  if (flags & 0x2) { constGroup = buf.readUInt32LE(pos); pos += 4; }
  if (flags & 0x4) { constInstHi = buf.readUInt32LE(pos); pos += 4; }

  for (let i = 0; i < count && pos + 4 <= end; i++) {
    let type = constType, group = constGroup, instHi = constInstHi;
    if (constType === null) { if (pos + 4 > end) break; type = buf.readUInt32LE(pos); pos += 4; }
    if (constGroup === null) { if (pos + 4 > end) break; group = buf.readUInt32LE(pos); pos += 4; }
    if (constInstHi === null) { if (pos + 4 > end) break; instHi = buf.readUInt32LE(pos); pos += 4; }
    if (pos + 12 > end) break;
    const instLo = buf.readUInt32LE(pos); pos += 4;
    const offset = buf.readUInt32LE(pos); pos += 4;
    const sizeAndFlag = buf.readUInt32LE(pos); pos += 4;
    const size = sizeAndFlag & 0x7fffffff;
    const compressed = (sizeAndFlag & 0x80000000) !== 0;
    let compressionType = 0;
    if (compressed) {
      if (pos + 8 > end) break;
      pos += 4; // decompressed size, unused here
      compressionType = buf.readUInt16LE(pos); pos += 2;
      pos += 2; // "committed" field, unused
    }
    entries.push({ type, group, instanceHigh: instHi, instanceLow: instLo, offset, size, compressed, compressionType });
  }
  return entries;
}

function readPackageIndex(packagePath) {
  let fd;
  try {
    fd = fs.openSync(packagePath, 'r');
    const headerBuf = Buffer.alloc(HEADER_SIZE);
    fs.readSync(fd, headerBuf, 0, HEADER_SIZE, 0);
    const header = parseHeader(headerBuf);
    if (!header || !header.indexSize || !header.indexEntryCount) return [];
    const indexBuf = Buffer.alloc(header.indexSize);
    fs.readSync(fd, indexBuf, 0, header.indexSize, header.indexOffset);
    return parseIndexEntries(indexBuf, header.indexEntryCount);
  } catch {
    return [];
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* ignore */ } }
  }
}

function resourceKey(entry) {
  return `${entry.type.toString(16)}-${entry.group.toString(16)}-${entry.instanceHigh.toString(16)}-${entry.instanceLow.toString(16)}`;
}

// Known thumbnail-ish resource types (CASP thumbnails, catalog thumbnails).
const THUMBNAIL_TYPES = new Set([0x3c1af1f2, 0x2c1fd8a1, 0x0580a2fd]);
const MAX_CANDIDATE_RESOURCES = 20;
const MAX_RESOURCE_READ_BYTES = 8 * 1024 * 1024;

function readResourceBytes(packagePath, entry) {
  let fd;
  try {
    fd = fs.openSync(packagePath, 'r');
    const raw = Buffer.alloc(entry.size);
    fs.readSync(fd, raw, 0, entry.size, entry.offset);
    if (!entry.compressed) return raw;
    if (entry.compressionType === 0x5a42) { // zlib ("ZB")
      try { return zlib.inflateSync(raw); } catch { return null; }
    }
    return null; // unhandled compression scheme
  } catch {
    return null;
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* ignore */ } }
  }
}

function findImageSignature(data) {
  if (!data) return null;
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let idx = data.indexOf(pngSig);
  if (idx !== -1) return { mime: 'image/png', buf: data.subarray(idx) };
  idx = data.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
  if (idx !== -1) return { mime: 'image/jpeg', buf: data.subarray(idx) };
  return null;
}

function extractThumbnail(packagePath) {
  const entries = readPackageIndex(packagePath);
  if (!entries.length) return null;
  const candidates = entries.filter((e) => THUMBNAIL_TYPES.has(e.type));
  const pool = (candidates.length ? candidates : entries).slice(0, MAX_CANDIDATE_RESOURCES);
  for (const entry of pool) {
    if (!entry.size || entry.size > MAX_RESOURCE_READ_BYTES) continue;
    const found = findImageSignature(readResourceBytes(packagePath, entry));
    if (found) return `data:${found.mime};base64,${found.buf.toString('base64')}`;
  }
  return null;
}

module.exports = { readPackageIndex, resourceKey, extractThumbnail };
