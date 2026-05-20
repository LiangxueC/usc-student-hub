import { NavLink } from "react-router-dom";
import { supabase } from "../api/supabase";

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
      </div>
      <div style={s.right}>
        <span style={s.email}>{userEmail}</span>
        <button style={s.signOut} onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

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
  },
  link: {
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#6b6375",
    textDecoration: "none",
    transition: "background 0.15s",
  },
  active: {
    background: "#f3f4f6",
    color: "#08060d",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
};
