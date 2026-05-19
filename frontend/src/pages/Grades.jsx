import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import GradeCard from "../components/GradeCard";

export default function Grades() {
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [cls, asgns, cats] = await Promise.all([
        apiFetch("/classes/"),
        apiFetch("/assignments/"),
        apiFetch("/grade-categories/"),
      ]);
      setClasses(cls);
      setAssignments(asgns);
      setCategories(cats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const classesWithAssignments = classes.filter(
    (cls) => assignments.some((a) => a.class_id === cls.id)
  );
  const classesWithoutAssignments = classes.filter(
    (cls) => !assignments.some((a) => a.class_id === cls.id)
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Grade Calculator</h2>
        <p style={s.subtitle}>
          Grades are calculated per category. Current = weighted avg of graded categories only.
          Projected = assumes 100% on all remaining.
        </p>
      </div>

      {loading && <p style={s.msg}>Loading…</p>}
      {error   && <p style={{ ...s.msg, color: "red" }}>{error}</p>}
      {!loading && classes.length === 0 && (
        <p style={s.msg}>No classes yet. Add a class first.</p>
      )}

      <div style={s.list}>
        {classesWithAssignments.map((cls) => (
          <GradeCard
            key={cls.id}
            cls={cls}
            assignments={assignments.filter((a) => a.class_id === cls.id)}
            initialCategories={categories.filter((c) => c.class_id === cls.id)}
          />
        ))}
      </div>

      {/* Classes with no assignments — show minimal card so user can still add categories */}
      {classesWithoutAssignments.length > 0 && !loading && (
        <>
          <p style={s.emptySectionLabel}>Classes with no assignments yet</p>
          <div style={s.list}>
            {classesWithoutAssignments.map((cls) => (
              <GradeCard
                key={cls.id}
                cls={cls}
                assignments={[]}
                initialCategories={categories.filter((c) => c.class_id === cls.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  page: {
    padding: "32px", maxWidth: "900px", margin: "0 auto",
    display: "flex", flexDirection: "column", gap: "24px",
  },
  header: { display: "flex", flexDirection: "column", gap: "4px" },
  title: { margin: 0, fontSize: "22px", fontWeight: 700, color: "#08060d" },
  subtitle: { margin: 0, fontSize: "13px", color: "#9ca3af" },
  list: { display: "flex", flexDirection: "column", gap: "20px" },
  msg: { color: "#6b6375", fontSize: "14px", margin: 0 },
  emptySectionLabel: {
    margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.07em", color: "#9ca3af",
  },
};
