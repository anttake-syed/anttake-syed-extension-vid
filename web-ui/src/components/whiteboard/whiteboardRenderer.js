import {
  getElementTransformBox,
  getTransformHandles,
  drawHandDrawnRect,
  drawHandDrawnCircle,
  drawHandDrawnArrow,
  getFillColor,
} from './whiteboardTransform.js';
import { BOUNDED_CANVAS_W, BOUNDED_CANVAS_H } from './whiteboardConstants.js';


/**
 * renderWhiteboardCanvas
 * Pure 2D canvas drawing routine for rendering whiteboard elements,
 * live drawing strokes, bounding outlines, transform/rotation handles, and marquee boxes.
 */
export function renderWhiteboardCanvas(ctx, canvas, state) {
  if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) return;

  const {
    elements = [],
    zoom = 1,
    panOffset = { x: 0, y: 0 },
    tool = 'select',
    color = '#6366f1',
    strokeSize = 4,
    selectedId = null,
    selectedIds = [],
    currentPath = [],
    liveShape = null,
    marquee = null,
    drawing = false,
    infiniteCanvas = true,
  } = state;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply zoom + pan transform
  ctx.save();
  ctx.translate(panOffset.x, panOffset.y);
  ctx.scale(zoom, zoom);

  // 0. Bounded page setup when infinite canvas is OFF
  if (!infiniteCanvas) {
    // Fill board background
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, BOUNDED_CANVAS_W, BOUNDED_CANVAS_H);

    // Clean subtle inner border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
    ctx.lineWidth = Math.max(1, 2 / zoom);
    ctx.strokeRect(0, 0, BOUNDED_CANVAS_W, BOUNDED_CANVAS_H);
    ctx.restore();

    // Clip all subsequent drawing operations strictly inside the board
    ctx.beginPath();
    ctx.rect(0, 0, BOUNDED_CANVAS_W, BOUNDED_CANVAS_H);
    ctx.clip();
  }

  // 1. Draw elements
  elements.forEach((el) => {
    ctx.save();
    try {
      const rot = el.rotation || 0;
      if (rot) {
        const box = getElementTransformBox(el);
        ctx.translate(box.cx, box.cy);
        ctx.rotate(rot);
        ctx.translate(-box.cx, -box.cy);
      }

      if (el.type === 'frame') {
        const fw = el.w || 360;
        const fh = el.h || 240;
        const ft = el.frameType || 'normal';

        if (ft === 'browser') {
          // macOS-style browser window frame
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, fw, fh, 12);
          ctx.fill();

          // Header titlebar
          ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, fw, 38, [12, 12, 0, 0]);
          ctx.fill();

          // Traffic light dots
          ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(el.x + 18, el.y + 19, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(el.x + 34, el.y + 19, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(el.x + 50, el.y + 19, 5, 0, Math.PI * 2); ctx.fill();

          // Address bar
          const searchW = Math.max(120, fw - 160);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(el.x + 72, el.y + 9, searchW, 20, 6);
          ctx.fill();

          // URL / title text
          ctx.fillStyle = '#94a3b8';
          ctx.font = "11px 'Outfit', sans-serif";
          ctx.fillText(el.title || 'https://my-app.dev', el.x + 82, el.y + 23);

          // Frame outline
          ctx.strokeStyle = el.color || '#3b82f6';
          ctx.lineWidth = Math.max(1.5, el.size || 2);
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, fw, fh, 12);
          ctx.stroke();

        } else if (ft === 'phone') {
          // Mobile Phone chassis
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, fw, fh, 32);
          ctx.fill();

          // Dynamic Island / speaker pill at top center
          const pillW = Math.min(90, fw * 0.35);
          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.roundRect(el.x + (fw - pillW) / 2, el.y + 10, pillW, 14, 7);
          ctx.fill();

          // Bottom home indicator bar
          const homeW = Math.min(100, fw * 0.35);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.roundRect(el.x + (fw - homeW) / 2, el.y + fh - 12, homeW, 4, 2);
          ctx.fill();

          // Header label
          ctx.fillStyle = '#64748b';
          ctx.font = "10px 'Outfit', sans-serif";
          ctx.fillText(el.title || 'Mobile Phone', el.x + 18, el.y + 22);

          // Outer border
          ctx.strokeStyle = el.color || '#6366f1';
          ctx.lineWidth = Math.max(2, el.size || 3);
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, fw, fh, 32);
          ctx.stroke();

        } else if (ft === 'tablet') {
          // Modern Tablet bezel
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, fw, fh, 22);
          ctx.fill();

          // Tablet front camera dot
          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.arc(el.x + fw / 2, el.y + 10, 4, 0, Math.PI * 2);
          ctx.fill();

          // Header label
          ctx.fillStyle = '#64748b';
          ctx.font = "11px 'Outfit', sans-serif";
          ctx.fillText(el.title || 'Tablet', el.x + 18, el.y + 22);

          // Outer border
          ctx.strokeStyle = el.color || '#8b5cf6';
          ctx.lineWidth = Math.max(2, el.size || 3);
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, fw, fh, 22);
          ctx.stroke();

        } else if (ft === 'desktop') {
          // Desktop Monitor Frame
          const screenH = fh - 32;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, fw, screenH, 10);
          ctx.fill();

          // Stand neck
          const standNeckW = Math.max(24, fw * 0.12);
          ctx.fillStyle = '#334155';
          ctx.fillRect(el.x + (fw - standNeckW) / 2, el.y + screenH, standNeckW, 24);

          // Stand base plate
          const standBaseW = Math.max(80, fw * 0.35);
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.roundRect(el.x + (fw - standBaseW) / 2, el.y + screenH + 20, standBaseW, 10, 4);
          ctx.fill();

          // Header label
          ctx.fillStyle = '#64748b';
          ctx.font = "11px 'Outfit', sans-serif";
          ctx.fillText(el.title || 'Desktop Display', el.x + 14, el.y + 20);

          // Monitor screen border
          ctx.strokeStyle = el.color || '#06b6d4';
          ctx.lineWidth = Math.max(2, el.size || 2.5);
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, fw, screenH, 10);
          ctx.stroke();

        } else {
          // Standard Canvas Frame / Container
          ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
          ctx.fillRect(el.x, el.y, fw, fh);
          ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
          ctx.fillRect(el.x, el.y, fw, 28);
          ctx.strokeStyle = el.color || '#6366f1';
          ctx.lineWidth = Math.max(1.5, el.size || 2);
          ctx.strokeRect(el.x, el.y, fw, fh);
          ctx.fillStyle = '#f8fafc';
          ctx.font = "bold 12px 'Outfit', sans-serif";
          ctx.fillText(el.title || 'FRAME', el.x + 10, el.y + 19);
        }
      } else if (el.type === 'shape') {
        const sw = el.w || 100;
        const sh = el.h || 100;
        const stroke = el.color || '#6366f1';
        const fill = el.fillStyle === 'none' ? 'transparent' : (el.fill || getFillColor(stroke, 0.2));
        ctx.strokeStyle = stroke;
        ctx.fillStyle = fill;
        ctx.lineWidth = el.size || 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const st = el.shapeType || 'triangle';
        if (st === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(el.x + sw / 2, el.y);
          ctx.lineTo(el.x + sw, el.y + sh);
          ctx.lineTo(el.x, el.y + sh);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (st === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(el.x + sw / 2, el.y);
          ctx.lineTo(el.x + sw, el.y + sh / 2);
          ctx.lineTo(el.x + sw / 2, el.y + sh);
          ctx.lineTo(el.x, el.y + sh / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (st === 'star') {
          const cx = el.x + sw / 2;
          const cy = el.y + sh / 2;
          const outerR = Math.min(sw, sh) / 2;
          const innerR = outerR * 0.45;
          ctx.beginPath();
          for (let p = 0; p < 10; p++) {
            const r = p % 2 === 0 ? outerR : innerR;
            const angle = (p * Math.PI) / 5 - Math.PI / 2;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (st === 'hexagon') {
          ctx.beginPath();
          ctx.moveTo(el.x + sw * 0.25, el.y);
          ctx.lineTo(el.x + sw * 0.75, el.y);
          ctx.lineTo(el.x + sw, el.y + sh / 2);
          ctx.lineTo(el.x + sw * 0.75, el.y + sh);
          ctx.lineTo(el.x + sw * 0.25, el.y + sh);
          ctx.lineTo(el.x, el.y + sh / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (st === 'cylinder') {
          const ry = Math.min(18, sh * 0.16);
          ctx.beginPath();
          ctx.moveTo(el.x, el.y + ry);
          ctx.lineTo(el.x, el.y + sh - ry);
          ctx.ellipse(el.x + sw / 2, el.y + sh - ry, sw / 2, ry, 0, 0, Math.PI);
          ctx.lineTo(el.x + sw, el.y + ry);
          ctx.ellipse(el.x + sw / 2, el.y + ry, sw / 2, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (st === 'cloud') {
          ctx.beginPath();
          const r = Math.min(sw, sh) * 0.25;
          ctx.arc(el.x + sw * 0.3, el.y + sh * 0.45, r, Math.PI * 0.7, Math.PI * 1.8);
          ctx.arc(el.x + sw * 0.55, el.y + sh * 0.3, r * 1.1, Math.PI * 1.1, Math.PI * 2.1);
          ctx.arc(el.x + sw * 0.78, el.y + sh * 0.5, r * 0.85, Math.PI * 1.5, Math.PI * 0.5);
          ctx.arc(el.x + sw * 0.5, el.y + sh * 0.75, r * 0.9, 0, Math.PI);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (st === 'callout') {
          ctx.beginPath();
          const tailW = Math.min(30, sw * 0.2);
          ctx.roundRect(el.x, el.y, sw, sh - 18, 12);
          ctx.fill();
          ctx.stroke();
          // tail pointer
          ctx.beginPath();
          ctx.moveTo(el.x + 24, el.y + sh - 18);
          ctx.lineTo(el.x + 14, el.y + sh);
          ctx.lineTo(el.x + 24 + tailW, el.y + sh - 18);
          ctx.fill();
          ctx.stroke();
        }
      } else if (el.type === 'icon') {
        const sz = el.size || el.w || 48;
        ctx.fillStyle = el.color || '#38bdf8';
        ctx.font = `${sz}px 'Material Symbols Rounded', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.icon || 'star', el.x + sz / 2, el.y + sz / 2);
        // Reset text alignments
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      } else if (el.type === 'code') {
        const cw = el.w || 380;
        const ch = el.h || 220;

        // Container background
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(el.x, el.y, cw, ch, 10);
        ctx.fill();

        // Header
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(el.x, el.y, cw, 32, [10, 10, 0, 0]);
        ctx.fill();

        // macOS Traffic lights
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(el.x + 16, el.y + 16, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(el.x + 30, el.y + 16, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(el.x + 44, el.y + 16, 4.5, 0, Math.PI * 2); ctx.fill();

        // Language tag
        ctx.fillStyle = '#818cf8';
        ctx.font = "bold 11px monospace";
        ctx.fillText((el.language || 'JAVASCRIPT').toUpperCase(), el.x + cw - 80, el.y + 20);

        // Code content line by line
        const lines = (el.code || '// Write code here\nfunction example() {\n  return "AntCapture";\n}').split('\n');
        ctx.font = "12px 'Fira Code', monospace, sans-serif";
        const maxLines = Math.floor((ch - 46) / 20);

        lines.slice(0, maxLines).forEach((line, idx) => {
          const ly = el.y + 52 + idx * 20;

          // Line numbers
          ctx.fillStyle = '#475569';
          ctx.fillText(String(idx + 1).padStart(2, ' '), el.x + 14, ly);

          // Code text
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(line, el.x + 44, ly);
        });

        // Border outline
        ctx.strokeStyle = el.color || '#334155';
        ctx.lineWidth = Math.max(1.5, el.size || 2);
        ctx.beginPath();
        ctx.roundRect(el.x, el.y, cw, ch, 10);
        ctx.stroke();

      } else if (el.type === 'path') {
        if (el.points && el.points.length > 0) {
          ctx.strokeStyle = el.color || '#f8fafc';
          ctx.lineWidth   = el.size || 2;
          ctx.lineCap     = 'round';
          ctx.lineJoin    = 'round';
          ctx.beginPath();
          el.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.stroke();
        }
      } else if (el.type === 'rect') {
        const fill = el.fillStyle === 'none' ? 'transparent' : (el.fill || getFillColor(el.color, 0.16));
        drawHandDrawnRect(ctx, el.x, el.y, el.w, el.h, {
          stroke: el.color || '#6366f1',
          fill,
          fillStyle: el.fillStyle || 'solid',
          strokeWidth: el.size || 2,
          radius: el.radius !== undefined ? el.radius : 12,
        });
      } else if (el.type === 'circle') {
        const fill = el.fillStyle === 'none' ? 'transparent' : (el.fill || getFillColor(el.color, 0.16));
        const w = el.w || 0;
        const h = el.h || 0;
        const cx = el.x + w / 2;
        const cy = el.y + h / 2;
        const rx = w / 2;
        const ry = h / 2;
        drawHandDrawnCircle(ctx, cx, cy, rx, ry, {
          stroke: el.color || '#6366f1',
          fill,
          fillStyle: el.fillStyle || 'solid',
          strokeWidth: el.size || 2,
        });
      } else if (el.type === 'arrow') {
        drawHandDrawnArrow(ctx, el.x || 0, el.y || 0, el.x2 || 0, el.y2 || 0, el.cpx, el.cpy, {
          stroke: el.color || '#6366f1',
          strokeWidth: el.size || 2,
        });
      } else if (el.type === 'text') {
        ctx.fillStyle = el.color || '#f8fafc';
        ctx.font      = `${el.fontSize || 14}px 'Outfit', sans-serif`;
        ctx.fillText(el.text || '', el.x || 0, el.y || 0);
      } else if (el.type === 'image') {
        if (el.img) {
          try {
            ctx.drawImage(el.img, el.x, el.y, el.w, el.h);
          } catch (e) {
            console.warn('Canvas drawImage error for element:', e);
          }
        } else {
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
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(el.x, el.y - 24, tw + 12, 24);
          ctx.fillStyle = 'white';
          ctx.fillText(el.title, el.x + 6, el.y - 8);
        }

        if (el.isVideo && !el.isPlaying) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.arc(el.x + el.w / 2, el.y + el.h / 2, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.moveTo(el.x + el.w / 2 - 8, el.y + el.h / 2 - 10);
          ctx.lineTo(el.x + el.w / 2 + 12, el.y + el.h / 2);
          ctx.lineTo(el.x + el.w / 2 - 8, el.y + el.h / 2 + 10);
          ctx.fill();
        }
      }
    } catch (drawErr) {
      console.warn('Error drawing whiteboard element:', el, drawErr);
    } finally {
      ctx.restore();
    }
  });

  // 2. Live pen / eraser path
  if (drawing && currentPath.length > 1 && (tool === 'pen' || tool === 'eraser')) {
    ctx.save();
    ctx.strokeStyle = tool === 'eraser' ? '#020617' : color;
    ctx.lineWidth   = tool === 'eraser' ? strokeSize * 5 : strokeSize;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    currentPath.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  }

  // 3. Live shape preview (rect, circle, arrow, frame)
  if (drawing && liveShape) {
    const { startPt: s, endPt: ep, tool: lt } = liveShape;
    ctx.save();
    ctx.strokeStyle = lt === 'frame' ? '#6366f1' : color;
    ctx.lineWidth   = lt === 'frame' ? 2 : strokeSize;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.setLineDash([4, 4]);

    if (lt === 'rect' || lt === 'frame') {
      const rx = Math.min(s.x, ep.x);
      const ry = Math.min(s.y, ep.y);
      const rw = Math.abs(ep.x - s.x);
      const rh = Math.abs(ep.y - s.y);
      if (lt === 'frame') {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
        ctx.fillRect(rx, ry, rw, rh);
      }
      ctx.strokeRect(rx, ry, rw, rh);
    } else if (lt === 'circle') {
      const cx = (s.x + ep.x) / 2;
      const cy = (s.y + ep.y) / 2;
      const rx = Math.abs(ep.x - s.x) / 2;
      const ry = Math.abs(ep.y - s.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (lt === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(ep.x, ep.y);
      ctx.stroke();
      const angle = Math.atan2(ep.y - s.y, ep.x - s.x);
      const hw = 10 + strokeSize;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ep.x, ep.y);
      ctx.lineTo(ep.x - hw * Math.cos(angle - Math.PI / 6), ep.y - hw * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(ep.x - hw * Math.cos(angle + Math.PI / 6), ep.y - hw * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = '#818cf8';
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Selection bounding outlines + 8 resize handles + rotation stem
  const allSelected = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
  allSelected.forEach((idx) => {
    const el = elements[idx];
    if (!el) return;
    const { box, handles } = getTransformHandles(el, zoom);

    ctx.save();
    if (box.rotation) {
      ctx.translate(box.cx, box.cy);
      ctx.rotate(box.rotation);
      ctx.translate(-box.cx, -box.cy);
    }

    if (el.type === 'arrow') {
      handles.forEach((h) => {
        const isMid = h.id === 'arrow-mid';
        ctx.beginPath();
        ctx.arc(h.x, h.y, isMid ? 5 / zoom : 6 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = isMid ? '#a855f7' : '#ffffff';
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 1.5 / zoom;
        ctx.fill();
        ctx.stroke();
      });
    } else {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth   = 1.5 / zoom;
      ctx.setLineDash([]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      // Rotation stem line from top edge up to rotation handle
      ctx.beginPath();
      ctx.moveTo(box.cx, box.y);
      ctx.lineTo(box.cx, box.y - 20 / zoom);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1 / zoom;
      ctx.stroke();

      // Rotation handle (top circle with indigo accent)
      ctx.fillStyle = '#6366f1';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.arc(box.cx, box.y - 20 / zoom, 4.5 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 8 Resize handles around perimeter
      const hs = 7 / zoom;
      handles.forEach((h) => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 1.5 / zoom;
        ctx.fillRect(h.unrotX - hs / 2, h.unrotY - hs / 2, hs, hs);
        ctx.strokeRect(h.unrotX - hs / 2, h.unrotY - hs / 2, hs, hs);
      });
    }

    ctx.restore();
  });

  // 5. Marquee selection box
  if (marquee && marquee.active) {
    const rx = Math.min(marquee.startX, marquee.currentX);
    const ry = Math.min(marquee.startY, marquee.currentY);
    const rw = Math.abs(marquee.currentX - marquee.startX);
    const rh = Math.abs(marquee.currentY - marquee.startY);
    ctx.save();
    ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([]);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  ctx.restore(); // restore zoom+pan transform
}
