import React, { useState } from 'react';

const sectionStyle = {
  background: '#0f172a', border: '1px solid #1e293b',
  borderRadius: '12px', padding: '24px', marginBottom: '16px',
};
const labelStyle = {
  fontSize: '12px', fontWeight: '600', color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: '8px', display: 'block',
};
const inputStyle = {
  width: '100%', background: '#1e293b', border: '1px solid #334155',
  borderRadius: '8px', padding: '10px 14px', color: '#f1f5f9',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};
const dangerBtnStyle = {
  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
  color: '#ef4444', borderRadius: '8px', padding: '9px 18px',
  fontSize: '13px', cursor: 'pointer', fontWeight: '500',
};

export default function Settings({
  user, captures, onNameUpdate, onDeleteAllCaptures,
  onDeleteAccount, storagePreference, saveStoragePreference, savingPref,
}) {
  const [newName, setNewName] = useState(user?.name || '');
  const [nameStatus, setNameStatus] = useState(null);
  const [confirmDeleteCaptures, setConfirmDeleteCaptures] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalMB = captures.reduce((acc, c) => acc + (parseFloat(c.size) || 0), 0).toFixed(1);
  const videoCount = captures.filter((c) => c.type === 'video').length;
  const imageCount = captures.filter((c) => c.type === 'image').length;

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === user?.name) return;
    setNameStatus('saving');
    try {
      await onNameUpdate(newName.trim());
      setNameStatus('saved');
      setTimeout(() => setNameStatus(null), 2000);
    } catch {
      setNameStatus('error');
      setTimeout(() => setNameStatus(null), 2000);
    }
  };

  const handleDeleteAllCaptures = async () => {
    setDeleting(true);
    try { await onDeleteAllCaptures(); setConfirmDeleteCaptures(false); }
    finally { setDeleting(false); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try { await onDeleteAccount(); }
    finally { setDeleting(false); }
  };

  const confirmBtnStyle = {
    background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px',
    padding: '9px 18px', fontSize: '13px', cursor: deleting ? 'not-allowed' : 'pointer',
    fontWeight: '600', opacity: deleting ? 0.6 : 1,
  };
  const cancelBtnStyle = {
    background: 'transparent', border: '1px solid #334155', color: '#94a3b8',
    borderRadius: '8px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer',
  };

  const storageOptions = [
    { value: 'local', label: '🗄️ Local Database (SQLite)', desc: 'Files stored on your server\'s local database only. Fast, works offline.', color: '#818cf8' },
    { value: 'drive', label: '☁️ Google Drive Only', desc: 'Files saved directly to your Google Drive. Nothing stored locally.', color: '#34d399' },
  ];

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Profile */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#f1f5f9', fontWeight: '600' }}>Profile</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          {user?.picture ? (
            <img src={user.picture} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #334155' }} alt="Avatar" />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: 'white', fontWeight: '700' }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: '600', fontSize: '16px' }}>{user?.name}</div>
            <div style={{ color: '#64748b', fontSize: '13px' }}>{user?.email}</div>
          </div>
        </div>

        <label style={labelStyle}>Display Name</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            style={inputStyle}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            placeholder="Your display name"
            maxLength={50}
          />
          <button
            onClick={handleSaveName}
            disabled={nameStatus === 'saving' || !newName.trim() || newName.trim() === user?.name}
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: 'white', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap', opacity: (nameStatus === 'saving' || !newName.trim() || newName.trim() === user?.name) ? 0.5 : 1 }}
          >
            {nameStatus === 'saving' ? 'Saving...' : nameStatus === 'saved' ? '✓ Saved' : nameStatus === 'error' ? 'Error' : 'Save'}
          </button>
        </div>

        <label style={{ ...labelStyle, marginTop: '20px' }}>Email Address</label>
        <div style={{ ...inputStyle, color: '#64748b', cursor: 'default', userSelect: 'none' }}>{user?.email}</div>
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#475569' }}>Your email is managed by Google and cannot be changed here.</p>
      </div>

      {/* Storage Usage */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#f1f5f9', fontWeight: '600' }}>Storage & Usage</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Total Captures', value: captures.length, icon: '📁' },
            { label: 'Videos', value: videoCount, icon: '🎥' },
            { label: 'Screenshots', value: imageCount, icon: '🖼' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#1e293b', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#1e293b', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>Total storage used</span>
          <span style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '16px' }}>{totalMB} MB</span>
        </div>
      </div>

      {/* Storage Destination */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#f1f5f9', fontWeight: '600' }}>Storage Destination</h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>Choose where your screenshots and recordings are saved.</p>
        {savingPref && <p style={{ fontSize: '12px', color: '#818cf8', marginBottom: '12px' }}>Saving...</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {storageOptions.map((opt) => {
            const isActive = storagePreference === opt.value;
            return (
              <div key={opt.value} onClick={() => saveStoragePreference(opt.value)} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px', background: isActive ? 'rgba(99,102,241,0.08)' : '#1e293b', border: `1px solid ${isActive ? 'rgba(99,102,241,0.4)' : '#334155'}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${isActive ? opt.color : '#475569'}`, background: isActive ? opt.color : 'transparent', flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                </div>
                <div>
                  <div style={{ color: isActive ? '#f1f5f9' : '#94a3b8', fontWeight: '600', fontSize: '14px', marginBottom: '3px' }}>{opt.label}</div>
                  <div style={{ color: '#475569', fontSize: '12px' }}>{opt.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ ...sectionStyle, border: '1px solid rgba(239,68,68,0.2)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#ef4444', fontWeight: '600' }}>Danger Zone</h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>These actions are permanent and cannot be undone.</p>

        {/* Delete all captures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1e293b', borderRadius: '10px', marginBottom: '12px' }}>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '500' }}>Delete all captures</div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>Removes all {captures.length} captures from your library and disk</div>
          </div>
          {!confirmDeleteCaptures ? (
            <button style={dangerBtnStyle} onClick={() => setConfirmDeleteCaptures(true)}>Delete All</button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={cancelBtnStyle} onClick={() => setConfirmDeleteCaptures(false)}>Cancel</button>
              <button style={confirmBtnStyle} onClick={handleDeleteAllCaptures} disabled={deleting}>{deleting ? 'Deleting...' : 'Yes, delete all'}</button>
            </div>
          )}
        </div>

        {/* Delete account */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1e293b', borderRadius: '10px' }}>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '500' }}>Delete account</div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>Permanently deletes all your data and signs you out</div>
          </div>
          {!confirmDeleteAccount ? (
            <button style={dangerBtnStyle} onClick={() => setConfirmDeleteAccount(true)}>Delete Account</button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={cancelBtnStyle} onClick={() => setConfirmDeleteAccount(false)}>Cancel</button>
              <button style={confirmBtnStyle} onClick={handleDeleteAccount} disabled={deleting}>{deleting ? 'Deleting...' : 'Yes, delete everything'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
