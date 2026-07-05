/* global SEATMAP_DATA, triggerDownload, drawInfoGraphicText, supabase */
(function () {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  const SUPPORTED_LANGS = ['ja', 'zh', 'zh-Hans', 'ko', 'th', 'id', 'en'];
  const SUPABASE_URL = 'https://jappifgnjssqxvjodgiv.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_oXfJyHkRtn1BHBw-9ictBQ__01qBCZg';
  const CLOUD_TABLE = 'seat_memo_records';
  const CLOUD_RECORD_LIMIT = 200;
  const state = { lang: 'ja', i18n: {}, selectedId: null, performanceId: 'reset', eventDate: '', displayName: '', entryNumber: '', tourRound: '', mapZoom: 1 };
  const cloud = { client: null, user: null, records: [], publicLotteryRecords: [], selectedId: '', busy: false, ready: false };
  const lotteryState = { entries: [], nextOrder: 1, selfRange: '' };
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
    numberInput: document.getElementById('numberInput'),
    tourSelect: document.getElementById('tourSelect'),
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
    cloudSection: document.querySelector('.cloud-save-section'),
    cloudStatus: document.getElementById('cloudStatus'),
    cloudMessage: document.getElementById('cloudMessage'),
    cloudLoginForm: document.getElementById('cloudLoginForm'),
    cloudNicknameInput: document.getElementById('cloudNicknameInput'),
    cloudEmailInput: document.getElementById('cloudEmailInput'),
    cloudPasswordInput: document.getElementById('cloudPasswordInput'),
    cloudSignInBtn: document.getElementById('cloudSignInBtn'),
    cloudSignUpBtn: document.getElementById('cloudSignUpBtn'),
    cloudActions: document.getElementById('cloudActions'),
    cloudUserLabel: document.getElementById('cloudUserLabel'),
    accountToggleBtn: document.getElementById('accountToggleBtn'),
    accountPopover: document.getElementById('accountPopover'),
    cloudLogoutBtn: document.getElementById('cloudLogoutBtn'),
    cloudSaveBtn: document.getElementById('cloudSaveBtn'),
    tabButtons: Array.from(document.querySelectorAll('.tab-button')),
    tabPanels: Array.from(document.querySelectorAll('.tab-panel')),
    refreshCloudRecordsBtn: document.getElementById('refreshCloudRecordsBtn'),
    cloudRecordsTable: document.getElementById('cloudRecordsTable'),
    cloudRecordsEmpty: document.getElementById('cloudRecordsEmpty'),
    lotteryPerformanceSelect: document.getElementById('lotteryPerformanceSelect'),
    lotteryDateInput: document.getElementById('lotteryDateInput'),
    lotteryLeftColumn: document.getElementById('lotteryLeftColumn'),
    lotteryRightColumn: document.getElementById('lotteryRightColumn'),
    lotteryPublicConsent: document.getElementById('lotteryPublicConsent'),
    saveLotteryCloudBtn: document.getElementById('saveLotteryCloudBtn'),
    downloadLotteryBtn: document.getElementById('downloadLotteryBtn'),
    clearLotteryBtn: document.getElementById('clearLotteryBtn'),
    refreshDistributionBtn: document.getElementById('refreshDistributionBtn'),
    distributionCanvas: document.getElementById('distributionCanvas'),
    myHistoryCanvas: document.getElementById('myHistoryCanvas'),
    myBucketCanvas: document.getElementById('myBucketCanvas'),
    communityMonthCanvas: document.getElementById('communityMonthCanvas'),
    communityDayCanvas: document.getElementById('communityDayCanvas'),
    performanceAvgCanvas: document.getElementById('performanceAvgCanvas'),
    gapHistogramCanvas: document.getElementById('gapHistogramCanvas'),
    streakCanvas: document.getElementById('streakCanvas'),
    filterYearSelect: document.getElementById('filterYearSelect'),
    filterMonthSelect: document.getElementById('filterMonthSelect'),
    filterMonthPartSelect: document.getElementById('filterMonthPartSelect'),
    filterWeekdaySelect: document.getElementById('filterWeekdaySelect'),
    filterPerformanceSelect: document.getElementById('filterPerformanceSelect'),
    filterPerformanceTypeSelect: document.getElementById('filterPerformanceTypeSelect'),
    filterSourceSelect: document.getElementById('filterSourceSelect'),
    distributionEmpty: document.getElementById('distributionEmpty'),
    toast: document.getElementById('toast')
  };
  const itemById = new Map(SEATMAP_DATA.items.map(item => [item.id, item]));
  const ZOOM_MIN = 0.85;
  const ZOOM_MAX = 2.35;
  const ZOOM_STEP = 0.15;
  let pinchState = null;
  let resizeTimer = null;
  let lotteryClickTimer = null;

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
    buildTourOptions();
    buildLotteryPerformanceOptions();
    buildDistributionFilters();
    renderLotteryRanges();
    renderOverlay();
    bindEvents();
    bindMapZoomGestures();
    applyLanguage();
    updateUI();
    applyMapZoom();
    resetMapView(false);
    initPersistence();
  }

  function detectLanguage() {
    const saved = localStorage.getItem('seatmapLang');
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const nav = (navigator.language || navigator.userLanguage || 'ja').toLowerCase();
    if (nav.startsWith('zh-cn') || nav.startsWith('zh-sg') || nav.includes('hans')) return 'zh-Hans';
    if (nav.startsWith('zh')) return 'zh';
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('ko')) return 'ko';
    if (nav.startsWith('th')) return 'th';
    if (nav.startsWith('id') || nav.startsWith('in')) return 'id';
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
    const hashNumber = params.get('number');
    const hashTour = params.get('tour');
    const hashEventDate = params.get('eventDate');
    if (hashLang && SUPPORTED_LANGS.includes(hashLang)) state.lang = hashLang;
    if (hashShow && SEATMAP_DATA.performances.some(p => p.id === hashShow)) state.performanceId = hashShow;
    if (hashSeat && itemById.has(hashSeat)) state.selectedId = hashSeat;
    if (hashEventDate) state.eventDate = decodeURIComponent(hashEventDate).slice(0, 40);
    if (hashName) state.displayName = decodeURIComponent(hashName).slice(0, 28);
    if (hashNumber) state.entryNumber = decodeURIComponent(hashNumber).slice(0, 24);
    if (hashTour && /^([1-9]|1[0-9]|2[0-5])$/.test(hashTour)) state.tourRound = hashTour;
  }

  function syncHash() {
    const params = new URLSearchParams();
    params.set('lang', state.lang);
    params.set('show', state.performanceId);
    if (state.selectedId) params.set('seat', state.selectedId);
    if (state.eventDate) params.set('eventDate', state.eventDate);
    if (state.displayName) params.set('name', state.displayName);
    if (state.entryNumber) params.set('number', state.entryNumber);
    if (state.tourRound) params.set('tour', state.tourRound);
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

  function buildLotteryPerformanceOptions() {
    if (!els.lotteryPerformanceSelect) return;
    els.lotteryPerformanceSelect.innerHTML = '';
    SEATMAP_DATA.performances.forEach(performance => {
      const option = document.createElement('option');
      option.value = performance.id;
      option.textContent = performance.label;
      els.lotteryPerformanceSelect.appendChild(option);
    });
    els.lotteryPerformanceSelect.value = state.performanceId;
    if (els.lotteryDateInput) els.lotteryDateInput.value = state.eventDate;
  }

  function buildDistributionFilters() {
    const firstYear = 2026;
    setSelectOptions(els.filterYearSelect, [
      ['', t('filterAll')],
      ...Array.from({ length: 12 }, (_, index) => {
        const year = String(firstYear + index);
        return [year, formatMessage('filterYearOption', { year })];
      })
    ]);
    setSelectOptions(els.filterMonthSelect, [
      ['', t('filterAll')],
      ...Array.from({ length: 12 }, (_, index) => {
        const value = String(index + 1).padStart(2, '0');
        return [value, formatMessage('filterMonthOption', { month: String(index + 1) })];
      })
    ]);
    setSelectOptions(els.filterMonthPartSelect, [
      ['', t('filterAll')],
      ['early', t('filterEarlyMonth')],
      ['mid', t('filterMidMonth')],
      ['late', t('filterLateMonth')]
    ]);
    setSelectOptions(els.filterWeekdaySelect, [
      ['', t('filterAll')],
      ['0', t('weekdaySun')],
      ['1', t('weekdayMon')],
      ['2', t('weekdayTue')],
      ['3', t('weekdayWed')],
      ['4', t('weekdayThu')],
      ['5', t('weekdayFri')],
      ['6', t('weekdaySat')]
    ]);
    setSelectOptions(els.filterPerformanceSelect, [
      ['', t('filterAll')],
      ...SEATMAP_DATA.performances.map(performance => [performance.id, performance.label])
    ]);
    setSelectOptions(els.filterPerformanceTypeSelect, [
      ['', t('filterAll')],
      ['normal', t('performanceTypeNormal')],
      ['birthday', t('performanceTypeBirthday')],
      ['special', t('performanceTypeSpecial')]
    ]);
    setSelectOptions(els.filterSourceSelect, [
      ['all', t('filterSourceAll')],
      ['mine', t('filterSourceMine')],
      ['community', t('filterSourceCommunity')]
    ]);
  }

  function setSelectOptions(select, entries) {
    if (!select) return;
    const previous = select.value;
    select.innerHTML = '';
    entries.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    if (entries.some(([value]) => value === previous)) select.value = previous;
  }

  function buildTourOptions() {
    if (!els.tourSelect) return;
    const currentValue = state.tourRound;
    els.tourSelect.innerHTML = '';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = t('tourRoundPlaceholder');
    els.tourSelect.appendChild(emptyOption);
    for (let i = 1; i <= 25; i += 1) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = formatTourRound(i);
      els.tourSelect.appendChild(option);
    }
    els.tourSelect.value = currentValue || '';
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
    if (els.numberInput) els.numberInput.addEventListener('input', () => { state.entryNumber = els.numberInput.value.trim().slice(0, 24); syncHash(); });
    if (els.tourSelect) els.tourSelect.addEventListener('change', () => { state.tourRound = els.tourSelect.value; syncHash(); });
    els.downloadBtn.addEventListener('click', exportImage);
    els.clearBtn.addEventListener('click', clearSelection);
    els.copyLinkBtn.addEventListener('click', copyShareLink);
    els.tabButtons.forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
    els.accountToggleBtn?.addEventListener('click', () => toggleAccountPopover());
    document.addEventListener('click', event => {
      if (!els.accountPopover || els.accountPopover.hidden) return;
      if (els.accountPopover.contains(event.target) || els.accountToggleBtn?.contains(event.target)) return;
      els.accountPopover.hidden = true;
    });
    els.cloudLoginForm?.addEventListener('submit', loginCloudAccount);
    els.cloudLogoutBtn?.addEventListener('click', logoutCloudAccount);
    els.cloudSaveBtn?.addEventListener('click', saveCloudMemo);
    els.refreshCloudRecordsBtn?.addEventListener('click', () => loadCloudRecords());
    els.cloudRecordsTable?.addEventListener('click', handleCloudRecordsTableClick);
    els.lotteryPerformanceSelect?.addEventListener('change', () => {});
    els.lotteryDateInput?.addEventListener('input', () => {});
    els.saveLotteryCloudBtn?.addEventListener('click', saveLotteryCloudRecord);
    els.downloadLotteryBtn?.addEventListener('click', downloadLotteryImage);
    els.clearLotteryBtn?.addEventListener('click', clearLotteryRecord);
    els.refreshDistributionBtn?.addEventListener('click', () => renderDistributionChart());
    [els.filterYearSelect, els.filterMonthSelect, els.filterMonthPartSelect, els.filterWeekdaySelect, els.filterPerformanceSelect, els.filterPerformanceTypeSelect, els.filterSourceSelect]
      .forEach(select => select?.addEventListener('change', () => renderDistributionChart()));
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
    buildTourOptions();
    buildLotteryPerformanceOptions();
    buildDistributionFilters();
    renderLotteryRanges();
    renderCloudRecordsTable();
    renderDistributionChart();
    updatePersistenceUI();
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
    const labelW = ['en', 'id', 'th'].includes(state.lang) ? 108 : 82;
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
    if (els.numberInput) els.numberInput.value = state.entryNumber;
    if (els.tourSelect) els.tourSelect.value = state.tourRound || '';
    els.eventDateInput.value = state.eventDate;
    if (!item) {
      els.selectedPill.textContent = t('noSelection');
      els.selectionSummary.textContent = t('noSelection');
      els.selectionSub.textContent = t('selectHint');
      els.downloadBtn.disabled = true;
      updatePersistenceUI();
      return;
    }
    const label = getLocalizedSeatLabel(item);
    els.selectedPill.textContent = `${performance.label}｜${label}`;
    els.selectionSummary.textContent = label;
    els.selectionSub.textContent = t('selectedHint');
    els.downloadBtn.disabled = false;
    updatePersistenceUI();
  }

  function getLocalizedSeatLabel(item) {
    if (!item) return t('noSelection');
    if (item.type === 'standing') {
      if (state.lang === 'zh') return `立見區域 ${item.area} 第 ${item.row} 行 ${item.number} 號`;
      if (state.lang === 'zh-Hans') return `站席区域 ${item.area} 第 ${item.row} 行 ${item.number} 号`;
      if (state.lang === 'ko') return `스탠딩 구역 ${item.area} ${item.row}행 ${item.number}번`;
      if (state.lang === 'th') return `โซนยืน ${item.area} แถว ${item.row} ช่อง ${item.number}`;
      if (state.lang === 'id') return `Area berdiri ${item.area} / Baris ${item.row} / Slot ${item.number}`;
      if (state.lang === 'en') return `Standing Area ${item.area} / Row ${item.row} / Slot ${item.number}`;
      return `立見エリア ${item.area} ${item.row}行 ${item.number}番`;
    }
    if (state.lang === 'zh') return `${item.row} 列 ${item.number} 號`;
    if (state.lang === 'zh-Hans') return `${item.row} 排 ${item.number} 号`;
    if (state.lang === 'ko') return `${item.row}열 ${item.number}번`;
    if (state.lang === 'th') return `แถว ${item.row} / ที่นั่ง ${item.number}`;
    if (state.lang === 'id') return `Baris ${item.row} / Kursi ${item.number}`;
    if (state.lang === 'en') return `Row ${item.row} / Seat ${item.number}`;
    return `${item.row}列 ${item.number}番`;
  }

  function getCurrentPerformance() { return SEATMAP_DATA.performances.find(p => p.id === state.performanceId) || SEATMAP_DATA.performances[0]; }

  function toggleAccountPopover(forceOpen) {
    if (!els.accountPopover) return;
    els.accountPopover.hidden = typeof forceOpen === 'boolean' ? !forceOpen : !els.accountPopover.hidden;
  }

  function initPersistence() {
    updatePersistenceUI();
    initCloudSave();
  }

  function getStateSnapshot() {
    return {
      lang: state.lang,
      selectedId: state.selectedId,
      performanceId: state.performanceId,
      eventDate: state.eventDate,
      displayName: state.displayName,
      entryNumber: state.entryNumber,
      tourRound: state.tourRound,
      mapZoom: state.mapZoom
    };
  }

  function buildMemoPayload() {
    const item = state.selectedId ? itemById.get(state.selectedId) : null;
    const performance = getCurrentPerformance();
    return {
      version: 1,
      source: 'web',
      savedAt: new Date().toISOString(),
      state: getStateSnapshot(),
      performance: performance ? { id: performance.id, label: performance.label } : null,
      seat: item ? {
        id: item.id,
        type: item.type,
        section: item.section || null,
        area: item.area || null,
        row: item.row ?? null,
        number: item.number ?? null,
        zone: item.zone || null,
        label: getLocalizedSeatLabel(item)
      } : null
    };
  }

  function applyMemoPayload(payload) {
    const memoState = payload?.state || payload;
    if (!memoState || typeof memoState !== 'object') throw new Error('Invalid memo payload');
    if (SUPPORTED_LANGS.includes(memoState.lang)) state.lang = memoState.lang;
    state.performanceId = SEATMAP_DATA.performances.some(p => p.id === memoState.performanceId) ? memoState.performanceId : 'reset';
    state.selectedId = memoState.selectedId && itemById.has(memoState.selectedId) ? memoState.selectedId : null;
    state.eventDate = typeof memoState.eventDate === 'string' ? memoState.eventDate.slice(0, 40) : '';
    state.displayName = typeof memoState.displayName === 'string' ? memoState.displayName.slice(0, 28) : '';
    state.entryNumber = typeof memoState.entryNumber === 'string' ? memoState.entryNumber.slice(0, 24) : '';
    state.tourRound = /^([1-9]|1[0-9]|2[0-5])$/.test(String(memoState.tourRound || '')) ? String(memoState.tourRound) : '';
    state.mapZoom = Number.isFinite(Number(memoState.mapZoom)) ? clamp(Number(memoState.mapZoom), ZOOM_MIN, ZOOM_MAX) : 1;
    localStorage.setItem('seatmapLang', state.lang);
    syncHash();
    applyLanguage();
    renderSelection();
    updateUI();
    applyMapZoom();
    resetMapView(false);
  }

  async function initCloudSave() {
    if (!els.cloudStatus) return;
    if (!window.supabase?.createClient) {
      cloud.ready = false;
      updatePersistenceUI('cloudUnavailable');
      return;
    }
    cloud.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    cloud.ready = true;
    const { data } = await cloud.client.auth.getSession();
    cloud.user = data.session?.user || null;
    cloud.client.auth.onAuthStateChange((_event, session) => {
      cloud.user = session?.user || null;
      if (!cloud.user) {
        cloud.records = [];
        cloud.publicLotteryRecords = [];
        cloud.selectedId = '';
        renderCloudRecordsTable();
        renderDistributionChart();
        updatePersistenceUI();
        return;
      }
      loadCloudRecords({ silent: true });
    });
    if (cloud.user) await loadCloudRecords({ silent: true });
    await loadPublicLotteryRecords({ silent: true });
    updatePersistenceUI();
  }

  async function loginCloudAccount(event) {
    event.preventDefault();
    if (!cloud.client) { showToast(t('cloudUnavailable')); return; }
    const submitter = event.submitter;
    const action = submitter?.dataset.authAction === 'signup' ? 'signup' : 'signin';
    const nickname = els.cloudNicknameInput?.value.trim() || '';
    const email = els.cloudEmailInput?.value.trim();
    const password = els.cloudPasswordInput?.value || '';
    if (!email || !password) { setCloudMessage(t('cloudMissingEmailPassword')); showToast(t('cloudMissingEmailPassword')); return; }
    if (action === 'signup' && !nickname) { setCloudMessage(t('cloudMissingSignup')); showToast(t('cloudMissingSignup')); return; }
    setCloudBusy(true);
    setCloudMessage(action === 'signup' ? t('cloudSigningUp') : t('cloudSigningIn'));
    const result = action === 'signup'
      ? await cloud.client.auth.signUp({ email, password, options: { data: { display_name: nickname }, emailRedirectTo: window.location.href } })
      : await cloud.client.auth.signInWithPassword({ email, password });
    setCloudBusy(false);
    if (result.error) { console.warn(result.error); setCloudMessage(result.error.message || t('cloudActionFailed')); showToast(t('cloudActionFailed')); return; }
    cloud.user = result.data.session?.user || cloud.user;
    setCloudMessage(action === 'signup' && !result.data.session ? t('cloudSignupNeedsConfirm') : t('cloudSignedIn'));
    updatePersistenceUI();
    if (cloud.user) await loadCloudRecords({ silent: true });
    if (cloud.user) toggleAccountPopover(false);
  }

  async function logoutCloudAccount() {
    if (!cloud.client) return;
    setCloudBusy(true);
    const { error } = await cloud.client.auth.signOut();
    setCloudBusy(false);
    if (error) { console.warn(error); showToast(t('cloudLogoutFailed')); return; }
    cloud.user = null;
    cloud.records = [];
    cloud.publicLotteryRecords = [];
    cloud.selectedId = '';
    renderCloudRecordsTable();
    renderDistributionChart();
    updatePersistenceUI();
    showToast(t('cloudLoggedOut'));
  }

  async function saveCloudMemo() {
    if (!requireCloudLogin()) return;
    if (cloud.records.length >= CLOUD_RECORD_LIMIT) {
      setCloudMessage(cloudRecordLimitMessage());
      showToast(cloudRecordLimitMessage());
      return;
    }
    setCloudBusy(true);
    const row = buildCloudRow();
    const result = await writeCloudRow('insert', row);
    setCloudBusy(false);
    if (!result) return;
    cloud.selectedId = result.id;
    await loadCloudRecords({ silent: true });
    showToast(t('cloudSaveSuccess'));
  }

  async function loadCloudSelection(recordId) {
    if (!requireCloudLogin()) return;
    const record = cloud.records.find(item => item.id === recordId);
    if (!record) { await loadCloudRecords(); return; }
    try {
      applyMemoPayload(record.payload || {});
      switchTab('seat');
      showToast(t('cloudLoadSuccess'));
    } catch (error) {
      console.warn(error);
      showToast(t('cloudActionFailed'));
    }
  }

  async function updateCloudMemo(recordId) {
    if (!requireCloudLogin()) return;
    cloud.selectedId = recordId;
    setCloudBusy(true);
    const row = buildCloudRow();
    row.updated_at = new Date().toISOString();
    const result = await writeCloudRow('update', row, recordId);
    setCloudBusy(false);
    if (!result) return;
    await loadCloudRecords({ silent: true });
    showToast(t('cloudUpdateSuccess'));
  }

  async function deleteCloudMemo(recordId) {
    if (!requireCloudLogin()) return;
    if (!window.confirm(t('confirmDelete'))) return;
    setCloudBusy(true);
    const { error } = await cloud.client.from(CLOUD_TABLE).delete().eq('id', recordId);
    setCloudBusy(false);
    if (error) { console.warn(error); showToast(t('cloudActionFailed')); return; }
    cloud.selectedId = '';
    await loadCloudRecords({ silent: true });
    showToast(t('cloudDeleteSuccess'));
  }

  async function loadCloudRecords(options = {}) {
    if (!requireCloudLogin(options.silent)) return;
    setCloudBusy(true);
    const { data, error } = await cloud.client
      .from(CLOUD_TABLE)
      .select('id,event_date,performance_title,seat_label,payload,public_consent,public_status,created_at,updated_at')
      .eq('user_id', cloud.user.id)
      .order('updated_at', { ascending: false })
      .limit(CLOUD_RECORD_LIMIT);
    setCloudBusy(false);
    if (error) { console.warn(error); if (!options.silent) showToast(t('cloudActionFailed')); return; }
    cloud.records = Array.isArray(data) ? data : [];
    if (cloud.selectedId && !cloud.records.some(record => record.id === cloud.selectedId)) cloud.selectedId = '';
    renderCloudRecordsTable();
    await loadPublicLotteryRecords({ silent: true });
    renderDistributionChart();
    updatePersistenceUI(options.silent ? undefined : 'cloudRecordsLoaded');
    if (!options.silent) showToast(formatMessage('cloudRecordsLoaded', { count: cloud.records.length }));
  }

  async function loadPublicLotteryRecords(options = {}) {
    if (!cloud.client) return;
    const { data, error } = await cloud.client
      .from(CLOUD_TABLE)
      .select('id,event_date,performance_title,payload,public_consent,public_status,created_at')
      .eq('public_consent', true)
      .in('public_status', ['pending', 'approved'])
      .order('event_date', { ascending: true })
      .limit(500);
    if (error) {
      console.warn('Public lottery records unavailable', error);
      if (!options.silent) setCloudMessage(`${t('publicStatsBlocked')} ${error.message || ''}`.trim());
      cloud.publicLotteryRecords = [];
      return;
    }
    cloud.publicLotteryRecords = (Array.isArray(data) ? data : []).filter(record => record.payload?.type === 'lottery-entry');
  }

  function buildCloudRow() {
    const item = state.selectedId ? itemById.get(state.selectedId) : null;
    const performance = getCurrentPerformance();
    return {
      user_id: cloud.user.id,
      event_date: extractDateOnly(state.eventDate),
      performance_id: null,
      performance_title: performance?.label || '',
      seat_block: item?.section || item?.area || item?.zone || null,
      seat_row: item?.row == null ? null : String(item.row),
      seat_number: item?.number == null ? null : String(item.number),
      seat_label: item ? getLocalizedSeatLabel(item) : null,
      lottery_order: toIntOrNull(state.tourRound),
      entry_order: toIntOrNull(state.entryNumber),
      view_rating: null,
      view_note: null,
      private_note: null,
      payload: buildMemoPayload(),
      public_consent: false,
      public_status: 'private',
      source: 'web'
    };
  }

  function buildLotteryCloudRow() {
    const performance = getLotteryPerformance();
    const payload = buildLotteryPayload();
    const selfEntry = lotteryState.entries.find(entry => entry.isSelf);
    return {
      user_id: cloud.user.id,
      event_date: extractDateOnly(els.lotteryDateInput?.value),
      performance_id: null,
      performance_title: performance?.label || '',
      seat_block: null,
      seat_row: null,
      seat_number: null,
      seat_label: t('lotteryRecordType'),
      lottery_order: selfEntry?.order || null,
      entry_order: parseRangeStart(selfEntry?.range || ''),
      view_rating: null,
      view_note: t('lotteryRecordType'),
      private_note: null,
      payload,
      public_consent: Boolean(els.lotteryPublicConsent?.checked),
      public_status: els.lotteryPublicConsent?.checked ? 'pending' : 'private',
      source: 'web'
    };
  }

  async function writeCloudRow(action, row, recordId) {
    let result = await sendCloudRow(action, row, recordId);
    if (result.error) {
      const retryRow = toMinimalCloudRow(row, action);
      const retryResult = await sendCloudRow(action, retryRow, recordId);
      if (!retryResult.error) result = retryResult;
    }
    if (result.error) {
      console.warn(result.error);
      setCloudMessage(formatCloudError(result.error));
      showToast(t('cloudActionFailed'));
      return null;
    }
    return result.data;
  }

  function toMinimalCloudRow(row, action) {
    const minimal = { payload: row.payload };
    if (action !== 'update') minimal.user_id = row.user_id;
    return minimal;
  }

  function formatCloudError(error) {
    if (isCloudRecordLimitError(error)) return cloudRecordLimitMessage();
    const parts = [t('cloudActionFailed')];
    if (error.code) parts.push(`[${error.code}]`);
    if (error.message) parts.push(error.message);
    if (error.details) parts.push(error.details);
    return parts.join(' ');
  }

  function isCloudRecordLimitError(error) {
    const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');
    return /tool48_seatmap_cloud_record_limit_reached|seat_memo_records limit/i.test(text);
  }

  function cloudRecordLimitMessage() {
    const messages = {
      ja: 'クラウド保存は最大200件までです。古い保存を削除してから新しく保存してください。',
      zh: '雲端最多可保存 200 筆紀錄。請先刪除舊紀錄，再保存新紀錄。',
      'zh-Hans': '云端最多可保存 200 条记录。请先删除旧记录，再保存新记录。',
      ko: '클라우드에는 최대 200개 기록까지 저장할 수 있습니다. 새로 저장하기 전에 이전 기록을 삭제해 주세요.',
      th: 'Cloud save เก็บได้สูงสุด 200 รายการ โปรดลบรายการเก่าก่อนบันทึกรายการใหม่',
      id: 'Cloud save dapat menyimpan hingga 200 catatan. Hapus catatan lama sebelum menyimpan yang baru.',
      en: 'Cloud save can keep up to 200 records. Delete old records before saving a new one.'
    };
    return messages[state.lang] || messages.en;
  }

  function sendCloudRow(action, row, recordId) {
    if (action === 'update') {
      return cloud.client.from(CLOUD_TABLE).update(row).eq('id', recordId).select('id').single();
    }
    return cloud.client.from(CLOUD_TABLE).insert(row).select('id').single();
  }

  function requireCloudLogin(silent) {
    const ok = !!(cloud.client && cloud.user);
    if (!ok && !silent) showToast(t('cloudLoginRequired'));
    updatePersistenceUI();
    return ok;
  }

  function updatePersistenceUI(statusKey) {
    const loggedIn = !!cloud.user;
    if (els.cloudSection) els.cloudSection.classList.toggle('is-local-only', !loggedIn);
    if (els.cloudStatus) {
      if (statusKey) els.cloudStatus.textContent = formatMessage(statusKey, { count: cloud.records.length });
      else if (!cloud.ready) els.cloudStatus.textContent = t('cloudUnavailable');
      else if (loggedIn) els.cloudStatus.textContent = formatMessage('cloudLoggedIn', { email: cloud.user.email || t('cloudAccount') });
      else els.cloudStatus.textContent = t('cloudLocalOnly');
    }
    if (els.cloudLoginForm) {
      els.cloudLoginForm.hidden = loggedIn || !cloud.ready;
      els.cloudLoginForm.setAttribute('aria-hidden', loggedIn || !cloud.ready ? 'true' : 'false');
    }
    [els.cloudNicknameInput, els.cloudEmailInput, els.cloudPasswordInput, els.cloudSignInBtn, els.cloudSignUpBtn].forEach(node => {
      if (node) node.disabled = cloud.busy || loggedIn || !cloud.ready;
    });
    if (els.cloudActions) {
      els.cloudActions.hidden = !loggedIn;
      els.cloudActions.setAttribute('aria-hidden', loggedIn ? 'false' : 'true');
    }
    if (els.cloudUserLabel) els.cloudUserLabel.textContent = loggedIn ? getCloudDisplayName() : '';
    if (els.accountToggleBtn) els.accountToggleBtn.textContent = loggedIn ? getCloudDisplayName() : t('accountNavGuest');
    if (els.cloudLogoutBtn) {
      els.cloudLogoutBtn.disabled = cloud.busy;
    }
    if (els.cloudSaveBtn) els.cloudSaveBtn.disabled = cloud.busy || !loggedIn;
    if (els.refreshCloudRecordsBtn) els.refreshCloudRecordsBtn.disabled = cloud.busy || !loggedIn;
    if (els.saveLotteryCloudBtn) els.saveLotteryCloudBtn.disabled = cloud.busy || !loggedIn;
  }

  function setCloudBusy(isBusy) {
    cloud.busy = isBusy;
    updatePersistenceUI();
  }

  function setCloudMessage(message) {
    if (els.cloudMessage) els.cloudMessage.textContent = message || '';
  }

  function getCloudDisplayName() {
    const metaName = cloud.user?.user_metadata?.display_name;
    return metaName || cloud.user?.email || t('cloudAccount');
  }

  function renderCloudRecordsTable() {
    if (!els.cloudRecordsTable) return;
    const seatRecords = cloud.records.filter(record => record.payload?.type !== 'lottery-entry');
    els.cloudRecordsTable.innerHTML = '';
    if (els.cloudRecordsEmpty) els.cloudRecordsEmpty.hidden = seatRecords.length > 0;
    seatRecords.forEach(record => {
      const row = document.createElement('tr');
      row.dataset.id = record.id;
      row.innerHTML = `
        <td>${escapeHtml(record.event_date || formatSavedAt(record.updated_at || record.created_at))}</td>
        <td>${escapeHtml(record.performance_title || t('performance'))}</td>
        <td>${escapeHtml(record.seat_label || record.payload?.seat?.label || t('noSelection'))}</td>
        <td>${escapeHtml(record.public_consent ? t('publicBadge') : t('privateBadge'))}</td>
        <td>
          <div class="record-buttons">
            <button type="button" data-action="load">${escapeHtml(t('recordLoad'))}</button>
            <button type="button" data-action="update">${escapeHtml(t('recordUpdate'))}</button>
            <button type="button" class="delete" data-action="delete">${escapeHtml(t('recordDelete'))}</button>
          </div>
        </td>
      `;
      els.cloudRecordsTable.appendChild(row);
    });
  }

  function handleCloudRecordsTableClick(event) {
    const button = event.target.closest('button[data-action]');
    const row = event.target.closest('tr[data-id]');
    if (!button || !row) return;
    const id = row.dataset.id;
    if (button.dataset.action === 'load') loadCloudSelection(id);
    if (button.dataset.action === 'update') updateCloudMemo(id);
    if (button.dataset.action === 'delete') deleteCloudMemo(id);
  }

  function switchTab(name) {
    els.tabButtons.forEach(button => button.classList.toggle('active', button.dataset.tab === name));
    els.tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === `tab-${name}`));
    if (name === 'records') loadCloudRecords({ silent: true });
    if (name === 'distribution') renderDistributionChart();
  }

  function renderLotteryRanges() {
    if (!els.lotteryLeftColumn || !els.lotteryRightColumn) return;
    els.lotteryLeftColumn.innerHTML = '';
    els.lotteryRightColumn.innerHTML = '';
    getLotteryRanges().forEach((range, index) => {
      const button = document.createElement('button');
      const entry = lotteryState.entries.find(item => item.range === range.key);
      button.type = 'button';
      button.className = 'lottery-range-button';
      button.dataset.range = range.key;
      button.innerHTML = `<strong>${range.label}</strong><span>${entry ? formatLotteryOrder(entry) : ''}</span>`;
      button.classList.toggle('is-marked', Boolean(entry));
      button.classList.toggle('is-self', Boolean(entry?.isSelf));
      button.addEventListener('click', event => {
        window.clearTimeout(lotteryClickTimer);
        if (event.detail > 1) return;
        lotteryClickTimer = window.setTimeout(() => markLotteryRange(range.key), 190);
      });
      button.addEventListener('dblclick', event => {
        event.preventDefault();
        window.clearTimeout(lotteryClickTimer);
        markLotteryRange(range.key, true);
      });
      (index < 13 ? els.lotteryLeftColumn : els.lotteryRightColumn).appendChild(button);
    });
  }

  function getLotteryRanges() {
    return [
      { key: '1-9', label: '1~9' },
      ...Array.from({ length: 25 }, (_, index) => {
        const start = 10 + index * 10;
        const end = start + 9;
        return { key: `${start}-${end}`, label: `${start}~${end}` };
      })
    ];
  }

  function markLotteryRange(range, asSelf) {
    let entry = lotteryState.entries.find(item => item.range === range);
    if (entry && !asSelf) {
      lotteryState.entries = lotteryState.entries.filter(item => item.range !== range);
      if (lotteryState.selfRange === range) lotteryState.selfRange = '';
      renderLotteryRanges();
      renderDistributionChart();
      return;
    }
    if (entry && asSelf && entry.isSelf) {
      entry.isSelf = false;
      lotteryState.selfRange = '';
      renderLotteryRanges();
      renderDistributionChart();
      return;
    }
    if (!entry) {
      entry = { range, order: lotteryState.nextOrder, isSelf: false };
      lotteryState.entries.push(entry);
      lotteryState.nextOrder += 1;
    }
    if (asSelf) {
      lotteryState.entries.forEach(item => { item.isSelf = false; });
      entry.isSelf = true;
      lotteryState.selfRange = range;
    }
    renderLotteryRanges();
    renderDistributionChart();
  }

  function formatLotteryOrder(entry) {
    const base = `${entry.order}${t('tourUnit')}`;
    return entry.isSelf ? `${base} / ${t('selfMark')}` : base;
  }

  function clearLotteryRecord() {
    lotteryState.entries = [];
    lotteryState.nextOrder = 1;
    lotteryState.selfRange = '';
    if (els.lotteryPublicConsent) els.lotteryPublicConsent.checked = false;
    renderLotteryRanges();
    renderDistributionChart();
  }

  function getLotteryPerformance() {
    const id = els.lotteryPerformanceSelect?.value || state.performanceId;
    return SEATMAP_DATA.performances.find(performance => performance.id === id) || SEATMAP_DATA.performances[0];
  }

  function buildLotteryPayload() {
    const performance = getLotteryPerformance();
    return {
      version: 1,
      type: 'lottery-entry',
      source: 'web',
      savedAt: new Date().toISOString(),
      lang: state.lang,
      eventDate: els.lotteryDateInput?.value || '',
      performance: performance ? { id: performance.id, label: performance.label } : null,
      entries: lotteryState.entries.map(entry => ({ ...entry }))
    };
  }

  async function saveLotteryCloudRecord() {
    if (!requireCloudLogin()) return;
    if (!lotteryState.entries.length) { showToast(t('lotteryNoMarks')); return; }
    setCloudBusy(true);
    const result = await writeCloudRow('insert', buildLotteryCloudRow());
    setCloudBusy(false);
    if (!result) return;
    await loadCloudRecords({ silent: true });
    showToast(t('lotterySaved'));
  }

  async function downloadLotteryImage() {
    if (!lotteryState.entries.length) { showToast(t('lotteryNoMarks')); return; }
    const dataUrl = buildLotteryImage();
    if (shouldOpenPreview()) { openModal(dataUrl); return; }
    const date = extractDateOnly(els.lotteryDateInput?.value) || new Date().toISOString().slice(0, 10);
    triggerDownload(dataUrl, `akb48-entry-lottery_${date}.png`);
  }

  function buildLotteryImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    drawLotteryCard(ctx, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  function drawLotteryCard(ctx, width, height) {
    ctx.fillStyle = '#fff7fb';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ff007f';
    ctx.font = '900 48px "Noto Sans JP", sans-serif';
    ctx.fillText(t('lotteryTitle'), 56, 86);
    ctx.fillStyle = '#1b2330';
    ctx.font = '800 26px "Noto Sans JP", sans-serif';
    ctx.fillText(getLotteryPerformance()?.label || '', 56, 136);
    ctx.fillText(formatEventDateForDisplay(els.lotteryDateInput?.value || ''), 56, 176);
    const ranges = getLotteryRanges();
    const colW = 400;
    const startY = 236;
    ranges.forEach((range, index) => {
      const col = index < 13 ? 0 : 1;
      const row = index % 13;
      const x = 56 + col * 448;
      const y = startY + row * 74;
      const entry = lotteryState.entries.find(item => item.range === range.key);
      ctx.fillStyle = entry?.isSelf ? '#ffe1ef' : 'rgba(255,255,255,.95)';
      roundRect(ctx, x, y, colW, 54, 18);
      ctx.fill();
      ctx.strokeStyle = entry ? '#ff007f' : '#ffd0e6';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#1b2330';
      ctx.font = '900 24px "Noto Sans JP", sans-serif';
      ctx.fillText(range.label, x + 22, y + 35);
      if (entry) {
        ctx.fillStyle = entry.isSelf ? '#ff007f' : '#25718a';
        ctx.textAlign = 'right';
        ctx.fillText(formatLotteryOrder(entry), x + colW - 22, y + 35);
        ctx.textAlign = 'left';
      }
    });
  }

  function renderDistributionChart() {
    const source = getFilteredLotteryRecords();
    if (els.distributionEmpty) els.distributionEmpty.hidden = source.length > 0;
    drawDistributionChart(source);
    drawRangeAverageChart(source);
    drawBlockGroupAverageChart(source);
    drawBlockTimeHeatmap(els.communityDayCanvas, source, 'day', t('dayNoHeatmapTitle'));
    drawBlockTimeHeatmap(els.communityMonthCanvas, source, 'month', t('monthNoHeatmapTitle'));
    drawGapHistogram(source);
    drawStreakChart(source);
    drawSelfLandingChart(source.filter(record => record.scope === 'mine'), source);
  }

  function getFilteredLotteryRecords() {
    const mine = [
      ...cloud.records.filter(record => record.payload?.type === 'lottery-entry'),
      ...(lotteryState.entries.length ? [{ id: 'current', payload: buildLotteryPayload(), public_consent: Boolean(els.lotteryPublicConsent?.checked), event_date: extractDateOnly(els.lotteryDateInput?.value), performance_title: getLotteryPerformance()?.label || '' }] : [])
    ].map(record => normalizeLotteryRecord(record, 'mine'));
    const community = cloud.publicLotteryRecords.map(record => normalizeLotteryRecord(record, 'community'));
    const sourceMode = els.filterSourceSelect?.value || 'all';
    return [...(sourceMode !== 'community' ? mine : []), ...(sourceMode !== 'mine' ? community : [])].filter(record => record.entries.length && passesDistributionFilters(record));
  }

  function normalizeLotteryRecord(record, scope) {
    const payload = record.payload || {};
    const eventDate = extractDateOnly(record.event_date || payload.eventDate || payload.savedAt);
    return {
      id: record.id,
      scope,
      eventDate,
      date: eventDate ? new Date(`${eventDate}T00:00:00`) : null,
      performanceId: payload.performance?.id || '',
      performanceTitle: record.performance_title || payload.performance?.label || '',
      performanceType: detectPerformanceType(record.performance_title || payload.performance?.label || ''),
      entries: (payload.entries || [])
        .map(entry => ({ ...entry, order: Number(entry.order), start: parseRangeStart(entry.range), rangeIndex: getLotteryRangeIndex(entry.range) }))
        .filter(entry => Number.isFinite(entry.order) && Number.isFinite(entry.rangeIndex))
    };
  }

  function passesDistributionFilters(record) {
    const date = record.date;
    const year = els.filterYearSelect?.value || '';
    const month = els.filterMonthSelect?.value || '';
    const monthPart = els.filterMonthPartSelect?.value || '';
    const weekday = els.filterWeekdaySelect?.value || '';
    const performance = els.filterPerformanceSelect?.value || '';
    const performanceType = els.filterPerformanceTypeSelect?.value || '';
    if (year && (!date || String(date.getFullYear()) !== year)) return false;
    if (month && (!date || String(date.getMonth() + 1).padStart(2, '0') !== month)) return false;
    if (weekday && (!date || String(date.getDay()) !== weekday)) return false;
    if (monthPart && getMonthPart(date) !== monthPart) return false;
    if (performance && record.performanceId !== performance) return false;
    if (performanceType && record.performanceType !== performanceType) return false;
    return true;
  }

  function detectPerformanceType(title) {
    if (/生誕|birthday/i.test(title)) return 'birthday';
    if (/特別|special|周年|卒業/i.test(title)) return 'special';
    return 'normal';
  }

  function getMonthPart(date) {
    if (!date) return '';
    const day = date.getDate();
    if (day <= 10) return 'early';
    if (day <= 20) return 'mid';
    return 'late';
  }

  function drawMyHistoryChart(records) {
    if (!els.myHistoryCanvas) return;
    const points = records.map(record => ({ label: record.eventDate || '-', value: getRecordSelfOrder(record) })).filter(point => point.value);
    drawLineChart(els.myHistoryCanvas, points, t('myHistoryLineTitle'));
  }

  function drawBucketChart(canvas, records, title) {
    if (!canvas) return;
    const counts = { low: 0, mid: 0, high: 0 };
    records.forEach(record => record.entries.forEach(entry => { counts[getRangeGroup(entry.range)] += 1; }));
    drawSimpleBars(canvas, [
      { label: t('distLowNo'), value: counts.low },
      { label: t('distMidNo'), value: counts.mid },
      { label: t('distHighNo'), value: counts.high }
    ], title);
  }

  function drawMonthHeatmap(records) {
    drawNoHeatmap(els.communityMonthCanvas, records, 'month', t('monthNoHeatmapTitle'));
  }

  function drawDayHeatmap(records) {
    drawNoHeatmap(els.communityDayCanvas, records, 'day', t('dayNoHeatmapTitle'));
  }

  function drawPerformanceAverageChart(records) {
    if (!els.performanceAvgCanvas) return;
    const grouped = {};
    records.forEach(record => {
      const key = record.performanceTitle || t('performance');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(...record.entries.map(entry => entry.order));
    });
    const rows = Object.entries(grouped).map(([label, values]) => ({ label, value: average(values) || 0 })).sort((a, b) => a.value - b.value).slice(0, 8);
    drawSimpleBars(els.performanceAvgCanvas, rows, t('performanceAvgTitle'), true);
  }

  function drawGapHistogram(records) {
    if (!els.gapHistogramCanvas) return;
    const gaps = {};
    records.forEach(record => getRecordGaps(record).forEach(gap => { gaps[gap] = (gaps[gap] || 0) + 1; }));
    const rows = Object.entries(gaps).sort((a, b) => Number(a[0]) - Number(b[0])).map(([gap, value]) => ({ label: gap, value }));
    drawSimpleBars(els.gapHistogramCanvas, rows.slice(0, 12), t('gapHistogramTitle'));
  }

  function drawStreakChart(records) {
    if (!els.streakCanvas) return;
    const totals = { two: 0, three: 0, four: 0 };
    records.forEach(record => {
      const streaks = countRecordStreaks(record);
      totals.two += streaks.two;
      totals.three += streaks.three;
      totals.four += streaks.four;
    });
    drawSimpleBars(els.streakCanvas, [
      { label: '2', value: totals.two },
      { label: '3', value: totals.three },
      { label: '4+', value: totals.four }
    ], t('streakTitle'));
  }

  function getRecordSelfOrder(record) {
    const self = record.entries.find(entry => entry.isSelf);
    return self?.order || record.entries[0]?.order || null;
  }

  function getRecordGaps(record) {
    const ordered = record.entries.slice().sort((a, b) => a.order - b.order);
    const gaps = [];
    for (let i = 1; i < ordered.length; i += 1) {
      gaps.push(Math.abs(ordered[i].start - ordered[i - 1].start));
    }
    return gaps;
  }

  function countRecordStreaks(record) {
    const starts = record.entries.map(entry => entry.start).filter(Boolean).sort((a, b) => a - b);
    let current = 1;
    const totals = { two: 0, three: 0, four: 0 };
    for (let i = 1; i <= starts.length; i += 1) {
      if (starts[i] - starts[i - 1] === 10 || (starts[i - 1] === 1 && starts[i] === 10)) current += 1;
      else {
        if (current === 2) totals.two += 1;
        if (current === 3) totals.three += 1;
        if (current >= 4) totals.four += 1;
        current = 1;
      }
    }
    return totals;
  }

  function drawLineChart(canvas, points, title) {
    const ctx = setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    drawChartTitle(ctx, title);
    if (!points.length) return drawEmptyChart(ctx, width, height);
    const max = Math.max(1, ...points.map(point => point.value));
    const left = 52;
    const top = 52;
    const bottom = height - 46;
    const usableW = width - left - 28;
    const usableH = bottom - top;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(width - 20, bottom);
    ctx.stroke();
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = left + (points.length === 1 ? usableW / 2 : (usableW / (points.length - 1)) * index);
      const y = bottom - (point.value / max) * usableH;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    points.forEach((point, index) => {
      const x = left + (points.length === 1 ? usableW / 2 : (usableW / (points.length - 1)) * index);
      const y = bottom - (point.value / max) * usableH;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  }

  function drawSimpleBars(canvas, rows, title, lowerIsBetter) {
    const ctx = setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    drawChartTitle(ctx, title);
    const filtered = rows.filter(row => Number.isFinite(row.value) && row.value > 0);
    if (!filtered.length) return drawEmptyChart(ctx, width, height);
    const max = Math.max(1, ...filtered.map(row => row.value));
    const left = 42;
    const bottom = height - 40;
    const top = 48;
    const barW = Math.max(24, (width - left - 30) / filtered.length - 12);
    filtered.forEach((row, index) => {
      const x = left + index * (barW + 12);
      const h = Math.max(8, (row.value / max) * (bottom - top));
      const y = bottom - h;
      const grad = ctx.createLinearGradient(0, y, 0, bottom);
      grad.addColorStop(0, lowerIsBetter ? '#00c9e8' : '#ff007f');
      grad.addColorStop(1, '#ff8ec4');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW, h, 9);
      ctx.fill();
      ctx.fillStyle = '#1b2330';
      ctx.font = '800 12px "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Number.isInteger(row.value) ? row.value : row.value.toFixed(1), x + barW / 2, y - 8);
      ctx.fillText(shortenText(row.label, 9), x + barW / 2, bottom + 18);
      ctx.textAlign = 'left';
    });
  }

  function drawNoHeatmap(canvas, records, mode, title) {
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    drawChartTitle(ctx, title);
    if (!records.length) return drawEmptyChart(ctx, width, height);
    const cols = mode === 'month'
      ? Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
      : Array.from({ length: 31 }, (_, i) => String(i + 1));
    const groups = ['low', 'mid', 'high'];
    const matrix = {};
    cols.forEach(col => { matrix[col] = { low: [], mid: [], high: [] }; });
    records.forEach(record => {
      if (!record.date) return;
      const col = mode === 'month' ? String(record.date.getMonth() + 1).padStart(2, '0') : String(record.date.getDate());
      record.entries.forEach(entry => matrix[col]?.[getRangeGroup(entry.range)]?.push(entry.order));
    });
    const cellW = (width - 86) / cols.length;
    const cellH = 42;
    groups.forEach((group, row) => {
      ctx.fillStyle = '#667085';
      ctx.font = '800 12px "Noto Sans JP", sans-serif';
      ctx.fillText(group, 22, 74 + row * cellH);
      cols.forEach((col, index) => {
        const avg = average(matrix[col][group]);
        ctx.fillStyle = heatColor(avg, 20);
        roundRect(ctx, 64 + index * cellW, 54 + row * cellH, Math.max(8, cellW - 3), cellH - 7, 5);
        ctx.fill();
      });
    });
  }

  function setupCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return ctx;
  }

  function drawChartTitle(ctx, title) {
    // Section cards already render visible titles. Canvas titles stay suppressed
    // to avoid duplicate headings while keeping the drawing code simple.
    void ctx;
    void title;
  }

  function drawEmptyChart(ctx, width, height) {
    ctx.fillStyle = '#667085';
    ctx.font = '800 15px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('distributionEmpty'), width / 2, height / 2);
    ctx.textAlign = 'left';
  }

  function shortenText(value, max) {
    const text = String(value || '');
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  function drawDistributionChart(records) {
    if (!els.distributionCanvas) return;
    const canvas = els.distributionCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    const ranges = getLotteryRanges();
    const stats = new Map(ranges.map(range => [range.key, { totalOrder: 0, count: 0 }]));
    const monthly = {};
    let consecutivePairs = 0;
    let possiblePairs = 0;
    records.forEach(record => {
      record.entries.forEach(entry => {
        const bucket = stats.get(entry.range);
        if (bucket) {
          bucket.totalOrder += Number(entry.order);
          bucket.count += 1;
        }
        const month = String(record.eventDate || '').slice(0, 7) || 'unknown';
        if (!monthly[month]) monthly[month] = { low: [], mid: [], high: [] };
        monthly[month][getRangeGroup(entry.range)].push(Number(entry.order));
      });
      const byStart = record.entries.slice().sort((a, b) => a.start - b.start);
      for (let i = 1; i < byStart.length; i += 1) {
        possiblePairs += 1;
        if (Math.abs(Number(byStart[i].order) - Number(byStart[i - 1].order)) === 1) consecutivePairs += 1;
      }
    });
    const rangeAverages = ranges.map(range => {
      const item = stats.get(range.key);
      return { ...range, avg: item.count ? item.totalOrder / item.count : null, count: item.count };
    });
    const maxAvg = Math.max(1, ...rangeAverages.map(item => item.avg || 0));
    const groupAvg = group => average(rangeAverages.filter(item => getRangeGroup(item.key) === group).map(item => item.avg).filter(Boolean));
    const consecutiveRate = possiblePairs ? consecutivePairs / possiblePairs : 0;

    ctx.fillStyle = '#1b2330';
    ctx.font = '900 25px "Noto Sans JP", sans-serif';
    ctx.fillText(t('distributionTitle'), 40, 38);
    ctx.font = '800 13px "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#667085';
    ctx.fillText(t('distributionSubtitle'), 40, 62);

    [
      [t('distLowNo'), formatAvgOrder(groupAvg('low'))],
      [t('distMidNo'), formatAvgOrder(groupAvg('mid'))],
      [t('distHighNo'), formatAvgOrder(groupAvg('high'))],
      [t('distConsecutive'), `${Math.round(consecutiveRate * 100)}%`]
    ].forEach((item, index) => {
      const x = 40 + index * 225;
      ctx.fillStyle = index === 0 ? '#fff2f8' : index === 3 ? '#eef9ff' : '#f8fbff';
      roundRect(ctx, x, 82, 202, 72, 18);
      ctx.fill();
      ctx.fillStyle = '#667085';
      ctx.font = '800 12px "Noto Sans JP", sans-serif';
      ctx.fillText(item[0], x + 16, 110);
      ctx.fillStyle = '#1b2330';
      ctx.font = '900 24px "Noto Sans JP", sans-serif';
      ctx.fillText(item[1], x + 16, 140);
    });

    const left = 72;
    const top = 210;
    const barGap = 7;
    const barW = Math.max(18, (width - left - 42) / ranges.length - barGap);
    rangeAverages.forEach((range, index) => {
      const value = range.avg;
      const h = value ? Math.max(8, (1 - (value - 1) / Math.max(maxAvg - 1, 1)) * 230) : 0;
      const x = left + index * (barW + barGap);
      const y = top + 250 - h;
      const grad = ctx.createLinearGradient(0, y, 0, top + 250);
      grad.addColorStop(0, '#ff007f');
      grad.addColorStop(1, '#00c9e8');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW, h, 7);
      ctx.fill();
      ctx.fillStyle = '#1b2330';
      ctx.font = '800 11px "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      if (value) ctx.fillText(value.toFixed(1), x + barW / 2, y - 8);
      ctx.save();
      ctx.translate(x + barW / 2, top + 278);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(range.label, 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
    });

    const months = Object.keys(monthly).sort().slice(-8);
    const heatX = 72;
    const heatY = 445;
    ctx.fillStyle = '#1b2330';
    ctx.font = '900 16px "Noto Sans JP", sans-serif';
    ctx.fillText(t('distMonthBias'), heatX, heatY - 16);
    months.forEach((month, index) => {
      const x = heatX + index * 104;
      ctx.fillStyle = '#667085';
      ctx.font = '800 11px "Noto Sans JP", sans-serif';
      ctx.fillText(month, x, heatY);
      ['low', 'mid', 'high'].forEach((group, row) => {
        const avg = average(monthly[month][group]);
        ctx.fillStyle = heatColor(avg, maxAvg);
        roundRect(ctx, x, heatY + 12 + row * 24, 82, 18, 6);
        ctx.fill();
      });
    });
  }

  function getRangeGroup(range) {
    const start = parseRangeStart(range);
    if (start < 90) return 'low';
    if (start < 180) return 'mid';
    return 'high';
  }

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : null;
  }

  function formatAvgOrder(value) {
    return value ? `${value.toFixed(1)}${t('tourUnit')}` : '-';
  }

  function heatColor(value, maxAvg) {
    if (!value) return '#f3f4f6';
    const good = 1 - (value - 1) / Math.max(maxAvg - 1, 1);
    const red = Math.round(255 - good * 8);
    const green = Math.round(238 - good * 120);
    const blue = Math.round(246 + good * 5);
    return `rgb(${red}, ${green}, ${blue})`;
  }

  function drawRangeAverageChart(records) {
    if (!els.performanceAvgCanvas) return;
    const canvas = els.performanceAvgCanvas;
    const ctx = setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    const ranges = getLotteryRanges();
    drawChartTitle(ctx, t('averageOrderTitle'));
    if (!records.length) return drawEmptyChart(ctx, width, height);
    const values = ranges.map(range => {
      const orders = records.flatMap(record => record.entries.filter(entry => entry.range === range.key).map(entry => entry.order));
      return { ...range, value: average(orders), count: orders.length };
    });
    if (!values.some(item => item.value)) return drawEmptyChart(ctx, width, height);
    const max = Math.max(1, ...values.map(item => item.value || 0));
    const left = 46;
    const top = 54;
    const bottom = height - 72;
    const barGap = 5;
    const barW = Math.max(8, (width - left - 28) / values.length - barGap);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(width - 18, bottom);
    ctx.stroke();
    values.forEach((item, index) => {
      if (!item.value) return;
      const x = left + index * (barW + barGap);
      const h = Math.max(6, (item.value / max) * (bottom - top));
      const y = bottom - h;
      ctx.fillStyle = heatColor(item.value, max);
      roundRect(ctx, x, y, barW, h, 6);
      ctx.fill();
      if (index % 3 === 0 || index === values.length - 1) {
        ctx.fillStyle = '#667085';
        ctx.font = '800 10px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + barW / 2, bottom + 18);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(item.label, 0, 0);
        ctx.restore();
      }
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = '#667085';
    ctx.font = '800 11px "Noto Sans JP", sans-serif';
    ctx.fillText(t('averageOrderHint'), left, height - 18);
  }

  function drawBlockGroupAverageChart(records) {
    const rows = ['low', 'mid', 'high'].map(group => {
      const values = records.flatMap(record => record.entries.filter(entry => getRangeGroup(entry.range) === group).map(entry => entry.order));
      return { label: getRangeGroupLabel(group), value: average(values) || 0 };
    });
    drawSimpleBars(els.myBucketCanvas, rows, t('blockGroupAverageTitle'), {
      lowerIsBetter: true,
      valueFormatter: value => formatAvgOrder(value),
      maxLabelLength: 14
    });
  }

  function drawBlockTimeHeatmap(canvas, records, mode, title) {
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    drawChartTitle(ctx, title);
    if (!records.length) return drawEmptyChart(ctx, width, height);
    const cols = mode === 'month'
      ? Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
      : Array.from({ length: 31 }, (_, i) => String(i + 1));
    const groups = ['low', 'mid', 'high'];
    const matrix = {};
    cols.forEach(col => { matrix[col] = { low: [], mid: [], high: [] }; });
    records.forEach(record => {
      if (!record.date) return;
      const col = mode === 'month' ? String(record.date.getMonth() + 1).padStart(2, '0') : String(record.date.getDate());
      record.entries.forEach(entry => matrix[col]?.[getRangeGroup(entry.range)]?.push(entry.order));
    });
    const maxAvg = Math.max(1, ...cols.flatMap(col => groups.map(group => average(matrix[col][group]) || 0)));
    const left = 82;
    const top = 54;
    const rowH = 44;
    const cellW = (width - left - 24) / cols.length;
    groups.forEach((group, row) => {
      const y = top + row * rowH;
      ctx.fillStyle = '#667085';
      ctx.font = '800 12px "Noto Sans JP", sans-serif';
      ctx.fillText(getRangeGroupLabel(group), 16, y + 27);
      cols.forEach((col, index) => {
        const avg = average(matrix[col][group]);
        ctx.fillStyle = heatColor(avg, maxAvg);
        roundRect(ctx, left + index * cellW, y, Math.max(5, cellW - 3), rowH - 8, 5);
        ctx.fill();
      });
    });
    ctx.fillStyle = '#667085';
    ctx.font = '800 10px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    cols.forEach((col, index) => {
      if (mode === 'day' && index % 5 !== 0 && index !== cols.length - 1) return;
      ctx.fillText(String(Number(col)), left + index * cellW + cellW / 2, height - 22);
    });
    ctx.textAlign = 'left';
  }

  function drawGapHistogram(records) {
    if (!els.gapHistogramCanvas) return;
    const buckets = { adjacent: 0, twoThree: 0, fourFive: 0, sixPlus: 0 };
    records.forEach(record => {
      getRecordGapBuckets(record).forEach(bucket => { buckets[bucket] += 1; });
    });
    drawSimpleBars(els.gapHistogramCanvas, [
      { label: t('gapAdjacent'), value: buckets.adjacent },
      { label: t('gapTwoThree'), value: buckets.twoThree },
      { label: t('gapFourFive'), value: buckets.fourFive },
      { label: t('gapSixPlus'), value: buckets.sixPlus }
    ], t('gapHistogramTitle'));
  }

  function drawStreakChart(records) {
    if (!els.streakCanvas) return;
    const totals = { two: 0, three: 0, four: 0 };
    records.forEach(record => {
      const streaks = countRecordStreaks(record);
      totals.two += streaks.two;
      totals.three += streaks.three;
      totals.four += streaks.four;
    });
    drawSimpleBars(els.streakCanvas, [
      { label: t('streakTwo'), value: totals.two },
      { label: t('streakThree'), value: totals.three },
      { label: t('streakFourPlus'), value: totals.four }
    ], t('streakTitle'));
  }

  function drawSelfLandingChart(mineRecords, allRecords) {
    if (!els.myHistoryCanvas) return;
    const canvas = els.myHistoryCanvas;
    const ctx = setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    drawChartTitle(ctx, t('selfLandingTitle'));
    const selfEntries = mineRecords.flatMap(record => record.entries.filter(entry => entry.isSelf));
    if (!selfEntries.length) return drawEmptyChart(ctx, width, height);
    const allSelfEntries = allRecords.flatMap(record => record.entries.filter(entry => entry.isSelf));
    const comparisonEntries = allSelfEntries.length ? allSelfEntries : allRecords.flatMap(record => record.entries);
    const selfAvg = average(selfEntries.map(entry => entry.order));
    const allAvg = average(comparisonEntries.map(entry => entry.order));
    const topRange = getTopRangeLabel(selfEntries);
    const cards = [
      [t('selfAverageLabel'), formatAvgOrder(selfAvg)],
      [t('communityAverageLabel'), formatAvgOrder(allAvg)],
      [t('selfTopRangeLabel'), topRange || '-']
    ];
    cards.forEach(([label, value], index) => {
      const x = 22 + index * ((width - 58) / 3);
      const cardW = (width - 78) / 3;
      ctx.fillStyle = index === 0 ? '#fff2f8' : '#f8fbff';
      roundRect(ctx, x, 52, cardW, 72, 14);
      ctx.fill();
      ctx.fillStyle = '#667085';
      ctx.font = '800 11px "Noto Sans JP", sans-serif';
      ctx.fillText(label, x + 14, 80);
      ctx.fillStyle = '#1b2330';
      ctx.font = '900 21px "Noto Sans JP", sans-serif';
      ctx.fillText(shortenText(value, 12), x + 14, 110);
    });

    const rangeCounts = countEntriesByRange(selfEntries).slice(0, 6);
    const maxCount = Math.max(1, ...rangeCounts.map(item => item.value));
    ctx.fillStyle = '#1b2330';
    ctx.font = '900 13px "Noto Sans JP", sans-serif';
    ctx.fillText(t('selfFrequentRangeTitle'), 22, 154);
    rangeCounts.forEach((item, index) => {
      const y = 174 + index * 22;
      const w = (item.value / maxCount) * 210;
      ctx.fillStyle = '#ff8ec4';
      roundRect(ctx, 86, y - 13, Math.max(8, w), 14, 7);
      ctx.fill();
      ctx.fillStyle = '#667085';
      ctx.font = '800 11px "Noto Sans JP", sans-serif';
      ctx.fillText(item.label, 22, y);
      ctx.fillStyle = '#1b2330';
      ctx.fillText(String(item.value), 304, y);
    });

    const mineRates = getGroupRates(selfEntries);
    const allRates = getGroupRates(comparisonEntries);
    ctx.fillStyle = '#1b2330';
    ctx.font = '900 13px "Noto Sans JP", sans-serif';
    ctx.fillText(t('selfVsAllTitle'), 360, 154);
    ['low', 'mid', 'high'].forEach((group, index) => {
      const y = 180 + index * 44;
      ctx.fillStyle = '#667085';
      ctx.font = '800 11px "Noto Sans JP", sans-serif';
      ctx.fillText(getRangeGroupLabel(group), 360, y);
      drawRateBar(ctx, 430, y - 14, 170, mineRates[group], '#ff007f');
      drawRateBar(ctx, 430, y + 4, 170, allRates[group], '#00a7c2');
      ctx.fillStyle = '#1b2330';
      ctx.fillText(formatPercent(mineRates[group]), 608, y - 2);
      ctx.fillText(formatPercent(allRates[group]), 608, y + 16);
    });
  }

  function drawRateBar(ctx, x, y, width, rate, color) {
    ctx.fillStyle = '#eef2f7';
    roundRect(ctx, x, y, width, 11, 6);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, x, y, Math.max(3, width * rate), 11, 6);
    ctx.fill();
  }

  function drawDistributionChart(records) {
    if (!els.distributionCanvas) return;
    const canvas = els.distributionCanvas;
    const ctx = setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    const ranges = getLotteryRanges();
    drawChartTitle(ctx, t('rangeOrderHeatmapTitle'));
    if (!records.length) return drawEmptyChart(ctx, width, height);

    const maxOrder = Math.max(1, ...records.flatMap(record => record.entries.map(entry => entry.order)));
    const rowCount = Math.min(Math.max(maxOrder, 1), ranges.length);
    const matrix = Array.from({ length: rowCount }, () => Array.from({ length: ranges.length }, () => 0));
    records.forEach(record => {
      record.entries.forEach(entry => {
        if (entry.order >= 1 && entry.order <= rowCount && entry.rangeIndex >= 0) {
          matrix[entry.order - 1][entry.rangeIndex] += 1;
        }
      });
    });
    const maxCount = Math.max(1, ...matrix.flat());
    const left = 72;
    const top = 62;
    const right = 28;
    const bottom = 88;
    const cellW = (width - left - right) / ranges.length;
    const cellH = (height - top - bottom) / rowCount;

    ctx.fillStyle = '#667085';
    ctx.font = '800 12px "Noto Sans JP", sans-serif';
    ctx.fillText(t('calledOrderAxis'), 18, top - 12);
    ctx.textAlign = 'right';
    for (let row = 0; row < rowCount; row += 1) {
      const y = top + row * cellH;
      if (row === 0 || (row + 1) % 5 === 0 || row === rowCount - 1) {
        ctx.fillText(`${row + 1}`, left - 10, y + cellH * .65);
      }
      for (let col = 0; col < ranges.length; col += 1) {
        const x = left + col * cellW;
        ctx.fillStyle = frequencyHeatColor(matrix[row][col], maxCount);
        ctx.fillRect(x + 1, y + 1, Math.max(1, cellW - 2), Math.max(1, cellH - 2));
      }
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#667085';
    ranges.forEach((range, index) => {
      if (index % 2 !== 0 && index !== ranges.length - 1) return;
      const x = left + index * cellW + cellW / 2;
      ctx.save();
      ctx.translate(x, height - 58);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(range.label, 0, 0);
      ctx.restore();
    });
    ctx.textAlign = 'left';
    ctx.fillText(t('rangeOrderAxis'), left, height - 18);

    const legendX = width - 220;
    const legendY = 26;
    for (let i = 0; i < 80; i += 1) {
      ctx.fillStyle = frequencyHeatColor(i + 1, 80);
      ctx.fillRect(legendX + i * 2, legendY, 2, 10);
    }
    ctx.fillStyle = '#667085';
    ctx.font = '800 11px "Noto Sans JP", sans-serif';
    ctx.fillText(t('heatLow'), legendX, legendY + 26);
    ctx.textAlign = 'right';
    ctx.fillText(t('heatHigh'), legendX + 160, legendY + 26);
    ctx.textAlign = 'left';
  }

  function getRecordGapBuckets(record) {
    const ordered = record.entries.slice().sort((a, b) => a.order - b.order);
    const buckets = [];
    for (let i = 1; i < ordered.length; i += 1) {
      const diff = Math.abs(ordered[i].rangeIndex - ordered[i - 1].rangeIndex);
      if (diff === 1) buckets.push('adjacent');
      else if (diff >= 2 && diff <= 3) buckets.push('twoThree');
      else if (diff >= 4 && diff <= 5) buckets.push('fourFive');
      else if (diff >= 6) buckets.push('sixPlus');
    }
    return buckets;
  }

  function countRecordStreaks(record) {
    const ordered = record.entries.slice().sort((a, b) => a.order - b.order);
    let current = 1;
    const totals = { two: 0, three: 0, four: 0 };
    const flush = () => {
      if (current === 2) totals.two += 1;
      if (current === 3) totals.three += 1;
      if (current >= 4) totals.four += 1;
      current = 1;
    };
    for (let i = 1; i < ordered.length; i += 1) {
      if (Math.abs(ordered[i].rangeIndex - ordered[i - 1].rangeIndex) === 1) current += 1;
      else flush();
    }
    flush();
    return totals;
  }

  function countEntriesByRange(entries) {
    const counts = {};
    entries.forEach(entry => {
      const label = getRangeLabel(entry.range);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }

  function getTopRangeLabel(entries) {
    return countEntriesByRange(entries)[0]?.label || '';
  }

  function getGroupRates(entries) {
    const totals = { low: 0, mid: 0, high: 0 };
    entries.forEach(entry => { totals[getRangeGroup(entry.range)] += 1; });
    const total = Math.max(1, entries.length);
    return {
      low: totals.low / total,
      mid: totals.mid / total,
      high: totals.high / total
    };
  }

  function drawSimpleBars(canvas, rows, title, options = {}) {
    if (!canvas) return;
    const settings = typeof options === 'boolean' ? { lowerIsBetter: options } : options;
    const ctx = setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    drawChartTitle(ctx, title);
    const filtered = rows.filter(row => Number.isFinite(row.value) && row.value > 0);
    if (!filtered.length) return drawEmptyChart(ctx, width, height);
    const max = Math.max(1, ...filtered.map(row => row.value));
    const left = 42;
    const bottom = height - 44;
    const top = 54;
    const barW = Math.max(24, (width - left - 30) / filtered.length - 12);
    filtered.forEach((row, index) => {
      const x = left + index * (barW + 12);
      const h = Math.max(8, (row.value / max) * (bottom - top));
      const y = bottom - h;
      const grad = ctx.createLinearGradient(0, y, 0, bottom);
      grad.addColorStop(0, settings.lowerIsBetter ? heatColor(row.value, max) : '#ff007f');
      grad.addColorStop(1, settings.lowerIsBetter ? '#e9f8fb' : '#ff8ec4');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW, h, 9);
      ctx.fill();
      ctx.fillStyle = '#1b2330';
      ctx.font = '800 12px "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      const displayValue = settings.valueFormatter ? settings.valueFormatter(row.value) : (Number.isInteger(row.value) ? row.value : row.value.toFixed(1));
      ctx.fillText(displayValue, x + barW / 2, y - 8);
      ctx.fillText(shortenText(row.label, settings.maxLabelLength || 9), x + barW / 2, bottom + 18);
      ctx.textAlign = 'left';
    });
  }

  function getLotteryRangeIndex(range) {
    return getLotteryRanges().findIndex(item => item.key === range);
  }

  function getRangeLabel(range) {
    return getLotteryRanges().find(item => item.key === range)?.label || String(range || '');
  }

  function getRangeGroup(range) {
    const start = parseRangeStart(range);
    if (start < 90) return 'low';
    if (start < 170) return 'mid';
    return 'high';
  }

  function getRangeGroupLabel(group) {
    if (group === 'low') return t('distLowNo');
    if (group === 'mid') return t('distMidNo');
    return t('distHighNo');
  }

  function average(values) {
    const valid = values.map(value => Number(value)).filter(value => Number.isFinite(value));
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
  }

  function formatAvgOrder(value) {
    return value ? `${value.toFixed(1)}${t('tourUnit')}` : '-';
  }

  function formatPercent(value) {
    return `${Math.round((value || 0) * 100)}%`;
  }

  function frequencyHeatColor(value, maxValue) {
    if (!value) return '#f3f4f6';
    const ratio = Math.min(1, value / Math.max(maxValue, 1));
    const red = Math.round(255 - ratio * 12);
    const green = Math.round(244 - ratio * 174);
    const blue = Math.round(249 - ratio * 108);
    return `rgb(${red}, ${green}, ${blue})`;
  }

  function heatColor(value, maxAvg) {
    if (!value) return '#f3f4f6';
    const good = 1 - (value - 1) / Math.max(maxAvg - 1, 1);
    const red = Math.round(255 - good * 8);
    const green = Math.round(238 - good * 120);
    const blue = Math.round(246 + good * 5);
    return `rgb(${red}, ${green}, ${blue})`;
  }

  function shortenText(value, max) {
    const text = String(value || '');
    return text.length > max ? `${text.slice(0, Math.max(1, max - 3))}...` : text;
  }

  function formatCloudRecordLabel(record) {
    const date = record.event_date || formatSavedAt(record.updated_at || record.created_at);
    const title = record.performance_title || t('performance');
    const seat = record.seat_label || t('noSelection');
    return `${date} - ${title} - ${seat}`;
  }

  function formatMessage(key, replacements) {
    return Object.entries(replacements).reduce((text, [name, value]) => text.split(`{${name}}`).join(value), t(key));
  }

  function formatSavedAt(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat(state.lang, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    } catch {
      return String(value).slice(0, 16).replace('T', ' ');
    }
  }

  function extractDateOnly(value) {
    const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  }

  function toIntOrNull(value) {
    const clean = String(value || '').trim();
    if (!/^\d+$/.test(clean)) return null;
    const parsed = Number.parseInt(clean, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseRangeStart(value) {
    const match = String(value || '').match(/^(\d+)/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function isPerformanceIdError(error) {
    return /performance_id|foreign key|seat_memo_records_performance_id_fkey/i.test(error.message || '');
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
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && window.innerWidth <= 768) || window.matchMedia('(max-width: 768px)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
    return isMobile || isIOS || isSafari;
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
    const image = await loadImage('assets/seatmap.svg?v=3.5.0');
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
    const labelW = ['en', 'id', 'th'].includes(state.lang) ? 108 : 82;
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
    const panelW = 238;
    const accent = '#ff007f';

    const infoLines = [
      { text: performance.label, font: '800 11px "Noto Sans JP", sans-serif', color: accent, gap: 17 },
      ...(eventDate ? [{ text: eventDate, font: '800 11px "Noto Sans JP", sans-serif', color: '#1b2330', gap: 17 }] : []),
      { text: seatLabel, font: '900 13px "Noto Sans JP", sans-serif', color: '#1b2330', gap: 17 },
      ...(state.entryNumber ? [{ text: state.entryNumber, font: '700 10px "Noto Sans JP", sans-serif', color: '#1b2330', gap: 15 }] : []),
      ...(state.tourRound ? [{ text: formatTourRound(state.tourRound), font: '700 10px "Noto Sans JP", sans-serif', color: '#1b2330', gap: 15 }] : []),
      ...(state.displayName ? [{ text: state.displayName, font: '700 10px "Noto Sans JP", sans-serif', color: '#7F8C8D', gap: 15 }] : [])
    ];

    const panelH = 48 + infoLines.reduce((sum, line) => sum + line.gap, 0);
    const panelY = Math.max(482, 632 - panelH);

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

    const lines = [];
    let lineY = panelY + 27;
    lines.push({ text: t('exportTitle'), font: '900 16px "Noto Sans JP", sans-serif', color: '#1b2330', x: panelX + 25, y: lineY });
    lineY += 21;

    infoLines.forEach(line => {
      lines.push({ text: line.text, font: line.font, color: line.color, x: panelX + 25, y: lineY });
      lineY += line.gap;
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    lines.forEach(line => {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, line.x, line.y, panelW - 38);
    });
    ctx.restore();
  }

  function formatTourRound(value) {
    if (!value) return '';
    const n = String(value);
    if (state.lang === 'ko') return `${n}번째 순번`;
    if (state.lang === 'th') return `รอบที่ ${n}`;
    if (state.lang === 'id') return `Putaran ${n}`;
    if (state.lang === 'en') return `Round ${n}`;
    return `${n}巡目`;
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
