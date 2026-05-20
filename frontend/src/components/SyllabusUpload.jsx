import { useRef, useState } from "react";
import { apiFetch, uploadSyllabus } from "../api/client";

export default function SyllabusUpload({ onClassSaved }) {
  const fileRef = useRef(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    setError(null);
    setPreview(null);
    try {
      const data = await uploadSyllabus(file);
      // Convert grade_weights into editable local state rows
      setPreview({
        ...data,
        grade_weights: (data.grade_weights ?? []).map((g) => ({
          ...g,
          _key: Math.random(),
        })),
        office_hours: (data.office_hours ?? []).map((oh) => ({
          ...oh,
          _key: Math.random(),
        })),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm(editedPreview) {
    setSaving(true);
    setError(null);
    try {
      // 1. Create class
      const cls = await apiFetch("/classes/", {
        method: "POST",
        body: JSON.stringify({
          name: editedPreview.class_name,
          location: editedPreview.location,
          meeting_times: editedPreview.meeting_times,
          semester: editedPreview.semester,
        }),
      });

      // 2. Create grade categories and build name → id map
      const categoryMap = {};
      for (const gw of editedPreview.grade_weights) {
        if (!gw.category?.trim() || gw.weight == null) continue;
        const created = await apiFetch("/grade-categories/", {
          method: "POST",
          body: JSON.stringify({
            class_id: cls.id,
            name: gw.category.trim(),
            weight: parseFloat(gw.weight),
          }),
        });
        categoryMap[gw.category.trim().toLowerCase()] = created.id;
      }

      // 3. Create assignments, linking by category name
      for (const a of editedPreview.assignments ?? []) {
        const categoryKey = a.category?.trim().toLowerCase();
        const category_id = categoryKey ? (categoryMap[categoryKey] ?? null) : null;
        await apiFetch("/assignments/", {
          method: "POST",
          body: JSON.stringify({
            title: a.title,
            class_id: cls.id,
            category_id,
            due_date: a.due_date ?? null,
          }),
        });
      }

      // 4. Create office hours
      for (const oh of editedPreview.office_hours ?? []) {
        if (!oh.day?.trim() || !oh.start_time?.trim() || !oh.end_time?.trim()) continue;
        await apiFetch("/office-hours/", {
          method: "POST",
          body: JSON.stringify({
            class_id: cls.id,
            day: oh.day.trim(),
            start_time: oh.start_time.trim(),
            end_time: oh.end_time.trim(),
            location: oh.location?.trim() ?? "",
          }),
        });
      }

      onClassSaved(cls);
      setPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button
        style={s.uploadBtn}
        onClick={() => fileRef.current.click()}
        disabled={parsing}
      >
        {parsing ? <><Spinner /> Parsing…</> : "Upload Syllabus (PDF)"}
      </button>

      {error && <p style={s.error}>{error}</p>}

      {preview && (
        <PreviewModal
          initialData={preview}
          saving={saving}
          onConfirm={handleConfirm}
          onDiscard={() => setPreview(null)}
          error={error}
        />
      )}
    </>
  );
}

function PreviewModal({ initialData, saving, onConfirm, onDiscard, error }) {
  const [data, setData] = useState(initialData);

  function updateWeight(key, field, value) {
    setData((prev) => ({
      ...prev,
      grade_weights: prev.grade_weights.map((g) =>
        g._key === key ? { ...g, [field]: value } : g
      ),
    }));
  }

  function addWeight() {
    setData((prev) => ({
      ...prev,
      grade_weights: [...prev.grade_weights, { _key: Math.random(), category: "", weight: "" }],
    }));
  }

  function removeWeight(key) {
    setData((prev) => ({
      ...prev,
      grade_weights: prev.grade_weights.filter((g) => g._key !== key),
    }));
  }

  function updateOH(key, field, value) {
    setData((prev) => ({
      ...prev,
      office_hours: (prev.office_hours ?? []).map((oh) =>
        oh._key === key ? { ...oh, [field]: value } : oh
      ),
    }));
  }

  function addOH() {
    setData((prev) => ({
      ...prev,
      office_hours: [...(prev.office_hours ?? []), { _key: Math.random(), day: "", start_time: "", end_time: "", location: "" }],
    }));
  }

  function removeOH(key) {
    setData((prev) => ({
      ...prev,
      office_hours: (prev.office_hours ?? []).filter((oh) => oh._key !== key),
    }));
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h3 style={s.modalTitle}>Syllabus Preview</h3>
        <p style={s.modalSub}>Review and edit the extracted data before saving.</p>

        <Section label="Class Info">
          <InfoRow label="Name" value={data.class_name} />
          <InfoRow label="Location" value={data.location} />
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Meeting Times</span>
            <input
              style={{ ...s.cellInput, flex: 1 }}
              value={data.meeting_times ?? ""}
              onChange={(e) => setData((prev) => ({ ...prev, meeting_times: e.target.value }))}
              placeholder="e.g. Mon/Wed/Fri 10:00-10:50am or Tue/Thu 2:00-3:20pm"
            />
          </div>
          <InfoRow label="Semester" value={data.semester} />
        </Section>

        {/* Editable grade categories */}
        <Section label="Grade Categories (editable)">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Category</th>
                <th style={{ ...s.th, width: "80px" }}>Weight %</th>
                <th style={{ ...s.th, width: "36px" }} />
              </tr>
            </thead>
            <tbody>
              {data.grade_weights.map((g) => (
                <tr key={g._key}>
                  <td style={s.td}>
                    <input
                      style={s.cellInput}
                      value={g.category}
                      onChange={(e) => updateWeight(g._key, "category", e.target.value)}
                      placeholder="Category name"
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={{ ...s.cellInput, width: "60px" }}
                      type="number"
                      min="0"
                      max="100"
                      value={g.weight}
                      onChange={(e) => updateWeight(g._key, "weight", e.target.value)}
                    />
                  </td>
                  <td style={s.td}>
                    <button style={s.removeBtn} onClick={() => removeWeight(g._key)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button style={s.addRowBtn} onClick={addWeight}>+ Add row</button>
        </Section>

        {/* Assignments read-only preview */}
        {data.assignments?.length > 0 && (
          <Section label={`Assignments (${data.assignments.length})`}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Title</th>
                  <th style={s.th}>Due Date</th>
                  <th style={s.th}>Category</th>
                </tr>
              </thead>
              <tbody>
                {data.assignments.map((a, i) => (
                  <tr key={i}>
                    <td style={s.td}>{a.title}</td>
                    <td style={s.td}>{a.due_date ?? "—"}</td>
                    <td style={s.td}>{a.category ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Editable office hours */}
        <Section label="Office Hours (editable)">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Day</th>
                <th style={s.th}>Start</th>
                <th style={s.th}>End</th>
                <th style={s.th}>Location</th>
                <th style={{ ...s.th, width: "36px" }} />
              </tr>
            </thead>
            <tbody>
              {(data.office_hours ?? []).map((oh) => (
                <tr key={oh._key}>
                  <td style={s.td}>
                    <input
                      style={s.cellInput}
                      value={oh.day}
                      onChange={(e) => updateOH(oh._key, "day", e.target.value)}
                      placeholder="Monday"
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={s.cellInput}
                      value={oh.start_time}
                      onChange={(e) => updateOH(oh._key, "start_time", e.target.value)}
                      placeholder="2:00 PM"
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={s.cellInput}
                      value={oh.end_time}
                      onChange={(e) => updateOH(oh._key, "end_time", e.target.value)}
                      placeholder="3:00 PM"
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={s.cellInput}
                      value={oh.location ?? ""}
                      onChange={(e) => updateOH(oh._key, "location", e.target.value)}
                      placeholder="e.g. SAL 213"
                    />
                  </td>
                  <td style={s.td}>
                    <button style={s.removeBtn} onClick={() => removeOH(oh._key)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button style={s.addRowBtn} onClick={addOH}>+ Add row</button>
        </Section>

        {error && <p style={s.error}>{error}</p>}

        <div style={s.modalActions}>
          <button style={s.confirmBtn} onClick={() => onConfirm(data)} disabled={saving}>
            {saving ? "Saving…" : "Confirm & Save"}
          </button>
          <button style={s.discardBtn} onClick={onDiscard} disabled={saving}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={s.section}>
      <p style={s.sectionLabel}>{label}</p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoValue}>{value ?? <em style={{ color: "#9ca3af" }}>not found</em>}</span>
    </div>
  );
}

function Spinner() {
  return <span style={s.spinner} />;
}

const s = {
  uploadBtn: {
    padding: "8px 18px", borderRadius: "8px", border: "1px dashed #9b1b30",
    background: "transparent", color: "#9b1b30", fontWeight: 600, fontSize: "14px",
    cursor: "pointer", alignSelf: "flex-start", display: "inline-flex",
    alignItems: "center", gap: "8px",
  },
  spinner: {
    display: "inline-block", width: "14px", height: "14px",
    border: "2px solid #f3f4f6", borderTop: "2px solid #9b1b30",
    borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },
  error: { color: "#dc2626", fontSize: "13px", margin: 0 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: "20px",
  },
  modal: {
    background: "#fff", borderRadius: "14px", padding: "32px",
    maxWidth: "640px", width: "100%", maxHeight: "88vh", overflowY: "auto",
    display: "flex", flexDirection: "column", gap: "20px",
  },
  modalTitle: { margin: 0, fontSize: "20px", fontWeight: 700, color: "#08060d" },
  modalSub: { margin: "-12px 0 0", fontSize: "14px", color: "#6b6375" },
  section: { display: "flex", flexDirection: "column", gap: "8px" },
  sectionLabel: {
    margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#9b1b30",
  },
  infoRow: { display: "flex", gap: "12px", fontSize: "14px" },
  infoLabel: { width: "110px", flexShrink: 0, color: "#6b6375", fontWeight: 500 },
  infoValue: { color: "#08060d" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: {
    textAlign: "left", padding: "6px 8px", background: "#f9f9f9",
    color: "#6b6375", fontWeight: 600, borderBottom: "1px solid #e5e4e7",
  },
  td: { padding: "5px 8px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  cellInput: {
    padding: "4px 8px", border: "1px solid #e5e4e7", borderRadius: "5px",
    fontSize: "13px", width: "100%", boxSizing: "border-box",
  },
  removeBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "18px", color: "#9ca3af", lineHeight: 1,
  },
  addRowBtn: {
    marginTop: "6px", padding: "5px 12px", borderRadius: "6px",
    border: "1px dashed #e5e4e7", background: "transparent",
    fontSize: "13px", cursor: "pointer", color: "#6b6375",
  },
  modalActions: { display: "flex", gap: "10px", marginTop: "4px" },
  confirmBtn: {
    padding: "10px 22px", borderRadius: "8px", border: "none",
    background: "#9b1b30", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer",
  },
  discardBtn: {
    padding: "10px 18px", borderRadius: "8px", border: "1px solid #e5e4e7",
    background: "#fff", fontSize: "14px", cursor: "pointer", color: "#6b6375",
  },
};
