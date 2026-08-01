'use strict';

const crypto = require('crypto');

function nowLabel() {
  return new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

async function latestGithubTag(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'sims4-mod-manager' },
  });
  if (res.status === 404) {
    const tagsRes = await fetch(`https://api.github.com/repos/${repo}/tags`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'sims4-mod-manager' },
    });
    if (!tagsRes.ok) throw new Error(`HTTP ${tagsRes.status}`);
    const tags = await tagsRes.json();
    if (!tags.length) throw new Error('Aucun tag trouvé');
    return tags[0].name;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.tag_name;
}

async function hashUrlContent(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'sims4-mod-manager' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return crypto.createHash('sha1').update(text).digest('hex');
}

async function checkOne(entry) {
  const updated = { ...entry, lastChecked: nowLabel() };
  try {
    if (entry.type === 'github') {
      const latest = await latestGithubTag(entry.value);
      updated.lastSeen = latest;
      updated.status = entry.installedRef
        ? (entry.installedRef === latest ? 'À jour' : 'Mise à jour disponible')
        : `Dernière version : ${latest}`;
    } else {
      const hash = await hashUrlContent(entry.value);
      const hadPrevious = !!entry._contentHash;
      const changed = hadPrevious && entry._contentHash !== hash;
      updated._contentHash = hash;
      if (!hadPrevious) {
        updated.status = 'Vérifié (aucune référence antérieure)';
      } else {
        updated.status = changed ? 'Changement détecté' : 'Aucun changement';
        if (changed) updated.lastSeen = updated.lastChecked;
      }
    }
  } catch {
    updated.status = 'Erreur de vérification';
  }
  return updated;
}

async function checkAll(entries) {
  const results = [];
  for (const entry of entries) {
    // Sequential to stay polite with the GitHub API rate limit.
    results.push(await checkOne(entry));
  }
  return results;
}

module.exports = { checkAll, checkOne };
