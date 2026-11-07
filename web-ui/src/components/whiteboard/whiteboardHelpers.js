import { SERVER_URL } from '../../config.js';

export const getFullSrc = (src, jwt) => {
  if (!src) return '';
  const url = src.startsWith('/') ? `${SERVER_URL}${src}` : src;
  if (!jwt) return url;
  return url.includes('?') ? `${url}&token=${jwt}` : `${url}?token=${jwt}`;
};

export function getElementBounds(el) {
  let minX = el.x, maxX = el.x, minY = el.y, maxY = el.y;
  if (el.type === 'image' || el.type === 'rect' || el.type === 'frame' || el.type === 'embed' || el.type === 'link') {
    const w = el.w || (el.type === 'embed' ? 420 : el.type === 'link' ? 360 : 200);
    const h = el.h || (el.type === 'embed' ? 260 : el.type === 'link' ? 150 : 200);
    minX = Math.min(el.x, el.x + w);
    maxX = Math.max(el.x, el.x + w);
    minY = Math.min(el.y, el.y + h);
    maxY = Math.max(el.y, el.y + h);
  } else if (el.type === 'circle') {
    const rx = Math.abs((el.w || 0) / 2), ry = Math.abs((el.h || 0) / 2);
    const cx = el.x + (el.w || 0) / 2, cy = el.y + (el.h || 0) / 2;
    minX = cx - rx; maxX = cx + rx;
    minY = cy - ry; maxY = cy + ry;
  } else if (el.type === 'arrow') {
    minX = Math.min(el.x, el.x2); maxX = Math.max(el.x, el.x2);
    minY = Math.min(el.y, el.y2); maxY = Math.max(el.y, el.y2);
  } else if (el.type === 'text') {
    minX = el.x; maxX = el.x + 160;
    minY = el.y - (el.fontSize || 20); maxY = el.y;
  } else if (el.type === 'path' && el.points?.length) {
    minX = Math.min(...el.points.map(p => p.x));
    maxX = Math.max(...el.points.map(p => p.x));
    minY = Math.min(...el.points.map(p => p.y));
    maxY = Math.max(...el.points.map(p => p.y));
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Checks if any element is outside the target board bounds [0, 0, targetW, targetH]
 */
export function areElementsOutsideBoard(elements, targetW = 4000, targetH = 3000) {
  if (!elements || elements.length === 0) return false;
  return elements.some(el => {
    const b = getElementBounds(el);
    return b.minX < 0 || b.minY < 0 || b.maxX > targetW || b.maxY > targetH;
  });
}

/**
 * Scales and translates scattered elements so that they all fit neatly inside the bounded board
 */
export function compactElementsToBoard(elements, targetW = 4000, targetH = 3000, padding = 120) {
  if (!elements || elements.length === 0) return elements;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  elements.forEach(el => {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  });

  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
    return elements;
  }

  const currentW = Math.max(50, maxX - minX);
  const currentH = Math.max(50, maxY - minY);

  const availW = targetW - padding * 2;
  const availH = targetH - padding * 2;

  // Scale down if elements exceed the board size
  const scale = Math.min(1, Math.min(availW / currentW, availH / currentH));

  const scaledW = currentW * scale;
  const scaledH = currentH * scale;

  // Center inside the target board [0, 0, targetW, targetH]
  const offsetX = (targetW - scaledW) / 2 - minX * scale;
  const offsetY = (targetH - scaledH) / 2 - minY * scale;

  return elements.map(el => {
    const next = { ...el };
    if (next.x !== undefined) next.x = Math.round(next.x * scale + offsetX);
    if (next.y !== undefined) next.y = Math.round(next.y * scale + offsetY);
    if (next.w !== undefined) next.w = Math.round(next.w * scale);
    if (next.h !== undefined) next.h = Math.round(next.h * scale);
    if (next.x2 !== undefined) next.x2 = Math.round(next.x2 * scale + offsetX);
    if (next.y2 !== undefined) next.y2 = Math.round(next.y2 * scale + offsetY);
    if (next.cpx !== undefined) next.cpx = Math.round(next.cpx * scale + offsetX);
    if (next.cpy !== undefined) next.cpy = Math.round(next.cpy * scale + offsetY);
    if (next.fontSize !== undefined) next.fontSize = Math.max(12, Math.round(next.fontSize * scale));
    if (next.points && Array.isArray(next.points)) {
      next.points = next.points.map(p => ({
        x: Math.round(p.x * scale + offsetX),
        y: Math.round(p.y * scale + offsetY),
      }));
    }
    return next;
  });
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

/**
 * Extract YouTube Video ID from various URL formats
 * (youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/..., youtube.com/shorts/...)
 */
export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
  );
  return match ? match[1] : null;
}

/**
 * Validate and clean a pasted string into a full HTTP/HTTPS URL
 */
export function parsePastedUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  // Quick test: starts with http://, https://, or common domain pattern like www. or something.com
  const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)$/i;
  if (!urlRegex.test(trimmed)) return null;

  try {
    const candidate = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
    return parsed.href;
  } catch (_) {
    return null;
  }
}

/**
 * Detect popular integration services for enhanced card styling
 */
export function detectSmartService(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const pathname = u.pathname.toLowerCase();

    // Google Docs
    if (host.includes('docs.google.com')) {
      if (pathname.includes('/spreadsheets')) {
        return { type: 'google-sheets', name: 'Google Sheets', icon: 'table_chart', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' };
      }
      if (pathname.includes('/presentation')) {
        return { type: 'google-slides', name: 'Google Slides', icon: 'co_present', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' };
      }
      if (pathname.includes('/forms')) {
        return { type: 'google-forms', name: 'Google Forms', icon: 'assignment', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.35)' };
      }
      return { type: 'google-docs', name: 'Google Docs', icon: 'description', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)' };
    }

    // Google Drive
    if (host.includes('drive.google.com')) {
      return { type: 'google-drive', name: 'Google Drive', icon: 'add_to_drive', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' };
    }

    // Google Calendar
    if (host.includes('calendar.google.com')) {
      return { type: 'google-calendar', name: 'Google Calendar', icon: 'calendar_month', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)' };
    }

    // GitHub
    if (host.includes('github.com')) {
      return { type: 'github', name: 'GitHub', icon: 'code', color: '#e2e8f0', bg: 'rgba(255, 255, 255, 0.12)', border: 'rgba(255, 255, 255, 0.25)' };
    }

    // Figma
    if (host.includes('figma.com')) {
      return { type: 'figma', name: 'Figma', icon: 'draw', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.35)' };
    }

    // Loom
    if (host.includes('loom.com')) {
      return { type: 'loom', name: 'Loom Video', icon: 'videocam', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)' };
    }

    return null;
  } catch (_) {
    return null;
  }
}
