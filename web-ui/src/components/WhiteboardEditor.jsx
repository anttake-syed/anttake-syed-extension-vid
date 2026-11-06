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
import WhiteboardStatusBar from './whiteboard/WhiteboardStatusBar.jsx';
import WhiteboardEmbedLayer from './whiteboard/WhiteboardEmbedLayer.jsx';
import WhiteboardShapePickerModal from './whiteboard/WhiteboardShapePickerModal.jsx';
import WhiteboardIconPickerModal from './whiteboard/WhiteboardIconPickerModal.jsx';
import WhiteboardCodeModal from './whiteboard/WhiteboardCodeModal.jsx';
import { useWhiteboardShortcuts } from './whiteboard/useWhiteboardShortcuts.js';
import { renderWhiteboardCanvas } from './whiteboard/whiteboardRenderer.js';
import { TOOLS, COLORS, SIZES, generateDefaultName, BOUNDED_CANVAS_W, BOUNDED_CANVAS_H } from './whiteboard/whiteboardConstants.js';
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
  isElementInsideFrame,
  getContainedIndices,
} from './whiteboard/whiteboardTransform.js';
import { extractYouTubeVideoId, parsePastedUrl, compactElementsToBoard, areElementsOutsideBoard } from './whiteboard/whiteboardHelpers.js';

// ── Main WhiteboardEditor ────────────────────────────────────
export default function WhiteboardEditor({ board, onClose, user, hasCloudAccess, entitlements }) {
  const [boardName, setBoardName]         = useState(board?.name || generateDefaultName());
  const [editingName, setEditingName]     = useState(false);
  const [nameDraft, setNameDraft]         = useState(boardName);
  const [tool, setTool]                   = useState('select');
  const [color, setColor]                 = useState('#f8fafc');
  const [strokeSize, setStrokeSize]       = useState(4);
  const [showLibrary, setShowLibrary]     = useState('none'); // 'none', 'images', 'videos'
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showShapeModal, setShowShapeModal]       = useState(false);
  const [showIconModal, setShowIconModal]         = useState(false);
  const [showCodeModal, setShowCodeModal]         = useState(false);
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
  const [isDragging, setIsDragging]               = useState(false); // true while dragging embed/element
  const [infiniteCanvas, setInfiniteCanvas]       = useState(() => {
    try { return localStorage.getItem('wb_infinite_canvas') !== 'false'; } catch { return true; }
  });
  const [showCanvasModeModal, setShowCanvasModeModal] = useState(false);

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
  const isDraggingRef     = useRef(false); // true while any drag (incl. embed) is active
  const lastTapRef        = useRef({ time: 0, x: 0, y: 0 });
  const redrawRafRef      = useRef(null);  // pending requestAnimationFrame id for redraw

  // Keep refs in sync for use in event handlers
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  const infiniteCanvasRef = useRef(infiniteCanvas);
  useEffect(() => { infiniteCanvasRef.current = infiniteCanvas; }, [infiniteCanvas]);

  // Clamp pan so the bounded work area always stays at least partially visible
  const clampPan = useCallback((pan, z) => {
    if (infiniteCanvasRef.current) return pan; // infinite mode — no clamp
    const canvas = canvasRef.current;
    if (!canvas) return pan;
    const vw = canvas.width;
    const vh = canvas.height;
    const margin = 80; // px — minimum overlap the page must keep on-screen
    const pageW = BOUNDED_CANVAS_W * z;
    const pageH = BOUNDED_CANVAS_H * z;
    return {
      x: Math.min(vw - margin, Math.max(margin - pageW, pan.x)),
      y: Math.min(vh - margin, Math.max(margin - pageH, pan.y)),
    };
  }, []);

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

  const elementsRef       = useRef(elements);
  const selectedIdRef     = useRef(selectedId);
  const selectedIdsRef    = useRef(selectedIds);
  const toolRef           = useRef(tool);
  const colorRef          = useRef(color);
  const strokeSizeRef     = useRef(strokeSize);

  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { strokeSizeRef.current = strokeSize; }, [strokeSize]);

  // ── Canvas draw (double-buffered drawing) ──────────────────────────────────
  const drawCanvasNow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderWhiteboardCanvas(ctx, canvas, {
      elements: elementsRef.current,
      zoom: zoomRef.current,
      panOffset: panOffsetRef.current,
      tool: toolRef.current,
      color: colorRef.current,
      strokeSize: strokeSizeRef.current,
      selectedId: selectedIdRef.current,
      selectedIds: selectedIdsRef.current,
      currentPath: currentPath.current,
      liveShape: liveShape.current,
      marquee: marqueeRef.current,
      drawing: drawing.current,
      infiniteCanvas: infiniteCanvasRef.current,
    });
  }, []);

  const redraw = useCallback(() => {
    if (redrawRafRef.current) cancelAnimationFrame(redrawRafRef.current);
    redrawRafRef.current = requestAnimationFrame(() => {
      redrawRafRef.current = null;
      drawCanvasNow();
    });
  }, [drawCanvasNow]);

  useEffect(() => {
    drawCanvasNow();
  }, [elements, color, strokeSize, tool, selectedId, selectedIds, drawCanvasNow]);

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
    resize(); // initialize canvas dimensions immediately on mount
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

        // ── Instant canvas update ──────────────────────────────────────
        // Write to refs first so redraw() reads the NEW values this frame.
        // setZoom/setPanOffset are called after to sync the embed/HTML layer
        // (which is fine — CSS transform updates are imperceptible 1 frame later).
        const clampedZoomPan = clampPan(newPan, newZ);
        zoomRef.current    = newZ;
        panOffsetRef.current = clampedZoomPan;
        redraw();
        setZoom(newZ);
        setPanOffset(clampedZoomPan);
      } else {
        // Two-finger scroll on trackpad OR shift-wheel panning
        const dx = e.shiftKey ? -e.deltaY : -e.deltaX;
        const dy = e.shiftKey ? 0 : -e.deltaY;
        const rawPan = {
          x: panOffsetRef.current.x + dx,
          y: panOffsetRef.current.y + dy,
        };
        const clampedScrollPan = clampPan(rawPan, zoomRef.current);
        panOffsetRef.current = clampedScrollPan;
        redraw();
        setPanOffset(clampedScrollPan);
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
        } else if (el.type === 'embed' || el.type === 'link' || el.type === 'shape' || el.type === 'code' || el.type === 'icon') {
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

        // ── Frame Grouping & Containment Movement ──────────────────────
        // If the dragged element or any selected element is a frame,
        // automatically include all elements contained inside that frame!
        let movingIndices = newSelectedIds.includes(hit) ? [...newSelectedIds] : [hit];
        movingIndices.forEach(idx => {
          const el = elements[idx];
          if (el && el.type === 'frame') {
            const children = getContainedIndices(idx, elements);
            children.forEach(childIdx => {
              if (!movingIndices.includes(childIdx)) {
                movingIndices.push(childIdx);
              }
            });
          }
        });

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
        // Do NOT deselect immediately here — that causes a flicker where the
        // canvas clears then redraws while React has already nulled out the
        // selection state, producing a ~16 ms flash of "no objects".
        // Deselection is deferred to onMouseUp after the marquee resolves.
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
      const rawPan = {
        x: panDragRef.current.startPan.x + dx,
        y: panDragRef.current.startPan.y + dy,
      };
      const clampedDragPan = clampPan(rawPan, zoomRef.current);
      setPanOffset(clampedDragPan);
      panOffsetRef.current = clampedDragPan;
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
      } else {
        // Pure click on blank space (no meaningful marquee drag).
        // Deselect here — deferred from onMouseDown to avoid a flicker where the
        // canvas clears then redraws while the React tree has already nulled out
        // selection, producing a ~16 ms flash of "no objects".
        setSelectedId(null);
        setSelectedIds([]);
      }
      redraw();
      return;
    }

    if (dragRef.current) {
      dragRef.current = null;
      needsCommitRef.current = true;
      setElements(prev => [...prev]);
      setIsDragging(false);
      isDraggingRef.current = false;
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

      // Handle pinch zoom + zoom-toward-midpoint pan in one pass
      if (pinchStartDistRef.current && dist > 10) {
        const factor = dist / pinchStartDistRef.current;
        const currentZ = zoomRef.current;
        const newZ = parseFloat(Math.min(4, Math.max(0.1, pinchStartZoomRef.current * factor)).toFixed(2));

        // Zoom towards the midpoint between the two fingers
        const canvas = canvasRef.current;
        const rect   = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const cx = midX - rect.left;
        const cy = midY - rect.top;
        const scaleChange = newZ / currentZ;
        const currentPan  = panOffsetRef.current;
        const newPan = {
          x: cx - (cx - currentPan.x) * scaleChange,
          y: cy - (cy - currentPan.y) * scaleChange,
        };
        const clampedPinchPan = clampPan(newPan, newZ);

        // Instant canvas update — refs first, then React state
        zoomRef.current      = newZ;
        panOffsetRef.current = clampedPinchPan;
        redraw();
        setZoom(newZ);
        setPanOffset(clampedPinchPan);
      }

      // Handle two-finger pan (combined with zoom above when both happen)
      if (panDragRef.current) {
        const dx = midX - panDragRef.current.startClient.x;
        const dy = midY - panDragRef.current.startClient.y;
        const rawTouchPan = {
          x: panDragRef.current.startPan.x + dx,
          y: panDragRef.current.startPan.y + dy,
        };
        const clampedTouchPan = clampPan(rawTouchPan, zoomRef.current);
        panOffsetRef.current = clampedTouchPan;
        redraw();
        setPanOffset(clampedTouchPan);
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
    if (t === 'shapes') { setShowShapeModal(true); return; }
    if (t === 'icon') { setShowIconModal(true); return; }
    if (t === 'code') { setShowCodeModal(true); return; }
    setTool(t);
    setSelectedId(null);
    setSelectedIds([]);
  };

  const handleInsertShape = (shapeConfig) => {
    const canvas = canvasRef.current;
    const cw = canvas ? canvas.width / 2 : 400;
    const ch = canvas ? canvas.height / 2 : 300;
    const center = screenToWorld(cw, ch);
    const newEl = {
      type: 'shape',
      shapeType: shapeConfig.id,
      x: Math.round(center.x - shapeConfig.w / 2),
      y: Math.round(center.y - shapeConfig.h / 2),
      w: shapeConfig.w,
      h: shapeConfig.h,
      color,
      size: strokeSize,
      fillStyle: 'solid',
    };
    const next = [...elements, newEl];
    setElements(next);
    commitToHistory(next);
    setSelectedId(next.length - 1);
    setSelectedIds([next.length - 1]);
    setTool('select');
  };

  const handleInsertDeviceFrame = (deviceConfig) => {
    const canvas = canvasRef.current;
    const cw = canvas ? canvas.width / 2 : 500;
    const ch = canvas ? canvas.height / 2 : 400;
    const center = screenToWorld(cw, ch);
    const newEl = {
      type: 'frame',
      frameType: deviceConfig.id,
      title: deviceConfig.label,
      x: Math.round(center.x - deviceConfig.w / 2),
      y: Math.round(center.y - deviceConfig.h / 2),
      w: deviceConfig.w,
      h: deviceConfig.h,
      color: deviceConfig.id === 'browser' ? '#3b82f6' : deviceConfig.id === 'phone' ? '#6366f1' : deviceConfig.id === 'tablet' ? '#8b5cf6' : '#06b6d4',
      size: strokeSize,
    };
    const next = [...elements, newEl];
    setElements(next);
    commitToHistory(next);
    setSelectedId(next.length - 1);
    setSelectedIds([next.length - 1]);
    setTool('select');
  };

  const handleInsertIcon = (iconName) => {
    const canvas = canvasRef.current;
    const cw = canvas ? canvas.width / 2 : 400;
    const ch = canvas ? canvas.height / 2 : 300;
    const center = screenToWorld(cw, ch);
    const sz = 56;
    const newEl = {
      type: 'icon',
      icon: iconName,
      x: Math.round(center.x - sz / 2),
      y: Math.round(center.y - sz / 2),
      w: sz,
      h: sz,
      size: sz,
      color,
    };
    const next = [...elements, newEl];
    setElements(next);
    commitToHistory(next);
    setSelectedId(next.length - 1);
    setSelectedIds([next.length - 1]);
    setTool('select');
  };

  const handleInsertCode = ({ code: codeText, language }) => {
    const canvas = canvasRef.current;
    const cw = canvas ? canvas.width / 2 : 400;
    const ch = canvas ? canvas.height / 2 : 300;
    const center = screenToWorld(cw, ch);
    const w = 400;
    const h = 240;
    const newEl = {
      type: 'code',
      code: codeText,
      language: language || 'javascript',
      x: Math.round(center.x - w / 2),
      y: Math.round(center.y - h / 2),
      w,
      h,
      color: '#334155',
      size: 2,
    };
    const next = [...elements, newEl];
    setElements(next);
    commitToHistory(next);
    setSelectedId(next.length - 1);
    setSelectedIds([next.length - 1]);
    setTool('select');
  };

  // ── Smooth embed drag (beats iframe pointer-capture problem) ──
  const handleStartEmbedDrag = (e, idx) => {
    e.stopPropagation();
    setSelectedId(idx);
    setSelectedIds([idx]);
    setTool('select');
    setIsDragging(true);
    isDraggingRef.current = true;
    const pos = screenToWorld(e.clientX, e.clientY);
    const el = elements[idx];
    if (!el) return;
    dragRef.current = {
      idx,
      isResize: false,
      startX: pos.x,
      startY: pos.y,
      movingIndices: [idx],
      initialSnapshots: {
        [idx]: {
          x: el.x, y: el.y,
          w: el.w, h: el.h,
          x2: el.x2, y2: el.y2,
          points: el.points ? el.points.map(p => ({ ...p })) : null,
        },
      },
      origX: el.x, origY: el.y,
      origW: el.w || 0, origH: el.h || 0,
      origX2: el.x2, origY2: el.y2,
      origCpx: el.x, origCpy: el.y,
      origPoints: null,
    };
  };

  // Global pointer listeners so drag continues even over iframes
  useEffect(() => {
    const handleWindowPointerMove = (e) => {
      if (dragRef.current) onMouseMove(e);
    };
    const handleWindowPointerUp = (e) => {
      if (dragRef.current) {
        onMouseUp(e);
        setIsDragging(false);
        isDraggingRef.current = false;
      }
    };
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [onMouseMove, onMouseUp]);

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

  const handleZoomIn = () => {
    const newZ = Math.min(4, parseFloat((zoomRef.current + 0.25).toFixed(2)));
    zoomRef.current = newZ;
    redraw();
    setZoom(newZ);
  };
  const handleZoomOut = () => {
    const newZ = Math.max(0.1, parseFloat((zoomRef.current - 0.25).toFixed(2)));
    zoomRef.current = newZ;
    redraw();
    setZoom(newZ);
  };
  const handleZoomReset = () => {
    zoomRef.current = 1;
    panOffsetRef.current = { x: 0, y: 0 };
    redraw();
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

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

    const z = parseFloat(newZoom.toFixed(2));
    zoomRef.current = z;
    panOffsetRef.current = newPan;
    redraw();
    setZoom(z);
    setPanOffset(newPan);
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
  useWhiteboardShortcuts({
    elements,
    selectedId,
    selectedIds,
    setTool,
    setSelectedId,
    setSelectedIds,
    setIsSpacePressed,
    spacePressedRef,
    setShowShortcutsModal,
    setShowTemplateModal,
    setShowLibrary,
    setTextPrompt,
    setContextMenu,
    handleUndo,
    handleRedo,
    handleSave,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleSelectAll,
    handleCopySelected,
    handleCutSelected,
    handlePasteAt,
    handleInsertUrl,
    handleBringForward,
    handleSendBackward,
    handleBringToFront,
    handleSendToBack,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomToFit,
  });

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
        infiniteCanvas={infiniteCanvas}
        onToggleInfiniteCanvas={() => {
          if (infiniteCanvas) {
            // Switching from Infinite Canvas -> Fixed Board
            const hasScattered = areElementsOutsideBoard(elementsRef.current, BOUNDED_CANVAS_W, BOUNDED_CANVAS_H);
            if (hasScattered) {
              setShowCanvasModeModal(true);
              return;
            }
          }
          // Simple direct toggle
          const next = !infiniteCanvas;
          setInfiniteCanvas(next);
          infiniteCanvasRef.current = next;
          try { localStorage.setItem('wb_infinite_canvas', String(next)); } catch {}
          redraw();
        }}
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


          {/* Interactive HTML Overlays — handled by WhiteboardEmbedLayer */}
          <WhiteboardEmbedLayer
            elements={elements}
            panOffset={panOffset}
            zoom={zoom}
            selectedId={selectedId}
            selectedIds={selectedIds}
            activeVideoEmbedId={activeVideoEmbedId}
            isDragging={isDragging}
            onStartDrag={handleStartEmbedDrag}
            onTogglePlay={(idx) => setActiveVideoEmbedId(prev => prev === idx ? null : idx)}
            onSelect={(idx, e) => {
              if (e.shiftKey) {
                setSelectedIds(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
              } else {
                setSelectedId(idx);
                setSelectedIds([idx]);
              }
            }}
          />
        </div>
      </div>


      {/* ── Status Bar ── */}
      <WhiteboardStatusBar
        tool={tool}
        zoom={zoom}
        elementsCount={elements.length}
      />

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
          user={user}
          hasCloudAccess={hasCloudAccess}
          entitlements={entitlements}
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

      {/* Prebuilt Shapes & Device Frames Modal */}
      <WhiteboardShapePickerModal
        isOpen={showShapeModal}
        onClose={() => setShowShapeModal(false)}
        onSelectShape={handleInsertShape}
        onSelectDeviceFrame={handleInsertDeviceFrame}
      />

      {/* Icon Library Modal */}
      <WhiteboardIconPickerModal
        isOpen={showIconModal}
        onClose={() => setShowIconModal(false)}
        onSelectIcon={handleInsertIcon}
      />

      {/* Code Snippet Modal */}
      <WhiteboardCodeModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        onCommit={handleInsertCode}
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

      {/* Switch to Fixed Board Warning & Auto-fit Modal */}
      {showCanvasModeModal && (
        <div className="wb-overlay" style={{ zIndex: 4000 }} onClick={() => setShowCanvasModeModal(false)}>
          <div className="wb-dialog" role="dialog" aria-modal="true" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '28px', color: '#818cf8' }}>fit_screen</span>
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: 700, color: 'var(--text-main)' }}>
              Switch to Fixed Board Mode?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
              Some of your drawings, text, or embeds are currently scattered outside the standard <strong>4000 × 3000</strong> fixed board boundary.
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '24px',
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: '1.4',
            }}>
              💡 <strong>Auto-Fit &amp; Compact:</strong> Neatly scales and rearranges all your existing elements inside the board area so nothing is lost or out of reach.
            </div>

            <div className="dialog-actions" style={{ gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowCanvasModeModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCanvasModeModal(false);
                  setInfiniteCanvas(false);
                  infiniteCanvasRef.current = false;
                  try { localStorage.setItem('wb_infinite_canvas', 'false'); } catch {}
                  redraw();
                }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#e2e8f0',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Keep Positions (May be outside)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCanvasModeModal(false);
                  // Compact elements to fit inside board
                  const compacted = compactElementsToBoard(elementsRef.current, BOUNDED_CANVAS_W, BOUNDED_CANVAS_H, 140);
                  setElements(compacted);
                  elementsRef.current = compacted;
                  commitToHistory(compacted);
                  setInfiniteCanvas(false);
                  infiniteCanvasRef.current = false;
                  try { localStorage.setItem('wb_infinite_canvas', 'false'); } catch {}
                  // Reset zoom & pan to show the whole compacted board
                  handleZoomReset();
                  redraw();
                }}
                style={{
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  border: 'none',
                  color: 'white',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Auto-Fit &amp; Switch
              </button>
            </div>
          </div>
        </div>
      )}

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
