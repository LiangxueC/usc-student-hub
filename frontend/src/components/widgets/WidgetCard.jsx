import { Link } from "react-router-dom";

export default function WidgetCard({ title, icon, navLink, size, dragListeners, onResize, children }) {
  return (
    <div style={s.card}>
      <div style={s.header}>
        <span style={s.drag} {...dragListeners} title="Drag to reorder">⠿</span>
        <span style={s.title}>{icon} {title}</span>
        <div style={s.headerRight}>
          <button style={s.resizeBtn} onClick={onResize} title={`Size: ${size} → cycle`}>⤡</button>
          <Link to={navLink} style={s.goLink}>Open →</Link>
        </div>
      </div>
      <div style={s.body}>{children}</div>
    </div>
  );
}

const s = {
  card: {
    height: "100%",
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 14px 8px",
    borderBottom: "1px solid #f3f4f6",
    flexShrink: 0,
  },
  drag: {
    fontSize: "16px",
    color: "#d1d5db",
    cursor: "grab",
    flexShrink: 0,
    userSelect: "none",
    lineHeight: 1,
  },
  title: {
    flex: 1,
    fontSize: "13px",
    fontWeight: 700,
    color: "#08060d",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  headerRight: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
  resizeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#9ca3af",
    padding: "0 2px",
    lineHeight: 1,
  },
  goLink: {
    fontSize: "11px",
    color: "#9D2235",
    textDecoration: "none",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "12px 14px",
    minHeight: 0,
  },
};
