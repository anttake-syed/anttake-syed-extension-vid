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
  { id: 'eraser',  icon: 'ink_eraser',             label: 'Eraser' },
  { id: 'image',   icon: 'image',                  label: 'Image'  },
  { id: 'video',   icon: 'videocam',               label: 'Video'  },
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
