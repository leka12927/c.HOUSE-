'use strict';

// Loaded before renderer.js as a plain classic script - shares the same
// global scope, so escapeHtml (defined later in renderer.js) is safe to
// call here at runtime since thumbPlaceholder is only invoked after init().

const ICONS = {
  'Cheveux': '<path d="M12 3c-4 0-7 3-7 7 0 3 1.5 5 3 6-.5 1-1 2.5-1 4h2c0-1.2.4-2.3.9-3.2.7.2 1.4.2 2.1.2s1.4 0 2.1-.2c.5.9.9 2 .9 3.2h2c0-1.5-.5-3-1-4 1.5-1 3-3 3-6 0-4-3-7-7-7z"/>',
  'Peau': '<path d="M12 2C8 6 5 10 5 14a7 7 0 0 0 14 0c0-4-3-8-7-12z"/>',
  'Vêtements': '<path d="M8 2 4 6l2 3 2-1v10h8V8l2 1 2-3-4-4-2 2h-4z"/>',
  'Chaussures': '<path d="M4 14h3l2-2 4 2h7a2 2 0 0 1 2 2v2H4z"/>',
  'Maquillage': '<path d="M9 2h6v4l-2 2v10a3 3 0 0 1-6 0V8L9 6z"/>',
  'Tatouages': '<path d="M12 2 4 7v6c0 5 4 8 8 9 4-1 8-4 8-9V7z"/>',
  'Yeux': '<path d="M12 5c-5 0-9 4-11 7 2 3 6 7 11 7s9-4 11-7c-2-3-6-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>',
  'Bijoux': '<path d="M12 2 8 8h8zM4 9h16l-8 13z"/>',
  'Autre': '<path d="M4 4h16v16H4z"/>',
  'Ménage': '<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>',
  'Sim': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z"/>',
  'Pièce / Terrain': '<path d="M3 20V10l9-6 9 6v10H3z"/>',
  'Pièce': '<path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 12h16M12 4v16" stroke="currentColor" stroke-width="1.5"/>',
  'Objet Tray': '<path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  'Orphelins': '<path d="M12 2 2 8l10 6 10-6zM2 16l10 6 10-6" fill="none" stroke="currentColor" stroke-width="1.5"/>',
};

function thumbPlaceholder(type, label) {
  const svgPath = ICONS[type] || ICONS['Autre'];
  const safeLabel = typeof escapeHtml === 'function' ? escapeHtml(label) : String(label ?? '');
  return `<div class="thumb-icon-wrap">
    <svg class="thumb-icon" viewBox="0 0 24 24" fill="currentColor">${svgPath}</svg>
    <div class="thumb-icon-label">${safeLabel}</div>
  </div>`;
}
