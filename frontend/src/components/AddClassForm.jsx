import { useState } from "react";

const EMPTY_FORM = { name: "", location: "", meeting_times: "", semester: "" };
const EMPTY_OH = () => ({ _key: Math.random(), day: "", start_time: "", end_time: "", location: "" });

export default function AddClassForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [ohs, setOhs] = useState([]);
  const [ohsOpen, setOhsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function updateOH(key, field, value) {
    setOhs((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }

  function addOHRow() {
    setOhs((prev) => [...prev, EMPTY_OH()]);
    setOhsOpen(true);
  }

  function removeOHRow(key) {
    setOhs((prev) => prev.filter((r) => r._key !== key));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onAdd(form, ohs);
      setForm(EMPTY_FORM);
      setOhs([]);
      setOhsOpen(false);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    setForm(EMPTY_FORM);
    setOhs([]);
    setOhsOpen(false);
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
          placeholder="Meeting times (e.g. Mon/Wed/Fri 10:00-10:50am)"
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

      {/* Office hours section */}
      <div style={s.ohSection}>
        <div style={s.ohHeader}>
          <span style={s.ohLabel}>Office Hours</span>
          <button type="button" style={s.addRowBtn} onClick={addOHRow}>
            + Add row
          </button>
        </div>

        {ohs.length > 0 && (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Day</th>
                <th style={s.th}>Start</th>
                <th style={s.th}>End</th>
                <th style={s.th}>Location</th>
                <th style={{ ...s.th, width: "28px" }} />
              </tr>
            </thead>
            <tbody>
              {ohs.map((oh) => (
                <tr key={oh._key}>
                  <td style={s.td}>
                    <input style={s.cellInput} value={oh.day} onChange={(e) => updateOH(oh._key, "day", e.target.value)} placeholder="Monday" />
                  </td>
                  <td style={s.td}>
                    <input style={s.cellInput} value={oh.start_time} onChange={(e) => updateOH(oh._key, "start_time", e.target.value)} placeholder="2:00 PM" />
                  </td>
                  <td style={s.td}>
                    <input style={s.cellInput} value={oh.end_time} onChange={(e) => updateOH(oh._key, "end_time", e.target.value)} placeholder="3:00 PM" />
                  </td>
                  <td style={s.td}>
                    <input style={s.cellInput} value={oh.location} onChange={(e) => updateOH(oh._key, "location", e.target.value)} placeholder="SAL 213" />
                  </td>
                  <td style={s.td}>
                    <button type="button" style={s.removeBtn} onClick={() => removeOHRow(oh._key)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={s.actions}>
        <button type="submit" style={s.saveBtn} disabled={saving}>
          {saving ? "Saving…" : "Save Class"}
        </button>
        <button type="button" style={s.cancelBtn} onClick={handleCancel}>
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
  ohSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    borderTop: "1px solid #e5e4e7",
    paddingTop: "10px",
    marginTop: "2px",
  },
  ohHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ohLabel: {
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#9b1b30",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "5px 6px",
    background: "#f3f4f6",
    color: "#6b6375",
    fontWeight: 600,
    borderBottom: "1px solid #e5e4e7",
    fontSize: "12px",
  },
  td: {
    padding: "4px 4px",
    borderBottom: "1px solid #f3f4f6",
  },
  cellInput: {
    padding: "4px 7px",
    border: "1px solid #e5e4e7",
    borderRadius: "5px",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
  },
  addRowBtn: {
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px dashed #e5e4e7",
    background: "transparent",
    fontSize: "12px",
    cursor: "pointer",
    color: "#6b6375",
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "#9ca3af",
    lineHeight: 1,
    padding: "0 2px",
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
