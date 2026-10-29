/**
 * shared/errorHandler.js — AntCapture Modular Error Formatting System
 *
 * Implements role-aware error presentation:
 * - Administrators (admin role or verified admin email):
 *   Receives raw, unabridged error messages, stack traces, HTTP codes, and
 *   technical troubleshooting diagnostics with instant 1-click clipboard copy.
 *
 * - Non-admin users (Free, Paid, Cloud, Local):
 *   Receives calm, diplomatic, non-technical, user-friendly guidance without
 *   exposing internal database errors, SQL syntax, or cloud provider stack traces.
 */

import { isAdminUser } from './config.js';

/**
 * Maps known error keywords to diplomatic user-facing messages.
 */
const DIPLOMATIC_MAPPINGS = [
  {
    test: (msg) => /quota_exceeded|cloud storage is full|storage limit/i.test(msg),
    diplomatic: 'Your cloud storage limit has been reached. Please manage your storage or consider upgrading your plan.'
  },
  {
    test: (msg) => /AntCapture Cloud plan|cloud plan required|subscription/i.test(msg),
    diplomatic: 'A Cloud subscription is required to sync captures to the cloud. You can upgrade or save directly to your computer.'
  },
  {
    test: (msg) => /drive_full|quota|Google Drive.*full/i.test(msg),
    diplomatic: 'Google Drive storage is currently full. Please free up some Drive space or switch to local download.'
  },
  {
    test: (msg) => /Self-Hosted server is not running|localhost:3001|ECONNREFUSED/i.test(msg),
    diplomatic: 'Could not connect to your local server. Please ensure it is running and try again.'
  },
  {
    test: (msg) => /No internet connection|offline|NetworkError|Failed to fetch/i.test(msg),
    diplomatic: 'Network connection issue detected. Please check your internet connection and try again.'
  },
  {
    test: (msg) => /unauthorized|jwt expired|invalid token|sign-in expired/i.test(msg),
    diplomatic: 'Your session has expired. Please sign in again to continue.'
  },
  {
    test: (msg) => /SQLITE|D1 Error|table .* no column|database error|prisma/i.test(msg),
    diplomatic: 'We encountered a momentary issue saving your capture. Our team is already looking into it. Please try saving to your computer in the meantime.'
  },
  {
    test: (msg) => /timed? out|AbortError|deadline/i.test(msg),
    diplomatic: 'The request took longer than expected to complete. Please check your connection and retry.'
  }
];

/**
 * Standard diplomatic fallback message for all other generic or unknown errors.
 */
const DEFAULT_DIPLOMATIC_MSG = 'Something went wrong while processing your request. Please try again or save directly to your computer.';

/**
 * Formats an error based on user privileges.
 * 
 * @param {Error|string|object} err - The error object or error message string.
 * @param {object|null} user - The active user object ({ email, role, ... }).
 * @param {object} [options]
 * @param {string} [options.context] - Component/action context (e.g., 'Save to Cloud', 'Capture Video').
 * @returns {{
 *   isAdmin: boolean,
 *   title: string,
 *   displayMessage: string,
 *   rawMessage: string,
 *   diplomaticMessage: string,
 *   technicalDetails?: string
 * }}
 */
export function formatError(err, user, options = {}) {
  const isAdmin = isAdminUser(user);
  const rawMsg = (err instanceof Error ? err.message : (typeof err === 'string' ? err : err?.message || JSON.stringify(err))) || 'Unknown error';
  const stack = err instanceof Error ? err.stack : null;

  // Derive diplomatic message for regular users
  let diplomaticMsg = DEFAULT_DIPLOMATIC_MSG;
  for (const mapping of DIPLOMATIC_MAPPINGS) {
    if (mapping.test(rawMsg)) {
      diplomaticMsg = mapping.diplomatic;
      break;
    }
  }

  if (isAdmin) {
    // Admin gets full transparency: raw message + stack trace + context
    const contextPrefix = options.context ? `[${options.context}] ` : '';
    return {
      isAdmin: true,
      title: '🛠️ Admin Raw Error',
      displayMessage: `${contextPrefix}${rawMsg}`,
      rawMessage: rawMsg,
      diplomaticMessage: diplomaticMsg,
      technicalDetails: stack || rawMsg,
    };
  }

  // Regular user gets the polite diplomatic message
  return {
    isAdmin: false,
    title: 'Notice',
    displayMessage: diplomaticMsg,
    rawMessage: rawMsg,
    diplomaticMessage: diplomaticMsg,
  };
}
