/* ===========================================================
   Gestion+ - tableau de bord pour Ménage / Commerce / E-commerce
   Données stockées en local (localStorage), 100% statique.
   =========================================================== */

const STORAGE_KEY = "gestion_plus_data_v1";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------
   Données par défaut pour chaque contexte
   --------------------------------------------------------- */
function defaultData() {
  return {
    menage: {
      labels: {
        modeSubtitle: "Gestion du budget de votre foyer",
        goalTitle: "Objectif d'épargne",
        goalSubtitle: "Montant total visé",
        walletLabel: "CARTE",
        walletName: "Compte courant",
        walletNumber: "**** 4521",
        walletExp: "EXP 09/28",
        chartTitle: "Revenus / Dépenses du foyer",
        balanceTitle: "Solde global",
        balanceSubtitle: "Tous comptes confondus",
        historyTitle: "Historique des opérations",
        historySubtitle: "Recettes et dépenses du foyer",
        creditTitle: "Charges fixes",
        creditSubtitle: "Total mensuel des charges",
        mandatoryTitle: "Paiements récurrents",
        mandatorySubtitle: "Loyer, factures, abonnements"
      },
      walletAmount: 78989.09,
      contacts: ["Loyer", "Électricité", "Internet", "Assurance", "Eau"],
      transactions: [
        { id: 1, label: "Salaire", date: todayISO(-2), category: "Revenu", type: "income", amount: 2200 },
        { id: 2, label: "Loyer", date: todayISO(-3), category: "Logement", type: "expense", amount: 750 },
        { id: 3, label: "Courses Carrefour", date: todayISO(-4), category: "Alimentation", type: "expense", amount: 142.5 },
        { id: 4, label: "Électricité", date: todayISO(-6), category: "Charges", type: "expense", amount: 89.3 },
        { id: 5, label: "Remboursement ami", date: todayISO(-7), category: "Revenu", type: "income", amount: 50 }
      ],
      monthly: [1800, 2100, 1700, 2400, 2000, 2200]
    },

    commerce: {
      labels: {
        modeSubtitle: "Gestion de votre commerce physique",
        goalTitle: "Objectif de chiffre d'affaires",
        goalSubtitle: "Montant total visé",
        walletLabel: "CAISSE",
        walletName: "Compte professionnel",
        walletNumber: "**** 9090",
        walletExp: "EXP 09/26",
        chartTitle: "Chiffre d'affaires / Achats",
        balanceTitle: "Trésorerie",
        balanceSubtitle: "Solde de caisse + banque",
        historyTitle: "Historique des ventes & achats",
        historySubtitle: "Dernières opérations en boutique",
        creditTitle: "Charges fixes du commerce",
        creditSubtitle: "Loyer, salaires, abonnements",
        mandatoryTitle: "Paiements récurrents",
        mandatorySubtitle: "Fournisseurs et charges"
      },
      walletAmount: 32678.90,
      contacts: ["Loyer local", "Personnel", "Fournisseur A", "Assurance", "EDF Pro"],
      transactions: [
        { id: 1, label: "Vente comptoir", date: todayISO(-1), category: "Vente", type: "income", amount: 980 },
        { id: 2, label: "Achat stock - Fournisseur A", date: todayISO(-2), category: "Stock", type: "expense", amount: 1340 },
        { id: 3, label: "Vente comptoir", date: todayISO(-3), category: "Vente", type: "income", amount: 1245.6 },
        { id: 4, label: "Salaire employé", date: todayISO(-5), category: "Personnel", type: "expense", amount: 1500 },
        { id: 5, label: "Vente carte bancaire", date: todayISO(-6), category: "Vente", type: "income", amount: 760.2 }
      ],
      monthly: [4200, 4600, 3900, 5300, 4800, 5100]
    },

    ecommerce: {
      labels: {
        modeSubtitle: "Gestion de votre boutique en ligne",
        goalTitle: "Objectif de ventes en ligne",
        goalSubtitle: "Montant total visé",
        walletLabel: "BOUTIQUE",
        walletName: "Compte marchand",
        walletNumber: "**** 1234",
        walletExp: "EXP 12/27",
        chartTitle: "Ventes en ligne / Coûts",
        balanceTitle: "Solde marchand",
        balanceSubtitle: "Disponible pour virement",
        historyTitle: "Historique des commandes",
        historySubtitle: "Dernières commandes en ligne",
        creditTitle: "Frais fixes",
        creditSubtitle: "Hébergement, abonnements, pub",
        mandatoryTitle: "Paiements récurrents",
        mandatorySubtitle: "Outils & services"
      },
      walletAmount: 15420.45,
      contacts: ["Hébergement", "Plateforme e-commerce", "Publicité", "Livraison", "Logiciel compta"],
      transactions: [
        { id: 1, label: "Commande #1042", date: todayISO(-1), category: "Vente en ligne", type: "income", amount: 89.99 },
        { id: 2, label: "Commande #1041", date: todayISO(-1), category: "Vente en ligne", type: "income", amount: 45.50 },
        { id: 3, label: "Frais publicité", date: todayISO(-2), category: "Marketing", type: "expense", amount: 200 },
        { id: 4, label: "Commande #1040", date: todayISO(-3), category: "Vente en ligne", type: "income", amount: 120 },
        { id: 5, label: "Abonnement plateforme", date: todayISO(-10), category: "Abonnement", type: "expense", amount: 29.90 }
      ],
      monthly: [2100, 2600, 2300, 3100, 2900, 3400]
    }
  };
}

/* ---------------------------------------------------------
   Persistance
   --------------------------------------------------------- */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return defaultData();
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();
let currentMode = "menage";
let currentPeriod = "year";

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */
function fmtMoney(value) {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function getBalance(modeData) {
  return modeData.transactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
}

function getWeeklyVariation(modeData) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return modeData.transactions
    .filter(t => new Date(t.date) >= sevenDaysAgo)
    .reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
}

function getMonthlyExpenses(modeData) {
  const now = new Date();
  return modeData.transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

/* ---------------------------------------------------------
   Rendu
   --------------------------------------------------------- */
function render() {
  const modeData = data[currentMode];
  const labels = modeData.labels;

  document.getElementById("mode-subtitle").textContent = labels.modeSubtitle;
  document.getElementById("goal-title").textContent = labels.goalTitle;
  document.getElementById("goal-subtitle").textContent = labels.goalSubtitle;
  document.getElementById("wallet-label").textContent = labels.walletLabel;
  document.getElementById("wallet-name").textContent = labels.walletName;
  document.getElementById("wallet-number").textContent = labels.walletNumber;
  document.getElementById("wallet-exp").textContent = labels.walletExp;
  document.getElementById("wallet-amount").textContent = fmtMoney(modeData.walletAmount);

  document.getElementById("chart-title").textContent = labels.chartTitle;
  document.getElementById("balance-title").textContent = labels.balanceTitle;
  document.getElementById("balance-subtitle").textContent = labels.balanceSubtitle;
  document.getElementById("history-title").textContent = labels.historyTitle;
  document.getElementById("history-subtitle").textContent = labels.historySubtitle;
  document.getElementById("credit-title").textContent = labels.creditTitle;
  document.getElementById("credit-subtitle").textContent = labels.creditSubtitle;
  document.getElementById("mandatory-title").textContent = labels.mandatoryTitle;
  document.getElementById("mandatory-subtitle").textContent = labels.mandatorySubtitle;

  // Weekly revenue
  const weekly = getWeeklyVariation(modeData);
  const weeklyRevenueEl = document.getElementById("weekly-revenue");
  weeklyRevenueEl.textContent = (weekly >= 0 ? "+" : "") + fmtMoney(weekly);
  const weeklyPercentEl = document.getElementById("weekly-percent");
  const base = Math.max(modeData.walletAmount, 1);
  const pct = ((weekly / base) * 100).toFixed(1);
  weeklyPercentEl.textContent = (pct >= 0 ? "+" : "") + pct + "%";
  weeklyPercentEl.className = "badge" + (pct < 0 ? " negative" : "");

  // Balance
  const balance = getBalance(modeData);
  document.getElementById("balance-amount").textContent = fmtMoney(balance);

  // Charges / credit amount
  document.getElementById("credit-amount").textContent = fmtMoney(getMonthlyExpenses(modeData));

  // Contacts
  const contactsRow = document.getElementById("contacts-row");
  contactsRow.innerHTML = "";
  modeData.contacts.forEach(c => {
    const chip = document.createElement("span");
    chip.className = "contact-chip";
    chip.textContent = c;
    contactsRow.appendChild(chip);
  });

  renderHistory(modeData);
  drawBarChart(modeData);
  drawLineChart(modeData);
}

function renderHistory(modeData) {
  const tbody = document.getElementById("history-body");
  tbody.innerHTML = "";
  const sorted = [...modeData.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach(t => {
    const tr = document.createElement("tr");
    const amountClass = t.type === "income" ? "amount-positive" : "amount-negative";
    const sign = t.type === "income" ? "+" : "-";
    tr.innerHTML = `
      <td>${escapeHtml(t.label)}</td>
      <td>${fmtDate(t.date)}</td>
      <td>${escapeHtml(t.category)}</td>
      <td><span class="status">Validé</span></td>
      <td class="${amountClass}">${sign}${fmtMoney(t.amount)}</td>
      <td><button class="delete-btn" data-id="${t.id}" title="Supprimer">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      modeData.transactions = modeData.transactions.filter(t => t.id !== id);
      saveData(data);
      render();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------------------------------------------------
   Graphiques (canvas natif, sans dépendance externe)
   --------------------------------------------------------- */
function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  return { ctx, width: rect.width, height: rect.height };
}

function drawBarChart(modeData) {
  const canvas = document.getElementById("main-chart");
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const data6 = modeData.monthly;
  const max = Math.max(...data6) * 1.15;
  const padding = { top: 20, right: 10, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barCount = data6.length;
  const gap = chartW / barCount * 0.35;
  const barWidth = (chartW / barCount) - gap;

  // grid lines
  ctx.strokeStyle = "#eee";
  ctx.fillStyle = "#9aa3ad";
  ctx.font = "11px Segoe UI";
  ctx.textAlign = "right";
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padding.top + (chartH / steps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    const value = max - (max / steps) * i;
    ctx.fillText(Math.round(value).toString(), padding.left - 8, y + 4);
  }

  // find max bar index for highlight
  const maxIndex = data6.indexOf(Math.max(...data6));

  data6.forEach((value, i) => {
    const barHeight = (value / max) * chartH;
    const x = padding.left + i * (chartW / barCount) + gap / 2;
    const y = padding.top + chartH - barHeight;
    ctx.fillStyle = i === maxIndex ? "#1f9d55" : "#bfe3cd";
    roundRect(ctx, x, y, barWidth, barHeight, 6);
    ctx.fill();

    // label
    ctx.fillStyle = "#9aa3ad";
    ctx.textAlign = "center";
    ctx.fillText(MONTHS[i], x + barWidth / 2, height - 8);
  });

  // highlight bubble on max bar
  if (max > 0) {
    const value = data6[maxIndex];
    const barHeight = (value / max) * chartH;
    const x = padding.left + maxIndex * (chartW / barCount) + gap / 2 + barWidth / 2;
    const y = padding.top + chartH - barHeight - 10;
    ctx.fillStyle = "#1f9d55";
    roundRect(ctx, x - 28, y - 22, 56, 22, 11);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(Math.round(value).toString() + " €", x, y - 7);
  }
}

function drawLineChart(modeData) {
  const canvas = document.getElementById("balance-chart");
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  // build a running balance series from transactions (oldest -> newest)
  const sorted = [...modeData.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const series = [0];
  sorted.forEach(t => {
    running += (t.type === "income" ? t.amount : -t.amount);
    series.push(running);
  });
  if (series.length < 2) series.push(0);

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = (max - min) || 1;
  const padding = 8;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  ctx.beginPath();
  series.forEach((v, i) => {
    const x = padding + (chartW / (series.length - 1)) * i;
    const y = padding + chartH - ((v - min) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#1f9d55";
  ctx.lineWidth = 2;
  ctx.stroke();

  // fill under line
  ctx.lineTo(padding + chartW, padding + chartH);
  ctx.lineTo(padding, padding + chartH);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(31,157,85,0.25)");
  gradient.addColorStop(1, "rgba(31,157,85,0)");
  ctx.fillStyle = gradient;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------------------------------------------------
   Événements
   --------------------------------------------------------- */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentMode = tab.dataset.mode;
    render();
  });
});

document.querySelectorAll(".toggle-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentPeriod = btn.dataset.period;
    render();
  });
});

document.querySelectorAll(".side-link").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".side-link").forEach(l => l.classList.remove("active"));
    link.classList.add("active");
  });
});

const modal = document.getElementById("modal-overlay");
const txForm = document.getElementById("tx-form");

function openModal(type) {
  document.getElementById("tx-date").value = todayISO();
  document.getElementById("tx-type").value = type || "income";
  modal.classList.add("open");
}
function closeModal() {
  modal.classList.remove("open");
  txForm.reset();
}

document.getElementById("add-tx-btn").addEventListener("click", () => openModal("income"));
document.getElementById("income-btn").addEventListener("click", () => openModal("income"));
document.getElementById("expense-btn").addEventListener("click", () => openModal("expense"));
document.getElementById("modal-cancel").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

txForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const modeData = data[currentMode];
  const newTx = {
    id: Date.now(),
    label: document.getElementById("tx-label").value.trim(),
    category: document.getElementById("tx-category").value.trim() || "Divers",
    date: document.getElementById("tx-date").value,
    type: document.getElementById("tx-type").value,
    amount: parseFloat(document.getElementById("tx-amount").value)
  };
  modeData.transactions.push(newTx);
  saveData(data);
  closeModal();
  render();
});

document.getElementById("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gestion-${currentMode}-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (!confirm("Réinitialiser les données de cet onglet aux valeurs par défaut ?")) return;
  const defaults = defaultData();
  data[currentMode] = defaults[currentMode];
  saveData(data);
  render();
});

window.addEventListener("resize", () => render());

/* init */
render();
