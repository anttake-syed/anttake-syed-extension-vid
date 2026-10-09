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
   * Variant A — 3-step interactive click-through Spotlight Tour.
   * User is guided step-by-step, clicking highlighted elements.
   */
  A: {
    id: 'A',
    name: 'Interactive Spotlight Tour',
    // Show the tour once then never again. Set to false to show every time (for testing).
    showOnceOnly: true,
    // Whether the user can skip the tour at any step
    skippable: true,
    steps: [
      {
        targetId: 'btnCloud',
        spotlightPadding: 10,
        badge: '✦ Cloud Feature',
        title: 'Instant Cloud Sync',
        description: 'Click this button to experience exactly how fast AntCapture Cloud uploads your recording — instant, encrypted, shareable.',
        action: 'click_to_advance', // wait for user to click the target element
      },
      {
        targetId: 'uploadProgressWrap',
        spotlightPadding: 14,
        badge: '⚡ Blazing Fast',
        title: 'Uploads in Milliseconds',
        description: 'Your captures are securely synced to the cloud. Sharing a link takes less than a second.',
        action: 'simulate_progress', // play fake upload animation then auto-advance
        durationMs: 1200,
      },
      {
        targetId: null, // no spotlight — full-screen upgrade modal
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
