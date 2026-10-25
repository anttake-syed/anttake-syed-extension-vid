export function generateDefaultName() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `Board ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export const TOOLS = [
  { id: 'select',  icon: 'near_me',                label: 'Select'  },
  { id: 'pen',     icon: 'edit',                   label: 'Pen'     },
  { id: 'text',    icon: 'title',                  label: 'Text'    },
  { id: 'rect',    icon: 'crop_square',            label: 'Rect'    },
  { id: 'circle',  icon: 'radio_button_unchecked', label: 'Circle'  },
  { id: 'arrow',   icon: 'arrow_right_alt',        label: 'Arrow'   },
  { id: 'eraser',  icon: 'ink_eraser',             label: 'Eraser'  },
  { id: 'image',   icon: 'image',                  label: 'Image'   },
  { id: 'video',   icon: 'videocam',               label: 'Video'   },
];

export const COLORS = ['#f8fafc', '#f87171', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#94a3b8'];

export const SIZES = [2, 4, 8, 14, 20];

export const BOARD_LIMIT_CLOUD = 1000;
