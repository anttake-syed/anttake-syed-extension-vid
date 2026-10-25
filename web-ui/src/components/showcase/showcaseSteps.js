/**
 * web-ui/src/components/showcase/showcaseSteps.js
 * 
 * Declarative step configuration for Guided Showcase Tour.
 * Supports Free (standard, interactive previews of locked features & upgrade paths)
 * and Pro (subscribed, cloud studio walkthrough).
 */

export const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/antcapture-record-sync-to/banjoihieniknhabacbbjnmlmlmcphcg';

export const SHOWCASE_STEPS = {
  standard: [
    {
      id: 'extension-anchor',
      targetSelector: '.profile-container, .header-actions, .header',
      preferredPosition: 'bottom',
      badge: 'Step 1: Capture Engine',
      badgeIcon: 'extension',
      title: 'Get the AntCapture Chrome Extension',
      description: 'Record any screen, window, or webcam with crystal-clear audio. 1-click capture with instant local or cloud export.',
      mediaType: 'interactive-extension',
      accentColor: '#6366f1',
      primaryActionText: 'Install Extension',
      actionUrl: CHROME_STORE_URL,
      // After step 1, automatically ensure we are on Dashboard
      navigateTo: 'Dashboard',
    },
    {
      id: 'dashboard-recent-activity-anchor',
      targetSelector: '[data-tour-anchor="recent-activity"], .dash-section-head, .recent-activity',
      preferredPosition: 'bottom',
      badge: 'Command Center & Activity',
      badgeIcon: 'history',
      title: 'Your Overview & Interactive Capture Demo',
      description: 'Recordings and screenshots appear right here in your Recent Activity. Try toggling and playing the interactive demo below!',
      mediaType: 'interactive-capture',
      accentColor: '#38bdf8',
    },
    {
      id: 'library-nav-anchor',
      targetSelector: '[data-nav="My Library"], .sidebar .nav-item:nth-child(3)',
      preferredPosition: 'right',
      badge: 'Pro Feature Preview 🔒',
      badgeIcon: 'photo_library',
      title: 'Searchable Cloud Video Library',
      description: 'The Cloud Library gives you lightning-fast fuzzy search, instant CDN video streaming, and shareable links. Preview how it streams below:',
      mediaType: 'interactive-library',
      accentColor: '#a855f7',
    },
    {
      id: 'whiteboards-nav-anchor',
      targetSelector: '[data-nav="Whiteboards"], .sidebar .nav-item:nth-child(2)',
      preferredPosition: 'right',
      badge: 'Pro Feature Preview 🔒',
      badgeIcon: 'draw',
      title: 'Infinite Spatial Whiteboard',
      description: 'Arrange captures, pin feedback notes, and design step-by-step visual documentation on an infinite canvas. Try clicking the sample cards below:',
      mediaType: 'interactive-whiteboard',
      accentColor: '#ec4899',
    },
    {
      id: 'settings-nav-anchor',
      targetSelector: '[data-nav="Settings"], .sidebar .nav-item:nth-child(4)',
      preferredPosition: 'right',
      badge: 'Workflow & Google Drive',
      badgeIcon: 'tune',
      title: 'Configurable Storage & Preferences',
      description: 'Directly connect Google Drive or AntCapture Cloud storage. Tailor playback speeds, custom upload destinations, and preferences.',
      mediaType: 'interactive-settings',
      accentColor: '#10b981',
      // Navigates to Pricing for the final upgrade step
      navigateTo: 'Pricing',
    },
    {
      id: 'pricing-upgrade-anchor',
      targetSelector: '.pricing-card, .plan-card, .pricing-grid, .pricing-page',
      preferredPosition: 'bottom',
      badge: 'Unlock Full Power ✨',
      badgeIcon: 'rocket_launch',
      title: 'Ready to Supercharge Your Workflow?',
      description: 'Unlock unlimited cloud video streaming, infinite spatial Whiteboards, and seamless team collaboration. Start creating today!',
      mediaType: 'cloud-upgrade',
      accentColor: '#6366f1',
      primaryActionText: 'Upgrade to Cloud',
    },
  ],

  pro: [
    {
      id: 'pro-welcome',
      targetSelector: '.profile-container, .header-actions, .header',
      preferredPosition: 'bottom',
      badge: 'AntCapture Cloud Studio',
      badgeIcon: 'verified',
      title: 'Welcome to AntCapture Cloud',
      description: 'Your workspace is equipped with high-speed cloud sync, instant CDN streaming, and full Whiteboard ideation.',
      mediaType: 'dashboard',
      accentColor: '#a855f7',
    },
    {
      id: 'pro-whiteboard',
      targetSelector: '[data-nav="Whiteboards"], .sidebar .nav-item:nth-child(2)',
      preferredPosition: 'right',
      badge: 'Spatial Workspace',
      badgeIcon: 'draw',
      title: 'Infinite Whiteboard Canvas',
      description: 'Organize high-resolution screenshots and HD recordings seamlessly across collaborative, spatial boards.',
      mediaType: 'interactive-whiteboard',
      accentColor: '#ec4899',
      navigateTo: 'Whiteboards',
      primaryActionText: 'Open Whiteboard',
    },
    {
      id: 'pro-library',
      targetSelector: '[data-nav="My Library"], .sidebar .nav-item:nth-child(3)',
      preferredPosition: 'right',
      badge: 'Cloud Sync Active',
      badgeIcon: 'cloud_done',
      title: 'High-Performance Video Streaming & Sharing',
      description: 'Generate instant public or password-protected review links delivered over global edge CDNs.',
      mediaType: 'interactive-library',
      accentColor: '#38bdf8',
      navigateTo: 'My Library',
      primaryActionText: 'Open Library',
    },
  ]
};
