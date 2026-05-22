import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "../api/supabase";
import { apiFetch } from "../api/client";

export default function Navbar({ userEmail }) {
  return (
    <nav style={s.nav}>
      <span style={s.brand}>USC Student Hub</span>
      <div style={s.links}>
        <NavLink to="/" end style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          Classes
        </NavLink>
        <NavLink to="/assignments" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          Assignments
        </NavLink>
        <NavLink to="/matrix" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          Priority
        </NavLink>
        <NavLink to="/calendar" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          Calendar
        </NavLink>
        <NavLink to="/grades" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          Grades
        </NavLink>
        <NavLink to="/focus" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          Focus
        </NavLink>
        <NavLink to="/syllabus-search" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          Syllabus DB
        </NavLink>
        <NavLink to="/degree" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          Degree
        </NavLink>
        <NavLink to="/news" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          USC News
        </NavLink>
        <NavLink to="/groups" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
          Groups
        </NavLink>
      </div>
      <div style={s.right}>
        <NotificationsBell />
        <span style={s.email}>{userEmail}</span>
        <button style={s.signOut} onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Notifications bell
// ---------------------------------------------------------------------------

function NotificationsBell() {
  const [notifs, setNotifs]   = useState([]);
  const [open, setOpen]       = useState(false);
  const dropRef               = useRef(null);

  async function load() {
    try {
      const data = await apiFetch("/notifications/");
      setNotifs(data);
    } catch {}
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifs.filter((n) => !n.is_read).length;

  async function markAllRead() {
    try {
      await apiFetch("/notifications/mark-all-read", { method: "POST" });
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  }

  async function markOne(id) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  }

  function fmtTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div style={{ position: "relative" }} ref={dropRef}>
      <button style={s.bellBtn} onClick={() => setOpen((v) => !v)} title="Notifications">
        <span style={s.bellIcon}>🔔</span>
        {unread > 0 && (
          <span style={s.bellBadge}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div style={s.dropdown}>
          <div style={s.dropHeader}>
            <span style={s.dropTitle}>Notifications</span>
            {unread > 0 && (
              <button style={s.markAllBtn} onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div style={s.dropList}>
            {notifs.length === 0 ? (
              <p style={s.dropEmpty}>No notifications yet.</p>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  style={{ ...s.dropItem, ...(n.is_read ? s.dropItemRead : {}) }}
                  onClick={() => !n.is_read && markOne(n.id)}
                >
                  {!n.is_read && <span style={s.unreadDot} />}
                  <div style={s.dropItemBody}>
                    <span style={s.dropItemMsg}>{n.message}</span>
                    <span style={s.dropItemDate}>{fmtTime(n.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = {
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    padding: "0 32px",
    height: "56px",
    borderBottom: "1px solid #e5e4e7",
    background: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  brand: {
    fontWeight: 700,
    fontSize: "16px",
    color: "#9b1b30",
    marginRight: "8px",
    whiteSpace: "nowrap",
  },
  links: {
    display: "flex",
    gap: "4px",
    flex: 1,
    flexWrap: "wrap",
  },
  link: {
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#6b6375",
    textDecoration: "none",
    transition: "background 0.15s",
    whiteSpace: "nowrap",
  },
  active: {
    background: "#f3f4f6",
    color: "#08060d",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  },
  email: {
    fontSize: "13px",
    color: "#6b6375",
  },
  signOut: {
    fontSize: "13px",
    padding: "5px 12px",
    borderRadius: "6px",
    border: "1px solid #e5e4e7",
    background: "transparent",
    cursor: "pointer",
    color: "#6b6375",
  },

  // ---- Bell ----
  bellBtn: {
    position: "relative",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  bellIcon: { fontSize: "18px", lineHeight: 1 },
  bellBadge: {
    position: "absolute",
    top: "-2px",
    right: "-4px",
    background: "#9b1b30",
    color: "#fff",
    fontSize: "10px",
    fontWeight: 700,
    borderRadius: "10px",
    minWidth: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 3px",
  },

  // ---- Dropdown ----
  dropdown: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: 0,
    width: "320px",
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 200,
    overflow: "hidden",
  },
  dropHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #f3f4f6",
  },
  dropTitle: { fontSize: "13px", fontWeight: 700, color: "#08060d" },
  markAllBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    color: "#9b1b30",
    fontWeight: 500,
  },
  dropList:  { maxHeight: "320px", overflowY: "auto" },
  dropEmpty: { padding: "20px 16px", margin: 0, fontSize: "13px", color: "#9ca3af", textAlign: "center" },
  dropItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "11px 16px",
    borderBottom: "1px solid #f9f9fb",
    cursor: "pointer",
  },
  dropItemRead: { opacity: 0.55, cursor: "default" },
  unreadDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#9b1b30",
    flexShrink: 0,
    marginTop: "4px",
  },
  dropItemBody: { display: "flex", flexDirection: "column", gap: "3px" },
  dropItemMsg:  { fontSize: "13px", color: "#08060d", lineHeight: 1.4 },
  dropItemDate: { fontSize: "11px", color: "#9ca3af" },
};
