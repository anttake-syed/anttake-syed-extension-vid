// shared/player/AntCapturePlayer.js — AntCapture
// One reusable custom video player module.
// Replaces ALL browser native video UI. The <video> element is the playback
// engine only — every visible pixel is built here.
//
// Usage:
//   import { AntCapturePlayer } from '../shared/player/AntCapturePlayer.js';
//   const player = new AntCapturePlayer(containerEl, blob, {
//     type: 'video',        // 'video' | 'image'
//     hasAudio: true,
//     loop: true,
//     autoplay: true,
//   });
//   player.destroy();      // cleanup event listeners & revoke blob URL

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Format seconds → MM:SS  or  HH:MM:SS for long recordings */
function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Clamp a number between min and max */
function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

// ─────────────────────────────────────────────────────────────────────────────
// Speed cycle order
// ─────────────────────────────────────────────────────────────────────────────
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ─────────────────────────────────────────────────────────────────────────────
// AntCapturePlayer
// ─────────────────────────────────────────────────────────────────────────────
export class AntCapturePlayer {
  /**
   * @param {HTMLElement} container  – host element (will be cleared & filled)
   * @param {Blob|File}   blob       – recording data
   * @param {object}      opts
   * @param {'video'|'image'} [opts.type='video']
   * @param {boolean}     [opts.hasAudio=true]
   * @param {boolean}     [opts.loop=true]
   * @param {boolean}     [opts.autoplay=true]
   * @param {string}      [opts.mimeType]       – if provided, used for diagnostics
   * @param {string}      [opts.format]         – 'webm' | 'mp4' etc.
   */
  constructor(container, blob, opts = {}) {
    this._container = container;
    this._blob = blob;
    this._opts = Object.assign({
      type: 'video',
      hasAudio: true,
      loop: true,
      autoplay: true,
      mimeType: blob?.type || '',
      format: '',
    }, opts);

    // Player state machine:
    // 'loading' → 'ready' | 'error' | 'empty'
    // 'ready' → 'playing' | 'paused' | 'ended' | 'buffering' | 'seeking'
    this._state = 'loading';
    this._volume = 1;
    this._muted  = false;
    this._speedIdx = SPEEDS.indexOf(1); // index into SPEEDS[]
    this._seeking = false;              // drag-seek in progress
    this._blobUrl = null;
    this._listeners = [];              // [element, type, handler] for cleanup

    this._build();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Release all resources */
  destroy() {
    this._listeners.forEach(([el, type, fn]) => el.removeEventListener(type, fn));
    this._listeners = [];
    if (this._video) {
      this._video.pause();
      this._video.src = '';
      this._video.load();
    }
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }
    if (this._kbHandler) {
      document.removeEventListener('keydown', this._kbHandler);
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  _build() {
    const { type, hasAudio } = this._opts;
    this._container.innerHTML = '';

    // ── Root element ──
    const root = document.createElement('div');
    root.className = 'acp';
    this._root = root;

    if (type === 'image') {
      this._buildImageMode(root, hasAudio);
    } else {
      // Validate blob before building full player
      if (!this._blob || this._blob.size === 0) {
        this._buildOverlay(root, 'empty',
          'photo_camera_off',
          '#64748b',
          'No Video Data',
          'This recording contains 0 bytes. The capture may have stalled during finalization.',
          `Blob size: ${this._blob?.size ?? 'null'} bytes  ·  MIME: ${this._opts.mimeType || 'unknown'}`
        );
        this._container.appendChild(root);
        return;
      }
      this._buildVideoMode(root, hasAudio);
    }

    this._container.appendChild(root);
  }

  // ── Image mode ─────────────────────────────────────────────────────────────

  _buildImageMode(root, _hasAudio) {
    const wrap = document.createElement('div');
    wrap.className = 'acp-img-wrap';
    const img = document.createElement('img');
    img.alt = 'Screenshot';
    this._blobUrl = URL.createObjectURL(this._blob);
    img.src = this._blobUrl;
    wrap.appendChild(img);

    const badge = document.createElement('div');
    badge.className = 'acp-img-badge';
    badge.innerHTML = '<span class="material-symbols-rounded">image</span> Screenshot';
    wrap.appendChild(badge);

    root.appendChild(wrap);
    this._setState('ready');
  }

  // ── Video mode ─────────────────────────────────────────────────────────────

  _buildVideoMode(root, hasAudio) {
    const { loop, autoplay, mimeType, format } = this._opts;

    // ── Loading overlay ──
    const loadOverlay = document.createElement('div');
    loadOverlay.className = 'acp-overlay acp-overlay-loading';
    loadOverlay.innerHTML = `
      <div class="acp-spinner"></div>
      <div class="acp-overlay-sub">Preparing preview…</div>
    `;
    this._loadOverlay = loadOverlay;
    root.appendChild(loadOverlay);

    // ── Video element (engine only — no controls) ──
    const video = document.createElement('video');
    video.className = '';
    video.controls = false;  // ← key: no browser controls ever
    video.loop     = loop;
    video.playsInline = true;
    video.preload  = 'metadata';
    this._video = video;
    root.appendChild(video);

    // ── Play/pause flash ──
    const flash = document.createElement('div');
    flash.className = 'acp-flash';
    flash.innerHTML = '<div class="acp-flash-ring"><span class="material-symbols-rounded">play_arrow</span></div>';
    this._flashEl = flash;
    this._flashIcon = flash.querySelector('.material-symbols-rounded');
    root.appendChild(flash);

    // ── Buffering indicator ──
    const bufEl = document.createElement('div');
    bufEl.className = 'acp-buffering';
    bufEl.innerHTML = '<div class="acp-buffering-ring"></div>';
    this._bufEl = bufEl;
    root.appendChild(bufEl);

    // ── Controls chrome ──
    const controls = this._buildControls(hasAudio);
    root.appendChild(controls);

    // ── Keyboard hint ──
    const kbHint = document.createElement('div');
    kbHint.className = 'acp-kb-hint';
    kbHint.textContent = 'Space  play/pause    ←/→  seek 5s    F  fullscreen    M  mute';
    root.appendChild(kbHint);

    // ── Wire video events ──
    this._wireVideoEvents();

    // ── Set source (after event handlers are attached) ──
    this._blobUrl = URL.createObjectURL(this._blob);
    video.src = this._blobUrl;

    // ── Autoplay ──
    if (autoplay) {
      video.addEventListener('canplay', () => {
        video.play().catch(() => {});
      }, { once: true });
    }

    // ── Click to play/pause ──
    this._on(video, 'click', () => this._togglePlay());

    // ── Keyboard shortcuts ──
    this._kbHandler = (e) => this._onKeydown(e);
    document.addEventListener('keydown', this._kbHandler);
  }

  // ── Controls DOM ──────────────────────────────────────────────────────────

  _buildControls(hasAudio) {
    const controls = document.createElement('div');
    controls.className = 'acp-controls';
    this._controlsEl = controls;

    // ── Seekbar row ──
    const seekRow = document.createElement('div');
    seekRow.className = 'acp-seek-row';

    const timeEl = document.createElement('div');
    timeEl.className = 'acp-time';
    timeEl.innerHTML = '<span class="acp-cur">00:00</span><span class="acp-sep"> / </span><span class="acp-dur acp-dur-val">00:00</span>';
    this._timeCur = timeEl.querySelector('.acp-cur');
    this._timeDur = timeEl.querySelector('.acp-dur-val');

    const seekbar = document.createElement('div');
    seekbar.className = 'acp-seekbar';
    seekbar.innerHTML = `
      <div class="acp-seekbar-track">
        <div class="acp-seekbar-buffer" style="width:0%"></div>
        <div class="acp-seekbar-fill"   style="width:0%"></div>
      </div>
      <div class="acp-seekbar-thumb" style="left:0%"></div>
    `;
    this._seekbar      = seekbar;
    this._seekFill     = seekbar.querySelector('.acp-seekbar-fill');
    this._seekBuffer   = seekbar.querySelector('.acp-seekbar-buffer');
    this._seekThumb    = seekbar.querySelector('.acp-seekbar-thumb');
    this._wireSeekbar(seekbar);

    seekRow.appendChild(timeEl);
    seekRow.appendChild(seekbar);
    controls.appendChild(seekRow);

    // ── Button row ──
    const btnRow = document.createElement('div');
    btnRow.className = 'acp-btn-row';

    // Play/pause
    const playBtn = this._makeBtn('play_arrow', 'Play / Pause (Space)', 'acp-btn-play', () => this._togglePlay());
    this._playBtnIcon = playBtn.querySelector('.material-symbols-rounded');
    btnRow.appendChild(playBtn);

    // Volume group
    if (hasAudio !== false) {
      const volGroup = document.createElement('div');
      volGroup.className = 'acp-volume-group';

      const muteBtn = this._makeBtn('volume_up', 'Mute / Unmute (M)', '', () => this._toggleMute());
      this._muteIcon = muteBtn.querySelector('.material-symbols-rounded');
      volGroup.appendChild(muteBtn);

      const volSlider = document.createElement('input');
      volSlider.type = 'range';
      volSlider.min  = '0';
      volSlider.max  = '1';
      volSlider.step = '0.02';
      volSlider.value = '1';
      volSlider.className = 'acp-vol-slider';
      volSlider.title = 'Volume';
      this._on(volSlider, 'input', () => {
        this._volume = parseFloat(volSlider.value);
        this._muted  = this._volume === 0;
        this._applyVolume();
      });
      this._volSlider = volSlider;
      volGroup.appendChild(volSlider);

      btnRow.appendChild(volGroup);
    }

    // Spacer
    const spacer = document.createElement('div');
    spacer.className = 'acp-spacer';
    btnRow.appendChild(spacer);

    // Speed
    const speedBtn = document.createElement('button');
    speedBtn.className = 'acp-speed-btn';
    speedBtn.textContent = '1×';
    speedBtn.title = 'Playback speed';
    this._speedBtn = speedBtn;
    this._on(speedBtn, 'click', () => this._cycleSpeed());
    btnRow.appendChild(speedBtn);

    // PiP (where supported)
    if (document.pictureInPictureEnabled) {
      const pipBtn = this._makeBtn('picture_in_picture_alt', 'Picture-in-Picture', '', () => this._togglePiP());
      btnRow.appendChild(pipBtn);
    }

    // Fullscreen
    const fsBtn = this._makeBtn('fullscreen', 'Fullscreen (F)', '', () => this._toggleFullscreen());
    this._fsIcon = fsBtn.querySelector('.material-symbols-rounded');
    btnRow.appendChild(fsBtn);

    controls.appendChild(btnRow);
    return controls;
  }

  // ── Small button factory ──────────────────────────────────────────────────

  _makeBtn(icon, title, extraClass, onClick) {
    const btn = document.createElement('button');
    btn.className = `acp-btn${extraClass ? ' ' + extraClass : ''}`;
    btn.title = title;
    const ic = document.createElement('span');
    ic.className = 'material-symbols-rounded';
    ic.textContent = icon;
    btn.appendChild(ic);
    this._on(btn, 'click', onClick);
    return btn;
  }

  // ── Seekbar interaction ───────────────────────────────────────────────────

  _wireSeekbar(seekbar) {
    const getPos = (e) => {
      const rect = seekbar.getBoundingClientRect();
      return clamp((e.clientX - rect.left) / rect.width, 0, 1);
    };

    const seek = (frac) => {
      const v = this._video;
      if (!v || !isFinite(v.duration)) return;
      v.currentTime = frac * v.duration;
      this._updateSeekUI(frac);
    };

    this._on(seekbar, 'pointerdown', (e) => {
      seekbar.setPointerCapture(e.pointerId);
      seekbar.classList.add('dragging');
      this._seeking = true;
      seek(getPos(e));
    });

    this._on(seekbar, 'pointermove', (e) => {
      if (!this._seeking) return;
      seek(getPos(e));
    });

    const endSeek = (e) => {
      if (!this._seeking) return;
      seek(getPos(e));
      this._seeking = false;
      seekbar.classList.remove('dragging');
    };
    this._on(seekbar, 'pointerup',     endSeek);
    this._on(seekbar, 'pointercancel', () => { this._seeking = false; seekbar.classList.remove('dragging'); });
    this._on(seekbar, 'click',         (e) => seek(getPos(e)));
  }

  // ── Video event wiring ────────────────────────────────────────────────────

  _wireVideoEvents() {
    const v = this._video;

    // ── Load / ready ──
    this._on(v, 'loadedmetadata', () => {
      this._timeDur.textContent = fmtTime(v.duration);
      v.classList.add('acp-ready');
      this._loadOverlay.classList.add('acp-hidden');
      this._setState('paused');
    });

    // 3-second safety net so user never stays stuck on spinner
    setTimeout(() => {
      if (this._state === 'loading') {
        v.classList.add('acp-ready');
        if (this._loadOverlay) this._loadOverlay.classList.add('acp-hidden');
        this._setState('paused');
      }
    }, 3000);

    // ── Playback state ──
    this._on(v, 'play',   () => this._setState('playing'));
    this._on(v, 'pause',  () => this._setState('paused'));
    this._on(v, 'ended',  () => this._setState('ended'));

    // ── Time update → seek bar + time display ──
    this._on(v, 'timeupdate', () => {
      if (this._seeking) return;
      const frac = v.duration ? v.currentTime / v.duration : 0;
      this._updateSeekUI(frac);
      if (this._timeCur) this._timeCur.textContent = fmtTime(v.currentTime);
    });

    // ── Buffer progress ──
    this._on(v, 'progress', () => {
      if (!v.duration || !v.buffered.length) return;
      const buffered = v.buffered.end(v.buffered.length - 1);
      const frac = buffered / v.duration;
      if (this._seekBuffer) this._seekBuffer.style.width = `${frac * 100}%`;
    });

    // ── Buffering ──
    this._on(v, 'waiting', () => {
      if (this._bufEl) this._bufEl.classList.add('acp-active');
    });
    this._on(v, 'canplay', () => {
      if (this._bufEl) this._bufEl.classList.remove('acp-active');
    });
    this._on(v, 'playing', () => {
      if (this._bufEl) this._bufEl.classList.remove('acp-active');
    });

    // ── Fullscreen change ──
    this._on(document, 'fullscreenchange', () => {
      if (this._fsIcon) {
        this._fsIcon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
      }
    });

    // ── Error ──
    this._on(v, 'error', () => this._handleVideoError());
  }

  // ── State machine ─────────────────────────────────────────────────────────

  _setState(state) {
    this._state = state;
    const root = this._root;

    // Class flags for CSS selectors
    root.classList.toggle('acp-paused', state === 'paused' || state === 'ended');
    root.classList.toggle('acp-ended',  state === 'ended');

    // Play/pause icon
    if (this._playBtnIcon) {
      this._playBtnIcon.textContent =
        (state === 'playing') ? 'pause' : 'play_arrow';
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  _togglePlay() {
    const v = this._video;
    if (!v) return;
    if (v.paused || v.ended) {
      v.play().catch(() => {});
      this._showFlash('play_arrow');
    } else {
      v.pause();
      this._showFlash('pause');
    }
  }

  _toggleMute() {
    this._muted = !this._muted;
    this._applyVolume();
  }

  _applyVolume() {
    const v = this._video;
    if (!v) return;
    v.muted = this._muted;
    v.volume = this._muted ? 0 : this._volume;
    if (this._muteIcon) {
      this._muteIcon.textContent =
        (this._muted || this._volume === 0) ? 'volume_off' : 'volume_up';
    }
    if (this._volSlider) {
      this._volSlider.value = this._muted ? 0 : this._volume;
    }
  }

  _cycleSpeed() {
    this._speedIdx = (this._speedIdx + 1) % SPEEDS.length;
    const spd = SPEEDS[this._speedIdx];
    if (this._video) this._video.playbackRate = spd;
    if (this._speedBtn) {
      this._speedBtn.textContent = spd === 1 ? '1×' : `${spd}×`;
    }
  }

  async _togglePiP() {
    if (!this._video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await this._video.requestPictureInPicture();
      }
    } catch (_) {}
  }

  _toggleFullscreen() {
    if (!document.fullscreenElement) {
      this._root.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  _updateSeekUI(frac) {
    const pct = `${(frac * 100).toFixed(3)}%`;
    if (this._seekFill)  this._seekFill.style.width = pct;
    if (this._seekThumb) this._seekThumb.style.left = pct;
  }

  _showFlash(icon) {
    if (!this._flashEl) return;
    this._flashIcon.textContent = icon;
    this._flashEl.classList.remove('acp-flash-go');
    // Trigger reflow to restart animation
    void this._flashEl.offsetWidth;
    this._flashEl.classList.add('acp-flash-go');
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  _onKeydown(e) {
    // Don't steal keys when user is typing in an input
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    const v = this._video;
    if (!v) return;

    switch (e.code) {
      case 'Space':
      case 'KeyK':
        e.preventDefault();
        this._togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._volume = clamp(this._volume + 0.1, 0, 1);
        this._muted = false;
        this._applyVolume();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this._volume = clamp(this._volume - 0.1, 0, 1);
        this._applyVolume();
        break;
      case 'KeyM':
        this._toggleMute();
        break;
      case 'KeyF':
        this._toggleFullscreen();
        break;
      case 'KeyP':
        if (e.shiftKey) this._togglePiP();
        break;
      case 'Home':
        e.preventDefault();
        v.currentTime = 0;
        break;
      case 'End':
        e.preventDefault();
        v.currentTime = v.duration || 0;
        break;
    }
  }

  // ── Error handling ────────────────────────────────────────────────────────

  _handleVideoError() {
    const v = this._video;
    const errCode = v?.error?.code;
    const errMsg  = v?.error?.message || '';

    const codeMap = {
      1: 'MEDIA_ERR_ABORTED',
      2: 'MEDIA_ERR_NETWORK',
      3: 'MEDIA_ERR_DECODE',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
    };
    const friendly = codeMap[errCode] || 'MEDIA_ERR_UNKNOWN';

    console.error('AntCapture Player — video error diagnostics:');
    console.error('  error.code :', errCode, '→', friendly);
    console.error('  error.msg  :', errMsg);
    console.error('  readyState :', v?.readyState);
    console.error('  blob.size  :', this._blob?.size ?? 'null');
    console.error('  blob.type  :', this._blob?.type);
    console.error('  format     :', this._opts.format);

    // Hide loading overlay if still visible
    if (this._loadOverlay) this._loadOverlay.classList.add('acp-hidden');

    this._buildOverlay(this._root, 'error',
      'broken_image',
      '#f87171',
      'Playback Error',
      `The browser could not decode this recording.`,
      `${friendly}${errMsg ? ' · ' + errMsg : ''}  ·  size: ${((this._blob?.size || 0) / 1024 / 1024).toFixed(2)} MB`
    );
  }

  // ── Generic overlay builder ───────────────────────────────────────────────

  _buildOverlay(root, type, icon, iconColor, title, sub, code) {
    const el = document.createElement('div');
    el.className = `acp-overlay acp-overlay-${type}`;

    const ic = document.createElement('span');
    ic.className = 'material-symbols-rounded acp-overlay-icon';
    ic.style.color = iconColor;
    ic.textContent = icon;

    const t = document.createElement('div');
    t.className = 'acp-overlay-title';
    t.textContent = title;

    const s = document.createElement('div');
    s.className = 'acp-overlay-sub';
    s.textContent = sub;

    el.appendChild(ic);
    el.appendChild(t);
    el.appendChild(s);

    if (code) {
      const c = document.createElement('div');
      c.className = 'acp-overlay-code';
      c.textContent = code;
      el.appendChild(c);
    }

    root.appendChild(el);
  }

  // ── Event listener helper (tracks for cleanup) ────────────────────────────

  _on(el, type, fn) {
    el.addEventListener(type, fn);
    this._listeners.push([el, type, fn]);
  }
}
