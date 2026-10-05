import React, { useState, useEffect } from 'react';
import { SERVER_URL, IS_LOCAL_MODE } from '../config';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import VideoViewer from './video/VideoViewer.jsx';
import { DriveLogoSVG, AntCaptureCloudLogoSVG } from './icons/StorageIcons.jsx';
import '../styles/pages/media-modal.css';

const getFullSrc = (src, jwt) => {
  if (!src) return '';
  const url = src.startsWith('/') ? `${SERVER_URL}${src}` : src;
  if (!jwt) return url;
  return url.includes('?') ? `${url}&token=${jwt}` : `${url}?token=${jwt}`;
};

class MediaModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("MediaModal crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-overlay fadeIn" onClick={this.props.onClose} style={{ zIndex: 1000, background: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(8px)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card fadeInScale" onClick={e => e.stopPropagation()} style={{ background: '#0f172a', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#f87171', marginBottom: '16px' }}>error</span>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 12px' }}>Video Player Error</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', margin: '0 0 24px', lineHeight: 1.5 }}>
              The media player encountered an unexpected error and had to close. Please try again.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
              <button className="mm-tap" onClick={() => this.setState({ hasError: false, error: null })} style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
              <button className="mm-tap" onClick={this.props.onClose} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid #334155', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
            </div>
            {this.state.error && <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '11px', color: 'var(--danger)', textAlign: 'left', overflowX: 'auto', fontFamily: 'monospace' }}>{this.state.error.toString()}</div>}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MediaModalContent({ item, onClose, user, onSyncSuccess, onDelete, dbStats }) {
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

  useEffect(() => {
    if (item?.id && item?.title) {
      const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
      const targetUrl = `/capture/${item.id}/${slug}`;
      const currentPath = window.location.pathname;
      
      if (currentPath !== targetUrl) {
        if (currentPath.startsWith(`/capture/${item.id}`)) {
          window.history.replaceState(null, '', targetUrl);
        } else {
          window.history.pushState(null, '', targetUrl);
        }
      }
    }
  }, [item?.id, item?.title]);

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
      const response = await fetch(getFullSrc(item.src, user?.jwt));
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
  if (loc === 'local' || loc === 'both' || loc === 'self_hosted')
    {badges.push({ label: 'Local Database', icon: 'hard_drive', color: '#818cf8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' });}
  if (loc === 'cloud')
    {badges.push({ label: 'AntCapture Cloud', icon: 'ac-cloud', color: '#a78bfa', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' });}
  if (loc === 'drive' || loc === 'both' || loc === 'google_drive')
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
    <div className="modal-overlay mm-overlay fadeIn" onClick={onClose} style={{ zIndex: 1000, background: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(8px)' }}>
      <div
        className="modal-card mm-card fadeInScale"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close mm-close" onClick={onClose} aria-label="Close" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
        </button>

        {/* Header */}
        <div className="mm-header">
          {/* Editable Title */}
          {editingTitle ? (
            <div className="mm-title-edit">
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
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.5)',
                  borderRadius: '8px', padding: '8px 12px', color: 'var(--text-main)', fontSize: '18px',
                  fontWeight: '700', outline: 'none', fontFamily: 'inherit'
                }}
              />
              <button className="mm-tap" onClick={saveTitle} disabled={titleSaving} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: 'var(--primary-soft)', padding: '8px 14px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {titleSaving ? '...' : 'Save'}
              </button>
              <button className="mm-tap" onClick={() => { setEditingTitle(false); setTitleValue(item.title); }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-dim)', padding: '8px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h2 className="mm-title" style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)', fontWeight: '700', flex: 1, lineHeight: 1.3 }}>{titleValue}</h2>
              {user?.jwt && (
                <button
                  onClick={() => setEditingTitle(true)}
                  title="Rename"
                  aria-label="Rename"
                  className="mm-icon-tap"
                  style={{ background: 'none', border: 'none', color: '#64748b', flexShrink: 0, cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                </button>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>schedule</span>
              {item.date ? new Date(item.date).toLocaleDateString() : ''} 
              <span style={{ margin: '0 4px' }}>•</span> 
              {item.size}
            </span>
            
            {badges.map((b) => (
              <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: b.bg, border: `1px solid ${b.border}`, borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: b.color }}>
                {b.icon === 'drive' ? <DriveLogoSVG size={14} />
                  : b.icon === 'ac-cloud' ? <AntCaptureCloudLogoSVG size={14} />
                  : <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>{b.icon}</span>}
                {b.label}
              </span>
            ))}
            
            {!IS_LOCAL_MODE && item.driveUrl && (
              <a href={item.driveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: '999px' }} onClick={(e) => e.stopPropagation()}>
                <DriveLogoSVG size={14} /> Open in Drive <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>arrow_outward</span>
              </a>
            )}
            
            {/* Sync / Remove buttons */}
            <div className="mm-actions">
              {loc === 'local' && dbStats?.storageServer !== 'local' && (
                <button onClick={(e) => { e.stopPropagation(); callApi('sync-to-drive', setSyncingDrive); }} disabled={syncingDrive} className="mm-tap" style={syncBtnStyle('#60a5fa', 'rgba(59,130,246,0.1)', 'rgba(59,130,246,0.3)')}>
                  {syncingDrive ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#60a5fa', borderTopColor: 'transparent' }} /> : <DriveLogoSVG size={16} />}
                  {syncingDrive ? 'Syncing...' : 'Backup to Drive'}
                </button>
              )}
              {loc === 'drive' && dbStats?.storageServer !== 'local' && (
                <button onClick={(e) => { e.stopPropagation(); callApi('sync-to-local', setSyncingLocal); }} disabled={syncingLocal} className="mm-tap" style={syncBtnStyle('#818cf8', 'rgba(99,102,241,0.1)', 'rgba(99,102,241,0.3)')}>
                  {syncingLocal ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#818cf8', borderTopColor: 'transparent' }} /> : <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>download</span>}
                  {syncingLocal ? 'Syncing...' : 'Save to Local DB'}
                </button>
              )}
              {loc === 'both' && dbStats?.storageServer !== 'local' && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); callApi('remove-local', setRemovingLocal); }} disabled={removingLocal} className="mm-tap" style={removeBtnStyle}>
                    {removingLocal ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#f87171', borderTopColor: 'transparent' }} /> : <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>hard_drive</span>}
                    {removingLocal ? 'Removing...' : 'Remove Local'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); callApi('remove-drive', setRemovingDrive); }} disabled={removingDrive} className="mm-tap" style={removeBtnStyle}>
                    {removingDrive ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#f87171', borderTopColor: 'transparent' }} /> : <DriveLogoSVG size={16} />}
                    {removingDrive ? 'Removing...' : 'Remove from Drive'}
                  </button>
                </>
              )}
              {item.src && (
                <button onClick={handleDownload} className="mm-tap" style={syncBtnStyle('#f1f5f9', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.2)')}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>download</span>
                  Save to Computer
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} disabled={deleting} className="mm-tap" style={{ ...removeBtnStyle, marginLeft: (loc === 'local' || loc === 'drive' || IS_LOCAL_MODE) ? 0 : '4px' }}>
                {deleting ? <span className="btn-spinner" style={{ width: '12px', height: '12px', borderColor: '#f87171', borderTopColor: 'transparent' }} /> : <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete_forever</span>}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
          {syncError && <div className="break-anywhere" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>error</span> {syncError}</div>}
        </div>

        {/* Media — zero padding so video fills edge-to-edge */}
        <div className="mm-media">
          {item.storageLocation === 'drive' ? (
            <div className="mm-drive">
              <DriveLogoSVG size={72} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  Private {item.type === 'video' ? 'video' : 'image'} on Drive
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Google restricts direct preview of private Drive files for your security.</div>
              </div>
              <a href={item.driveUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: '8px', fontWeight: '600', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>open_in_new</span>
                Open in Google Drive
              </a>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--primary)', flexShrink: 0 }}>lightbulb</span>
                Tip: Click &quot;Save to Local DB&quot; above to enable native preview inside AntCapture.
              </div>
            </div>
          ) : item.type === 'video' ? (
            <div className="mm-video">
              <VideoViewer
                src={getFullSrc(item.src, user?.jwt)}
                onClose={onClose}
              />
            </div>
          ) : (
            <div className="mm-image-wrap">
              <img src={getFullSrc(item.src, user?.jwt)} className="mm-image" alt={item.title} />
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default function MediaModal(props) {
  return (
    <MediaModalErrorBoundary onClose={props.onClose}>
      <MediaModalContent {...props} />
    </MediaModalErrorBoundary>
  );
}
