/**
 * extension/edit/demoTour.js
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive Demo / Feature Tour for AntCapture (edit.html).
 *
 * Architecture:
 * - HTML structure is built into edit.html for speed, clarity, and inspectability.
 * - CSS styles are separated into demoTour.css.
 * - This file contains purely the orchestration, step transitions, event routing,
 *   and spotlight positioning logic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ACTIVE_VARIANT, UPGRADE_MODAL_CONFIG } from '../demoVariants.js';

// ── Tour "seen" state — namespaced by userId so the same Google account
// only ever sees the tour once, even if localStorage is cleared.
// Anonymous / pre-auth uses the variant ID alone as a fallback key.
function storageKey(userId) {
  const userPart = userId ? `_u${userId}` : '';
  return `demo_seen_${ACTIVE_VARIANT.id}${userPart}`;
}

// ── Check: should we show the demo? ────────────────────────────────────────
function shouldShowDemo(userId, isAdmin) {
  if (!ACTIVE_VARIANT) return false;
  // Admin users never get the auto-tour — they use the Tour button instead.
  if (isAdmin) return false;
  // Cloud subscribers skip the upgrade-push demo.
  if (window.__antCloud === true) return false;
  // Already seen on this account?
  if (ACTIVE_VARIANT.showOnceOnly && localStorage.getItem(storageKey(userId))) return false;
  return true;
}

function markDemoSeen(userId) {
  if (ACTIVE_VARIANT.showOnceOnly) {
    localStorage.setItem(storageKey(userId), '1');
    // Also mark anonymous key so we don't show again before auth resolves
    localStorage.setItem(storageKey(null), '1');
  }
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
// NOTE: tooltip is position:fixed — all coordinates are viewport-relative,
// which is exactly what getBoundingClientRect() returns.
function positionTooltip(tooltip, rect) {
  tooltip.style.transform = '';

  if (!rect) {
    // No target — center the tooltip in the viewport
    tooltip.style.top    = '50%';
    tooltip.style.left   = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    return;
  }

  const TH = tooltip.offsetHeight || 200;
  const TW = tooltip.offsetWidth  || 300;
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const MARGIN = 16;

  // Preferred: dock to the LEFT of the target (sidebar is on the right)
  let left = rect.left - TW - 24;
  let top  = rect.top + (rect.height / 2) - (TH / 2);

  if (left < MARGIN) {
    // Not enough room on the left — try ABOVE the target
    left = rect.left + (rect.width / 2) - (TW / 2);
    top  = rect.top - TH - 16;

    if (top < MARGIN) {
      // Not enough room above — fall BELOW
      top = rect.bottom + 16;
    }
    if (top + TH > VH - MARGIN) {
      // Still doesn't fit — center vertically
      top = (VH - TH) / 2;
    }
  }

  // Clamp within viewport
  left = Math.max(MARGIN, Math.min(left, VW - TW - MARGIN));
  top  = Math.max(MARGIN, Math.min(top,  VH - TH - MARGIN));

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top  = `${Math.round(top)}px`;
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
  constructor(variant, userId = null) {
    this.variant   = variant;
    this.userId    = userId;
    this.steps     = variant.steps;
    this.current   = 0;
    this.backdrop  = document.getElementById('__demo-backdrop');
    this.tooltip   = document.getElementById('__demo-tooltip');
    this.pulseRing = document.getElementById('__demo-pulse-ring');
    this._clickHandler = null;
  }

  start() {
    this._initDOM();
    this._renderStep(0);
  }

  _initDOM() {
    // Ensure all references are retrieved (if created dynamically or existing in HTML)
    this.backdrop  = document.getElementById('__demo-backdrop');
    this.tooltip   = document.getElementById('__demo-tooltip');
    this.pulseRing = document.getElementById('__demo-pulse-ring');

    if (this.backdrop) {
      this.backdrop.style.display = 'block';
      this.backdrop.classList.add('active');
    }
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
    if (this.backdrop) {
      const svg = this.backdrop.querySelector('#__demo-svg');
      if (svg) svg.outerHTML = buildSpotlightSvg(rect, pad);
      else      this.backdrop.innerHTML = buildSpotlightSvg(rect, pad);
    }

    // Pulse ring
    if (this.pulseRing) {
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
    }

    if (step.action === 'show_upgrade_modal') {
      this._destroyTour();
      this._showUpgradeModal();
      return;
    }

    // Render tooltip content
    if (this.tooltip) {
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
      requestAnimationFrame(() => positionTooltip(this.tooltip, rect));

      // Wire skip
      document.getElementById('__demo-skip')?.addEventListener('click', () => this._finish());
    }

    // Action routing
    if (step.action === 'click_to_advance' && target) {
      this._cleanupClickHandler();
      this._clickHandler = () => this._advanceAfterAction(index, step);
      target.addEventListener('click', this._clickHandler, { once: true });
      document.getElementById('__demo-next')?.addEventListener('click', () => {
        target.removeEventListener('click', this._clickHandler);
        this._advanceAfterAction(index, step);
      });
    } else if (step.action === 'auto_advance') {
      document.getElementById('__demo-next')?.addEventListener('click', () => this._renderStep(index + 1));
      setTimeout(() => this._renderStep(index + 1), step.durationMs ?? 2000);
    } else {
      document.getElementById('__demo-next')?.addEventListener('click', () => this._advanceAfterAction(index, step));
    }
  }

  async _advanceAfterAction(index, step) {
    if (step.action === 'simulate_progress' && this.tooltip) {
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
      this.steps.forEach(s => {
        const t = s.targetId ? document.getElementById(s.targetId) : null;
        if (t) t.removeEventListener('click', this._clickHandler);
      });
      this._clickHandler = null;
    }
  }

  _destroyTour() {
    this._cleanupClickHandler();
    if (this.backdrop)  { this.backdrop.style.display = 'none'; this.backdrop.classList.remove('active'); }
    if (this.tooltip)   { this.tooltip.style.display = 'none'; }
    if (this.pulseRing) { this.pulseRing.style.display = 'none'; }
    const fake = document.getElementById('__demo-fake-progress');
    if (fake) fake.classList.remove('visible');
  }

  _finish() {
    markDemoSeen(this.userId);
    this._destroyTour();
    const modal = document.getElementById('__demo-upgrade-modal');
    if (modal) modal.style.display = 'none';
  }

  _showUpgradeModal() {
    markDemoSeen(this.userId);
    const cfg = UPGRADE_MODAL_CONFIG;
    const modal = document.getElementById('__demo-upgrade-modal');
    if (!modal) return;

    modal.innerHTML = `
      <div id="__demo-upgrade-card">
        <div id="__demo-upgrade-icon">☁️</div>
        <div id="__demo-upgrade-headline">${cfg.headline}</div>
        <div id="__demo-upgrade-subtext">${cfg.subtext}</div>
        <button id="__demo-upgrade-cta">${cfg.primaryCta}</button>
        <button id="__demo-upgrade-skip">${cfg.secondaryCta}</button>
      </div>
    `;
    modal.style.display = 'flex';

    document.getElementById('__demo-upgrade-cta')?.addEventListener('click', () => {
      window.open(cfg.upgradeUrl(), '_blank');
      modal.style.display = 'none';
    });
    document.getElementById('__demo-upgrade-skip')?.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
}

// ── Entry Point ────────────────────────────────────────────────────────────────
export function replayDemoTour(variant = ACTIVE_VARIANT, userId = null) {
  console.info('[AntCapture Tour] Launching tour replay locally in extension');
  const modal = document.getElementById('__demo-upgrade-modal');
  if (modal) modal.style.display = 'none';
  new DemoTour(variant, userId).start();
}

/**
 * initDemoTour()
 *
 * Fully local extension tour engine.
 * Does NOT require opening or visiting the web dashboard.
 *
 * Rules:
 *   - Admin: Has "Tour" buttons in the sidebar to replay anytime on demand.
 *   - New user: Shown once per Google user ID.
 *   - Local-only: All UI, SVG spotlights, and actions execute directly in edit.html.
 */
export function initDemoTour() {
  window.__replayExtensionDemo = () => replayDemoTour(ACTIVE_VARIANT);
  window.addEventListener('antcapture:replay-demo-tour', () => replayDemoTour(ACTIVE_VARIANT));

  let decided = false;

  function decide(userId, isAdmin) {
    if (decided) return;
    decided = true;
    console.info(`[AntCapture Tour] Deciding tour visibility: userId=${userId || 'anonymous'}, isAdmin=${isAdmin}`);
    if (!shouldShowDemo(userId, isAdmin)) {
      console.info('[AntCapture Tour] Tour auto-launch skipped per criteria (already seen, cloud user, or admin).');
      return;
    }
    console.info('[AntCapture Tour] Auto-launching tour for first-time user.');
    requestAnimationFrame(() => {
      setTimeout(() => new DemoTour(ACTIVE_VARIANT, userId).start(), 300);
    });
  }

  // Primary trigger: dispatched locally by edit.js as soon as storage loads
  window.addEventListener('antcapture:user-ready', (e) => {
    const { userId, isAdmin } = e.detail || {};
    decide(userId || null, isAdmin || false);
  }, { once: true });

  // Fallback: if user-ready event hasn't fired in 1.5s (e.g. storage delayed), decide locally
  setTimeout(() => {
    if (!decided) {
      console.info('[AntCapture Tour] Fallback timer triggered local tour decision.');
      decide(null, false);
    }
  }, 1500);
}
