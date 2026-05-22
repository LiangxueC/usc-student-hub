import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "../api/supabase";
import { apiFetch } from "../api/client";

const NAV = [
  { to: "/",              label: "Dashboard",   icon: "ti-layout-dashboard", end: true },
  { to: "/classes",       label: "Classes",     icon: "ti-book" },
  { to: "/assignments",   label: "Assignments", icon: "ti-clipboard-list" },
  { to: "/matrix",        label: "Priority",    icon: "ti-layout-columns" },
  { to: "/calendar",      label: "Calendar",    icon: "ti-calendar" },
  { to: "/grades",        label: "Grades",      icon: "ti-chart-bar" },
  { to: "/syllabus-search", label: "Syllabus DB", icon: "ti-database" },
  { to: "/groups",        label: "Groups",      icon: "ti-users" },
  { to: "/news",          label: "USC News",    icon: "ti-news" },
  { to: "/degree",        label: "Degree",      icon: "ti-school" },
  { to: "/focus",         label: "Focus Timer", icon: "ti-clock" },
];

function getInitials(email = "") {
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : local.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function Sidebar({ userEmail }) {
  const [mode, setMode]           = useState("full"); // full | icons | mobile
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      const w = window.innerWidth;
      if (w < 768)  setMode("mobile");
      else if (w < 1100) setMode("icons");
      else setMode("full");
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const w = mode === "full" ? 220 : mode === "icons" ? 48 : 0;

  const inner = (
    <SidebarInner
      userEmail={userEmail}
      mode={mode === "mobile" ? "full" : mode}
      onClose={() => setMobileOpen(false)}
    />
  );

  return (
    <>
      {/* Flex spacer so content shifts right */}
      <div style={{ width: w, flexShrink: 0 }} />

      {/* Fixed sidebar (non-mobile) */}
      {mode !== "mobile" && (
        <div style={{ ...s.sidebar, width: w }}>
          {inner}
        </div>
      )}

      {/* Mobile: hamburger + overlay drawer */}
      {mode === "mobile" && (
        <>
          <button style={s.hamburger} onClick={() => setMobileOpen(true)}>☰</button>
          {mobileOpen && (
            <div style={s.overlay} onClick={() => setMobileOpen(false)}>
              <div style={{ ...s.sidebar, width: 220, position: "relative" }}
                   onClick={e => e.stopPropagation()}>
                {inner}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Inner content (shared between modes)
// ---------------------------------------------------------------------------
function SidebarInner({ userEmail, mode, onClose }) {
  const showLabels = mode === "full";

  return (
    <div style={s.inner}>
      {/* Logo */}
      <div style={s.logo}>
        <i className="ti ti-building" aria-hidden="true" style={s.logoIcon} />
        {showLabels && <span style={s.logoText}>USC Hub</span>}
      </div>

      {/* Avatar */}
      <div style={s.avatarBlock}>
        <div style={s.avatar}>{getInitials(userEmail)}</div>
        {showLabels && (
          <div style={s.avatarInfo}>
            <span style={s.avatarEmail}>{userEmail}</span>
          </div>
        )}
      </div>

      <div style={s.divider} />

      {/* Nav links */}
      <nav style={s.nav}>
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            style={({ isActive }) => ({
              ...s.navLink,
              ...(isActive ? s.navLinkActive : {}),
              justifyContent: showLabels ? "flex-start" : "center",
            })}
            title={showLabels ? undefined : label}
          >
            <i className={`ti ${icon}`} aria-hidden="true" style={s.navIcon} />
            {showLabels && <span style={s.navLabel}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={s.bottom}>
        <div style={s.divider} />
        <NotificationsBell showLabel={showLabels} />
        <button
          style={{ ...s.navLink, ...s.signOutBtn, justifyContent: showLabels ? "flex-start" : "center" }}
          onClick={() => supabase.auth.signOut()}
          title={showLabels ? undefined : "Sign out"}
        >
          <i className="ti ti-logout" aria-hidden="true" style={s.navIcon} />
          {showLabels && <span style={s.navLabel}>Sign out</span>}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications bell
// ---------------------------------------------------------------------------
function NotificationsBell({ showLabel }) {
  const [notifs, setNotifs]   = useState([]);
  const [open, setOpen]       = useState(false);
  const dropRef               = useRef(null);

  async function load() {
    try { setNotifs(await apiFetch("/notifications/")); } catch {}
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const unread = notifs.filter(n => !n.is_read).length;

  async function markAll() {
    try { await apiFetch("/notifications/mark-all-read", { method: "POST" }); } catch {}
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
  }

  async function markOne(id) {
    try { await apiFetch(`/notifications/${id}/read`, { method: "PATCH" }); } catch {}
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  function fmtDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div style={{ position: "relative" }} ref={dropRef}>
      <button
        style={{ ...s.navLink, justifyContent: showLabel ? "flex-start" : "center" }}
        onClick={() => setOpen(v => !v)}
        title={showLabel ? undefined : "Notifications"}
      >
        <span style={{ position: "relative", flexShrink: 0 }}>
          <i className="ti ti-bell" aria-hidden="true" style={s.navIcon} />
          {unread > 0 && (
            <span style={s.badge}>{unread > 9 ? "9+" : unread}</span>
          )}
        </span>
        {showLabel && <span style={s.navLabel}>Notifications {unread > 0 && `(${unread})`}</span>}
      </button>

      {open && (
        <div style={s.dropdown}>
          <div style={s.dropHead}>
            <span style={s.dropTitle}>Notifications</span>
            {unread > 0 && <button style={s.markAllBtn} onClick={markAll}>Mark all read</button>}
          </div>
          <div style={s.dropList}>
            {notifs.length === 0
              ? <p style={s.dropEmpty}>No notifications.</p>
              : notifs.map(n => (
                <div key={n.id} style={{ ...s.dropItem, ...(n.is_read ? s.dropItemRead : {}) }}
                  onClick={() => !n.is_read && markOne(n.id)}>
                  {!n.is_read && <span style={s.unreadDot} />}
                  <div style={s.dropBody}>
                    <span style={s.dropMsg}>{n.message}</span>
                    <span style={s.dropDate}>{fmtDate(n.created_at)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const USC = "#9D2235";

const s = {
  sidebar: {
    position: "fixed",
    top: 0, left: 0,
    height: "100vh",
    background: "#F8F8F8",
    borderRight: "1px solid #e5e4e7",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 50,
    transition: "width 0.2s ease",
  },
  inner: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: "0",
    overflowX: "hidden",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "18px 14px 10px",
    flexShrink: 0,
  },
  logoIcon: { fontSize: "20px", color: USC, flexShrink: 0, lineHeight: 1 },
  logoText: { fontSize: "15px", fontWeight: 800, color: USC, whiteSpace: "nowrap" },

  avatarBlock: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px 12px",
    flexShrink: 0,
  },
  avatar: {
    width: "32px", height: "32px",
    borderRadius: "50%",
    background: USC,
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInfo: { display: "flex", flexDirection: "column", minWidth: 0 },
  avatarEmail: {
    fontSize: "11px", color: "#6b6375",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    maxWidth: "150px",
  },

  divider: { height: "1px", background: "#e5e4e7", margin: "4px 0", flexShrink: 0 },

  nav: { flex: 1, overflowY: "auto", padding: "4px 8px", display: "flex", flexDirection: "column", gap: "2px" },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 8px",
    borderRadius: "7px",
    border: "none",
    background: "none",
    cursor: "pointer",
    textDecoration: "none",
    color: "#6b6375",
    fontSize: "13px",
    fontWeight: 500,
    width: "100%",
    textAlign: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    transition: "background 0.1s",
  },
  navLinkActive: { background: "#fdeaec", color: USC, fontWeight: 600 },
  navIcon: { fontSize: "18px", flexShrink: 0, lineHeight: 1, display: "flex", alignItems: "center" },
  navLabel: { fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis" },

  bottom: { flexShrink: 0, padding: "4px 8px 12px", display: "flex", flexDirection: "column", gap: "2px" },
  signOutBtn: { color: "#6b6375" },

  badge: {
    position: "absolute",
    top: "-4px", right: "-6px",
    background: USC, color: "#fff",
    fontSize: "9px", fontWeight: 700,
    borderRadius: "8px",
    minWidth: "14px", height: "14px",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "0 2px",
  },

  dropdown: {
    position: "absolute",
    bottom: "100%",
    left: "8px",
    width: "300px",
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 200,
    overflow: "hidden",
    marginBottom: "4px",
  },
  dropHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 16px", borderBottom: "1px solid #f3f4f6",
  },
  dropTitle: { fontSize: "13px", fontWeight: 700, color: "#08060d" },
  markAllBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: USC, fontWeight: 500 },
  dropList: { maxHeight: "280px", overflowY: "auto" },
  dropEmpty: { padding: "20px", margin: 0, fontSize: "13px", color: "#9ca3af", textAlign: "center" },
  dropItem: {
    display: "flex", alignItems: "flex-start", gap: "8px",
    padding: "10px 16px", borderBottom: "1px solid #f9f9fb",
    cursor: "pointer",
  },
  dropItemRead: { opacity: 0.5, cursor: "default" },
  unreadDot: { width: "7px", height: "7px", borderRadius: "50%", background: USC, flexShrink: 0, marginTop: "3px" },
  dropBody: { display: "flex", flexDirection: "column", gap: "2px" },
  dropMsg: { fontSize: "13px", color: "#08060d", lineHeight: 1.4 },
  dropDate: { fontSize: "11px", color: "#9ca3af" },

  hamburger: {
    position: "fixed", top: "12px", left: "12px",
    zIndex: 60, background: "#fff",
    border: "1px solid #e5e4e7", borderRadius: "6px",
    padding: "6px 10px", fontSize: "16px", cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: 55,
    display: "flex",
  },
};
