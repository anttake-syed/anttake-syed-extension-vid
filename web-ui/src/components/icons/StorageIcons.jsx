// Shared storage-location icons — used everywhere a capture's storage
// location (cloud / Google Drive) needs a badge, so the same icon and
// brand color shows up consistently across Dashboard, My Library, the
// media modal, Settings, and the storage usage bars instead of each
// place redefining (and slowly diverging from) its own copy.

export const DriveLogoSVG = ({ size = 20 }) => (
  <svg viewBox="0 0 87.3 78" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H.97c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4C.4 49.8 0 51.35 0 52.9h27.45z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.65 9.5z" fill="#ea4335"/>
    <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.55 0-3.1.45-4.5 1.2z" fill="#00832d"/>
    <path d="M59.85 52.9h27.45c0-1.55-.4-3.1-1.2-4.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25 59.85 52.9z" fill="#2684fc"/>
    <path d="M27.45 52.9H0l13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.85 52.9z" fill="#ffba00"/>
  </svg>
);

export const AntCaptureCloudLogoSVG = ({ size = 20 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
    <circle cx="20" cy="20" r="20" fill="url(#antcloud-grad)" />
    <g transform="translate(8, 8) scale(1)">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="white" opacity="0.9"/>
    </g>
    <defs>
      <linearGradient id="antcloud-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);
