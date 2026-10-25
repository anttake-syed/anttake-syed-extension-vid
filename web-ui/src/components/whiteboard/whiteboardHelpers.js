import { SERVER_URL } from '../../config.js';

export const getFullSrc = (src, jwt) => {
  if (!src) return '';
  const url = src.startsWith('/') ? `${SERVER_URL}${src}` : src;
  if (!jwt) return url;
  return url.includes('?') ? `${url}&token=${jwt}` : `${url}?token=${jwt}`;
};

export function getElementBounds(el) {
  let minX = el.x, maxX = el.x, minY = el.y, maxY = el.y;
  if (el.type === 'image' || el.type === 'rect') {
    minX = Math.min(el.x, el.x + (el.w || 0));
    maxX = Math.max(el.x, el.x + (el.w || 0));
    minY = Math.min(el.y, el.y + (el.h || 0));
    maxY = Math.max(el.y, el.y + (el.h || 0));
  } else if (el.type === 'circle') {
    const rx = Math.abs((el.w || 0) / 2), ry = Math.abs((el.h || 0) / 2);
    const cx = el.x + (el.w || 0) / 2, cy = el.y + (el.h || 0) / 2;
    minX = cx - rx; maxX = cx + rx;
    minY = cy - ry; maxY = cy + ry;
  } else if (el.type === 'arrow') {
    minX = Math.min(el.x, el.x2); maxX = Math.max(el.x, el.x2);
    minY = Math.min(el.y, el.y2); maxY = Math.max(el.y, el.y2);
  } else if (el.type === 'text') {
    minX = el.x; maxX = el.x + 140;
    minY = el.y - (el.fontSize || 20); maxY = el.y;
  } else if (el.type === 'path' && el.points?.length) {
    minX = Math.min(...el.points.map(p => p.x));
    maxX = Math.max(...el.points.map(p => p.x));
    minY = Math.min(...el.points.map(p => p.y));
    maxY = Math.max(...el.points.map(p => p.y));
  }
  return { minX, maxX, minY, maxY };
}

export function generateThumbnailFromCanvas(canvas) {
  try {
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
    const THUMB_W = 320, THUMB_H = 180;
    const tc = document.createElement('canvas');
    tc.width = THUMB_W;
    tc.height = THUMB_H;
    const ctx = tc.getContext('2d');
    ctx.fillStyle = '#0a0f1c';
    ctx.fillRect(0, 0, THUMB_W, THUMB_H);
    const scale = Math.min(THUMB_W / canvas.width, THUMB_H / canvas.height);
    const dw = canvas.width * scale, dh = canvas.height * scale;
    ctx.drawImage(canvas, (THUMB_W - dw) / 2, (THUMB_H - dh) / 2, dw, dh);
    return tc.toDataURL('image/jpeg', 0.45);
  } catch (e) {
    console.error('Failed to generate thumbnail:', e);
    return null;
  }
}
