/* ════════════════════════════════════════════════════════════════
   LIGHTBOX — Visor de imágenes de la asesoría
   · Se activa solo en las capturas (.img-real y arquitecturas).
   · No requiere tocar el HTML: envuelve las imágenes al cargar.
   · Galería: ← → recorren las imágenes VISIBLES de la misma sección
     (respeta pestañas de sistema y el "Revelar versión correcta").
   · Zoom: clic/tap, rueda del mouse, botones +/−, pellizco en móvil.
   · Cierre: Esc, botón ✕, clic fuera de la imagen o botón "atrás".
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MIN_SCALE = 1;
  var MAX_SCALE = 4;
  var DOUBLE_TAP_SCALE = 2.5;
  var SWIPE_MIN_PX = 60;

  // ── Estado ────────────────────────────────────────────────────
  var group = [];        // wrappers .zoomable del grupo actual
  var index = 0;         // posición actual dentro del grupo
  var scale = 1, tx = 0, ty = 0;
  var pointers = {};     // punteros activos (arrastre / pellizco)
  var pinchStartDist = 0, pinchStartScale = 1;
  var dragStart = null;  // {x, y, tx, ty, moved}
  var lastFocus = null;
  var pushedHistory = false;

  var overlay, stage, imgEl, counterEl, titleEl, zoomLabel, prevBtn, nextBtn;

  // ── 1. Preparar imágenes: envolver y hacerlas accesibles ──────
  function wrapImages() {
    var imgs = document.querySelectorAll('main img.img-real, main .arch-card img');
    imgs.forEach(function (img) {
      if (img.closest('.zoomable')) return;

      var wrap = document.createElement('div');
      wrap.className = 'zoomable';
      wrap.tabIndex = 0;
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('aria-label', 'Ampliar imagen: ' + (img.alt || 'captura'));

      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);

      var badge = document.createElement('div');
      badge.className = 'zoom-badge';
      badge.innerHTML = '🔍 <span>Ampliar</span>';
      wrap.appendChild(badge);
    });
  }

  // ── 2. Construir el visor (una sola vez) ──────────────────────
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Visor de imágenes');
    overlay.innerHTML =
      '<div class="lb-top">' +
      '  <span class="lb-counter"></span>' +
      '  <div class="lb-title"></div>' +
      '  <button class="lb-btn lb-close" aria-label="Cerrar (Esc)" title="Cerrar (Esc)">✕</button>' +
      '</div>' +
      '<div class="lb-stage">' +
      '  <button class="lb-btn lb-nav lb-prev" aria-label="Anterior (←)" title="Anterior (←)">‹</button>' +
      '  <img class="lb-img" alt="">' +
      '  <button class="lb-btn lb-nav lb-next" aria-label="Siguiente (→)" title="Siguiente (→)">›</button>' +
      '</div>' +
      '<div class="lb-bottom">' +
      '  <button class="lb-btn lb-zoom-out" aria-label="Alejar (−)" title="Alejar (−)">−</button>' +
      '  <span class="lb-zoom-label">100%</span>' +
      '  <button class="lb-btn lb-zoom-in" aria-label="Acercar (+)" title="Acercar (+)">+</button>' +
      '  <button class="lb-btn lb-zoom-reset" aria-label="Ajustar a pantalla (0)" title="Ajustar (0)">⤢</button>' +
      '  <span class="lb-hint">Clic para acercar · Arrastra para mover · ← → para cambiar</span>' +
      '</div>';
    document.body.appendChild(overlay);

    stage = overlay.querySelector('.lb-stage');
    imgEl = overlay.querySelector('.lb-img');
    counterEl = overlay.querySelector('.lb-counter');
    titleEl = overlay.querySelector('.lb-title');
    zoomLabel = overlay.querySelector('.lb-zoom-label');
    prevBtn = overlay.querySelector('.lb-prev');
    nextBtn = overlay.querySelector('.lb-next');

    overlay.querySelector('.lb-close').addEventListener('click', close);
    prevBtn.addEventListener('click', function () { go(-1); });
    nextBtn.addEventListener('click', function () { go(1); });
    overlay.querySelector('.lb-zoom-in').addEventListener('click', function () { zoomBy(1.5); });
    overlay.querySelector('.lb-zoom-out').addEventListener('click', function () { zoomBy(1 / 1.5); });
    overlay.querySelector('.lb-zoom-reset').addEventListener('click', resetZoom);

    // Clic en el fondo (fuera de la imagen y de los botones) cierra
    stage.addEventListener('click', function (e) {
      if (e.target === stage) close();
    });

    // Rueda del mouse = zoom en el punto del cursor
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
    }, { passive: false });

    // Punteros: arrastre, swipe y pellizco
    imgEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    imgEl.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  // ── 3. Abrir / cerrar ─────────────────────────────────────────
  function isVisible(el) {
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  function open(wrap) {
    // Grupo = imágenes visibles de la misma sección del componente
    var scope = wrap.closest('.comp-block-body, .section') || document.querySelector('main');
    group = Array.prototype.filter.call(scope.querySelectorAll('.zoomable'), isVisible);
    index = Math.max(0, group.indexOf(wrap));

    lastFocus = document.activeElement;
    document.body.classList.add('lb-lock');
    overlay.classList.add('open');
    show(index);
    overlay.querySelector('.lb-close').focus();

    // Botón "atrás" del celular/navegador cierra el visor en vez de salir de la página
    try {
      history.pushState({ lb: 1 }, '');
      pushedHistory = true;
    } catch (err) { pushedHistory = false; }
  }

  function close() {
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    document.body.classList.remove('lb-lock');
    pointers = {};
    if (pushedHistory) {
      pushedHistory = false;
      try { history.back(); } catch (err) { /* sin historial: ignorar */ }
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function isOpen() { return overlay && overlay.classList.contains('open'); }

  // ── 4. Mostrar imagen del grupo ───────────────────────────────
  function captionFor(wrap) {
    var img = wrap.querySelector('img');
    var sib = wrap.nextElementSibling;
    if (sib && sib.classList.contains('img-caption')) return sib.textContent.trim().replace(/\s+/g, ' ');
    var card = wrap.closest('.arch-card');
    if (card) {
      var head = card.querySelector('.arch-card-head');
      if (head) return 'Arquitectura — ' + head.textContent.trim();
    }
    var inItem = wrap.closest('.img-item');
    if (inItem) {
      var cap = inItem.querySelector('.img-caption');
      if (cap) return cap.textContent.trim().replace(/\s+/g, ' ');
    }
    return img.alt || '';
  }

  function show(i) {
    index = (i + group.length) % group.length;
    var wrap = group[index];
    var src = wrap.querySelector('img').currentSrc || wrap.querySelector('img').src;

    resetZoom(true);
    imgEl.classList.add('loading');
    imgEl.onload = function () { imgEl.classList.remove('loading'); };
    imgEl.src = src;
    imgEl.alt = wrap.querySelector('img').alt || '';
    if (imgEl.complete) imgEl.classList.remove('loading');

    counterEl.textContent = (index + 1) + ' / ' + group.length;
    titleEl.textContent = captionFor(wrap);

    var multi = group.length > 1;
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;

    // Precarga vecinas para que el cambio sea instantáneo
    [index - 1, index + 1].forEach(function (n) {
      if (group.length < 2) return;
      var w = group[(n + group.length) % group.length];
      new Image().src = w.querySelector('img').src;
    });
  }

  function go(step) {
    if (group.length > 1) show(index + step);
  }

  // ── 5. Zoom y desplazamiento ──────────────────────────────────
  function clampPan() {
    var sw = stage.clientWidth, sh = stage.clientHeight;
    var iw = imgEl.offsetWidth * scale, ih = imgEl.offsetHeight * scale;
    var limX = Math.max(0, (iw - sw) / 2);
    var limY = Math.max(0, (ih - sh) / 2);
    tx = Math.min(limX, Math.max(-limX, tx));
    ty = Math.min(limY, Math.max(-limY, ty));
  }

  function applyTransform() {
    clampPan();
    imgEl.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    imgEl.classList.toggle('zoomed', scale > 1);
    zoomLabel.textContent = Math.round(scale * 100) + '%';
  }

  function resetZoom(silent) {
    scale = 1; tx = 0; ty = 0;
    applyTransform();
  }

  // Zoom manteniendo fijo el punto (clientX, clientY) bajo el dedo/cursor
  function zoomAt(clientX, clientY, factor) {
    var next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    if (next === scale) return;
    var rect = stage.getBoundingClientRect();
    var cx = clientX - (rect.left + rect.width / 2);
    var cy = clientY - (rect.top + rect.height / 2);
    var ratio = next / scale;
    tx = cx - (cx - tx) * ratio;
    ty = cy - (cy - ty) * ratio;
    scale = next;
    if (scale === 1) { tx = 0; ty = 0; }
    applyTransform();
  }

  function zoomBy(factor) {
    var rect = stage.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }

  // ── 6. Gestos: clic, arrastre, swipe, pellizco ────────────────
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function onPointerDown(e) {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { imgEl.setPointerCapture(e.pointerId); } catch (err) { }
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      pinchStartDist = dist(pointers[ids[0]], pointers[ids[1]]);
      pinchStartScale = scale;
      dragStart = null;
    } else {
      dragStart = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, moved: false };
      imgEl.classList.add('dragging');
    }
  }

  function onPointerMove(e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);

    if (ids.length === 2) {            // pellizco
      var d = dist(pointers[ids[0]], pointers[ids[1]]);
      if (pinchStartDist > 0) {
        var mx = (pointers[ids[0]].x + pointers[ids[1]].x) / 2;
        var my = (pointers[ids[0]].y + pointers[ids[1]].y) / 2;
        zoomAt(mx, my, (pinchStartScale * d / pinchStartDist) / scale);
      }
      return;
    }

    if (!dragStart) return;
    var dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragStart.moved = true;
    if (scale > 1) {                   // mover la imagen ampliada
      tx = dragStart.tx + dx;
      ty = dragStart.ty + dy;
      applyTransform();
    }
  }

  function onPointerUp(e) {
    if (!pointers[e.pointerId]) return;
    var wasPinch = Object.keys(pointers).length === 2;
    delete pointers[e.pointerId];
    imgEl.classList.remove('dragging');

    if (wasPinch) { dragStart = null; return; }
    if (!dragStart) return;

    var dx = e.clientX - dragStart.x;
    var dy = e.clientY - dragStart.y;
    var moved = dragStart.moved;
    dragStart = null;

    if (!moved) {                      // fue un clic / tap → alternar zoom
      if (scale > 1) resetZoom();
      else zoomAt(e.clientX, e.clientY, DOUBLE_TAP_SCALE);
    } else if (scale === 1 && Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1);             // swipe horizontal = siguiente / anterior
    }
  }

  // ── 7. Teclado ────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) {
      // Enter / Espacio sobre una imagen enfocada la abre
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
      case 'Tab':                      // el foco circula SOLO dentro del visor
        e.preventDefault();
        var btns = Array.prototype.slice.call(overlay.querySelectorAll('button')).filter(function (b) { return !b.hidden; });
        var pos = btns.indexOf(document.activeElement);
        var nextPos = e.shiftKey ? pos - 1 : pos + 1;
        btns[(nextPos + btns.length) % btns.length].focus();
        break;
    }
  });

  // Botón "atrás" del navegador
  window.addEventListener('popstate', function () {
    if (isOpen()) { pushedHistory = false; close(); }
  });

  // Reajustar al rotar el celular / cambiar tamaño de ventana
  window.addEventListener('resize', function () { if (isOpen()) applyTransform(); });

  // ── 8. Delegación de clics en las imágenes ────────────────────
  document.addEventListener('click', function (e) {
    var wrap = e.target.closest && e.target.closest('.zoomable');
    if (wrap && !isOpen()) open(wrap);
  });

  // ── INIT ──────────────────────────────────────────────────────
  function init() {
    wrapImages();
    buildOverlay();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
