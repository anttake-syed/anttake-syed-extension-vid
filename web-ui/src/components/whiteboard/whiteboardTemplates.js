/**
 * Professional Whiteboard Templates
 * Industry-standard starter canvases for brainstorming, planning, and design.
 */

export const WHITEBOARD_TEMPLATES = [
  {
    id: 'kanban',
    title: 'Kanban Task Board',
    category: 'Agile & Workflow',
    description: '3-column agile workflow board (To Do, In Progress, Done) with colored story cards.',
    icon: 'view_kanban',
    badge: 'Popular',
    createElements: () => {
      const colWidth = 260;
      const colHeight = 520;
      const startX = 60;
      const startY = 70;

      const columns = [
        { title: 'TO DO', color: '#60a5fa', count: 3, cards: ['Research competitor flows', 'Draft UI mockups', 'Define API specs'] },
        { title: 'IN PROGRESS', color: '#facc15', count: 2, cards: ['Build canvas templates', 'Implement contextual bar'] },
        { title: 'DONE', color: '#4ade80', count: 2, cards: ['Setup database schema', 'Cloud sync integration'] },
      ];

      const els = [];

      // Board title
      els.push({
        type: 'text',
        text: 'PROJECT SPRINT BOARD',
        x: startX,
        y: startY - 24,
        color: '#f8fafc',
        fontSize: 22,
      });

      columns.forEach((col, colIdx) => {
        const cx = startX + colIdx * (colWidth + 24);
        const cy = startY;

        // Column outer container
        els.push({
          type: 'rect',
          x: cx,
          y: cy,
          w: colWidth,
          h: colHeight,
          color: col.color,
          size: 2,
        });

        // Column header label
        els.push({
          type: 'text',
          text: `${col.title} (${col.cards.length})`,
          x: cx + 16,
          y: cy + 32,
          color: col.color,
          fontSize: 16,
        });

        // Column header dividing line
        els.push({
          type: 'rect',
          x: cx + 12,
          y: cy + 44,
          w: colWidth - 24,
          h: 1,
          color: 'rgba(255,255,255,0.15)',
          size: 1,
        });

        // Cards inside column
        col.cards.forEach((cardText, cardIdx) => {
          const cardY = cy + 60 + cardIdx * 80;
          els.push({
            type: 'rect',
            x: cx + 14,
            y: cardY,
            w: colWidth - 28,
            h: 64,
            color: '#94a3b8',
            size: 2,
          });
          els.push({
            type: 'text',
            text: cardText,
            x: cx + 24,
            y: cardY + 36,
            color: '#f8fafc',
            fontSize: 13,
          });
        });
      });

      return els;
    },
  },
  {
    id: 'mindmap',
    title: 'Mind Map & Brainstorm',
    category: 'Ideation',
    description: 'Central concept with radiating sub-branches and ideation cards.',
    icon: 'hub',
    badge: 'Ideation',
    createElements: () => {
      const els = [];
      const centerX = 480;
      const centerY = 320;

      // Central Hub
      els.push({
        type: 'rect',
        x: centerX - 100,
        y: centerY - 40,
        w: 200,
        h: 80,
        color: '#a78bfa',
        size: 3,
      });
      els.push({
        type: 'text',
        text: 'CORE PRODUCT VISION',
        x: centerX - 82,
        y: centerY + 6,
        color: '#f8fafc',
        fontSize: 16,
      });

      // Nodes radiating outwards
      const nodes = [
        { label: 'Cloud Architecture', x: 140, y: 140, color: '#60a5fa' },
        { label: 'Security & Auth',    x: 740, y: 140, color: '#f87171' },
        { label: 'UX & Interaction',   x: 140, y: 500, color: '#4ade80' },
        { label: 'Growth & Sharing',   x: 740, y: 500, color: '#fb923c' },
      ];

      nodes.forEach(n => {
        // Node container
        els.push({
          type: 'circle',
          x: n.x,
          y: n.y,
          w: 160,
          h: 80,
          color: n.color,
          size: 2,
        });
        els.push({
          type: 'text',
          text: n.label,
          x: n.x + 16,
          y: n.y + 45,
          color: '#f8fafc',
          fontSize: 13,
        });

        // Connector Arrow
        const fromCenterX = n.x < centerX ? n.x + 160 : n.x;
        const fromCenterY = n.y + 40;
        const toX = n.x < centerX ? centerX - 100 : centerX + 100;
        const toY = centerY;

        els.push({
          type: 'arrow',
          x: fromCenterX,
          y: fromCenterY,
          x2: toX,
          y2: toY,
          color: n.color,
          size: 2,
        });
      });

      return els;
    },
  },
  {
    id: 'retro',
    title: 'Sprint Retrospective',
    category: 'Agile & Team',
    description: 'What went well, what could be improved, and action items for next sprint.',
    icon: 'published_with_changes',
    badge: 'Team',
    createElements: () => {
      const els = [];
      const colWidth = 270;
      const colHeight = 480;
      const startX = 60;
      const startY = 80;

      const columns = [
        { title: '🟢 What Went Well', color: '#4ade80', notes: ['High test coverage', 'Smooth deployments', 'Great team pairing'] },
        { title: '🔴 What Could Improve', color: '#f87171', notes: ['Spec ambiguity in PRD', 'Long build pipeline times'] },
        { title: '⚡ Action Items', color: '#facc15', notes: ['Cache npm dependencies', 'Schedule weekly grooming'] },
      ];

      els.push({
        type: 'text',
        text: 'SPRINT RETROSPECTIVE',
        x: startX,
        y: startY - 24,
        color: '#f8fafc',
        fontSize: 22,
      });

      columns.forEach((col, idx) => {
        const cx = startX + idx * (colWidth + 24);
        const cy = startY;

        els.push({
          type: 'rect',
          x: cx,
          y: cy,
          w: colWidth,
          h: colHeight,
          color: col.color,
          size: 2,
        });

        els.push({
          type: 'text',
          text: col.title,
          x: cx + 16,
          y: cy + 32,
          color: col.color,
          fontSize: 16,
        });

        col.notes.forEach((note, noteIdx) => {
          const cardY = cy + 54 + noteIdx * 72;
          els.push({
            type: 'rect',
            x: cx + 12,
            y: cardY,
            w: colWidth - 24,
            h: 56,
            color: '#64748b',
            size: 2,
          });
          els.push({
            type: 'text',
            text: `• ${note}`,
            x: cx + 22,
            y: cardY + 33,
            color: '#f8fafc',
            fontSize: 13,
          });
        });
      });

      return els;
    },
  },
  {
    id: 'flowchart',
    title: 'User Flow & Decision Tree',
    category: 'Architecture',
    description: 'System flow diagram with start node, decision logic, and outcomes.',
    icon: 'account_tree',
    badge: 'System',
    createElements: () => {
      const els = [];

      els.push({
        type: 'text',
        text: 'USER ONBOARDING & AUTH FLOW',
        x: 80,
        y: 40,
        color: '#f8fafc',
        fontSize: 20,
      });

      // Start Node (Pill / Ellipse)
      els.push({
        type: 'circle',
        x: 80,
        y: 80,
        w: 160,
        h: 70,
        color: '#4ade80',
        size: 2,
      });
      els.push({
        type: 'text',
        text: 'User Lands on App',
        x: 100,
        y: 120,
        color: '#f8fafc',
        fontSize: 13,
      });

      // Arrow to Decision
      els.push({
        type: 'arrow',
        x: 240,
        y: 115,
        x2: 360,
        y2: 115,
        color: '#94a3b8',
        size: 2,
      });

      // Decision Node (Rect)
      els.push({
        type: 'rect',
        x: 360,
        y: 75,
        w: 170,
        h: 80,
        color: '#facc15',
        size: 2,
      });
      els.push({
        type: 'text',
        text: 'Already Signed In?',
        x: 380,
        y: 120,
        color: '#f8fafc',
        fontSize: 13,
      });

      // Arrow YES -> Dashboard
      els.push({
        type: 'arrow',
        x: 530,
        y: 115,
        x2: 660,
        y2: 115,
        color: '#4ade80',
        size: 2,
      });
      els.push({
        type: 'text',
        text: 'YES',
        x: 575,
        y: 105,
        color: '#4ade80',
        fontSize: 12,
      });

      els.push({
        type: 'rect',
        x: 660,
        y: 80,
        w: 170,
        h: 70,
        color: '#60a5fa',
        size: 2,
      });
      els.push({
        type: 'text',
        text: 'Open Dashboard',
        x: 690,
        y: 122,
        color: '#f8fafc',
        fontSize: 14,
      });

      // Arrow NO -> Auth Dialog
      els.push({
        type: 'arrow',
        x: 445,
        y: 155,
        x2: 445,
        y2: 260,
        color: '#f87171',
        size: 2,
      });
      els.push({
        type: 'text',
        text: 'NO',
        x: 455,
        y: 205,
        color: '#f87171',
        fontSize: 12,
      });

      els.push({
        type: 'rect',
        x: 360,
        y: 260,
        w: 170,
        h: 70,
        color: '#f87171',
        size: 2,
      });
      els.push({
        type: 'text',
        text: 'Show Login / Sign Up',
        x: 375,
        y: 302,
        color: '#f8fafc',
        fontSize: 13,
      });

      return els;
    },
  },
  {
    id: 'storymap',
    title: 'User Story Mapping',
    category: 'Product & UX',
    description: 'Map user journey activities across horizontal spine and vertical release slices.',
    icon: 'linear_scale',
    badge: 'Roadmap',
    createElements: () => {
      const els = [];
      const startX = 60;
      const startY = 80;

      els.push({
        type: 'text',
        text: 'USER JOURNEY & STORY MAP',
        x: startX,
        y: startY - 24,
        color: '#f8fafc',
        fontSize: 22,
      });

      const steps = [
        { activity: '1. Discover', color: '#60a5fa', stories: ['Landing page preview', 'Read feature specs'] },
        { activity: '2. Capture Screen', color: '#a78bfa', stories: ['Select monitor/window', 'Draw shapes while recording'] },
        { activity: '3. Edit & Annotate', color: '#f472b6', stories: ['Insert into Whiteboard', 'Add arrows & notes'] },
        { activity: '4. Share Link', color: '#4ade80', stories: ['Generate public link', 'Export canvas as PNG'] },
      ];

      steps.forEach((step, idx) => {
        const sx = startX + idx * 210;
        // Backbone Activity Header
        els.push({
          type: 'rect',
          x: sx,
          y: startY,
          w: 190,
          h: 54,
          color: step.color,
          size: 2,
        });
        els.push({
          type: 'text',
          text: step.activity,
          x: sx + 14,
          y: startY + 33,
          color: '#f8fafc',
          fontSize: 14,
        });

        // Vertical story cards
        step.stories.forEach((st, sIdx) => {
          const sy = startY + 74 + sIdx * 70;
          els.push({
            type: 'rect',
            x: sx,
            y: sy,
            w: 190,
            h: 56,
            color: '#64748b',
            size: 2,
          });
          els.push({
            type: 'text',
            text: st,
            x: sx + 12,
            y: sy + 33,
            color: '#f8fafc',
            fontSize: 12,
          });
        });
      });

      return els;
    },
  },
];
