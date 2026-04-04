// ── ESTADO GLOBAL ──────────────────────────────────────────────
let currentSystem = 'cob';

const SYS_NAMES = {
  alm: '📦 Almacenamiento',
  cob: '🔵 Cobranzas',
  con: '🔴 Contabilidad',
  rec: '🔴 Reclamos',
  tra: '🟠 Transporte',
  ven: '🟢 Ventas',
};

// ── SISTEMA GLOBAL ──────────────────────────────────────────────
function setGlobalSystem(sys) {
  currentSystem = sys;
  document.querySelectorAll('.sys-tabs').forEach(tabs => activateTab(tabs, sys));
}

// ── NAVEGACIÓN DE PÁGINAS ───────────────────────────────────────
function showPage(pageId, btn) {
  document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Si es la página de componentes, mostrar el panel de grilla y ocultar detalles
  if (pageId === 'components-page') {
    showCompGrid();
  }
}

function startSession() {
  // Ir directamente a "Antes de empezar"
  showPage('intro-page', document.querySelectorAll('.nav-btn')[1]);
}

// ── SISTEMA DE TABS ─────────────────────────────────────────────
function buildTabNav(tabs) {
  const nav = tabs.querySelector('.sys-tabs-nav');
  if (nav && nav.children.length > 0) return;
  const panes = tabs.querySelectorAll('.sys-tab-pane');
  panes.forEach(pane => {
    const sys = pane.dataset.sys;
    if (!sys || !SYS_NAMES[sys]) return;
    const btn = document.createElement('button');
    btn.className = 'sys-tab-btn';
    btn.textContent = SYS_NAMES[sys];
    btn.dataset.sys = sys;
    btn.onclick = () => {
      currentSystem = sys;
      document.querySelectorAll('.sys-tabs').forEach(t => activateTab(t, sys));
    };
    nav.appendChild(btn);
  });
}

function activateTab(tabs, sys) {
  const panes = tabs.querySelectorAll('.sys-tab-pane');
  const btns = tabs.querySelectorAll('.sys-tab-btn');
  const available = Array.from(panes).map(p => p.dataset.sys);
  const target = available.includes(sys) ? sys : available[0];
  panes.forEach(p => p.classList.toggle('active', p.dataset.sys === target));
  btns.forEach(b => b.classList.toggle('active', b.dataset.sys === target));
}

function initAllTabs() {
  document.querySelectorAll('.sys-tabs').forEach(tabs => {
    buildTabNav(tabs);
    activateTab(tabs, currentSystem);
  });
}

// Observer para inicializar tabs cuando se activa una página
const pageObserver = new MutationObserver(mutations => {
  mutations.forEach(m => {
    if (m.target.classList.contains('active')) {
      m.target.querySelectorAll('.sys-tabs').forEach(tabs => {
        buildTabNav(tabs);
        activateTab(tabs, currentSystem);
      });
    }
  });
});
document.querySelectorAll('.section-page').forEach(p => {
  pageObserver.observe(p, { attributes: true, attributeFilter: ['class'] });
});

// ── REVEAL ❌/✅ ────────────────────────────────────────────────
function reveal(btn) {
  const good = btn.nextElementSibling;
  good.classList.add('shown');
  btn.style.display = 'none';
}

// ── COMPONENTES — NAVEGACIÓN INDIVIDUAL ────────────────────────
function showCompGrid() {
  document.getElementById('comp-nav-panel').style.display = 'block';
  document.querySelectorAll('.comp-detail').forEach(d => d.classList.remove('active'));
}

function showComp(id) {
  document.getElementById('comp-nav-panel').style.display = 'none';
  document.querySelectorAll('.comp-detail').forEach(d => d.classList.remove('active'));
  const detail = document.getElementById('detail-' + id);
  if (detail) {
    detail.classList.add('active');
    // Inicializar tabs del componente activo
    detail.querySelectorAll('.sys-tabs').forEach(tabs => {
      buildTabNav(tabs);
      activateTab(tabs, currentSystem);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function backToCompGrid() {
  showCompGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SUB-TABS (Preguntas Profesor / Tips) ────────────────────────
function showSubTab(tabId, btn) {
  // Encontrar el contenedor padre
  const wrap = btn.closest('.sub-tab-nav').nextElementSibling;
  wrap.querySelectorAll('.sub-tab-pane').forEach(p => p.classList.remove('active'));
  btn.closest('.sub-tab-nav').querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// ── CHECKLIST ───────────────────────────────────────────────────
function toggleCheck(el) {
  el.classList.toggle('done');
  el.querySelector('.check-box').textContent = el.classList.contains('done') ? '✓' : '';
  updateProgress();
}

function updateProgress() {
  const total = document.querySelectorAll('.check-item').length;
  const done = document.querySelectorAll('.check-item.done').length;
  const pct = Math.round((done / total) * 100);
  const bar = document.getElementById('progress-bar');
  const label = document.getElementById('progress-label');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = `${done} / ${total} completados`;
}

// ── SCROLL TO TOP ───────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  if (window.scrollY > 300) btn.classList.add('visible');
  else btn.classList.remove('visible');
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAllTabs();
  // Inicializar tabs de páginas visibles
  document.querySelectorAll('.section-page.active .sys-tabs').forEach(tabs => {
    buildTabNav(tabs);
    activateTab(tabs, currentSystem);
  });
});