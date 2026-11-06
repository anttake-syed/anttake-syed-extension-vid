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

/**
 * Test if mouse/pointer pos hits a resize or rotate handle
 */
export function hitTestHandles(el, pos, zoom = 1) {
  const { handles, rotationHandle } = getTransformHandles(el, zoom);
  const hitRadius = 9 / zoom;

  // Check rotation handle first
  if (Math.hypot(pos.x - rotationHandle.x, pos.y - rotationHandle.y) <= hitRadius) {
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
    const minX = Math.min(el.x, el.x2), maxX = Math.max(el.x, el.x2);
    const minY = Math.min(el.y, el.y2), maxY = Math.max(el.y, el.y2);
    return pos.x >= minX - 10 && pos.x <= maxX + 10 &&
           pos.y >= minY - 10 && pos.y <= maxY + 10;
  }

  if (el.type === 'path' && el.points?.length) {
    for (let p of el.points) {
      if (Math.hypot(p.x - pos.x, p.y - pos.y) < (el.size || 4) + 6) return true;
    }
  }

  return false;
}
