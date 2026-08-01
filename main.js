'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const config = require('./lib/config');
const { scanMods } = require('./lib/modsScan');
const { toggleMany } = require('./lib/toggle');
const { findDuplicates } = require('./lib/duplicates');
const { findConflicts } = require('./lib/conflicts');
const { extractThumbnail } = require('./lib/dbpf');
const { scanTray } = require('./lib/trayScan');
const dichotomy = require('./lib/dichotomy');
const { backupFolderToZip, restoreZipToFolder } = require('./lib/backup');
const { checkAll } = require('./lib/updates');
const { writeCsv } = require('./lib/csv');

function modFullPaths(rows) {
  return rows.map((r) => r.full);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------------------------------------------------------------
// Dossiers / configuration
// ---------------------------------------------------------------

ipcMain.handle('dialog:chooseFolder', async (_e, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: defaultPath && fs.existsSync(defaultPath) ? defaultPath : undefined,
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('config:get', () => config.get());
ipcMain.handle('config:set', (_e, partial) => config.set(partial));

// ---------------------------------------------------------------
// Mods
// ---------------------------------------------------------------

ipcMain.handle('mods:scan', (_e, folder) => scanMods(folder, config.get().notes));

ipcMain.handle('mods:toggle', (_e, { paths, enable }) => {
  toggleMany(paths, enable);
  return true;
});

ipcMain.handle('mods:disableFolder', (_e, folder) => {
  const { exists, rows } = scanMods(folder, config.get().notes);
  if (!exists) return 0;
  const targets = rows.filter((r) => r.status === 'Activé').map((r) => r.full);
  toggleMany(targets, false);
  return targets.length;
});

ipcMain.handle('mods:disableAll', (_e, folder) => {
  const { exists, rows } = scanMods(folder, config.get().notes);
  if (!exists) return 0;
  const targets = rows.filter((r) => r.status === 'Activé').map((r) => r.full);
  toggleMany(targets, false);
  return targets.length;
});

ipcMain.handle('mods:enableAll', (_e, folder) => {
  const { exists, rows } = scanMods(folder, config.get().notes);
  if (!exists) return 0;
  const targets = rows.filter((r) => r.status === 'Désactivé').map((r) => r.full);
  toggleMany(targets, true);
  return targets.length;
});

ipcMain.handle('mods:delete', (_e, paths) => {
  for (const p of paths) {
    try { fs.unlinkSync(p); } catch { /* already gone */ }
  }
  return true;
});

ipcMain.handle('mods:saveNote', (_e, { fullPath, note, tags }) => {
  const cfg = config.get();
  const key = path.relative(cfg.modsFolder, fullPath).split(path.sep).join('/');
  const notes = { ...cfg.notes };
  if (!note && (!tags || !tags.length)) delete notes[key];
  else notes[key] = { note, tags };
  config.set({ notes });
  return true;
});

ipcMain.handle('mods:thumbnail', (_e, packagePath) => extractThumbnail(packagePath));

ipcMain.handle('mods:openParent', (_e, target) => {
  try {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) shell.openPath(target);
    else shell.showItemInFolder(target);
  } catch { /* nothing we can do if it's gone */ }
  return true;
});

ipcMain.handle('mods:duplicates', (_e, folder) => {
  const { exists, rows } = scanMods(folder, config.get().notes);
  return exists ? findDuplicates(modFullPaths(rows)) : [];
});

ipcMain.handle('mods:conflicts', (_e, folder) => {
  const { exists, rows } = scanMods(folder, config.get().notes);
  return exists ? findConflicts(modFullPaths(rows)) : [];
});

ipcMain.handle('mods:bulkAddTag', (_e, { paths, tag }) => {
  const cfg = config.get();
  const notes = { ...cfg.notes };
  for (const p of paths) {
    const key = path.relative(cfg.modsFolder, p).split(path.sep).join('/');
    const existing = notes[key] || { note: '', tags: [] };
    const tags = new Set(existing.tags || []);
    tags.add(tag);
    notes[key] = { note: existing.note || '', tags: [...tags] };
  }
  config.set({ notes });
  return true;
});

ipcMain.handle('mods:exportCsv', async (_e, rows) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'mods.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (result.canceled || !result.filePath) return null;
  writeCsv(result.filePath, rows);
  return result.filePath;
});

ipcMain.handle('mods:backupZip', async (_e, folder) => {
  if (!folder || !fs.existsSync(folder)) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `sims4-mods-backup-${Date.now()}.zip`,
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await backupFolderToZip(folder, result.filePath, (done, total) => {
    mainWindow.webContents.send('backup:progress', { done, total });
  });
  return result.filePath;
});

ipcMain.handle('mods:restoreZip', async () => {
  const openResult = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  });
  if (openResult.canceled || !openResult.filePaths.length) return null;

  const destResult = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: config.get().modsFolder,
    title: 'Choisir le dossier de destination',
  });
  if (destResult.canceled || !destResult.filePaths.length) return null;

  const destDir = destResult.filePaths[0];
  const fileCount = await restoreZipToFolder(openResult.filePaths[0], destDir, (done, total) => {
    mainWindow.webContents.send('backup:progress', { done, total });
  });
  return { fileCount, destDir };
});

// ---------------------------------------------------------------
// Tray
// ---------------------------------------------------------------

ipcMain.handle('tray:scan', (_e, folder) => scanTray(folder));

ipcMain.handle('tray:deleteGroup', (_e, files) => {
  for (const f of files) {
    try { fs.unlinkSync(f); } catch { /* already gone */ }
  }
  return true;
});

ipcMain.handle('shell:openFolder', (_e, folder) => {
  shell.openPath(folder);
  return true;
});

// ---------------------------------------------------------------
// Assistant de dépannage par dichotomie
// ---------------------------------------------------------------

ipcMain.handle('dichotomy:getState', () => dichotomy.getState());
ipcMain.handle('dichotomy:start', (_e, modsFolder) => dichotomy.start(modsFolder, config.get().notes));
ipcMain.handle('dichotomy:report', (_e, persists) => dichotomy.report(persists));
ipcMain.handle('dichotomy:cancel', () => dichotomy.cancel());

// ---------------------------------------------------------------
// Mises à jour
// ---------------------------------------------------------------

ipcMain.handle('updates:list', () => config.get().updates);

ipcMain.handle('updates:add', (_e, entry) => {
  const updates = [...config.get().updates, entry];
  return config.set({ updates }).updates;
});

ipcMain.handle('updates:delete', (_e, ids) => {
  const idSet = new Set(ids);
  const updates = config.get().updates.filter((e) => !idSet.has(e.id));
  return config.set({ updates }).updates;
});

ipcMain.handle('updates:markSeen', (_e, ids) => {
  const idSet = new Set(ids);
  const updates = config.get().updates.map((e) => (
    idSet.has(e.id) ? { ...e, status: 'À jour', installedRef: e.lastSeen || e.installedRef } : e
  ));
  return config.set({ updates }).updates;
});

ipcMain.handle('updates:checkAll', async () => {
  const updates = await checkAll(config.get().updates);
  return config.set({ updates }).updates;
});

ipcMain.handle('updates:openLink', (_e, url) => {
  shell.openExternal(url);
  return true;
});
