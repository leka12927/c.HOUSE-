'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseFolder: (defaultPath) => ipcRenderer.invoke('dialog:chooseFolder', defaultPath),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (partial) => ipcRenderer.invoke('config:set', partial),

  scanMods: (folder) => ipcRenderer.invoke('mods:scan', folder),
  toggleMods: (paths, enable) => ipcRenderer.invoke('mods:toggle', { paths, enable }),
  disableFolder: (folder) => ipcRenderer.invoke('mods:disableFolder', folder),
  disableAll: (folder) => ipcRenderer.invoke('mods:disableAll', folder),
  enableAll: (folder) => ipcRenderer.invoke('mods:enableAll', folder),
  deleteMods: (paths) => ipcRenderer.invoke('mods:delete', paths),
  saveNote: (fullPath, note, tags) => ipcRenderer.invoke('mods:saveNote', { fullPath, note, tags }),
  getThumbnail: (packagePath) => ipcRenderer.invoke('mods:thumbnail', packagePath),
  openParent: (p) => ipcRenderer.invoke('mods:openParent', p),
  findDuplicates: (folder) => ipcRenderer.invoke('mods:duplicates', folder),
  findConflicts: (folder) => ipcRenderer.invoke('mods:conflicts', folder),
  bulkAddTag: (paths, tag) => ipcRenderer.invoke('mods:bulkAddTag', { paths, tag }),
  exportCsv: (rows) => ipcRenderer.invoke('mods:exportCsv', rows),
  backupZip: (folder) => ipcRenderer.invoke('mods:backupZip', folder),
  restoreZip: () => ipcRenderer.invoke('mods:restoreZip'),
  onBackupProgress: (cb) => ipcRenderer.on('backup:progress', (e, data) => cb(data)),

  scanTray: (folder) => ipcRenderer.invoke('tray:scan', folder),
  deleteTrayGroup: (files) => ipcRenderer.invoke('tray:deleteGroup', files),
  openFolder: (folder) => ipcRenderer.invoke('shell:openFolder', folder),

  dichotomyGetState: () => ipcRenderer.invoke('dichotomy:getState'),
  dichotomyStart: (modsFolder) => ipcRenderer.invoke('dichotomy:start', modsFolder),
  dichotomyReport: (persists) => ipcRenderer.invoke('dichotomy:report', persists),
  dichotomyCancel: () => ipcRenderer.invoke('dichotomy:cancel'),

  updatesList: () => ipcRenderer.invoke('updates:list'),
  updatesAdd: (entry) => ipcRenderer.invoke('updates:add', entry),
  updatesDelete: (ids) => ipcRenderer.invoke('updates:delete', ids),
  updatesMarkSeen: (ids) => ipcRenderer.invoke('updates:markSeen', ids),
  updatesCheckAll: () => ipcRenderer.invoke('updates:checkAll'),
  updatesOpenLink: (url) => ipcRenderer.invoke('updates:openLink', url),
});
