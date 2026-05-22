import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import WidgetSkeleton from "./WidgetSkeleton";

function CircleProgress({ pct, size = 110, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="#9D2235" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize="18" fontWeight="800" fill="#08060d">{pct}%</text>
    </svg>
  );
}

export default function DegreeProgressWidget() {
  const [audit,   setAudit]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    apiFetch("/degree/audit")
      .then(d => {
        if (!d.exists) { setMissing(true); return; }
        setAudit(d.parsed_json);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetSkeleton rows={5} />;
  if (missing) {
    return <p style={s.empty}>No degree audit uploaded yet.<br />Visit the Degree page to get started.</p>;
  }

  const st = audit.student || {};
  const completed = st.total_units_completed || 0;
  const required  = st.total_units_required  || 128;
  const pct = Math.round(completed / required * 100);

  // Category breakdown from requirements[]
  const topCats = (audit.requirements || []).slice(0, 4).map(cat => ({
    name: cat.category,
    done: cat.units_completed || 0,
    total: cat.units_required || 1,
  }));

  return (
    <div style={s.wrap}>
      <div style={s.top}>
        <CircleProgress pct={pct} />
        <div style={s.stats}>
          <p style={s.stat}><strong>{completed}</strong> / {required} units</p>
          {st.overall_gpa && <p style={s.gpa}>{st.overall_gpa?.toFixed(2)} GPA</p>}
          {st.major && <p style={s.sub}>{st.major}</p>}
        </div>
      </div>
      {topCats.length > 0 && (
        <div style={s.cats}>
          {topCats.map((cat, i) => {
            const p = cat.total > 0 ? Math.min(100, Math.round(cat.done / cat.total * 100)) : 0;
            return (
              <div key={i} style={s.catRow}>
                <span style={s.catName}>{cat.name}</span>
                <div style={s.barBg}><div style={{ ...s.barFill, width: `${p}%` }} /></div>
                <span style={s.catPct}>{p}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: "12px" },
  top:  { display: "flex", alignItems: "center", gap: "16px" },
  stats: { display: "flex", flexDirection: "column", gap: "4px" },
  stat: { margin: 0, fontSize: "13px", color: "#08060d" },
  gpa:  { margin: 0, fontSize: "20px", fontWeight: 800, color: "#9D2235" },
  sub:  { margin: 0, fontSize: "11px", color: "#9ca3af" },
  cats: { display: "flex", flexDirection: "column", gap: "6px" },
  catRow: { display: "flex", alignItems: "center", gap: "8px" },
  catName: { fontSize: "11px", color: "#6b6375", width: "100px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  barBg:  { flex: 1, height: "5px", background: "#f3f4f6", borderRadius: "3px", overflow: "hidden" },
  barFill: { height: "100%", background: "#9D2235", borderRadius: "3px" },
  catPct: { fontSize: "10px", color: "#9ca3af", width: "28px", textAlign: "right", flexShrink: 0 },
  empty: { margin: 0, fontSize: "12px", color: "#9ca3af", lineHeight: 1.6 },
};
