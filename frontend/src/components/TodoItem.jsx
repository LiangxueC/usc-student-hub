export default function TodoItem({ todo, onToggle, onDelete }) {
  const { id, title, due_date, is_done } = todo;

  return (
    <div style={{ ...s.item, ...(is_done ? s.doneItem : {}) }}>
      <button
        style={{ ...s.check, ...(is_done ? s.checked : {}) }}
        onClick={() => onToggle(id, !is_done)}
        title={is_done ? "Mark incomplete" : "Mark complete"}
      >
        {is_done ? "✓" : ""}
      </button>

      <div style={s.content}>
        <span style={{ ...s.title, ...(is_done ? s.strike : {}) }}>{title}</span>
        {due_date && (
          <span style={s.date}>Due {fmtDate(due_date)}</span>
        )}
      </div>

      <button style={s.del} onClick={() => onDelete(id)} title="Delete">×</button>
    </div>
  );
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const s = {
  item: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "10px",
    transition: "opacity 0.2s",
  },
  doneItem: {
    opacity: 0.6,
    background: "#fafafa",
  },
  check: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "2px solid #d1d5db",
    background: "transparent",
    cursor: "pointer",
    flexShrink: 0,
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    padding: 0,
  },
  checked: {
    background: "#16a34a",
    borderColor: "#16a34a",
  },
  content: {
    flex: 1,
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
    flexWrap: "wrap",
    minWidth: 0,
  },
  title: {
    fontSize: "15px",
    color: "#08060d",
  },
  strike: {
    textDecoration: "line-through",
    color: "#9ca3af",
  },
  date: {
    fontSize: "12px",
    color: "#9ca3af",
  },
  del: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: 1,
    color: "#9ca3af",
    padding: "0 2px",
    flexShrink: 0,
  },
};
