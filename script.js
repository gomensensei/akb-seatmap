/* global SEATMAP_DATA, triggerDownload, drawInfoGraphicText */
(function () {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  const state = { lang: 'ja', i18n: {}, selectedId: null, performanceId: 'reset', eventDate: '', displayName: '', mapZoom: 1 };
  const els = {
    html: document.documentElement,
    overlay: document.getElementById('seatOverlay'),
    selectedPill: document.getElementById('selectedPill'),
    selectionSummary: document.getElementById('selectionSummary'),
    selectionSub: document.getElementById('selectionSub'),
    performanceSelect: document.getElementById('performanceSelect'),
    eventDateInput: document.getElementById('eventDateInput'),
    langSelect: document.getElementById('langSelect'),
    nameInput: document.getElementById('nameInput'),
    downloadBtn: document.getElementById('downloadBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    mapScroll: document.getElementById('mapScroll'),
    mapStage: document.getElementById('mapStage'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomLevel: document.getElementById('zoomLevel'),
    modal: document.getElementById('exportModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    exportPreview: document.getElementById('exportPreview'),
    toast: document.getElementById('toast')
  };
  const itemById = new Map(SEATMAP_DATA.items.map(item => [item.id, item]));
  const ZOOM_MIN = 0.85;
  const ZOOM_MAX = 2.35;
  const ZOOM_STEP = 0.15;
  let pinchState = null;
  let resizeTimer = null;

  bindModalFailsafe();
  document.addEventListener('DOMContentLoaded', init);

  function bindModalFailsafe() {
    if (!els.modal) return;
    els.modal.hidden = true;
    els.modalCloseBtn?.addEventListener('click', event => { event.preventDefault(); closeModal(); });
    els.modal.addEventListener('click', event => { if (event.target === els.modal) closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !els.modal.hidden) closeModal(); });
  }

  async function init() {
    state.lang = detectLanguage();
    state.i18n = await loadI18n();
    readHash();
    buildPerformanceOptions();
    renderOverlay();
    bindEvents();
    bindMapZoomGestures();
    applyLanguage();
    updateUI();
    applyMapZoom();
    resetMapView(false);
  }

  function detectLanguage() {
    const saved = localStorage.getItem('seatmapLang');
    if (saved && ['ja', 'zh', 'en'].includes(saved)) return saved;
    const nav = (navigator.language || navigator.userLanguage || 'ja').toLowerCase();
    if (nav.startsWith('zh')) return 'zh';
    if (nav.startsWith('ja')) return 'ja';
    return 'en';
  }

  async function loadI18n() {
    try {
      const res = await fetch('langs.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('langs.json missing');
      return await res.json();
    } catch (error) {
      console.warn(error);
      return { ja: {} };
    }
  }

  function t(key) { return state.i18n[state.lang]?.[key] || state.i18n.ja?.[key] || key; }

  function readHash() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashLang = params.get('lang');
    const hashShow = params.get('show');
    const hashSeat = params.get('seat');
    const hashName = params.get('name');
    const hashEventDate = params.get('eventDate');
    if (hashLang && ['ja', 'zh', 'en'].includes(hashLang)) state.lang = hashLang;
    if (hashShow && SEATMAP_DATA.performances.some(p => p.id === hashShow)) state.performanceId = hashShow;
    if (hashSeat && itemById.has(hashSeat)) state.selectedId = hashSeat;
    if (hashEventDate) state.eventDate = decodeURIComponent(hashEventDate).slice(0, 40);
    if (hashName) state.displayName = decodeURIComponent(hashName).slice(0, 28);
  }

  function syncHash() {
    const params = new URLSearchParams();
    params.set('lang', state.lang);
    params.set('show', state.performanceId);
    if (state.selectedId) params.set('seat', state.selectedId);
    if (state.eventDate) params.set('eventDate', state.eventDate);
    if (state.displayName) params.set('name', state.displayName);
    history.replaceState(null, '', `#${params.toString()}`);
  }

  function buildPerformanceOptions() {
    els.performanceSelect.innerHTML = '';
    SEATMAP_DATA.performances.forEach(performance => {
      const option = document.createElement('option');
      option.value = performance.id;
      option.textContent = performance.label;
      els.performanceSelect.appendChild(option);
    });
  }

  function bindEvents() {
    els.performanceSelect.addEventListener('change', () => { state.performanceId = els.performanceSelect.value; syncHash(); updateUI(); });
    els.langSelect.addEventListener('change', () => {
      state.lang = els.langSelect.value;
      localStorage.setItem('seatmapLang', state.lang);
      applyLanguage();
      syncHash();
      renderSelection();
      updateUI();
    });
    els.eventDateInput.addEventListener('input', () => { state.eventDate = els.eventDateInput.value.trim().slice(0, 40); syncHash(); });
    els.nameInput.addEventListener('input', () => { state.displayName = els.nameInput.value.trim().slice(0, 28); syncHash(); });
    els.downloadBtn.addEventListener('click', exportImage);
    els.clearBtn.addEventListener('click', clearSelection);
    els.copyLinkBtn.addEventListener('click', copyShareLink);
    if (els.zoomOutBtn) els.zoomOutBtn.addEventListener('click', () => setMapZoom(state.mapZoom - ZOOM_STEP));
    if (els.zoomInBtn) els.zoomInBtn.addEventListener('click', () => setMapZoom(state.mapZoom + ZOOM_STEP));
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { applyMapZoom(); resetMapView(false); }, 120);
    });
  }

  function applyLanguage() {
    els.html.lang = state.lang;
    document.title = t('exportTitle');
    els.langSelect.value = state.lang;
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel)); });
  }

  function resetMapView(withToast) {
    const targetLeft = Math.max(0, (els.mapScroll.scrollWidth - els.mapScroll.clientWidth) / 2);
    els.mapScroll.scrollTo({ left: targetLeft, top: 0, behavior: withToast ? 'smooth' : 'auto' });
  }

  function getBaseMapWidth() {
    if (!els.mapScroll) return Math.min(920, window.innerWidth);
    const styles = window.getComputedStyle(els.mapScroll);
    const paddingX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    const available = Math.max(280, els.mapScroll.clientWidth - paddingX);
    return Math.min(920, available);
  }

  function applyMapZoom() {
    if (!els.mapStage) return;
    const width = Math.round(getBaseMapWidth() * state.mapZoom);
    els.mapStage.style.width = `${width}px`;
    updateZoomUI();
  }

  function setMapZoom(nextZoom, anchor) {
    if (!els.mapScroll) return;
    const previousZoom = state.mapZoom || 1;
    const next = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX);
    const anchorX = anchor?.x ?? els.mapScroll.clientWidth / 2;
    const anchorY = anchor?.y ?? els.mapScroll.clientHeight / 2;
    const logicalX = (els.mapScroll.scrollLeft + anchorX) / previousZoom;
    const logicalY = (els.mapScroll.scrollTop + anchorY) / previousZoom;
    state.mapZoom = next;
    applyMapZoom();
    els.mapScroll.scrollLeft = Math.max(0, logicalX * state.mapZoom - anchorX);
    els.mapScroll.scrollTop = Math.max(0, logicalY * state.mapZoom - anchorY);
  }

  function updateZoomUI() {
    if (els.zoomLevel) els.zoomLevel.textContent = `${Math.round((state.mapZoom || 1) * 100)}%`;
    if (els.zoomOutBtn) els.zoomOutBtn.disabled = state.mapZoom <= ZOOM_MIN + 0.001;
    if (els.zoomInBtn) els.zoomInBtn.disabled = state.mapZoom >= ZOOM_MAX - 0.001;
  }

  function bindMapZoomGestures() {
    if (!els.mapScroll) return;
    els.mapScroll.addEventListener('touchstart', event => {
      if (event.touches.length !== 2) return;
      pinchState = {
        distance: getTouchDistance(event.touches),
        zoom: state.mapZoom,
        center: getTouchCenterInElement(event.touches, els.mapScroll)
      };
    }, { passive: true });

    els.mapScroll.addEventListener('touchmove', event => {
      if (!pinchState || event.touches.length !== 2) return;
      event.preventDefault();
      const distance = getTouchDistance(event.touches);
      const center = getTouchCenterInElement(event.touches, els.mapScroll);
      setMapZoom(pinchState.zoom * (distance / pinchState.distance), center);
    }, { passive: false });

    els.mapScroll.addEventListener('touchend', event => {
      if (event.touches.length < 2) pinchState = null;
    }, { passive: true });

    els.mapScroll.addEventListener('wheel', event => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const rect = els.mapScroll.getBoundingClientRect();
      const direction = event.deltaY > 0 ? -1 : 1;
      setMapZoom(state.mapZoom + direction * ZOOM_STEP, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }, { passive: false });
  }

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy) || 1;
  }

  function getTouchCenterInElement(touches, element) {
    const rect = element.getBoundingClientRect();
    return {
      x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
      y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top
    };
  }

  function renderOverlay() {
    els.overlay.innerHTML = '';
    els.overlay.setAttribute('viewBox', `0 0 ${SEATMAP_DATA.width} ${SEATMAP_DATA.height}`);
    els.overlay.appendChild(createDefs());
    const hitLayer = svgEl('g', { id: 'hitLayer' });
    SEATMAP_DATA.items.forEach(item => hitLayer.appendChild(createHitRect(item)));
    const selectionLayer = svgEl('g', { id: 'selectionLayer' });
    els.overlay.append(hitLayer, selectionLayer);
    renderSelection();
  }

  function createDefs() {
    const defs = svgEl('defs');
    const seatGlow = svgEl('filter', { id: 'seatGlow', x: '-80%', y: '-80%', width: '260%', height: '260%' });
    seatGlow.appendChild(svgEl('feGaussianBlur', { stdDeviation: '2.2', result: 'blur' }));
    seatGlow.appendChild(svgEl('feFlood', { 'flood-color': '#ff007f', 'flood-opacity': '0.72', result: 'color' }));
    seatGlow.appendChild(svgEl('feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'shadow' }));
    const merge = svgEl('feMerge');
    merge.appendChild(svgEl('feMergeNode', { in: 'shadow' }));
    merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
    seatGlow.appendChild(merge);
    const selectionGlow = seatGlow.cloneNode(true); selectionGlow.setAttribute('id', 'selectionGlow'); selectionGlow.querySelector('feGaussianBlur').setAttribute('stdDeviation', '4');
    const arrowGlow = seatGlow.cloneNode(true); arrowGlow.setAttribute('id', 'arrowGlow'); arrowGlow.querySelector('feGaussianBlur').setAttribute('stdDeviation', '3.2');
    defs.append(seatGlow, selectionGlow, arrowGlow);
    return defs;
  }

  function createHitRect(item) {
    const rect = svgEl('rect', {
      class: 'seat-hit',
      x: item.x,
      y: item.y,
      width: item.w,
      height: item.h,
      rx: 2.2,
      tabindex: 0,
      role: 'button',
      'aria-label': getLocalizedSeatLabel(item),
      'data-seat-id': item.id
    });
    rect.addEventListener('click', () => selectItem(item.id));
    rect.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectItem(item.id);
      }
    });
    return rect;
  }

  function selectItem(id) {
    state.selectedId = state.selectedId === id ? null : id;
    syncHash();
    renderSelection();
    updateUI();
  }

  function renderSelection() {
    const layer = els.overlay.querySelector('#selectionLayer');
    if (!layer) return;
    layer.innerHTML = '';
    els.overlay.querySelectorAll('[data-seat-id]').forEach(node => node.classList.toggle('is-selected', node.dataset.seatId === state.selectedId));
    if (!state.selectedId) return;
    const item = itemById.get(state.selectedId);
    if (!item) return;
    layer.appendChild(svgEl('rect', { class: 'selection-rect', x: item.x - 3, y: item.y - 3, width: item.w + 6, height: item.h + 6, rx: 5 }));
    layer.appendChild(createArrowCallout(item));
  }

  function createArrowCallout(item) {
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const above = cy > 86;
    const group = svgEl('g', { class: 'arrow-callout' });
    const labelW = state.lang === 'en' ? 94 : 82;
    const labelH = 25;
    const labelX = clamp(cx - labelW / 2, 10, SEATMAP_DATA.width - labelW - 10);
    const labelY = above ? Math.max(18, cy - 62) : cy + 38;
    const arrowTipY = above ? item.y - 5 : item.y + item.h + 5;
    const arrowBaseY = above ? labelY + labelH : labelY;
    group.appendChild(svgEl('rect', { class: 'arrow-label-bg', x: labelX, y: labelY, width: labelW, height: labelH, rx: 13 }));
    const labelText = svgEl('text', { x: labelX + labelW / 2, y: labelY + labelH / 2 });
    labelText.textContent = t('arrowText');
    group.appendChild(labelText);
    const arrowPath = above
      ? `M ${cx - 9} ${arrowBaseY - 1} L ${cx + 9} ${arrowBaseY - 1} L ${cx + 9} ${arrowTipY - 18} L ${cx + 21} ${arrowTipY - 18} L ${cx} ${arrowTipY} L ${cx - 21} ${arrowTipY - 18} L ${cx - 9} ${arrowTipY - 18} Z`
      : `M ${cx - 9} ${arrowBaseY + 1} L ${cx + 9} ${arrowBaseY + 1} L ${cx + 9} ${arrowTipY + 18} L ${cx + 21} ${arrowTipY + 18} L ${cx} ${arrowTipY} L ${cx - 21} ${arrowTipY + 18} L ${cx - 9} ${arrowTipY + 18} Z`;
    group.appendChild(svgEl('path', { class: 'arrow-body', d: arrowPath }));
    return group;
  }

  function updateUI() {
    const item = state.selectedId ? itemById.get(state.selectedId) : null;
    const performance = getCurrentPerformance();
    els.performanceSelect.value = state.performanceId;
    els.langSelect.value = state.lang;
    els.nameInput.value = state.displayName;
    els.eventDateInput.value = state.eventDate;
    if (!item) {
      els.selectedPill.textContent = t('noSelection');
      els.selectionSummary.textContent = t('noSelection');
      els.selectionSub.textContent = t('selectHint');
      els.downloadBtn.disabled = true;
      return;
    }
    const label = getLocalizedSeatLabel(item);
    els.selectedPill.textContent = `${performance.label}｜${label}`;
    els.selectionSummary.textContent = label;
    els.selectionSub.textContent = t('selectedHint');
    els.downloadBtn.disabled = false;
  }

  function getLocalizedSeatLabel(item) {
    if (!item) return t('noSelection');
    if (item.type === 'standing') {
      if (state.lang === 'zh') return `立見區域 ${item.area} 第 ${item.row} 行 ${item.number} 號`;
      if (state.lang === 'en') return `Standing Area ${item.area} / Row ${item.row} / Slot ${item.number}`;
      return `立見エリア ${item.area} ${item.row}行 ${item.number}番`;
    }
    if (state.lang === 'zh') return `${item.row} 列 ${item.number} 號`;
    if (state.lang === 'en') return `Row ${item.row} / Seat ${item.number}`;
    return `${item.row}列 ${item.number}番`;
  }

  function getCurrentPerformance() { return SEATMAP_DATA.performances.find(p => p.id === state.performanceId) || SEATMAP_DATA.performances[0]; }

  function copyShareLink() {
    syncHash();
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => showToast(t('copied'))).catch(() => showToast(t('copyFailed')));
    } else {
      showToast(t('copyFailed'));
    }
  }

  function clearSelection() {
    state.selectedId = null;
    syncHash();
    renderSelection();
    updateUI();
    showToast(t('cleared'));
  }

  async function exportImage() {
    if (!state.selectedId) { showToast(t('downloadNoSelection')); return; }
    const dataUrl = await buildExportPng();
    if (shouldOpenPreview()) { openModal(dataUrl); return; }
    const item = itemById.get(state.selectedId);
    const safeLabel = getLocalizedSeatLabel(item).replace(/[\\/:*?"<>|\s]+/g, '_');
    const filename = `akb48-seat-memo_${getCurrentPerformance().id}_${safeLabel}.png`;
    if (typeof triggerDownload === 'function') triggerDownload(dataUrl, filename);
    else { const link = document.createElement('a'); link.href = dataUrl; link.download = filename; link.click(); }
  }

  function shouldOpenPreview() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
    return isIOS || isSafari;
  }

  function openModal(dataUrl) { els.exportPreview.src = dataUrl; els.modal.hidden = false; }
  function closeModal() { els.modal.hidden = true; els.exportPreview.removeAttribute('src'); }

  async function buildExportPng() {
    const logicalW = SEATMAP_DATA.width;
    const logicalH = SEATMAP_DATA.height;
    const scale = 3;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = logicalW * scale;
    canvas.height = logicalH * scale;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, logicalW, logicalH);
    const image = await loadImage('assets/seatmap.svg?v=3.3.0');
    ctx.drawImage(image, 0, 0, logicalW, SEATMAP_DATA.height);
    const item = itemById.get(state.selectedId);
    if (item) { drawSelectedMark(ctx, item); drawCanvasArrow(ctx, item); }
    drawExportInfoPanel(ctx, item);
    return canvas.toDataURL('image/png');
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawSelectedMark(ctx, item) {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 0, 127, 0.75)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(255, 0, 127, 0.35)';
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    roundRect(ctx, item.x - 3, item.y - 3, item.w + 6, item.h + 6, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCanvasArrow(ctx, item) {
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const above = cy > 86;
    const labelW = state.lang === 'en' ? 94 : 82;
    const labelH = 25;
    const labelX = clamp(cx - labelW / 2, 10, SEATMAP_DATA.width - labelW - 10);
    const labelY = above ? Math.max(18, cy - 62) : cy + 38;
    const arrowTipY = above ? item.y - 5 : item.y + item.h + 5;
    const arrowBaseY = above ? labelY + labelH : labelY;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 0, 127, 0.75)';
    ctx.shadowBlur = 9;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 1.6;
    roundRect(ctx, labelX, labelY, labelW, labelH, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff007f';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (above) {
      ctx.moveTo(cx - 9, arrowBaseY - 1); ctx.lineTo(cx + 9, arrowBaseY - 1); ctx.lineTo(cx + 9, arrowTipY - 18); ctx.lineTo(cx + 21, arrowTipY - 18); ctx.lineTo(cx, arrowTipY); ctx.lineTo(cx - 21, arrowTipY - 18); ctx.lineTo(cx - 9, arrowTipY - 18);
    } else {
      ctx.moveTo(cx - 9, arrowBaseY + 1); ctx.lineTo(cx + 9, arrowBaseY + 1); ctx.lineTo(cx + 9, arrowTipY + 18); ctx.lineTo(cx + 21, arrowTipY + 18); ctx.lineTo(cx, arrowTipY); ctx.lineTo(cx - 21, arrowTipY + 18); ctx.lineTo(cx - 9, arrowTipY + 18);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff007f';
    ctx.font = '900 12px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('arrowText'), labelX + labelW / 2, labelY + labelH / 2);
    ctx.restore();
  }

  function drawExportInfoPanel(ctx, item) {
    const performance = getCurrentPerformance();
    const seatLabel = item ? getLocalizedSeatLabel(item) : t('noSelection');
    const eventDate = formatEventDateForDisplay(state.eventDate);
    const panelX = 500;
    const panelY = 518;
    const panelW = 238;
    const panelH = state.displayName ? 104 : 88;
    const accent = '#ff007f';

    ctx.save();
    ctx.shadowColor = 'rgba(27, 35, 48, 0.16)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255, 247, 251, 0.96)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    roundRect(ctx, panelX, panelY, panelW, panelH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    roundRect(ctx, panelX + 12, panelY + 12, 5, panelH - 24, 3);
    ctx.fill();

    const lines = [
      { text: t('exportTitle'), font: '900 18px "Noto Sans JP", sans-serif', color: '#1b2330', x: panelX + 25, y: panelY + 27 },
      { text: `${t('performanceLabel')}：${performance.label}`, font: '800 11px "Noto Sans JP", sans-serif', color: accent, x: panelX + 25, y: panelY + 48 },
      { text: `${t('eventDateLabel')}：${eventDate || '—'}`, font: '800 11px "Noto Sans JP", sans-serif', color: '#1b2330', x: panelX + 25, y: panelY + 65 },
      { text: `${t('mySeat')}：${seatLabel}`, font: '900 13px "Noto Sans JP", sans-serif', color: '#1b2330', x: panelX + 25, y: panelY + 83 }
    ];
    if (state.displayName) {
      lines.push({ text: `${t('nameLabel')}：${state.displayName}`, font: '700 10px "Noto Sans JP", sans-serif', color: '#7F8C8D', x: panelX + 25, y: panelY + 99 });
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    lines.forEach(line => {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, line.x, line.y, panelW - 38);
    });
    ctx.restore();
  }

  function formatEventDateForDisplay(value) {
    if (!value) return '';
    const normalized = value.replace('T', ' ');
    if (state.lang === 'en') return normalized;
    if (state.lang === 'zh') return normalized;
    return normalized;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function svgEl(name, attrs = {}) {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attrs).forEach(([key, value]) => { if (value !== undefined && value !== null) node.setAttribute(key, value); });
    return node;
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function showToast(message) { els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2200); }
}());
