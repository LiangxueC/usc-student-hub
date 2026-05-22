import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api/client";
import WidgetSkeleton from "./WidgetSkeleton";

const QUADRANTS = [
  { id: "Q1", label: "Do First",  color: "#dc2626", bg: "#fef2f2" },
  { id: "Q2", label: "Schedule",  color: "#2563eb", bg: "#eff6ff" },
  { id: "Q3", label: "Delegate",  color: "#d97706", bg: "#fffbeb" },
  { id: "Q4", label: "Eliminate", color: "#6b7280", bg: "#f9fafb" },
];

function daysFromNow(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((due - now) / 86400000);
}

function autoQ(type, days) {
  const urgent = days <= 2, important = type === "assignment";
  if (urgent && important)  return "Q1";
  if (!urgent && important) return "Q2";
  if (urgent)               return "Q3";
  return "Q4";
}

export default function PriorityMatrixWidget() {
  const [assignments, setAssignments] = useState([]);
  const [todos,       setTodos]       = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([apiFetch("/assignments/"), apiFetch("/todos/")])
      .then(([a, t]) => { setAssignments(a); setTodos(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byQ = useMemo(() => {
    const m = { Q1: [], Q2: [], Q3: [], Q4: [] };
    for (const a of assignments) {
      if (a.is_done) continue;
      const days = a.due_date ? daysFromNow(a.due_date) : null;
      if (days !== null && (days < 0 || days > 14)) continue;
      const q = days === null ? "Q2" : autoQ("assignment", days);
      m[q].push({ id: a.id, title: a.title, type: "assignment" });
    }
    for (const t of todos) {
      if (t.is_done) continue;
      const days = t.due_date ? daysFromNow(t.due_date) : null;
      if (days !== null && (days < 0 || days > 14)) continue;
      const q = days === null ? "Q4" : autoQ("todo", days);
      m[q].push({ id: t.id, title: t.title, type: "todo" });
    }
    return m;
  }, [assignments, todos]);

  async function markDone(item) {
    try {
      const path = item.type === "assignment" ? `/assignments/${item.id}` : `/todos/${item.id}`;
      await apiFetch(path, { method: "PATCH", body: JSON.stringify({ is_done: true }) });
      if (item.type === "assignment") setAssignments(p => p.map(a => a.id === item.id ? { ...a, is_done: true } : a));
      else setTodos(p => p.map(t => t.id === item.id ? { ...t, is_done: true } : t));
    } catch {}
  }

  if (loading) return <WidgetSkeleton rows={6} />;

  return (
    <div style={s.grid}>
      {QUADRANTS.map(q => {
        const items = byQ[q.id];
        return (
          <div key={q.id} style={{ ...s.quadrant, background: q.bg, borderColor: q.color + "40" }}>
            <p style={{ ...s.qLabel, color: q.color }}>{q.label}</p>
            {items.slice(0, 3).map(item => (
              <button key={item.id} style={s.item} onClick={() => markDone(item)} title="Click to mark done">
                <span style={s.itemDot} />
                <span style={s.itemTitle}>{item.title}</span>
              </button>
            ))}
            {items.length > 3 && (
              <span style={{ ...s.more, color: q.color }}>+{items.length - 3} more</span>
            )}
            {items.length === 0 && <span style={s.empty}>—</span>}
          </div>
        );
      })}
    </div>
  );
}

const s = {
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "8px", height: "100%" },
  quadrant: { borderRadius: "8px", padding: "8px", border: "1px solid", display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden" },
  qLabel: { margin: 0, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" },
  item: {
    display: "flex", alignItems: "flex-start", gap: "5px",
    background: "none", border: "none", cursor: "pointer", padding: "2px 0",
    textAlign: "left", width: "100%",
  },
  itemDot: { width: "5px", height: "5px", borderRadius: "50%", background: "#9ca3af", flexShrink: 0, marginTop: "5px" },
  itemTitle: { fontSize: "11px", color: "#08060d", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  more: { fontSize: "10px", fontWeight: 600 },
  empty: { fontSize: "11px", color: "#9ca3af" },
};
