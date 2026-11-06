/**
 * Whiteboard Transform & Geometry Math Engine
 * Supports 8-handle directional scaling/resizing, rotation around element center,
 * frame containment, and hit-testing.
 */

export const RESIZE_HANDLES = [
  { id: 'nw', cursor: 'nwse-resize', xRatio: 0,   yRatio: 0   },
  { id: 'n',  cursor: 'ns-resize',   xRatio: 0.5, yRatio: 0   },
  { id: 'ne', cursor: 'nesw-resize', xRatio: 1,   yRatio: 0   },
  { id: 'e',  cursor: 'ew-resize',   xRatio: 1,   yRatio: 0.5 },
  { id: 'se', cursor: 'nwse-resize', xRatio: 1,   yRatio: 1   },
  { id: 's',  cursor: 'ns-resize',   xRatio: 0.5, yRatio: 1   },
  { id: 'sw', cursor: 'nesw-resize', xRatio: 0,   yRatio: 1   },
  { id: 'w',  cursor: 'ew-resize',   xRatio: 0,   yRatio: 0.5 },
];

/**
 * Rotate a point around an origin by angle in radians
 */
export function rotatePoint(px, py, cx, cy, angle) {
  if (!angle) return { x: px, y: py };
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + (dx * cos - dy * sin),
    y: cy + (dx * sin + dy * cos),
  };
}

/**
 * Normalize an element's bounding box into x, y, w, h, rotation, center
 */
export function getElementTransformBox(el) {
  let x = el.x || 0;
  let y = el.y || 0;
  let w = el.w || 0;
  let h = el.h || 0;
  const rotation = el.rotation || 0;

  if (el.type === 'circle') {
    w = Math.abs(el.w || 0);
    h = Math.abs(el.h || 0);
  } else if (el.type === 'text') {
    w = el.w || 140;
    h = el.h || (el.fontSize ? el.fontSize * 1.3 : 26);
    // for text, baseline y is adjusted to top-left
    y = el.y - (el.fontSize || 20);
  } else if (el.type === 'arrow') {
    const minX = Math.min(el.x, el.x2);
    const maxX = Math.max(el.x, el.x2);
    const minY = Math.min(el.y, el.y2);
    const maxY = Math.max(el.y, el.y2);
    x = minX;
    y = minY;
    w = Math.max(20, maxX - minX);
    h = Math.max(20, maxY - minY);
  } else if (el.type === 'path' && el.points?.length) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    el.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    x = minX;
    y = minY;
    w = Math.max(10, maxX - minX);
    h = Math.max(10, maxY - minY);
  }

  const cx = x + w / 2;
  const cy = y + h / 2;
  return { x, y, w, h, cx, cy, rotation };
}

/**
 * Returns positions of all 8 resize handles and 1 rotation handle in world space
 */
export function getTransformHandles(el, zoom = 1) {
  const box = getElementTransformBox(el);
  const handleSize = 8 / zoom;
  const rotDist = 26 / zoom;

  // Dedicated handles for Arrows: start handle, end handle, and curve control handle
  if (el.type === 'arrow') {
    const startX = el.x ?? 0;
    const startY = el.y ?? 0;
    const endX = el.x2 ?? (startX + 100);
    const endY = el.y2 ?? startY;
    const midX = el.cpx !== undefined ? el.cpx : (startX + endX) / 2;
    const midY = el.cpy !== undefined ? el.cpy : (startY + endY) / 2;

    return {
      box,
      isArrow: true,
      handles: [
        { id: 'arrow-start', cursor: 'grab', x: startX, y: startY, unrotX: startX, unrotY: startY, size: handleSize },
        { id: 'arrow-mid',   cursor: 'move', x: midX,   y: midY,   unrotX: midX,   unrotY: midY,   size: handleSize },
        { id: 'arrow-end',   cursor: 'grab', x: endX,   y: endY,   unrotX: endX,   unrotY: endY,   size: handleSize },
      ],
      rotationHandle: {
        id: 'rotate',
        cursor: 'grab',
        x: rotPtX(box, rotDist),
        y: rotPtY(box, rotDist),
        size: handleSize,
        stemStartY: box.y,
      },
    };
  }

  const handles = RESIZE_HANDLES.map(h => {
    const unrotX = box.x + box.w * h.xRatio;
    const unrotY = box.y + box.h * h.yRatio;
    const pt = rotatePoint(unrotX, unrotY, box.cx, box.cy, box.rotation);
    return {
      id: h.id,
      cursor: h.cursor,
      x: pt.x,
      y: pt.y,
      unrotX,
      unrotY,
      xRatio: h.xRatio,
      yRatio: h.yRatio,
      size: handleSize,
    };
  });

  // Rotation handle (placed above the North handle)
  const unrotRotX = box.cx;
  const unrotRotY = box.y - rotDist;
  const rotPt = rotatePoint(unrotRotX, unrotRotY, box.cx, box.cy, box.rotation);

  return {
    box,
    isArrow: false,
    handles,
    rotationHandle: {
      id: 'rotate',
      cursor: 'grab',
      x: rotPt.x,
      y: rotPt.y,
      size: handleSize,
      stemStartY: box.y,
    },
  };
}

function rotPtX(box, rotDist) {
  return rotatePoint(box.cx, box.y - rotDist, box.cx, box.cy, box.rotation).x;
}
function rotPtY(box, rotDist) {
  return rotatePoint(box.cx, box.y - rotDist, box.cx, box.cy, box.rotation).y;
}

/**
 * Test if mouse/pointer pos hits a resize or rotate handle
 */
export function hitTestHandles(el, pos, zoom = 1) {
  const { handles, rotationHandle, isArrow } = getTransformHandles(el, zoom);
  const hitRadius = 10 / zoom;

  // Arrow handles: check start, end, and curve control points
  if (isArrow) {
    for (const h of handles) {
      if (Math.hypot(pos.x - h.x, pos.y - h.y) <= hitRadius) {
        return { type: 'arrow-handle', handle: h };
      }
    }
  }

  // Check rotation handle
  if (rotationHandle && Math.hypot(pos.x - rotationHandle.x, pos.y - rotationHandle.y) <= hitRadius) {
    return { type: 'rotate', handle: rotationHandle };
  }

  // Check 8 resize handles
  for (const h of handles) {
    if (Math.hypot(pos.x - h.x, pos.y - h.y) <= hitRadius) {
      return { type: 'resize', handle: h };
    }
  }

  return null;
}

/**
 * Check if world pos is inside an element (accounting for rotation)
 */
export function hitTestElement(el, pos) {
  const box = getElementTransformBox(el);
  // Transform point into element's local unrotated space
  const unrot = rotatePoint(pos.x, pos.y, box.cx, box.cy, -box.rotation);

  if (el.type === 'frame') {
    // Frames are hit by clicking their header banner or body
    return unrot.x >= box.x && unrot.x <= box.x + box.w &&
           unrot.y >= box.y && unrot.y <= box.y + box.h;
  }

  if (el.type === 'rect' || el.type === 'image') {
    return unrot.x >= box.x - 4 && unrot.x <= box.x + box.w + 4 &&
           unrot.y >= box.y - 4 && unrot.y <= box.y + box.h + 4;
  }

  if (el.type === 'circle') {
    const rx = box.w / 2;
    const ry = box.h / 2;
    const dx = unrot.x - box.cx;
    const dy = unrot.y - box.cy;
    return (dx * dx) / (rx * rx + 4) + (dy * dy) / (ry * ry + 4) <= 1;
  }

  if (el.type === 'text') {
    return unrot.x >= box.x - 6 && unrot.x <= box.x + box.w + 6 &&
           unrot.y >= box.y - 4 && unrot.y <= box.y + box.h + 6;
  }

  if (el.type === 'arrow') {
    const minX = Math.min(el.x, el.x2, el.cpx !== undefined ? el.cpx : el.x);
    const maxX = Math.max(el.x, el.x2, el.cpx !== undefined ? el.cpx : el.x);
    const minY = Math.min(el.y, el.y2, el.cpy !== undefined ? el.cpy : el.y);
    const maxY = Math.max(el.y, el.y2, el.cpy !== undefined ? el.cpy : el.y);
    return pos.x >= minX - 14 && pos.x <= maxX + 14 &&
           pos.y >= minY - 14 && pos.y <= maxY + 14;
  }

  if (el.type === 'path' && el.points?.length) {
    for (let p of el.points) {
      if (Math.hypot(p.x - pos.x, p.y - pos.y) < (el.size || 4) + 6) return true;
    }
  }

  return false;
}

/**
 * Convert any HEX color to transparent rgba fill matching Excalidraw / Miro style
 */
export function getFillColor(hex, opacity = 0.18) {
  if (!hex || hex === 'transparent') return 'transparent';
  if (hex.startsWith('rgba')) return hex;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Draw hand-drawn textured rectangle with rounded corners (Excalidraw aesthetic)
 */
export function drawHandDrawnRect(ctx, x, y, w, h, options = {}) {
  const {
    stroke = '#6366f1',
    fill = 'transparent',
    fillStyle = 'solid', // 'none', 'solid', 'hachure'
    strokeWidth = 2,
    radius = 12,
  } = options;

  const actualRadius = Math.min(Math.abs(w) / 2, Math.abs(h) / 2, radius);
  const minX = Math.min(x, x + w);
  const minY = Math.min(y, y + h);
  const absW = Math.abs(w);
  const absH = Math.abs(h);

  // 1. Draw Background Fill with soft watercolor texture
  if (fill && fill !== 'transparent' && fillStyle !== 'none') {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(minX, minY, absW, absH, actualRadius);
    ctx.fillStyle = fill;
    ctx.fill();

    // Subtle hatch lines for pencil/sketch texture if hachure or semi-transparent
    if (fillStyle === 'hachure' || fillStyle === 'solid') {
      ctx.clip();
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.25;
      const step = 8;
      for (let lx = minX - absH; lx < minX + absW + absH; lx += step) {
        ctx.beginPath();
        ctx.moveTo(lx, minY);
        ctx.lineTo(lx + absH, minY + absH);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 2. Double-pass organic hand-drawn stroke with rounded corners
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Primary smooth path
  ctx.beginPath();
  ctx.roundRect(minX, minY, absW, absH, actualRadius);
  ctx.stroke();

  // Secondary organic pencil pass (slight subtle offset for that Excalidraw charm)
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1, strokeWidth * 0.7);
  ctx.beginPath();
  ctx.roundRect(minX + 0.5, minY + 0.5, absW - 0.5, absH - 0.5, actualRadius);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw hand-drawn textured circle / ellipse with organic feel
 */
export function drawHandDrawnCircle(ctx, cx, cy, rx, ry, options = {}) {
  const {
    stroke = '#6366f1',
    fill = 'transparent',
    fillStyle = 'solid',
    strokeWidth = 2,
  } = options;

  const rX = Math.abs(rx);
  const rY = Math.abs(ry);

  // 1. Background Fill with texture
  if (fill && fill !== 'transparent' && fillStyle !== 'none') {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rX, rY, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    // Subtle hand-hatch lines
    if (fillStyle === 'hachure' || fillStyle === 'solid') {
      ctx.clip();
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.25;
      const step = 8;
      for (let lx = cx - rX - rY; lx < cx + rX + rY; lx += step) {
        ctx.beginPath();
        ctx.moveTo(lx, cy - rY);
        ctx.lineTo(lx + rY * 2, cy + rY);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 2. Double-pass hand-drawn organic stroke
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.ellipse(cx, cy, rX, rY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Second pass with slight pencil wobble
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1, strokeWidth * 0.7);
  ctx.beginPath();
  ctx.ellipse(cx + 0.4, cy + 0.4, rX - 0.3, rY - 0.3, 0.01, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw professional arrow with bend control and arrowhead
 */
export function drawHandDrawnArrow(ctx, x1, y1, x2, y2, cpx, cpy, options = {}) {
  const {
    stroke = '#6366f1',
    strokeWidth = 2,
  } = options;

  const hasCp = cpx !== undefined && cpy !== undefined;
  const midX = hasCp ? cpx : (x1 + x2) / 2;
  const midY = hasCp ? cpy : (y1 + y2) / 2;

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Curve / Line path
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  if (hasCp) {
    ctx.quadraticCurveTo(midX, midY, x2, y2);
  } else {
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();

  // Secondary organic sketch pass
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1, strokeWidth * 0.65);
  ctx.beginPath();
  ctx.moveTo(x1 + 0.4, y1 + 0.4);
  if (hasCp) {
    ctx.quadraticCurveTo(midX + 0.4, midY + 0.4, x2, y2);
  } else {
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.restore();

  // Arrowhead angle at (x2, y2)
  const angle = hasCp
    ? Math.atan2(y2 - midY, x2 - midX)
    : Math.atan2(y2 - y1, x2 - x1);

  const hw = 10 + strokeWidth * 1.5;
  ctx.save();
  ctx.fillStyle = stroke;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hw * Math.cos(angle - Math.PI / 6), y2 - hw * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - hw * Math.cos(angle + Math.PI / 6), y2 - hw * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
