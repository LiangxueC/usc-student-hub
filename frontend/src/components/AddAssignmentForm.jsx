import { useState } from "react";

const EMPTY = { title: "", class_id: "", category_id: "", due_date: "" };

export default function AddAssignmentForm({ classes, categories, onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function set(field) {
    return (e) => {
      const value = e.target.value;
      setForm((prev) => ({
        ...prev,
        [field]: value,
        // Reset category when class changes
        ...(field === "class_id" ? { category_id: "" } : {}),
      }));
    };
  }

  // Only show categories for the selected class
  const classCategories = form.class_id
    ? categories.filter((c) => c.class_id === form.class_id)
    : [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        title: form.title.trim(),
        class_id: form.class_id || null,
        category_id: form.category_id || null,
        due_date: form.due_date || null,
      });
      setForm(EMPTY);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button style={s.addBtn} onClick={() => setOpen(true)}>
        + Add Assignment
      </button>
    );
  }

  return (
    <form style={s.form} onSubmit={handleSubmit}>
      <div style={s.row}>
        <input
          style={s.input}
          placeholder="Assignment title *"
          value={form.title}
          onChange={set("title")}
          required
          autoFocus
        />
        <select style={s.input} value={form.class_id} onChange={set("class_id")}>
          <option value="">No class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div style={s.row}>
        <select
          style={s.input}
          value={form.category_id}
          onChange={set("category_id")}
          disabled={classCategories.length === 0}
        >
          <option value="">
            {classCategories.length === 0 ? "No categories (add via syllabus)" : "No category"}
          </option>
          {classCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.weight}%)
            </option>
          ))}
        </select>
        <input
          style={s.input}
          type="date"
          value={form.due_date}
          onChange={set("due_date")}
        />
      </div>
      <div style={s.actions}>
        <button type="submit" style={s.saveBtn} disabled={saving}>
          {saving ? "Saving…" : "Save Assignment"}
        </button>
        <button
          type="button"
          style={s.cancelBtn}
          onClick={() => { setOpen(false); setForm(EMPTY); }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const s = {
  addBtn: {
    padding: "8px 18px", borderRadius: "8px", border: "none",
    background: "#9b1b30", color: "#fff", fontWeight: 600,
    fontSize: "14px", cursor: "pointer", alignSelf: "flex-start",
  },
  form: {
    display: "flex", flexDirection: "column", gap: "10px",
    background: "#f9f9f9", border: "1px solid #e5e4e7",
    borderRadius: "10px", padding: "20px",
  },
  row: { display: "flex", gap: "10px", flexWrap: "wrap" },
  input: {
    flex: "1 1 200px", padding: "8px 12px", borderRadius: "7px",
    border: "1px solid #e5e4e7", fontSize: "14px", background: "#fff",
  },
  actions: { display: "flex", gap: "10px", marginTop: "4px" },
  saveBtn: {
    padding: "8px 18px", borderRadius: "7px", border: "none",
    background: "#9b1b30", color: "#fff", fontWeight: 600,
    fontSize: "14px", cursor: "pointer",
  },
  cancelBtn: {
    padding: "8px 18px", borderRadius: "7px", border: "1px solid #e5e4e7",
    background: "#fff", fontSize: "14px", cursor: "pointer", color: "#6b6375",
  },
};
