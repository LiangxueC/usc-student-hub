import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import WidgetSkeleton from "./WidgetSkeleton";

function isUrgent(due_date) {
  if (!due_date) return false;
  const diff = (new Date(due_date + "T23:59:59") - new Date()) / 86400000;
  return diff >= 0 && diff <= 2;
}

export default function GroupActivityWidget() {
  const [groups,  setGroups]  = useState([]);
  const [info,    setInfo]    = useState({}); // group_id → { lastMsg, urgentTodos }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const grps = await apiFetch("/groups/");
      setGroups(grps);
      const detail = {};
      await Promise.all(grps.slice(0, 5).map(async g => {
        try {
          const [msgs, todos] = await Promise.all([
            apiFetch(`/groups/${g.id}/messages`),
            apiFetch(`/groups/${g.id}/todos`),
          ]);
          detail[g.id] = {
            lastMsg: msgs[msgs.length - 1] ?? null,
            urgentTodos: todos.filter(t => !t.is_done && isUrgent(t.due_date)).length,
          };
        } catch { detail[g.id] = { lastMsg: null, urgentTodos: 0 }; }
      }));
      setInfo(detail);
    } catch {}
    setLoading(false);
  }

  if (loading) return <WidgetSkeleton rows={4} />;
  if (!groups.length) {
    return <p style={s.empty}>No groups yet — create one on the Groups page.</p>;
  }

  return (
    <div style={s.list}>
      {groups.slice(0, 5).map(g => {
        const d = info[g.id] || {};
        return (
          <div key={g.id} style={s.row}>
            <div style={s.dot}>{g.name[0].toUpperCase()}</div>
            <div style={s.info}>
              <div style={s.nameRow}>
                <span style={s.name}>{g.name}</span>
                {d.urgentTodos > 0 && (
                  <span style={s.urgentBadge}>{d.urgentTodos} due soon</span>
                )}
              </div>
              {d.lastMsg
                ? <span style={s.msg}>
                    <span style={s.sender}>{d.lastMsg.email?.split("@")[0] ?? "?"}: </span>
                    {d.lastMsg.content?.slice(0, 45)}{(d.lastMsg.content?.length || 0) > 45 ? "…" : ""}
                  </span>
                : <span style={s.noMsg}>No messages yet</span>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  row:  { display: "flex", alignItems: "flex-start", gap: "8px", padding: "4px 0", borderBottom: "1px solid #f9f9fb" },
  dot:  { width: 28, height: 28, borderRadius: "50%", background: "#9D2235", color: "#fff", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  info: { flex: 1, display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
  nameRow: { display: "flex", alignItems: "center", gap: "6px" },
  name: { fontSize: "12px", fontWeight: 600, color: "#08060d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  urgentBadge: { flexShrink: 0, fontSize: "10px", fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "1px 6px", borderRadius: "8px" },
  msg:    { fontSize: "11px", color: "#6b6375", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sender: { fontWeight: 600, color: "#08060d" },
  noMsg:  { fontSize: "11px", color: "#d1d5db", fontStyle: "italic" },
  empty:  { margin: 0, fontSize: "12px", color: "#9ca3af" },
};
