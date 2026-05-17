export default function ClassCard({ cls, onDelete }) {
  return (
    <div style={s.card}>
      <div style={s.header}>
        <strong style={s.name}>{cls.name}</strong>
        <button style={s.del} onClick={() => onDelete(cls.id)} title="Delete class">×</button>
      </div>
      {cls.location && <p style={s.detail}>📍 {cls.location}</p>}
      {cls.meeting_times && <p style={s.detail}>🕐 {cls.meeting_times}</p>}
      {cls.semester && <p style={s.detail}>📅 {cls.semester}</p>}
    </div>
  );
}

const s = {
  card: {
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "10px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: {
    fontSize: "17px",
    color: "#08060d",
  },
  del: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: 1,
    color: "#9ca3af",
    padding: "0 2px",
  },
  detail: {
    margin: 0,
    fontSize: "14px",
    color: "#6b6375",
  },
};
