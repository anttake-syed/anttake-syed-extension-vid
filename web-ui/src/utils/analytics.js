import { GA_MEASUREMENT_ID } from '../config.js';

let initialized = false;

/**
 * Dynamically loads and initializes GA4 if a measurement ID is configured
 */
export function initGA() {
  if (typeof window === 'undefined') return;
  if (initialized) return;

  // Automatically ignore local development to keep production analytics clean
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return;
  }

  const gaId = GA_MEASUREMENT_ID || (typeof window !== 'undefined' && window.__GA_MEASUREMENT_ID__);
  if (!gaId || gaId === 'G-XXXXXXXXXX') {
    return;
  }

  // Inject Google Tag script dynamically if not already in index.html
  if (!document.getElementById('ga-gtag-script')) {
    const script = document.createElement('script');
    script.id = 'ga-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', gaId, {
    send_page_view: false, // We control page_view manually for SPA tab routing
  });

  initialized = true;
}

/**
 * Track SPA Page / View navigation
 * @param {string} pageTitle e.g. "Dashboard", "My Library", "Whiteboards"
 * @param {string} pagePath e.g. "/", "/library", "/whiteboards"
 */
export function trackPageView(pageTitle, pagePath) {
  if (typeof window === 'undefined') return;

  if (!initialized) {
    initGA();
  }

  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: pageTitle,
      page_path: pagePath || window.location.pathname,
      page_location: window.location.href,
    });
  }
}

/**
 * Track Custom Events (downloads, copy link, save, modal opens, etc.)
 * @param {string} eventName
 * @param {object} params
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return;

  if (!initialized) {
    initGA();
  }

  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}
