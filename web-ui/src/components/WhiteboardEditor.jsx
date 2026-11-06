import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SERVER_URL } from '../config.js';
import '../styles/pages/whiteboards.css';
import WhiteboardTopbar from './whiteboard/WhiteboardTopbar.jsx';
import WhiteboardToolbar from './whiteboard/WhiteboardToolbar.jsx';
import WhiteboardContextBar from './whiteboard/WhiteboardContextBar.jsx';
import WhiteboardTemplateModal from './whiteboard/WhiteboardTemplateModal.jsx';
import WhiteboardLibraryPicker from './whiteboard/WhiteboardLibraryPicker.jsx';
import WhiteboardShareModal from './whiteboard/WhiteboardShareModal.jsx';
import WhiteboardContextMenu from './whiteboard/WhiteboardContextMenu.jsx';
import WhiteboardExitModal from './whiteboard/WhiteboardExitModal.jsx';
import WhiteboardTextPromptModal from './whiteboard/WhiteboardTextPromptModal.jsx';
import WhiteboardShortcutsModal from './whiteboard/WhiteboardShortcutsModal.jsx';
import { TOOLS, COLORS, SIZES, generateDefaultName } from './whiteboard/whiteboardConstants.js';
import {
  rotatePoint,
  getElementTransformBox,
  getTransformHandles,
  hitTestHandles,
  hitTestElement,
  getFillColor,
  drawHandDrawnRect,
  drawHandDrawnCircle,
  drawHandDrawnArrow,
} from './whiteboard/whiteboardTransform.js';
import { extractYouTubeVideoId, parsePastedUrl } from './whiteboard/whiteboardHelpers.js';

// ── Main WhiteboardEditor ────────────────────────────────────
export default function WhiteboardEditor({ board, onClose, user }) {
  const [boardName, setBoardName]         = useState(board?.name || generateDefaultName());
  const [editingName, setEditingName]     = useState(false);
  const [nameDraft, setNameDraft]         = useState(boardName);
  const [tool, setTool]                   = useState('select');
  const [color, setColor]                 = useState('#f8fafc');
  const [strokeSize, setStrokeSize]       = useState(4);
  const [showLibrary, setShowLibrary]     = useState('none'); // 'none', 'images', 'videos'
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [elements, setElements]           = useState([]);
  const [selectedId, setSelectedId]       = useState(null);
  const [selectedIds, setSelectedIds]     = useState([]);
  const [marquee, setMarquee]             = useState(null);
  const [isSaved, setIsSaved]             = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [saveError, setSaveError]         = useState(null);
  const [loadError, setLoadError]         = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [zoom, setZoom]                   = useState(1);
  const [panOffset, setPanOffset]         = useState({ x: 0, y: 0 });
  const [boardStateItemId, setBoardStateItemId] = useState(null);
  const [contextMenu, setContextMenu]     = useState(null);
  const [textPrompt, setTextPrompt]       = useState(null);
  const [textPromptValue, setTextPromptValue] = useState('');
  const [mediaLoadError, setMediaLoadError] = useState(null);
  const [activeVideoEmbedId, setActiveVideoEmbedId] = useState(null);

  const canvasRef         = useRef(null);
  const drawing           = useRef(false);
  const currentPath       = useRef([]);
  const liveShape         = useRef(null);
  const dragRef           = useRef(null);
  const panDragRef        = useRef(null); // for pan tool or space/middle drag
  const marqueeRef        = useRef(null);
  const clipboardRef      = useRef(null); // { elements: [...], origin: { x, y } }
  const nameInputRef      = useRef(null);
  const boardStateItemIdRef = useRef(null);
  const needsCommitRef    = useRef(false);
  const isSavingRef       = useRef(false);
  const nameCommittedRef  = useRef(false);
  const zoomRef           = useRef(zoom);
  const panOffsetRef      = useRef(panOffset);
  const activePointersRef = useRef(new Map()); // id -> { clientX, clientY }
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(1);
  const spacePressedRef   = useRef(false);
  const longPressTimerRef = useRef(null);
  const touchStartPosRef  = useRef(null);
  const lastTapRef        = useRef({ time: 0, x: 0, y: 0 });

  // Keep refs in sync for use in event handlers
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  const historyRef        = useRef([[]]);
  const historyStepRef    = useRef(0);

  const commitToHistory = (newElements) => {
    const nextStep = historyStepRef.current + 1;
    const newHistory = historyRef.current.slice(0, nextStep);
    newHistory.push(newElements);
    historyRef.current = newHistory;
    historyStepRef.current = nextStep;
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    if (needsCommitRef.current) {
      commitToHistory(elements);
      needsCommitRef.current = false;
    }
  }, [elements]);

  useEffect(() => {
    if (board?.id && boardName) {
      const slug = boardName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
      const targetUrl = `/whiteboard/${board.id}/${slug}`;
      const currentPath = window.location.pathname;
      if (currentPath !== targetUrl) {
        if (currentPath.startsWith(`/whiteboard/${board.id}`)) {
          window.history.replaceState(null, '', targetUrl);
        } else {
          window.history.pushState(null, '', targetUrl);
        }
      }
    }
  }, [board?.id, boardName]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes on your whiteboard. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  // ── Canvas coordinate helpers (accounts for zoom + pan) ──
  // Convert screen/client coords → canvas world coords
  const screenToWorld = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const z = zoomRef.current;
    const pan = panOffsetRef.current;
    return {
      x: (clientX - rect.left - pan.x) / z,
      y: (clientY - rect.top  - pan.y) / z,
    };
  }, []);

  // ── Canvas draw ──────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const z = zoomRef.current;
    const pan = panOffsetRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom + pan transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(z, z);

    elements.forEach((el) => {
      ctx.save();
      const rot = el.rotation || 0;
      if (rot) {
        const box = getElementTransformBox(el);
        ctx.translate(box.cx, box.cy);
        ctx.rotate(rot);
        ctx.translate(-box.cx, -box.cy);
      }

      if (el.type === 'frame') {
        // Professional Figma/Miro style Frame container
        const fw = el.w || 360;
        const fh = el.h || 240;
        // Background card
        ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
        ctx.fillRect(el.x, el.y, fw, fh);
        // Header banner
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.fillRect(el.x, el.y, fw, 28);
        // Frame outer border
        ctx.strokeStyle = el.color || '#6366f1';
        ctx.lineWidth = Math.max(1.5, el.size || 2);
        ctx.strokeRect(el.x, el.y, fw, fh);
        // Header title
        ctx.fillStyle = '#f8fafc';
        ctx.font = "bold 12px 'Outfit', sans-serif";
        ctx.fillText(el.title || 'FRAME', el.x + 10, el.y + 19);
      } else if (el.type === 'path') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.size;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        el.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (el.type === 'rect') {
        const fill = el.fillStyle === 'none' ? 'transparent' : (el.fill || getFillColor(el.color, 0.16));
        drawHandDrawnRect(ctx, el.x, el.y, el.w, el.h, {
          stroke: el.color,
          fill,
          fillStyle: el.fillStyle || 'solid',
          strokeWidth: el.size || 2,
          radius: el.radius !== undefined ? el.radius : 12,
        });
      } else if (el.type === 'circle') {
        const fill = el.fillStyle === 'none' ? 'transparent' : (el.fill || getFillColor(el.color, 0.16));
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        const rx = el.w / 2;
        const ry = el.h / 2;
        drawHandDrawnCircle(ctx, cx, cy, rx, ry, {
          stroke: el.color,
          fill,
          fillStyle: el.fillStyle || 'solid',
          strokeWidth: el.size || 2,
        });
      } else if (el.type === 'arrow') {
        drawHandDrawnArrow(ctx, el.x, el.y, el.x2, el.y2, el.cpx, el.cpy, {
          stroke: el.color,
          strokeWidth: el.size || 2,
        });
      } else if (el.type === 'text') {
        ctx.fillStyle  = el.color;
        ctx.font       = `${el.fontSize}px 'Outfit', sans-serif`;
        ctx.fillText(el.text, el.x, el.y);
      } else if (el.type === 'image') {
        if (el.img) {
          try {
            ctx.drawImage(el.img, el.x, el.y, el.w, el.h);
          } catch (e) {
            console.warn('Canvas drawImage error for element:', e);
          }
        } else {
          // Fallback placeholder card if image is loading or failed
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(el.x, el.y, el.w || 300, el.h || 200);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(el.x, el.y, el.w || 300, el.h || 200);

          ctx.fillStyle = '#94a3b8';
          ctx.font = "14px 'Outfit', sans-serif";
          ctx.fillText(el.title || (el.isVideo ? 'Video Preview' : 'Image Preview'), el.x + 16, el.y + (el.h ? el.h / 2 : 100));
        }

        if (el.title) {
          ctx.font = "14px 'Outfit', sans-serif";
          const tw = ctx.measureText(el.title).width;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(el.x, el.y - 24, tw + 12, 24);
          ctx.fillStyle = "white";
          ctx.fillText(el.title, el.x + 6, el.y - 8);
        }

        if (el.isVideo && !el.isPlaying) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.beginPath();
          ctx.arc(el.x + el.w/2, el.y + el.h/2, 24, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.moveTo(el.x + el.w/2 - 8, el.y + el.h/2 - 10);
          ctx.lineTo(el.x + el.w/2 + 12, el.y + el.h/2);
          ctx.lineTo(el.x + el.w/2 - 8, el.y + el.h/2 + 10);
          ctx.fill();
        }
      }
      ctx.restore();
    });

    // live path (pen/eraser)
    if (drawing.current && currentPath.current.length > 1 && (tool === 'pen' || tool === 'eraser')) {
      ctx.save();
      ctx.strokeStyle = tool === 'eraser' ? '#020617' : color;
      ctx.lineWidth   = tool === 'eraser' ? strokeSize * 5 : strokeSize;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      currentPath.current.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    }

    // Live shape preview
    if (drawing.current && liveShape.current) {
      const { startPt: s, endPt: ep, tool: lt } = liveShape.current;
      ctx.save();
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth   = Math.max(2, strokeSize * 0.75);
      ctx.lineCap     = 'round';
      ctx.setLineDash([]); // Professional solid stroke
      if (lt === 'rect' || lt === 'frame') {
        ctx.strokeRect(s.x, s.y, ep.x - s.x, ep.y - s.y);
        if (lt === 'frame') {
          ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
          ctx.fillRect(s.x, s.y, ep.x - s.x, ep.y - s.y);
        }
      } else if (lt === 'circle') {
        const cx = (s.x + ep.x) / 2, cy = (s.y + ep.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs((ep.x - s.x) / 2), Math.abs((ep.y - s.y) / 2), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (lt === 'arrow') {
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(ep.x, ep.y); ctx.stroke();
        const angle = Math.atan2(ep.y - s.y, ep.x - s.x);
        const hw = 10 + strokeSize;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ep.x, ep.y);
        ctx.lineTo(ep.x - hw * Math.cos(angle - Math.PI/6), ep.y - hw * Math.sin(angle - Math.PI/6));
        ctx.lineTo(ep.x - hw * Math.cos(angle + Math.PI/6), ep.y - hw * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fillStyle = '#818cf8';
        ctx.fill();
      }
      ctx.restore();
    }

    // Selection bounding outlines + 8 resize handles + rotation stem
    const allSelected = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    allSelected.forEach(idx => {
      const el = elements[idx];
      if (!el) return;
      const { box, handles, rotationHandle } = getTransformHandles(el, z);

      ctx.save();
      if (box.rotation) {
        ctx.translate(box.cx, box.cy);
        ctx.rotate(box.rotation);
        ctx.translate(-box.cx, -box.cy);
      }

      if (el.type === 'arrow') {
        // Arrow-specific interactive points (Start, Curve Midpoint, End)
        handles.forEach(h => {
          const isMid = h.id === 'arrow-mid';
          ctx.beginPath();
          ctx.arc(h.x, h.y, isMid ? 5 / z : 6 / z, 0, Math.PI * 2);
          ctx.fillStyle = isMid ? '#a855f7' : '#ffffff';
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 1.5 / z;
          ctx.fill();
          ctx.stroke();
        });
      } else {
        // Solid bounding outline in signature indigo
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth   = 1.5 / z;
        ctx.setLineDash([]);
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        // Rotation stem line from top edge up to rotation handle
        ctx.beginPath();
        ctx.moveTo(box.cx, box.y);
        ctx.lineTo(box.cx, box.y - 20 / z);
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 1 / z;
        ctx.stroke();

        // Rotation handle (top circle with indigo accent)
        ctx.fillStyle = '#6366f1';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / z;
        ctx.beginPath();
        ctx.arc(box.cx, box.y - 20 / z, 4.5 / z, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 8 Resize handles around perimeter (Crisp white squares with solid indigo border)
        const hs = 7 / z;
        handles.forEach(h => {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 1.5 / z;
          ctx.fillRect(h.unrotX - hs / 2, h.unrotY - hs / 2, hs, hs);
          ctx.strokeRect(h.unrotX - hs / 2, h.unrotY - hs / 2, hs, hs);
        });
      }

      ctx.restore();
    });

    // Marquee selection box
    const m = marqueeRef.current;
    if (m && m.active) {
      const rx = Math.min(m.startX, m.currentX);
      const ry = Math.min(m.startY, m.currentY);
      const rw = Math.abs(m.currentX - m.startX);
      const rh = Math.abs(m.currentY - m.startY);
      ctx.save();
      ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5 / z;
      ctx.setLineDash([]); // Professional solid line
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }

    ctx.restore(); // restore zoom+pan transform
  }, [elements, color, strokeSize, tool, selectedId, selectedIds]);

  useEffect(() => { redraw(); }, [redraw]);

  // Video animation loop
  useEffect(() => {
    let frameId;
    const loop = () => {
      if (elements.some(el => el.isVideo && el.isPlaying)) redraw();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [elements, redraw]);

  // Load board state on mount
  useEffect(() => {
    async function loadBoardState() {
      try {
        const res = await fetch(`${SERVER_URL}/boards/${board.id}`, {
          headers: { Authorization: `Bearer ${user?.jwt}` },
        });
        const data = await res.json();

        if (data.board?.name) {
          setBoardName(data.board.name);
          setNameDraft(data.board.name);
        }

        const items = data.board?.items || [];
        const stateItem = items.find(i => i.type === 'board_state');
        if (stateItem?.content) {
          setBoardStateItemId(stateItem.id);
          boardStateItemIdRef.current = stateItem.id;
          const state = JSON.parse(stateItem.content);
          if (state.elements) {
            const restored = await Promise.all(
              state.elements.map(el => {
                if (el.type === 'image' && el.src) {
                  return new Promise(resolve => {
                    if (el.isVideo) {
                      const video = document.createElement('video');
                      video.crossOrigin = 'anonymous';
                      video.muted = true;
                      video.loop = true;
                      video.playsInline = true;
                      video.src = el.src;
                      video.onloadeddata = () => {
                        try { video.currentTime = 0.1; } catch (_) {}
                      };
                      video.onseeked = () => {
                        resolve({ ...el, img: video, isPlaying: false });
                      };
                      video.oncanplay = () => {
                        setTimeout(() => resolve({ ...el, img: video, isPlaying: false }), 200);
                      };
                      setTimeout(() => resolve({ ...el, img: video, isPlaying: false }), 1500);
                      video.onerror = () => {
                        if (video.crossOrigin) {
                          video.crossOrigin = null;
                          video.src = el.src;
                          video.load();
                        } else {
                          resolve(el);
                        }
                      };
                    } else {
                      const img = new Image();
                      img.crossOrigin = 'anonymous';
                      img.onload = () => resolve({ ...el, img });
                      img.onerror = () => {
                        if (img.crossOrigin) {
                          img.crossOrigin = null;
                          img.src = el.src;
                        } else {
                          resolve(el);
                        }
                      };
                      img.src = el.src;
                    }
                  });
                }
                return Promise.resolve(el);
              })
            );
            setElements(restored);
            historyRef.current = [restored];
            historyStepRef.current = 0;
          }
        }
      } catch (err) {
        console.error('Failed to load board state', err);
        setLoadError('Could not load this whiteboard\'s saved content. Your last save is still on the server — try refreshing.');
      }
    }
    if (board?.id && user?.jwt) loadBoardState();
  }, [board?.id, user?.jwt]);

  // Canvas resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width  = rect.width;
        canvas.height = rect.height;
        redraw();
      }
    };

    const obs = new ResizeObserver(resize);
    obs.observe(canvas.parentElement);
    return () => obs.disconnect();
  }, [redraw]);

  // Touchpad & Mouse wheel: smooth pan or zoom (Ctrl+wheel / pinch)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom on touchpad OR Ctrl+Scroll on mouse
        const delta = -e.deltaY * 0.002;
        const currentZ = zoomRef.current;
        const newZ = Math.min(4, Math.max(0.1, currentZ + delta * currentZ));
        
        // Zoom towards mouse cursor position
        const rect = canvas.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const currentPan = panOffsetRef.current;
        
        const scaleChange = newZ / currentZ;
        const newPan = {
          x: cursorX - (cursorX - currentPan.x) * scaleChange,
          y: cursorY - (cursorY - currentPan.y) * scaleChange,
        };
        
        setZoom(newZ);
        setPanOffset(newPan);
      } else {
        // Two-finger scroll on trackpad OR shift-wheel panning
        const dx = e.shiftKey ? -e.deltaY : -e.deltaX;
        const dy = e.shiftKey ? 0 : -e.deltaY;
        const newPan = {
          x: panOffsetRef.current.x + dx,
          y: panOffsetRef.current.y + dy,
        };
        setPanOffset(newPan);
        panOffsetRef.current = newPan;
        redraw();
      }
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [redraw]);

  // ── Mouse & Pointer Events ───────────────────────────────
  const onMouseDown = (e) => {
    setContextMenu(null);
    const isMiddle = e.button === 1;
    const isSpacePan = spacePressedRef.current && e.button === 0;

    // Pan via pan tool, middle-click drag, or Spacebar+left click drag
    if (tool === 'pan' || isMiddle || isSpacePan) {
      if (isMiddle) e.preventDefault();
      panDragRef.current = {
        startClient: { x: e.clientX, y: e.clientY },
        startPan: { ...panOffsetRef.current },
      };
      return;
    }

    // Right-click or Mac Ctrl+left click: open context menu
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      openContextMenuAt(e.clientX, e.clientY);
      return;
    }

    if (e.button !== 0) return;
    const pos = screenToWorld(e.clientX, e.clientY);

    if (tool === 'select') {
      // ── 1. Check if clicking a transform handle on a selected element ──
      const selectedEls = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
      for (const selIdx of selectedEls) {
        const el = elements[selIdx];
        if (!el) continue;
        const handleHit = hitTestHandles(el, pos, zoomRef.current);
        if (handleHit) {
          // Start a transform drag (resize or rotate)
          const { box } = getTransformHandles(el, zoomRef.current);
          dragRef.current = {
            idx: selIdx,
            isResize: false,
            startX: pos.x,
            startY: pos.y,
            movingIndices: [],
            initialSnapshots: {},
            origX: el.x, origY: el.y,
            origW: el.w || 0, origH: el.h || 0,
            origX2: el.x2, origY2: el.y2,
            origCpx: el.cpx !== undefined ? el.cpx : (el.x + (el.x2 || el.x)) / 2,
            origCpy: el.cpy !== undefined ? el.cpy : (el.y + (el.y2 || el.y)) / 2,
            origPoints: null,
            // Transform-specific
            handleId: handleHit.handle.id,
            isRotating: handleHit.type === 'rotate',
            isResizing: handleHit.type === 'resize',
            isArrowHandle: handleHit.type === 'arrow-handle',
            startAngle: Math.atan2(pos.y - box.cy, pos.x - box.cx),
            startRotation: el.rotation || 0,
            startBox: { ...box },
          };
          return;
        }
      }

      // ── 2. Normal element hit-test (all types including frame) ──
      let hit = null;
      let hitResize = false;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.type === 'image') {
          if (selectedId === i || selectedIds.includes(i)) {
            const hx = el.x + el.w, hy = el.y + el.h;
            if (pos.x >= hx - 8 && pos.x <= hx + 8 && pos.y >= hy - 8 && pos.y <= hy + 8) {
              hit = i; hitResize = true; break;
            }
          }
          if (pos.x >= el.x && pos.x <= el.x + el.w && pos.y >= el.y && pos.y <= el.y + el.h) {
            if (el.isVideo) {
              const cx = el.x + el.w/2, cy = el.y + el.h/2;
              if (Math.hypot(pos.x - cx, pos.y - cy) < 24) {
                const next = [...elements];
                next[i].isPlaying = !next[i].isPlaying;
                if (next[i].isPlaying) next[i].img.play(); else next[i].img.pause();
                setElements(next);
                return;
              }
            }
            hit = i; break;
          }
        } else if (el.type === 'embed' || el.type === 'link') {
          if (hitTestElement(el, pos)) { hit = i; break; }
        } else if (el.type === 'frame') {
          if (hitTestElement(el, pos)) { hit = i; break; }
        } else if (el.type === 'text') {
          const fontSize = el.fontSize || 20;
          if (pos.x >= el.x - 4 && pos.x <= el.x + 240 && pos.y >= el.y - fontSize - 4 && pos.y <= el.y + 6) { hit = i; break; }
        } else if (el.type === 'rect') {
          const minX = Math.min(el.x, el.x + el.w), maxX = Math.max(el.x, el.x + el.w);
          const minY = Math.min(el.y, el.y + el.h), maxY = Math.max(el.y, el.y + el.h);
          if (pos.x >= minX - 4 && pos.x <= maxX + 4 && pos.y >= minY - 4 && pos.y <= maxY + 4) { hit = i; break; }
        } else if (el.type === 'circle') {
          const cx = el.x + el.w/2, cy = el.y + el.h/2;
          const rx = Math.abs(el.w/2), ry = Math.abs(el.h/2);
          if (pos.x >= cx - rx - 4 && pos.x <= cx + rx + 4 && pos.y >= cy - ry - 4 && pos.y <= cy + ry + 4) { hit = i; break; }
        } else if (el.type === 'arrow') {
          const minX = Math.min(el.x, el.x2), maxX = Math.max(el.x, el.x2);
          const minY = Math.min(el.y, el.y2), maxY = Math.max(el.y, el.y2);
          if (pos.x >= minX - 10 && pos.x <= maxX + 10 && pos.y >= minY - 10 && pos.y <= maxY + 10) { hit = i; break; }
        } else if (el.type === 'path') {
          let pathHit = false;
          for (let p of (el.points || [])) {
            if (Math.hypot(p.x - pos.x, p.y - pos.y) < el.size + 6) { pathHit = true; break; }
          }
          if (pathHit) { hit = i; break; }
        }
      }

      if (hit !== null) {
        let newSelectedIds = [hit];
        if (e.shiftKey) {
          newSelectedIds = selectedIds.includes(hit)
            ? selectedIds.filter(id => id !== hit)
            : [...selectedIds, hit];
        } else if (selectedIds.includes(hit) && selectedIds.length > 1) {
          newSelectedIds = selectedIds;
        }

        setSelectedId(hit);
        setSelectedIds(newSelectedIds);

        const movingIndices = newSelectedIds.includes(hit) ? newSelectedIds : [hit];
        const initialSnapshots = {};
        movingIndices.forEach(idx => {
          const el = elements[idx];
          if (el) {
            initialSnapshots[idx] = {
              x: el.x, y: el.y,
              w: el.w, h: el.h,
              x2: el.x2, y2: el.y2,
              points: el.points ? el.points.map(p => ({ ...p })) : null,
            };
          }
        });

        dragRef.current = {
          idx: hit,
          isResize: hitResize,
          startX: pos.x,
          startY: pos.y,
          movingIndices,
          initialSnapshots,
          origX: elements[hit].x, origY: elements[hit].y,
          origW: elements[hit].w, origH: elements[hit].h,
          origX2: elements[hit].x2, origY2: elements[hit].y2,
          origPoints: elements[hit].points ? [...elements[hit].points] : null
        };
      } else {
        setSelectedId(null);
        setSelectedIds([]);
        marqueeRef.current = {
          active: true,
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
        };
        setMarquee({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
        redraw();
      }
      return;
    }

    if (tool === 'text') {
      setTextPromptValue('');
      setTextPrompt({ x: pos.x, y: pos.y });
      return;
    }

    drawing.current = true;
    currentPath.current = [pos];
    if (['rect', 'circle', 'arrow', 'frame'].includes(tool)) liveShape.current = { startPt: pos, endPt: pos, tool };
  };

  const onMouseMove = (e) => {
    // Pan dragging (pan tool, space+drag, middle-click, or touch)
    if (panDragRef.current) {
      const dx = e.clientX - panDragRef.current.startClient.x;
      const dy = e.clientY - panDragRef.current.startClient.y;
      const newPan = {
        x: panDragRef.current.startPan.x + dx,
        y: panDragRef.current.startPan.y + dy,
      };
      setPanOffset(newPan);
      panOffsetRef.current = newPan;
      redraw();
      return;
    }

    // Selector marquee
    if (tool === 'select' && marqueeRef.current && marqueeRef.current.active) {
      const pos = screenToWorld(e.clientX, e.clientY);
      marqueeRef.current.currentX = pos.x;
      marqueeRef.current.currentY = pos.y;
      setMarquee({ ...marqueeRef.current });
      redraw();
      return;
    }

    // Dragging/moving selected elements
    if (tool === 'select' && dragRef.current) {
      const pos = screenToWorld(e.clientX, e.clientY);
      const {
        idx,
        isResize,
        isRotating,
        isResizing,
        handleId,
        startX,
        startY,
        origX,
        origY,
        origW,
        origH,
        origX2,
        origY2,
        origCpx,
        origCpy,
        isArrowHandle,
        startAngle,
        startRotation,
        startBox,
        movingIndices,
        initialSnapshots
      } = dragRef.current;
      const dx = pos.x - startX, dy = pos.y - startY;

      // ── Handle Arrow Endpoints & Bend Manipulation ──
      if (isArrowHandle && idx !== null) {
        setElements(prev => prev.map((el, i) => {
          if (i !== idx) return el;
          if (handleId === 'arrow-start') {
            return { ...el, x: origX + dx, y: origY + dy };
          } else if (handleId === 'arrow-end') {
            return { ...el, x2: origX2 + dx, y2: origY2 + dy };
          } else if (handleId === 'arrow-mid') {
            return { ...el, cpx: origCpx + dx, cpy: origCpy + dy };
          }
          return el;
        }));
        return;
      }

      // ── Handle Rotation ──
      if (isRotating && idx !== null && startBox) {
        const curAngle = Math.atan2(pos.y - startBox.cy, pos.x - startBox.cx);
        let angleDelta = curAngle - startAngle;
        let nextRot = startRotation + angleDelta;
        // Snap to 15 degrees if Shift is held
        if (e.shiftKey) {
          const snapStep = Math.PI / 12; // 15 deg
          nextRot = Math.round(nextRot / snapStep) * snapStep;
        }
        setElements(prev => prev.map((el, i) => i === idx ? { ...el, rotation: nextRot } : el));
        return;
      }

      // ── Handle 8-Directional Resizing ──
      if (isResizing && idx !== null && startBox) {
        // Project dx, dy into element's local unrotated coordinate space
        const rot = startRotation || 0;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);
        const localDx = dx * cos - dy * sin;
        const localDy = dx * sin + dy * cos;

        setElements(prev => prev.map((el, i) => {
          if (i !== idx) return el;
          let newX = origX, newY = origY, newW = origW, newH = origH;

          // Adjust based on handle
          if (handleId.includes('e')) newW = Math.max(20, origW + localDx);
          if (handleId.includes('s')) newH = Math.max(20, origH + localDy);
          if (handleId.includes('w')) {
            const potentialW = origW - localDx;
            if (potentialW >= 20) {
              newW = potentialW;
              newX = origX + localDx * Math.cos(rot);
              newY = origY + localDx * Math.sin(rot);
            }
          }
          if (handleId.includes('n')) {
            const potentialH = origH - localDy;
            if (potentialH >= 20) {
              newH = potentialH;
              newX = newX - localDy * Math.sin(rot);
              newY = newY + localDy * Math.cos(rot);
            }
          }

          // If circle, keep 1:1 aspect ratio
          if (el.type === 'circle') {
            const s = Math.max(newW, newH);
            newW = s;
            newH = s;
          }

          return { ...el, x: newX, y: newY, w: newW, h: newH };
        }));
        return;
      }

      // Legacy fallback image resize
      if (isResize && idx !== null) {
        setElements(prev => prev.map((el, i) => {
          if (i !== idx) return el;
          const ratio = (origW && origH) ? origW / origH : 1;
          const newW = Math.max(20, origW + dx);
          const newH = newW / ratio;
          return { ...el, w: newW, h: newH };
        }));
      } else if (movingIndices && movingIndices.length > 0) {
        setElements(prev => prev.map((el, i) => {
          if (!movingIndices.includes(i) || !initialSnapshots[i]) return el;
          const snap = initialSnapshots[i];
          if (el.type === 'path' && snap.points) {
            return { ...el, points: snap.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
          } else if (el.type === 'arrow') {
            return { ...el, x: snap.x + dx, y: snap.y + dy, x2: snap.x2 + dx, y2: snap.y2 + dy };
          } else {
            return { ...el, x: snap.x + dx, y: snap.y + dy };
          }
        }));
      }
      return;
    }

    if (!drawing.current) return;
    const pos = screenToWorld(e.clientX, e.clientY);
    currentPath.current = [...currentPath.current, pos];
    if (liveShape.current) liveShape.current = { ...liveShape.current, endPt: pos };
    redraw();
  };

  const onMouseUp = (e) => {
    // Finish pan
    if (panDragRef.current) {
      panDragRef.current = null;
      return;
    }

    // Finish marquee selection
    if (tool === 'select' && marqueeRef.current && marqueeRef.current.active) {
      const m = marqueeRef.current;
      marqueeRef.current = null;
      setMarquee(null);

      const minX = Math.min(m.startX, m.currentX);
      const maxX = Math.max(m.startX, m.currentX);
      const minY = Math.min(m.startY, m.currentY);
      const maxY = Math.max(m.startY, m.currentY);

      if (maxX - minX > 3 || maxY - minY > 3) {
        const hits = [];
        elements.forEach((el, i) => {
          let elMinX = el.x, elMaxX = el.x, elMinY = el.y, elMaxY = el.y;
          if (el.type === 'image' || el.type === 'rect' || el.type === 'frame' || el.type === 'embed' || el.type === 'link') {
            elMinX = Math.min(el.x, el.x + (el.w || 0));
            elMaxX = Math.max(el.x, el.x + (el.w || 0));
            elMinY = Math.min(el.y, el.y + (el.h || 0));
            elMaxY = Math.max(el.y, el.y + (el.h || 0));
          } else if (el.type === 'circle') {
            const rx = Math.abs((el.w || 0) / 2), ry = Math.abs((el.h || 0) / 2);
            const cx = el.x + (el.w || 0) / 2, cy = el.y + (el.h || 0) / 2;
            elMinX = cx - rx; elMaxX = cx + rx;
            elMinY = cy - ry; elMaxY = cy + ry;
          } else if (el.type === 'arrow') {
            elMinX = Math.min(el.x, el.x2); elMaxX = Math.max(el.x, el.x2);
            elMinY = Math.min(el.y, el.y2); elMaxY = Math.max(el.y, el.y2);
          } else if (el.type === 'text') {
            elMinX = el.x; elMaxX = el.x + 120;
            elMinY = el.y - (el.fontSize || 20); elMaxY = el.y;
          } else if (el.type === 'path' && el.points?.length) {
            elMinX = Math.min(...el.points.map(p => p.x));
            elMaxX = Math.max(...el.points.map(p => p.x));
            elMinY = Math.min(...el.points.map(p => p.y));
            elMaxY = Math.max(...el.points.map(p => p.y));
          }
          const overlap = !(elMaxX < minX || elMinX > maxX || elMaxY < minY || elMinY > maxY);
          if (overlap) hits.push(i);
        });
        setSelectedIds(hits);
        setSelectedId(hits.length === 1 ? hits[0] : (hits.length > 1 ? hits[hits.length - 1] : null));
      }
      redraw();
      return;
    }

    if (dragRef.current) {
      dragRef.current = null;
      needsCommitRef.current = true;
      setElements(prev => [...prev]);
    }
    if (!drawing.current) return;
    drawing.current = false;
    const pts = currentPath.current;
    liveShape.current = null;
    if (pts.length < 2) { currentPath.current = []; redraw(); return; }

    const startPt = pts[0];
    const endPt   = pts[pts.length - 1];
    const minDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
    if (minDist < 3) { currentPath.current = []; redraw(); return; }

    let newEl = null;
    if (tool === 'pen' || tool === 'eraser') {
      newEl = { type: 'path', points: pts, color: tool === 'eraser' ? '#020617' : color, size: tool === 'eraser' ? strokeSize * 5 : strokeSize };
    } else if (tool === 'rect') {
      newEl = {
        type: 'rect',
        x: startPt.x,
        y: startPt.y,
        w: endPt.x - startPt.x,
        h: endPt.y - startPt.y,
        color,
        size: strokeSize,
        fill: getFillColor(color, 0.16),
        fillStyle: 'solid',
        radius: 12,
      };
    } else if (tool === 'circle') {
      newEl = {
        type: 'circle',
        x: startPt.x,
        y: startPt.y,
        w: endPt.x - startPt.x,
        h: endPt.y - startPt.y,
        color,
        size: strokeSize,
        fill: getFillColor(color, 0.16),
        fillStyle: 'solid',
      };
    } else if (tool === 'arrow') {
      const midX = (startPt.x + endPt.x) / 2;
      const midY = (startPt.y + endPt.y) / 2;
      newEl = {
        type: 'arrow',
        x: startPt.x,
        y: startPt.y,
        x2: endPt.x,
        y2: endPt.y,
        cpx: midX,
        cpy: midY,
        color,
        size: strokeSize,
      };
    } else if (tool === 'frame') {
      const minX = Math.min(startPt.x, endPt.x);
      const minY = Math.min(startPt.y, endPt.y);
      const w = Math.abs(endPt.x - startPt.x);
      const h = Math.abs(endPt.y - startPt.y);
      newEl = { type: 'frame', x: minX, y: minY, w, h, color: '#6366f1', size: 2, title: 'Frame' };
    }
    if (newEl) { const next = [...elements, newEl]; setElements(next); commitToHistory(next); }
    currentPath.current = [];
    redraw();
  };

  // ── Multi-Touch Events (Touchscreen, iPad, Mobile) ────────
  const openContextMenuAt = (clientX, clientY) => {
    const pos = screenToWorld(clientX, clientY);
    let hit = null;

    // Check hit on all elements (from top to bottom)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (hitTestElement(el, pos)) {
        hit = i;
        break;
      }
    }

    if (hit !== null) {
      if (!selectedIds.includes(hit)) {
        setSelectedId(hit);
        setSelectedIds([hit]);
      }
      setContextMenu({
        x: clientX,
        y: clientY,
        worldPos: pos,
        hasHit: true,
        elIdx: hit,
      });
    } else {
      setContextMenu({
        x: clientX,
        y: clientY,
        worldPos: pos,
        hasHit: false,
        elIdx: null,
      });
    }
  };

  const onTouchStart = (e) => {
    // Clear any previous long-press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (e.touches.length === 2) {
      // 2-finger gesture: Pan & Pinch-to-zoom
      if (drawing.current) {
        drawing.current = false;
        currentPath.current = [];
        liveShape.current = null;
        redraw();
      }
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoomRef.current;
      panDragRef.current = {
        startClient: { x: midX, y: midY },
        startPan: { ...panOffsetRef.current },
      };
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();
      const lastTap = lastTapRef.current;
      const timeDiff = now - lastTap.time;
      const distDiff = Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y);

      // Check for Double-Tap: two taps within 320ms and within 25px
      if (timeDiff < 320 && distDiff < 25) {
        // Double-tap detected -> trigger context menu
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        openContextMenuAt(t.clientX, t.clientY);
        return;
      }
      lastTapRef.current = { time: now, x: t.clientX, y: t.clientY };
      touchStartPosRef.current = { x: t.clientX, y: t.clientY };

      // Set Long-Press timer: hold finger in place for 450ms -> triggers context menu
      longPressTimerRef.current = setTimeout(() => {
        openContextMenuAt(t.clientX, t.clientY);
        longPressTimerRef.current = null;
      }, 450);

      onMouseDown({
        clientX: t.clientX,
        clientY: t.clientY,
        button: 0,
        shiftKey: false,
        preventDefault: () => {},
      });
    }
  };

  const onTouchMove = (e) => {
    // If finger moves more than 8px, cancel the long press
    if (longPressTimerRef.current && touchStartPosRef.current && e.touches.length === 1) {
      const t = e.touches[0];
      const dist = Math.hypot(t.clientX - touchStartPosRef.current.x, t.clientY - touchStartPosRef.current.y);
      if (dist > 8) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      // Handle pinch zoom
      if (pinchStartDistRef.current && dist > 10) {
        const factor = dist / pinchStartDistRef.current;
        const newZ = Math.min(4, Math.max(0.1, pinchStartZoomRef.current * factor));
        setZoom(parseFloat(newZ.toFixed(2)));
      }

      // Handle two-finger pan
      if (panDragRef.current) {
        const dx = midX - panDragRef.current.startClient.x;
        const dy = midY - panDragRef.current.startClient.y;
        const newPan = {
          x: panDragRef.current.startPan.x + dx,
          y: panDragRef.current.startPan.y + dy,
        };
        setPanOffset(newPan);
        panOffsetRef.current = newPan;
        redraw();
      }
      return;
    }

    if (e.touches.length === 1 && !pinchStartDistRef.current) {
      const t = e.touches[0];
      onMouseMove({
        clientX: t.clientX,
        clientY: t.clientY,
      });
    }
  };

  const onTouchEnd = (e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
    if (e.touches.length === 0) {
      panDragRef.current = null;
      onMouseUp(e);
    }
  };

  // ── Clipboard & Context Actions (Cut, Copy, Paste, Duplicate, Layering) ──
  const handleCopySelected = () => {
    const targets = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (targets.length === 0) return;
    const copiedElements = targets
      .map(i => elements[i])
      .filter(Boolean)
      .map(el => JSON.parse(JSON.stringify(el)));
    clipboardRef.current = {
      elements: copiedElements,
      originTime: Date.now(),
    };
    setContextMenu(null);
  };

  const handleCutSelected = () => {
    const targets = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (targets.length === 0) return;
    handleCopySelected();
    handleDeleteSelected();
  };

  const handleInsertUrl = (urlStr, worldPos = null) => {
    if (!urlStr) return;
    const cleanUrl = parsePastedUrl(urlStr);
    if (!cleanUrl) return;

    let targetX, targetY;
    if (worldPos) {
      targetX = worldPos.x;
      targetY = worldPos.y;
    } else {
      const canvas = canvasRef.current;
      const z = zoomRef.current || 1;
      const pan = panOffsetRef.current || { x: 0, y: 0 };
      const cw = canvas ? canvas.width : 800;
      const ch = canvas ? canvas.height : 600;
      targetX = (cw / 2 - pan.x) / z - 210;
      targetY = (ch / 2 - pan.y) / z - 130;
    }

    const ytid = extractYouTubeVideoId(cleanUrl);
    let newElement;

    if (ytid) {
      newElement = {
        type: 'embed',
        embedType: 'youtube',
        videoId: ytid,
        url: cleanUrl,
        title: 'YouTube Video',
        x: Math.round(targetX),
        y: Math.round(targetY),
        w: 420,
        h: 260,
        rotation: 0,
      };
    } else {
      let hostname = cleanUrl;
      try {
        hostname = new URL(cleanUrl).hostname;
      } catch (_) {}

      newElement = {
        type: 'link',
        url: cleanUrl,
        title: hostname,
        x: Math.round(targetX),
        y: Math.round(targetY),
        w: 360,
        h: 150,
        rotation: 0,
      };
    }

    const next = [...elements, newElement];
    setElements(next);
    commitToHistory(next);
    const newIdx = next.length - 1;
    setSelectedIds([newIdx]);
    setSelectedId(newIdx);
    setTool('select');
    setContextMenu(null);
  };

  const handlePasteAt = async (worldPos = null) => {
    // 1. If internal whiteboard items are copied in clipboardRef, paste them
    if (clipboardRef.current && clipboardRef.current.elements?.length) {
      const items = clipboardRef.current.elements;

      let targetX, targetY;
      if (worldPos) {
        targetX = worldPos.x;
        targetY = worldPos.y;
      }

      let minX = Infinity, minY = Infinity;
      items.forEach(el => {
        const ex = el.x ?? 0;
        const ey = el.y ?? 0;
        if (ex < minX) minX = ex;
        if (ey < minY) minY = ey;
      });

      const offset = 24;
      const pasted = [];
      const newIndices = [];

      items.forEach(item => {
        const clone = JSON.parse(JSON.stringify(item));
        if (worldPos && minX !== Infinity && minY !== Infinity) {
          const relX = (clone.x ?? 0) - minX;
          const relY = (clone.y ?? 0) - minY;
          clone.x = targetX + relX;
          clone.y = targetY + relY;
          if (clone.type === 'arrow' && clone.x2 !== undefined && clone.y2 !== undefined) {
            const dx = clone.x2 - (item.x ?? 0);
            const dy = clone.y2 - (item.y ?? 0);
            clone.x2 = clone.x + dx;
            clone.y2 = clone.y + dy;
          }
          if (clone.type === 'path' && clone.points) {
            clone.points = clone.points.map(p => ({
              x: p.x - minX + targetX,
              y: p.y - minY + targetY,
            }));
          }
        } else {
          // Standard duplicate/paste offset
          if (clone.type === 'path' && clone.points) {
            clone.points = clone.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
          } else if (clone.type === 'arrow') {
            clone.x = (clone.x ?? 0) + offset;
            clone.y = (clone.y ?? 0) + offset;
            clone.x2 = (clone.x2 ?? 0) + offset;
            clone.y2 = (clone.y2 ?? 0) + offset;
          } else {
            clone.x = (clone.x ?? 0) + offset;
            clone.y = (clone.y ?? 0) + offset;
          }
        }
        newIndices.push(elements.length + pasted.length);
        pasted.push(clone);
      });

      if (pasted.length > 0) {
        const next = [...elements, ...pasted];
        setElements(next);
        commitToHistory(next);
        setSelectedIds(newIndices);
        setSelectedId(newIndices[newIndices.length - 1]);
        setTool('select');
      }
      setContextMenu(null);
      return;
    }

    // 2. Otherwise try reading text from the system clipboard (external copy URL)
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && parsePastedUrl(text)) {
          handleInsertUrl(text, worldPos);
          return;
        }
      }
    } catch (_) {}

    setContextMenu(null);
  };

  const handleSelectAll = () => {
    if (elements.length === 0) return;
    const all = elements.map((_, i) => i);
    setSelectedIds(all);
    setSelectedId(elements.length - 1);
    setTool('select');
    setContextMenu(null);
  };

  // Layer Reordering Handlers (Forward, Backward, Front, Back)
  const handleBringForward = () => {
    const targets = selectedIds.length > 0 ? [...selectedIds] : (selectedId !== null ? [selectedId] : []);
    if (targets.length === 0) return;
    // Sort ascending to move higher indices first without colliding
    const sorted = [...targets].sort((a, b) => b - a);
    const next = [...elements];
    const newSelected = new Set(targets);

    sorted.forEach(idx => {
      if (idx < next.length - 1 && !newSelected.has(idx + 1)) {
        const temp = next[idx];
        next[idx] = next[idx + 1];
        next[idx + 1] = temp;
        newSelected.delete(idx);
        newSelected.add(idx + 1);
      }
    });

    setElements(next);
    commitToHistory(next);
    const updatedArr = Array.from(newSelected);
    setSelectedIds(updatedArr);
    setSelectedId(updatedArr[updatedArr.length - 1] ?? null);
    setContextMenu(null);
  };

  const handleSendBackward = () => {
    const targets = selectedIds.length > 0 ? [...selectedIds] : (selectedId !== null ? [selectedId] : []);
    if (targets.length === 0) return;
    const sorted = [...targets].sort((a, b) => a - b);
    const next = [...elements];
    const newSelected = new Set(targets);

    sorted.forEach(idx => {
      if (idx > 0 && !newSelected.has(idx - 1)) {
        const temp = next[idx];
        next[idx] = next[idx - 1];
        next[idx - 1] = temp;
        newSelected.delete(idx);
        newSelected.add(idx - 1);
      }
    });

    setElements(next);
    commitToHistory(next);
    const updatedArr = Array.from(newSelected);
    setSelectedIds(updatedArr);
    setSelectedId(updatedArr[updatedArr.length - 1] ?? null);
    setContextMenu(null);
  };

  const handleBringToFront = () => {
    const targets = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (targets.length === 0) return;
    const moving = targets.map(i => elements[i]).filter(Boolean);
    const remaining = elements.filter((_, i) => !targets.includes(i));
    const next = [...remaining, ...moving];
    setElements(next);
    commitToHistory(next);
    const newIndices = moving.map((_, i) => remaining.length + i);
    setSelectedIds(newIndices);
    setSelectedId(newIndices[newIndices.length - 1] ?? null);
    setContextMenu(null);
  };

  const handleSendToBack = () => {
    const targets = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (targets.length === 0) return;
    const moving = targets.map(i => elements[i]).filter(Boolean);
    const remaining = elements.filter((_, i) => !targets.includes(i));
    const next = [...moving, ...remaining];
    setElements(next);
    commitToHistory(next);
    const newIndices = moving.map((_, i) => i);
    setSelectedIds(newIndices);
    setSelectedId(newIndices[newIndices.length - 1] ?? null);
    setContextMenu(null);
  };

  // Right-click / two-finger tap context menu (works anywhere on canvas and on any element)
  const onContextMenu = (e) => {
    e.preventDefault();
    openContextMenuAt(e.clientX, e.clientY);
  };

  // Double click (or double tap on touchpad) to trigger context menu on canvas/elements
  const onDoubleClick = (e) => {
    if (e.button === 0) {
      openContextMenuAt(e.clientX, e.clientY);
    }
  };

  const handleDeleteSelected = () => {
    const targets = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (targets.length === 0) return;
    const next = elements.filter((_, i) => !targets.includes(i));
    setElements(next);
    commitToHistory(next);
    setSelectedId(null);
    setSelectedIds([]);
  };

  const handleUpdateSelectedElement = (updates) => {
    const targets = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (targets.length === 0) return;
    const next = elements.map((el, i) => {
      if (targets.includes(i)) {
        return { ...el, ...updates };
      }
      return el;
    });
    setElements(next);
    commitToHistory(next);
  };

  const handleApplyTemplate = (tpl) => {
    if (!tpl || typeof tpl.createElements !== 'function') return;
    const newItems = tpl.createElements();
    const next = [...elements, ...newItems];
    setElements(next);
    commitToHistory(next);
  };

  const handleImageInsert = (src, isVideo, title) => {
    setShowLibrary('none');
    if (!src) return;

    if (isVideo) {
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      let loaded = false;
      const onReady = () => {
        if (loaded) return;
        loaded = true;
        const maxW = 480, maxH = 360;
        const vw = video.videoWidth || 320;
        const vh = video.videoHeight || 240;
        const ratio = Math.min(1, Math.min(maxW / vw, maxH / vh));
        const next = [...elements, {
          type: 'image',
          img: video,
          isVideo: true,
          title: title || 'Video',
          isPlaying: false,
          src,
          x: 60, y: 60,
          w: Math.round(vw * ratio),
          h: Math.round(vh * ratio)
        }];
        setElements(next);
        commitToHistory(next);
      };

      video.onloadeddata = () => { try { video.currentTime = 0.1; } catch (_) {} };
      video.onseeked = onReady;
      video.oncanplay = () => { setTimeout(onReady, 300); };
      video.onerror = () => {
        if (video.crossOrigin) {
          video.crossOrigin = null;
          video.src = src;
          video.load();
        } else {
          setMediaLoadError('Could not load video for preview.');
        }
      };
      video.src = src;
      video.load();
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const maxW = 480, maxH = 360;
        const iw = img.naturalWidth || img.width || 320;
        const ih = img.naturalHeight || img.height || 240;
        const ratio = Math.min(1, Math.min(maxW / iw, maxH / ih));
        const next = [...elements, {
          type: 'image',
          img,
          title: title || 'Image',
          src,
          x: 60, y: 60,
          w: Math.round(iw * ratio),
          h: Math.round(ih * ratio)
        }];
        setElements(next);
        commitToHistory(next);
      };
      img.onerror = () => {
        if (img.crossOrigin) {
          img.crossOrigin = null;
          img.src = src;
        } else {
          setMediaLoadError('Could not load image.');
        }
      };
      img.src = src;
    }
  };

  const handleToolClick = (t) => {
    if (t === 'image') { setShowLibrary('images'); return; }
    if (t === 'video') { setShowLibrary('videos'); return; }
    setTool(t);
    setSelectedId(null);
    setSelectedIds([]);
  };

  const handleUndo = () => {
    if (historyStepRef.current > 0) {
      historyStepRef.current -= 1;
      setElements(historyRef.current[historyStepRef.current]);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyStepRef.current += 1;
      setElements(historyRef.current[historyStepRef.current]);
      setHasUnsavedChanges(true);
    }
  };

  const handleClear = () => {
    if (window.confirm('Clear the whiteboard?')) {
      setElements([]);
      setSelectedId(null);
      commitToHistory([]);
    }
  };

  const handleZoomIn  = () => setZoom(z => Math.min(4, parseFloat((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom(z => Math.max(0.1, parseFloat((z - 0.25).toFixed(2))));
  const handleZoomReset = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

  const handleDuplicateSelected = () => {
    const targets = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (targets.length === 0) return;
    const offset = 24;
    const duplicated = [];
    const newIndices = [];

    targets.forEach((idx) => {
      const el = elements[idx];
      if (!el) return;
      let dup = { ...el };
      if (dup.type === 'path' && dup.points) {
        dup.points = dup.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
      } else if (dup.type === 'arrow') {
        dup.x += offset; dup.y += offset;
        dup.x2 += offset; dup.y2 += offset;
      } else {
        dup.x = (dup.x || 0) + offset;
        dup.y = (dup.y || 0) + offset;
      }
      newIndices.push(elements.length + duplicated.length);
      duplicated.push(dup);
    });

    if (duplicated.length > 0) {
      const next = [...elements, ...duplicated];
      setElements(next);
      commitToHistory(next);
      setSelectedIds(newIndices);
      setSelectedId(newIndices[newIndices.length - 1]);
    }
  };

  const handleZoomToFit = () => {
    if (elements.length === 0) {
      handleZoomReset();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    elements.forEach(el => {
      if (el.type === 'image' || el.type === 'rect' || el.type === 'frame' || el.type === 'embed' || el.type === 'link') {
        minX = Math.min(minX, el.x); maxX = Math.max(maxX, el.x + (el.w || 0));
        minY = Math.min(minY, el.y); maxY = Math.max(maxY, el.y + (el.h || 0));
      } else if (el.type === 'circle') {
        const rx = Math.abs((el.w || 0) / 2), ry = Math.abs((el.h || 0) / 2);
        const cx = el.x + (el.w || 0) / 2, cy = el.y + (el.h || 0) / 2;
        minX = Math.min(minX, cx - rx); maxX = Math.max(maxX, cx + rx);
        minY = Math.min(minY, cy - ry); maxY = Math.max(maxY, cy + ry);
      } else if (el.type === 'arrow') {
        minX = Math.min(minX, el.x, el.x2); maxX = Math.max(maxX, el.x, el.x2);
        minY = Math.min(minY, el.y, el.y2); maxY = Math.max(maxY, el.y, el.y2);
      } else if (el.type === 'text') {
        minX = Math.min(minX, el.x); maxX = Math.max(maxX, el.x + 160);
        minY = Math.min(minY, el.y - (el.fontSize || 20)); maxY = Math.max(maxY, el.y);
      } else if (el.type === 'path' && el.points?.length) {
        el.points.forEach(p => {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        });
      }
    });

    if (!isFinite(minX) || !isFinite(maxX)) {
      handleZoomReset();
      return;
    }

    const boxW = Math.max(50, maxX - minX);
    const boxH = Math.max(50, maxY - minY);
    const pad = 60;
    const availW = canvas.width - pad * 2;
    const availH = canvas.height - pad * 2;

    const newZoom = Math.min(2.5, Math.max(0.15, Math.min(availW / boxW, availH / boxH)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newPan = {
      x: canvas.width / 2 - centerX * newZoom,
      y: canvas.height / 2 - centerY * newZoom,
    };

    setZoom(parseFloat(newZoom.toFixed(2)));
    setPanOffset(newPan);
    panOffsetRef.current = newPan;
  };

  const commitTextPrompt = () => {
    const text = textPromptValue.trim();
    if (text && textPrompt) {
      const next = [...elements, { type: 'text', text, x: textPrompt.x, y: textPrompt.y, color, fontSize: 20 + strokeSize * 2 }];
      setElements(next); commitToHistory(next);
    }
    setTextPrompt(null);
  };

  const handleNameCommit = () => {
    if (nameCommittedRef.current) return;
    nameCommittedRef.current = true;
    const trimmed = nameDraft.trim() || generateDefaultName();
    setBoardName(trimmed);
    setEditingName(false);
    setIsSaved(false);
    fetch(`${SERVER_URL}/boards/${board.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
      body: JSON.stringify({ name: trimmed }),
    }).catch(console.error);
  };

  // Generate thumbnail
  const generateThumbnail = () => {
    try {
      const src = canvasRef.current;
      if (!src) return null;
      if (src.width === 0 || src.height === 0) return null;
      const THUMB_W = 320, THUMB_H = 180;
      const tc = document.createElement('canvas');
      tc.width = THUMB_W; tc.height = THUMB_H;
      const ctx = tc.getContext('2d');
      ctx.fillStyle = '#0a0f1c';
      ctx.fillRect(0, 0, THUMB_W, THUMB_H);
      const scale = Math.min(THUMB_W / src.width, THUMB_H / src.height);
      const dw = src.width * scale, dh = src.height * scale;
      ctx.drawImage(src, (THUMB_W - dw) / 2, (THUMB_H - dh) / 2, dw, dh);
      return tc.toDataURL('image/jpeg', 0.45);
    } catch (e) {
      console.error('Failed to generate thumbnail:', e);
      return null;
    }
  };

  const handleSave = useCallback(async (isSilent = false) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    const thumbnail = generateThumbnail();
    const elementsToSave = elements.map(el => {
      if (el.type === 'image') {
        const { img, ...rest } = el;
        return rest;
      }
      return el;
    });

    try {
      const stateContent = JSON.stringify({ elements: elementsToSave });
      const currentItemId = boardStateItemIdRef.current || boardStateItemId;
      if (currentItemId) {
        const res = await fetch(`${SERVER_URL}/boards/${board.id}/items/${currentItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
          body: JSON.stringify({ content: stateContent }),
        });
        if (!res.ok) {
          let errDetail = `HTTP ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson?.error || errJson?.message) errDetail = errJson.error || errJson.message;
          } catch (_) {}
          throw new Error(`Failed to save: ${errDetail}`);
        }
      } else {
        const res = await fetch(`${SERVER_URL}/boards/${board.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
          body: JSON.stringify({ type: 'board_state', content: stateContent }),
        });
        if (!res.ok) {
          let errDetail = `HTTP ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson?.error || errJson?.message) errDetail = errJson.error || errJson.message;
          } catch (_) {}
          throw new Error(`Failed to save: ${errDetail}`);
        }
        const d = await res.json();
        if (d.item) {
          setBoardStateItemId(d.item.id);
          boardStateItemIdRef.current = d.item.id;
        }
      }

      if (thumbnail) {
        fetch(`${SERVER_URL}/boards/${board.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
          body: JSON.stringify({ thumbnail }),
        }).catch((err) => console.warn('Thumbnail upload warning:', err));
      }

      setHasUnsavedChanges(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Save failed', err);
      if (!isSilent) {
        setSaveError(err.message || 'Save failed — your changes are still here, but not on the server yet. Try again.');
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [board?.id, boardStateItemId, elements, user?.jwt]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasUnsavedChanges || !board?.id || !user?.jwt) return;
    const timer = setTimeout(() => { handleSave(true); }, 1500);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, elements, board?.id, user?.jwt, handleSave]);

  // ── Keyboard Shortcuts (Standard Canvas / Figma / Miro shortcuts) ──
  useEffect(() => {
    const onKeyDown = (e) => {
      // Don't intercept if user is typing in an input, textarea, or contentEditable
      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
         target.tagName === 'TEXTAREA' ||
         target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // Help Modal: ?
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // Spacebar hold for temporary hand / pan tool
      if (e.code === 'Space' && !e.repeat && !spacePressedRef.current) {
        e.preventDefault();
        spacePressedRef.current = true;
        setIsSpacePressed(true);
        return;
      }

      // Undo: Ctrl/Cmd + Z (without shift)
      if (cmdOrCtrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl/Cmd + Y OR Ctrl/Cmd + Shift + Z
      if ((cmdOrCtrl && key === 'y') || (cmdOrCtrl && e.shiftKey && key === 'z')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Save: Ctrl/Cmd + S
      if (cmdOrCtrl && key === 's') {
        e.preventDefault();
        handleSave(false);
        return;
      }

      // Select All: Ctrl/Cmd + A
      if (cmdOrCtrl && key === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Copy: Ctrl/Cmd + C
      if (cmdOrCtrl && key === 'c') {
        e.preventDefault();
        handleCopySelected();
        return;
      }

      // Cut: Ctrl/Cmd + X
      if (cmdOrCtrl && key === 'x') {
        e.preventDefault();
        handleCutSelected();
        return;
      }

      // Paste: Ctrl/Cmd + V
      if (cmdOrCtrl && key === 'v') {
        e.preventDefault();
        handlePasteAt();
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if (cmdOrCtrl && key === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Layer Order: Bring to Front (Ctrl+Shift+]) or Bring Forward (Ctrl+])
      if (cmdOrCtrl && e.key === ']') {
        e.preventDefault();
        if (e.shiftKey) handleBringToFront();
        else handleBringForward();
        return;
      }

      // Layer Order: Send to Back (Ctrl+Shift+[) or Send Backward (Ctrl+[)
      if (cmdOrCtrl && e.key === '[') {
        e.preventDefault();
        if (e.shiftKey) handleSendToBack();
        else handleSendBackward();
        return;
      }

      // Zoom In: Ctrl/Cmd + '+' or '='
      if (cmdOrCtrl && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // Zoom Out: Ctrl/Cmd + '-'
      if (cmdOrCtrl && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // Reset Zoom: Ctrl/Cmd + '0'
      if (cmdOrCtrl && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
        return;
      }

      // Zoom to Fit: Shift + 1 or Ctrl/Cmd + 9
      if ((e.shiftKey && e.key === '1') || (cmdOrCtrl && e.key === '9')) {
        e.preventDefault();
        handleZoomToFit();
        return;
      }

      // Delete / Backspace: Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Escape: Deselect, close modals, or switch to select tool
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowShortcutsModal(false);
        setShowTemplateModal(false);
        setShowLibrary('none');
        setTextPrompt(null);
        setContextMenu(null);
        if (selectedIds.length > 0 || selectedId !== null) {
          setSelectedId(null);
          setSelectedIds([]);
        } else {
          setTool('select');
        }
        return;
      }

      // Ignore single-key shortcuts if Cmd/Ctrl or Alt is held
      if (cmdOrCtrl || e.altKey) return;

      // Tool Switching Shortcuts
      if (key === 'v' || key === '1') {
        setTool('select');
      } else if (key === 'h') {
        setTool('pan');
      } else if (key === 'p' || key === '2') {
        setTool('pen');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'e') {
        setTool('eraser');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'r' || key === '3') {
        setTool('rect');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'o' || key === 'c') {
        setTool('circle');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'a') {
        setTool('arrow');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 'f') {
        setTool('frame');
        setSelectedId(null);
        setSelectedIds([]);
      } else if (key === 't' || key === '4') {
        setTool('text');
        setSelectedId(null);
        setSelectedIds([]);
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    const onPaste = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
         target.tagName === 'TEXTAREA' ||
         target.isContentEditable)
      ) {
        return;
      }

      // If text/URL is in clipboardData
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText) {
        const clean = parsePastedUrl(pastedText);
        if (clean) {
          e.preventDefault();
          handleInsertUrl(clean);
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('paste', onPaste);
    };
  }, [
    elements,
    selectedId,
    selectedIds,
    handleUndo,
    handleRedo,
    handleSave,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomToFit,
  ]);

  const handleClose = async () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      onClose();
    }
  };

  const getCursor = () => {
    if (tool === 'pan' || isSpacePressed) return panDragRef.current ? 'grabbing' : 'grab';
    if (tool === 'select') return 'default';
    if (tool === 'eraser') return 'cell';
    if (tool === 'text')   return 'text';
    return 'crosshair';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
      {/* ── Top Bar ── */}
      <WhiteboardTopbar
        boardName={boardName}
        editingName={editingName}
        nameDraft={nameDraft}
        nameInputRef={nameInputRef}
        setNameDraft={setNameDraft}
        setEditingName={setEditingName}
        handleNameCommit={handleNameCommit}
        nameCommittedRef={nameCommittedRef}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        handleSave={handleSave}
        isSaving={isSaving}
        isSaved={isSaved}
        saveError={saveError}
        hasUnsavedChanges={hasUnsavedChanges}
        handleClose={handleClose}
        onOpenShare={() => setShowShareModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
      />

      {(loadError || saveError) && (
        <div style={{ background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '12px', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '16px', flexShrink: 0 }}>warning</span>
          {loadError || saveError}
        </div>
      )}

      {/* ── Content Row ── */}
      <div className="wb-body">
        {/* Left Toolbar */}
        <WhiteboardToolbar
          tool={tool}
          onToolClick={handleToolClick}
        />

        {/* Canvas Area */}
        <div
          className="wb-canvas-area"
          style={{
            background: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          {/* Floating Contextual Tool Properties Bar */}
          <WhiteboardContextBar
            tool={tool}
            selectedElement={selectedId !== null ? elements[selectedId] : null}
            selectedCount={selectedIds.length > 0 ? selectedIds.length : (selectedId !== null ? 1 : 0)}
            color={color}
            strokeSize={strokeSize}
            setColor={setColor}
            setStrokeSize={setStrokeSize}
            onOpenTemplates={() => setShowTemplateModal(true)}
            onUpdateSelectedElement={handleUpdateSelectedElement}
            onDeleteSelected={handleDeleteSelected}
          />

          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: '100%', cursor: getCursor(), touchAction: 'none' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
            onContextMenu={onContextMenu}
            onDoubleClick={onDoubleClick}
          />

          {/* Interactive HTML Overlays for Playable YouTube Embeds and Link Cards */}
          <div className="wb-embed-container">
            <div
              className="wb-embed-layer"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              }}
            >
              {elements.map((el, idx) => {
                if (el.type !== 'embed' && el.type !== 'link') return null;
                const isSelected = selectedIds.includes(idx) || selectedId === idx;
                const isPlaying = activeVideoEmbedId === idx;

                if (el.type === 'embed') {
                  const thumbUrl = el.videoId
                    ? `https://img.youtube.com/vi/${el.videoId}/hqdefault.jpg`
                    : null;

                  return (
                    <div
                      key={idx}
                      className={`wb-embed-card ${isSelected ? 'wb-embed-card--selected' : ''}`}
                      style={{
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        width: `${el.w || 420}px`,
                        height: `${el.h || 260}px`,
                        transform: el.rotation ? `rotate(${el.rotation}rad)` : undefined,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="wb-embed-header"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedId(idx);
                          setSelectedIds([idx]);
                          setTool('select');
                          const pos = screenToWorld(e.clientX, e.clientY);
                          const movingIndices = [idx];
                          const initialSnapshots = {
                            [idx]: {
                              x: el.x, y: el.y,
                              w: el.w, h: el.h,
                              x2: el.x2, y2: el.y2,
                              points: el.points ? el.points.map(p => ({ ...p })) : null,
                            }
                          };
                          dragRef.current = {
                            idx,
                            isResize: false,
                            startX: pos.x,
                            startY: pos.y,
                            movingIndices,
                            initialSnapshots,
                            origX: el.x, origY: el.y,
                            origW: el.w || 0, origH: el.h || 0,
                            origX2: el.x2, origY2: el.y2,
                            origCpx: el.x, origCpy: el.y,
                            origPoints: null,
                          };
                        }}
                      >
                        <span className="wb-embed-badge wb-embed-badge--youtube">
                          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>smart_display</span>
                          YouTube
                        </span>
                        <span className="wb-embed-title">{el.title || 'YouTube Video'}</span>
                        <button
                          type="button"
                          className="wb-embed-action-btn"
                          title="Open on YouTube"
                          aria-label="Open on YouTube"
                          onClick={() => window.open(el.url || `https://www.youtube.com/watch?v=${el.videoId}`, '_blank', 'noopener,noreferrer')}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>open_in_new</span>
                        </button>
                        <button
                          type="button"
                          className="wb-embed-action-btn"
                          title={isPlaying ? "Stop Video" : "Play Inline"}
                          aria-label={isPlaying ? "Stop Video" : "Play Inline"}
                          onClick={() => setActiveVideoEmbedId(isPlaying ? null : idx)}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '16px', color: isPlaying ? '#f87171' : '#38bdf8' }}>
                            {isPlaying ? 'stop_circle' : 'play_circle'}
                          </span>
                        </button>
                      </div>

                      <div className="wb-embed-body">
                        {isPlaying ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${el.videoId}?autoplay=1&rel=0&modestbranding=1`}
                            title={el.title || 'YouTube Video'}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div
                            className="wb-embed-placeholder"
                            style={{
                              backgroundImage: thumbUrl ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.6)), url(${thumbUrl})` : undefined,
                            }}
                            onClick={() => {
                              setSelectedId(idx);
                              setSelectedIds([idx]);
                              setActiveVideoEmbedId(idx);
                            }}
                          >
                            <div className="wb-embed-play-btn" title="Click to play video">
                              <span className="material-symbols-rounded" style={{ fontSize: '30px', transform: 'translateX(2px)' }}>play_arrow</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (el.type === 'link') {
                  let hostname = el.url;
                  try {
                    hostname = new URL(el.url).hostname;
                  } catch (_) {}

                  return (
                    <div
                      key={idx}
                      className={`wb-embed-card ${isSelected ? 'wb-embed-card--selected' : ''}`}
                      style={{
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        width: `${el.w || 360}px`,
                        height: `${el.h || 150}px`,
                        transform: el.rotation ? `rotate(${el.rotation}rad)` : undefined,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="wb-embed-header"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedId(idx);
                          setSelectedIds([idx]);
                          setTool('select');
                          const pos = screenToWorld(e.clientX, e.clientY);
                          const movingIndices = [idx];
                          const initialSnapshots = {
                            [idx]: {
                              x: el.x, y: el.y,
                              w: el.w, h: el.h,
                              x2: el.x2, y2: el.y2,
                              points: el.points ? el.points.map(p => ({ ...p })) : null,
                            }
                          };
                          dragRef.current = {
                            idx,
                            isResize: false,
                            startX: pos.x,
                            startY: pos.y,
                            movingIndices,
                            initialSnapshots,
                            origX: el.x, origY: el.y,
                            origW: el.w || 0, origH: el.h || 0,
                            origX2: el.x2, origY2: el.y2,
                            origCpx: el.x, origCpy: el.y,
                            origPoints: null,
                          };
                        }}
                      >
                        <span className="wb-embed-badge wb-embed-badge--link">
                          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>link</span>
                          Link
                        </span>
                        <span className="wb-embed-title">{el.title || hostname}</span>
                        <button
                          type="button"
                          className="wb-embed-action-btn"
                          title="Open in new tab"
                          aria-label="Open in new tab"
                          onClick={() => window.open(el.url, '_blank', 'noopener,noreferrer')}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>open_in_new</span>
                        </button>
                      </div>

                      <a
                        href={el.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wb-link-card-body"
                        onClick={(e) => {
                          setSelectedId(idx);
                          setSelectedIds([idx]);
                        }}
                      >
                        <div>
                          <div className="wb-link-host">
                            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>language</span>
                            <span>{hostname}</span>
                          </div>
                          <div className="wb-link-url" style={{ marginTop: '8px' }}>
                            {el.url}
                          </div>
                        </div>

                        <div className="wb-link-btn">
                          <span>Visit Website</span>
                          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>arrow_forward</span>
                        </div>
                      </a>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="wb-statusbar">
        <div className="wb-status-left">
          <span className="hide-below-sm" style={{ fontSize: '11px', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>AntCapture Whiteboard</span>
          <span className="hide-below-sm" style={{ fontSize: '11px', color: '#334155' }}>·</span>
          <span className="material-symbols-rounded" style={{ fontSize: '13px', color: 'var(--text-faint)', flexShrink: 0 }}>
            {TOOLS.find(t => t.id === tool)?.icon || 'near_me'}
          </span>
          <span className="truncate" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            {tool === 'pen'    && 'Click and drag to draw freely'}
            {tool === 'eraser' && 'Drag over strokes to erase'}
            {tool === 'text'   && 'Click anywhere to add text'}
            {tool === 'rect'   && 'Drag to draw a rectangle'}
            {tool === 'circle' && 'Drag to draw an ellipse'}
            {tool === 'arrow'  && 'Drag to draw an arrow'}
            {tool === 'select' && 'Click to select · Shift-click for multi-select · Drag to marquee'}
            {tool === 'pan'    && 'Drag to pan the canvas · Use Ctrl+Scroll to zoom'}
            {tool === 'image'  && 'Pick an image from your library'}
            {tool === 'video'  && 'Pick a video from your library'}
          </span>
        </div>
        <div className="hide-below-md" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: '#475569' }}>
            {Math.round(zoom * 100)}% · {elements.length} element{elements.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="wb-status-hint show-below-sm">Best on a larger screen</span>
      </div>

      {/* Library Picker */}
      {showLibrary !== 'none' && (
        <WhiteboardLibraryPicker
          user={user}
          onSelect={handleImageInsert}
          onClose={() => setShowLibrary('none')}
          initialTab={showLibrary}
        />
      )}

      {/* Share Modal */}
      {showShareModal && board?.id && (
        <WhiteboardShareModal
          board={board}
          boardName={boardName}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Whiteboard Shortcuts & Gestures Modal */}
      <WhiteboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Whiteboard Starter Templates Modal */}
      <WhiteboardTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleApplyTemplate}
      />

      {/* Right-click context menu */}
      <WhiteboardContextMenu
        contextMenu={contextMenu}
        hasSelection={selectedIds.length > 0 || selectedId !== null}
        hasClipboard={Boolean(clipboardRef.current?.elements?.length)}
        onCut={handleCutSelected}
        onCopy={handleCopySelected}
        onPaste={() => handlePasteAt(contextMenu?.worldPos)}
        onDuplicate={handleDuplicateSelected}
        onSelectAll={handleSelectAll}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
        onDelete={handleDeleteSelected}
        onClose={() => setContextMenu(null)}
      />

      {/* Exit Warning Modal */}
      <WhiteboardExitModal
        isOpen={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onDiscard={() => { setShowExitModal(false); onClose(); }}
        onSaveAndExit={async () => { setShowExitModal(false); await handleSave(); onClose(); }}
      />

      {/* Add Text Modal */}
      <WhiteboardTextPromptModal
        isOpen={Boolean(textPrompt)}
        value={textPromptValue}
        onChange={setTextPromptValue}
        onCommit={commitTextPrompt}
        onClose={() => setTextPrompt(null)}
      />

      {/* Media load failure toast */}
      {mediaLoadError && (
        <div className="wb-toast" role="alert" style={{ zIndex: 4500 }}>
          <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#f87171', flexShrink: 0 }}>error</span>
          <span style={{ fontSize: '13px', color: 'var(--danger-soft)', flex: 1, minWidth: 0 }}>{mediaLoadError}</span>
          <button onClick={() => setMediaLoadError(null)} className="wb-toast-close" aria-label="Dismiss">
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
      )}
    </div>
  );
}
