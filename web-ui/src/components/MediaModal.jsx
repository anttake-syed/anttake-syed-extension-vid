import React, { useState } from 'react';
import { SERVER_URL, IS_LOCAL_MODE } from '../config';
import ConfirmDeleteModal from './ConfirmDeleteModal';

const DriveLogoSVG = ({ size = 18 }) => (
  <svg viewBox="0 0 87.3 78" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H.97c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4C.4 49.8 0 51.35 0 52.9h27.45z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.65 9.5z" fill="#ea4335"/>
    <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.55 0-3.1.45-4.5 1.2z" fill="#00832d"/>
    <path d="M59.85 52.9h27.45c0-1.55-.4-3.1-1.2-4.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25 59.85 52.9z" fill="#2684fc"/>
    <path d="M27.45 52.9H0l13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.85 52.9z" fill="#ffba00"/>
  </svg>
);

export default function MediaModal({ item, onClose, user, onSyncSuccess, onDelete, dbStats }) {
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [removingLocal, setRemovingLocal] = useState(false);
  const [removingDrive, setRemovingDrive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(item?.title || '');
  const [titleSaving, setTitleSaving] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);

  if (!item) {return null;}

  const callApi = async (path, setter) => {
    if (!user?.jwt) {return;}
    setter(true);
    setSyncError(null);
    try {
      const res = await fetch(`${SERVER_URL}/captures/${item.id}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.jwt}` },
      });
      const data = await res.json();
      if (!res.ok) {throw new Error((data.error || 'Failed') + (data.detail ? ': ' + data.detail : ''));}
      if (onSyncSuccess) {onSyncSuccess();}
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setter(false);
    }
  };

  const saveTitle = async () => {
    if (!user?.jwt || !titleValue.trim()) return;
    setTitleSaving(true);
    try {
      const res = await fetch(`${SERVER_URL}/captures/${item.id}/rename`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rename failed');
      setEditingTitle(false);
      if (onSyncSuccess) onSyncSuccess(); // re-fetch the list so the new name shows
    } catch (err) {
      setSyncError('Rename failed: ' + err.message);
    } finally {
      setTitleSaving(false);
    }
  };


  const handleDelete = async () => {
    if (!user?.jwt) {return;}
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setSyncError(null);
    try {
      const res = await fetch(`${SERVER_URL}/captures/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.jwt}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed'); }
      setShowDeleteConfirm(false);
      if (onDelete) {onDelete(item.id);}
    } catch (err) {
      setSyncError(err.message);
      setShowDeleteConfirm(false);
      setDeleting(false);
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.src) {return;}
    try {
      const response = await fetch(item.src);
      if (!response.ok) {throw new Error('Download failed from server');}
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = item.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setSyncError('Failed to save to computer: ' + err.message);
    }
  };

  const loc = item.storageLocation || 'local';

  const badges = [];
  if (loc === 'local' || loc === 'both')
    {badges.push({ label: 'Local Database', icon: 'hard_drive', color: '#818cf8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' });}
  if (loc === 'drive' || loc === 'both')
    {badges.push({ label: 'Google Drive', icon: 'drive', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' });}

  const syncBtnStyle = (textColor, bgColor, borderColor) => ({
    background: bgColor, color: textColor, border: `1px solid ${borderColor}`,
    borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', transition: 'all 0.2s'
  });
  const removeBtnStyle = {
    background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600'
  };

  return (
    <>
    <ConfirmDeleteModal
      isOpen={showDeleteConfirm}
      title="Delete this capture?"
      message={`"${item.title || 'This capture'}" will be permanently deleted.`}
      confirmText="Yes, Delete"
      loading={deleting}
      onConfirm={confirmDelete}
      onCancel={() => { if (!deleting) setShowDeleteConfirm(false); }}
    />
    <div className="modal-overlay fadeIn" onClick={onClose} style={{ zIndex: 1000, background: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(8px)', padding: '20px' }}>
      <div
        className="modal-card fadeInScale"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '95%', maxWidth: '1300px', maxHeight: '95vh', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: 0, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column' }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close" style={{ zIndex: 10, top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
        </button>

        {/* Header */}
        <div style={{ padding: '24px', paddingBottom: '20px', borderBottom: '1px solid #1e293b' }}>
          {/* Editable Title */}
          {editingTitle ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <input
                autoFocus
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    await saveTitle();
                  } else if (e.key === 'Escape') {
                    setEditingTitle(false);
                    setTitleValue(item.title);
                  }
                }}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.5)',
                  borderRadius: '8px', padding: '8px 12px', color: '#f8fafc', fontSize: '18px',
                  fontWeight: '700', outline: 'none', fontFamily: 'inherit'
                }}
              />
              <button onClick={saveTitle} disabled={titleSaving} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', padding: '8px 14px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {titleSaving ? '...' : 'Save'}
              </button>
              <button onClick={() => { setEditingTitle(false); setTitleValue(item.title); }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: '700', flex: 1, lineHeight: 1.3 }}>{titleValue}</h2>
              {user?.jwt && (
                <button
                  onClick={() => setEditingTitle(true)}
                  title="Rename"
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                </button>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>schedule</span>
              {item.date ? new Date(item.date).toLocaleDateString() : ''} 
              <span style={{ margin: '0 4px' }}>•</span> 
              {item.size}
            </span>
            
            {badges.map((b) => (
              <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: b.bg, border: `1px solid ${b.border}`, borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: b.color }}>
                {b.icon === 'drive' ? <DriveLogoSVG size={14} /> : <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>{b.icon}</span>}
                {b.label}
              </span>
            ))}
            
            {!IS_LOCAL_MODE && item.driveUrl && (
              <a href={item.driveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: '999px' }} onClick={(e) => e.stopPropagation()}>
                <DriveLogoSVG size={14} /> Open in Drive <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>arrow_outward</span>
              </a>
            )}
            
            {/* Sync / Remove buttons */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {loc === 'local' && dbStats?.storageServer !== 'local' && (
                <button onClick={(e) => { e.stopPropagation(); callApi('sync-to-drive', setSyncingDrive); }} disabled={syncingDrive} style={syncBtnStyle('#60a5fa', 'rgba(59,130,246,0.1)', 'rgba(59,130,246,0.3)')}>
                  {syncingDrive ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#60a5fa', borderTopColor: 'transparent' }} /> : <DriveLogoSVG size={16} />}
                  {syncingDrive ? 'Syncing...' : 'Backup to Drive'}
                </button>
              )}
              {loc === 'drive' && dbStats?.storageServer !== 'local' && (
                <button onClick={(e) => { e.stopPropagation(); callApi('sync-to-local', setSyncingLocal); }} disabled={syncingLocal} style={syncBtnStyle('#818cf8', 'rgba(99,102,241,0.1)', 'rgba(99,102,241,0.3)')}>
                  {syncingLocal ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#818cf8', borderTopColor: 'transparent' }} /> : <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>download</span>}
                  {syncingLocal ? 'Syncing...' : 'Save to Local DB'}
                </button>
              )}
              {loc === 'both' && dbStats?.storageServer !== 'local' && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); callApi('remove-local', setRemovingLocal); }} disabled={removingLocal} style={removeBtnStyle}>
                    {removingLocal ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#f87171', borderTopColor: 'transparent' }} /> : <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>hard_drive</span>}
                    {removingLocal ? 'Removing...' : 'Remove Local'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); callApi('remove-drive', setRemovingDrive); }} disabled={removingDrive} style={removeBtnStyle}>
                    {removingDrive ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#f87171', borderTopColor: 'transparent' }} /> : <DriveLogoSVG size={16} />}
                    {removingDrive ? 'Removing...' : 'Remove from Drive'}
                  </button>
                </>
              )}
              {IS_LOCAL_MODE && (
                <button onClick={handleDownload} style={syncBtnStyle('#f1f5f9', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.2)')}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>download</span>
                  Save to Computer
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} disabled={deleting} style={{ ...removeBtnStyle, marginLeft: (loc === 'local' || loc === 'drive' || IS_LOCAL_MODE) ? 0 : '4px' }}>
                {deleting ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#f87171', borderTopColor: 'transparent' }} /> : <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete_forever</span>}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
          {syncError && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>error</span> {syncError}</div>}
        </div>

        {/* Media — zero padding so video fills edge-to-edge */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', overflow: 'hidden', minHeight: 0 }}>
          {item.storageLocation === 'drive' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <DriveLogoSVG size={72} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#f8fafc', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  Private {item.type === 'video' ? 'video' : 'image'} on Drive
                </div>
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>Google restricts direct preview of private Drive files for your security.</div>
              </div>
              <a href={item.driveUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: '8px', fontWeight: '600', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>open_in_new</span>
                Open in Google Drive
              </a>
              <div style={{ color: '#64748b', fontSize: '13px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#6366f1' }}>lightbulb</span>
                Tip: Click &quot;Save to Local DB&quot; above to enable native preview inside AntCapture.
              </div>
            </div>
          ) : item.type === 'video' ? (
            <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden' }}>

              {/* ── Professional loading skeleton ── */}
              {mediaLoading && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px',
                  background: 'linear-gradient(135deg, #020617 0%, #0d1526 100%)',
                  borderRadius: '8px',
                }}>
                  {/* Pulsing play-circle icon */}
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'modalSkeletonPulse 1.8s ease-in-out infinite',
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '34px', color: 'rgba(129,140,248,0.55)' }}>
                      play_circle
                    </span>
                  </div>

                  {/* Label */}
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(148,163,184,0.65)', letterSpacing: '0.02em' }}>
                    Preparing video…
                  </div>

                  {/* Shimmer progress bar */}
                  <div style={{ width: '130px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: '40%',
                      background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.55), transparent)',
                      animation: 'modalSkeletonSweep 1.4s ease-in-out infinite',
                    }} />
                  </div>

                  <style>{`
                    @keyframes modalSkeletonPulse {
                      0%, 100% { transform: scale(1);    opacity: 0.7; }
                      50%       { transform: scale(1.07); opacity: 1;   }
                    }
                    @keyframes modalSkeletonSweep {
                      0%   { transform: translateX(-250%); }
                      100% { transform: translateX(400%);  }
                    }
                  `}</style>
                </div>
              )}

              {/* Resolution + Format badge overlay */}
              {!mediaLoading && (() => {
                const mime = item.mimeType || '';
                const formatLabel = mime.includes('mp4') ? 'MP4' : mime.includes('webm') ? 'WebM' : (mime.split('/')[1] || 'Video').toUpperCase();
                const resMatch = (item.size || '').match(/(\d+)p/);
                const resLabel = resMatch ? resMatch[1] + 'p' : null;
                return (
                  <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 5, display: 'flex', gap: '6px', alignItems: 'center', pointerEvents: 'none' }}>
                    {resLabel && (
                      <span style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)', color: '#f8fafc', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', padding: '3px 8px', borderRadius: '5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>&#9646;</span>
                        {resLabel}
                      </span>
                    )}
                    <span style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', padding: '3px 8px', borderRadius: '5px' }}>
                      {formatLabel}
                    </span>
                    <span title={(item.hasAudio === false) ? 'No Audio' : 'Contains Audio'} style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', border: `1px solid ${(item.hasAudio === false) ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.15)'}`, color: 'white', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', padding: '3px 6px', borderRadius: '5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '14px', color: (item.hasAudio === false) ? '#f87171' : 'white' }}>
                        {(item.hasAudio === false) ? 'volume_off' : 'volume_up'}
                      </span>
                      {(item.hasAudio === false) ? 'Muted' : 'Audio'}
                    </span>
                  </div>
                );
              })()}

              <video
                key={item.id}
                src={item.src}
                controls
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'contain', outline: 'none', background: '#000', display: 'block', opacity: mediaLoading ? 0 : 1, transition: 'opacity 0.35s ease' }}
                onCanPlay={() => setMediaLoading(false)}
                onLoadedData={() => setMediaLoading(false)}
                onError={(e) => {
                  console.error('Video error:', e.target.error?.message || e.target.error);
                  setMediaLoading(false);
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1, background: '#000', padding: '16px' }}>
              <img src={item.src} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', display: 'block' }} alt={item.title} />
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
