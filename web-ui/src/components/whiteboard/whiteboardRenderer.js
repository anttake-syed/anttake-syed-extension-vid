import {
  getElementTransformBox,
  getTransformHandles,
  drawHandDrawnRect,
  drawHandDrawnCircle,
  drawHandDrawnArrow,
  getFillColor,
} from './whiteboardTransform.js';

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
  } = state;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply zoom + pan transform
  ctx.save();
  ctx.translate(panOffset.x, panOffset.y);
  ctx.scale(zoom, zoom);

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
