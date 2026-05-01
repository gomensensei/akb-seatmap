/* global SEATMAP_DATA, triggerDownload, drawInfoGraphicText */
(function () {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  const state = { lang: 'ja', i18n: {}, selectedId: null, performanceId: 'reset', displayName: '' };
  const els = {
    html: document.documentElement,
    overlay: document.getElementById('seatOverlay'),
    selectedPill: document.getElementById('selectedPill'),
    selectionSummary: document.getElementById('selectionSummary'),
    selectionSub: document.getElementById('selectionSub'),
    performanceSelect: document.getElementById('performanceSelect'),
    langSelect: document.getElementById('langSelect'),
    nameInput: document.getElementById('nameInput'),
    downloadBtn: document.getElementById('downloadBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    mapScroll: document.getElementById('mapScroll'),
    modal: document.getElementById('exportModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    exportPreview: document.getElementById('exportPreview'),
    openImageLink: document.getElementById('openImageLink'),
    toast: document.getElementById('toast')
  };
  const itemById = new Map(SEATMAP_DATA.items.map(item => [item.id, item]));
  const selectableItems = SEATMAP_DATA.items.filter(item => item.type === 'seat' || item.type === 'standing');
  const markItems = SEATMAP_DATA.items.filter(item => item.type === 'mark');

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
    bindEvents();
    applyLanguage();
    renderOverlay();
    updateUI();
    resetMapView();
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
    if (hashLang && ['ja', 'zh', 'en'].includes(hashLang)) state.lang = hashLang;
    if (hashShow && SEATMAP_DATA.performances.some(p => p.id === hashShow)) state.performanceId = hashShow;
    if (hashSeat && itemById.has(hashSeat)) state.selectedId = hashSeat;
    if (hashName) state.displayName = decodeURIComponent(hashName).slice(0, 28);
  }

  function syncHash() {
    const params = new URLSearchParams();
    params.set('lang', state.lang);
    params.set('show', state.performanceId);
    if (state.selectedId) params.set('seat', state.selectedId);
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
      renderOverlay();
      syncHash();
      updateUI();
    });
    els.nameInput.addEventListener('input', () => { state.displayName = els.nameInput.value.trim().slice(0, 28); syncHash(); });
    els.downloadBtn.addEventListener('click', exportImage);
    els.clearBtn.addEventListener('click', clearSelection);
    els.copyLinkBtn.addEventListener('click', copyShareLink);
    els.zoomResetBtn.addEventListener('click', () => { resetMapView(); showToast(t('resetView')); });
  }

  function applyLanguage() {
    els.html.lang = state.lang;
    document.title = t('exportTitle');
    els.langSelect.value = state.lang;
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  }

  function resetMapView() {
    const targetLeft = Math.max(0, (els.mapScroll.scrollWidth - els.mapScroll.clientWidth) / 2);
    els.mapScroll.scrollLeft = targetLeft;
    els.mapScroll.scrollTop = 0;
  }

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

  function renderOverlay() {
    const svg = els.overlay;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${SEATMAP_DATA.width} ${SEATMAP_DATA.height}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.appendChild(createDefs());
    svg.appendChild(drawBaseMap());
    svg.appendChild(drawMarkLayer());

    const seatLayer = svgEl('g', { id: 'seatLayer' });
    selectableItems.forEach(item => {
      seatLayer.appendChild(item.type === 'standing' ? createStandingCell(item) : createSeatNode(item));
    });
    const selectionLayer = svgEl('g', { id: 'selectionLayer' });
    svg.append(seatLayer, selectionLayer);
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

  function drawBaseMap() {
    const root = svgEl('g', { id: 'baseMap' });
    // Outer venue outline refined to better match the original map silhouette.
    root.appendChild(svgEl('path', {
      d: 'M40 24 H600 Q628 24 628 52 V700 Q628 736 600 736 H96 V644 H28 V52 Q28 24 40 24 Z',
      fill: '#fffdfd', stroke: '#111', 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));

    // Bottom-left entrance enclosure on the outer wall.
    root.appendChild(svgEl('path', { d: 'M96 736 V640 H28', fill: 'none', stroke: '#111', 'stroke-width': 5, 'stroke-linecap': 'round' }));

    // Top door opening downward
    root.appendChild(svgEl('path', { class: 'stage-door', d: 'M287 47 V8 H320 V41 M353 47 V8 H320 V41 M287 8 H353' }));
    root.appendChild(svgEl('path', { class: 'stage-door', d: 'M320 41 Q302 24 287 47' }));
    root.appendChild(svgEl('path', { class: 'stage-door', d: 'M320 41 Q338 24 353 47' }));
    root.appendChild(mapText(320, 24, t('mapDoor'), 'base-caption', { 'text-anchor': 'middle' }));

    // Stage block
    root.appendChild(svgEl('rect', { x: 118, y: 84, width: 404, height: 88, fill: '#f8eef2', stroke: '#111', 'stroke-width': 2.2 }));
    root.appendChild(svgEl('line', { x1: 118, y1: 116, x2: 522, y2: 116, stroke: '#111', 'stroke-width': 1.8 }));
    root.appendChild(svgEl('line', { x1: 219, y1: 84, x2: 219, y2: 172, stroke: '#111', 'stroke-width': 1.4 }));
    root.appendChild(svgEl('line', { x1: 421, y1: 84, x2: 421, y2: 172, stroke: '#111', 'stroke-width': 1.4 }));
    root.appendChild(svgEl('line', { x1: 320, y1: 154, x2: 320, y2: 171, stroke: '#111', 'stroke-width': 2 }));
    root.appendChild(mapText(320, 110, t('mapSeri'), 'base-caption', { 'text-anchor': 'middle' }));
    root.appendChild(mapText(320, 144, t('mapStage'), 'base-label', { 'font-size': 20, 'text-anchor': 'middle' }));

    // Wings
    root.appendChild(svgEl('rect', { x: 20, y: 52, width: 58, height: 146, fill: '#000' }));
    root.appendChild(svgEl('rect', { x: 562, y: 52, width: 58, height: 146, fill: '#000' }));
    root.appendChild(svgEl('rect', { x: 30, y: 198, width: 45, height: 4, fill: '#26c6e8' }));
    root.appendChild(svgEl('rect', { x: 565, y: 198, width: 38, height: 4, fill: '#26c6e8' }));
    root.appendChild(mapText(50, 126, t('mapShimoteWing'), 'map-section-title', { 'text-anchor': 'middle', transform: 'rotate(90 50 126)' }));
    root.appendChild(mapText(591, 126, t('mapKamiteWing'), 'map-section-title', { 'text-anchor': 'middle', transform: 'rotate(90 591 126)' }));

    root.appendChild(svgEl('path', { d: 'M58 226 H582 Q584 244 572 260 V304 H602 Q622 304 622 322 V338 Q622 352 602 352 H572 V552 H523 V628 H435 V695 H96 V640 H58 V226 Z', fill: 'none', stroke: '#111', 'stroke-width': 3.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    root.appendChild(svgEl('path', { d: 'M58 226 C58 250 44 254 44 254 L44 382', fill: 'none', stroke: '#111', 'stroke-width': 2.2 }));
    root.appendChild(svgEl('path', { d: 'M582 226 C582 250 596 254 596 254 L596 382', fill: 'none', stroke: '#111', 'stroke-width': 2.2 }));

    root.appendChild(mapText(30, 320, t('mapShimoteHanamichi'), 'map-section-vertical', { 'text-anchor': 'middle' }));
    root.appendChild(mapText(610, 320, t('mapKamiteHanamichi'), 'map-section-vertical', { 'text-anchor': 'middle' }));

    // Seat zone outlines
    root.appendChild(svgEl('rect', { x: 61, y: 272, width: 130, height: 226, fill: 'none', stroke: '#555', 'stroke-width': 1.4, rx: 6 }));
    root.appendChild(svgEl('rect', { x: 210, y: 269, width: 230, height: 255, fill: 'none', stroke: '#555', 'stroke-width': 1.4, rx: 6 }));
    root.appendChild(svgEl('rect', { x: 449, y: 272, width: 106, height: 235, fill: 'none', stroke: '#555', 'stroke-width': 1.4, rx: 6 }));

    [1,2,3,4,5,6,7].forEach((num, index) => {
      const y = 290 + index * 36;
      root.appendChild(mapText(202, y, rowTag(num), 'main-row-text', { 'text-anchor': 'middle' }));
      root.appendChild(mapText(447, y, rowTag(num), 'main-row-text', { 'text-anchor': 'middle' }));
    });

    root.appendChild(drawPillar(214, 282));
    root.appendChild(drawPillar(421, 282));

    root.appendChild(drawAreaChip(57, 517, 135, 53, t('mapStandingA')));
    root.appendChild(drawAreaChip(216, 507, 210, 62, t('mapStandingB')));
    root.appendChild(drawAreaChip(452, 516, 102, 40, t('mapStandingC')));
    root.appendChild(drawAreaLabel(60, 585, t('mapStandingD')));
    root.appendChild(drawAreaChip(452, 560, 104, 28, t('mapStandingE')));

    // Bottom paths refined to match the original silhouette more closely.
    root.appendChild(svgEl('path', { d: 'M208 632 H245 V566 H432', fill: 'none', stroke: '#111', 'stroke-width': 3.2 }));
    root.appendChild(svgEl('path', { d: 'M95 642 H127 V657 H95', fill: 'none', stroke: '#111', 'stroke-width': 3.2 }));
    root.appendChild(svgEl('path', { d: 'M95 675 V735 H147 V696', fill: 'none', stroke: '#111', 'stroke-width': 2.8 }));
    root.appendChild(svgEl('path', { d: 'M95 675 Q73 675 54 655 V735', fill: 'none', stroke: '#111', 'stroke-width': 2.4 }));
    root.appendChild(svgEl('path', { d: 'M431 633 V676 Q431 685 441 685 H532 V612', fill: 'none', stroke: '#111', 'stroke-width': 2.8 }));
    root.appendChild(svgEl('path', { d: 'M431 685 Q431 708 447 708 H532', fill: 'none', stroke: '#111', 'stroke-width': 2.8 }));
    root.appendChild(mapText(74, 695, t('mapEntrance'), 'base-label', { 'font-size': 12 }));
    root.appendChild(mapText(533, 309, t('mapEmergency'), 'base-label', { 'font-size': 11 }));

    return root;
  }

  function drawMarkLayer() {
    const g = svgEl('g', { id: 'markLayer' });
    markItems.forEach(item => {
      const node = svgEl('g', { class: 'mark-node' });
      node.appendChild(svgEl('rect', { x: item.x, y: item.y, width: item.w, height: item.h, rx: 3 }));
      const text = svgEl('text', { x: item.x + item.w / 2, y: item.y + item.h / 2 + 0.4, class: 'mark-text' });
      text.textContent = item.number;
      node.appendChild(text);
      g.appendChild(node);
    });
    return g;
  }

  function drawAreaChip(x, y, w, h, label) {
    const g = svgEl('g', { class: 'area-chip' });
    g.appendChild(svgEl('rect', { x, y, width: w, height: h, rx: 6 }));
    const text = svgEl('text', { x: x + w / 2, y: y + h - 10, 'text-anchor': 'middle' }); text.textContent = label; g.appendChild(text); return g;
  }

  function drawAreaLabel(x, y, label) {
    const g = svgEl('g');
    const text = svgEl('text', { x, y, class: 'base-label' });
    text.textContent = label;
    g.appendChild(text);
    return g;
  }

  function drawPillar(x, y) {
    const g = svgEl('g');
    g.appendChild(svgEl('rect', { class: 'pillar-box', x, y, width: 30, height: 32, rx: 2 }));
    const text = svgEl('text', { class: 'pillar-text', x: x + 15, y: y + 16 }); text.textContent = t('mapPillar'); g.appendChild(text); return g;
  }

  function mapText(x, y, content, className, attrs = {}) { const text = svgEl('text', { x, y, class: className, ...attrs }); text.textContent = content; return text; }
  function rowTag(num) { return state.lang === 'en' ? `R${num}` : `${num}列`; }

  function createSeatNode(item) {
    const group = svgEl('g', { class: 'seat-node seat-main', tabindex: 0, role: 'button', 'aria-label': getLocalizedSeatLabel(item), 'data-seat-id': item.id });
    group.appendChild(svgEl('rect', { x: item.x, y: item.y, width: item.w, height: item.h, rx: 2.2 }));
    const text = svgEl('text', { x: item.x + item.w / 2, y: item.y + item.h / 2 + 0.4 }); text.textContent = item.number; group.appendChild(text);
    bindSeatEvents(group, item.id);
    return group;
  }

  function createStandingCell(item) {
    const group = svgEl('g', { class: 'standing-cell seat-node', tabindex: 0, role: 'button', 'aria-label': getLocalizedSeatLabel(item), 'data-seat-id': item.id });
    group.appendChild(svgEl('rect', { x: item.x, y: item.y, width: item.w, height: item.h, rx: 2.2 }));
    bindSeatEvents(group, item.id);
    return group;
  }

  function bindSeatEvents(node, id) {
    node.addEventListener('click', () => selectItem(id));
    node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectItem(id); } });
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
    const item = itemById.get(state.selectedId); if (!item) return;
    layer.appendChild(svgEl('rect', { class: 'selection-rect', x: item.x - 3, y: item.y - 3, width: item.w + 6, height: item.h + 6, rx: 5 }));
    layer.appendChild(createArrowCallout(item));
  }

  function createArrowCallout(item) {
    const cx = item.x + item.w / 2; const cy = item.y + item.h / 2; const above = cy > 92; const group = svgEl('g', { class: 'arrow-callout' });
    const labelW = state.lang === 'en' ? 94 : 82; const labelH = 25; const labelX = clamp(cx - labelW / 2, 10, SEATMAP_DATA.width - labelW - 10); const labelY = above ? cy - 64 : cy + 40; const arrowTipY = above ? item.y - 5 : item.y + item.h + 5; const arrowBaseY = above ? labelY + labelH : labelY;
    group.appendChild(svgEl('rect', { class: 'arrow-label-bg', x: labelX, y: labelY, width: labelW, height: labelH, rx: 13 }));
    const labelText = svgEl('text', { x: labelX + labelW / 2, y: labelY + labelH / 2 }); labelText.textContent = t('arrowText'); group.appendChild(labelText);
    const arrowPath = above ? `M ${cx - 9} ${arrowBaseY - 1} L ${cx + 9} ${arrowBaseY - 1} L ${cx + 9} ${arrowTipY - 18} L ${cx + 21} ${arrowTipY - 18} L ${cx} ${arrowTipY} L ${cx - 21} ${arrowTipY - 18} L ${cx - 9} ${arrowTipY - 18} Z` : `M ${cx - 9} ${arrowBaseY + 1} L ${cx + 9} ${arrowBaseY + 1} L ${cx + 9} ${arrowTipY + 18} L ${cx + 21} ${arrowTipY + 18} L ${cx} ${arrowTipY} L ${cx - 21} ${arrowTipY + 18} L ${cx - 9} ${arrowTipY + 18} Z`;
    group.appendChild(svgEl('path', { class: 'arrow-body', d: arrowPath }));
    return group;
  }

  function updateUI() {
    const item = state.selectedId ? itemById.get(state.selectedId) : null; const performance = getCurrentPerformance();
    els.performanceSelect.value = state.performanceId; els.langSelect.value = state.lang; els.nameInput.value = state.displayName;
    if (!item) { els.selectedPill.textContent = t('noSelection'); els.selectionSummary.textContent = t('noSelection'); els.selectionSub.textContent = t('selectHint'); els.downloadBtn.disabled = true; return; }
    const label = getLocalizedSeatLabel(item); els.selectedPill.textContent = `${performance.label}｜${label}`; els.selectionSummary.textContent = label; els.selectionSub.textContent = t('selectedHint'); els.downloadBtn.disabled = false;
  }

  function getLocalizedSeatLabel(item) {
    if (!item) return t('noSelection');
    if (item.type === 'standing') {
      if (state.lang === 'zh') return `立見區域 ${item.area} 第 ${item.row} 行`;
      if (state.lang === 'en') return `Standing Area ${item.area} / Row ${item.row}`;
      return `立見エリア ${item.area} ${item.row}行`;
    }
    if (item.zone === 'main') {
      if (state.lang === 'zh') return `${item.row} 列 ${item.number} 號`;
      if (state.lang === 'en') return `Row ${item.row} / Seat ${item.number}`;
      return `${item.row}列 ${item.number}番`;
    }
    return item.label || item.id;
  }

  function getCurrentPerformance() { return SEATMAP_DATA.performances.find(p => p.id === state.performanceId) || SEATMAP_DATA.performances[0]; }

  async function exportImage() {
    if (!state.selectedId) { showToast(t('downloadNoSelection')); return; }
    const dataUrl = await buildExportPng();
    if (shouldOpenPreview()) { openModal(dataUrl); return; }
    const item = itemById.get(state.selectedId); const safeLabel = getLocalizedSeatLabel(item).replace(/[\\/:*?"<>|\s]+/g, '_'); const filename = `akb48-seat-memo_${getCurrentPerformance().id}_${safeLabel}.png`;
    if (typeof triggerDownload === 'function') triggerDownload(dataUrl, filename); else { const link = document.createElement('a'); link.href = dataUrl; link.download = filename; link.click(); }
  }

  function shouldOpenPreview() {
    const ua = navigator.userAgent; const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua); return isIOS || isSafari;
  }
  function openModal(dataUrl) { els.exportPreview.src = dataUrl; els.openImageLink.href = dataUrl; els.modal.hidden = false; }
  function closeModal() { els.modal.hidden = true; els.exportPreview.removeAttribute('src'); els.openImageLink.removeAttribute('href'); }

  async function buildExportPng() {
    const logicalW = SEATMAP_DATA.width; const logicalH = SEATMAP_DATA.height + SEATMAP_DATA.exportFooterHeight; const scale = 3; const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    canvas.width = logicalW * scale; canvas.height = logicalH * scale; ctx.scale(scale, scale); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, logicalW, logicalH);
    drawBaseCanvas(ctx); drawMarkCanvas(ctx); drawSeatCanvas(ctx); const item = itemById.get(state.selectedId); if (item) { drawSelectedMark(ctx, item); drawCanvasArrow(ctx, item); } drawFooter(ctx, item);
    return canvas.toDataURL('image/png');
  }

  function drawBaseCanvas(ctx) {
    ctx.save();
    ctx.fillStyle = '#fffdfd'; ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(40,24); ctx.lineTo(600,24); ctx.quadraticCurveTo(628,24,628,52); ctx.lineTo(628,700); ctx.quadraticCurveTo(628,736,600,736); ctx.lineTo(96,736); ctx.lineTo(96,644); ctx.lineTo(28,644); ctx.lineTo(28,52); ctx.quadraticCurveTo(28,24,40,24); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(96,736); ctx.lineTo(96,640); ctx.lineTo(28,640); ctx.stroke();
    // top door
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(287, 47); ctx.lineTo(287, 8); ctx.lineTo(320, 8); ctx.lineTo(320, 41); ctx.moveTo(353, 47); ctx.lineTo(353, 8); ctx.lineTo(320, 8); ctx.lineTo(320, 41); ctx.moveTo(287, 8); ctx.lineTo(353, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(320, 41); ctx.quadraticCurveTo(302, 24, 287, 47); ctx.moveTo(320, 41); ctx.quadraticCurveTo(338, 24, 353, 47); ctx.stroke();
    drawText(ctx, t('mapDoor'), 320, 24, '700 9px "Noto Sans JP", sans-serif', '#ff4fa3', 'center');
    // stage
    ctx.fillStyle = '#f8eef2'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2.2; ctx.strokeRect(118, 84, 404, 88); ctx.fillRect(118, 84, 404, 88); ctx.strokeRect(118,84,404,88);
    ctx.lineWidth = 1.8; line(ctx,118,116,522,116); ctx.lineWidth = 1.4; line(ctx,219,84,219,172); line(ctx,421,84,421,172); ctx.lineWidth = 2; line(ctx,320,154,320,171);
    drawText(ctx, t('mapSeri'), 320, 110, '700 9px "Noto Sans JP", sans-serif', '#ff4fa3', 'center');
    drawText(ctx, t('mapStage'), 320, 144, '900 20px "Noto Sans JP", sans-serif', '#ff4fa3', 'center');
    // wings
    ctx.fillStyle = '#000'; ctx.fillRect(20,52,58,146); ctx.fillRect(562,52,58,146); ctx.fillStyle = '#26c6e8'; ctx.fillRect(30,198,45,4); ctx.fillRect(565,198,38,4);
    drawRotatedText(ctx, t('mapShimoteWing'), 50, 126, Math.PI/2, '900 17px "Noto Sans JP", sans-serif', '#fff');
    drawRotatedText(ctx, t('mapKamiteWing'), 591, 126, Math.PI/2, '900 17px "Noto Sans JP", sans-serif', '#fff');
    // shell
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(58,226); ctx.lineTo(582,226); ctx.quadraticCurveTo(584,244,572,260); ctx.lineTo(572,304); ctx.lineTo(602,304); ctx.quadraticCurveTo(622,304,622,322); ctx.lineTo(622,338); ctx.quadraticCurveTo(622,352,602,352); ctx.lineTo(572,352); ctx.lineTo(572,552); ctx.lineTo(523,552); ctx.lineTo(523,628); ctx.lineTo(435,628); ctx.lineTo(435,695); ctx.lineTo(96,695); ctx.lineTo(96,640); ctx.lineTo(58,640); ctx.closePath(); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(58,226); ctx.bezierCurveTo(58,250,44,254,44,254); ctx.lineTo(44,382); ctx.stroke(); ctx.beginPath(); ctx.moveTo(582,226); ctx.bezierCurveTo(582,250,596,254,596,254); ctx.lineTo(596,382); ctx.stroke();
    drawVerticalText(ctx, t('mapShimoteHanamichi'), 30, 306, '900 14px "Noto Sans JP", sans-serif', '#ff007f', 16);
    drawVerticalText(ctx, t('mapKamiteHanamichi'), 610, 306, '900 14px "Noto Sans JP", sans-serif', '#ff007f', 16);
    // seat zones
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.4; roundRect(ctx,61,272,130,226,6); ctx.stroke(); roundRect(ctx,210,269,230,255,6); ctx.stroke(); roundRect(ctx,449,272,106,235,6); ctx.stroke();
    [1,2,3,4,5,6,7].forEach((num,index)=>{ const y=290+index*36; drawText(ctx,rowTag(num),202,y,'900 12px "Noto Sans JP", sans-serif','#ff007f','center'); drawText(ctx,rowTag(num),447,y,'900 12px "Noto Sans JP", sans-serif','#ff007f','center'); });
    drawPillarCanvas(ctx,214,282); drawPillarCanvas(ctx,421,282);
    drawAreaChipCanvas(ctx,57,517,135,53,t('mapStandingA')); drawAreaChipCanvas(ctx,216,507,210,62,t('mapStandingB')); drawAreaChipCanvas(ctx,452,516,102,40,t('mapStandingC')); drawAreaLabelCanvas(ctx,60,585,t('mapStandingD')); drawAreaChipCanvas(ctx,452,560,104,28,t('mapStandingE'));
    // bottom
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(208,632); ctx.lineTo(245,632); ctx.lineTo(245,566); ctx.lineTo(432,566); ctx.stroke(); ctx.beginPath(); ctx.moveTo(95,642); ctx.lineTo(127,642); ctx.lineTo(127,657); ctx.lineTo(95,657); ctx.stroke();
    ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(95,675); ctx.lineTo(95,735); ctx.lineTo(147,735); ctx.lineTo(147,696); ctx.stroke(); ctx.beginPath(); ctx.moveTo(95,675); ctx.quadraticCurveTo(73,675,54,655); ctx.lineTo(54,735); ctx.stroke(); ctx.beginPath(); ctx.moveTo(431,633); ctx.lineTo(431,676); ctx.quadraticCurveTo(431,685,441,685); ctx.lineTo(532,685); ctx.lineTo(532,612); ctx.stroke(); ctx.beginPath(); ctx.moveTo(431,685); ctx.quadraticCurveTo(431,708,447,708); ctx.lineTo(532,708); ctx.stroke();
    drawText(ctx, t('mapEntrance'), 74, 695, '900 12px "Noto Sans JP", sans-serif', '#ff4fa3', 'left'); drawText(ctx, t('mapEmergency'), 533, 309, '900 11px "Noto Sans JP", sans-serif', '#ff4fa3', 'left');
    ctx.restore();
  }

  function drawMarkCanvas(ctx) {
    ctx.save();
    markItems.forEach(item => { ctx.fillStyle='#000'; ctx.strokeStyle='#000'; roundRect(ctx,item.x,item.y,item.w,item.h,3); ctx.fill(); ctx.stroke(); drawText(ctx,String(item.number), item.x + item.w/2, item.y + item.h/2 + 3, '900 9px "Noto Sans JP", sans-serif', '#fff', 'center'); });
    ctx.restore();
  }

  function drawSeatCanvas(ctx) {
    ctx.save();
    selectableItems.forEach(item => {
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=item.type==='standing'?0.8:0.9; roundRect(ctx,item.x,item.y,item.w,item.h,2.2); ctx.fill(); ctx.stroke();
      if (item.type === 'seat') drawText(ctx, String(item.number), item.x + item.w/2, item.y + item.h/2 + 2.7, '900 8px "Noto Sans JP", sans-serif', '#ff007f', 'center');
    });
    ctx.restore();
  }

  function drawSelectedMark(ctx, item) {
    ctx.save(); ctx.shadowColor='rgba(255,0,127,0.75)'; ctx.shadowBlur=12; ctx.fillStyle='rgba(255,0,127,0.35)'; ctx.strokeStyle='#ff007f'; ctx.lineWidth=3; roundRect(ctx,item.x-3,item.y-3,item.w+6,item.h+6,5); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function drawCanvasArrow(ctx, item) {
    const cx = item.x + item.w / 2; const cy = item.y + item.h / 2; const above = cy > 92; const labelW = state.lang === 'en' ? 94 : 82; const labelH = 25; const labelX = clamp(cx - labelW / 2, 10, SEATMAP_DATA.width - labelW - 10); const labelY = above ? cy - 64 : cy + 40; const arrowTipY = above ? item.y - 5 : item.y + item.h + 5; const arrowBaseY = above ? labelY + labelH : labelY;
    ctx.save(); ctx.shadowColor='rgba(255,0,127,0.75)'; ctx.shadowBlur=9; ctx.fillStyle='rgba(255,255,255,0.96)'; ctx.strokeStyle='#ff007f'; ctx.lineWidth=1.6; roundRect(ctx,labelX,labelY,labelW,labelH,13); ctx.fill(); ctx.stroke(); ctx.fillStyle='#ff007f'; ctx.strokeStyle='#ffffff'; ctx.lineWidth=3; ctx.beginPath();
    if (above) { ctx.moveTo(cx-9,arrowBaseY-1); ctx.lineTo(cx+9,arrowBaseY-1); ctx.lineTo(cx+9,arrowTipY-18); ctx.lineTo(cx+21,arrowTipY-18); ctx.lineTo(cx,arrowTipY); ctx.lineTo(cx-21,arrowTipY-18); ctx.lineTo(cx-9,arrowTipY-18); }
    else { ctx.moveTo(cx-9,arrowBaseY+1); ctx.lineTo(cx+9,arrowBaseY+1); ctx.lineTo(cx+9,arrowTipY+18); ctx.lineTo(cx+21,arrowTipY+18); ctx.lineTo(cx,arrowTipY); ctx.lineTo(cx-21,arrowTipY+18); ctx.lineTo(cx-9,arrowTipY+18); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); drawText(ctx,t('arrowText'), labelX + labelW/2, labelY + labelH/2 + 4, '900 12px "Noto Sans JP", sans-serif', '#ff007f', 'center'); ctx.restore();
  }

  function drawFooter(ctx, item) {
    const y = SEATMAP_DATA.height; const footerH = SEATMAP_DATA.exportFooterHeight; const performance = getCurrentPerformance(); const seatLabel = item ? getLocalizedSeatLabel(item) : t('noSelection');
    ctx.save(); ctx.fillStyle='#fff7fb'; ctx.fillRect(0,y,SEATMAP_DATA.width,footerH); ctx.fillStyle='#ff007f'; ctx.fillRect(0,y,SEATMAP_DATA.width,5);
    const lines = [
      { text:t('exportTitle'), font:'900 20px "Noto Sans JP", sans-serif', color:'#1b2330', h:22, gap:4 },
      { text:`${t('performanceLabel')}：${performance.label}`, font:'800 14px "Noto Sans JP", sans-serif', color:'#ff007f', h:18, gap:3 },
      { text:`${t('mySeat')}：${seatLabel}`, font:'900 18px "Noto Sans JP", sans-serif', color:'#1b2330', h:20, gap:state.displayName ? 3 : 0 }
    ];
    if (state.displayName) lines.push({ text:`${t('nameLabel')}：${state.displayName}`, font:'700 12px "Noto Sans JP", sans-serif', color:'#7F8C8D', h:16, gap:0 });
    if (typeof drawInfoGraphicText === 'function') drawInfoGraphicText(ctx, SEATMAP_DATA.width / 2, y + footerH / 2 + 2, lines); else {
      ctx.textAlign='center'; ctx.textBaseline='top'; let currentY=y+24; lines.forEach(lineItem=>{ ctx.font=lineItem.font; ctx.fillStyle=lineItem.color; ctx.fillText(lineItem.text, SEATMAP_DATA.width/2, currentY); currentY += lineItem.h + lineItem.gap; });
    }
    ctx.restore();
  }

  function drawAreaChipCanvas(ctx,x,y,w,h,label){ ctx.save(); ctx.fillStyle='#f5e1e9'; ctx.strokeStyle='#111'; ctx.lineWidth=2; roundRect(ctx,x,y,w,h,6); ctx.fill(); ctx.stroke(); drawText(ctx,label, x+w/2, y+h-10, '900 10px "Noto Sans JP", sans-serif', '#ff007f', 'center'); ctx.restore(); }
  function drawAreaLabelCanvas(ctx,x,y,label){ drawText(ctx,label,x,y,'900 11px "Noto Sans JP", sans-serif','#ff007f','left'); }
  function drawPillarCanvas(ctx,x,y){ ctx.save(); ctx.fillStyle='#000'; ctx.strokeStyle='#00c9e8'; ctx.lineWidth=3; roundRect(ctx,x,y,30,32,2); ctx.fill(); ctx.stroke(); drawText(ctx,t('mapPillar'), x+15, y+20, '900 15px "Noto Sans JP", sans-serif', '#fff', 'center'); ctx.restore(); }
  function drawText(ctx,text,x,y,font,color,align='left'){ ctx.save(); ctx.font=font; ctx.fillStyle=color; ctx.textAlign=align; ctx.textBaseline='alphabetic'; ctx.fillText(text,x,y); ctx.restore(); }
  function drawRotatedText(ctx,text,x,y,angle,font,color){ ctx.save(); ctx.translate(x,y); ctx.rotate(angle); drawText(ctx,text,0,0,font,color,'center'); ctx.restore(); }
  function drawVerticalText(ctx,text,x,y,font,color,lineHeight=16){ ctx.save(); ctx.font=font; ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle'; [...text].forEach((char,index)=>ctx.fillText(char,x,y+index*lineHeight)); ctx.restore(); }
  function line(ctx,x1,y1,x2,y2){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  function roundRect(ctx,x,y,w,h,r){ const radius=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+radius,y); ctx.arcTo(x+w,y,x+w,y+h,radius); ctx.arcTo(x+w,y+h,x,y+h,radius); ctx.arcTo(x,y+h,x,y,radius); ctx.arcTo(x,y,x+w,y,radius); ctx.closePath(); }
  function svgEl(name, attrs = {}) { const node=document.createElementNS(svgNS,name); Object.entries(attrs).forEach(([key,val])=>{ if (val!==undefined && val!==null) node.setAttribute(key,val); }); return node; }
  function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
  function showToast(message){ els.toast.textContent=message; els.toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>els.toast.classList.remove('show'),2200); }
}());
