/**
 * extension/edit/demoTour.js
 *
 * ──────────────────────────────────────────────────────────────────
 * ISOLATED DEMO TOUR OVERLAY
 *
 * This module is 100% self-contained. It reads from demoVariants.js
 * and renders an overlay ON TOP of the existing edit.html UI.
 * It does NOT modify, import, or depend on edit.js in any way.
 *
 * Zero backend cost — all animations and "uploads" are simulated
 * locally using JS timers. Nothing hits the server.
 * ──────────────────────────────────────────────────────────────────
 */

import { ACTIVE_VARIANT, UPGRADE_MODAL_CONFIG } from '../demoVariants.js';

const STORAGE_KEY = `demo_seen_${ACTIVE_VARIANT.id}`;

// ── Check: should we show the demo? ───────────────────────────────────────────
function shouldShowDemo() {
  if (!ACTIVE_VARIANT) return false;
  // Check the cloud entitlement injected by background.js (if available)
  // If the user already has cloud access, never show the demo.
  if (window.__antCloud === true) return false;
  if (ACTIVE_VARIANT.showOnceOnly && localStorage.getItem(STORAGE_KEY)) return false;
  return true;
}

function markDemoSeen() {
  if (ACTIVE_VARIANT.showOnceOnly) {
    localStorage.setItem(STORAGE_KEY, '1');
  }
}

// ── Inject tour CSS once ───────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('__demo-tour-styles')) return;
  const style = document.createElement('style');
  style.id = '__demo-tour-styles';
  style.textContent = `
    /* ── Backdrop ─────────────────────────────────────────────── */
    #__demo-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9000;
      pointer-events: none;
      transition: opacity 0.35s ease;
    }
    #__demo-backdrop.active { pointer-events: auto; }

    /* ── Spotlight cutout via SVG overlay ────────────────────── */
    #__demo-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    /* ── Step tooltip bubble ──────────────────────────────────── */
    #__demo-tooltip {
      position: absolute;
      max-width: 280px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: 14px;
      padding: 18px 20px;
      box-shadow: 0 24px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.06);
      z-index: 9100;
      pointer-events: auto;
      animation: __demoFadeUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes __demoFadeUp {
      from { opacity: 0; transform: translateY(10px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }

    #__demo-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: linear-gradient(90deg, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    #__demo-title {
      color: #f1f5f9;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 6px;
      line-height: 1.3;
    }
    #__demo-desc {
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 14px;
    }

    /* ── Progress dots ────────────────────────────────────────── */
    #__demo-dots {
      display: flex;
      gap: 5px;
      margin-bottom: 12px;
    }
    .demo-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      transition: all 0.25s ease;
    }
    .demo-dot.active {
      width: 18px;
      border-radius: 4px;
      background: linear-gradient(90deg, #6366f1, #818cf8);
    }

    /* ── Action row ───────────────────────────────────────────── */
    #__demo-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    #__demo-skip {
      background: none;
      border: none;
      color: #475569;
      font-size: 11px;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
      transition: color 0.2s;
    }
    #__demo-skip:hover { color: #94a3b8; }
    #__demo-next {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      border: none;
      color: white;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-family: inherit;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 12px rgba(99,102,241,0.4);
    }
    #__demo-next:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(99,102,241,0.5);
    }

    /* ── Pulsing ring on target ───────────────────────────────── */
    #__demo-pulse-ring {
      position: absolute;
      border-radius: 10px;
      border: 2px solid rgba(99,102,241,0.8);
      box-shadow: 0 0 0 0 rgba(99,102,241,0.5);
      animation: __demoPulse 1.8s ease-out infinite;
      pointer-events: none;
      z-index: 9050;
    }
    @keyframes __demoPulse {
      0%   { box-shadow: 0 0 0 0   rgba(99,102,241,0.6); }
      70%  { box-shadow: 0 0 0 12px rgba(99,102,241,0);   }
      100% { box-shadow: 0 0 0 0   rgba(99,102,241,0);   }
    }

    /* ── Upgrade modal ────────────────────────────────────────── */
    #__demo-upgrade-modal {
      position: fixed;
      inset: 0;
      background: rgba(2,6,23,0.85);
      backdrop-filter: blur(10px);
      z-index: 9500;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: __demoFadeIn 0.4s ease both;
    }
    @keyframes __demoFadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    #__demo-upgrade-card {
      background: linear-gradient(160deg, #1e293b, #0f172a);
      border: 1px solid rgba(99,102,241,0.35);
      border-radius: 20px;
      padding: 36px 32px;
      max-width: 340px;
      width: 90%;
      text-align: center;
      box-shadow: 0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.1);
      animation: __demoScaleIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes __demoScaleIn {
      from { opacity: 0; transform: scale(0.9) translateY(16px); }
      to   { opacity: 1; transform: scale(1)   translateY(0);    }
    }
    #__demo-upgrade-icon {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(192,132,252,0.1));
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      font-size: 26px;
    }
    #__demo-upgrade-headline {
      color: #f1f5f9;
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 10px;
      line-height: 1.3;
    }
    #__demo-upgrade-subtext {
      color: #64748b;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    #__demo-upgrade-cta {
      width: 100%;
      padding: 13px 20px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      margin-bottom: 10px;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 6px 20px rgba(99,102,241,0.5);
      letter-spacing: 0.01em;
    }
    #__demo-upgrade-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(99,102,241,0.6);
    }
    #__demo-upgrade-skip {
      background: none;
      border: none;
      color: #475569;
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
      padding: 6px;
      transition: color 0.2s;
      width: 100%;
    }
    #__demo-upgrade-skip:hover { color: #64748b; }

    /* ── Simulated fake upload progress (for demo step) ─────── */
    #__demo-fake-progress {
      display: none;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
      padding: 10px 14px;
      background: rgba(99,102,241,0.06);
      border: 1px solid rgba(99,102,241,0.15);
      border-radius: 8px;
    }
    #__demo-fake-progress.visible { display: flex; }
    #__demo-fake-bar-track {
      height: 4px;
      background: rgba(99,102,241,0.15);
      border-radius: 4px;
      overflow: hidden;
    }
    #__demo-fake-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #6366f1, #a78bfa);
      border-radius: 4px;
      transition: width 0.15s linear;
    }
    #__demo-fake-bar-label {
      font-size: 11px;
      color: #818cf8;
      font-weight: 600;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

// ── Spotlight SVG ──────────────────────────────────────────────────────────────
function buildSpotlightSvg(rect, padding) {
  if (!rect) {
    // Full dim, no cutout
    return `<svg id="__demo-svg" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgba(2,6,23,0.75)"/>
    </svg>`;
  }
  const r = padding;
  const x = rect.left - r, y = rect.top - r;
  const w = rect.width + r * 2, h = rect.height + r * 2;
  const W = window.innerWidth, H = window.innerHeight;
  return `<svg id="__demo-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="__dmask">
        <rect width="100%" height="100%" fill="white"/>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="black"/>
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="rgba(2,6,23,0.75)" mask="url(#__dmask)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none"
          stroke="rgba(99,102,241,0.7)" stroke-width="1.5"/>
  </svg>`;
}

// ── Position tooltip near target ──────────────────────────────────────────────
function positionTooltip(tooltip, rect, padding) {
  if (!rect) {
    // Center it
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    return;
  }
  tooltip.style.transform = '';
  const TH = tooltip.offsetHeight || 180;
  const TW = tooltip.offsetWidth  || 280;
  let top = rect.bottom + padding + 16;
  let left = rect.left;
  if (top + TH > window.innerHeight - 16) top = rect.top - TH - 16;
  if (left + TW > window.innerWidth - 16)  left = window.innerWidth - TW - 16;
  if (left < 16) left = 16;
  tooltip.style.top  = `${top}px`;
  tooltip.style.left = `${left}px`;
}

// ── Fake upload simulation ─────────────────────────────────────────────────────
function runFakeProgress(durationMs = 1200) {
  return new Promise(resolve => {
    const fakeWrap = document.getElementById('__demo-fake-progress');
    const fill     = document.getElementById('__demo-fake-bar-fill');
    const label    = document.getElementById('__demo-fake-bar-label');

    if (!fakeWrap) { setTimeout(resolve, durationMs); return; }
    fakeWrap.classList.add('visible');

    let pct = 0;
    const interval = 40; // ms per tick
    const step = (100 / (durationMs / interval));

    const timer = setInterval(() => {
      pct = Math.min(pct + step, 100);
      if (fill)  fill.style.width = `${pct}%`;
      if (label) label.textContent = pct < 100 ? `Uploading… ${Math.round(pct)}%` : '✓ Synced to Cloud';

      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          fakeWrap.classList.remove('visible');
          resolve();
        }, 600);
      }
    }, interval);
  });
}

// ── Main Tour Class ────────────────────────────────────────────────────────────
class DemoTour {
  constructor(variant) {
    this.variant   = variant;
    this.steps     = variant.steps;
    this.current   = 0;
    this.backdrop  = null;
    this.tooltip   = null;
    this.pulseRing = null;
    this._clickHandler = null;
  }

  start() {
    injectStyles();
    this._buildDOM();
    this._renderStep(0);
  }

  _buildDOM() {
    // Backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.id = '__demo-backdrop';
    this.backdrop.innerHTML = buildSpotlightSvg(null, 0);

    // Pulse ring (reused, repositioned each step)
    this.pulseRing = document.createElement('div');
    this.pulseRing.id = '__demo-pulse-ring';
    this.pulseRing.style.display = 'none';

    // Fake progress (injected inside backdrop)
    const fakeProgress = document.createElement('div');
    fakeProgress.id = '__demo-fake-progress';
    fakeProgress.innerHTML = `
      <div id="__demo-fake-bar-track"><div id="__demo-fake-bar-fill"></div></div>
      <div id="__demo-fake-bar-label">Uploading… 0%</div>
    `;

    // Tooltip bubble
    this.tooltip = document.createElement('div');
    this.tooltip.id = '__demo-tooltip';

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.pulseRing);
    document.body.appendChild(fakeProgress);
    document.body.appendChild(this.tooltip);
    this.backdrop.classList.add('active');
  }

  _buildDots() {
    return this.steps
      .filter(s => s.action !== 'show_upgrade_modal')
      .map((_, i) => `<div class="demo-dot ${i === this.current ? 'active' : ''}"></div>`)
      .join('');
  }

  async _renderStep(index) {
    if (index >= this.steps.length) { this._finish(); return; }
    const step = this.steps[index];
    this.current = index;

    // Spotlight target
    const target = step.targetId ? document.getElementById(step.targetId) : null;
    const rect   = target ? target.getBoundingClientRect() : null;
    const pad    = step.spotlightPadding ?? 10;

    // Update SVG spotlight
    const svg = this.backdrop.querySelector('#__demo-svg');
    if (svg) svg.outerHTML = buildSpotlightSvg(rect, pad);
    else      this.backdrop.innerHTML = buildSpotlightSvg(rect, pad);

    // Pulse ring
    if (rect) {
      Object.assign(this.pulseRing.style, {
        display: 'block',
        top:     `${rect.top  - pad}px`,
        left:    `${rect.left - pad}px`,
        width:   `${rect.width  + pad * 2}px`,
        height:  `${rect.height + pad * 2}px`,
      });
    } else {
      this.pulseRing.style.display = 'none';
    }

    if (step.action === 'show_upgrade_modal') {
      this._destroyTour();
      this._showUpgradeModal();
      return;
    }

    // Render tooltip content
    this.tooltip.style.display = 'block';
    this.tooltip.innerHTML = `
      ${step.badge ? `<div id="__demo-badge">${step.badge}</div>` : ''}
      ${step.title ? `<div id="__demo-title">${step.title}</div>` : ''}
      ${step.description ? `<div id="__demo-desc">${step.description}</div>` : ''}
      <div id="__demo-dots">${this._buildDots()}</div>
      <div id="__demo-actions">
        ${this.variant.skippable ? '<button id="__demo-skip">Skip tour</button>' : '<span></span>'}
        <button id="__demo-next">${step.action === 'click_to_advance' ? 'Click the button ↓' : 'Continue →'}</button>
      </div>
    `;

    // Position tooltip
    requestAnimationFrame(() => positionTooltip(this.tooltip, rect, pad));

    // Wire skip
    document.getElementById('__demo-skip')?.addEventListener('click', () => this._finish());

    // Action routing
    if (step.action === 'click_to_advance' && target) {
      // Wait for the user to click the actual target element
      this._cleanupClickHandler();
      this._clickHandler = () => this._advanceAfterAction(index, step);
      target.addEventListener('click', this._clickHandler, { once: true });
      // Also allow next button as fallback
      document.getElementById('__demo-next')?.addEventListener('click', () => {
        target.removeEventListener('click', this._clickHandler);
        this._advanceAfterAction(index, step);
      });
    } else if (step.action === 'auto_advance') {
      document.getElementById('__demo-next')?.addEventListener('click', () => this._renderStep(index + 1));
      setTimeout(() => this._renderStep(index + 1), step.durationMs ?? 2000);
    } else {
      // 'simulate_progress' or default — next button advances
      document.getElementById('__demo-next')?.addEventListener('click', () => this._advanceAfterAction(index, step));
    }
  }

  async _advanceAfterAction(index, step) {
    if (step.action === 'simulate_progress') {
      this.tooltip.style.opacity = '0.4';
      this.tooltip.style.pointerEvents = 'none';
      await runFakeProgress(step.durationMs ?? 1200);
      this.tooltip.style.opacity = '1';
      this.tooltip.style.pointerEvents = 'auto';
    }
    this._renderStep(index + 1);
  }

  _cleanupClickHandler() {
    if (this._clickHandler) {
      // Remove from all possible targets
      this.steps.forEach(s => {
        const t = s.targetId ? document.getElementById(s.targetId) : null;
        if (t) t.removeEventListener('click', this._clickHandler);
      });
      this._clickHandler = null;
    }
  }

  _destroyTour() {
    this._cleanupClickHandler();
    this.backdrop?.remove();
    this.tooltip?.remove();
    this.pulseRing?.remove();
    document.getElementById('__demo-fake-progress')?.remove();
  }

  _finish() {
    markDemoSeen();
    this._destroyTour();
    document.getElementById('__demo-upgrade-modal')?.remove();
  }

  _showUpgradeModal() {
    markDemoSeen();
    const cfg = UPGRADE_MODAL_CONFIG;
    const modal = document.createElement('div');
    modal.id = '__demo-upgrade-modal';
    modal.innerHTML = `
      <div id="__demo-upgrade-card">
        <div id="__demo-upgrade-icon">☁️</div>
        <div id="__demo-upgrade-headline">${cfg.headline}</div>
        <div id="__demo-upgrade-subtext">${cfg.subtext}</div>
        <button id="__demo-upgrade-cta">${cfg.primaryCta}</button>
        <button id="__demo-upgrade-skip">${cfg.secondaryCta}</button>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('__demo-upgrade-cta')?.addEventListener('click', () => {
      window.open(cfg.upgradeUrl(), '_blank');
      modal.remove();
    });
    document.getElementById('__demo-upgrade-skip')?.addEventListener('click', () => {
      modal.remove();
    });
  }
}

// ── Entry Point ────────────────────────────────────────────────────────────────
export function initDemoTour() {
  if (!shouldShowDemo()) return;
  // Small delay so the main edit.js UI finishes rendering first
  setTimeout(() => new DemoTour(ACTIVE_VARIANT).start(), 1200);
}
