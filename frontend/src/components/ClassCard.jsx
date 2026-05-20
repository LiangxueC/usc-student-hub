import { useState } from "react";

const EMPTY_OH = () => ({ day: "", start_time: "", end_time: "", location: "" });

export default function ClassCard({ cls, onDelete, onUpdate, officeHours, onAddOH, onDeleteOH }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const [addOHOpen, setAddOHOpen] = useState(false);
  const [newOH, setNewOH] = useState(EMPTY_OH());
  const [savingOH, setSavingOH] = useState(false);

  function startEdit() {
    setDraft({ name: cls.name, location: cls.location ?? "", meeting_times: cls.meeting_times ?? "", semester: cls.semester ?? "" });
    setEditing(true);
  }

  function setDraftField(field) {
    return (e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSave() {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await onUpdate(cls.id, draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function setOHField(field) {
    return (e) => setNewOH((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleAddOH() {
    if (!newOH.day.trim() || !newOH.start_time.trim() || !newOH.end_time.trim()) return;
    setSavingOH(true);
    try {
      await onAddOH(cls.id, {
        day: newOH.day.trim(),
        start_time: newOH.start_time.trim(),
        end_time: newOH.end_time.trim(),
        location: newOH.location.trim(),
      });
      setNewOH(EMPTY_OH());
      setAddOHOpen(false);
    } finally {
      setSavingOH(false);
    }
  }

  return (
    <div style={s.card}>
      {editing ? (
        /* ── Edit mode ── */
        <div style={s.editBody}>
          <input style={s.editInput} value={draft.name} onChange={setDraftField("name")} placeholder="Class name *" autoFocus />
          <input style={s.editInput} value={draft.location} onChange={setDraftField("location")} placeholder="Location (e.g. SGM 123)" />
          <input style={s.editInput} value={draft.meeting_times} onChange={setDraftField("meeting_times")} placeholder="Meeting times (e.g. Mon/Wed/Fri 10:00-10:50am)" />
          <input style={s.editInput} value={draft.semester} onChange={setDraftField("semester")} placeholder="Semester (e.g. Spring 2026)" />
          <div style={s.editActions}>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button style={s.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        /* ── View mode ── */
        <>
          <div style={s.header}>
            <strong style={s.name}>{cls.name}</strong>
            <div style={s.headerBtns}>
              <button style={s.editBtn} onClick={startEdit} title="Edit class">✎</button>
              <button style={s.del} onClick={() => onDelete(cls.id)} title="Delete class">×</button>
            </div>
          </div>
          {cls.location && <p style={s.detail}>📍 {cls.location}</p>}
          {cls.meeting_times && <p style={s.detail}>🕐 {cls.meeting_times}</p>}
          {cls.semester && <p style={s.detail}>📅 {cls.semester}</p>}
        </>
      )}

      {/* ── Office hours section (always visible) ── */}
      <div style={s.ohSection}>
        <p style={s.ohLabel}>Office Hours</p>

        {officeHours.length === 0 && !addOHOpen && (
          <p style={s.ohEmpty}>None</p>
        )}

        {officeHours.map((oh) => (
          <div key={oh.id} style={s.ohRow}>
            <span style={s.ohText}>
              {oh.day} · {oh.start_time}–{oh.end_time}
              {oh.location ? ` · ${oh.location}` : ""}
            </span>
            <button style={s.ohDel} onClick={() => onDeleteOH(oh.id)} title="Remove">×</button>
          </div>
        ))}

        {addOHOpen ? (
          <div style={s.addForm}>
            <div style={s.addRow}>
              <input style={s.miniInput} placeholder="Day (e.g. Monday)" value={newOH.day} onChange={setOHField("day")} autoFocus />
              <input style={s.miniInput} placeholder="Start (2:00 PM)" value={newOH.start_time} onChange={setOHField("start_time")} />
            </div>
            <div style={s.addRow}>
              <input style={s.miniInput} placeholder="End (3:00 PM)" value={newOH.end_time} onChange={setOHField("end_time")} />
              <input style={s.miniInput} placeholder="Location (optional)" value={newOH.location} onChange={setOHField("location")} />
            </div>
            <div style={s.addActions}>
              <button style={s.addSaveBtn} onClick={handleAddOH} disabled={savingOH}>
                {savingOH ? "…" : "Add"}
              </button>
              <button style={s.addCancelBtn} onClick={() => { setAddOHOpen(false); setNewOH(EMPTY_OH()); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button style={s.addTrigger} onClick={() => setAddOHOpen(true)}>
            + Add office hours
          </button>
        )}
      </div>
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
  headerBtns: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
    flexShrink: 0,
  },
  name: {
    fontSize: "17px",
    color: "#08060d",
  },
  editBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "15px",
    lineHeight: 1,
    color: "#9ca3af",
    padding: "0 3px",
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
  editBody: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  editInput: {
    padding: "7px 10px",
    borderRadius: "7px",
    border: "1px solid #e5e4e7",
    fontSize: "13px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  editActions: {
    display: "flex",
    gap: "8px",
    marginTop: "2px",
  },
  saveBtn: {
    padding: "6px 16px",
    borderRadius: "7px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "6px 12px",
    borderRadius: "7px",
    border: "1px solid #e5e4e7",
    background: "#fff",
    fontSize: "13px",
    cursor: "pointer",
    color: "#6b6375",
  },
  ohSection: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    borderTop: "1px solid #f3f4f6",
    paddingTop: "10px",
    marginTop: "4px",
  },
  ohLabel: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#9b1b30",
  },
  ohEmpty: {
    margin: 0,
    fontSize: "13px",
    color: "#9ca3af",
    fontStyle: "italic",
  },
  ohRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  ohText: {
    fontSize: "13px",
    color: "#374151",
  },
  ohDel: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    lineHeight: 1,
    color: "#d1d5db",
    padding: "0 2px",
    flexShrink: 0,
  },
  addTrigger: {
    alignSelf: "flex-start",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    color: "#9b1b30",
    fontWeight: 600,
    padding: 0,
  },
  addForm: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "2px",
  },
  addRow: {
    display: "flex",
    gap: "6px",
  },
  miniInput: {
    flex: 1,
    padding: "5px 8px",
    borderRadius: "6px",
    border: "1px solid #e5e4e7",
    fontSize: "12px",
    minWidth: 0,
  },
  addActions: {
    display: "flex",
    gap: "6px",
    marginTop: "2px",
  },
  addSaveBtn: {
    padding: "5px 14px",
    borderRadius: "6px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
  addCancelBtn: {
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid #e5e4e7",
    background: "#fff",
    fontSize: "12px",
    cursor: "pointer",
    color: "#6b6375",
  },
};
