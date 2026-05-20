import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { apiFetch } from "../api/client";
import { buildAllEvents, buildColorMap } from "../utils/calendarUtils";
import EventPopup from "../components/EventPopup";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

// Scroll week view to 8am on load
const SCROLL_TO = (() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; })();

// Custom event card shown inside the week/day time grid
function EventCard({ event }) {
  const isClass = event.type === "class";
  const isOH = event.type === "office_hours";
  const isTimed = !event.allDay;

  return (
    <div style={{ lineHeight: 1.35, overflow: "hidden", height: "100%" }}>
      <div style={{ fontWeight: 700, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {isClass ? event.resource.name : isOH ? "Office Hours" : event.title}
      </div>
      {isTimed && isOH && event.resource.classes?.name && (
        <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {event.resource.classes.name}
        </div>
      )}
      {isTimed && (isClass || isOH) && event.resource.location && (
        <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          📍 {event.resource.location}
        </div>
      )}
      {isTimed && (isClass || isOH) && (
        <div style={{ fontSize: "11px", opacity: 0.75, marginTop: "1px" }}>
          {fmt12(event.start)} – {fmt12(event.end)}
        </div>
      )}
    </div>
  );
}

function fmt12(date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function CalendarPage() {
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [todos, setTodos] = useState([]);
  const [officeHours, setOfficeHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(Views.WEEK);
  const [selected, setSelected] = useState(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  async function load() {
    try {
      const [cls, asgns, tdos, ohs] = await Promise.all([
        apiFetch("/classes/"),
        apiFetch("/assignments/"),
        apiFetch("/todos/"),
        apiFetch("/office-hours/"),
      ]);
      setClasses(cls);
      setAssignments(asgns);
      setTodos(tdos);
      setOfficeHours(ohs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleMarkDone(assignmentId, grade) {
    await apiFetch(`/assignments/${assignmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_done: true, grade }),
    });
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, is_done: true, grade } : a))
    );
    setSelected(null);
  }

  function handleSelectEvent(event, e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPos({ x: rect.right + 8, y: rect.top });
    setSelected(event);
  }

  const colorMap = useMemo(() => buildColorMap(classes), [classes]);
  const events = useMemo(
    () => buildAllEvents(classes, assignments, todos, colorMap, officeHours),
    [classes, assignments, todos, colorMap, officeHours]
  );

  function eventPropGetter(event) {
    const c = event.color || {};
    if (event.type === "office_hours") {
      return {
        style: {
          backgroundColor: c.bg || "#f3f4f6",
          color: c.text || "#374151",
          border: `1.5px dashed ${c.border || "#6b7280"}`,
          borderRadius: "5px",
          padding: "3px 6px",
          boxSizing: "border-box",
          opacity: 0.82,
        },
      };
    }
    return {
      style: {
        backgroundColor: c.bg || "#f3f4f6",
        color: c.text || "#374151",
        borderLeft: `3px solid ${c.border || "#6b7280"}`,
        border: "none",
        borderRadius: "5px",
        padding: "3px 6px",
        boxSizing: "border-box",
      },
    };
  }

  return (
    <div style={s.page}>
      <h2 style={s.title}>Calendar</h2>
      {loading ? (
        <p style={s.msg}>Loading…</p>
      ) : (
        <div style={s.calWrapper}>
          <Calendar
            localizer={localizer}
            events={events}
            date={date}
            view={view}
            onNavigate={setDate}
            onView={setView}
            views={[Views.MONTH, Views.WEEK]}
            style={{ height: "100%" }}
            eventPropGetter={eventPropGetter}
            components={{ event: EventCard }}
            onSelectEvent={handleSelectEvent}
            scrollToTime={SCROLL_TO}
            popup
          />
        </div>
      )}

      {selected && (
        <EventPopup
          event={selected}
          pos={popupPos}
          onClose={() => setSelected(null)}
          onMarkDone={handleMarkDone}
        />
      )}
    </div>
  );
}

const s = {
  page: {
    padding: "24px 32px",
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "calc(100vh - 56px)",
    boxSizing: "border-box",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    color: "#08060d",
    flexShrink: 0,
  },
  calWrapper: {
    flex: 1,
    minHeight: 0,
  },
  msg: {
    color: "#6b6375",
    fontSize: "14px",
  },
};
