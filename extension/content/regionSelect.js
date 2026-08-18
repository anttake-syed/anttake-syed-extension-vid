// content/regionSelect.js — AntCapture
// Injects a full-screen drag-to-select overlay for region screenshots.
// Resolves via the chrome.runtime.sendMessage response callback.

let regionOverlay = null;
let shadowHost = null;

export function initRegionSelect() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'START_REGION_SELECT') {
      startRegionSelect(sendResponse);
      return true; // keep the message channel open for the async callback
    }
  });
}

function startRegionSelect(sendResponse) {
  if (shadowHost) return; // prevent double-overlay

  shadowHost = document.createElement('div');
  shadowHost.id = 'antcapture-region-host';
  shadowHost.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none;';
  
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  // ── Root overlay (full screen, crosshair cursor) ──────────────────────────
  const overlay = document.createElement('div');
  regionOverlay = overlay;
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    zIndex: '2147483647',
    cursor: 'crosshair',
    userSelect: 'none',
    pointerEvents: 'auto',
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  });

  // Four dim panels that create the "spotlight" effect around the selection
  const [dimTop, dimBottom, dimLeft, dimRight] = ['top','bottom','left','right'].map(() => {
    const d = document.createElement('div');
    Object.assign(d.style, { position: 'fixed', zIndex: '0', background: 'rgba(0,0,0,0.55)', display: 'none' });
    overlay.appendChild(d);
    return d;
  });

  // Instruction hint (visible before any drag)
  const hint = document.createElement('div');
  Object.assign(hint.style, {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(10,12,20,0.92)', color: '#f0f4ff',
    fontSize: '14px', fontWeight: '600',
    padding: '14px 22px', borderRadius: '10px',
    border: '1px solid rgba(99,102,241,0.5)',
    backdropFilter: 'blur(12px)', pointerEvents: 'none',
    textAlign: 'center', lineHeight: '1.7',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  });
  hint.innerHTML = '✛ &nbsp;Click and drag to select an area<br><span style="opacity:0.5;font-size:12px;font-weight:400;">ESC to cancel</span>';
  overlay.appendChild(hint);

  // Selection highlight box
  const selBox = document.createElement('div');
  Object.assign(selBox.style, {
    position: 'fixed', border: '2px solid #818cf8',
    boxSizing: 'border-box', display: 'none', cursor: 'move',
  });
  overlay.appendChild(selBox);

  // Pixel-size label inside the selection
  const sizeLabel = document.createElement('div');
  Object.assign(sizeLabel.style, {
    position: 'absolute', top: '6px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(10,12,20,0.85)', color: '#a5b4fc',
    fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '5px',
    pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '0.05em',
  });
  selBox.appendChild(sizeLabel);

  // Corner resize handles
  const handles = ['nw', 'ne', 'sw', 'se'].map(pos => {
    const h = document.createElement('div');
    Object.assign(h.style, {
      position: 'absolute', width: '10px', height: '10px',
      background: '#818cf8', borderRadius: '2px', zIndex: '2',
    });
    h.dataset.handle = pos;
    selBox.appendChild(h);
    return h;
  });
  overlay.appendChild(selBox);

  // Save / Cancel toolbar (appears after the drag ends)
  const toolbar = document.createElement('div');
  Object.assign(toolbar.style, {
    position: 'fixed', display: 'none', alignItems: 'center', gap: '8px',
    background: 'rgba(10,12,20,0.95)', border: '1px solid rgba(99,102,241,0.4)',
    borderRadius: '10px', padding: '7px 10px', backdropFilter: 'blur(16px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: '1',
  });
  const cancelBtn = makeToolbarBtn('✕ Cancel', '#94a3b8', '#1e293b');
  const saveBtn   = makeToolbarBtn('✓ Save Screenshot', '#818cf8', '#1e1b4b', true);
  toolbar.appendChild(cancelBtn);
  toolbar.appendChild(saveBtn);
  overlay.appendChild(toolbar);

  shadowRoot.appendChild(overlay);
  document.body.appendChild(shadowHost);

  // ── State ─────────────────────────────────────────────────────────────────
  let startX = 0, startY = 0, isDragging = false;
  let currentRect = null;
  let phase = 'idle'; // 'idle' | 'dragging' | 'confirm'

  // ── Mouse events ──────────────────────────────────────────────────────────
  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup',   onMouseUp);
  document.addEventListener('keydown',  onKeyDown);

  function onMouseDown(e) {
    if (e.target === cancelBtn || e.target === saveBtn) return;
    if (phase === 'confirm') { phase = 'dragging'; toolbar.style.display = 'none'; }
    e.preventDefault();
    phase = 'dragging';
    startX = e.clientX; startY = e.clientY;
    isDragging = true;
    hint.style.display = 'none';
    selBox.style.display = 'block';
    [dimTop, dimBottom, dimLeft, dimRight].forEach(p => { p.style.display = 'block'; });
    updateSelection(startX, startY, startX, startY);
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    updateSelection(startX, startY, e.clientX, e.clientY);
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    const r = getRect(startX, startY, e.clientX, e.clientY);
    if (r.width < 8 || r.height < 8) {
      phase = 'idle';
      selBox.style.display = 'none';
      [dimTop, dimBottom, dimLeft, dimRight].forEach(p => { p.style.display = 'none'; });
      hint.style.display = 'block';
      return;
    }
    phase = 'confirm';
    currentRect = r;
    positionToolbar(r);
    toolbar.style.display = 'flex';
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { cleanup(); sendResponse({ cancelled: true }); }
    if (e.key === 'Enter' && phase === 'confirm') doSave();
  }

  cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cleanup(); sendResponse({ cancelled: true }); });
  saveBtn.addEventListener('click',   (e) => { e.stopPropagation(); doSave(); });

  function doSave() {
    if (!currentRect) return;
    const r = currentRect;
    overlay.style.visibility = 'hidden';
    cleanup();
    // Two rAF + setTimeout ensures the browser fully paints the "clean" frame before capture
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
      sendResponse({
        x: Math.round(r.x), y: Math.round(r.y),
        width: Math.round(r.width), height: Math.round(r.height),
        devicePixelRatio: window.devicePixelRatio || 1,
      });
    }, 150)));
  }

  function updateSelection(x1, y1, x2, y2) {
    const r = getRect(x1, y1, x2, y2);
    const dpr = window.devicePixelRatio || 1;
    Object.assign(selBox.style, { left: r.x+'px', top: r.y+'px', width: r.width+'px', height: r.height+'px' });
    Object.assign(dimTop.style,    { left:'0', top:'0', right:'0', height: r.y+'px' });
    Object.assign(dimBottom.style, { left:'0', top: (r.y+r.height)+'px', right:'0', bottom:'0' });
    Object.assign(dimLeft.style,   { left:'0', top: r.y+'px', width: r.x+'px', height: r.height+'px' });
    Object.assign(dimRight.style,  { left: (r.x+r.width)+'px', top: r.y+'px', right:'0', height: r.height+'px' });
    sizeLabel.textContent = `${Math.round(r.width*dpr)} × ${Math.round(r.height*dpr)} px`;
    positionHandles(r);
  }

  function positionHandles(r) {
    const positions = { nw:[-5,-5], ne:[r.width-5,-5], sw:[-5,r.height-5], se:[r.width-5,r.height-5] };
    handles.forEach(h => {
      const [lx, ly] = positions[h.dataset.handle];
      h.style.left = lx+'px'; h.style.top = ly+'px';
    });
  }

  function positionToolbar(r) {
    const TW = 220, TH = 50, M = 10;
    const vp = { w: window.innerWidth, h: window.innerHeight };
    let tx = r.x + r.width/2 - TW/2;
    let ty = r.y + r.height + M;
    if (ty + TH > vp.h - M) ty = r.y - TH - M;
    toolbar.style.left = Math.max(M, Math.min(tx, vp.w-TW-M)) + 'px';
    toolbar.style.top  = Math.max(M, ty) + 'px';
  }

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown);
    if (shadowHost && shadowHost.parentNode) {
      shadowHost.parentNode.removeChild(shadowHost);
    }
    shadowHost = null;
    regionOverlay = null;
  }

  function getRect(x1, y1, x2, y2) {
    return { x: Math.min(x1,x2), y: Math.min(y1,y2), width: Math.abs(x2-x1), height: Math.abs(y2-y1) };
  }

  function makeToolbarBtn(text, color, bg, isPrimary = false) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      background: isPrimary ? 'linear-gradient(135deg, #6366f1, #818cf8)' : bg,
      color: isPrimary ? '#fff' : color,
      border: isPrimary ? 'none' : '1px solid rgba(148,163,184,0.2)',
      borderRadius: '7px', padding: '7px 14px',
      fontSize: '13px', fontWeight: '600',
      cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: 'inherit', transition: 'opacity 0.15s',
      boxShadow: isPrimary ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
    });
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.85'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '1'; });
    return btn;
  }
}
