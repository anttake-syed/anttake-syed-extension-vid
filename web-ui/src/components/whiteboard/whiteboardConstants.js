export function generateDefaultName() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `Board ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export const TOOLS = [
  { id: 'select',  icon: 'near_me',                label: 'Select' },
  { id: 'pan',     icon: 'pan_tool',               label: 'Pan'    },
  { id: 'frame',   icon: 'crop_free',              label: 'Frame'  },
  { id: 'pen',     icon: 'edit',                   label: 'Pen'    },
  { id: 'text',    icon: 'title',                  label: 'Text'   },
  { id: 'rect',    icon: 'crop_square',            label: 'Rect'   },
  { id: 'circle',  icon: 'radio_button_unchecked', label: 'Circle' },
  { id: 'arrow',   icon: 'arrow_right_alt',        label: 'Arrow'  },
  { id: 'shapes',  icon: 'shapes',                 label: 'Shapes' },
  { id: 'icon',    icon: 'sentiment_satisfied',    label: 'Icons'  },
  { id: 'code',    icon: 'code',                   label: 'Code'   },
  { id: 'embed-frame', icon: 'iframe',             label: 'Embed Frame' },
  { id: 'eraser',  icon: 'ink_eraser',             label: 'Eraser' },
  { id: 'image',   icon: 'image',                  label: 'Image'  },
  { id: 'video',   icon: 'videocam',               label: 'Video'  },
];

export const PREBUILT_SHAPES = [
  { id: 'diamond',  label: 'Diamond / Decision', icon: 'diamond',          w: 120, h: 120 },
  { id: 'triangle', label: 'Triangle',           icon: 'change_history',   w: 120, h: 100 },
  { id: 'star',     label: 'Star',               icon: 'star',             w: 110, h: 110 },
  { id: 'hexagon',  label: 'Hexagon',            icon: 'hexagon',          w: 130, h: 110 },
  { id: 'cylinder', label: 'Database / Storage', icon: 'database',         w: 110, h: 130 },
  { id: 'cloud',    label: 'Cloud / Server',     icon: 'cloud',            w: 140, h: 90  },
  { id: 'callout',  label: 'Speech Bubble',      icon: 'chat_bubble',      w: 140, h: 100 },
];

export const DEVICE_FRAMES = [
  { id: 'browser', label: 'Browser Window', icon: 'web',        w: 640, h: 420 },
  { id: 'phone',   label: 'Mobile Phone',   icon: 'smartphone', w: 320, h: 620 },
  { id: 'tablet',  label: 'Tablet Display', icon: 'tablet',     w: 520, h: 680 },
  { id: 'desktop', label: 'Desktop Monitor',icon: 'desktop_windows', w: 680, h: 480 },
];

export const COLORS = [
  '#f8fafc', // Clean Slate White
  '#6366f1', // Brand Indigo
  '#3b82f6', // Professional Ocean Blue
  '#10b981', // Clean Emerald Green
  '#f59e0b', // Warm Amber / Yellow
  '#ef4444', // Crimson Coral Red
  '#8b5cf6', // Deep Purple
  '#ec4899', // Rose Pink
  '#06b6d4', // Teal Cyan
  '#64748b', // Modern Muted Slate
];

export const SIZES = [2, 4, 8, 14, 20];

export const BOARD_LIMIT_CLOUD = 1000;

// Bounded canvas mode — the fixed work area size in world-space units
export const BOUNDED_CANVAS_W = 4000;
export const BOUNDED_CANVAS_H = 3000;
