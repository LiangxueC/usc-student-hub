import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../calendar-custom.css";

import { apiFetch } from "../api/client";
import { buildAllEvents, buildColorMap } from "../utils/calendarUtils";
import EventPopup from "../components/EventPopup";
import CalendarToolbar from "../components/CalendarToolbar";

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { "en-US": enUS } });

const SCROLL_TO = (() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; })();

// ---------------------------------------------------------------------------
// Filter groups
// ---------------------------------------------------------------------------
const GROUP_META = [
  { type: "class",        label: "Classes",      color: "#378ADD" },
  { type: "office_hours", label: "Office Hours", color: "#1D9E75" },
  { type: "assignment",   label: "Assignments",  color: "#E24B4A" },
  { type: "todo",         label: "Todos",        color: "#888780" },
  { type: "custom",       label: "My Events",    color: "#7F77DD" },
];

const LS_GROUPS_KEY = "calendar_visible_groups";

function loadVisibleGroups() {
  try {
    const saved = localStorage.getItem(LS_GROUPS_KEY);
    const groups = saved ? JSON.parse(saved) : GROUP_META.map(g => g.type);
    // Ensure "custom" is included even if saved before this group existed
    return groups.includes("custom") ? groups : [...groups, "custom"];
  } catch {
    return GROUP_META.map(g => g.type);
  }
}

// ---------------------------------------------------------------------------
// Preset colors for color picker
// ---------------------------------------------------------------------------
const PRESET_COLORS = [
  "#378ADD", "#1D9E75", "#639922", "#EF9F27",
  "#E24B4A", "#9D2235", "#D4537E", "#7F77DD",
  "#D85A30", "#888780", "#0F6E56", "#534AB7",
];

// ---------------------------------------------------------------------------
// Day column header component (week view)
// ---------------------------------------------------------------------------
function WeekDayHeader({ date }) {
  const today   = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const dayNum  = date.getDate();

  return (
    <div style={s.dayHeader}>
      <span style={{ ...s.dayName, ...(isToday ? { color: "#9D2235" } : {}) }}>{dayName}</span>
      {isToday
        ? <span style={s.dayNumToday}>{dayNum}</span>
        : <span style={s.dayNum}>{dayNum}</span>
      }
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color picker popover
// ---------------------------------------------------------------------------
function ColorPickerPopover({ eventKey, currentColor, x, y, onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const popW = 180, popH = 170;
  const left = Math.min(x, window.innerWidth  - popW - 8);
  const top  = y + popH > window.innerHeight ? y - popH - 4 : y + 4;

  return (
    <div ref={ref} style={{ ...s.picker, left, top }}>
      <div style={s.pickerHead}>
        <span style={s.pickerTitle}>Event color</span>
        <button style={s.pickerClose} onClick={onClose}>×</button>
      </div>
      <div style={s.swatchGrid}>
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            onClick={() => onSelect(eventKey, color)}
            style={{
              ...s.swatch,
              background: color,
              boxShadow: currentColor === color
                ? `0 0 0 2px white, 0 0 0 3.5px ${color}`
                : undefined,
            }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------
function FilterBar({ visibleGroups, onToggle }) {
  return (
    <div style={s.filterBar}>
      {GROUP_META.map(({ type, label, color }) => {
        const active = visibleGroups.includes(type);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            style={{
              ...s.filterPill,
              background: active ? color + "22" : "#f5f5f5",
              color:      active ? color        : "#aaa",
              border:     `1px solid ${active ? color + "44" : "#eee"}`,
            }}
          >
            <span style={{
              ...s.filterDot,
              background:   active ? color : "transparent",
              border:       active ? "none" : `1.5px solid #aaa`,
            }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main calendar page
// ---------------------------------------------------------------------------
function fmt12(date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function CalendarPage() {
  const [classes,     setClasses]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [todos,       setTodos]       = useState([]);
  const [officeHours, setOfficeHours] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [date,        setDate]        = useState(new Date());
  const [view,        setView]        = useState(Views.WEEK);
  const [selected,    setSelected]    = useState(null);
  const [popupPos,    setPopupPos]    = useState({ x: 0, y: 0 });

  // Color overrides from backend
  const [colorOverrides,  setColorOverrides]  = useState({});
  // Color picker popover state
  const [colorPicker,     setColorPicker]     = useState(null);
  // Filter groups
  const [visibleGroups,   setVisibleGroups]   = useState(loadVisibleGroups);
  // Custom user events
  const [customEvents,    setCustomEvents]    = useState([]);
  // New event modal slot
  const [newEventSlot,    setNewEventSlot]    = useState(null);

  // Load calendar data + color overrides + custom events
  useEffect(() => {
    Promise.all([
      apiFetch("/classes/"),
      apiFetch("/assignments/"),
      apiFetch("/todos/"),
      apiFetch("/office-hours/"),
      apiFetch("/event-colors/"),
      apiFetch("/custom-events/"),
    ]).then(([cls, asgns, tdos, ohs, colors, customEvts]) => {
      setClasses(cls);
      setAssignments(asgns);
      setTodos(tdos);
      setOfficeHours(ohs);
      setColorOverrides(colors);
      setCustomEvents(customEvts);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Group toggle — persist to localStorage
  function toggleGroup(type) {
    setVisibleGroups(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      localStorage.setItem(LS_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  // Navigate handler for external toolbar
  function handleNavigate(action) {
    if (action === "TODAY") { setDate(new Date()); return; }
    setDate(prev => {
      const d = new Date(prev);
      if (view === Views.WEEK) d.setDate(d.getDate() + (action === "NEXT" ? 7 : -7));
      else d.setMonth(d.getMonth() + (action === "NEXT" ? 1 : -1));
      return d;
    });
  }

  // Mark assignment done (forwarded from popup)
  async function handleMarkDone(assignmentId, grade) {
    await apiFetch(`/assignments/${assignmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_done: true, grade }),
    });
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, is_done: true, grade } : a));
    setSelected(null);
  }

  // Drag on empty slot → open new-event modal
  function handleSelectSlot(slotInfo) {
    if (slotInfo.action !== "select") return;
    let { start, end } = slotInfo;
    // Month-view click gives midnight; default to 9am–10am
    if (start.getHours() === 0 && end.getHours() === 0) {
      start = new Date(start); start.setHours(9, 0, 0, 0);
      end   = new Date(start); end.setHours(10, 0, 0, 0);
    }
    setNewEventSlot({ start, end });
  }

  // Delete a custom event
  async function handleDeleteCustomEvent(eventId) {
    try {
      await apiFetch(`/custom-events/${eventId}`, { method: "DELETE" });
      setCustomEvents((prev) => prev.filter((e) => e.id !== eventId));
      setSelected(null);
    } catch {}
  }

  // Event click → open popup
  function handleSelectEvent(event, e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPos({ x: rect.right + 8, y: rect.top });
    setSelected(event);
  }

  // Shared color save — accepts eventKey (string) and hex
  async function handleColorSelect(eventKey, hex) {
    setColorOverrides(prev => ({ ...prev, [eventKey]: hex }));
    setColorPicker(null);
    try {
      await apiFetch("/event-colors/", {
        method: "PUT",
        body: JSON.stringify({ event_key: eventKey, color: hex }),
      });
    } catch {}
  }

  // Build events from data
  const colorMap = useMemo(() => buildColorMap(classes), [classes]);

  const customRBCEvents = useMemo(() =>
    customEvents.map((e) => ({
      id: `custom-${e.id}`,
      eventKey: `custom_${e.id}`,
      title: e.title,
      start: new Date(e.start_time),
      end:   new Date(e.end_time),
      allDay: false,
      type: "custom",
      color: { border: e.color || "#7F77DD" }, // PALETTE-shape so colorization step extracts .border
      resource: e,
    })),
    [customEvents]
  );

  const rawEvents = useMemo(
    () => [...buildAllEvents(classes, assignments, todos, colorMap, officeHours), ...customRBCEvents],
    [classes, assignments, todos, colorMap, officeHours, customRBCEvents]
  );

  // Convert PALETTE objects → hex strings, applying overrides
  const colorizedEvents = useMemo(() =>
    rawEvents.map(event => {
      const paletteHex = event.color?.border ?? "#9ca3af";
      const hex = colorOverrides[event.eventKey] ?? paletteHex;
      return { ...event, color: hex };
    }),
    [rawEvents, colorOverrides]
  );

  // Apply group filters
  const filteredEvents = useMemo(() =>
    colorizedEvents.filter(e => visibleGroups.includes(e.type)),
    [colorizedEvents, visibleGroups]
  );

  // eventPropGetter: alpha-fill + full-opacity text
  function eventPropGetter(event) {
    const hex = event.color || "#9ca3af";
    return {
      style: {
        backgroundColor: hex + "22",
        border: "none",
        borderRadius: "6px",
        padding: "2px 6px",
        color: hex,
        boxShadow: "none",
        cursor: "pointer",
        overflow: "visible",
      },
    };
  }

  // Event content renderer — uses useCallback so the reference is stable
  const EventCardRenderer = useCallback(function EventCard({ event }) {
    const isClass = event.type === "class";
    const isOH    = event.type === "office_hours";
    const isTimed = !event.allDay;

    function handleContextMenu(e) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setColorPicker({ eventKey: event.eventKey, color: event.color, x: rect.left, y: rect.bottom });
    }

    return (
      <div style={{ lineHeight: 1.35, overflow: "hidden", minWidth: 0 }} onContextMenu={handleContextMenu}>
        {/* Time first — single line, hard truncate */}
        {isTimed && (
          <div style={{ fontSize: "10px", opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {fmt12(event.start)} – {fmt12(event.end)}
          </div>
        )}
        {/* Title — allow up to 2 lines, then clip */}
        <div style={{
          fontSize: "11px", fontWeight: 500,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {isClass ? event.resource.name : isOH ? "Office Hours" : event.title}
        </div>
        {/* Secondary lines — single line each, clip if no room */}
        {isOH && event.resource.classes?.name && (
          <div style={{ fontSize: "10px", opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {event.resource.classes.name}
          </div>
        )}
        {(isClass || isOH) && event.resource.location && (
          <div style={{ fontSize: "10px", opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {event.resource.location}
          </div>
        )}
      </div>
    );
  }, []); // setColorPicker is a stable useState setter

  const calendarComponents = useMemo(() => ({
    toolbar: () => null,       // suppress RBC's built-in toolbar
    header:  WeekDayHeader,    // custom week-view day headers
    event:   EventCardRenderer,
  }), [EventCardRenderer]);

  return (
    <div style={s.page}>
      {loading ? (
        <p style={s.msg}>Loading…</p>
      ) : (
        <div style={s.calOuter}>
          <CalendarToolbar
            date={date}
            view={view}
            onNavigate={handleNavigate}
            onView={setView}
            onAddEvent={() => {
              const now = new Date();
              const start = new Date(now);
              start.setMinutes(now.getMinutes() < 30 ? 30 : 0, 0, 0);
              if (now.getMinutes() >= 30) start.setHours(start.getHours() + 1);
              const end = new Date(start);
              end.setHours(start.getHours() + 1);
              setNewEventSlot({ start, end });
            }}
          />
          <FilterBar visibleGroups={visibleGroups} onToggle={toggleGroup} />
          <div style={s.calWrapper}>
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              date={date}
              view={view}
              onNavigate={setDate}
              onView={setView}
              views={[Views.MONTH, Views.WEEK]}
              style={{ height: "100%" }}
              eventPropGetter={eventPropGetter}
              components={calendarComponents}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              scrollToTime={SCROLL_TO}
              showMultiDayTimes={false}
              popup
            />
          </div>
        </div>
      )}

      {selected && (
        <EventPopup
          event={selected}
          pos={popupPos}
          onClose={() => setSelected(null)}
          onMarkDone={handleMarkDone}
          onColorChange={handleColorSelect}
          onDelete={selected.type === "custom" ? handleDeleteCustomEvent : undefined}
        />
      )}

      {newEventSlot && (
        <NewEventModal
          slot={newEventSlot}
          onClose={() => setNewEventSlot(null)}
          onSave={async (title, color, start, end) => {
            try {
              const ev = await apiFetch("/custom-events/", {
                method: "POST",
                body: JSON.stringify({ title, color, start_time: start.toISOString(), end_time: end.toISOString() }),
              });
              setCustomEvents((prev) => [...prev, ev]);
            } catch {}
            setNewEventSlot(null);
          }}
        />
      )}

      {colorPicker && (
        <ColorPickerPopover
          eventKey={colorPicker.eventKey}
          currentColor={colorPicker.color}
          x={colorPicker.x}
          y={colorPicker.y}
          onSelect={handleColorSelect}
          onClose={() => setColorPicker(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New event modal
// ---------------------------------------------------------------------------
function NewEventModal({ slot, onSave, onClose }) {
  const [title,   setTitle]   = useState("");
  const [color,   setColor]   = useState("#378ADD");
  const [dateVal, setDateVal] = useState(toDateInput(slot.start));
  const [startT,  setStartT]  = useState(toTimeInput(slot.start));
  const [endT,    setEndT]    = useState(toTimeInput(slot.end));
  const [saving,  setSaving]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const [dy, dm, dd] = dateVal.split("-").map(Number);
    const start = new Date(dy, dm - 1, dd);
    const end   = new Date(dy, dm - 1, dd);
    const [sh, sm] = startT.split(":").map(Number);
    const [eh, em] = endT.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);
    end.setHours(eh, em, 0, 0);
    if (end <= start) end.setHours(sh + 1, sm, 0, 0);
    await onSave(title.trim(), color, start, end);
    setSaving(false);
  }

  return (
    <div style={s.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHead}>
          <h3 style={s.modalTitle}>New Event</h3>
          <button style={s.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={s.modalForm}>
          <input
            style={s.modalInput}
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
          <div style={s.modalTimeRow}>
            <label style={{ ...s.modalLabel, flex: 2 }}>
              Date
              <input style={s.modalTimeInput} type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} required />
            </label>
          </div>
          <div style={s.modalTimeRow}>
            <label style={s.modalLabel}>
              Start
              <input style={s.modalTimeInput} type="time" value={startT} onChange={(e) => setStartT(e.target.value)} />
            </label>
            <label style={s.modalLabel}>
              End
              <input style={s.modalTimeInput} type="time" value={endT} onChange={(e) => setEndT(e.target.value)} />
            </label>
          </div>
          <div style={s.modalSwatchRow}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c} type="button"
                style={{ ...s.modalSwatch, background: c, boxShadow: color === c ? `0 0 0 2px #fff, 0 0 0 3.5px ${c}` : undefined }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div style={s.modalActions}>
            <button type="submit" style={s.modalSaveBtn} disabled={saving || !title.trim()}>
              {saving ? "Saving…" : "Add Event"}
            </button>
            <button type="button" style={s.modalCancelBtn} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toTimeInput(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = {
  page: {
    padding: "20px 24px",
    height: "100vh",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  msg: { color: "#6b6375", fontSize: "14px" },

  calOuter: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    borderRadius: "12px",
    border: "0.5px solid #e5e5e5",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    background: "#fff",
    // overflow intentionally NOT hidden — was clipping the day-number circle
  },
  calWrapper: {
    flex: 1,
    minHeight: 0,
  },

  // Filter bar
  filterBar: {
    display: "flex",
    gap: "8px",
    padding: "8px 16px",
    borderBottom: "1px solid #f0f0f0",
    flexShrink: 0,
  },
  filterPill: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    borderRadius: "20px",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  filterDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },

  // Day column header (week view)
  dayHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    padding: "6px 0 8px",
    overflow: "visible",
  },
  dayName: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#999",
    lineHeight: 1,
  },
  dayNum: {
    fontSize: "18px",
    fontWeight: 400,
    color: "#555",
    lineHeight: 1,
  },
  dayNumToday: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#fff",
    lineHeight: 1,
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#9D2235",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Color picker popover
  picker: {
    position: "fixed",
    zIndex: 500,
    background: "#fff",
    borderRadius: "10px",
    border: "0.5px solid #e5e5e5",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    padding: "10px 12px",
    width: "180px",
  },
  pickerHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  pickerTitle: { fontSize: "12px", color: "#999" },
  pickerClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "#aaa",
    lineHeight: 1,
    padding: "0 2px",
  },
  swatchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "6px",
  },
  swatch: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    transition: "transform 0.1s",
    padding: 0,
  },

  // New event modal
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
    zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    background: "#fff", borderRadius: "14px", padding: "24px 28px",
    width: "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    display: "flex", flexDirection: "column", gap: "14px",
  },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { margin: 0, fontSize: "17px", fontWeight: 700, color: "#08060d" },
  modalCloseBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "#9ca3af" },
  modalForm: { display: "flex", flexDirection: "column", gap: "12px" },
  modalInput: {
    padding: "9px 12px", border: "1px solid #e5e4e7", borderRadius: "8px",
    fontSize: "14px", width: "100%", boxSizing: "border-box",
  },
  modalTimeRow: { display: "flex", gap: "12px" },
  modalLabel: { flex: 1, display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  modalTimeInput: {
    padding: "6px 8px", border: "1px solid #e5e4e7", borderRadius: "6px",
    fontSize: "13px", width: "100%", boxSizing: "border-box",
  },
  modalSwatchRow: { display: "flex", flexWrap: "wrap", gap: "7px" },
  modalSwatch: { width: "22px", height: "22px", borderRadius: "50%", border: "none", cursor: "pointer", padding: 0 },
  modalActions: { display: "flex", gap: "8px", marginTop: "2px" },
  modalSaveBtn: {
    flex: 1, padding: "9px", background: "#9D2235", color: "#fff",
    border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
  },
  modalCancelBtn: {
    padding: "9px 16px", background: "#fff", border: "1px solid #e5e4e7",
    borderRadius: "8px", fontSize: "14px", cursor: "pointer", color: "#6b6375",
  },
};
