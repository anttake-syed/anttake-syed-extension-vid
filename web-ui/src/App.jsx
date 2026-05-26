import React, { useState, useEffect } from "react";
import "./index.css";

const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// ─── Login Modal ──────────────────────────────────────────────────────────────
function LoginModal({ onClose }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    setLoading(true);
    const width = 500,
      height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const origin = window.location.origin;
    window.open(
      `${BACKEND_URL}/auth/google?source=web&mode=popup&origin=${encodeURIComponent(origin)}`,
      "Google Login",
      `width=${width},height=${height},left=${left},top=${top}`,
    );
    setTimeout(() => setLoading(false), 5000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="modal-brand">
          <div className="brand-icon-sm">
            <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#mg)" />
              <circle cx="16" cy="16" r="6" fill="white" opacity="0.9" />
              <defs>
                <linearGradient
                  id="mg"
                  x1="0"
                  y1="0"
                  x2="32"
                  y2="32"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2>Sign in to AntCapture</h2>
          <p>
            Connect your Google account to upload recordings, sync across
            devices, and access your library.
          </p>
        </div>
        <button
          id="google-signin-btn"
          className={`google-btn ${loading ? "loading" : ""}`}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="btn-spinner" />
              <span>Redirecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>
        <p className="modal-footer">
          By signing in you authorize AntCapture to store recordings in your
          Google Drive.
        </p>
      </div>
    </div>
  );
}

// ─── Media Player Modal ───────────────────────────────────────────────────────
function MediaModal({ item, onClose, user, onSyncSuccess }) {
  if (!item) return null;
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const handleSyncToDrive = async (e) => {
    e.stopPropagation();
    if (!user?.jwt) return;
    setSyncingDrive(true);
    setSyncError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/captures/${item.id}/sync-to-drive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.jwt}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.error || 'Failed to sync to Drive') + (data.detail ? ': ' + data.detail : ''));
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleSyncToLocal = async (e) => {
    e.stopPropagation();
    if (!user?.jwt) return;
    setSyncingLocal(true);
    setSyncError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/captures/${item.id}/sync-to-local`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.jwt}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.error || 'Failed to sync to Local DB') + (data.detail ? ': ' + data.detail : ''));
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncingLocal(false);
    }
  };

  const [removingLocal, setRemovingLocal] = useState(false);
  const [removingDrive, setRemovingDrive] = useState(false);

  const handleRemoveLocal = async (e) => {
    e.stopPropagation();
    if (!user?.jwt) return;
    setRemovingLocal(true);
    setSyncError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/captures/${item.id}/remove-local`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.jwt}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.error || 'Failed to remove from Local DB') + (data.detail ? ': ' + data.detail : ''));
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setRemovingLocal(false);
    }
  };

  const handleRemoveDrive = async (e) => {
    e.stopPropagation();
    if (!user?.jwt) return;
    setRemovingDrive(true);
    setSyncError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/captures/${item.id}/remove-drive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.jwt}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.error || 'Failed to remove from Google Drive') + (data.detail ? ': ' + data.detail : ''));
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setRemovingDrive(false);
    }
  };

  const loc = item.storageLocation || 'local';

  const badges = [];
  if (loc === 'local' || loc === 'both') {
    badges.push({ label: '🗄️ Local Database', color: '#818cf8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' });
  }
  if (loc === 'drive' || loc === 'both') {
    badges.push({ label: '☁️ Google Drive', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' });
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1000, background: "rgba(0,0,0,0.85)" }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "80%",
          maxWidth: "900px",
          background: "#0f172a",
          border: "1px solid #334155",
          padding: "0",
          overflow: "hidden",
        }}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          style={{ zIndex: 10, top: "15px", right: "15px" }}
        >
          ✕
        </button>
        <div
          className="modal-brand"
          style={{
            padding: "20px",
            paddingBottom: "15px",
            textAlign: "left",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", color: "#f8fafc" }}>
            {item.title}{item.ext}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
            <span style={{ color: "#94a3b8", fontSize: "13px" }}>
              {item.date ? new Date(item.date).toLocaleDateString() : ""} • {item.size}
            </span>
            {badges.map((b) => (
              <span key={b.label} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: b.bg,
                border: `1px solid ${b.border}`,
                borderRadius: "999px",
                padding: "3px 10px",
                fontSize: "12px",
                fontWeight: 600,
                color: b.color,
              }}>
                {b.label}
              </span>
            ))}
            {item.driveUrl && (
              <a
                href={item.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#60a5fa", textDecoration: "none" }}
                onClick={(e) => e.stopPropagation()}
              >
                Open in Drive ↗
              </a>
            )}
            
            {/* Sync buttons */}
            <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
              {loc === 'local' && (
                <button
                  onClick={handleSyncToDrive}
                  disabled={syncingDrive}
                  style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", cursor: syncingDrive ? "not-allowed" : "pointer" }}
                >
                  {syncingDrive ? "Syncing..." : "⬆️ Backup to Drive"}
                </button>
              )}
              {loc === 'drive' && (
                <button
                  onClick={handleSyncToLocal}
                  disabled={syncingLocal}
                  style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", cursor: syncingLocal ? "not-allowed" : "pointer" }}
                >
                  {syncingLocal ? "Syncing..." : "⬇️ Save to Local DB"}
                </button>
              )}
              {loc === 'both' && (
                <>
                  <button
                    onClick={handleRemoveLocal}
                    disabled={removingLocal}
                    style={{ background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: "4px", padding: "3px 8px", fontSize: "12px", cursor: removingLocal ? "not-allowed" : "pointer" }}
                  >
                    {removingLocal ? "Removing..." : "🗑️ Remove Local"}
                  </button>
                  <button
                    onClick={handleRemoveDrive}
                    disabled={removingDrive}
                    style={{ background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: "4px", padding: "3px 8px", fontSize: "12px", cursor: removingDrive ? "not-allowed" : "pointer" }}
                  >
                    {removingDrive ? "Removing..." : "🗑️ Remove Drive"}
                  </button>
                </>
              )}
            </div>
          </div>
          {syncError && <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px" }}>Error: {syncError}</div>}
        </div>

        <div
          style={{
            padding: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#000",
            minHeight: "300px",
          }}
        >
          {item.type === "video" ? (
            <video
              controls
              autoPlay
              style={{
                width: "100%",
                maxHeight: "60vh",
                outline: "none",
                background: "#000",
              }}
              src={item.src}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={item.src}
              style={{
                maxWidth: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
              }}
              alt={item.title}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
// Renders when activeNav === 'Settings'.
// Features: change display name, show email, storage usage,
//           delete all captures, delete account.
function SettingsPanel({
  user,
  captures,
  onNameUpdate,
  onDeleteAllCaptures,
  onDeleteAccount,
  storagePreference,
  saveStoragePreference,
  savingPref,
}) {
  const [newName, setNewName] = useState(user?.name || "");
  const [nameStatus, setNameStatus] = useState(null); // 'saving' | 'saved' | 'error'
  const [confirmDeleteCaptures, setConfirmDeleteCaptures] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Storage usage derived from captures
  const totalMB = captures
    .reduce((acc, c) => acc + (parseFloat(c.size) || 0), 0)
    .toFixed(1);
  const videoCount = captures.filter((c) => c.type === "video").length;
  const imageCount = captures.filter((c) => c.type === "image").length;

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === user?.name) return;
    setNameStatus("saving");
    try {
      await onNameUpdate(newName.trim());
      setNameStatus("saved");
      setTimeout(() => setNameStatus(null), 2000);
    } catch {
      setNameStatus("error");
      setTimeout(() => setNameStatus(null), 2000);
    }
  };

  const handleDeleteAllCaptures = async () => {
    setDeleting(true);
    try {
      await onDeleteAllCaptures();
      setConfirmDeleteCaptures(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setDeleting(false);
    }
  };

  const sectionStyle = {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "16px",
  };

  const labelStyle = {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "8px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#f1f5f9",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const dangerBtnStyle = {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#ef4444",
    borderRadius: "8px",
    padding: "9px 18px",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: "500",
  };

  const confirmBtnStyle = {
    background: "#ef4444",
    border: "none",
    color: "white",
    borderRadius: "8px",
    padding: "9px 18px",
    fontSize: "13px",
    cursor: deleting ? "not-allowed" : "pointer",
    fontWeight: "600",
    opacity: deleting ? 0.6 : 1,
  };

  const cancelBtnStyle = {
    background: "transparent",
    border: "1px solid #334155",
    color: "#94a3b8",
    borderRadius: "8px",
    padding: "9px 18px",
    fontSize: "13px",
    cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      {/* ── Profile ── */}
      <div style={sectionStyle}>
        <h3
          style={{
            margin: "0 0 20px",
            fontSize: "16px",
            color: "#f1f5f9",
            fontWeight: "600",
          }}
        >
          Profile
        </h3>

        {/* Avatar + name row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {user?.picture ? (
            <img
              src={user.picture}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                border: "2px solid #334155",
              }}
              alt="Avatar"
            />
          ) : (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg,#6366f1,#a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                color: "white",
                fontWeight: "700",
              }}
            >
              {user?.name?.charAt(0) || "U"}
            </div>
          )}
          <div>
            <div
              style={{ color: "#f1f5f9", fontWeight: "600", fontSize: "16px" }}
            >
              {user?.name}
            </div>
            <div style={{ color: "#64748b", fontSize: "13px" }}>
              {user?.email}
            </div>
          </div>
        </div>

        {/* Change display name */}
        <label style={labelStyle}>Display Name</label>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            style={inputStyle}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            placeholder="Your display name"
            maxLength={50}
          />
          <button
            onClick={handleSaveName}
            disabled={
              nameStatus === "saving" ||
              !newName.trim() ||
              newName.trim() === user?.name
            }
            style={{
              background: "linear-gradient(135deg,#6366f1,#a855f7)",
              border: "none",
              color: "white",
              borderRadius: "8px",
              padding: "10px 18px",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: "600",
              whiteSpace: "nowrap",
              opacity:
                nameStatus === "saving" ||
                !newName.trim() ||
                newName.trim() === user?.name
                  ? 0.5
                  : 1,
            }}
          >
            {nameStatus === "saving"
              ? "Saving..."
              : nameStatus === "saved"
                ? "✓ Saved"
                : nameStatus === "error"
                  ? "Error"
                  : "Save"}
          </button>
        </div>

        {/* Email — read only */}
        <label style={{ ...labelStyle, marginTop: "20px" }}>
          Email Address
        </label>
        <div
          style={{
            ...inputStyle,
            color: "#64748b",
            cursor: "default",
            userSelect: "none",
          }}
        >
          {user?.email}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#475569" }}>
          Your email is managed by Google and cannot be changed here.
        </p>
      </div>

      {/* ── Storage & Usage ── */}
      <div style={sectionStyle}>
        <h3
          style={{
            margin: "0 0 20px",
            fontSize: "16px",
            color: "#f1f5f9",
            fontWeight: "600",
          }}
        >
          Storage & Usage
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {[
            { label: "Total Captures", value: captures.length, icon: "📁" },
            { label: "Videos", value: videoCount, icon: "🎥" },
            { label: "Screenshots", value: imageCount, icon: "🖼" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#1e293b",
                borderRadius: "10px",
                padding: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "22px", marginBottom: "6px" }}>
                {s.icon}
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#f1f5f9",
                }}
              >
                {s.value}
              </div>
              <div
                style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            background: "#1e293b",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: "14px" }}>
            Total storage used
          </span>
          <span
            style={{ color: "#f1f5f9", fontWeight: "700", fontSize: "16px" }}
          >
            {totalMB} MB
          </span>
        </div>
      </div>

      {/* ── Storage Destination ── */}
      <div style={sectionStyle}>
        <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#f1f5f9", fontWeight: "600" }}>
          Storage Destination
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b" }}>
          Choose where your screenshots and recordings are saved. Changes apply to all future captures.
        </p>
        {savingPref && <p style={{ fontSize: "12px", color: "#818cf8", marginBottom: "12px" }}>Saving...</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            {
              value: "local",
              label: "🗄️ Local Database (SQLite)",
              desc: "Files stored on your server's local database only. Fast, works offline.",
              color: "#818cf8",
            },
            {
              value: "drive",
              label: "☁️ Google Drive Only",
              desc: "Files saved directly to your Google Drive. Nothing stored locally.",
              color: "#34d399",
            },
          ].map((opt) => {
            const isActive = storagePreference === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => saveStoragePreference(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "16px",
                  background: isActive ? `rgba(99,102,241,0.08)` : "#1e293b",
                  border: `1px solid ${isActive ? "rgba(99,102,241,0.4)" : "#334155"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: `2px solid ${isActive ? opt.color : "#475569"}`,
                  background: isActive ? opt.color : "transparent",
                  flexShrink: 0,
                  marginTop: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {isActive && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "white" }} />}
                </div>
                <div>
                  <div style={{ color: isActive ? "#f1f5f9" : "#94a3b8", fontWeight: "600", fontSize: "14px", marginBottom: "3px" }}>
                    {opt.label}
                  </div>
                  <div style={{ color: "#475569", fontSize: "12px" }}>{opt.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div style={{ ...sectionStyle, border: "1px solid rgba(239,68,68,0.2)" }}>
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: "16px",
            color: "#ef4444",
            fontWeight: "600",
          }}
        >
          Danger Zone
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b" }}>
          These actions are permanent and cannot be undone.
        </p>

        {/* Delete all captures */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px",
            background: "#1e293b",
            borderRadius: "10px",
            marginBottom: "12px",
          }}
        >
          <div>
            <div
              style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}
            >
              Delete all captures
            </div>
            <div
              style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}
            >
              Removes all {captures.length} captures from your library and disk
            </div>
          </div>
          {!confirmDeleteCaptures ? (
            <button
              style={dangerBtnStyle}
              onClick={() => setConfirmDeleteCaptures(true)}
            >
              Delete All
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                style={cancelBtnStyle}
                onClick={() => setConfirmDeleteCaptures(false)}
              >
                Cancel
              </button>
              <button
                style={confirmBtnStyle}
                onClick={handleDeleteAllCaptures}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, delete all"}
              </button>
            </div>
          )}
        </div>

        {/* Delete account */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px",
            background: "#1e293b",
            borderRadius: "10px",
          }}
        >
          <div>
            <div
              style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}
            >
              Delete account
            </div>
            <div
              style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}
            >
              Permanently deletes all your data and signs you out
            </div>
          </div>
          {!confirmDeleteAccount ? (
            <button
              style={dangerBtnStyle}
              onClick={() => setConfirmDeleteAccount(true)}
            >
              Delete Account
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                style={cancelBtnStyle}
                onClick={() => setConfirmDeleteAccount(false)}
              >
                Cancel
              </button>
              <button
                style={confirmBtnStyle}
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, delete everything"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Small toggle component used in Preferences section
function PreferenceToggle({ label, sublabel, defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid #1e293b",
      }}
    >
      <div>
        <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>
          {label}
        </div>
        <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
          {sublabel}
        </div>
      </div>
      <button
        onClick={() => setOn((o) => !o)}
        style={{
          width: "44px",
          height: "24px",
          borderRadius: "999px",
          border: "none",
          cursor: "pointer",
          background: on
            ? "linear-gradient(135deg,#6366f1,#a855f7)"
            : "#334155",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: on ? "23px" : "3px",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "white",
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}
// ─── Static Pages & Feedback ──────────────────────────────────────────────────
function StaticPage({ title, content }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", padding: "24px", color: "#f1f5f9" }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ lineHeight: "1.6", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>{content}</div>
    </div>
  );
}

function FeedbackForm() {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  
  if (submitted) return <StaticPage title="Thank you!" content="Your feedback has been submitted successfully." />;

  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", padding: "24px", color: "#f1f5f9" }}>
      <h2 style={{ marginTop: 0 }}>Submit Feedback</h2>
      <textarea 
        value={text} 
        onChange={e => setText(e.target.value)}
        placeholder="Describe the issue or feedback..."
        style={{ width: "100%", height: "120px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px", color: "white", marginBottom: "16px", outline: "none", resize: "vertical", boxSizing: "border-box" }}
      />
      <label style={{ display: "block", marginBottom: "16px" }}>
        <span style={{ display: "block", marginBottom: "8px" }}>Optional Screenshot:</span>
        <input type="file" accept="image/*" />
      </label>
      <button 
        onClick={() => setSubmitted(true)}
        style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", border: "none", color: "white", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontWeight: "600" }}
      >
        Submit
      </button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [activeMedia, setActiveMedia] = useState(null);
  const [captures, setCaptures] = useState([]);
  const [loadingCaptures, setLoadingCaptures] = useState(false);
  const [filter, setFilter] = useState("All");
  const [dbStats, setDbStats] = useState(null);
  const [storagePreference, setStoragePreference] = useState('local');
  const [savingPref, setSavingPref] = useState(false);

  const stats = [
    { label: "Total Captures", value: (dbStats?.total ?? captures.length).toString(), icon: "📁" },
    {
      label: "Local Storage Used",
      value: dbStats?.dbSizeFormatted ?? "0 B",
      icon: "🗄️",
      sub: dbStats ? `${dbStats.localCount} files local` : null,
    },
    {
      label: "Google Drive Used",
      value: dbStats?.appDriveFormatted ?? "0 B",
      icon: "☁️",
      sub: dbStats ? `${dbStats.driveCount} files on Drive${dbStats.driveLimitBytes > 0 ? ` (Overall: ${dbStats.driveUsageFormatted} / ${dbStats.driveLimitFormatted})` : ''}` : null,
    },
    {
      label: "This Week",
      value: captures
        .filter(
          (c) =>
            c.date &&
            new Date(c.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        )
        .length.toString(),
      icon: "📈",
    },
  ];

  const filteredCaptures = captures.filter((c) => {
    if (filter === "Videos") return c.type === "video";
    if (filter === "Screenshots") return c.type === "image";
    return true;
  });

  const fetchCaptures = async (jwt, background = false) => {
    if (!background) setLoadingCaptures(true);
    try {
      const res = await fetch(`${BACKEND_URL}/captures`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCaptures((data.captures || []).map((c) => ({ ...c, src: c.fileUrl })));
    } catch (err) {
      console.error("Failed to fetch captures:", err);
    } finally {
      if (!background) setLoadingCaptures(false);
    }
  };

  const fetchStats = async (jwt) => {
    try {
      const res = await fetch(`${BACKEND_URL}/stats`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDbStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchSettings = async (jwt) => {
    try {
      const res = await fetch(`${BACKEND_URL}/settings`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setStoragePreference(data.storagePreference || 'both');
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const saveStoragePreference = async (pref) => {
    const storedUser = localStorage.getItem("antcapture_user");
    if (!storedUser) return;
    const userData = JSON.parse(storedUser);
    if (!userData.jwt) return;
    setSavingPref(true);
    try {
      const res = await fetch(`${BACKEND_URL}/settings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userData.jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePreference: pref }),
      });
      if (res.ok) setStoragePreference(pref);
    } catch (err) {
      console.error("Failed to save setting:", err);
    } finally {
      setSavingPref(false);
    }
  };


  const processAuthData = (authData) => {
    try {
      const base64Url = authData.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      const userData = JSON.parse(jsonPayload);
      userData.jwt = authData;
      localStorage.setItem("antcapture_user", JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      setShowModal(false);
      fetchCaptures(authData);
      fetchStats(authData);
      fetchSettings(authData);
    } catch (e) {
      console.error("Auth parse error:", e);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("antcapture_user");
    let jwtToFetch = null;
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAuthenticated(true);
      if (userData.jwt) jwtToFetch = userData.jwt;
    }
    const params = new URLSearchParams(window.location.search);
    const authData = params.get("auth_data");
    if (authData) {
      processAuthData(authData);
      window.history.replaceState(
        {},
        document.title,
        window.location.origin + window.location.pathname,
      );
      jwtToFetch = authData;
    } else if (jwtToFetch) {
      fetchCaptures(jwtToFetch);
      fetchStats(jwtToFetch);
      fetchSettings(jwtToFetch);
    }

    const handleMessage = (event) => {
      if (event.origin !== BACKEND_URL) return;
      if (event.data?.type === "AUTH_SUCCESS" && event.data.auth_data) {
        processAuthData(event.data.auth_data);
      }
    };
    window.addEventListener("message", handleMessage);

    // Auto-refresh polling
    let interval;
    const handleFocus = () => {
      if (jwtToFetch) { fetchCaptures(jwtToFetch, true); fetchStats(jwtToFetch); }
    };
    if (jwtToFetch) {
      interval = setInterval(() => {
        fetchCaptures(jwtToFetch, true);
        fetchStats(jwtToFetch);
      }, 5000);
      window.addEventListener('focus', handleFocus);
    }
    
    // Done initializing
    setTimeout(() => setIsInitializing(false), 300);

    return () => {
      window.removeEventListener("message", handleMessage);
      if (interval) clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const requireAuth = (fn) => {
    if (isAuthenticated) fn?.();
    else setShowModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("antcapture_user");
    setUser(null);
    setIsAuthenticated(false);
    setCaptures([]);
    setShowProfileMenu(false);
    setActiveNav("Dashboard");
  };

  // ── Settings handlers ────────────────────────────────────────────────────
  // Updates the display name in localStorage and local state.
  // Calls PATCH /user/name on the backend to persist it.
  const handleNameUpdate = async (newName) => {
    const res = await fetch(`${BACKEND_URL}/user/name`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.jwt}`,
      },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) throw new Error("Failed to update name");

    // Update local state and localStorage so header reflects new name immediately
    const updated = { ...user, name: newName };
    setUser(updated);
    localStorage.setItem("antcapture_user", JSON.stringify(updated));
  };

  // Deletes all captures from DB + disk, clears local captures state
  const handleDeleteAllCaptures = async () => {
    const res = await fetch(`${BACKEND_URL}/captures/all`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.jwt}` },
    });
    if (!res.ok) throw new Error("Failed to delete captures");
    setCaptures([]);
  };

  // Deletes all captures + signs the user out (no User model so account = captures)
  const handleDeleteAccount = async () => {
    const res = await fetch(`${BACKEND_URL}/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.jwt}` },
    });
    if (!res.ok) throw new Error("Failed to delete account");
    handleLogout(); // Sign out after deletion
  };

  if (isInitializing) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0f172a" }}>
        <div className="btn-spinner" style={{ width: "32px", height: "32px", borderTopColor: "#6366f1", borderRightColor: "#6366f1" }}></div>
      </div>
    );
  }

  return (
    <div className={`layout ${isAuthenticated ? "isAuthenticated" : ""}`}>
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
      {activeMedia && (
        <MediaModal item={activeMedia} onClose={() => setActiveMedia(null)} user={user} onSyncSuccess={() => { fetchCaptures(user.jwt); fetchStats(user.jwt); setActiveMedia(null); }} />
      )}

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="logo">
          <svg
            viewBox="0 0 20 20"
            width="20"
            height="20"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <circle cx="10" cy="10" r="10" fill="url(#sl)" />
            <circle cx="10" cy="10" r="4" fill="white" opacity="0.9" />
            <defs>
              <linearGradient
                id="sl"
                x1="0"
                y1="0"
                x2="20"
                y2="20"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          AntCapture
        </div>
        <nav>
          <ul className="nav-list">
            {["Dashboard", "My Library", "Settings", "Feedback", "Privacy", "Security", "Documentation"].map(
              (item) => (
                <li
                  key={item}
                  className={`nav-item ${activeNav === item ? "active" : ""}`}
                  onClick={() => {
                     if (item === "Dashboard" || item === "Privacy" || item === "Security" || item === "Documentation") {
                       setActiveNav(item);
                     } else {
                       requireAuth(() => setActiveNav(item));
                     }
                  }}
                >
                  <span className="nav-icon">
                    {item === "Dashboard"
                      ? "⊞"
                      : item === "My Library"
                        ? "🗂"
                        : item === "Settings"
                          ? "⚙"
                          : item === "Feedback"
                            ? "💬"
                            : "📄"}
                  </span>
                  {item}
                  {!isAuthenticated && item !== "Dashboard" && item !== "Privacy" && item !== "Security" && item !== "Documentation" && (
                    <span className="nav-lock">🔒</span>
                  )}
                </li>
              ),
            )}
          </ul>
        </nav>
        <div className="sidebar-footer">
          {isAuthenticated ? (
            <button className="btn-logout" onClick={handleLogout}>
              Sign Out
            </button>
          ) : (
            <button
              className="btn-signin-sidebar"
              onClick={() => setShowModal(true)}
            >
              Sign in with Google
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="title-section">
            <h1>{activeNav === "Settings" ? "Settings" : activeNav === "Feedback" ? "Feedback" : activeNav === "Privacy" ? "Privacy Policy" : activeNav === "Security" ? "Security" : activeNav === "Documentation" ? "Documentation" : "Capture Library"}</h1>
            <p>
              {activeNav === "Settings"
                ? "Manage your account and preferences."
                : activeNav === "Feedback" 
                  ? "We'd love to hear from you."
                  : activeNav === "Privacy" || activeNav === "Security" || activeNav === "Documentation" 
                    ? "Important information about AntCapture."
                    : "Your recordings and screenshots, synced across all devices."}
            </p>
          </div>
          <div className="header-actions">
            {isAuthenticated && user ? (
              <div className="profile-container">
                <div
                  className="user-pill animated fadeIn"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      className="user-avatar profile-circle"
                      alt="Profile"
                    />
                  ) : (
                    <div className="user-avatar profile-circle">
                      {user.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="user-name">{user.name}</span>
                  <span className="chevron">▼</span>
                </div>
                {showProfileMenu && (
                  <div className="profile-dropdown animated fadeInScale">
                    <div className="dropdown-header">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <div className="dropdown-divider" />
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setActiveNav("Settings");
                        setShowProfileMenu(false);
                      }}
                    >
                      <span className="item-icon">⚙</span> Settings
                    </button>
                    <button
                      className="dropdown-item logout"
                      onClick={handleLogout}
                    >
                      <span className="item-icon">🚪</span> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  className="btn-ghost"
                  onClick={() => setShowModal(true)}
                >
                  Sign In
                </button>
                <button
                  className="btn-primary glow-pulse"
                  onClick={() => setShowModal(true)}
                >
                  Get Started Free →
                </button>
              </>
            )}
          </div>
        </header>

        {/* ── Settings View ── */}
        {activeNav === "Settings" && isAuthenticated ? (
          <SettingsPanel
            user={user}
            captures={captures}
            onNameUpdate={handleNameUpdate}
            onDeleteAllCaptures={handleDeleteAllCaptures}
            onDeleteAccount={handleDeleteAccount}
            storagePreference={storagePreference}
            saveStoragePreference={saveStoragePreference}
            savingPref={savingPref}
          />
        ) : activeNav === "Feedback" && isAuthenticated ? (
          <FeedbackForm />
        ) : activeNav === "Privacy" ? (
          <StaticPage title="Privacy Policy" content="This is the Privacy Policy for AntCapture. We do not store your data on our servers; it is stored safely in your Google Drive." />
        ) : activeNav === "Security" ? (
          <StaticPage title="Security" content="We use industry standard encryption and best practices. Your authentication tokens are secure." />
        ) : activeNav === "Documentation" ? (
          <StaticPage title="Documentation" content={"Welcome to AntCapture!\n\n1. Click 'Record Screen' to start recording.\n2. Click 'Take Screenshot' to capture your screen.\n3. Everything syncs to Google Drive automatically."} />
        ) : (
          <>
            {/* Hero — logged out only */}
            {!isAuthenticated && (
              <section className="hero-banner slideIn">
                <div className="hero-text">
                  <h2>Record. Screenshot. Sync.</h2>
                  <p>
                    Capture anything on your screen and automatically back it up
                    to Google Drive. Works as a Chrome extension — no account
                    needed to start.
                  </p>
                  <div className="hero-pills">
                    <span className="pill">✓ Tab & window recording</span>
                    <span className="pill">✓ One-click screenshots</span>
                    <span className="pill">✓ 5GB Free Storage</span>
                  </div>
                </div>
                <button className="btn-hero" onClick={() => setShowModal(true)}>
                  <img
                    src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
                    alt="G"
                    className="google-icon"
                  />
                  Sign in with Google
                </button>
              </section>
            )}

            {/* Stats */}
            <section className="stats-row">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={`stat-card ${!isAuthenticated ? "blurred" : ""}`}
                  onClick={() => !isAuthenticated && setShowModal(true)}
                >
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-value">
                    {isAuthenticated ? s.value : "—"}
                  </div>
                  <div className="stat-label">{s.label}</div>
                  {isAuthenticated && s.sub && (
                    <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>{s.sub}</div>
                  )}
                  {!isAuthenticated && (
                    <div className="lock-overlay">
                      <span>🔒 Sign in to view</span>
                    </div>
                  )}
                </div>
              ))}
            </section>

            {/* Section header */}
            <div className="section-header">
              <h3>
                Recent Captures{" "}
                <span className="count-badge">
                  {isAuthenticated ? filteredCaptures.length : 0}
                </span>
              </h3>
              {isAuthenticated && (
                <div className="filter-row">
                  {["All", "Videos", "Screenshots"].map((f) => (
                    <button
                      key={f}
                      className={`filter-btn ${filter === f ? "active" : ""}`}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Media Grid */}
            <section className="media-grid">
              {!isAuthenticated ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="media-card card-preview"
                    onClick={() => setShowModal(true)}
                  >
                    <div className="media-preview">
                      <div className="media-thumb-icon">
                        <svg
                          viewBox="0 0 24 24"
                          width="40"
                          height="40"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ opacity: 0.3 }}
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <div className="media-overlay">
                        <div className="overlay-actions">
                          <button
                            className="media-action-btn locked"
                            onClick={() => setShowModal(true)}
                          >
                            🔒
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="media-info">
                      <div
                        className="media-title"
                        style={{ filter: "blur(6px)" }}
                      >
                        Capture title here
                      </div>
                      <div
                        className="media-meta"
                        style={{ filter: "blur(4px)" }}
                      >
                        <span>Just now · 0 MB</span>
                        <span className="tag image">image</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : loadingCaptures ? (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: "60px 0",
                    color: "#94a3b8",
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>
                    ⏳
                  </div>
                  <p>Loading your captures...</p>
                </div>
              ) : filteredCaptures.length === 0 ? (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: "60px 0",
                    color: "#94a3b8",
                  }}
                >
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>
                    📭
                  </div>
                  <p style={{ marginBottom: "6px" }}>No captures yet.</p>
                  <p style={{ fontSize: "13px" }}>
                    Use the Chrome extension to record or take a screenshot —
                    it'll show up here automatically.
                  </p>
                </div>
              ) : (
                filteredCaptures.map((item) => (
                  <div
                    key={item.id}
                    className="media-card"
                    onClick={(e) => {
                      if (e.target.closest(".media-action-btn")) return;
                      setActiveMedia(item);
                    }}
                  >
                    <div className="media-preview">
                      {item.type === "image" && item.src ? (
                        <img
                          src={item.src}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            position: "absolute",
                            top: 0,
                            left: 0,
                          }}
                          alt={item.title}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : item.type === "video" && item.src ? (
                        <video
                          src={item.src}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            position: "absolute",
                            top: 0,
                            left: 0,
                          }}
                          muted
                          loop
                          onMouseOver={(e) => e.target.play()}
                          onMouseOut={(e) => {
                            e.target.pause();
                            e.target.currentTime = 0;
                          }}
                        />
                      ) : (
                        <div className="media-thumb-icon">
                          {/* Generic Icon Fallback */}
                          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" style={{ opacity: 0.5 }}>
                            <rect x="2" y="2" width="20" height="20" rx="2.18" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                      {item.duration && (
                        <div className="duration-badge">{item.duration}</div>
                      )}
                      <div className="media-overlay">
                        <div className="overlay-actions">
                          {item.type === "video" && (
                            <button
                              className="media-action-btn play-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMedia(item);
                              }}
                              title="Preview"
                            >
                              ▶
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="media-info">
                      <div className="media-title">
                        {item.title}
                        <span className="file-ext">{item.ext}</span>
                      </div>
                      <div className="media-meta">
                        <span>
                          {item.date
                            ? new Date(item.date).toLocaleDateString()
                            : "Just now"}{" "}
                          · {item.size}
                        </span>
                        <span className={`tag ${item.type}`}>{item.type}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>

            {!isAuthenticated && (
              <div className="cta-banner" style={{ background: "rgba(255, 171, 0, 0.1)", border: "1px solid rgba(255, 171, 0, 0.2)" }}>
                <div>
                  <strong style={{ color: "#ffab00" }}>⚠️ Extension Sync Required</strong>
                  <span style={{ color: "#94a3b8" }}>
                    {" "}
                    Make sure you log into the AntCapture Chrome Extension with the same email to sync your recordings here.
                  </span>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowModal(true)}
                >
                  Sign in with Google →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
