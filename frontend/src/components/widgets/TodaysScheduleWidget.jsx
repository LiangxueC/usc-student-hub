import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { PALETTE, parseMeetingTimesStr } from "../../utils/calendarUtils";
import WidgetSkeleton from "./WidgetSkeleton";

function fmt12(h, m) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function TodaysScheduleWidget() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [classes, ohList] = await Promise.all([apiFetch("/classes/"), apiFetch("/office-hours/")]);
      const today = new Date().getDay(); // 0=Sun
      const todayName = DAY_NAMES[today];
      const result = [];

      classes.forEach((cls, idx) => {
        if (!cls.meeting_times) return;
        try {
          const p = parseMeetingTimesStr(cls.meeting_times);
          if (!p || !p.days.includes(today)) return;
          result.push({
            name: cls.name,
            startHour: p.startHour, startMin: p.startMin,
            endHour: p.endHour, endMin: p.endMin,
            color: PALETTE[idx % PALETTE.length],
            type: "class",
          });
        } catch {}
      });

      ohList.forEach(oh => {
        if (oh.day !== todayName) return;
        const parseT = s => { const [h, m] = s.split(":").map(Number); return { h, m }; };
        try {
          const st = parseT(oh.start_time || "0:0");
          const et = parseT(oh.end_time || "0:0");
          result.push({
            name: "Office Hours",
            startHour: st.h, startMin: st.m,
            endHour: et.h, endMin: et.m,
            color: { bg: "#f3f4f6", border: "#6b7280", text: "#374151" },
            type: "oh",
          });
        } catch {}
      });

      result.sort((a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin));
      setItems(result);
    } catch {}
    setLoading(false);
  }

  if (loading) return <WidgetSkeleton rows={4} />;
  if (!items.length) return <p style={s.empty}>No classes today 🎉</p>;

  return (
    <div style={s.list}>
      {items.map((item, i) => (
        <div key={i} style={s.row}>
          <div style={s.timeCol}>
            <span style={s.time}>{fmt12(item.startHour, item.startMin)}</span>
            <span style={s.timeSep}>↓</span>
            <span style={s.time}>{fmt12(item.endHour, item.endMin)}</span>
          </div>
          <div style={{ ...s.bar, background: item.color.border }} />
          <div style={{ ...s.info, background: item.color.bg, borderColor: item.color.border }}>
            <span style={{ ...s.name, color: item.color.text }}>{item.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const s = {
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  row:  { display: "flex", alignItems: "stretch", gap: "8px" },
  timeCol: { display: "flex", flexDirection: "column", alignItems: "flex-end", width: "60px", flexShrink: 0, gap: "1px" },
  time:    { fontSize: "10px", color: "#9ca3af", whiteSpace: "nowrap" },
  timeSep: { fontSize: "9px", color: "#d1d5db" },
  bar:  { width: "3px", borderRadius: "2px", flexShrink: 0 },
  info: { flex: 1, borderRadius: "6px", padding: "6px 8px", border: "1px solid", overflow: "hidden" },
  name: { fontSize: "12px", fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  empty: { margin: 0, fontSize: "13px", color: "#9ca3af" },
};
