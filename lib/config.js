'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

function defaultModsFolder() {
  return path.join(os.homedir(), 'Documents', 'Electronic Arts', 'The Sims 4', 'Mods');
}
function defaultTrayFolder() {
  return path.join(os.homedir(), 'Documents', 'Electronic Arts', 'The Sims 4', 'Tray');
}

const DEFAULTS = () => ({
  modsFolder: defaultModsFolder(),
  trayFolder: defaultTrayFolder(),
  theme: 'light',
  patchDate: '',
  autoCheckUpdates: false,
  notes: {},
  updates: [],
});

let cache = null;

function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function load() {
  if (cache) return cache;
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch {
    stored = {};
  }
  cache = { ...DEFAULTS(), ...stored };
  return cache;
}

function save() {
  const file = configPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cache, null, 2), 'utf8');
}

function get() {
  return load();
}

function set(partial) {
  load();
  Object.assign(cache, partial);
  save();
  return cache;
}

module.exports = { get, set, configPath };
