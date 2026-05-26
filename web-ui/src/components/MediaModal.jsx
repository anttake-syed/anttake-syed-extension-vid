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
          {item.type === 'video' ? (
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
