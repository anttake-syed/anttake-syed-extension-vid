import React, { useState } from 'react';
import { IS_LOCAL_MODE } from '../config';

const DriveLogoSVG = ({ size = 18 }) => (
  <svg viewBox="0 0 87.3 78" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H.97c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4C.4 49.8 0 51.35 0 52.9h27.45z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.65 9.5z" fill="#ea4335"/>
    <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.55 0-3.1.45-4.5 1.2z" fill="#00832d"/>
    <path d="M59.85 52.9h27.45c0-1.55-.4-3.1-1.2-4.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25 59.85 52.9z" fill="#2684fc"/>
    <path d="M27.45 52.9H0l13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.85 52.9z" fill="#ffba00"/>
  </svg>
);

const S = {
  section: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', marginBottom: '16px' },
  label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'block' },
  input: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
};

const SectionHeader = ({ icon, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#818cf8' }}>{icon}</span>
    </div>
    <div>
      <div style={{ fontWeight: '700', fontSize: '15px', color: '#f1f5f9' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{subtitle}</div>}
    </div>
  </div>
);

export default function Settings({
  user, captures, dbStats, onNameUpdate, onDeleteAllCaptures,
  onDeleteAccount, storagePreference, saveStoragePreference, savingPref,
}) {
  const [newName, setNewName] = useState(user?.name || '');
  const [nameStatus, setNameStatus] = useState(null);
  const [confirmDeleteCaptures, setConfirmDeleteCaptures] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const videoCount = captures.filter((c) => c.type === 'video').length;
  const imageCount = captures.filter((c) => c.type === 'image').length;

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === user?.name) {return;}
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

  const storageOptions = [
    {
      value: 'local',
      icon: 'hard_drive',
      label: 'Local Database',
      desc: 'Files stored in your server\'s SQLite database. Fast, works offline, no Google account needed.',
      color: '#818cf8',
    },
    {
      value: 'drive',
      icon: null, // drive uses DriveLogoSVG
      label: 'Google Drive',
      desc: 'Files saved directly to your personal Google Drive. Accessible from anywhere.',
      color: '#34d399',
    },
  ];

  return (
    <div style={{ maxWidth: '620px' }}>

      {/* ── Profile ── */}
      <div style={S.section}>
        <SectionHeader icon="manage_accounts" title="Profile" subtitle="Your public identity within AntCapture" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', background: '#0f172a', borderRadius: '12px', padding: '16px' }}>
          {/* Avatar — gradient initial for local admin, photo for Google users */}
          {(IS_LOCAL_MODE || !user?.picture) ? (
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: IS_LOCAL_MODE ? 'linear-gradient(135deg,#a78bfa,#6366f1)' : 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white', fontWeight: '700', flexShrink: 0, border: '2px solid rgba(167,139,250,0.4)' }}>
              {IS_LOCAL_MODE ? '⚡' : (user?.name?.charAt(0) || 'U')}
            </div>
          ) : (
            <img src={user.picture} style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid #6366f1', flexShrink: 0 }} alt="Avatar" />
          )}
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user?.name}
              {IS_LOCAL_MODE && (
                <span style={{ fontSize: '10px', fontWeight: 600, background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '999px', padding: '2px 8px' }}>Self-Hosted</span>
              )}
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>mail</span>
              {user?.email}
            </div>
          </div>
        </div>

        <label style={S.label}>Display Name</label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input
            style={S.input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#334155'}
            placeholder="Your display name"
            maxLength={50}
          />
          <button
            onClick={handleSaveName}
            disabled={nameStatus === 'saving' || !newName.trim() || newName.trim() === user?.name}
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: 'white', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap', opacity: (nameStatus === 'saving' || !newName.trim() || newName.trim() === user?.name) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
              {nameStatus === 'saved' ? 'check_circle' : nameStatus === 'error' ? 'error' : 'save'}
            </span>
            {nameStatus === 'saving' ? 'Saving…' : nameStatus === 'saved' ? 'Saved' : nameStatus === 'error' ? 'Error' : 'Save'}
          </button>
        </div>

        <label style={S.label}>Email Address</label>
        <div style={{ ...S.input, color: '#64748b', cursor: 'default', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#475569' }}>lock</span>
          {user?.email}
        </div>
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#475569' }}>
          {IS_LOCAL_MODE ? 'Local admin email is fixed to admin@localhost.' : 'Managed by Google — cannot be changed here.'}
        </p>

        {/* Local Admin password section removed since authentication is bypassed */}
      </div>

      {/* ── Storage & Usage ── */}
      <div style={S.section}>
        <SectionHeader icon="analytics" title="Storage & Usage" subtitle="Your capture statistics at a glance" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {[
            { label: 'Total Captures', value: captures.length, icon: 'folder' },
            { label: 'Videos', value: videoCount, icon: 'videocam' },
            { label: 'Screenshots', value: imageCount, icon: 'screenshot_monitor' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid #334155' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#6366f1', display: 'block', marginBottom: '8px' }}>{s.icon}</span>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#f1f5f9' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Storage Destination (hidden in local/self-host mode) ── */}
      {!IS_LOCAL_MODE && dbStats?.storageServer !== 'local' && (
        <div style={S.section}>
          <SectionHeader icon="cloud_sync" title="Storage Destination" subtitle="Where your captures are saved by default" />
          {savingPref && <p style={{ fontSize: '12px', color: '#818cf8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>sync</span> Saving preference…</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {storageOptions.map((opt) => {
              const isActive = storagePreference === opt.value;
              return (
                <div key={opt.value} onClick={() => saveStoragePreference(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: isActive ? 'rgba(99,102,241,0.08)' : '#0f172a', border: `2px solid ${isActive ? '#6366f1' : '#334155'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isActive ? 'rgba(99,102,241,0.15)' : '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {opt.icon
                      ? <span className="material-symbols-rounded" style={{ fontSize: '20px', color: isActive ? '#818cf8' : '#475569' }}>{opt.icon}</span>
                      : <DriveLogoSVG size={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: isActive ? '#f1f5f9' : '#94a3b8', fontWeight: '700', fontSize: '14px', marginBottom: '3px' }}>{opt.label}</div>
                    <div style={{ color: '#475569', fontSize: '12px', lineHeight: '1.4' }}>{opt.desc}</div>
                  </div>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${isActive ? '#6366f1' : '#475569'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isActive && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Danger Zone ── */}
      <div style={{ ...S.section, background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#f87171' }}>warning</span>
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#f87171' }}>Danger Zone</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>These actions are permanent and cannot be undone</div>
          </div>
        </div>

        {[
          { label: 'Delete all captures', desc: `Permanently removes all ${captures.length} captures from your library`, onConfirm: handleDeleteAllCaptures, confirm: confirmDeleteCaptures, setConfirm: setConfirmDeleteCaptures, confirmText: 'Yes, delete all' },
          { label: 'Delete account', desc: 'Permanently deletes all your data and signs you out', onConfirm: handleDeleteAccount, confirm: confirmDeleteAccount, setConfirm: setConfirmDeleteAccount, confirmText: 'Yes, delete everything' },
        ].map(({ label, desc, onConfirm, confirm, setConfirm, confirmText }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#0f172a', borderRadius: '12px', marginBottom: '10px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '600' }}>{label}</div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px' }}>{desc}</div>
            </div>
            {!confirm ? (
              <button onClick={() => setConfirm(true)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete</span> {label.includes('account') ? 'Delete Account' : 'Delete All'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setConfirm(false)} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={onConfirm} disabled={deleting} style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: deleting ? 0.6 : 1 }}>
                  {deleting ? 'Deleting…' : confirmText}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
