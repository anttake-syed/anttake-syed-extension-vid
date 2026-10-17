/**
 * extension/demoVariants.js
 *
 * ──────────────────────────────────────────────────────────────────
 * MODULAR DEMO CONFIGURATION
 * Change ACTIVE_VARIANT to switch between demo styles instantly.
 * Add a new key to DEMO_VARIANTS to create a new variant — the
 * core extension code never needs to change.
 * ──────────────────────────────────────────────────────────────────
 */

export const DEMO_VARIANTS = {

  /**
   * Variant A — Comprehensive click-through Feature Tour of edit.html.
   * Highlights each save destination, auto-save toggle, and cloud benefits.
   */
  A: {
    id: 'A',
    name: 'Interactive Feature Tour',
    showOnceOnly: true,
    skippable: true,
    steps: [
      {
        targetId: 'btnComputer',
        spotlightPadding: 8,
        badge: '💾 Local Export',
        title: 'Save to Computer',
        description: 'Instant zero-upload download. Saves your video (.webm) or screenshot (.png) directly to your machine with standard filename and quality controls.',
        action: 'click_to_advance',
      },
      {
        targetId: 'btnCloud',
        spotlightPadding: 8,
        badge: '✦ Cloud & Dashboard',
        title: 'AntCapture Web & Drive',
        description: 'Syncs your capture directly to your AntCapture web library and Google Drive. Instant shareable link, transcription, and preview in seconds.',
        action: 'click_to_advance',
      },
      {
        targetId: 'uploadProgressWrap',
        spotlightPadding: 12,
        badge: '⚡ Blazing Fast',
        title: 'Fast Cloud Processing',
        description: 'Watch captures compress and upload with live percentage feedback directly inside your sidebar without blocking your work.',
        action: 'simulate_progress',
        durationMs: 1200,
      },
      {
        targetId: 'btnDrive',
        spotlightPadding: 8,
        badge: '📁 Direct Drive',
        title: 'Google Drive Only',
        description: 'Send files straight to your own personal Google Drive folder without storing copies on AntCapture cloud servers.',
        action: 'click_to_advance',
      },
      {
        targetId: 'btnLocal',
        spotlightPadding: 8,
        badge: '🛡️ Self-Hosted',
        title: 'Self-Hosted Storage',
        description: 'Connect your own private server or local network storage backend for 100% data sovereignty and corporate privacy compliance.',
        action: 'click_to_advance',
      },
      {
        targetId: null, // full-screen upgrade modal
        badge: null,
        title: null,
        description: null,
        action: 'show_upgrade_modal',
      },
    ],
  },

  /**
   * Variant B — Auto-playing cinematic animation. No user clicks needed.
   * The demo plays itself like a product video, then shows the upgrade modal.
   */
  B: {
    id: 'B',
    name: 'Cinematic Auto-Play',
    showOnceOnly: true,
    skippable: true,
    steps: [
      {
        targetId: 'btnCloud',
        spotlightPadding: 10,
        badge: '✦ See It In Action',
        title: 'Watch Cloud in Action',
        description: 'This is how effortlessly your next recording could be shared — see the full flow in 3 seconds.',
        action: 'auto_advance', // auto advance after delay, no click needed
        durationMs: 2500,
      },
      {
        targetId: 'uploadProgressWrap',
        spotlightPadding: 14,
        badge: '⚡ Instant',
        title: 'Instant Upload',
        description: 'Done. Your capture is now synced and shareable with a single link.',
        action: 'simulate_progress',
        durationMs: 1000,
      },
      {
        targetId: null,
        action: 'show_upgrade_modal',
      },
    ],
  },
};

/**
 * ── ACTIVE VARIANT SELECTOR ────────────────────────────────────────────────
 * Change this ONE line to instantly switch the demo experience.
 * Options: 'A' | 'B'
 */
export const ACTIVE_VARIANT_ID = 'A';

export const ACTIVE_VARIANT = DEMO_VARIANTS[ACTIVE_VARIANT_ID];

/**
 * Upgrade modal copy — edit freely without touching tour logic.
 */
export const UPGRADE_MODAL_CONFIG = {
  headline: "That's Cloud. Yours to keep.",
  subtext: 'Unlimited uploads. Instant shareable links. Works with every capture you make.',
  primaryCta: '✦ Unlock Cloud Now',
  secondaryCta: 'Maybe later',
  // URL to redirect to when clicking the primary CTA
  // source param helps track how many users upgrade from the demo
  upgradeUrl: () => {
    const base = 'https://antcapture.com/pricing';
    return `${base}?source=extension_demo_v${ACTIVE_VARIANT_ID}`;
  },
};
