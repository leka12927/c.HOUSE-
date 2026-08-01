'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { scanMods } = require('./modsScan');
const { toggleMany } = require('./toggle');

function statePath() {
  return path.join(app.getPath('userData'), 'dichotomy-state.json');
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), 'utf8'));
  } catch {
    return null;
  }
}

function saveState(state) {
  fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), 'utf8');
}

function clearState() {
  try { fs.unlinkSync(statePath()); } catch { /* nothing to clear */ }
}

function splitHalf(pool) {
  const half = Math.ceil(pool.length / 2);
  return { testGroup: pool.slice(0, half), otherHalf: pool.slice(half) };
}

function publicState(state) {
  if (!state) return null;
  return { pool: state.pool, testGroup: state.testGroup };
}

function start(modsFolder, notes) {
  const { exists, rows } = scanMods(modsFolder, notes || {});
  if (!exists) return { error: "Le dossier Mods n'existe pas." };
  const basePool = rows.filter((r) => r.status === 'Activé').map((r) => r.full);
  if (basePool.length < 2) {
    return { error: 'Il faut au moins 2 mods actifs pour lancer cet assistant.' };
  }
  const { testGroup, otherHalf } = splitHalf(basePool);
  toggleMany(testGroup, false);
  toggleMany(otherHalf, true);
  const state = { modsFolder, basePool, pool: basePool, testGroup, otherHalf };
  saveState(state);
  return publicState(state);
}

function getState() {
  return publicState(loadState());
}

function cancel() {
  const state = loadState();
  if (state) {
    toggleMany(state.basePool, true);
    clearState();
  }
  return {};
}

function report(persists) {
  const state = loadState();
  if (!state) return { error: 'Aucune session en cours.' };

  let newPool;
  if (persists) {
    // Disabling testGroup didn't fix it: the culprit is still enabled, in otherHalf.
    newPool = state.otherHalf;
    toggleMany(state.testGroup, true);
  } else {
    // The problem went away: the culprit was in the disabled testGroup.
    newPool = state.testGroup;
    toggleMany(state.otherHalf, true);
  }

  if (newPool.length <= 1) {
    const culprit = newPool[0] || null;
    const innocents = state.basePool.filter((p) => p !== culprit);
    toggleMany(innocents, true);
    if (culprit) toggleMany([culprit], false);
    clearState();
    return { finished: true, culprit: culprit ? path.basename(culprit) : null };
  }

  const { testGroup, otherHalf } = splitHalf(newPool);
  toggleMany(testGroup, false);
  toggleMany(otherHalf, true);
  const nextState = { ...state, pool: newPool, testGroup, otherHalf };
  saveState(nextState);
  return { finished: false, ...publicState(nextState) };
}

module.exports = { start, getState, cancel, report };
