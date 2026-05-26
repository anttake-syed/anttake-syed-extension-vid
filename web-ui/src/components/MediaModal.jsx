import React, { useState } from 'react';
import { BACKEND_URL } from '../config';

export default function MediaModal({ item, onClose, user, onSyncSuccess }) {
  if (!item) return null;

  const [syncingDrive, setSyncingDrive] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [removingLocal, setRemovingLocal] = useState(false);
  const [removingDrive, setRemovingDrive] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const callApi = async (path, setter) => {
    if (!user?.jwt) return;
    setter(true);
    setSyncError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/captures/${item.id}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.jwt}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.error || 'Failed') + (data.detail ? ': ' + data.detail : ''));
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setter(false);
    }
  };

  const loc = item.storageLocation || 'local';

  const badges = [];
  if (loc === 'local' || loc === 'both')
    badges.push({ label: '🗄️ Local Database', color: '#818cf8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' });
  if (loc === 'drive' || loc === 'both')
    badges.push({ label: '☁️ Google Drive', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' });

  const syncBtnStyle = (color = '#4f46e5') => ({
    background: color, color: 'white', border: 'none',
    borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
  });
  const removeBtnStyle = {
    background: 'transparent', color: '#f87171', border: '1px solid #f87171',
    borderRadius: '4px', padding: '3px 8px', fontSize: '12px', cursor: 'pointer',
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.85)' }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '80%', maxWidth: '900px', background: '#0f172a', border: '1px solid #334155', padding: 0, overflow: 'hidden' }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close" style={{ zIndex: 10, top: '15px', right: '15px' }}>✕</button>

        {/* Header */}
        <div style={{ padding: '20px', paddingBottom: '15px', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>{item.title}{item.ext}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
              {item.date ? new Date(item.date).toLocaleDateString() : ''} • {item.size}
            </span>
            {badges.map((b) => (
              <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: b.bg, border: `1px solid ${b.border}`, borderRadius: '999px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, color: b.color }}>
                {b.label}
              </span>
            ))}
            {item.driveUrl && (
              <a href={item.driveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                Open in Drive ↗
              </a>
            )}
            {/* Sync / Remove buttons */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              {loc === 'local' && (
                <button onClick={(e) => { e.stopPropagation(); callApi('sync-to-drive', setSyncingDrive); }} disabled={syncingDrive} style={syncBtnStyle()}>
                  {syncingDrive ? 'Syncing...' : '⬆️ Backup to Drive'}
                </button>
              )}
              {loc === 'drive' && (
                <button onClick={(e) => { e.stopPropagation(); callApi('sync-to-local', setSyncingLocal); }} disabled={syncingLocal} style={syncBtnStyle()}>
                  {syncingLocal ? 'Syncing...' : '⬇️ Save to Local DB'}
                </button>
              )}
              {loc === 'both' && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); callApi('remove-local', setRemovingLocal); }} disabled={removingLocal} style={removeBtnStyle}>
                    {removingLocal ? 'Removing...' : '🗑️ Remove Local'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); callApi('remove-drive', setRemovingDrive); }} disabled={removingDrive} style={removeBtnStyle}>
                    {removingDrive ? 'Removing...' : '🗑️ Remove Drive'}
                  </button>
                </>
              )}
            </div>
          </div>
          {syncError && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>Error: {syncError}</div>}
        </div>

        {/* Media */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000', minHeight: '300px' }}>
          {item.storageLocation === 'drive' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
              <svg viewBox="0 0 87.3 78" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H.97c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4C.4 49.8 0 51.35 0 52.9h27.45z" fill="#00ac47"/>
                <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.65 9.5z" fill="#ea4335"/>
                <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.55 0-3.1.45-4.5 1.2z" fill="#00832d"/>
                <path d="M59.85 52.9h27.45c0-1.55-.4-3.1-1.2-4.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25 59.85 52.9z" fill="#2684fc"/>
                <path d="M27.45 52.9H0l13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.85 52.9z" fill="#ffba00"/>
              </svg>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#f8fafc', fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>Private image on Drive</div>
                <div style={{ color: '#64748b', fontSize: '13px' }}>Google restricts direct preview of private Drive files for your security.</div>
              </div>
              <a href={item.driveUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>open_in_new</span>
                Open in Google Drive
              </a>
              <div style={{ color: '#475569', fontSize: '12px' }}>
                Tip: Click "⬇️ Save to Local DB" above to enable native preview inside AntCapture.
              </div>
            </div>
          ) : item.type === 'video' ? (
            <video controls autoPlay style={{ width: '100%', maxHeight: '60vh', outline: 'none', background: '#000' }} src={item.src}>
              Your browser does not support the video tag.
            </video>
          ) : (
            <img src={item.src} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} alt={item.title} />
          )}
        </div>
      </div>
    </div>
  );
}
