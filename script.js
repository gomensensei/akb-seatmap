/* global SEATMAP_DATA, triggerDownload, drawInfoGraphicText */
(function () {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  const state = {
    lang: 'ja',
    i18n: {},
    selectedId: null,
    performanceId: 'reset',
    displayName: ''
  };

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

  bindModalFailsafe();
  document.addEventListener('DOMContentLoaded', init);

  function bindModalFailsafe() {
    if (!els.modal) return;
    els.modal.hidden = true;
    if (els.modalCloseBtn) {
      els.modalCloseBtn.addEventListener('click', event => {
        event.preventDefault();
        closeModal();
      });
    }
    els.modal.addEventListener('click', event => {
      if (event.target === els.modal) closeModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !els.modal.hidden) closeModal();
    });
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

  function t(key) {
    return state.i18n[state.lang]?.[key] || state.i18n.ja?.[key] || key;
  }

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
    els.performanceSelect.addEventListener('change', () => {
      state.performanceId = els.performanceSelect.value;
      syncHash();
      updateUI();
    });

    els.langSelect.addEventListener('change', () => {
      state.lang = els.langSelect.value;
      localStorage.setItem('seatmapLang', state.lang);
      applyLanguage();
      renderOverlay();
      syncHash();
      updateUI();
    });

    els.nameInput.addEventListener('input', () => {
      state.displayName = els.nameInput.value.trim().slice(0, 28);
      syncHash();
    });

    els.downloadBtn.addEventListener('click', exportImage);
    els.clearBtn.addEventListener('click', clearSelection);
    els.copyLinkBtn.addEventListener('click', copyShareLink);
    els.zoomResetBtn.addEventListener('click', resetMapView);
  }

  function applyLanguage() {
    els.html.lang = state.lang;
    document.title = t('exportTitle');
    els.langSelect.value = state.lang;

    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
      node.placeholder = t(node.dataset.i18nPlaceholder);
    });
  }

  function resetMapView() {
    const targetLeft = Math.max(0, (els.mapScroll.scrollWidth - els.mapScroll.clientWidth) / 2);
    els.mapScroll.scrollTo({ left: targetLeft, top: 0, behavior: 'smooth' });
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

    const seatLayer = svgEl('g', { id: 'seatLayer' });
    const selectionLayer = svgEl('g', { id: 'selectionLayer' });

    SEATMAP_DATA.items.forEach(item => {
      if (item.type === 'standing') {
        seatLayer.appendChild(createStandingCell(item));
      } else {
        seatLayer.appendChild(createSeatNode(item));
      }
    });

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

    const selectionGlow = seatGlow.cloneNode(true);
    selectionGlow.setAttribute('id', 'selectionGlow');
    selectionGlow.querySelector('feGaussianBlur').setAttribute('stdDeviation', '4');

    const arrowGlow = seatGlow.cloneNode(true);
    arrowGlow.setAttribute('id', 'arrowGlow');
    arrowGlow.querySelector('feGaussianBlur').setAttribute('stdDeviation', '3.2');

    defs.append(seatGlow, selectionGlow, arrowGlow);
    return defs;
  }

  function drawBaseMap() {
    const root = svgEl('g', { id: 'baseMap' });

    root.appendChild(svgEl('rect', {
      x: 8, y: 8, width: 624, height: 744, rx: 20,
      fill: '#fffdfd', stroke: '#111', 'stroke-width': 5
    }));

    // Decorative monitor and door
    root.appendChild(svgEl('rect', { x: 560, y: 18, width: 16, height: 16, fill: '#26c6e8' }));
    root.appendChild(mapText(582, 30, t('mapMonitor'), 'base-label', { 'font-size': 10, 'text-anchor': 'start' }));
    root.appendChild(svgEl('path', { class: 'stage-door', d: 'M278 44 V8 M278 8 H320 M362 44 V8 M362 8 H320 M320 8 V44 M320 44 Q320 9 362 44 M320 44 Q320 9 278 44' }));
    root.appendChild(mapText(320, 26, t('mapDoor'), 'base-caption', { 'text-anchor': 'middle' }));

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
    root.appendChild(mapText(50, 126, t('mapShimoteWing'), 'map-section-vertical', { 'text-anchor': 'middle' }));
    root.appendChild(mapText(592, 126, t('mapKamiteWing'), 'map-section-vertical', { 'text-anchor': 'middle' }));

    // Main arena shell
    root.appendChild(svgEl('path', {
      d: 'M33 232 L607 232 L607 308 L626 308 Q632 308 632 314 L632 338 Q632 344 626 344 L607 344 L607 574 L531 574 L531 646 L425 646 L425 744 L74 744 L74 646 L33 646 L33 232 Z',
      fill: 'none', stroke: '#111', 'stroke-width': 3.2, 'stroke-linejoin': 'round'
    }));

    // Hanamichi labels
    root.appendChild(mapText(44, 320, t('mapShimoteHanamichi'), 'map-section-vertical', { 'text-anchor': 'middle', fill: '#ff007f', 'font-size': 13 }));
    root.appendChild(mapText(598, 320, t('mapKamiteHanamichi'), 'map-section-vertical', { 'text-anchor': 'middle', fill: '#ff007f', 'font-size': 13 }));

    // Curved aisle hints
    root.appendChild(svgEl('path', { d: 'M74 232 C74 255 56 258 56 258 L56 378', fill: 'none', stroke: '#111', 'stroke-width': 2.2 }));
    root.appendChild(svgEl('path', { d: 'M566 232 C566 255 584 258 584 258 L584 378', fill: 'none', stroke: '#111', 'stroke-width': 2.2 }));

    // Main seat zone blocks
    root.appendChild(svgEl('rect', { x: 61, y: 272, width: 130, height: 226, fill: '#faf6f8', stroke: '#111', 'stroke-width': 1.4, rx: 6 }));
    root.appendChild(svgEl('rect', { x: 210, y: 269, width: 230, height: 255, fill: '#faf6f8', stroke: '#111', 'stroke-width': 1.4, rx: 6 }));
    root.appendChild(svgEl('rect', { x: 449, y: 272, width: 106, height: 269, fill: '#faf6f8', stroke: '#111', 'stroke-width': 1.4, rx: 6 }));

    // Row labels
    [1,2,3,4,5,6,7].forEach((num, index) => {
      const y = 290 + index * 36;
      root.appendChild(mapText(202, y, rowTag(num), 'main-row-text', { 'text-anchor': 'middle' }));
      root.appendChild(mapText(447, y, rowTag(num), 'main-row-text', { 'text-anchor': 'middle' }));
    });

    // Pillars
    root.appendChild(drawPillar(221, 282));
    root.appendChild(drawPillar(425, 282));

    // Standing area chips and boxes
    root.appendChild(drawAreaChip(57, 499, 135, 53, t('mapStandingA')));
    root.appendChild(drawAreaChip(217, 488, 208, 61, t('mapStandingB')));
    root.appendChild(drawAreaChip(452, 498, 104, 48, t('mapStandingC')));
    root.appendChild(drawAreaChip(57, 579, 106, 35, t('mapStandingD')));
    root.appendChild(drawAreaChip(447, 540, 112, 34, t('mapStandingE')));

    // Bottom central opening and exits
    root.appendChild(svgEl('path', { d: 'M190 646 L233 646 L233 569 L425 569', fill: 'none', stroke: '#111', 'stroke-width': 3.2 }));
    root.appendChild(svgEl('path', { d: 'M74 646 L105 646 L105 663 L74 663', fill: 'none', stroke: '#111', 'stroke-width': 3.2 }));
    root.appendChild(svgEl('path', { d: 'M74 701 Q58 701 41 684 L41 744 L89 744 L89 710 Q79 710 74 701 Z', fill: 'none', stroke: '#111', 'stroke-width': 2.4 }));
    root.appendChild(svgEl('path', { d: 'M425 646 L425 682 Q425 695 439 695 L531 695', fill: 'none', stroke: '#111', 'stroke-width': 2.4 }));
    root.appendChild(mapText(54, 709, t('mapEntrance'), 'base-label', { 'font-size': 12 }));
    root.appendChild(mapText(539, 314, t('mapEmergency'), 'base-label', { 'font-size': 11 }));
    root.appendChild(mapText(440, 690, t('mapEmergency'), 'base-label', { 'font-size': 11 }));

    return root;
  }

  function drawAreaChip(x, y, w, h, label) {
    const g = svgEl('g', { class: 'area-chip' });
    g.appendChild(svgEl('rect', { x, y, width: w, height: h, rx: 6 }));
    g.appendChild(svgEl('text', { x: x + w / 2, y: y + h - 10, 'text-anchor': 'middle' }));
    g.lastChild.textContent = label;
    return g;
  }

  function drawPillar(x, y) {
    const g = svgEl('g');
    g.appendChild(svgEl('rect', { class: 'pillar-box', x, y, width: 30, height: 32, rx: 2 }));
    g.appendChild(svgEl('text', { class: 'pillar-text', x: x + 15, y: y + 16 }));
    g.lastChild.textContent = t('mapPillar');
    return g;
  }

  function mapText(x, y, content, className, attrs = {}) {
    const text = svgEl('text', {
      x,
      y,
      class: className,
      ...attrs
    });
    text.textContent = content;
    return text;
  }

  function rowTag(num) {
    if (state.lang === 'en') return `R${num}`;
    return `${num}列`;
  }

  function createSeatNode(item) {
    const group = svgEl('g', {
      class: `seat-node ${item.kind === 'dark' ? 'seat-dark' : 'seat-main'}`,
      tabindex: 0,
      role: 'button',
      'aria-label': getLocalizedSeatLabel(item),
      'data-seat-id': item.id
    });

    const rect = svgEl('rect', {
      x: item.x,
      y: item.y,
      width: item.w,
      height: item.h,
      rx: 2.2
    });
    const text = svgEl('text', {
      x: item.x + item.w / 2,
      y: item.y + item.h / 2 + 0.4
    });
    text.textContent = item.number;
    group.append(rect, text);
    bindSeatEvents(group, item.id);
    return group;
  }

  function createStandingCell(item) {
    const group = svgEl('g', {
      class: 'standing-cell seat-node',
      tabindex: 0,
      role: 'button',
      'aria-label': getLocalizedSeatLabel(item),
      'data-seat-id': item.id
    });
    const rect = svgEl('rect', {
      x: item.x,
      y: item.y,
      width: item.w,
      height: item.h,
      rx: 2.2
    });
    const text = svgEl('text', {
      x: item.x + item.w / 2,
      y: item.y + item.h / 2 + 0.2
    });
    text.textContent = `${item.row}-${item.number}`;
    group.append(rect, text);
    bindSeatEvents(group, item.id);
    return group;
  }

  function bindSeatEvents(node, id) {
    node.addEventListener('click', () => selectItem(id));
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectItem(id);
      }
    });
  }

  function selectItem(id) {
    state.selectedId = id;
    syncHash();
    renderSelection();
    updateUI();
  }

  function renderSelection() {
    const layer = els.overlay.querySelector('#selectionLayer');
    if (!layer) return;
    layer.innerHTML = '';

    els.overlay.querySelectorAll('[data-seat-id]').forEach(node => {
      node.classList.toggle('is-selected', node.dataset.seatId === state.selectedId);
      node.setAttribute('aria-label', getLocalizedSeatLabel(itemById.get(node.dataset.seatId)));
    });

    if (!state.selectedId) return;
    const item = itemById.get(state.selectedId);
    if (!item) return;

    layer.appendChild(svgEl('rect', {
      class: 'selection-rect',
      x: item.x - 3,
      y: item.y - 3,
      width: item.w + 6,
      height: item.h + 6,
      rx: 5
    }));
    layer.appendChild(createArrowCallout(item));
  }

  function createArrowCallout(item) {
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const above = cy > 92;
    const group = svgEl('g', { class: 'arrow-callout' });

    const labelW = state.lang === 'en' ? 94 : 82;
    const labelH = 25;
    const labelX = clamp(cx - labelW / 2, 10, SEATMAP_DATA.width - labelW - 10);
    const labelY = above ? cy - 64 : cy + 40;
    const arrowTipY = above ? item.y - 5 : item.y + item.h + 5;
    const arrowBaseY = above ? labelY + labelH : labelY;

    const labelRect = svgEl('rect', {
      class: 'arrow-label-bg',
      x: labelX,
      y: labelY,
      width: labelW,
      height: labelH,
      rx: 13
    });
    const labelText = svgEl('text', {
      x: labelX + labelW / 2,
      y: labelY + labelH / 2
    });
    labelText.textContent = t('arrowText');

    const arrowPath = above
      ? `M ${cx - 9} ${arrowBaseY - 1} L ${cx + 9} ${arrowBaseY - 1} L ${cx + 9} ${arrowTipY - 18} L ${cx + 21} ${arrowTipY - 18} L ${cx} ${arrowTipY} L ${cx - 21} ${arrowTipY - 18} L ${cx - 9} ${arrowTipY - 18} Z`
      : `M ${cx - 9} ${arrowBaseY + 1} L ${cx + 9} ${arrowBaseY + 1} L ${cx + 9} ${arrowTipY + 18} L ${cx + 21} ${arrowTipY + 18} L ${cx} ${arrowTipY} L ${cx - 21} ${arrowTipY + 18} L ${cx - 9} ${arrowTipY + 18} Z`;

    group.append(labelRect, labelText, svgEl('path', { class: 'arrow-body', d: arrowPath }));
    return group;
  }

  function updateUI() {
    const item = state.selectedId ? itemById.get(state.selectedId) : null;
    const performance = getCurrentPerformance();

    els.performanceSelect.value = state.performanceId;
    els.langSelect.value = state.lang;
    els.nameInput.value = state.displayName;

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

    if (item.zone === 'main') {
      if (state.lang === 'zh') return `${item.row} 列 ${item.number} 號`;
      if (state.lang === 'en') return `Row ${item.row} / Seat ${item.number}`;
      return `${item.row}列 ${item.number}番`;
    }

    if (item.zone === 'rear-stage' || item.zone === 'rear-main') {
      if (state.lang === 'zh') return `後方位置 ${item.number}`;
      if (state.lang === 'en') return `Rear Position ${item.number}`;
      return `後方 ${item.number}`;
    }

    if (item.zone === 'left-side' || item.zone === 'right-side') {
      const side = item.zone === 'left-side'
        ? (state.lang === 'en' ? 'Left' : state.lang === 'zh' ? '左側' : '下手側')
        : (state.lang === 'en' ? 'Right' : state.lang === 'zh' ? '右側' : '上手側');
      if (state.lang === 'en') return `${side} Side ${item.number}`;
      if (state.lang === 'zh') return `${side} ${item.number} 號`;
      return `${side} ${item.number}番`;
    }

    return item.label || item.id;
  }

  function getCurrentPerformance() {
    return SEATMAP_DATA.performances.find(p => p.id === state.performanceId) || SEATMAP_DATA.performances[0];
  }

  async function exportImage() {
    if (!state.selectedId) {
      showToast(t('downloadNoSelection'));
      return;
    }

    const dataUrl = await buildExportPng();
    if (shouldOpenPreview()) {
      openModal(dataUrl);
      return;
    }

    const item = itemById.get(state.selectedId);
    const safeLabel = getLocalizedSeatLabel(item).replace(/[\\/:*?"<>|\s]+/g, '_');
    const filename = `akb48-seat-memo_${getCurrentPerformance().id}_${safeLabel}.png`;
    if (typeof triggerDownload === 'function') {
      triggerDownload(dataUrl, filename);
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
    }
  }

  function shouldOpenPreview() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
    return isIOS || isSafari;
  }

  function openModal(dataUrl) {
    els.exportPreview.src = dataUrl;
    els.openImageLink.href = dataUrl;
    els.modal.hidden = false;
  }

  function closeModal() {
    els.modal.hidden = true;
    els.exportPreview.removeAttribute('src');
    els.openImageLink.removeAttribute('href');
  }

  async function buildExportPng() {
    const logicalW = SEATMAP_DATA.width;
    const logicalH = SEATMAP_DATA.height + SEATMAP_DATA.exportFooterHeight;
    const scale = 3;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = logicalW * scale;
    canvas.height = logicalH * scale;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, logicalW, logicalH);

    const svgUrl = await createSvgDataUrl();
    const image = await loadImage(svgUrl);
    ctx.drawImage(image, 0, 0, SEATMAP_DATA.width, SEATMAP_DATA.height);
    URL.revokeObjectURL(svgUrl);

    const item = itemById.get(state.selectedId);
    drawFooter(ctx, item);
    return canvas.toDataURL('image/png');
  }

  async function createSvgDataUrl() {
    const clone = els.overlay.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', SEATMAP_DATA.width);
    clone.setAttribute('height', SEATMAP_DATA.height);
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    return URL.createObjectURL(blob);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawFooter(ctx, item) {
    const y = SEATMAP_DATA.height;
    const footerH = SEATMAP_DATA.exportFooterHeight;
    const performance = getCurrentPerformance();
    const seatLabel = item ? getLocalizedSeatLabel(item) : t('noSelection');

    ctx.save();
    ctx.fillStyle = '#fff7fb';
    ctx.fillRect(0, y, SEATMAP_DATA.width, footerH);
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(0, y, SEATMAP_DATA.width, 5);

    const lines = [
      { text: t('exportTitle'), font: '900 20px "Noto Sans JP", sans-serif', color: '#1b2330', h: 22, gap: 4 },
      { text: `${t('performanceLabel')}：${performance.label}`, font: '800 14px "Noto Sans JP", sans-serif', color: '#ff007f', h: 18, gap: 3 },
      { text: `${t('mySeat')}：${seatLabel}`, font: '900 18px "Noto Sans JP", sans-serif', color: '#1b2330', h: 20, gap: state.displayName ? 3 : 0 }
    ];
    if (state.displayName) {
      lines.push({ text: `${t('nameLabel')}：${state.displayName}`, font: '700 12px "Noto Sans JP", sans-serif', color: '#7F8C8D', h: 16, gap: 0 });
    }

    if (typeof drawInfoGraphicText === 'function') {
      drawInfoGraphicText(ctx, SEATMAP_DATA.width / 2, y + footerH / 2 + 2, lines);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      let currentY = y + 24;
      lines.forEach(line => {
        ctx.font = line.font;
        ctx.fillStyle = line.color;
        ctx.fillText(line.text, SEATMAP_DATA.width / 2, currentY);
        currentY += line.h + line.gap;
      });
    }
    ctx.restore();
  }

  function svgEl(name, attrs = {}) {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(key, value);
    });
    return node;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }
}());
