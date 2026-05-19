// Day name → day-of-week number (0 = Sun, 6 = Sat)
const DAY_MAP = {
  su: 0, sun: 0, sunday: 0,
  m: 1, mo: 1, mon: 1, monday: 1,
  t: 2, tu: 2, tue: 2, tues: 2, tuesday: 2,
  w: 3, we: 3, wed: 3, wednesday: 3,
  r: 4, th: 4, thu: 4, thur: 4, thurs: 4, thursday: 4,
  f: 5, fr: 5, fri: 5, friday: 5,
  sa: 6, sat: 6, saturday: 6,
};

export const PALETTE = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" }, // blue
  { bg: "#dcfce7", border: "#22c55e", text: "#15803d" }, // green
  { bg: "#fef3c7", border: "#f59e0b", text: "#b45309" }, // amber
  { bg: "#fce7f3", border: "#ec4899", text: "#be185d" }, // pink
  { bg: "#ffedd5", border: "#f97316", text: "#c2410c" }, // orange
  { bg: "#cffafe", border: "#06b6d4", text: "#0e7490" }, // cyan
  { bg: "#ede9fe", border: "#8b5cf6", text: "#6d28d9" }, // violet
];

const TODO_COLOR = { bg: "#f3f4f6", border: "#6b7280", text: "#374151" };

export function buildColorMap(classes) {
  const map = {};
  classes.forEach((cls, i) => {
    map[cls.id] = PALETTE[i % PALETTE.length];
  });
  return map;
}

function parseDays(daysStr) {
  const str = daysStr.toLowerCase().trim();
  const days = new Set();

  for (const part of str.split(/[/,\s]+/).filter(Boolean)) {
    if (DAY_MAP[part] !== undefined) {
      days.add(DAY_MAP[part]);
    } else {
      // Parse concatenated abbreviations like "MWF" or "TR"
      let i = 0;
      while (i < part.length) {
        const two = part.slice(i, i + 2);
        if (["th", "tu", "su", "sa"].includes(two) && DAY_MAP[two] !== undefined) {
          days.add(DAY_MAP[two]);
          i += 2;
        } else {
          const one = part[i];
          if (DAY_MAP[one] !== undefined) days.add(DAY_MAP[one]);
          i++;
        }
      }
    }
  }

  return [...days].sort((a, b) => a - b);
}

// Handles "9am", "9:30am", "2:00 PM", "14:00", "9:30"
function parseTime(timeStr, fallbackAmPm = "") {
  const m = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)?/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = (m[3] || fallbackAmPm).toLowerCase();
  if (ampm === "pm" && hours !== 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  return { hours, minutes };
}

export function parseMeetingTimesStr(str) {
  if (!str) return null;

  // Matches time ranges in all common formats:
  //   "2:00-3:20pm"          "10:00am-11:50am"
  //   "2:00 PM - 3:20 PM"    "9am-10am"
  //   "MWF 10:00-10:50am"    "Tue/Thu 3:30-4:50pm"
  // Minutes are optional on both sides; am/pm is optional on start (inherited from end).
  // End time must have am/pm so we can resolve ambiguity.
  const timeRangeRegex =
    /(\d{1,2}(?::\d{2})?\s*(?:[ap]m)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*[ap]m)/i;

  const timeMatch = str.match(timeRangeRegex);
  if (!timeMatch) return null;

  const startTimeStr = timeMatch[1].trim();
  const endTimeStr   = timeMatch[2].trim();
  const endAmPm      = /pm/i.test(endTimeStr) ? "pm" : "am";

  // Days = everything before the matched time range (not just before the first digit)
  const timeIdx = str.indexOf(timeMatch[0]);
  const daysStr = str.slice(0, timeIdx).trim();
  const days = parseDays(daysStr);
  if (!days.length) return null;

  const endTime   = parseTime(endTimeStr, "");
  const startTime = parseTime(startTimeStr, endAmPm); // inherit am/pm from end if missing
  if (!startTime || !endTime) return null;

  return {
    days,
    startHour: startTime.hours,
    startMin:  startTime.minutes,
    endHour:   endTime.hours,
    endMin:    endTime.minutes,
  };
}

function isoToDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function buildAllEvents(classes, assignments, todos, colorMap) {
  const events = [];

  // Recurring class meeting blocks: 4 weeks back → 20 weeks forward
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() - 7 * 4);
  weekStart.setHours(0, 0, 0, 0);
  const WEEK_COUNT = 24;

  for (const cls of classes) {
    const color = colorMap[cls.id];
    const parsed = parseMeetingTimesStr(cls.meeting_times);
    if (!parsed) continue;
    const { days, startHour, startMin, endHour, endMin } = parsed;

    for (let week = 0; week < WEEK_COUNT; week++) {
      for (const dow of days) {
        const base = new Date(weekStart);
        base.setDate(weekStart.getDate() + week * 7 + dow);

        const start = new Date(base);
        start.setHours(startHour, startMin, 0, 0);
        const end = new Date(base);
        end.setHours(endHour, endMin, 0, 0);

        events.push({
          id: `class-${cls.id}-w${week}-d${dow}`,
          title: cls.name,
          start,
          end,
          allDay: false,
          type: "class",
          color,
          resource: cls,
        });
      }
    }
  }

  // Assignment all-day events on due_date
  for (const a of assignments) {
    if (!a.due_date) continue;
    const color =
      a.class_id && colorMap[a.class_id] ? colorMap[a.class_id] : TODO_COLOR;
    const start = isoToDate(a.due_date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    events.push({
      id: `assignment-${a.id}`,
      title: `📝 ${a.title}`,
      start,
      end,
      allDay: true,
      type: "assignment",
      color,
      resource: a,
    });
  }

  // Todo all-day events on due_date
  for (const t of todos) {
    if (!t.due_date) continue;
    const start = isoToDate(t.due_date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    events.push({
      id: `todo-${t.id}`,
      title: `✓ ${t.title}`,
      start,
      end,
      allDay: true,
      type: "todo",
      color: TODO_COLOR,
      resource: t,
    });
  }

  return events;
}
