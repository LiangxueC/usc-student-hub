import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import AddClassForm from "../components/AddClassForm";
import ClassCard from "../components/ClassCard";
import SyllabusUpload from "../components/SyllabusUpload";

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [officeHours, setOfficeHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [cls, ohs] = await Promise.all([
        apiFetch("/classes/"),
        apiFetch("/office-hours/"),
      ]);
      setClasses(cls);
      setOfficeHours(ohs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(form, ohs = []) {
    const created = await apiFetch("/classes/", {
      method: "POST",
      body: JSON.stringify(form),
    });
    const savedOHs = [];
    for (const oh of ohs) {
      if (!oh.day?.trim() || !oh.start_time?.trim() || !oh.end_time?.trim()) continue;
      const saved = await apiFetch("/office-hours/", {
        method: "POST",
        body: JSON.stringify({
          class_id: created.id,
          day: oh.day.trim(),
          start_time: oh.start_time.trim(),
          end_time: oh.end_time.trim(),
          location: oh.location?.trim() ?? "",
        }),
      });
      savedOHs.push(saved);
    }
    setClasses((prev) => [created, ...prev]);
    setOfficeHours((prev) => [...prev, ...savedOHs]);
  }

  async function handleUpdate(id, data) {
    const updated = await apiFetch(`/classes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setClasses((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleDelete(id) {
    await apiFetch(`/classes/${id}`, { method: "DELETE" });
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setOfficeHours((prev) => prev.filter((oh) => oh.class_id !== id));
  }

  async function handleAddOH(classId, ohData) {
    const saved = await apiFetch("/office-hours/", {
      method: "POST",
      body: JSON.stringify({ class_id: classId, ...ohData }),
    });
    setOfficeHours((prev) => [...prev, saved]);
  }

  async function handleDeleteOH(id) {
    await apiFetch(`/office-hours/${id}`, { method: "DELETE" });
    setOfficeHours((prev) => prev.filter((oh) => oh.id !== id));
  }

  async function handleClassSaved(cls) {
    setClasses((prev) => [cls, ...prev]);
    // Reload OH so syllabus-extracted office hours appear immediately
    const ohs = await apiFetch("/office-hours/");
    setOfficeHours(ohs);
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>My Classes</h2>
        <SyllabusUpload onClassSaved={handleClassSaved} />
      </div>
      <AddClassForm onAdd={handleAdd} />
      {loading && <p style={s.msg}>Loading…</p>}
      {error && <p style={{ ...s.msg, color: "red" }}>{error}</p>}
      {!loading && classes.length === 0 && (
        <p style={s.msg}>No classes yet — add one above.</p>
      )}
      <div style={s.grid}>
        {classes.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            officeHours={officeHours.filter((oh) => oh.class_id === cls.id)}
            onAddOH={handleAddOH}
            onDeleteOH={handleDeleteOH}
          />
        ))}
      </div>
    </div>
  );
}

const s = {
  page: {
    padding: "32px",
    maxWidth: "900px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    color: "#08060d",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "16px",
  },
  msg: {
    color: "#6b6375",
    fontSize: "14px",
    margin: 0,
  },
};
