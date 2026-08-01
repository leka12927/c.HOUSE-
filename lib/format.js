'use strict';

function humanSize(n) {
  let v = Number(n);
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return i === 0 ? `${Math.round(v)} ${units[i]}` : `${v.toFixed(1)} ${units[i]}`;
}

function formatDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

module.exports = { humanSize, formatDate };
