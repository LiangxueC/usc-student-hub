import { useEffect, useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { apiFetch } from "../api/client";
import AddTodoForm from "../components/AddTodoForm";

const QUADRANT_META = [
  { id: "Q1", label: "Do First",  sub: "Urgent · Important",         color: "#dc2626", bg: "#fef2f2" },
  { id: "Q2", label: "Schedule",  sub: "Not Urgent · Important",     color: "#2563eb", bg: "#eff6ff" },
  { id: "Q3", label: "Delegate",  sub: "Urgent · Not Important",     color: "#d97706", bg: "#fffbeb" },
  { id: "Q4", label: "Eliminate", sub: "Not Urgent · Not Important", color: "#6b7280", bg: "#f9fafb" },
];

function daysFromNow(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function autoQ(type, days) {
  const urgent = days <= 2;
  const important = type === "assignment";
  if (urgent && important)  return "Q1";
  if (!urgent && important) return "Q2";
  if (urgent)               return "Q3";
  return "Q4";
}

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem("matrix-overrides") || "{}"); }
  catch { return {}; }
}

export default function Matrix() {
  const [assignments, setAssignments] = useState([]);
  const [todos,       setTodos]       = useState([]);
  const [overrides,   setOverrides]   = useState(loadOverrides);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [doneOpen,    setDoneOpen]    = useState(false);

  useEffect(() => {
    Promise.all([apiFetch("/assignments/"), apiFetch("/todos/")])
      .then(([asgns, tdos]) => { setAssignments(asgns); setTodos(tdos); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const allItems = useMemo(() => {
    const items = [];
    for (const a of assignments) {
      if (a.is_done) continue;
      const key = `assignment-${a.id}`;
      if (!a.due_date) {
        items.push({ ...a, type: "assignment", quadrant: overrides[key] ?? "Q2" });
        continue;
      }
      const days = daysFromNow(a.due_date);
      if (days < 0 || days > 14) continue;
      items.push({ ...a, type: "assignment", quadrant: overrides[key] ?? autoQ("assignment", days) });
    }
    for (const t of todos) {
      if (t.is_done) continue;
      const key = `todo-${t.id}`;
      if (!t.due_date) {
        items.push({ ...t, type: "todo", quadrant: overrides[key] ?? "Q4" });
        continue;
      }
      const days = daysFromNow(t.due_date);
      if (days < 0 || days > 14) continue;
      items.push({ ...t, type: "todo", quadrant: overrides[key] ?? autoQ("todo", days) });
    }
    return items;
  }, [assignments, todos, overrides]);

  const byQ = useMemo(() => {
    const m = { Q1: [], Q2: [], Q3: [], Q4: [] };
    for (const item of allItems) m[item.quadrant].push(item);
    for (const list of Object.values(m)) {
      list.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
    }
    return m;
  }, [allItems]);

  // All completed items across both lists
  const doneItems = useMemo(() => {
    const items = [
      ...assignments.filter((a) => a.is_done).map((a) => ({ ...a, type: "assignment" })),
      ...todos.filter((t) => t.is_done).map((t) => ({ ...t, type: "todo" })),
    ];
    return items;
  }, [assignments, todos]);

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const next = { ...overrides, [active.id]: over.id };
    setOverrides(next);
    localStorage.setItem("matrix-overrides", JSON.stringify(next));
  }

  async function handleToggle(item, grade = null) {
    const path = item.type === "todo" ? `/todos/${item.id}` : `/assignments/${item.id}`;
    const body = { is_done: true };
    if (item.type === "assignment") body.grade = grade;
    const updated = await apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
    if (item.type === "todo") {
      setTodos((prev) => prev.map((t) => (t.id === item.id ? updated : t)));
    } else {
      setAssignments((prev) => prev.map((a) => (a.id === item.id ? updated : a)));
    }
    const next = { ...overrides };
    delete next[`${item.type}-${item.id}`];
    setOverrides(next);
    localStorage.setItem("matrix-overrides", JSON.stringify(next));
  }

  async function handleUndo(item) {
    const path = item.type === "todo" ? `/todos/${item.id}` : `/assignments/${item.id}`;
    const body = item.type === "assignment" ? { is_done: false, grade: null } : { is_done: false };
    const updated = await apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
    if (item.type === "todo") {
      setTodos((prev) => prev.map((t) => (t.id === item.id ? updated : t)));
    } else {
      setAssignments((prev) => prev.map((a) => (a.id === item.id ? updated : a)));
    }
  }

  async function handleAddTodo(form) {
    const created = await apiFetch("/todos/", { method: "POST", body: JSON.stringify(form) });
    setTodos((prev) => [...prev, created]);
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <h2 style={s.title}>Priority Matrix</h2>
        <div style={s.legend}>
          <span style={s.chip}><span style={{ ...s.dot, background: "#dc2626" }} />≤ 2 days = Urgent</span>
          <span style={s.chip}><span style={{ ...s.dot, background: "#2563eb" }} />Assignments = Important</span>
          <span style={{ ...s.chip, color: "#9ca3af" }}>Drag cards to override placement</span>
        </div>
      </div>

      {loading && <p style={s.msg}>Loading…</p>}
      {error   && <p style={{ ...s.msg, color: "#dc2626" }}>{error}</p>}

      {!loading && !error && (
        <>
          <DndContext onDragEnd={handleDragEnd}>
            <div style={s.grid}>
              {QUADRANT_META.map((q) => (
                <QuadrantPanel
                  key={q.id}
                  q={q}
                  items={byQ[q.id]}
                  onToggle={handleToggle}
                  showAdd={q.id === "Q3"}
                  onAddTodo={handleAddTodo}
                />
              ))}
            </div>
          </DndContext>

          <CompletedPanel
            items={doneItems}
            open={doneOpen}
            onToggle={() => setDoneOpen((v) => !v)}
            onUndo={handleUndo}
          />
        </>
      )}
    </div>
  );
}

function QuadrantPanel({ q, items, onToggle, showAdd, onAddTodo }) {
  const { setNodeRef, isOver } = useDroppable({ id: q.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...s.quadrant,
        outline: isOver ? `2px dashed ${q.color}` : "2px solid transparent",
        outlineOffset: "-2px",
      }}
    >
      <div style={{ ...s.qHeader, borderLeft: `4px solid ${q.color}`, background: q.bg }}>
        <div>
          <span style={{ ...s.qLabel, color: q.color }}>{q.label}</span>
          <span style={s.qSub}>{q.sub}</span>
        </div>
        <span style={{ ...s.badge, background: q.color }}>{items.length}</span>
      </div>

      <div style={s.qBody}>
        {items.length === 0 && !showAdd && <p style={s.empty}>Nothing here</p>}
        {items.map((item) => (
          <ItemCard
            key={`${item.type}-${item.id}`}
            item={item}
            onToggle={onToggle}
            accentColor={q.color}
          />
        ))}
        {showAdd && (
          <div style={s.addWrap}>
            <AddTodoForm onAdd={onAddTodo} />
          </div>
        )}
      </div>
    </div>
  );
}

function ItemCard({ item, onToggle, accentColor }) {
  const dragId = `${item.type}-${item.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId });
  const [showGrade, setShowGrade] = useState(false);
  const [gradeInput, setGradeInput] = useState("");
  const [saving, setSaving] = useState(false);

  function handleCheckClick(e) {
    e.stopPropagation();
    if (item.type === "assignment") {
      setShowGrade(true);
    } else {
      onToggle(item);
    }
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      const grade = gradeInput !== "" ? parseFloat(gradeInput) : null;
      await onToggle(item, grade);
    } finally {
      setSaving(false);
      setShowGrade(false);
      setGradeInput("");
    }
  }

  function handleCancel(e) {
    e.stopPropagation();
    setShowGrade(false);
    setGradeInput("");
  }

  function fmtDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const days = item.due_date ? daysFromNow(item.due_date) : null;
  const dueLabel = days === 0 ? "Today" : days === 1 ? "Tomorrow" : item.due_date ? fmtDate(item.due_date) : null;
  const dueColor = days !== null && days === 0 ? "#dc2626" : days !== null && days <= 2 ? "#d97706" : "#9ca3af";

  // Don't attach drag listeners while grade prompt is open
  const dragListeners = showGrade ? {} : listeners;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...s.card,
        borderLeft: `3px solid ${accentColor}`,
        opacity: isDragging ? 0.4 : 1,
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        cursor: showGrade ? "default" : isDragging ? "grabbing" : "grab",
        zIndex: isDragging ? 999 : "auto",
      }}
      {...dragListeners}
      {...attributes}
    >
      <div style={s.cardRow}>
        <button
          style={s.checkBtn}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleCheckClick}
          title="Mark done"
        >
          ○
        </button>
        <span style={s.cardTitle}>{item.title}</span>
      </div>

      {(item.classes?.name || dueLabel) && !showGrade && (
        <div style={s.cardMeta}>
          {item.classes?.name && <span style={s.classTag}>{item.classes.name}</span>}
          {dueLabel && <span style={{ ...s.dueTag, color: dueColor }}>{dueLabel}</span>}
        </div>
      )}

      {showGrade && (
        <div style={s.gradePrompt} onPointerDown={(e) => e.stopPropagation()}>
          <input
            style={s.gradeInput}
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="Grade (0–100)"
            value={gradeInput}
            onChange={(e) => setGradeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); if (e.key === "Escape") handleCancel(e); }}
            autoFocus
          />
          <button style={s.confirmBtn} onClick={handleConfirm} disabled={saving}>
            {saving ? "…" : "Confirm"}
          </button>
          <button style={s.skipBtn} onClick={handleConfirm} disabled={saving}>
            Skip
          </button>
          <button style={s.cancelBtn} onClick={handleCancel} disabled={saving}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function CompletedPanel({ items, open, onToggle, onUndo }) {
  const [undoing, setUndoing] = useState(null);

  async function handleUndo(item) {
    setUndoing(`${item.type}-${item.id}`);
    try { await onUndo(item); } finally { setUndoing(null); }
  }

  function fmtDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div style={s.donePanel}>
      <button style={s.donePanelHeader} onClick={onToggle}>
        <span style={s.donePanelLabel}>
          ✓ Completed
          <span style={s.doneBadge}>{items.length}</span>
        </span>
        <span style={{ fontSize: "12px", color: "#9ca3af" }}>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div style={s.doneList}>
          {items.length === 0 && <p style={s.doneEmpty}>Nothing completed yet.</p>}
          {items.map((item) => {
            const key = `${item.type}-${item.id}`;
            const isUndoing = undoing === key;
            return (
              <div key={key} style={s.doneRow}>
                <span style={s.doneTick}>✓</span>
                <span style={s.doneTitle}>{item.title}</span>
                {item.classes?.name && <span style={s.classTag}>{item.classes.name}</span>}
                {item.grade != null && (
                  <span style={s.gradeTag}>{item.grade}%</span>
                )}
                {item.due_date && <span style={s.doneDue}>{fmtDate(item.due_date)}</span>}
                <button
                  style={{ ...s.undoBtn, opacity: isUndoing ? 0.5 : 1 }}
                  onClick={() => handleUndo(item)}
                  disabled={isUndoing}
                >
                  {isUndoing ? "…" : "Undo"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    padding: "24px 32px",
    maxWidth: "1200px",
    margin: "0 auto",
    height: "calc(100vh - 56px)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "10px",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    color: "#08060d",
  },
  legend: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    color: "#6b6375",
  },
  dot: {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  msg: {
    color: "#6b6375",
    fontSize: "14px",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    gap: "14px",
    flex: 1,
    minHeight: 0,
  },
  quadrant: {
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "10px",
    overflow: "hidden",
    minHeight: 0,
  },
  qHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    flexShrink: 0,
  },
  qLabel: {
    fontWeight: 700,
    fontSize: "14px",
    display: "block",
  },
  qSub: {
    fontSize: "11px",
    color: "#9ca3af",
    display: "block",
    marginTop: "1px",
  },
  badge: {
    color: "#fff",
    fontWeight: 700,
    fontSize: "12px",
    borderRadius: "999px",
    padding: "2px 8px",
    minWidth: "20px",
    textAlign: "center",
    flexShrink: 0,
  },
  qBody: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    minHeight: 0,
  },
  empty: {
    margin: 0,
    fontSize: "13px",
    color: "#d1d5db",
    fontStyle: "italic",
    textAlign: "center",
    paddingTop: "12px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "7px",
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    userSelect: "none",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    position: "relative",
  },
  cardRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
  },
  checkBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "#9ca3af",
    padding: 0,
    lineHeight: 1,
    flexShrink: 0,
    marginTop: "1px",
  },
  cardTitle: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#08060d",
    lineHeight: 1.4,
    flex: 1,
  },
  cardMeta: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    paddingLeft: "24px",
    flexWrap: "wrap",
  },
  classTag: {
    fontSize: "11px",
    background: "#f3f4f6",
    color: "#6b6375",
    borderRadius: "4px",
    padding: "1px 6px",
    fontWeight: 500,
  },
  dueTag: {
    fontSize: "11px",
    fontWeight: 600,
  },
  gradePrompt: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    paddingLeft: "24px",
    flexWrap: "wrap",
  },
  gradeInput: {
    width: "100px",
    padding: "4px 8px",
    borderRadius: "6px",
    border: "1px solid #e5e4e7",
    fontSize: "12px",
    outline: "none",
  },
  confirmBtn: {
    padding: "4px 12px",
    borderRadius: "6px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
  skipBtn: {
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid #e5e4e7",
    background: "#fff",
    fontSize: "12px",
    cursor: "pointer",
    color: "#6b6375",
  },
  cancelBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#9ca3af",
    padding: "2px 4px",
  },
  addWrap: {
    marginTop: "4px",
    borderTop: "1px dashed #e5e4e7",
    paddingTop: "10px",
  },
  // Completed panel
  donePanel: {
    flexShrink: 0,
    border: "1px solid #e5e4e7",
    borderRadius: "10px",
    background: "#fff",
    overflow: "hidden",
  },
  donePanelHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  donePanelLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
  },
  doneBadge: {
    background: "#e5e7eb",
    color: "#6b7280",
    borderRadius: "999px",
    padding: "1px 7px",
    fontSize: "11px",
    fontWeight: 700,
  },
  doneList: {
    maxHeight: "200px",
    overflowY: "auto",
    borderTop: "1px solid #f3f4f6",
    padding: "6px 0",
  },
  doneEmpty: {
    margin: 0,
    padding: "12px 16px",
    fontSize: "13px",
    color: "#9ca3af",
    fontStyle: "italic",
  },
  doneRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 16px",
    borderBottom: "1px solid #f9fafb",
    flexWrap: "wrap",
  },
  doneTick: {
    color: "#22c55e",
    fontSize: "13px",
    flexShrink: 0,
  },
  doneTitle: {
    fontSize: "13px",
    color: "#374151",
    flex: 1,
    minWidth: "100px",
    textDecoration: "line-through",
    textDecorationColor: "#d1d5db",
  },
  gradeTag: {
    fontSize: "11px",
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: "4px",
    padding: "1px 6px",
    fontWeight: 600,
  },
  doneDue: {
    fontSize: "11px",
    color: "#9ca3af",
  },
  undoBtn: {
    marginLeft: "auto",
    padding: "3px 10px",
    borderRadius: "5px",
    border: "1px solid #e5e4e7",
    background: "#fff",
    fontSize: "12px",
    cursor: "pointer",
    color: "#6b6375",
    fontWeight: 500,
    flexShrink: 0,
  },
};
