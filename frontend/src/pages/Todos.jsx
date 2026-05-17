import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import AddTodoForm from "../components/AddTodoForm";
import TodoItem from "../components/TodoItem";

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const data = await apiFetch("/todos/");
      setTodos(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(form) {
    const created = await apiFetch("/todos/", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setTodos((prev) => sortTodos([...prev, created]));
  }

  async function handleToggle(id, is_done) {
    const updated = await apiFetch(`/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_done }),
    });
    setTodos((prev) => sortTodos(prev.map((t) => (t.id === id ? updated : t))));
  }

  async function handleDelete(id) {
    await apiFetch(`/todos/${id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  const incomplete = todos.filter((t) => !t.is_done);
  const complete = todos.filter((t) => t.is_done);

  return (
    <div style={s.page}>
      <h2 style={s.title}>Todo List</h2>
      <AddTodoForm onAdd={handleAdd} />

      {loading && <p style={s.msg}>Loading…</p>}
      {error && <p style={{ ...s.msg, color: "red" }}>{error}</p>}
      {!loading && todos.length === 0 && (
        <p style={s.msg}>No tasks yet — add one above.</p>
      )}

      {incomplete.length > 0 && (
        <div style={s.list}>
          {incomplete.map((t) => (
            <TodoItem key={t.id} todo={t} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {complete.length > 0 && (
        <>
          <p style={s.sectionLabel}>Completed ({complete.length})</p>
          <div style={s.list}>
            {complete.map((t) => (
              <TodoItem key={t.id} todo={t} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function sortTodos(todos) {
  return [...todos].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}

const s = {
  page: {
    padding: "32px",
    maxWidth: "700px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    color: "#08060d",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionLabel: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#9ca3af",
  },
  msg: {
    color: "#6b6375",
    fontSize: "14px",
    margin: 0,
  },
};
