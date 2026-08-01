'use strict';

const CATEGORIES = ['Cheveux', 'Peau', 'Vêtements', 'Chaussures', 'Maquillage',
  'Tatouages', 'Yeux', 'Bijoux', 'Autre'];
const PAGE_SIZE = 300;

const state = {
  config: {},
  mods: { rows: [], selected: new Set(), sort: { field: 'rel', dir: 1 }, visibleCount: PAGE_SIZE },
  tray: { groups: [], selected: null, sort: { field: 'base', dir: 1 } },
  updates: { entries: [], selected: new Set() },
};

function compareValues(a, b) {
  if (typeof a === 'string' || typeof b === 'string') {
    return String(a ?? '').localeCompare(String(b ?? ''), 'fr', { sensitivity: 'base' });
  }
  return (a ?? 0) - (b ?? 0);
}

function sortRows(rows, field, dir, valueOf) {
  const copy = rows.slice();
  copy.sort((a, b) => dir * compareValues(valueOf(a, field), valueOf(b, field)));
  return copy;
}

function wireSortableHeaders(tableId, sortState, onSort) {
  document.querySelectorAll(`#${tableId} thead th[data-field]`).forEach((th) => {
    th.addEventListener('click', () => {
      const field = th.dataset.field;
      if (sortState.field === field) sortState.dir *= -1;
      else { sortState.field = field; sortState.dir = 1; }
      onSort();
    });
  });
}

function updateSortIndicators(tableId, sortState) {
  document.querySelectorAll(`#${tableId} thead th[data-field]`).forEach((th) => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.field === sortState.field) {
      th.classList.add(sortState.dir === 1 ? 'sort-asc' : 'sort-desc');
    }
  });
}

// ---------------------------------------------------------------
// Onglets
// ---------------------------------------------------------------

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

function el(id) { return document.getElementById(id); }

// ---------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------

async function init() {
  state.config = await window.api.getConfig();
  applyTheme(state.config.theme === 'dark' ? 'dark' : 'light');
  el('mods-folder-label').textContent = state.config.modsFolder;
  el('tray-folder-label').textContent = state.config.trayFolder;
  el('patch-date').value = state.config.patchDate || '';
  el('updates-auto-check').checked = !!state.config.autoCheckUpdates;

  const catSelect = el('mods-cat-filter');
  for (const c of CATEGORIES) {
    const opt = document.createElement('option');
    opt.textContent = c;
    catSelect.appendChild(opt);
  }

  await refreshMods();
  await refreshTray();
  await refreshUpdates();

  if (state.config.autoCheckUpdates && state.updates.entries.length) {
    setTimeout(checkAllUpdates, 1200);
  }
}

// ---------------------------------------------------------------
// Onglet Mods
// ---------------------------------------------------------------

async function refreshMods() {
  const result = await window.api.scanMods(state.config.modsFolder);
  if (!result.exists) {
    el('mods-status').textContent = "Ce dossier n'existe pas. Clique sur 'Changer de dossier'.";
    state.mods.rows = [];
    renderModsTable();
    return;
  }
  state.mods.rows = result.rows;
  state.mods.visibleCount = PAGE_SIZE;
  applyCompatAnalysis();
  renderModsTable();
}

function applyCompatAnalysis() {
  const dateStr = (el('patch-date').value || '').trim();
  let epoch = null;
  if (dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) epoch = d.getTime();
  }
  for (const r of state.mods.rows) {
    r.compat = (epoch !== null && r.status === 'Activé' && r.mtimeMs < epoch) ? 'À vérifier' : '';
  }
}

function renderModsTable() {
  const search = el('mods-search').value.toLowerCase().trim();
  const cat = el('mods-cat-filter').value;
  const status = el('mods-status-filter').value;
  const compat = el('mods-compat-filter').value;

  let filtered = state.mods.rows.filter((r) => {
    if (search && !r.rel.toLowerCase().includes(search) && !(r.tags || []).join(',').toLowerCase().includes(search)) return false;
    if (cat !== 'Toute catégorie' && r.category !== cat) return false;
    if (status !== 'Tout statut' && r.status !== status) return false;
    if (compat === 'À vérifier' && r.compat !== 'À vérifier') return false;
    return true;
  });

  let total = filtered.length, enabled = 0, disabled = 0, totalSize = 0;
  for (const r of filtered) {
    totalSize += r.size;
    if (r.status === 'Activé') enabled++;
    else if (r.status === 'Désactivé') disabled++;
  }

  const { field, dir } = state.mods.sort;
  filtered = sortRows(filtered, field, dir, (r, f) => (f === 'tags' ? (r.tags || []).join(', ') : r[f]));
  updateSortIndicators('mods-table', state.mods.sort);

  const visible = filtered.slice(0, state.mods.visibleCount);
  const tbody = document.querySelector('#mods-table tbody');
  tbody.innerHTML = '';

  for (const r of visible) {
    const tr = document.createElement('tr');
    tr.dataset.full = r.full;
    if (state.mods.selected.has(r.full)) tr.classList.add('selected');
    const statusClass = r.status === 'Activé' ? 'status-active' : (r.status === 'Désactivé' ? 'status-disabled' : '');
    tr.innerHTML = `<td>${escapeHtml(r.rel)}</td><td>${escapeHtml(r.category)}</td>
      <td>${escapeHtml((r.tags || []).join(', '))}</td>
      <td class="${r.compat ? 'status-warn' : ''}">${escapeHtml(r.compat)}</td>
      <td>${escapeHtml(r.sizeLabel)}</td><td class="${statusClass}">${escapeHtml(r.status)}</td>
      <td>${escapeHtml(r.mtimeLabel)}</td>`;
    tr.addEventListener('click', (ev) => onModsRowClick(r.full, ev));
    tbody.appendChild(tr);
  }

  const loadMoreWrap = el('mods-load-more-wrap');
  const remaining = filtered.length - visible.length;
  if (remaining > 0) {
    loadMoreWrap.style.display = '';
    el('mods-load-more').textContent = `Afficher plus (${remaining} restant(s))`;
  } else {
    loadMoreWrap.style.display = 'none';
  }

  el('mods-status').textContent =
    `${total} fichier(s) affiché(s)  •  ${enabled} activé(s)  •  ${disabled} désactivé(s)  •  ${humanSize(totalSize)} au total`;
}

el('mods-load-more').addEventListener('click', () => {
  state.mods.visibleCount += PAGE_SIZE;
  renderModsTable();
});
wireSortableHeaders('mods-table', state.mods.sort, renderModsTable);

function onModsRowClick(full, ev) {
  if (!(ev.ctrlKey || ev.metaKey)) state.mods.selected.clear();
  if (state.mods.selected.has(full)) state.mods.selected.delete(full);
  else state.mods.selected.add(full);
  renderModsTable();
  if (state.mods.selected.size === 1) loadModPreview([...state.mods.selected][0]);
  else clearModPreview();
}

function clearModPreview() {
  el('mods-thumb').innerHTML = '(sélectionne un fichier)';
  el('mods-tags-input').value = '';
  el('mods-note-input').value = '';
}

async function loadModPreview(full) {
  const row = state.mods.rows.find((r) => r.full === full);
  el('mods-tags-input').value = row ? (row.tags || []).join(', ') : '';
  el('mods-note-input').value = row ? (row.note || '') : '';
  const thumbBox = el('mods-thumb');
  const category = row ? row.category : 'Autre';
  if (row && row.ext === '.package') {
    thumbBox.textContent = 'Chargement…';
    const dataUrl = await window.api.getThumbnail(full);
    if (dataUrl) setThumbImage(thumbBox, dataUrl);
    else thumbBox.innerHTML = thumbPlaceholder(category, category);
  } else {
    thumbBox.innerHTML = thumbPlaceholder(category, category);
  }
}

function setThumbImage(box, src) {
  const img = document.createElement('img');
  img.alt = 'miniature';
  img.src = src;
  box.replaceChildren(img);
}

el('mods-choose-folder').addEventListener('click', async () => {
  const folder = await window.api.chooseFolder(state.config.modsFolder);
  if (folder) {
    state.config.modsFolder = folder;
    await window.api.setConfig({ modsFolder: folder });
    el('mods-folder-label').textContent = folder;
    await refreshMods();
  }
});
el('mods-refresh').addEventListener('click', refreshMods);
el('mods-search').addEventListener('input', () => { state.mods.visibleCount = PAGE_SIZE; renderModsTable(); });
el('mods-cat-filter').addEventListener('change', () => { state.mods.visibleCount = PAGE_SIZE; renderModsTable(); });
el('mods-status-filter').addEventListener('change', () => { state.mods.visibleCount = PAGE_SIZE; renderModsTable(); });
el('mods-compat-filter').addEventListener('change', () => { state.mods.visibleCount = PAGE_SIZE; renderModsTable(); });

el('analyze-compat').addEventListener('click', async () => {
  state.config.patchDate = el('patch-date').value.trim();
  await window.api.setConfig({ patchDate: state.config.patchDate });
  applyCompatAnalysis();
  renderModsTable();
});

el('mods-save-note').addEventListener('click', async () => {
  const sel = [...state.mods.selected];
  if (sel.length !== 1) return;
  const tags = el('mods-tags-input').value.split(',').map((t) => t.trim()).filter(Boolean);
  const note = el('mods-note-input').value.trim();
  await window.api.saveNote(sel[0], note, tags);
  await refreshMods();
});

el('mods-enable').addEventListener('click', async () => {
  if (!state.mods.selected.size) return;
  await window.api.toggleMods([...state.mods.selected], true);
  await refreshMods();
});
el('mods-disable').addEventListener('click', async () => {
  if (!state.mods.selected.size) return;
  await window.api.toggleMods([...state.mods.selected], false);
  await refreshMods();
});
el('mods-delete').addEventListener('click', async () => {
  if (!state.mods.selected.size) return;
  if (!confirm(`Supprimer définitivement ${state.mods.selected.size} fichier(s) ? Cette action est irréversible.`)) return;
  await window.api.deleteMods([...state.mods.selected]);
  state.mods.selected.clear();
  await refreshMods();
});
el('mods-open-parent').addEventListener('click', async () => {
  const sel = [...state.mods.selected];
  const target = sel.length ? sel[0] : state.config.modsFolder;
  await window.api.openParent(target);
});
el('mods-disable-folder').addEventListener('click', async () => {
  const folder = await window.api.chooseFolder(state.config.modsFolder);
  if (!folder) return;
  const count = await window.api.disableFolder(folder);
  alert(`${count} fichier(s) désactivé(s) dans ce dossier.`);
  await refreshMods();
});
el('mods-disable-all').addEventListener('click', async () => {
  if (!confirm('Désactiver TOUS les mods actifs de ce dossier ? Utile pour isoler un problème.')) return;
  const count = await window.api.disableAll(state.config.modsFolder);
  alert(`${count} mod(s) désactivé(s).`);
  await refreshMods();
});
el('mods-enable-all').addEventListener('click', async () => {
  const count = await window.api.enableAll(state.config.modsFolder);
  alert(`${count} mod(s) réactivé(s).`);
  await refreshMods();
});
el('mods-export-csv').addEventListener('click', async () => {
  const savedPath = await window.api.exportCsv(state.mods.rows);
  if (savedPath) alert(`Liste exportée :\n${savedPath}`);
});
// Registered once: ipcRenderer.on has no unsubscribe exposed via preload, so
// re-registering this callback on every click would stack listeners and make
// old ones keep firing (and overwriting the label) on later backups/restores.
let activeProgressButton = null;
window.api.onBackupProgress(({ done, total }) => {
  if (!activeProgressButton) return;
  activeProgressButton.textContent = `${activeProgressButton.dataset.progressLabel} ${done}/${total}`;
});

el('mods-backup-zip').addEventListener('click', async () => {
  const btn = el('mods-backup-zip');
  const original = btn.textContent;
  btn.dataset.progressLabel = 'Sauvegarde…';
  btn.textContent = 'Sauvegarde en cours…';
  btn.disabled = true;
  activeProgressButton = btn;
  try {
    const savedPath = await window.api.backupZip(state.config.modsFolder);
    if (savedPath) alert(`Sauvegarde créée :\n${savedPath}`);
  } finally {
    activeProgressButton = null;
    btn.textContent = original;
    btn.disabled = false;
  }
});

// ---------------------------------------------------------------
// Doublons
// ---------------------------------------------------------------

let dupSelected = new Set();

el('mods-find-dup').addEventListener('click', async () => {
  showModal('modal-duplicates');
  el('dup-info').textContent = 'Recherche des doublons en cours…';
  document.querySelector('#dup-table tbody').innerHTML = '';
  dupSelected = new Set();
  const groups = await window.api.findDuplicates(state.config.modsFolder);
  renderDuplicates(groups);
});

function renderDuplicates(groups) {
  const tbody = document.querySelector('#dup-table tbody');
  tbody.innerHTML = '';
  if (!groups.length) {
    el('dup-info').textContent = 'Aucun doublon trouvé. 🎉';
    return;
  }
  let wasted = 0;
  for (const g of groups) {
    const trGroup = document.createElement('tr');
    trGroup.innerHTML = `<td colspan="2" style="color:#888">— Groupe de ${g.files.length} fichiers identiques —</td>`;
    tbody.appendChild(trGroup);
    for (const f of g.files) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(f)}</td><td>${escapeHtml(g.sizeLabel)}</td>`;
      tr.addEventListener('click', () => {
        if (dupSelected.has(f)) { dupSelected.delete(f); tr.classList.remove('selected'); }
        else { dupSelected.add(f); tr.classList.add('selected'); }
      });
      tbody.appendChild(tr);
    }
    wasted += g.size * (g.files.length - 1);
  }
  el('dup-info').textContent = `${groups.length} groupe(s) de doublons trouvé(s) • ~${humanSize(wasted)} récupérable(s) en gardant un exemplaire de chaque`;
}

el('dup-delete').addEventListener('click', async () => {
  if (!dupSelected.size) return;
  if (!confirm(`Supprimer ${dupSelected.size} fichier(s) sélectionné(s) ?`)) return;
  await window.api.deleteMods([...dupSelected]);
  await refreshMods();
  const groups = await window.api.findDuplicates(state.config.modsFolder);
  renderDuplicates(groups);
});
el('dup-close').addEventListener('click', () => hideModal('modal-duplicates'));

// -- Conflits entre mods --------------------------------------------------

el('mods-find-conflicts').addEventListener('click', async () => {
  showModal('modal-conflicts');
  el('conflicts-info').textContent = 'Analyse des ressources en cours…';
  document.querySelector('#conflicts-table tbody').innerHTML = '';
  const groups = await window.api.findConflicts(state.config.modsFolder);
  const tbody = document.querySelector('#conflicts-table tbody');
  tbody.innerHTML = '';
  if (!groups.length) {
    el('conflicts-info').textContent = 'Aucun conflit de ressource détecté. 🎉';
    return;
  }
  for (const g of groups) {
    const trGroup = document.createElement('tr');
    trGroup.innerHTML = `<td style="color:#888">— Groupe de ${g.files.length} fichiers en conflit —</td>`;
    tbody.appendChild(trGroup);
    for (const f of g.files) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(f)}</td>`;
      tbody.appendChild(tr);
    }
  }
  el('conflicts-info').textContent = `${groups.length} groupe(s) de conflits potentiels trouvé(s) (limité aux 300 premiers).`;
});
el('conflicts-close').addEventListener('click', () => hideModal('modal-conflicts'));

// -- Sauvegarde / restauration ---------------------------------------------

el('mods-restore-zip').addEventListener('click', async () => {
  const btn = el('mods-restore-zip');
  const original = btn.textContent;
  btn.dataset.progressLabel = 'Restauration…';
  btn.textContent = 'Restauration en cours…';
  btn.disabled = true;
  activeProgressButton = btn;
  try {
    const result = await window.api.restoreZip();
    if (result) {
      alert(`${result.fileCount} fichier(s) restauré(s) dans :\n${result.destDir}`);
      if (result.destDir === state.config.modsFolder) await refreshMods();
    }
  } finally {
    activeProgressButton = null;
    btn.textContent = original;
    btn.disabled = false;
  }
});

// -- Tag groupé -------------------------------------------------------------

el('mods-bulk-tag').addEventListener('click', async () => {
  if (!state.mods.selected.size) { alert('Sélectionne au moins un mod.'); return; }
  const tag = prompt(`Ajouter quel tag à ${state.mods.selected.size} mod(s) sélectionné(s) ?`);
  if (!tag || !tag.trim()) return;
  await window.api.bulkAddTag([...state.mods.selected], tag.trim());
  await refreshMods();
});

// -- Mode sombre --------------------------------------------------------------

el('theme-toggle').addEventListener('click', async () => {
  const isDark = document.body.dataset.theme === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  await window.api.setConfig({ theme: next });
});

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  el('theme-toggle').textContent = theme === 'dark' ? '☀' : '🌙';
}

// ---------------------------------------------------------------
// Assistant de dépannage par dichotomie
// ---------------------------------------------------------------

el('mods-dichotomy').addEventListener('click', async () => {
  showModal('modal-dichotomy');
  const state2 = await window.api.dichotomyGetState();
  if (state2 && state2.pool) renderDichotomyProgress(state2);
  else renderDichotomyStart();
});

function renderDichotomyStart() {
  el('dicho-text').textContent =
    "Cet assistant va désactiver la moitié de tes mods actifs, puis te demandera de " +
    "relancer le jeu pour voir si le problème est toujours là. En répétant l'opération, " +
    "on isole le mod fautif en quelques essais.\n\n⚠️ Ferme bien le jeu avant de cliquer sur 'Commencer'.";
  const buttons = el('dicho-buttons');
  buttons.innerHTML = '';
  const startBtn = document.createElement('button');
  startBtn.textContent = 'Commencer';
  startBtn.addEventListener('click', async () => {
    const result = await window.api.dichotomyStart(state.config.modsFolder);
    if (result.error) { alert(result.error); return; }
    renderDichotomyProgress(result);
  });
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Fermer';
  closeBtn.addEventListener('click', () => hideModal('modal-dichotomy'));
  buttons.append(startBtn, closeBtn);
}

function renderDichotomyProgress(st) {
  el('dicho-text').textContent =
    `${st.pool.length} mod(s) encore suspect(s).\nJe viens de désactiver ${st.testGroup.length} d'entre eux.\n\n` +
    'Relance le jeu et teste. Le problème est-il toujours là ?';
  const buttons = el('dicho-buttons');
  buttons.innerHTML = '';

  const persistBtn = document.createElement('button');
  persistBtn.textContent = 'Le problème persiste';
  persistBtn.addEventListener('click', () => reportDichotomy(true));

  const goneBtn = document.createElement('button');
  goneBtn.textContent = 'Le problème a disparu';
  goneBtn.addEventListener('click', () => reportDichotomy(false));

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Annuler / tout réactiver';
  cancelBtn.addEventListener('click', async () => {
    await window.api.dichotomyCancel();
    alert('Tous les mods ont été réactivés.');
    hideModal('modal-dichotomy');
    await refreshMods();
  });

  buttons.append(persistBtn, goneBtn, cancelBtn);
}

async function reportDichotomy(persists) {
  const result = await window.api.dichotomyReport(persists);
  if (result.error) { alert(result.error); return; }
  if (result.finished) {
    el('dicho-text').textContent = result.culprit
      ? `🎯 Mod probablement fautif trouvé :\n\n${result.culprit}\n\nTu peux le supprimer ou le garder désactivé.`
      : 'Recherche terminée, mais aucun mod isolé.';
    el('dicho-buttons').innerHTML = '';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fermer';
    closeBtn.addEventListener('click', () => hideModal('modal-dichotomy'));
    el('dicho-buttons').appendChild(closeBtn);
    await refreshMods();
    return;
  }
  renderDichotomyProgress(result);
}

// ---------------------------------------------------------------
// Onglet Tray
// ---------------------------------------------------------------

async function refreshTray() {
  const result = await window.api.scanTray(state.config.trayFolder);
  if (!result.exists) {
    el('tray-status').textContent = "Ce dossier n'existe pas. Clique sur 'Changer de dossier'.";
    state.tray.groups = [];
    renderTrayTable();
    return;
  }
  state.tray.groups = result.groups;
  renderTrayTable();
}

function renderTrayTable() {
  const search = el('tray-search').value.toLowerCase().trim();
  const wanted = el('tray-type-filter').value;
  let filtered = state.tray.groups.filter((g) => {
    if (search && !g.base.toLowerCase().includes(search)) return false;
    if (wanted !== 'Tout' && g.type !== wanted) return false;
    return true;
  });
  let total = filtered.length, totalSize = 0;
  for (const g of filtered) totalSize += g.size;

  const { field, dir } = state.tray.sort;
  filtered = sortRows(filtered, field, dir, (g, f) => g[f]);
  updateSortIndicators('tray-table', state.tray.sort);

  const tbody = document.querySelector('#tray-table tbody');
  tbody.innerHTML = '';
  for (const g of filtered) {
    const tr = document.createElement('tr');
    tr.dataset.base = g.base;
    if (state.tray.selected === g.base) tr.classList.add('selected');
    tr.innerHTML = `<td>${escapeHtml(g.base)}</td><td>${escapeHtml(g.type)}</td>
      <td>${escapeHtml(g.sizeLabel)}</td><td>${escapeHtml(g.mtimeLabel)}</td>`;
    tr.addEventListener('click', () => selectTrayGroup(g.base));
    tbody.appendChild(tr);
  }
  el('tray-status').textContent = `${total} élément(s) affiché(s)  •  ${humanSize(totalSize)} au total`;
}
wireSortableHeaders('tray-table', state.tray.sort, renderTrayTable);

async function selectTrayGroup(base) {
  state.tray.selected = base;
  renderTrayTable();
  const g = state.tray.groups.find((x) => x.base === base);
  if (!g) return;
  el('tray-info').textContent = `${g.files.length} fichier(s) liés :\n${g.files.map((f) => f.split(/[\\/]/).pop()).join(', ')}`;
  const thumbBox = el('tray-thumb');
  if (g.thumbnail) {
    setThumbImage(thumbBox, `file://${g.thumbnail}`);
  } else {
    thumbBox.innerHTML = thumbPlaceholder(g.type, g.type);
  }
}

el('tray-choose-folder').addEventListener('click', async () => {
  const folder = await window.api.chooseFolder(state.config.trayFolder);
  if (folder) {
    state.config.trayFolder = folder;
    await window.api.setConfig({ trayFolder: folder });
    el('tray-folder-label').textContent = folder;
    await refreshTray();
  }
});
el('tray-refresh').addEventListener('click', refreshTray);
el('tray-search').addEventListener('input', renderTrayTable);
el('tray-type-filter').addEventListener('change', renderTrayTable);
el('tray-open-folder').addEventListener('click', () => window.api.openFolder(state.config.trayFolder));
el('tray-delete').addEventListener('click', async () => {
  if (!state.tray.selected) return;
  const g = state.tray.groups.find((x) => x.base === state.tray.selected);
  if (!g) return;
  if (!confirm(`Supprimer cet élément Tray (${g.files.length} fichier(s) liés) ? Action irréversible.`)) return;
  await window.api.deleteTrayGroup(g.files);
  state.tray.selected = null;
  await refreshTray();
});

// ---------------------------------------------------------------
// Onglet Mises à jour
// ---------------------------------------------------------------

async function refreshUpdates() {
  state.updates.entries = await window.api.updatesList();
  renderUpdatesTable();
  await refreshCompatSummary();
}

async function refreshCompatSummary() {
  const result = await window.api.scanMods(state.config.modsFolder);
  const dateStr = (state.config.patchDate || '').trim();
  let epoch = null;
  if (dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) epoch = d.getTime();
  }
  let count = 0;
  if (result.exists && epoch !== null) {
    count = result.rows.filter((r) => r.status === 'Activé' && r.mtimeMs < epoch).length;
  }
  el('compat-summary').textContent = count
    ? `⚠ ${count} mod(s) actif(s) non modifié(s) depuis la dernière mise à jour du jeu.`
    : 'Aucun mod signalé comme potentiellement incompatible pour le moment (renseigne une date dans l\'onglet Mods).';
}

function renderUpdatesTable() {
  const tbody = document.querySelector('#updates-table tbody');
  tbody.innerHTML = '';
  for (const e of state.updates.entries) {
    const tr = document.createElement('tr');
    tr.dataset.id = e.id;
    if (state.updates.selected.has(e.id)) tr.classList.add('selected');
    tr.innerHTML = `<td>${escapeHtml(e.name)}</td><td>${e.type === 'github' ? 'GitHub' : 'Lien'}</td>
      <td>${escapeHtml(e.value)}</td><td>${escapeHtml(e.installedRef || '')}</td>
      <td>${escapeHtml(e.lastSeen || '')}</td><td>${escapeHtml(e.status || '')}</td>
      <td>${escapeHtml(e.lastChecked || '')}</td>`;
    tr.addEventListener('click', (ev) => {
      if (!(ev.ctrlKey || ev.metaKey)) state.updates.selected.clear();
      if (state.updates.selected.has(e.id)) state.updates.selected.delete(e.id);
      else state.updates.selected.add(e.id);
      renderUpdatesTable();
    });
    tbody.appendChild(tr);
  }
}

el('updates-jump-mods').addEventListener('click', () => {
  document.querySelector('.tab-btn[data-tab="mods"]').click();
  el('mods-compat-filter').value = 'À vérifier';
  renderModsTable();
});

el('updates-add').addEventListener('click', () => {
  el('watch-name').value = '';
  el('watch-type').value = 'github';
  el('watch-value').value = '';
  el('watch-installed').value = '';
  showModal('modal-add-watch');
});
el('watch-cancel').addEventListener('click', () => hideModal('modal-add-watch'));
el('watch-save').addEventListener('click', async () => {
  const name = el('watch-name').value.trim();
  const value = el('watch-value').value.trim();
  if (!name || !value) { alert('Le nom et le dépôt/lien sont obligatoires.'); return; }
  const entry = {
    id: cryptoRandomId(),
    name,
    type: el('watch-type').value,
    value,
    installedRef: el('watch-installed').value.trim(),
    lastSeen: '',
    lastChecked: '',
    status: 'Jamais vérifié',
  };
  state.updates.entries = await window.api.updatesAdd(entry);
  renderUpdatesTable();
  hideModal('modal-add-watch');
});

el('updates-delete').addEventListener('click', async () => {
  if (!state.updates.selected.size) return;
  state.updates.entries = await window.api.updatesDelete([...state.updates.selected]);
  state.updates.selected.clear();
  renderUpdatesTable();
});

el('updates-open-link').addEventListener('click', async () => {
  const id = [...state.updates.selected][0];
  const entry = state.updates.entries.find((e) => e.id === id);
  if (!entry) return;
  const url = entry.type === 'github' ? `https://github.com/${entry.value}/releases/latest` : entry.value;
  await window.api.updatesOpenLink(url);
});

el('updates-mark-seen').addEventListener('click', async () => {
  if (!state.updates.selected.size) return;
  state.updates.entries = await window.api.updatesMarkSeen([...state.updates.selected]);
  renderUpdatesTable();
});

el('updates-auto-check').addEventListener('change', async (ev) => {
  await window.api.setConfig({ autoCheckUpdates: ev.target.checked });
});

async function checkAllUpdates() {
  const btn = el('updates-check-all');
  const original = btn.textContent;
  btn.textContent = 'Vérification en cours…';
  btn.disabled = true;
  try {
    state.updates.entries = await window.api.updatesCheckAll();
    renderUpdatesTable();
  } finally {
    btn.textContent = original;
    btn.disabled = false;
  }
}
el('updates-check-all').addEventListener('click', checkAllUpdates);

// ---------------------------------------------------------------
// Modales génériques
// ---------------------------------------------------------------

function showModal(id) {
  el('modal-backdrop').classList.remove('hidden');
  document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
  el(id).classList.remove('hidden');
}
function hideModal(id) {
  el(id).classList.add('hidden');
  el('modal-backdrop').classList.add('hidden');
}

// ---------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------

function humanSize(n) {
  let v = Number(n);
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return i === 0 ? `${Math.round(v)} ${units[i]}` : `${v.toFixed(1)} ${units[i]}`;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function cryptoRandomId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

init();
