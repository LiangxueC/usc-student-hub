import { useEffect, useRef, useState } from "react";

const POPUP_WIDTH = 300;

const PRESET_COLORS = [
  "#378ADD", "#1D9E75", "#639922", "#EF9F27",
  "#E24B4A", "#9D2235", "#D4537E", "#7F77DD",
  "#D85A30", "#888780", "#0F6E56", "#534AB7",
];

export default function EventPopup({ event, pos, onClose, onMarkDone, onColorChange, onDelete }) {
  const ref = useRef(null);
  const [showGrade, setShowGrade] = useState(false);
  const [gradeInput, setGradeInput] = useState("");
  const [saving, setSaving] = useState(false);

  const { type, resource } = event;

  // Flip popup to the left if it would go off-screen
  const left = pos.x + POPUP_WIDTH > window.innerWidth ? pos.x - POPUP_WIDTH - 16 : pos.x;
  const top  = Math.min(pos.y, window.innerHeight - 300);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleMarkDone() {
    if (gradeInput === "") return;
    setSaving(true);
    try {
      await onMarkDone(resource.id, parseFloat(gradeInput));
    } finally {
      setSaving(false);
    }
  }

  function openMaps() {
    const q = encodeURIComponent(`USC ${resource.location || ""}`);
    window.open(`https://maps.google.com/?q=${q}`, "_blank");
  }

  return (
    <>
      {/* Transparent backdrop — click to dismiss */}
      <div style={s.backdrop} onClick={onClose} />

      <div ref={ref} style={{ ...s.card, left, top }}>
        {/* Colour accent strip */}
        <div style={{ ...s.strip, background: event.color || "#6b7280" }} />

        <div style={s.body}>
          {/* Header */}
          <div style={s.header}>
            <span style={s.typeTag}>{LABELS[type] ?? type}</span>
            <button style={s.close} onClick={onClose}>✕</button>
          </div>

          {/* Title */}
          <p style={s.name}>
            {type === "class" ? resource.name
              : type === "office_hours" ? (resource.classes?.name ?? "Office Hours")
              : resource.title ?? resource.name}
          </p>

          {/* Class details */}
          {type === "class" && (
            <div style={s.details}>
              {resource.location    && <Row icon="📍" text={resource.location} />}
              {resource.meeting_times && <Row icon="🕐" text={resource.meeting_times} />}
              {resource.semester    && <Row icon="📅" text={resource.semester} />}
              <button style={s.mapsBtn} onClick={openMaps}>
                Open in Google Maps ↗
              </button>
            </div>
          )}

          {/* Assignment details */}
          {type === "assignment" && (
            <div style={s.details}>
              {resource.classes?.name && <Row icon="📚" text={resource.classes.name} />}
              {resource.due_date    && <Row icon="📅" text={`Due ${fmtDate(resource.due_date)}`} />}
              {resource.weight != null && <Row icon="⚖️" text={`${resource.weight}% weight`} />}
              {resource.is_done && resource.grade != null && (
                <Row icon="✓" text={`Grade: ${resource.grade}%`} green />
              )}

              {!resource.is_done && !showGrade && (
                <button style={s.actionBtn} onClick={() => setShowGrade(true)}>
                  Mark Done
                </button>
              )}
              {!resource.is_done && showGrade && (
                <div style={s.gradeRow}>
                  <input
                    style={s.gradeInput}
                    type="number" min="0" max="100" step="0.1"
                    placeholder="Grade (0–100)"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleMarkDone()}
                  />
                  <button style={s.confirmBtn} onClick={handleMarkDone} disabled={saving}>
                    {saving ? "…" : "Confirm"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Office hours details */}
          {type === "office_hours" && (
            <div style={s.details}>
              {resource.classes?.name && <Row icon="📚" text={resource.classes.name} />}
              <Row icon="🕐" text={`${resource.start_time} – ${resource.end_time}`} />
              {resource.day && <Row icon="📅" text={resource.day} />}
              {resource.location && <Row icon="📍" text={resource.location} />}
            </div>
          )}

          {/* Custom event details */}
          {type === "custom" && (
            <div style={s.details}>
              {resource.notes && <Row icon="📝" text={resource.notes} />}
              {onDelete && (
                <button style={s.deleteEventBtn} onClick={() => onDelete(resource.id)}>
                  Delete Event
                </button>
              )}
            </div>
          )}

          {/* Todo details */}
          {type === "todo" && (
            <div style={s.details}>
              {resource.due_date && <Row icon="📅" text={`Due ${fmtDate(resource.due_date)}`} />}
              {resource.is_done  && <Row icon="✓" text="Completed" green />}
            </div>
          )}

          {/* Color picker — shown whenever a color change handler is provided */}
          {onColorChange && event.eventKey && (
            <div style={s.colorSection}>
              <span style={s.colorLabel}>Color</span>
              <div style={s.swatchRow}>
                {PRESET_COLORS.map(hex => (
                  <button
                    key={hex}
                    title={hex}
                    onClick={() => onColorChange(event.eventKey, hex)}
                    style={{
                      ...s.swatch,
                      background: hex,
                      boxShadow: event.color === hex
                        ? `0 0 0 2px #fff, 0 0 0 3.5px ${hex}`
                        : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ icon, text, green }) {
  return (
    <div style={{ ...s.row, ...(green ? s.green : {}) }}>
      <span style={s.rowIcon}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const LABELS = { class: "Class", assignment: "Assignment", todo: "Todo", office_hours: "Office Hours", custom: "My Event" };

const s = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 299,
  },
  card: {
    position: "fixed",
    zIndex: 300,
    width: `${POPUP_WIDTH}px`,
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  strip: {
    height: "5px",
    flexShrink: 0,
  },
  body: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeTag: {
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#9b1b30",
  },
  close: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#9ca3af",
    lineHeight: 1,
    padding: "2px",
  },
  name: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#08060d",
    lineHeight: 1.3,
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    fontSize: "13px",
    color: "#6b6375",
  },
  green: {
    color: "#16a34a",
    fontWeight: 600,
  },
  rowIcon: {
    flexShrink: 0,
    width: "16px",
    textAlign: "center",
  },
  mapsBtn: {
    marginTop: "6px",
    padding: "7px 14px",
    borderRadius: "7px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  actionBtn: {
    marginTop: "4px",
    padding: "7px 14px",
    borderRadius: "7px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  gradeRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginTop: "4px",
  },
  gradeInput: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #e5e4e7",
    fontSize: "13px",
    width: "120px",
  },
  confirmBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
  deleteEventBtn: {
    marginTop: "2px",
    padding: "6px 14px",
    borderRadius: "7px",
    border: "1px solid #fee2e2",
    background: "#fff",
    color: "#dc2626",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  colorSection: {
    borderTop: "1px solid #f3f4f6",
    paddingTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  colorLabel: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#9ca3af",
  },
  swatchRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  swatch: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    transition: "transform 0.1s",
  },
};
