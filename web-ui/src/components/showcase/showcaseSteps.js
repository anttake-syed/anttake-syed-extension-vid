/**
 * web-ui/src/components/showcase/showcaseSteps.js
 * 
 * Declarative step configuration for Guided Showcase Tour.
 * Supports Free (standard) and Pro (subscribed) variants.
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
      description: 'Record any screen, browser tab, or webcam with crystal-clear audio. Your captures sync directly to your cloud library.',
      mediaType: 'extension',
      accentColor: '#6366f1',
      primaryActionText: 'Install Extension',
      actionUrl: CHROME_STORE_URL,
    },
    {
      id: 'dashboard-anchor',
      targetSelector: '.title-section, .header, .dash-ext, .dashboard',
      preferredPosition: 'bottom',
      badge: 'Command Center',
      badgeIcon: 'dashboard',
      title: 'Your Overview & Storage Health',
      description: 'Monitor cloud storage consumption, total recordings, active storage providers, and quick actions right from your main command center.',
      mediaType: 'dashboard',
      accentColor: '#38bdf8',
    },
    {
      id: 'library-nav-anchor',
      targetSelector: '[data-nav="My Library"], .sidebar .nav-item:nth-child(2)',
      preferredPosition: 'right',
      badge: 'Media Library',
      badgeIcon: 'photo_library',
      title: 'Searchable Cloud Video Library',
      description: 'Every recording and screenshot is stored securely with lightning-fast fuzzy search, instant video streaming, and shareable public links.',
      mediaType: 'library',
      accentColor: '#a855f7',
      navigateTo: 'My Library',
    },
    {
      id: 'whiteboards-nav-anchor',
      targetSelector: '[data-nav="Whiteboards"], .sidebar .nav-item:nth-child(3)',
      preferredPosition: 'right',
      badge: 'Infinite Canvas',
      badgeIcon: 'draw',
      title: 'Brainstorm with VoidBoards',
      description: 'Drag recordings and annotated screenshots onto infinite whiteboards to organize project flows, tutorials, and design critiques.',
      mediaType: 'whiteboards',
      accentColor: '#ec4899',
      navigateTo: 'Whiteboards',
    },
    {
      id: 'settings-nav-anchor',
      targetSelector: '[data-nav="Settings"], .sidebar .nav-item:nth-child(4)',
      preferredPosition: 'right',
      badge: 'Preferences & Cloud',
      badgeIcon: 'tune',
      title: 'Tailor Storage & Preferences',
      description: 'Easily toggle between AntCapture Cloud and direct Google Drive export, manage playback presets, and fine-tune your workflow.',
      mediaType: 'settings',
      accentColor: '#10b981',
      navigateTo: 'Settings',
    },
  ],

  pro: [
    {
      id: 'pro-welcome',
      targetSelector: '.profile-container, .header-actions, .header',
      preferredPosition: 'bottom',
      badge: 'Pro Workspace Active',
      badgeIcon: 'verified',
      title: 'Welcome to Your Cloud Studio',
      description: 'Full high-speed cloud synchronization and unlimited spatial VoidBoards are unlocked on your account.',
      mediaType: 'dashboard',
      accentColor: '#a855f7',
    },
    {
      id: 'pro-voidboards',
      targetSelector: '[data-nav="Whiteboards"], .sidebar .nav-item:nth-child(3)',
      preferredPosition: 'right',
      badge: 'VoidBoards Canvas',
      badgeIcon: 'draw',
      title: 'Collaborative VoidBoards',
      description: 'Organize high-resolution screenshots and HD recordings seamlessly across an infinite spatial canvas.',
      mediaType: 'whiteboards',
      accentColor: '#ec4899',
      navigateTo: 'Whiteboards',
    },
    {
      id: 'pro-library',
      targetSelector: '[data-nav="My Library"], .sidebar .nav-item:nth-child(2)',
      preferredPosition: 'right',
      badge: 'Cloud Sync Active',
      badgeIcon: 'cloud_done',
      title: 'Zero-Lag Video Streaming & Sharing',
      description: 'Generate instant expiring or public links with direct CDN delivery for all your client reviews.',
      mediaType: 'library',
      accentColor: '#38bdf8',
      navigateTo: 'My Library',
    },
  ]
};
