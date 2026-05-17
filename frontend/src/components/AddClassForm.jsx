import { useState } from "react";

const EMPTY = { name: "", location: "", meeting_times: "", semester: "" };

export default function AddClassForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onAdd(form);
      setForm(EMPTY);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button style={s.addBtn} onClick={() => setOpen(true)}>
        + Add Class
      </button>
    );
  }

  return (
    <form style={s.form} onSubmit={handleSubmit}>
      <div style={s.row}>
        <input
          style={s.input}
          placeholder="Class name *"
          value={form.name}
          onChange={set("name")}
          required
          autoFocus
        />
        <input
          style={s.input}
          placeholder="Location (e.g. SGM 123)"
          value={form.location}
          onChange={set("location")}
        />
      </div>
      <div style={s.row}>
        <input
          style={s.input}
          placeholder="Meeting times (e.g. Mon/Wed 2:00–3:20pm)"
          value={form.meeting_times}
          onChange={set("meeting_times")}
        />
        <input
          style={s.input}
          placeholder="Semester (e.g. Spring 2026)"
          value={form.semester}
          onChange={set("semester")}
        />
      </div>
      <div style={s.actions}>
        <button type="submit" style={s.saveBtn} disabled={saving}>
          {saving ? "Saving…" : "Save Class"}
        </button>
        <button type="button" style={s.cancelBtn} onClick={() => { setOpen(false); setForm(EMPTY); }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const s = {
  addBtn: {
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#f9f9f9",
    border: "1px solid #e5e4e7",
    borderRadius: "10px",
    padding: "20px",
  },
  row: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  input: {
    flex: "1 1 200px",
    padding: "8px 12px",
    borderRadius: "7px",
    border: "1px solid #e5e4e7",
    fontSize: "14px",
    outline: "none",
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "4px",
  },
  saveBtn: {
    padding: "8px 18px",
    borderRadius: "7px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "8px 18px",
    borderRadius: "7px",
    border: "1px solid #e5e4e7",
    background: "#fff",
    fontSize: "14px",
    cursor: "pointer",
    color: "#6b6375",
  },
};
