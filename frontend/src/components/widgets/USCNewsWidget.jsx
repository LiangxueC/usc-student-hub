import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import WidgetSkeleton from "./WidgetSkeleton";

const SOURCE_COLOR = {
  "USC News":     "#9D2235",
  "Daily Trojan": "#1d4ed8",
  "BBC News":     "#854d0e",
};

export default function USCNewsWidget() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    apiFetch("/usc-news/")
      .then(d => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetSkeleton rows={6} />;
  if (error)   return <p style={s.empty}>News unavailable — check back later.</p>;

  const items = [...(data.usc_items || []), ...(data.world_items || [])].slice(0, 4);

  return (
    <div style={s.wrap}>
      {data.usc_tldr && (
        <div style={s.tldr}>
          <span style={s.tldrLabel}>TL;DR</span>
          <p style={s.tldrText}>{data.usc_tldr}</p>
        </div>
      )}
      <div style={s.list}>
        {items.map((item, i) => (
          <a key={i} href={item.url || "#"} target="_blank" rel="noopener noreferrer" style={s.row}>
            <div style={s.rowTop}>
              <span style={{ ...s.badge, color: SOURCE_COLOR[item.source] || "#6b7280" }}>{item.source}</span>
              <span style={s.date}>{item.date}</span>
            </div>
            <p style={s.headline}>{item.headline}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: "10px" },
  tldr: { background: "#fef2f2", borderLeft: "3px solid #9D2235", borderRadius: "6px", padding: "8px 10px" },
  tldrLabel: { fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", display: "block", marginBottom: "4px" },
  tldrText: { margin: 0, fontSize: "11px", color: "#08060d", lineHeight: 1.5 },
  list: { display: "flex", flexDirection: "column", gap: "6px" },
  row: { display: "flex", flexDirection: "column", gap: "2px", textDecoration: "none", padding: "6px 0", borderBottom: "1px solid #f9f9fb" },
  rowTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  badge: { fontSize: "10px", fontWeight: 700 },
  date: { fontSize: "10px", color: "#9ca3af" },
  headline: { margin: 0, fontSize: "12px", fontWeight: 500, color: "#08060d", lineHeight: 1.4 },
  empty: { margin: 0, fontSize: "13px", color: "#9ca3af" },
};
