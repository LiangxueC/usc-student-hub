import { useState } from "react";
import { apiFetch } from "../api/client";

// ─── Grade math ──────────────────────────────────────────────────────────────

function computeCategories(categories, assignments) {
  return categories.map((cat) => {
    const catAssignments = assignments.filter((a) => a.category_id === cat.id);
    const graded = catAssignments.filter((a) => a.is_done && a.grade != null);
    const avg = graded.length > 0
      ? graded.reduce((s, a) => s + a.grade, 0) / graded.length
      : null;
    return { ...cat, assignments: catAssignments, graded, avg };
  });
}

function finalGrade(catData) {
  const withGrades = catData.filter((c) => c.avg != null);
  if (!withGrades.length) return { current: null, projected: null };

  const gradedWeightSum = withGrades.reduce((s, c) => s + c.weight, 0);
  const current =
    withGrades.reduce((s, c) => s + (c.avg / 100) * c.weight, 0) / gradedWeightSum * 100;

  const totalWeight = catData.reduce((s, c) => s + c.weight, 0);
  const projected = totalWeight > 0
    ? catData.reduce((s, c) => s + ((c.avg ?? 100) / 100) * c.weight, 0) / totalWeight * 100
    : null;

  return { current, projected };
}

function letterGrade(pct) {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

function gradeColor(pct) {
  if (pct >= 90) return "#16a34a";
  if (pct >= 80) return "#2563eb";
  if (pct >= 70) return "#d97706";
  if (pct >= 60) return "#ea580c";
  return "#dc2626";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GradeCard({ cls, assignments, initialCategories }) {
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", weight: "" });
  const [addForm, setAddForm] = useState({ name: "", weight: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const catData = computeCategories(categories, assignments);
  const { current, projected } = finalGrade(catData);

  // Uncategorized assignments (no category_id or category not in list)
  const categorizedIds = new Set(categories.map((c) => c.id));
  const uncategorized = assignments.filter(
    (a) => !a.category_id || !categorizedIds.has(a.category_id)
  );

  // ── Category CRUD ──────────────────────────────────────────────────────────

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, weight: String(cat.weight) });
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const updated = await apiFetch(`/grade-categories/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editForm.name, weight: parseFloat(editForm.weight) }),
      });
      setCategories((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...updated } : c)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id) {
    await apiFetch(`/grade-categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function addCategory() {
    if (!addForm.name.trim() || !addForm.weight) return;
    setSaving(true);
    try {
      const created = await apiFetch("/grade-categories/", {
        method: "POST",
        body: JSON.stringify({
          class_id: cls.id,
          name: addForm.name.trim(),
          weight: parseFloat(addForm.weight),
        }),
      });
      setCategories((prev) => [...prev, created]);
      setAddForm({ name: "", weight: "" });
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h3 style={s.className}>{cls.name}</h3>
          {cls.semester && <span style={s.semester}>{cls.semester}</span>}
        </div>
        {current != null && (
          <div style={s.gradeBox}>
            <span style={{ ...s.gradePct, color: gradeColor(current) }}>
              {current.toFixed(1)}%
            </span>
            <span style={{ ...s.letterBadge, background: gradeColor(current) }}>
              {letterGrade(current)}
            </span>
          </div>
        )}
      </div>

      {/* Projected */}
      {projected != null && (
        <div style={s.projectedRow}>
          <span style={s.projectedLabel}>Projected final (100% on remaining)</span>
          <span style={{ ...s.projectedVal, color: gradeColor(projected) }}>
            {projected.toFixed(1)}% <strong>{letterGrade(projected)}</strong>
          </span>
        </div>
      )}

      {/* Per-category breakdown */}
      {catData.map((cat) => (
        <div key={cat.id} style={s.catBlock}>
          {/* Category header row */}
          <div style={s.catHeader}>
            {editingId === cat.id ? (
              <>
                <input
                  style={s.editInput}
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  style={{ ...s.editInput, width: "60px" }}
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.weight}
                  onChange={(e) => setEditForm((p) => ({ ...p, weight: e.target.value }))}
                />
                <span style={s.pctLabel}>%</span>
                <button style={s.saveBtn} onClick={saveEdit} disabled={saving}>Save</button>
                <button style={s.cancelBtn} onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span style={s.catName}>{cat.name}</span>
                <span style={s.catWeight}>{cat.weight}%</span>
                {cat.avg != null && (
                  <span style={{ ...s.catAvg, color: gradeColor(cat.avg) }}>
                    Avg: {cat.avg.toFixed(1)}%
                  </span>
                )}
                {cat.avg == null && cat.assignments.length > 0 && (
                  <span style={s.pendingLabel}>pending</span>
                )}
                {cat.assignments.length === 0 && (
                  <span style={s.pendingLabel}>no assignments</span>
                )}
                <div style={s.catActions}>
                  <button style={s.editBtn} onClick={() => startEdit(cat)}>Edit</button>
                  <button style={s.deleteBtn} onClick={() => deleteCategory(cat.id)}>Delete</button>
                </div>
              </>
            )}
          </div>

          {/* Assignments in this category */}
          {cat.assignments.length > 0 && (
            <table style={s.table}>
              <tbody>
                {cat.assignments.map((a) => {
                  const isDone = a.is_done && a.grade != null;
                  return (
                    <tr key={a.id} style={isDone ? {} : s.pendingRow}>
                      <td style={s.td}>{a.title}</td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        {isDone ? (
                          <span style={{ color: gradeColor(a.grade), fontWeight: 600 }}>
                            {a.grade}%
                          </span>
                        ) : (
                          <span style={s.pendingLabel}>pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <div style={s.catBlock}>
          <div style={s.catHeader}>
            <span style={{ ...s.catName, color: "#9ca3af" }}>Uncategorized</span>
            <span style={s.pendingLabel}>{uncategorized.length} assignment{uncategorized.length > 1 ? "s" : ""}</span>
          </div>
          <table style={s.table}>
            <tbody>
              {uncategorized.map((a) => (
                <tr key={a.id} style={s.pendingRow}>
                  <td style={s.td}>{a.title}</td>
                  <td style={{ ...s.td, textAlign: "right", color: "#9ca3af", fontSize: "12px" }}>
                    no category
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No categories yet */}
      {categories.length === 0 && uncategorized.length === 0 && (
        <p style={s.empty}>No assignments yet.</p>
      )}
      {categories.length === 0 && assignments.length > 0 && (
        <p style={s.empty}>
          No grade categories. Upload a syllabus or add categories below to start calculating.
        </p>
      )}

      {/* Add category */}
      {showAdd ? (
        <div style={s.addRow}>
          <input
            style={s.editInput}
            placeholder="Category name"
            value={addForm.name}
            onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
            autoFocus
          />
          <input
            style={{ ...s.editInput, width: "70px" }}
            type="number"
            min="0"
            max="100"
            placeholder="Weight %"
            value={addForm.weight}
            onChange={(e) => setAddForm((p) => ({ ...p, weight: e.target.value }))}
          />
          <button style={s.saveBtn} onClick={addCategory} disabled={saving}>Add</button>
          <button style={s.cancelBtn} onClick={() => { setShowAdd(false); setAddForm({ name: "", weight: "" }); }}>
            Cancel
          </button>
        </div>
      ) : (
        <button style={s.addCatBtn} onClick={() => setShowAdd(true)}>
          + Add Category
        </button>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  card: {
    background: "#fff", border: "1px solid #e5e4e7", borderRadius: "12px",
    padding: "24px", display: "flex", flexDirection: "column", gap: "16px",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" },
  className: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#08060d" },
  semester: { fontSize: "13px", color: "#9ca3af", marginTop: "2px", display: "block" },
  gradeBox: { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 },
  gradePct: { fontSize: "28px", fontWeight: 800, lineHeight: 1 },
  letterBadge: { fontSize: "15px", fontWeight: 800, color: "#fff", padding: "3px 10px", borderRadius: "6px" },
  projectedRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#f9f9f9", borderRadius: "8px", padding: "10px 14px", fontSize: "14px",
  },
  projectedLabel: { color: "#6b6375" },
  projectedVal: { fontWeight: 600 },
  catBlock: {
    border: "1px solid #f3f4f6", borderRadius: "8px",
    overflow: "hidden", display: "flex", flexDirection: "column",
  },
  catHeader: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 14px", background: "#fafafa", flexWrap: "wrap",
  },
  catName: { fontWeight: 700, fontSize: "14px", color: "#08060d", flex: 1 },
  catWeight: { fontSize: "13px", color: "#6b6375", fontWeight: 600 },
  catAvg: { fontSize: "13px", fontWeight: 700, marginLeft: "4px" },
  catActions: { display: "flex", gap: "6px", marginLeft: "auto" },
  editBtn: {
    padding: "3px 10px", borderRadius: "5px", border: "1px solid #e5e4e7",
    background: "#fff", fontSize: "12px", cursor: "pointer", color: "#374151",
  },
  deleteBtn: {
    padding: "3px 10px", borderRadius: "5px", border: "1px solid #fee2e2",
    background: "#fff", fontSize: "12px", cursor: "pointer", color: "#dc2626",
  },
  editInput: {
    padding: "4px 8px", border: "1px solid #e5e4e7", borderRadius: "5px",
    fontSize: "13px", flex: 1, minWidth: "80px",
  },
  pctLabel: { fontSize: "13px", color: "#6b6375" },
  saveBtn: {
    padding: "4px 12px", borderRadius: "5px", border: "none",
    background: "#9b1b30", color: "#fff", fontSize: "12px",
    fontWeight: 600, cursor: "pointer",
  },
  cancelBtn: {
    padding: "4px 10px", borderRadius: "5px", border: "1px solid #e5e4e7",
    background: "#fff", fontSize: "12px", cursor: "pointer", color: "#6b6375",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  td: { padding: "8px 14px", borderBottom: "1px solid #f3f4f6", color: "#374151" },
  pendingRow: { opacity: 0.5 },
  pendingLabel: { fontSize: "12px", color: "#9ca3af", fontStyle: "italic" },
  addRow: {
    display: "flex", gap: "8px", alignItems: "center",
    padding: "10px", background: "#f9f9f9", borderRadius: "8px", flexWrap: "wrap",
  },
  addCatBtn: {
    alignSelf: "flex-start", padding: "6px 14px", borderRadius: "7px",
    border: "1px dashed #e5e4e7", background: "transparent",
    fontSize: "13px", cursor: "pointer", color: "#6b6375",
  },
  empty: { margin: 0, fontSize: "14px", color: "#9ca3af", fontStyle: "italic" },
};
