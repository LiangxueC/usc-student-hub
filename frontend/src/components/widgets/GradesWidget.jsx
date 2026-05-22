import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import WidgetSkeleton from "./WidgetSkeleton";

function letterGrade(g) {
  if (g === null) return "—";
  if (g >= 93) return "A";  if (g >= 90) return "A−";
  if (g >= 87) return "B+"; if (g >= 83) return "B";
  if (g >= 80) return "B−"; if (g >= 77) return "C+";
  if (g >= 73) return "C";  if (g >= 70) return "C−";
  if (g >= 60) return "D";  return "F";
}

function letterColor(l) {
  if (!l || l === "—") return { bg: "#f3f4f6", color: "#6b7280" };
  if (l.startsWith("A")) return { bg: "#dcfce7", color: "#15803d" };
  if (l.startsWith("B")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (l.startsWith("C")) return { bg: "#fef3c7", color: "#b45309" };
  return { bg: "#fef2f2", color: "#dc2626" };
}

export default function GradesWidget() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch("/classes/"), apiFetch("/assignments/"), apiFetch("/grade-categories/")])
      .then(([classes, asgns, cats]) => {
        const result = classes.map(cls => {
          const clsAsgns = asgns.filter(a => a.class_id === cls.id);
          const graded   = clsAsgns.filter(a => a.is_done && a.grade !== null);
          const clsCats  = cats.filter(c => c.class_id === cls.id);
          let sum = 0, totalW = 0;
          for (const cat of clsCats) {
            const catA = graded.filter(a => a.category_id === cat.id);
            if (!catA.length) continue;
            const avg = catA.reduce((s, a) => s + a.grade, 0) / catA.length;
            sum += avg * (cat.weight / 100);
            totalW += cat.weight / 100;
          }
          const grade = totalW > 0 ? sum / totalW : null;
          return { id: cls.id, name: cls.name, grade, letter: letterGrade(grade), total: clsAsgns.length, graded: graded.length };
        }).filter(r => r.total > 0);
        setRows(result);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetSkeleton rows={4} />;
  if (!rows.length) return <p style={s.empty}>No classes with assignments yet.</p>;

  return (
    <div style={s.list}>
      {rows.map(r => {
        const lc = letterColor(r.letter);
        const pct = r.total > 0 ? Math.round(r.graded / r.total * 100) : 0;
        return (
          <div key={r.id} style={s.row}>
            <div style={s.info}>
              <span style={s.name}>{r.name}</span>
              <div style={s.barBg}>
                <div style={{ ...s.barFill, width: `${pct}%` }} />
              </div>
              <span style={s.sub}>{r.graded}/{r.total} graded</span>
            </div>
            <span style={{ ...s.badge, background: lc.bg, color: lc.color }}>{r.letter}</span>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  list:  { display: "flex", flexDirection: "column", gap: "10px" },
  row:   { display: "flex", alignItems: "center", gap: "10px" },
  info:  { flex: 1, display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 },
  name:  { fontSize: "12px", fontWeight: 600, color: "#08060d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  barBg: { height: "5px", background: "#f3f4f6", borderRadius: "3px", overflow: "hidden" },
  barFill: { height: "100%", background: "#9D2235", borderRadius: "3px" },
  sub:   { fontSize: "10px", color: "#9ca3af" },
  badge: { flexShrink: 0, padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 },
  empty: { margin: 0, fontSize: "13px", color: "#9ca3af" },
};
