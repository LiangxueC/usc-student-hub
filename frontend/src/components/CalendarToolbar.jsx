export default function CalendarToolbar({ date, view, onNavigate, onView, onAddEvent }) {
  const label = getLabel(date, view);

  return (
    <div style={s.bar}>
      {/* Left: navigation controls */}
      <div style={s.left}>
        <button style={s.btn} onClick={() => onNavigate("TODAY")}>Today</button>
        <button style={s.iconBtn} onClick={() => onNavigate("PREV")} aria-label="Previous">‹</button>
        <button style={s.iconBtn} onClick={() => onNavigate("NEXT")} aria-label="Next">›</button>
      </div>

      {/* Center: date range label */}
      <div style={s.center}>
        <span style={s.label}>{label}</span>
      </div>

      {/* Right: add-event button + view toggle */}
      <div style={s.right}>
        <button style={s.addBtn} onClick={onAddEvent}>
          + Add Event
        </button>
        <div style={s.viewGroup}>
          <button
            style={{ ...s.viewBtn, ...(view === "month" ? s.viewBtnActive : {}), borderRadius: "6px 0 0 6px" }}
            onClick={() => onView("month")}
          >
            Month
          </button>
          <button
            style={{ ...s.viewBtn, ...(view === "week" ? s.viewBtnActive : {}), borderRadius: "0 6px 6px 0", borderLeft: "none" }}
            onClick={() => onView("week")}
          >
            Week
          </button>
        </div>
      </div>
    </div>
  );
}

function getLabel(date, view) {
  if (view === "week") {
    const start = startOfWeek(date);
    const end   = endOfWeek(date);
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${fmtMonth(start)} ${start.getDate()} – ${end.getDate()}`;
    }
    return `${fmtMonth(start)} ${start.getDate()} – ${fmtMonth(end)} ${end.getDate()}`;
  }
  return `${fmtMonth(date)} ${date.getFullYear()}`;
}

function startOfWeek(d) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function endOfWeek(d) {
  const dt = startOfWeek(d);
  dt.setDate(dt.getDate() + 6);
  return dt;
}
function fmtMonth(d) {
  return d.toLocaleDateString("en-US", { month: "short" });
}

const s = {
  bar: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    borderBottom: "1px solid #f0f0f0",
    gap: "12px",
  },
  left:   { display: "flex", alignItems: "center", gap: "4px" },
  center: { flex: 1, textAlign: "center" },
  right:  { display: "flex", alignItems: "center", gap: "8px" },
  addBtn: {
    padding: "5px 14px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#fff",
    background: "#9D2235",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    lineHeight: "20px",
    whiteSpace: "nowrap",
  },

  btn: {
    padding: "4px 10px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#333",
    background: "transparent",
    border: "0.5px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    lineHeight: "20px",
  },
  iconBtn: {
    padding: "4px 9px",
    fontSize: "16px",
    lineHeight: "20px",
    color: "#555",
    background: "transparent",
    border: "0.5px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
  },
  label: {
    fontSize: "15px",
    fontWeight: 500,
    color: "#222",
  },
  viewGroup: { display: "flex" },
  viewBtn: {
    padding: "4px 12px",
    fontSize: "13px",
    fontWeight: 400,
    color: "#555",
    background: "transparent",
    border: "0.5px solid #ddd",
    cursor: "pointer",
    lineHeight: "20px",
  },
  viewBtnActive: {
    background: "#f0f0f0",
    fontWeight: 500,
    color: "#111",
  },
};
