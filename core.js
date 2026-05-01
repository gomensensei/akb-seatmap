/**
 * Gomensensei Core JS - UI, Performance & Canvas Engine
 */

// ==========================================
// 1. 全域觸控水波紋 (Global Ripple)
// ==========================================
function createGlobalRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'global-ripple';
    ripple.style.left = `${x}px`; ripple.style.top = `${y}px`;
    ripple.style.width = '20px'; ripple.style.height = '20px';
    ripple.style.marginLeft = '-10px'; ripple.style.marginTop = '-10px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}
document.addEventListener('mousedown', (e) => createGlobalRipple(e.clientX, e.clientY));
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) createGlobalRipple(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

// ==========================================
// 2. 空間玻璃 3D 隨動運算 (Mouse Tracking)
// ==========================================
function initSpatialGlass() {
    document.querySelectorAll('.apple-glass-3d').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; const y = e.clientY - rect.top;
            const centerX = rect.width / 2; const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -10; 
            const rotateY = ((x - centerX) / centerX) * 10;
            
            card.style.setProperty('--rx', `${rotateX}deg`); card.style.setProperty('--ry', `${rotateY}deg`);
            card.style.setProperty('--glare-x', `${x}px`); card.style.setProperty('--glare-y', `${y}px`);
            card.style.setProperty('--glare-op', '1');
        });
        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
            card.style.setProperty('--glare-op', '0');
            card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
        });
        card.addEventListener('mouseenter', () => { card.style.transition = 'transform 0.1s ease-out'; });
    });
}

// ==========================================
// 3. UX 細節：捲動隱藏提示 Bar (Scroll Hide)
// ==========================================
function initScrollHide() {
    const hints = document.querySelectorAll('.drawer-hint');
    if (hints.length === 0) return;
    const hideHint = () => { hints.forEach(h => h.classList.add('fade-out')); };
    // 監聽全局滾動與手機滑動，一旦觸發就隱藏
    window.addEventListener('scroll', hideHint, { passive: true, once: true });
    window.addEventListener('touchmove', hideHint, { passive: true, once: true });
}

// ==========================================
// 4. 效能防抖引擎 (Debounce) & 自動綁定 Slider
// ==========================================
function debounce(func, wait = 150) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
// 自動為所有 type="range" 綁定防抖 (防止狂畫 Canvas)
function initSliderDebounce(callback) {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('input', debounce((e) => { callback(e); }, 100));
    });
}

// ==========================================
// 5. Info-Graphic Canvas 排版引擎 (防疊字絕對置中)
// ==========================================
/**
 * 繪製垂直置中且防疊字的序列文本
 * @param {CanvasRenderingContext2D} ctx - Canvas Context
 * @param {number} startX - 中心 X 座標
 * @param {number} startY - 中心 Y 座標
 * @param {Array} textArray - [{text: "文字", font: "...", color: "...", h: 高度, gap: 間距}]
 */
function drawInfoGraphicText(ctx, startX, startY, textArray) {
    ctx.textAlign = 'center'; // 長期置中設定
    ctx.textBaseline = 'top';
    
    // 計算總高度
    const totalHeight = textArray.reduce((sum, el) => sum + el.h + el.gap, 0);
    // 算出起始 Y 座標，保證整體絕對垂直置中
    let currentY = startY - (totalHeight / 2);

    // 依次繪製，絕不重疊
    textArray.forEach(el => {
        ctx.font = el.font;
        ctx.fillStyle = el.color;
        ctx.fillText(el.text, startX, currentY);
        currentY += el.h + el.gap; // 往下推
    });
}

// 初始化所有 Core 功能
document.addEventListener('DOMContentLoaded', () => {
    initSpatialGlass();
    initScrollHide();
});

// ==========================================
// 6. 動態彈性資源池 (Dynamic Resource Pooling)
// ==========================================
/**
 * 靜默加載器：無間斷重試，確保陣列中的圖片 100% 可用才標記為載入成功
 * @param {Array} dataList - 包含圖片 URL 的資料陣列
 * @param {string} urlKey - 圖片 URL 的屬性名稱 (如 'image')
 * @param {string} flagKey - 標記成功狀態的屬性名稱 (如 'imgLoaded')
 */
function initSilentPreloader(dataList, urlKey = 'image', flagKey = 'imgLoaded') {
    dataList.forEach(item => {
        const tryLoad = () => {
            if (item[flagKey]) return;
            const img = new Image();
            img.onload = () => { item[flagKey] = true; };
            img.onerror = () => setTimeout(tryLoad, 4000); // 失敗則 4 秒後靜默重試
            img.src = item[urlKey];
        };
        tryLoad();
    });
}
// ==========================================
// 7. 幀率補償迴圈引擎 (Delta Time Loop Engine)
// ==========================================
/**
 * 標準化 RequestAnimationFrame，確保 144Hz 與 60Hz 螢幕動畫速度一致
 */
class DeltaTimeLoop {
    constructor(updateFn) {
        this.updateFn = updateFn;
        this.lastTime = 0;
        this.animFrame = null;
        this.isActive = false;
    }
    start() {
        this.isActive = true;
        this.lastTime = performance.now();
        const loop = (now) => {
            if (!this.isActive) return;
            const dt = now - this.lastTime;
            this.lastTime = now;
            // 傳入時間差比例 (以 60fps = 16.66ms 為基準)
            this.updateFn(dt / 16.66, dt, now);
            this.animFrame = requestAnimationFrame(loop);
        };
        this.animFrame = requestAnimationFrame(loop);
    }
    stop() {
        this.isActive = false;
        cancelAnimationFrame(this.animFrame);
    }
}

// ==========================================
// 8. Retina 高清畫布封裝 (Hi-DPI Canvas Wrapper)
// ==========================================
function initHiDPICanvas(canvas, width, height, resolutionMultiplier = 2) {
    const ctx = canvas.getContext('2d');
    canvas.width = width * resolutionMultiplier;
    canvas.height = height * resolutionMultiplier;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(resolutionMultiplier, resolutionMultiplier);
    return ctx;
}


// ==========================================
// 9. 統一的檔案下載引擎 (Export Hub)
// ==========================================
function triggerDownload(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

