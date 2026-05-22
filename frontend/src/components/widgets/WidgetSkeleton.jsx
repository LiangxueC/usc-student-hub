export default function WidgetSkeleton({ rows = 4 }) {
  const widths = ["90%", "70%", "80%", "65%", "75%", "60%"];
  return (
    <div style={s.wrap}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ ...s.line, width: widths[i % widths.length] }} />
      ))}
    </div>
  );
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: "10px", padding: "4px 0" },
  line: { height: "14px", background: "#f3f4f6", borderRadius: "6px", animation: "pulse 1.5s ease infinite" },
};
