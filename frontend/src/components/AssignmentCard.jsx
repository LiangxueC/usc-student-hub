import { useState } from "react";

export default function AssignmentCard({ assignment, onMarkDone, onMarkUndone, onDelete }) {
  const [showGrade, setShowGrade] = useState(false);
  const [gradeInput, setGradeInput] = useState("");
  const [saving, setSaving] = useState(false);

  const { id, title, due_date, grade, is_done, grade_categories } = assignment;
  const category = grade_categories?.name;

  async function handleConfirm() {
    if (gradeInput === "") return;
    setSaving(true);
    try {
      await onMarkDone(id, parseFloat(gradeInput));
      setShowGrade(false);
      setGradeInput("");
    } finally {
      setSaving(false);
    }
  }

  async function handleUndo() {
    setSaving(true);
    try {
      await onMarkUndone(id);
    } finally {
      setSaving(false);
    }
  }

  function openEditGrade() {
    setGradeInput(grade != null ? String(grade) : "");
    setShowGrade(true);
  }

  return (
    <div style={{ ...s.card, ...(is_done ? s.doneBg : {}) }}>
      <div style={s.row}>
        <div style={s.info}>
          <span style={{ ...s.title, ...(is_done ? s.strike : {}) }}>{title}</span>
          <div style={s.chips}>
            {category && <span style={s.categoryChip}>{category}</span>}
            {due_date && <span style={s.chip}>Due {fmtDate(due_date)}</span>}
            {is_done && grade != null && (
              <span style={{ ...s.chip, ...s.gradeChip }}>Grade: {grade}%</span>
            )}
          </div>
        </div>
        <div style={s.actions}>
          {!is_done && !showGrade && (
            <button style={s.doneBtn} onClick={() => setShowGrade(true)}>
              Mark Done
            </button>
          )}
          {is_done && !showGrade && (
            <>
              <button style={s.editBtn} onClick={openEditGrade} disabled={saving}>
                Edit Grade
              </button>
              <button style={s.undoBtn} onClick={handleUndo} disabled={saving}>
                Undo
              </button>
            </>
          )}
          <button style={s.delBtn} onClick={() => onDelete(id)} title="Delete">×</button>
        </div>
      </div>

      {showGrade && (
        <div style={s.gradeRow}>
          <input
            style={s.gradeInput}
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="Grade received (0–100)"
            value={gradeInput}
            onChange={(e) => setGradeInput(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          />
          <button style={s.confirmBtn} onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving…" : "Confirm"}
          </button>
          <button style={s.cancelBtn} onClick={() => { setShowGrade(false); setGradeInput(""); }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const s = {
  card: {
    background: "#fff", border: "1px solid #e5e4e7", borderRadius: "10px",
    padding: "14px 18px", display: "flex", flexDirection: "column", gap: "10px",
  },
  doneBg: { background: "#fafafa", opacity: 0.75 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },
  info: { display: "flex", flexDirection: "column", gap: "5px", flex: 1, minWidth: 0 },
  title: { fontSize: "15px", fontWeight: 600, color: "#08060d" },
  strike: { textDecoration: "line-through", color: "#9ca3af" },
  chips: { display: "flex", gap: "6px", flexWrap: "wrap" },
  chip: {
    fontSize: "12px", padding: "2px 8px", borderRadius: "20px",
    background: "#f3f4f6", color: "#6b6375",
  },
  categoryChip: {
    fontSize: "12px", padding: "2px 8px", borderRadius: "20px",
    background: "#fef3c7", color: "#b45309", fontWeight: 600,
  },
  gradeChip: { background: "#dcfce7", color: "#16a34a" },
  actions: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
  doneBtn: {
    padding: "5px 12px", borderRadius: "6px", border: "1px solid #e5e4e7",
    background: "#fff", fontSize: "13px", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap",
  },
  editBtn: {
    padding: "5px 10px", borderRadius: "6px", border: "1px solid #e5e4e7",
    background: "#fff", fontSize: "13px", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap",
  },
  undoBtn: {
    padding: "5px 10px", borderRadius: "6px", border: "1px solid #fca5a5",
    background: "#fff5f5", fontSize: "13px", cursor: "pointer", fontWeight: 500,
    color: "#dc2626", whiteSpace: "nowrap",
  },
  delBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "20px", lineHeight: 1, color: "#9ca3af", padding: "0 2px",
  },
  gradeRow: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  gradeInput: {
    padding: "6px 10px", borderRadius: "6px", border: "1px solid #e5e4e7",
    fontSize: "14px", width: "180px",
  },
  confirmBtn: {
    padding: "6px 14px", borderRadius: "6px", border: "none",
    background: "#9b1b30", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer",
  },
  cancelBtn: {
    padding: "6px 12px", borderRadius: "6px", border: "1px solid #e5e4e7",
    background: "#fff", fontSize: "13px", cursor: "pointer", color: "#6b6375",
  },
};
