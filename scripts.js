/* ════════════════════════════════════════════════════════════════════
   ASESORÍA PC1 — DISEÑO DE BASE DE DATOS
   Lógica de la página. Todo vive dentro de una función anónima: no crea
   variables globales, así que puede integrarse a SIGA sin choques.

   ÍNDICE
   01. Configuración y utilidades
   02. Navegación entre páginas y componentes (router)
   03. Avance de la ruta (barra superior)
   04. Mapa de arquitectura (se inserta desde <template>)
   05. Pestañas por sistema de ejemplo
   06. Revelar ❌ / ✅ y pines explicativos
   07. Checklist de Tips
   08. Simulador de defensa oral
   09. Botón "volver arriba"
   10. Visor de imágenes (lightbox)
   11. Inicio
   12. Imprimir / guardar PDF
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.getElementById('asesoria-pc1');
  if (!root) return;

  /* ── 01. CONFIGURACIÓN Y UTILIDADES ──────────────────────────────── */
  var CONFIG = {
    // true  → la URL cambia (#componentes/kpis): funciona el botón "atrás" y los enlaces directos.
    // false → úsalo al integrar en SIGA si SIGA ya maneja su propia URL.
    useHash: true,
    storagePrefix: 'asesoriaPC1:',
    simSeconds: 90 // tiempo por pregunta del simulador
  };

  var PAGES = ['inicio', 'antes', 'concepto', 'arquitectura', 'componentes', 'defensa', 'tips'];
  var PAGE_LABELS = {
    inicio: 'Inicio',
    antes: 'Antes de empezar',
    concepto: 'Concepto',
    arquitectura: 'Arquitectura',
    componentes: 'Componentes',
    defensa: 'Defensa oral',
    tips: 'Tips'
  };

  // Un sistema de ejemplo = un color. Para agregar uno: súmalo aquí y en el CSS ([data-sys="xxx"]).
  var SYSTEMS = {
    cob: { name: 'Cobranzas', icon: '🔵' },
    ven: { name: 'Ventas', icon: '🟢' },
    tra: { name: 'Transporte', icon: '🟠' },
    con: { name: 'Contabilidad', icon: '🔴' },
    rec: { name: 'Reclamos', icon: '🟣' },
    alm: { name: 'Almacenamiento', icon: '📦' }
  };

  // Pasos de la ruta de estudio (barra de avance de la cabecera)
  var ROUTE_STEPS = [1, 2, 3, 4, 5];

  // Preguntas del simulador. Para agregar una: nueva línea con su pregunta y dónde repasarla.
  var SIM_QUESTIONS = [
    { q: '¿Cómo definieron su protocolo y cómo funciona en su sistema?', comp: 'protocolos' },
    { q: 'Explícame el control de accesos. ¿Qué puede hacer el perfil [X] y por qué tiene acceso a esos módulos?', comp: 'perfiles' },
    { q: '¿Esta interfaz realmente funciona o está correctamente planteada para su sistema?', page: 'concepto', anchor: 'que-se-evalua' },
    { q: 'Explícame cómo funciona el catálogo y el proceso principal de su sistema.', comp: 'catalogos' },
    { q: '¿Para qué sirve este KPI o gráfica en su sistema? ¿Cómo se calcula?', comp: 'kpis' },
    { q: '¿Por qué eligieron ese método adicional de acceso y cómo funciona en su sistema?', comp: 'login' },
    { q: 'Explícame cómo funciona este catálogo. ¿Qué pasa si agrego un nuevo registro?', comp: 'catalogos' },
    { q: 'Explícame paso a paso cómo funciona el proceso principal de su sistema.', comp: 'proceso' }
  ];

  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }

  // localStorage puede no estar disponible: todo va protegido
  var store = {
    get: function (key, fallback) {
      try {
        var v = window.localStorage.getItem(CONFIG.storagePrefix + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(CONFIG.storagePrefix + key, JSON.stringify(value)); } catch (e) { /* sin almacenamiento */ }
    }
  };

  var state = {
    page: 'inicio',
    comp: null,
    system: store.get('system', 'cob'),
    visitedSteps: store.get('steps', [])
  };
  if (!SYSTEMS[state.system]) state.system = 'cob';

  /* ── 02. NAVEGACIÓN ENTRE PÁGINAS Y COMPONENTES ──────────────────── */
  var suppressHash = false;

  function setHash(hash) {
    if (!CONFIG.useHash) return;
    if (window.location.hash !== '#' + hash) {
      suppressHash = true;
      window.location.hash = hash;
    }
  }

  function scrollToTop() {
    var y = root.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  function go(page, opts) {
    opts = opts || {};
    if (PAGES.indexOf(page) === -1) page = 'inicio';
    var leaving = state.page;
    state.page = page;

    $$('.page').forEach(function (p) { p.classList.toggle('active', p.dataset.page === page); });
    $$('.ap-nav-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.go === page); });

    if (page === 'componentes') showComp(opts.comp || null); else state.comp = null;
    if (leaving === 'defensa' && page !== 'defensa') sim.stop();

    markStepsForPage(page);
    refreshTabs();

    if (opts.updateHash !== false) setHash(page + (state.comp ? '/' + state.comp : ''));

    if (opts.anchor) {
      var el = document.getElementById(opts.anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (opts.anchor === 'que-se-evalua') markStep(2);
        return;
      }
    }
    if (opts.scroll !== false) scrollToTop();
  }

  function showComp(id) {
    var panel = $('#comp-grid-panel');
    $$('.comp-detail').forEach(function (d) { d.classList.remove('active'); });
    var detail = id ? document.getElementById('detail-' + id) : null;
    if (!detail) {
      state.comp = null;
      if (panel) panel.hidden = false;
      return;
    }
    state.comp = id;
    if (panel) panel.hidden = true;
    detail.classList.add('active');
    refreshTabs();
  }

  function routeFromHash() {
    var raw = (window.location.hash || '').replace('#', '');
    if (!raw) return go('inicio', { updateHash: false, scroll: false });
    var parts = raw.split('/');
    go(parts[0], { comp: parts[1] || null, updateHash: false, scroll: false });
  }

  window.addEventListener('hashchange', function () {
    if (!CONFIG.useHash) return;
    if (suppressHash) { suppressHash = false; return; }
    routeFromHash();
    scrollToTop();
  });

  // Navegación inferior de cada página (Anterior / Siguiente)
  function buildPagers() {
    $$('[data-pager]').forEach(function (nav) {
      var page = nav.closest('.page').dataset.page;
      var i = PAGES.indexOf(page);
      var html = '';
      if (i > 0) {
        html += '<button class="btn btn-nav" data-go="' + PAGES[i - 1] + '">← <span><small>Anterior</small>' +
          PAGE_LABELS[PAGES[i - 1]] + '</span></button>';
      }
      if (i < PAGES.length - 1) {
        html += '<button class="btn btn-nav next" data-go="' + PAGES[i + 1] + '"><span><small>Siguiente</small>' +
          PAGE_LABELS[PAGES[i + 1]] + '</span> →</button>';
      }
      nav.innerHTML = html;
    });
  }

  // Navegación inferior de cada componente (Anterior / Siguiente / Volver al listado)
  function buildCompPagers() {
    var cards = $$('.comp-card[data-comp]');
    var ids = cards.map(function (c) { return c.dataset.comp; });
    var names = {};
    cards.forEach(function (c) { names[c.dataset.comp] = c.querySelector('.comp-name').textContent; });

    $$('.comp-detail').forEach(function (detail) {
      var id = detail.id.replace('detail-', '');
      var i = ids.indexOf(id);
      var foot = detail.querySelector('.comp-pager');
      if (!foot || i === -1) return;
      var html = '';
      html += i > 0
        ? '<button class="btn btn-nav" data-comp="' + ids[i - 1] + '">← <span><small>Anterior</small>' + names[ids[i - 1]] + '</span></button>'
        : '<span></span>';
      html += '<span class="count">Componente ' + (i + 1) + ' de ' + ids.length + '<br>' +
        '<button class="btn btn-back" data-comp-grid style="margin:.4rem 0 0">☰ Volver al listado</button></span>';
      html += i < ids.length - 1
        ? '<button class="btn btn-nav next" data-comp="' + ids[i + 1] + '"><span><small>Siguiente</small>' + names[ids[i + 1]] + '</span> →</button>'
        : '<button class="btn btn-nav next" data-go="defensa"><span><small>Siguiente</small>Defensa oral</span> →</button>';
      foot.innerHTML = html;
    });
  }

  /* ── 03. AVANCE DE LA RUTA ───────────────────────────────────────── */
  function markStep(n) {
    if (state.visitedSteps.indexOf(n) !== -1) return;
    state.visitedSteps.push(n);
    store.set('steps', state.visitedSteps);
    renderProgress();
  }

  function markStepsForPage(page) {
    if (page === 'concepto') markStep(1);
    if (page === 'arquitectura') markStep(3);
    if (page === 'componentes') markStep(4);
    if (page === 'defensa') markStep(5);
  }

  function renderProgress() {
    var pct = Math.round(state.visitedSteps.length / ROUTE_STEPS.length * 100);
    var fill = $('.ap-progress-fill');
    var label = $('#ap-progress-label');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = 'Ruta ' + pct + '%';
    $$('.route-step').forEach(function (s) {
      s.classList.toggle('done', state.visitedSteps.indexOf(Number(s.dataset.step)) !== -1);
    });
  }

  // El paso 2 ("Qué se evalúa") se marca al leer esa sección
  function watchEvaluationSection() {
    var target = document.getElementById('que-se-evalua');
    if (!target || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) markStep(2); });
    }, { threshold: 0.3 });
    io.observe(target);
  }

  /* ── 04. MAPA DE ARQUITECTURA ────────────────────────────────────── */
  function injectMaps() {
    var tpl = document.getElementById('tpl-mapa');
    if (!tpl) return;
    $$('[data-mapa]').forEach(function (slot) {
      slot.appendChild(tpl.content.cloneNode(true));
    });
  }

  /* ── 05. PESTAÑAS POR SISTEMA ────────────────────────────────────── */
  function buildTabNav(tabs) {
    var nav = tabs.querySelector('.sys-tabs-nav');
    if (!nav || nav.children.length) return;
    $$('.sys-tab-pane', tabs).forEach(function (pane) {
      var sys = pane.dataset.sys;
      if (!SYSTEMS[sys]) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sys-tab-btn';
      btn.dataset.sys = sys;
      btn.textContent = SYSTEMS[sys].name;
      btn.addEventListener('click', function () { setSystem(sys); });
      nav.appendChild(btn);
    });
  }

  function activateTab(tabs) {
    var panes = $$('.sys-tab-pane', tabs);
    var available = panes.map(function (p) { return p.dataset.sys; });
    var target = available.indexOf(state.system) !== -1 ? state.system : available[0];
    panes.forEach(function (p) { p.classList.toggle('active', p.dataset.sys === target); });
    $$('.sys-tab-btn', tabs).forEach(function (b) { b.classList.toggle('active', b.dataset.sys === target); });
  }

  function refreshTabs() {
    $$('.sys-tabs').forEach(function (tabs) { buildTabNav(tabs); activateTab(tabs); });
    $$('.sys-chip').forEach(function (c) { c.classList.toggle('active', c.dataset.sys === state.system); });
  }

  // Elegir un sistema lo cambia en TODAS las pestañas de la asesoría
  function setSystem(sys) {
    if (!SYSTEMS[sys]) return;
    state.system = sys;
    store.set('system', sys);
    refreshTabs();
  }

  /* ── 06. REVELAR ❌/✅ Y PINES ───────────────────────────────────── */
  function reveal(btn) {
    var box = btn.closest('.reveal');
    var good = box && box.querySelector('.reveal-good');
    if (good) good.classList.add('shown');
    btn.hidden = true;
  }

  function togglePin(el) {
    var figure = el.closest('.pin-figure');
    if (!figure) return;
    var id = el.dataset.pin;
    var wasActive = el.classList.contains('active');
    $$('.pin, .pin-item', figure).forEach(function (n) { n.classList.remove('active'); });
    if (!wasActive) {
      $$('[data-pin="' + id + '"]', figure).forEach(function (n) { n.classList.add('active'); });
    }
  }

  /* ── 07. CHECKLIST ───────────────────────────────────────────────── */
  function initChecklist() {
    var items = $$('.check-item');
    if (!items.length) return;
    var done = store.get('checklist', []);
    items.forEach(function (it, i) {
      it.tabIndex = 0;
      it.setAttribute('role', 'checkbox');
      if (done.indexOf(i) !== -1) setCheck(it, true);
      var toggle = function () {
        setCheck(it, !it.classList.contains('done'));
        saveChecklist();
      };
      it.addEventListener('click', toggle);
      it.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
    updateChecklist();
  }

  function setCheck(el, on) {
    el.classList.toggle('done', on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    el.querySelector('.check-box').textContent = on ? '✓' : '';
  }

  function saveChecklist() {
    var done = [];
    $$('.check-item').forEach(function (it, i) { if (it.classList.contains('done')) done.push(i); });
    store.set('checklist', done);
    updateChecklist();
  }

  function updateChecklist() {
    var items = $$('.check-item');
    var done = items.filter(function (i) { return i.classList.contains('done'); }).length;
    var pct = items.length ? Math.round(done / items.length * 100) : 0;
    var bar = $('#progress-bar');
    var label = $('#progress-label');
    var party = $('#celebrate');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = done + ' / ' + items.length + ' completados';
    if (party) party.classList.toggle('show', items.length > 0 && done === items.length);
  }

  /* ── 08. SIMULADOR DE DEFENSA ORAL ───────────────────────────────── */
  var sim = (function () {
    var el, queue = [], idx = 0, good = 0, redo = [], timerId = null, left = 0;

    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    function fmt(s) {
      var m = Math.floor(s / 60), r = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    }

    function compName(id) {
      var c = $('.comp-card[data-comp="' + id + '"] .comp-name');
      return c ? c.textContent : id;
    }

    function stop() {
      if (timerId) { clearInterval(timerId); timerId = null; }
    }

    function startTimer() {
      stop();
      left = CONFIG.simSeconds;
      paintTimer();
      timerId = setInterval(function () {
        if (left > 0) left--;
        paintTimer();
        if (left === 0) stop();
      }, 1000);
    }

    function paintTimer() {
      var t = $('.sim-timer', el);
      if (!t) return;
      t.textContent = '⏱ ' + fmt(left);
      t.classList.toggle('low', left <= 15);
    }

    function paint(html) { $('.sim-body', el).innerHTML = html; }

    function idle() {
      stop();
      $('.sim-count', el).textContent = SIM_QUESTIONS.length + ' preguntas';
      var t = $('.sim-timer', el);
      if (t) { t.textContent = '⏱ ' + fmt(CONFIG.simSeconds); t.classList.remove('low'); }
      paint('<p class="muted">Simula la exposición: te hago una pregunta al azar y tienes ' + CONFIG.simSeconds +
        ' segundos para responderla en voz alta, como frente al profesor.</p>' +
        '<div class="sim-actions"><button class="btn btn-sim-start" data-sim="start">🎲 Empezar simulacro</button></div>');
    }

    function ask() {
      var item = queue[idx];
      $('.sim-count', el).textContent = 'Pregunta ' + (idx + 1) + ' de ' + queue.length;
      paint('<div class="sim-question">“' + item.q + '”</div>' +
        '<div class="sim-actions">' +
        '<button class="btn btn-sim-hint" data-sim="hint">💡 Pista</button>' +
        '<button class="btn btn-sim-ok" data-sim="good">✅ Me salió bien</button>' +
        '<button class="btn btn-sim-redo" data-sim="redo">🔁 Repasar</button>' +
        '<button class="btn btn-ghost" style="background:#EEF2FF;color:#4338CA;border-color:#C7D2FE" data-sim="skip">Otra →</button>' +
        '</div><div class="sim-hint-slot"></div>');
      startTimer();
    }

    function hint() {
      var item = queue[idx];
      var slot = $('.sim-hint-slot', el);
      if (!slot) return;
      if (item.comp) {
        slot.innerHTML = '<div class="sim-hint">Repasa el componente <strong>' + compName(item.comp) +
          '</strong><button data-comp="' + item.comp + '">Abrir →</button></div>';
      } else {
        slot.innerHTML = '<div class="sim-hint">Repasa la sección <strong>¿Qué espera ver el profesor?</strong>' +
          '<button data-go="' + item.page + '" data-anchor="' + (item.anchor || '') + '">Abrir →</button></div>';
      }
    }

    function next() {
      idx++;
      if (idx >= queue.length) return finish();
      ask();
    }

    function finish() {
      stop();
      $('.sim-count', el).textContent = 'Simulacro terminado';
      var list = '';
      if (redo.length) {
        var seen = {};
        list = '<div class="callout callout-warn"><div class="callout-icon">🔁</div><div class="callout-body"><h4>Para repasar</h4><ul>';
        redo.forEach(function (it) {
          var key = it.comp || it.page;
          if (seen[key]) return;
          seen[key] = true;
          list += it.comp
            ? '<li><button class="chip-link" data-comp="' + it.comp + '" style="border:none;background:none;color:#C2410C;font-weight:700;text-decoration:underline;padding:0">' + compName(it.comp) + '</button></li>'
            : '<li><button data-go="concepto" data-anchor="que-se-evalua" style="border:none;background:none;color:#C2410C;font-weight:700;text-decoration:underline;padding:0">¿Qué espera ver el profesor?</button></li>';
        });
        list += '</ul></div></div>';
      }
      paint('<div class="sim-summary"><div class="sim-score">' + good + ' / ' + queue.length + '</div>' +
        '<p style="text-align:center">respondidas con seguridad</p>' + list + '</div>' +
        '<div class="sim-actions"><button class="btn btn-sim-start" data-sim="start">🎲 Otro simulacro</button></div>');
    }

    function start() {
      queue = shuffle(SIM_QUESTIONS);
      idx = 0; good = 0; redo = [];
      ask();
    }

    function act(action) {
      if (action === 'start') start();
      else if (action === 'hint') hint();
      else if (action === 'good') { good++; next(); }
      else if (action === 'redo') { redo.push(queue[idx]); next(); }
      else if (action === 'skip') { redo.push(queue[idx]); next(); }
    }

    function init() {
      el = $('#sim');
      if (el) idle();
    }

    return { init: init, act: act, stop: stop };
  })();

  /* ── 09. VOLVER ARRIBA ───────────────────────────────────────────── */
  function initScrollTop() {
    var btn = $('.scroll-top');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('visible', window.pageYOffset > 400);
    }, { passive: true });
    btn.addEventListener('click', scrollToTop);
  }

  /* ── 10. VISOR DE IMÁGENES (LIGHTBOX) ────────────────────────────────
     · Envuelve cada captura (img.img-real y las de arquitectura).
     · ← → recorren las imágenes VISIBLES de la misma sección
       (respeta pestañas de sistema y "Revelar versión correcta").
     · Zoom: clic/tap, rueda, botones +/−, pellizco. Cierre: Esc, ✕, fondo, "atrás".
     ─────────────────────────────────────────────────────────────────── */
  var lightbox = (function () {
    var MIN = 1, MAX = 4, DOUBLE_TAP = 2.5, SWIPE_PX = 60;
    var group = [], index = 0, scale = 1, tx = 0, ty = 0;
    var pointers = {}, pinchDist = 0, pinchScale = 1, drag = null;
    var lastFocus = null, pushed = false;
    var overlay, stage, img, counter, title, zoomLabel, prevBtn, nextBtn;

    function wrapImages() {
      $$('img.img-real, .arch-card img').forEach(function (im) {
        if (im.closest('.zoomable')) return;
        var wrap = document.createElement('div');
        wrap.className = 'zoomable';
        wrap.tabIndex = 0;
        wrap.setAttribute('role', 'button');
        wrap.setAttribute('aria-label', 'Ampliar imagen: ' + (im.alt || 'captura'));
        im.parentNode.insertBefore(wrap, im);
        wrap.appendChild(im);
        var badge = document.createElement('div');
        badge.className = 'zoom-badge';
        badge.innerHTML = '🔍 <span>Ampliar</span>';
        wrap.appendChild(badge);
      });
    }

    function build() {
      overlay = document.createElement('div');
      overlay.className = 'lb-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Visor de imágenes');
      overlay.innerHTML =
        '<div class="lb-top"><span class="lb-counter"></span><div class="lb-title"></div>' +
        '<button class="lb-btn lb-close" aria-label="Cerrar (Esc)" title="Cerrar (Esc)">✕</button></div>' +
        '<div class="lb-stage">' +
        '<button class="lb-btn lb-nav lb-prev" aria-label="Anterior (←)" title="Anterior (←)">‹</button>' +
        '<img class="lb-img" alt="">' +
        '<button class="lb-btn lb-nav lb-next" aria-label="Siguiente (→)" title="Siguiente (→)">›</button></div>' +
        '<div class="lb-bottom">' +
        '<button class="lb-btn lb-zoom-out" aria-label="Alejar (−)" title="Alejar (−)">−</button>' +
        '<span class="lb-zoom-label">100%</span>' +
        '<button class="lb-btn lb-zoom-in" aria-label="Acercar (+)" title="Acercar (+)">+</button>' +
        '<button class="lb-btn lb-zoom-reset" aria-label="Ajustar a pantalla (0)" title="Ajustar (0)">⤢</button>' +
        '<span class="lb-hint">Clic para acercar · Arrastra para mover · ← → para cambiar</span></div>';
      root.appendChild(overlay);

      stage = $('.lb-stage', overlay);
      img = $('.lb-img', overlay);
      counter = $('.lb-counter', overlay);
      title = $('.lb-title', overlay);
      zoomLabel = $('.lb-zoom-label', overlay);
      prevBtn = $('.lb-prev', overlay);
      nextBtn = $('.lb-next', overlay);

      $('.lb-close', overlay).addEventListener('click', close);
      prevBtn.addEventListener('click', function () { go(-1); });
      nextBtn.addEventListener('click', function () { go(1); });
      $('.lb-zoom-in', overlay).addEventListener('click', function () { zoomBy(1.5); });
      $('.lb-zoom-out', overlay).addEventListener('click', function () { zoomBy(1 / 1.5); });
      $('.lb-zoom-reset', overlay).addEventListener('click', resetZoom);
      stage.addEventListener('click', function (e) { if (e.target === stage) close(); });
      stage.addEventListener('wheel', function (e) {
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
      }, { passive: false });

      img.addEventListener('pointerdown', pDown);
      window.addEventListener('pointermove', pMove);
      window.addEventListener('pointerup', pUp);
      window.addEventListener('pointercancel', pUp);
      img.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }

    function visible(el) { return el.offsetParent !== null || el.getClientRects().length > 0; }
    function isOpen() { return overlay && overlay.classList.contains('open'); }

    function open(wrap) {
      var scope = wrap.closest('.comp-detail, .page') || root;
      group = $$('.zoomable', scope).filter(visible);
      index = Math.max(0, group.indexOf(wrap));
      lastFocus = document.activeElement;
      document.body.style.overflow = 'hidden';
      overlay.classList.add('open');
      show(index);
      $('.lb-close', overlay).focus();
      try { history.pushState({ lb: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    }

    function close() {
      if (!isOpen()) return;
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      pointers = {};
      if (pushed) { pushed = false; try { history.back(); } catch (e) { /* sin historial */ } }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function caption(wrap) {
      var sib = wrap.nextElementSibling;
      if (sib && sib.classList.contains('img-caption')) return clean(sib.textContent);
      var holder = wrap.closest('.arch-card, .img-item, .pin-figure, .reveal-body, figure');
      if (holder) {
        var head = holder.querySelector('.arch-card-head');
        if (head) return 'Arquitectura — ' + clean(head.textContent);
        var cap = holder.querySelector('.img-caption');
        if (cap) return clean(cap.textContent);
      }
      var im = wrap.querySelector('img');
      return im ? im.alt : '';
    }
    function clean(t) { return t.trim().replace(/\s+/g, ' '); }

    function show(i) {
      index = (i + group.length) % group.length;
      var wrap = group[index];
      var src = wrap.querySelector('img');
      resetZoom();
      img.classList.add('loading');
      img.onload = function () { img.classList.remove('loading'); };
      img.src = src.currentSrc || src.src;
      img.alt = src.alt || '';
      if (img.complete) img.classList.remove('loading');
      counter.textContent = (index + 1) + ' / ' + group.length;
      title.textContent = caption(wrap);
      var multi = group.length > 1;
      prevBtn.hidden = !multi;
      nextBtn.hidden = !multi;
      if (multi) {
        [index - 1, index + 1].forEach(function (n) {
          new Image().src = group[(n + group.length) % group.length].querySelector('img').src;
        });
      }
    }

    function go(step) { if (group.length > 1) show(index + step); }

    function clampPan() {
      var limX = Math.max(0, (img.offsetWidth * scale - stage.clientWidth) / 2);
      var limY = Math.max(0, (img.offsetHeight * scale - stage.clientHeight) / 2);
      tx = Math.min(limX, Math.max(-limX, tx));
      ty = Math.min(limY, Math.max(-limY, ty));
    }

    function apply() {
      clampPan();
      img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
      img.classList.toggle('zoomed', scale > 1);
      zoomLabel.textContent = Math.round(scale * 100) + '%';
    }

    function resetZoom() { scale = 1; tx = 0; ty = 0; if (img) apply(); }

    function zoomAt(cx, cy, factor) {
      var next = Math.min(MAX, Math.max(MIN, scale * factor));
      if (next === scale) return;
      var r = stage.getBoundingClientRect();
      var ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
      var ratio = next / scale;
      tx = ox - (ox - tx) * ratio;
      ty = oy - (oy - ty) * ratio;
      scale = next;
      if (scale === 1) { tx = 0; ty = 0; }
      apply();
    }

    function zoomBy(f) {
      var r = stage.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
    }

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    function pDown(e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { img.setPointerCapture(e.pointerId); } catch (err) { /* ignorar */ }
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        pinchDist = dist(pointers[ids[0]], pointers[ids[1]]);
        pinchScale = scale;
        drag = null;
      } else {
        drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, moved: false };
        img.classList.add('dragging');
      }
    }

    function pMove(e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var d = dist(pointers[ids[0]], pointers[ids[1]]);
        if (pinchDist > 0) {
          zoomAt((pointers[ids[0]].x + pointers[ids[1]].x) / 2, (pointers[ids[0]].y + pointers[ids[1]].y) / 2,
            (pinchScale * d / pinchDist) / scale);
        }
        return;
      }
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) drag.moved = true;
      if (scale > 1) { tx = drag.tx + dx; ty = drag.ty + dy; apply(); }
    }

    function pUp(e) {
      if (!pointers[e.pointerId]) return;
      var wasPinch = Object.keys(pointers).length === 2;
      delete pointers[e.pointerId];
      img.classList.remove('dragging');
      if (wasPinch) { drag = null; return; }
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y, moved = drag.moved;
      drag = null;
      if (!moved) {
        if (scale > 1) resetZoom(); else zoomAt(e.clientX, e.clientY, DOUBLE_TAP);
      } else if (scale === 1 && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        go(dx < 0 ? 1 : -1);
      }
    }

    function init() {
      wrapImages();
      build();

      root.addEventListener('click', function (e) {
        var wrap = e.target.closest && e.target.closest('.zoomable');
        if (wrap && !isOpen()) open(wrap);
      });

      document.addEventListener('keydown', function (e) {
        if (!isOpen()) {
          var t = e.target;
          if ((e.key === 'Enter' || e.key === ' ') && t && t.classList && t.classList.contains('zoomable')) {
            e.preventDefault();
            open(t);
          }
          return;
        }
        switch (e.key) {
          case 'Escape': close(); break;
          case 'ArrowLeft': go(-1); break;
          case 'ArrowRight': go(1); break;
          case '+': case '=': zoomBy(1.5); break;
          case '-': case '_': zoomBy(1 / 1.5); break;
          case '0': resetZoom(); break;
          case 'Tab':
            e.preventDefault();
            var btns = $$('button', overlay).filter(function (b) { return !b.hidden; });
            var pos = btns.indexOf(document.activeElement);
            btns[(pos + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
            break;
        }
      });

      window.addEventListener('popstate', function () { if (isOpen()) { pushed = false; close(); } });
      window.addEventListener('resize', function () { if (isOpen()) apply(); });
    }

    return { init: init };
  })();

  /* ── 11. INICIO ──────────────────────────────────────────────────── */
  function bindEvents() {
    root.addEventListener('click', function (e) {
      var t = e.target;

      var sysPick = t.closest('[data-sys-pick]');
      if (sysPick) {
        setSystem(sysPick.dataset.sysPick);
        if (sysPick.dataset.go) go(sysPick.dataset.go);
        return;
      }

      var simBtn = t.closest('[data-sim]');
      if (simBtn) { sim.act(simBtn.dataset.sim); return; }

      var revealBtn = t.closest('[data-reveal]');
      if (revealBtn) { reveal(revealBtn); return; }

      var pin = t.closest('.pin, .pin-item');
      if (pin) { togglePin(pin); return; }

      if (t.closest('[data-comp-grid]')) { go('componentes', { comp: null }); return; }

      var comp = t.closest('[data-comp]');
      if (comp) { go('componentes', { comp: comp.dataset.comp }); return; }

      var nav = t.closest('[data-go]');
      if (nav) { go(nav.dataset.go, { anchor: nav.dataset.anchor || null }); return; }
    });

    // Los pines también se activan con teclado
    root.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('pin-item')) {
        e.preventDefault();
        togglePin(e.target);
      }
    });
  }

  /* ── 12. IMPRIMIR / GUARDAR PDF ──────────────────────────────────────
     El CSS de impresión (sección 17 de estilos.css) muestra TODO por sí solo:
     funciona incluso con Ctrl+P sin tocar el botón. Este módulo agrega:
       · el menú del botón "Imprimir / PDF" (con colores | ahorro de tinta);
       · la clase .ink-saver solo mientras dura la impresión;
       · la espera a que carguen las fuentes antes de abrir el diálogo.
     ─────────────────────────────────────────────────────────────────── */
  var printer = (function () {
    var toggleBtn, menu;

    function setMenu(open) {
      if (!menu) return;
      menu.hidden = !open;
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function run(mode) {
      setMenu(false);
      root.classList.toggle('ink-saver', mode === 'ink');
      var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      ready.then(function () { window.print(); });
    }

    function cleanup() { root.classList.remove('ink-saver'); }

    function init() {
      toggleBtn = $('[data-print-toggle]');
      menu = $('.ap-print-menu');
      if (!toggleBtn || !menu) return;

      toggleBtn.addEventListener('click', function (e) { e.stopPropagation(); setMenu(menu.hidden); });
      menu.addEventListener('click', function (e) {
        e.stopPropagation();
        var opt = e.target.closest('[data-print]');
        if (opt) run(opt.dataset.print);
      });
      document.addEventListener('click', function () { setMenu(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

      // Ctrl+P / menú del navegador: se imprime en colores; al terminar se limpia cualquier modo temporal
      window.addEventListener('afterprint', cleanup);
    }

    return { init: init };
  })();

  /* ── ARRANQUE ────────────────────────────────────────────────────── */
  function init() {
    if (root.dataset.apReady) return; // evita inicializar dos veces (p. ej. al integrarlo en SIGA)
    root.dataset.apReady = '1';
    injectMaps();
    buildPagers();
    buildCompPagers();
    bindEvents();
    initChecklist();
    sim.init();
    initScrollTop();
    lightbox.init();
    printer.init();
    watchEvaluationSection();
    renderProgress();
    refreshTabs();
    routeFromHash();

    // Para integrarlo en SIGA: document.getElementById('asesoria-pc1').asesoriaPC1.go('componentes', {comp:'kpis'})
    root.asesoriaPC1 = { go: go, setSystem: setSystem };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();