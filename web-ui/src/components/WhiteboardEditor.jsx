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
import { TOOLS, COLORS, SIZES, generateDefaultName } from './whiteboard/whiteboardConstants.js';

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
  const [marquee, setMarquee]             = useState(null); // { startX, startY, currentX, currentY }
  const [isSaved, setIsSaved]             = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [saveError, setSaveError]         = useState(null);
  const [loadError, setLoadError]         = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [zoom, setZoom]                   = useState(1);
  const [boardStateItemId, setBoardStateItemId] = useState(null);
  const [contextMenu, setContextMenu]     = useState(null); // {x,y,elIdx}
  const [textPrompt, setTextPrompt]       = useState(null); // {x,y} — replaces native prompt()
  const [textPromptValue, setTextPromptValue] = useState('');
  const [mediaLoadError, setMediaLoadError] = useState(null); // replaces native alert()

  const canvasRef         = useRef(null);
  const drawing           = useRef(false);
  const currentPath       = useRef([]);
  const liveShape         = useRef(null); // {startPt, endPt} for live shape preview
  const dragRef           = useRef(null);
  const marqueeRef        = useRef(null);
  const nameInputRef      = useRef(null);
  const boardThumbItemId  = useRef(null);
  const boardStateItemIdRef = useRef(null);
  const needsCommitRef    = useRef(false);
  const isSavingRef       = useRef(false);
  const nameCommittedRef  = useRef(false);
  
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

  // ── Canvas draw ──────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((el, idx) => {
      ctx.save();
      if (el.type === 'path') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.size;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        el.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (el.type === 'rect') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.size;
        ctx.strokeRect(el.x, el.y, el.w, el.h);
      } else if (el.type === 'circle') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.size;
        ctx.beginPath();
        ctx.ellipse(el.x + el.w/2, el.y + el.h/2, Math.abs(el.w/2), Math.abs(el.h/2), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'arrow') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.size;
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
        // arrowhead
        const angle = Math.atan2(el.y2 - el.y, el.x2 - el.x);
        const hw = 10 + el.size;
        ctx.beginPath();
        ctx.moveTo(el.x2, el.y2);
        ctx.lineTo(el.x2 - hw * Math.cos(angle - Math.PI/6), el.y2 - hw * Math.sin(angle - Math.PI/6));
        ctx.lineTo(el.x2 - hw * Math.cos(angle + Math.PI/6), el.y2 - hw * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fillStyle = el.color;
        ctx.fill();
      } else if (el.type === 'text') {
        ctx.fillStyle  = el.color;
        ctx.font       = `${el.fontSize}px 'Outfit', sans-serif`;
        ctx.fillText(el.text, el.x, el.y);
      } else if (el.type === 'image' && el.img) {
        ctx.drawImage(el.img, el.x, el.y, el.w, el.h);
        
        // Draw title
        if (el.title) {
          ctx.font = "14px 'Outfit', sans-serif";
          const tw = ctx.measureText(el.title).width;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(el.x, el.y - 24, tw + 12, 24);
          ctx.fillStyle = "white";
          ctx.fillText(el.title, el.x + 6, el.y - 8);
        }

        // Draw play button if paused video
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

    // Live shape preview (rect/circle/arrow) — drawn as a guide outline in
    // the app's brand indigo rather than the user's active draw color, so it
    // reads as "this is a preview" instead of looking like already-drawn
    // (and, with a dark draw color, jarringly black) content.
    if (drawing.current && liveShape.current) {
      const { startPt: s, endPt: ep, tool: lt } = liveShape.current;
      ctx.save();
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth   = Math.max(2, strokeSize * 0.75);
      ctx.lineCap     = 'round';
      ctx.setLineDash([6, 4]);
      if (lt === 'rect') {
        ctx.strokeRect(s.x, s.y, ep.x - s.x, ep.y - s.y);
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

    // Selection bounding outlines + handles
    const allSelected = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    allSelected.forEach(idx => {
      const el = elements[idx];
      if (!el) return;
      ctx.save();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 4]);

      if (el.type === 'image') {
        ctx.strokeRect(el.x - 2, el.y - 2, el.w + 4, el.h + 4);
        ctx.setLineDash([]);
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(el.x + el.w - 4, el.y + el.h - 4, 8, 8);
      } else if (el.type === 'rect') {
        const minX = Math.min(el.x, el.x + el.w), maxX = Math.max(el.x, el.x + el.w);
        const minY = Math.min(el.y, el.y + el.h), maxY = Math.max(el.y, el.y + el.h);
        ctx.strokeRect(minX - 4, minY - 4, (maxX - minX) + 8, (maxY - minY) + 8);
      } else if (el.type === 'circle') {
        const cx = el.x + el.w/2, cy = el.y + el.h/2;
        const rx = Math.abs(el.w/2), ry = Math.abs(el.h/2);
        ctx.strokeRect(cx - rx - 4, cy - ry - 4, (rx * 2) + 8, (ry * 2) + 8);
      } else if (el.type === 'text') {
        ctx.font = `${el.fontSize}px 'Outfit', sans-serif`;
        const tw = ctx.measureText(el.text).width;
        ctx.strokeRect(el.x - 4, el.y - el.fontSize, tw + 8, el.fontSize + 8);
      } else if (el.type === 'arrow') {
        const minX = Math.min(el.x, el.x2), maxX = Math.max(el.x, el.x2);
        const minY = Math.min(el.y, el.y2), maxY = Math.max(el.y, el.y2);
        ctx.strokeRect(minX - 8, minY - 8, (maxX - minX) + 16, (maxY - minY) + 16);
      } else if (el.type === 'path' && el.points?.length) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        el.points.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });
        ctx.strokeRect(minX - 6, minY - 6, (maxX - minX) + 12, (maxY - minY) + 12);
      }
      ctx.restore();
    });

    // Marquee selection box ("Guiding blue line that moves with mouse")
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
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }
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
                      // Fallback just in case seek fails or video is too short
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
    
    // ResizeObserver ensures we get the size correctly even if flex layout is delayed
    const obs = new ResizeObserver(resize);
    obs.observe(canvas.parentElement);
    
    return () => obs.disconnect();
  }, [redraw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Right-click context menu
  const onContextMenu = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    let hit = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'image') {
        if (pos.x >= el.x && pos.x <= el.x + el.w && pos.y >= el.y && pos.y <= el.y + el.h) { hit = i; break; }
      }
    }
    if (hit !== null) setContextMenu({ x: e.clientX, y: e.clientY, elIdx: hit });
  };

  const ctxBringFront = () => {
    if (contextMenu === null) return;
    const next = [...elements];
    const [el] = next.splice(contextMenu.elIdx, 1);
    next.push(el);
    setElements(next); commitToHistory(next); setContextMenu(null);
  };
  const ctxSendBack = () => {
    if (contextMenu === null) return;
    const next = [...elements];
    const [el] = next.splice(contextMenu.elIdx, 1);
    next.unshift(el);
    setElements(next); commitToHistory(next); setContextMenu(null);
  };
  const ctxDelete = () => {
    if (contextMenu === null) return;
    const targetIdx = contextMenu.elIdx;
    const toDelete = selectedIds.includes(targetIdx) ? selectedIds : [targetIdx];
    const next = elements.filter((_, i) => !toDelete.includes(i));
    setElements(next);
    commitToHistory(next);
    setSelectedId(null);
    setSelectedIds([]);
    setContextMenu(null);
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


  const onMouseDown = (e) => {
    setContextMenu(null);
    if (e.button !== 0) return;
    const pos = getPos(e);

    if (tool === 'select') {
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
                return; // handled play toggle
              }
            }
            hit = i; break;
          }
        }
        else if (el.type === 'text') {
          const fontSize = el.fontSize || 20;
          if (pos.x >= el.x - 4 && pos.x <= el.x + 240 && pos.y >= el.y - fontSize - 4 && pos.y <= el.y + 6) { hit = i; break; }
        }
        else if (el.type === 'rect') {
          const minX = Math.min(el.x, el.x + el.w), maxX = Math.max(el.x, el.x + el.w);
          const minY = Math.min(el.y, el.y + el.h), maxY = Math.max(el.y, el.y + el.h);
          if (pos.x >= minX - 4 && pos.x <= maxX + 4 && pos.y >= minY - 4 && pos.y <= maxY + 4) { hit = i; break; }
        }
        else if (el.type === 'circle') {
          const cx = el.x + el.w/2, cy = el.y + el.h/2;
          const rx = Math.abs(el.w/2), ry = Math.abs(el.h/2);
          if (pos.x >= cx - rx - 4 && pos.x <= cx + rx + 4 && pos.y >= cy - ry - 4 && pos.y <= cy + ry + 4) { hit = i; break; }
        }
        else if (el.type === 'arrow') {
          const minX = Math.min(el.x, el.x2), maxX = Math.max(el.x, el.x2);
          const minY = Math.min(el.y, el.y2), maxY = Math.max(el.y, el.y2);
          if (pos.x >= minX - 10 && pos.x <= maxX + 10 && pos.y >= minY - 10 && pos.y <= maxY + 10) { hit = i; break; }
        }
        else if (el.type === 'path') {
          let pathHit = false;
          for(let p of (el.points || [])) {
             if(Math.hypot(p.x - pos.x, p.y - pos.y) < el.size + 6) { pathHit = true; break; }
          }
          if (pathHit) { hit = i; break; }
        }
      }

      if (hit !== null) {
        // If clicking on an element:
        // If Shift is pressed or already in selectedIds, keep selection set
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

        // Prepare multi-drag or single-drag
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
        // Clicked on empty space: clear element selection and start marquee bounding box
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
    if (['rect','circle','arrow'].includes(tool)) liveShape.current = { startPt: pos, endPt: pos, tool };
  };

  const onMouseMove = (e) => {
    // 1. Selector marquee active (guiding blue line that moves with mouse)
    if (tool === 'select' && marqueeRef.current && marqueeRef.current.active) {
      const pos = getPos(e);
      marqueeRef.current.currentX = pos.x;
      marqueeRef.current.currentY = pos.y;
      setMarquee({ ...marqueeRef.current });
      redraw();
      return;
    }

    // 2. Dragging/moving selected elements
    if (tool === 'select' && dragRef.current) {
      const pos = getPos(e);
      const { idx, isResize, startX, startY, origX, origY, origW, origH, origX2, origY2, origPoints, movingIndices, initialSnapshots } = dragRef.current;
      const dx = pos.x - startX, dy = pos.y - startY;

      if (isResize && idx !== null) {
        setElements(prev => prev.map((el, i) => {
          if (i !== idx) return el;
          const ratio = origW / origH;
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
    const pos = getPos(e);
    currentPath.current = [...currentPath.current, pos];
    if (liveShape.current) liveShape.current = { ...liveShape.current, endPt: pos };
    redraw();
  };

  const onMouseUp = (e) => {
    // Finish marquee selection
    if (tool === 'select' && marqueeRef.current && marqueeRef.current.active) {
      const m = marqueeRef.current;
      marqueeRef.current = null;
      setMarquee(null);

      const minX = Math.min(m.startX, m.currentX);
      const maxX = Math.max(m.startX, m.currentX);
      const minY = Math.min(m.startY, m.currentY);
      const maxY = Math.max(m.startY, m.currentY);

      // Only perform marquee selection if mouse actually moved
      if (maxX - minX > 3 || maxY - minY > 3) {
        const hits = [];
        elements.forEach((el, i) => {
          let elMinX = el.x, elMaxX = el.x, elMinY = el.y, elMaxY = el.y;
          if (el.type === 'image' || el.type === 'rect') {
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

          // AABB overlap test
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
      newEl = { type:'path', points: pts, color: tool === 'eraser' ? '#020617' : color, size: tool === 'eraser' ? strokeSize * 5 : strokeSize };
    } else if (tool === 'rect') {
      newEl = { type:'rect', x:startPt.x, y:startPt.y, w:endPt.x-startPt.x, h:endPt.y-startPt.y, color, size:strokeSize };
    } else if (tool === 'circle') {
      newEl = { type:'circle', x:startPt.x, y:startPt.y, w:endPt.x-startPt.x, h:endPt.y-startPt.y, color, size:strokeSize };
    } else if (tool === 'arrow') {
      newEl = { type:'arrow', x:startPt.x, y:startPt.y, x2:endPt.x, y2:endPt.y, color, size:strokeSize };
    }
    if (newEl) { const next = [...elements, newEl]; setElements(next); commitToHistory(next); }
    currentPath.current = [];
    redraw();
  };

  const handleImageInsert = (src, isVideo, title) => {
    setShowLibrary('none');
    if (!src) return;

    if (isVideo) {
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;

      // Try with crossOrigin='anonymous', but if it fails fall back without it
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
          x: 60,
          y: 60,
          w: Math.round(vw * ratio),
          h: Math.round(vh * ratio)
        }];
        setElements(next);
        commitToHistory(next);
      };

      video.onloadeddata = () => {
        try { video.currentTime = 0.1; } catch (_) {}
      };
      video.onseeked = onReady;
      video.oncanplay = () => {
        // Fallback in case onseeked does not fire
        setTimeout(onReady, 300);
      };

      video.onerror = () => {
        if (video.crossOrigin) {
          // Retry without crossOrigin
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
          x: 60,
          y: 60,
          w: Math.round(iw * ratio),
          h: Math.round(ih * ratio)
        }];
        setElements(next);
        commitToHistory(next);
      };
      img.onerror = () => {
        if (img.crossOrigin) {
          // Retry without crossOrigin
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

  const commitTextPrompt = () => {
    const text = textPromptValue.trim();
    if (text && textPrompt) {
      const next = [...elements, { type:'text', text, x: textPrompt.x, y: textPrompt.y, color, fontSize: 20 + strokeSize * 2 }];
      setElements(next); commitToHistory(next);
    }
    setTextPrompt(null);
  };

  const handleNameCommit = () => {
    // Enter calls this, then blurring the input as it unmounts (setEditingName
    // below) can fire a native blur that calls this a second time — guard so
    // the rename PATCH only fires once per edit.
    if (nameCommittedRef.current) return;
    nameCommittedRef.current = true;

    const trimmed = nameDraft.trim() || generateDefaultName();
    setBoardName(trimmed);
    setEditingName(false);
    setIsSaved(false);

    // Save new name to server
    fetch(`${SERVER_URL}/boards/${board.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
      body: JSON.stringify({ name: trimmed }),
    }).catch(console.error);
  };

  // Generate a tiny fixed-size thumbnail (320×180 JPEG)
  const generateThumbnail = () => {
    try {
      const src = canvasRef.current;
      if (!src) return null;
      // If width or height is 0, we can't draw, but it shouldn't be 0 if mounted correctly.
      if (src.width === 0 || src.height === 0) {
        console.warn('Canvas width or height is 0, cannot generate thumbnail');
        return null;
      }
      const THUMB_W = 320, THUMB_H = 180;
      const tc = document.createElement('canvas');
      tc.width = THUMB_W; tc.height = THUMB_H;
      const ctx = tc.getContext('2d');
      ctx.fillStyle = '#0a0f1c';
      ctx.fillRect(0, 0, THUMB_W, THUMB_H);
      // letterbox-fit the drawing
      const scale = Math.min(THUMB_W / src.width, THUMB_H / src.height);
      const dw = src.width * scale, dh = src.height * scale;
      ctx.drawImage(src, (THUMB_W - dw) / 2, (THUMB_H - dh) / 2, dw, dh);
      return tc.toDataURL('image/jpeg', 0.45);
    } catch (e) {
      console.error('Failed to generate thumbnail (possibly CORS or tainted canvas):', e);
      return null;
    }
  };

  const handleSave = useCallback(async (isSilent = false) => {
    // Guard against duplicate save in flight
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    const thumbnail = generateThumbnail();
    const elementsToSave = elements.map(el => {
      const { img, ...rest } = (el.type === 'image' ? el : el);
      return el.type === 'image' ? rest : el;
    });

    try {
      // ── 1. Save elements (board_state) ──
      const stateContent = JSON.stringify({ elements: elementsToSave });
      const currentItemId = boardStateItemIdRef.current || boardStateItemId;
      if (currentItemId) {
        const res = await fetch(`${SERVER_URL}/boards/${board.id}/items/${currentItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
          body: JSON.stringify({ content: stateContent }),
        });
        if (!res.ok) throw new Error(`Failed to save (HTTP ${res.status})`);
      } else {
        const res = await fetch(`${SERVER_URL}/boards/${board.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
          body: JSON.stringify({ type: 'board_state', content: stateContent }),
        });
        if (!res.ok) throw new Error(`Failed to save (HTTP ${res.status})`);
        const d = await res.json();
        if (d.item) {
          setBoardStateItemId(d.item.id);
          boardStateItemIdRef.current = d.item.id;
        }
      }

      // ── 2. Save thumbnail on the board directly ──
      if (thumbnail) {
        const resThumb = await fetch(`${SERVER_URL}/boards/${board.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
          body: JSON.stringify({ thumbnail }),
        });
        if (!resThumb.ok) {
          console.error('[WhiteboardEditor] Failed to save thumbnail on server:', await resThumb.text());
        }
      }

      setHasUnsavedChanges(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Save failed', err);
      if (!isSilent) {
        setSaveError('Save failed — your changes are still here, but not on the server yet. Try again.');
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [board?.id, boardStateItemId, elements, user?.jwt]);

  // Debounced auto-save: saves automatically 1.5s after any element modification
  useEffect(() => {
    if (!hasUnsavedChanges || !board?.id || !user?.jwt) return;
    const timer = setTimeout(() => {
      handleSave(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, elements, board?.id, user?.jwt, handleSave]);
  
  const handleClose = async () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      onClose();
    }
  };

  const getCursor = () => {
    if (tool === 'select') return 'default';
    if (tool === 'eraser') return 'cell';
    if (tool === 'text')   return 'text';
    return 'crosshair';
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'var(--bg-primary)', display:'flex', flexDirection:'column', fontFamily:"'Outfit', sans-serif" }}>
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
        setZoom={setZoom}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        handleSave={handleSave}
        isSaving={isSaving}
        isSaved={isSaved}
        saveError={saveError}
        hasUnsavedChanges={hasUnsavedChanges}
        handleClose={handleClose}
        onOpenShare={() => setShowShareModal(true)}
      />

      {(loadError || saveError) && (
        <div style={{ background:'rgba(239,68,68,0.1)', borderBottom:'1px solid rgba(239,68,68,0.3)', color:'#f87171', fontSize:'12px', padding:'8px 20px', display:'flex', alignItems:'center', gap:'8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize:'16px', flexShrink:0 }}>warning</span>
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
        <div className="wb-canvas-area" style={{ background:'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize:'24px 24px', backgroundColor:'var(--bg-primary)' }}>
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

          <div style={{ transform:`scale(${zoom})`, transformOrigin:'top left', width: `${100/zoom}%`, height: `${100/zoom}%` }}>
            <canvas
              ref={canvasRef}
              style={{ display:'block', width:'100%', height:'100%', cursor: getCursor() }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onContextMenu={onContextMenu}
            />
          </div>
        </div>
      </div>

      {/* ── Status / Tip Bar ── */}
      <div className="wb-statusbar">
        <div className="wb-status-left">
          <span className="hide-below-sm" style={{ fontSize:'11px', color:'#334155', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>AntCapture Whiteboard</span>
          <span className="hide-below-sm" style={{ fontSize:'11px', color:'#334155' }}>·</span>
          <span className="material-symbols-rounded" style={{ fontSize:'13px', color:'var(--text-faint)', flexShrink:0 }}>
            {TOOLS.find(t => t.id === tool)?.icon || 'near_me'}
          </span>
          <span className="truncate" style={{ fontSize:'11px', color:'var(--text-faint)' }}>
            {tool === 'pen'    && 'Click and drag to draw freely'}
            {tool === 'eraser' && 'Drag over strokes to erase'}
            {tool === 'text'   && 'Click anywhere to add text'}
            {tool === 'rect'   && 'Drag to draw a rectangle'}
            {tool === 'circle' && 'Drag to draw an ellipse'}
            {tool === 'arrow'  && 'Drag to draw an arrow'}
            {tool === 'select' && 'Click an image to select and drag it'}
            {tool === 'image'  && 'Pick an image from your library'}
            {tool === 'video'  && 'Pick a video from your library'}
          </span>
        </div>
        <div className="hide-below-md" style={{ display:'flex', alignItems:'center', gap:'16px', flexShrink:0 }}>
          <span style={{ fontSize:'11px', color:'#334155' }}>No infinite canvas — focused &amp; distraction-free</span>
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

      {/* Whiteboard Starter Templates Modal */}
      <WhiteboardTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleApplyTemplate}
      />


      {/* Right-click context menu */}
      <WhiteboardContextMenu
        contextMenu={contextMenu}
        onBringToFront={ctxBringFront}
        onSendToBack={ctxSendBack}
        onDelete={ctxDelete}
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
        <div className="wb-toast" role="alert" style={{ zIndex:4500 }}>
          <span className="material-symbols-rounded" style={{ fontSize:'20px', color:'#f87171', flexShrink:0 }}>error</span>
          <span style={{ fontSize:'13px', color:'var(--danger-soft)', flex:1, minWidth:0 }}>{mediaLoadError}</span>
          <button onClick={() => setMediaLoadError(null)} className="wb-toast-close" aria-label="Dismiss">
            <span className="material-symbols-rounded" style={{ fontSize:'18px' }}>close</span>
          </button>
        </div>
      )}
    </div>
  );
}
