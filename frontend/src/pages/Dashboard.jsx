import { useCallback, useEffect, useRef, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { apiFetch } from "../api/client";
import WidgetCard from "../components/widgets/WidgetCard";
import PriorityMatrixWidget    from "../components/widgets/PriorityMatrixWidget";
import UpcomingDeadlinesWidget from "../components/widgets/UpcomingDeadlinesWidget";
import TodaysScheduleWidget    from "../components/widgets/TodaysScheduleWidget";
import GradesWidget            from "../components/widgets/GradesWidget";
import DegreeProgressWidget    from "../components/widgets/DegreeProgressWidget";
import USCNewsWidget           from "../components/widgets/USCNewsWidget";
import FocusTimerWidget        from "../components/widgets/FocusTimerWidget";
import GroupActivityWidget     from "../components/widgets/GroupActivityWidget";
import SyllabusSearchWidget    from "../components/widgets/SyllabusSearchWidget";

// ---------------------------------------------------------------------------
// Widget registry
// ---------------------------------------------------------------------------
export const WIDGET_META = {
  priority_matrix:    { title: "Priority Matrix",    icon: "⊟", route: "/matrix" },
  upcoming_deadlines: { title: "Upcoming Deadlines", icon: "📋", route: "/assignments" },
  todays_schedule:    { title: "Today's Schedule",   icon: "📅", route: "/calendar" },
  grades:             { title: "Grades",             icon: "📊", route: "/grades" },
  degree_progress:    { title: "Degree Progress",    icon: "🎓", route: "/degree" },
  usc_news:           { title: "USC News",           icon: "📰", route: "/news" },
  focus_timer:        { title: "Focus Timer",        icon: "⏱️",  route: "/focus" },
  group_activity:     { title: "Group Activity",     icon: "👥", route: "/groups" },
  syllabus_search:    { title: "Syllabus Search",    icon: "🗄️",  route: "/syllabus-search" },
};

const WIDGET_COMPONENTS = {
  priority_matrix:    <PriorityMatrixWidget />,
  upcoming_deadlines: <UpcomingDeadlinesWidget />,
  todays_schedule:    <TodaysScheduleWidget />,
  grades:             <GradesWidget />,
  degree_progress:    <DegreeProgressWidget />,
  usc_news:           <USCNewsWidget />,
  focus_timer:        <FocusTimerWidget />,
  group_activity:     <GroupActivityWidget />,
  syllabus_search:    <SyllabusSearchWidget />,
};

const SIZE_CYCLE = { small: "medium", medium: "large", large: "small" };

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------
function greeting(email) {
  const h = new Date().getHours();
  const word = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const local = email?.split("@")[0] || "";
  const first = local.split(/[._-]/)[0];
  return `${word}, ${first.charAt(0).toUpperCase() + first.slice(1)}`;
}

function todayStr() {
  return new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [layout, setLayout]         = useState(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const saveTimer = useRef(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    apiFetch("/dashboard/layout")
      .then(d => setLayout(d.layout))
      .catch(() => {});
  }, []);

  // Store current user email for greeting
  const [email, setEmail] = useState("");
  useEffect(() => {
    import("../api/supabase").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setEmail(session?.user?.email || "");
      });
    });
  }, []);

  const scheduleSave = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch("/dashboard/layout", { method: "PUT", body: JSON.stringify({ layout: next }) })
        .catch(() => {});
    }, 800);
  }, []);

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    setLayout(prev => {
      const a = prev.findIndex(w => w.id === active.id);
      const b = prev.findIndex(w => w.id === over.id);
      const next = arrayMove(prev, a, b).map((w, i) => ({ ...w, order: i }));
      scheduleSave(next);
      return next;
    });
  }

  function handleResize(id) {
    setLayout(prev => {
      const next = prev.map(w => w.id === id ? { ...w, size: SIZE_CYCLE[w.size] } : w);
      scheduleSave(next);
      return next;
    });
  }

  function handleToggle(id) {
    setLayout(prev => {
      const next = prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
      scheduleSave(next);
      return next;
    });
  }

  if (!layout) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div style={{ ...s.skelLine, width: 240, height: 28 }} />
          <div style={{ ...s.skelLine, width: 120, height: 16, marginTop: 8 }} />
        </div>
        <div style={s.grid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ ...s.skelCard, gridColumn: i === 0 ? "span 2" : "span 1", gridRow: "span 2" }} />
          ))}
        </div>
      </div>
    );
  }

  const visible = [...layout].filter(w => w.visible).sort((a, b) => a.order - b.order);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.greeting}>{greeting(email)} ✦</h1>
          <p style={s.dateStr}>{todayStr()}</p>
        </div>
        <button style={s.customizeBtn} onClick={() => setShowCustomize(true)}>
          ⚙ Customize
        </button>
      </div>

      {/* Widget grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visible.map(w => w.id)} strategy={rectSortingStrategy}>
          <div style={s.grid}>
            {visible.map(widget => (
              <SortableSlot key={widget.id} widget={widget} onResize={handleResize} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Customize panel */}
      {showCustomize && (
        <CustomizePanel
          layout={layout}
          onToggle={handleToggle}
          onResize={handleResize}
          onClose={() => setShowCustomize(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable slot
// ---------------------------------------------------------------------------
function SortableSlot({ widget, onResize }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id });

  const t = transform;
  const transformStr = t
    ? `translate3d(${Math.round(t.x)}px, ${Math.round(t.y)}px, 0)`
    : undefined;

  const meta = WIDGET_META[widget.id];

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: widget.size === "large" ? "span 2" : "span 1",
        gridRow:    widget.size === "small" ? "span 1" : "span 2",
        transform: transformStr,
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : "auto",
      }}
      {...attributes}
    >
      <WidgetCard
        title={meta.title}
        icon={meta.icon}
        navLink={meta.route}
        size={widget.size}
        dragListeners={listeners}
        onResize={() => onResize(widget.id)}
      >
        {WIDGET_COMPONENTS[widget.id]}
      </WidgetCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customize panel
// ---------------------------------------------------------------------------
function CustomizePanel({ layout, onToggle, onResize, onClose }) {
  const SIZE_LABELS = { small: "Small", medium: "Medium", large: "Large" };
  const sorted = [...layout].sort((a, b) => a.order - b.order);

  return (
    <>
      <div style={s.panelBackdrop} onClick={onClose} />
      <div style={s.panel}>
        <div style={s.panelHead}>
          <span style={s.panelTitle}>Customize Dashboard</span>
          <button style={s.panelClose} onClick={onClose}>✕</button>
        </div>
        <div style={s.panelList}>
          {sorted.map(w => {
            const meta = WIDGET_META[w.id];
            return (
              <div key={w.id} style={s.panelRow}>
                <span style={s.panelIcon}>{meta.icon}</span>
                <span style={s.panelLabel}>{meta.title}</span>
                <span style={s.panelSize}>{SIZE_LABELS[w.size]}</span>
                <Toggle checked={w.visible} onChange={() => onToggle(w.id)} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: checked ? "#9D2235" : "#d1d5db",
        position: "relative", flexShrink: 0, transition: "background 0.2s",
      }}
    >
      <span style={{
        position: "absolute", top: 2, height: 16, width: 16, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        left: checked ? 18 : 2,
      }} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const USC = "#9D2235";

const s = {
  page: { padding: "28px 28px 48px", minHeight: "100%", boxSizing: "border-box" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: "24px",
  },
  greeting: { margin: 0, fontSize: "24px", fontWeight: 700, color: "#08060d" },
  dateStr:  { margin: "4px 0 0", fontSize: "13px", color: "#9ca3af" },
  customizeBtn: {
    padding: "8px 16px", background: "#fff", border: "1px solid #e5e4e7",
    borderRadius: "8px", fontSize: "13px", cursor: "pointer", color: "#6b6375",
    display: "flex", alignItems: "center", gap: "6px", flexShrink: 0,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridAutoRows: "280px",
    gap: "16px",
  },

  // Customize panel
  panelBackdrop: { position: "fixed", inset: 0, zIndex: 90 },
  panel: {
    position: "fixed", top: 0, right: 0, width: "300px", height: "100vh",
    background: "#fff", borderLeft: "1px solid #e5e4e7",
    boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
    zIndex: 95, display: "flex", flexDirection: "column",
  },
  panelHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 20px 16px", borderBottom: "1px solid #f3f4f6",
  },
  panelTitle: { fontSize: "15px", fontWeight: 700, color: "#08060d" },
  panelClose: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "16px", color: "#6b6375",
  },
  panelList: { flex: 1, overflowY: "auto", padding: "8px 16px" },
  panelRow: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 0", borderBottom: "1px solid #f9f9fb",
  },
  panelIcon:  { fontSize: "16px", flexShrink: 0 },
  panelLabel: { flex: 1, fontSize: "13px", fontWeight: 500, color: "#08060d" },
  panelSize:  { fontSize: "11px", color: "#9ca3af", flexShrink: 0 },

  // Loading skeleton
  skelLine: { background: "#f3f4f6", borderRadius: "6px" },
  skelCard: {
    background: "#f9fafb", border: "1px solid #f0f0f2",
    borderRadius: "12px", gridRow: "span 2",
  },
};
