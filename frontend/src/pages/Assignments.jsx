import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import AddAssignmentForm from "../components/AddAssignmentForm";
import AssignmentCard from "../components/AssignmentCard";

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [asgns, cls, cats] = await Promise.all([
        apiFetch("/assignments/"),
        apiFetch("/classes/"),
        apiFetch("/grade-categories/"),
      ]);
      setAssignments(sortByDueDate(asgns));
      setClasses(cls);
      setCategories(cats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(form) {
    const created = await apiFetch("/assignments/", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setAssignments((prev) => sortByDueDate([...prev, created]));
  }

  async function handleMarkDone(id, grade) {
    const updated = await apiFetch(`/assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_done: true, grade }),
    });
    setAssignments((prev) => sortByDueDate(prev.map((a) => (a.id === id ? updated : a))));
  }

  async function handleMarkUndone(id) {
    const updated = await apiFetch(`/assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_done: false, grade: null }),
    });
    setAssignments((prev) => sortByDueDate(prev.map((a) => (a.id === id ? updated : a))));
  }

  async function handleDelete(id) {
    await apiFetch(`/assignments/${id}`, { method: "DELETE" });
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  const groups = groupByClass(assignments);

  return (
    <div style={s.page}>
      <h2 style={s.title}>Assignments</h2>
      <AddAssignmentForm classes={classes} categories={categories} onAdd={handleAdd} />

      {loading && <p style={s.msg}>Loading…</p>}
      {error && <p style={{ ...s.msg, color: "red" }}>{error}</p>}
      {!loading && assignments.length === 0 && (
        <p style={s.msg}>No assignments yet — add one above.</p>
      )}

      {groups.map(({ className, classId, items }) => (
        <div key={classId} style={s.group}>
          <h3 style={s.groupTitle}>{className}</h3>
          <div style={s.list}>
            {items.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                onMarkDone={handleMarkDone}
                onMarkUndone={handleMarkUndone}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function sortByDueDate(arr) {
  return [...arr].sort((a, b) => {
    // Done items always go below undone
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}

function groupByClass(assignments) {
  const map = new Map();
  for (const a of assignments) {
    const key = a.class_id ?? "__none__";
    const name = a.classes?.name ?? "No class";
    if (!map.has(key)) map.set(key, { classId: key, className: name, items: [] });
    map.get(key).items.push(a);
  }
  return Array.from(map.values());
}

const s = {
  page: {
    padding: "32px",
    maxWidth: "900px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    color: "#08060d",
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  groupTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "#9b1b30",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    paddingBottom: "6px",
    borderBottom: "2px solid #f3e8e8",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  msg: {
    color: "#6b6375",
    fontSize: "14px",
    margin: 0,
  },
};
