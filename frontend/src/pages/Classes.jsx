import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import AddClassForm from "../components/AddClassForm";
import ClassCard from "../components/ClassCard";
import SyllabusUpload from "../components/SyllabusUpload";

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const data = await apiFetch("/classes/");
      setClasses(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(form) {
    const created = await apiFetch("/classes/", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setClasses((prev) => [created, ...prev]);
  }

  async function handleDelete(id) {
    await apiFetch(`/classes/${id}`, { method: "DELETE" });
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }

  function handleClassSaved(cls) {
    setClasses((prev) => [cls, ...prev]);
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
          <ClassCard key={cls.id} cls={cls} onDelete={handleDelete} />
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
