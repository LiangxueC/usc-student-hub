import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import WidgetSkeleton from "./WidgetSkeleton";

function daysFromNow(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((due - now) / 86400000);
}

function urgencyStyle(days) {
  if (days <= 1) return { bg: "#fef2f2", color: "#dc2626", label: "Today/Tomorrow" };
  if (days <= 3) return { bg: "#fffbeb", color: "#d97706", label: `${days}d` };
  return { bg: "#eff6ff", color: "#2563eb", label: `${days}d` };
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function UpcomingDeadlinesWidget() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [assignments, todos] = await Promise.all([apiFetch("/assignments/"), apiFetch("/todos/")]);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const combined = [
        ...assignments
          .filter(a => !a.is_done && a.due_date)
          .map(a => ({ id: a.id, title: a.title, subtitle: a.class_name || "", due: a.due_date, type: "assignment" })),
        ...todos
          .filter(t => !t.is_done && t.due_date)
          .map(t => ({ id: t.id, title: t.title, subtitle: "Todo", due: t.due_date, type: "todo" })),
      ]
        .map(i => ({ ...i, days: daysFromNow(i.due) }))
        .filter(i => i.days >= 0)
        .sort((a, b) => a.days - b.days)
        .slice(0, 8);
      setItems(combined);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function markDone(item) {
    try {
      const path = item.type === "assignment" ? `/assignments/${item.id}` : `/todos/${item.id}`;
      await apiFetch(path, { method: "PATCH", body: JSON.stringify({ is_done: true }) });
      setItems(p => p.filter(i => i.id !== item.id || i.type !== item.type));
    } catch {}
  }

  if (loading) return <WidgetSkeleton rows={5} />;
  if (!items.length) return <p style={s.empty}>No upcoming deadlines 🎉</p>;

  return (
    <div style={s.list}>
      {items.map((item, i) => {
        const u = urgencyStyle(item.days);
        return (
          <div key={i} style={s.row}>
            <span style={{ ...s.pill, background: u.bg, color: u.color }}>{u.label}</span>
            <div style={s.info}>
              <span style={s.title}>{item.title}</span>
              {item.subtitle && <span style={s.sub}>{item.subtitle}</span>}
            </div>
            <span style={s.date}>{fmtDate(item.due)}</span>
            <button style={s.checkBtn} onClick={() => markDone(item)} title="Mark done">✓</button>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  list:  { display: "flex", flexDirection: "column", gap: "6px" },
  row:   { display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", borderBottom: "1px solid #f9f9fb" },
  pill:  { flexShrink: 0, padding: "2px 7px", borderRadius: "10px", fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap" },
  info:  { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  title: { fontSize: "12px", color: "#08060d", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sub:   { fontSize: "10px", color: "#9ca3af" },
  date:  { fontSize: "11px", color: "#9ca3af", flexShrink: 0 },
  checkBtn: { background: "none", border: "1px solid #e5e4e7", borderRadius: "4px", cursor: "pointer", fontSize: "11px", color: "#22c55e", padding: "1px 5px", flexShrink: 0 },
  empty: { margin: 0, fontSize: "13px", color: "#9ca3af" },
};
