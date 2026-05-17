import { useState } from "react";

export default function AddTodoForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onAdd({ title: title.trim(), due_date: dueDate || null });
      setTitle("");
      setDueDate("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form style={s.form} onSubmit={handleSubmit}>
      <input
        style={s.titleInput}
        placeholder="Add a task…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        style={s.dateInput}
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        title="Due date (optional)"
      />
      <button type="submit" style={s.btn} disabled={saving || !title.trim()}>
        {saving ? "Adding…" : "Add"}
      </button>
    </form>
  );
}

const s = {
  form: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  titleInput: {
    flex: "1 1 260px",
    padding: "9px 14px",
    borderRadius: "8px",
    border: "1px solid #e5e4e7",
    fontSize: "14px",
  },
  dateInput: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #e5e4e7",
    fontSize: "14px",
    color: "#6b6375",
  },
  btn: {
    padding: "9px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
