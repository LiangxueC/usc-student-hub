# USC Student Hub — CLAUDE.md

A student productivity web app for USC students. Tracks classes, assignments, todos, grades, and a calendar, with AI-powered syllabus parsing, degree audit tracking, a live news digest, group project collaboration, and a customizable widget dashboard.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite (JavaScript) — `frontend/` |
| Backend | FastAPI (Python 3.14) — `backend/` |
| Database + Auth | Supabase (Postgres + Google OAuth) |
| AI | Gemini API (`gemini-2.5-flash-lite`) via `google-genai` |
| PDF parsing | PyMuPDF (`fitz`) |
| Drag-and-drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| Hosting | Vercel (frontend), Render (backend) |

---

## Running locally

```bash
# Backend (from repo root)
cd backend && ../venv/bin/python -m uvicorn main:app --port 8000 --reload

# Frontend (from repo root)
cd frontend && npm run dev   # → http://localhost:5173
```

**Env files (gitignored):**
- `backend/.env` — `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (optional), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional)
- `frontend/.env` — `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Directory structure

```
backend/
  main.py                         # FastAPI app, CORS, router registration, startup reminder loop
  app/
    config.py                     # Loads .env vars (incl. SUPABASE_SERVICE_KEY, SMTP_*)
    dependencies.py               # get_token(), get_user_id(), get_user_email() helpers
    supabase_client.py            # get_supabase(token) → RLS-scoped client
    reminder.py                   # Hourly asyncio task: email + in-app reminders for group todos due in 2 days
    routes/
      assignments.py              # CRUD + PATCH (is_done, grade, category_id)
      classes.py                  # CRUD for class records
      todos.py                    # CRUD for todos
      grade_categories.py         # CRUD for per-class grade weight categories
      syllabus.py                 # POST /upload-syllabus → Gemini PDF parsing
      office_hours.py             # CRUD for office hours
      syllabus_search.py          # GET search + POST save to public_syllabi
      degree.py                   # Degree audit: upload, fetch, what-if
      usc_news.py                 # GET /usc-news/ → Gemini-summarized digest (6h cache)
      groups.py                   # Groups: CRUD, join, todos, chat (REST+WS), availability
      notifications.py            # GET/PATCH/POST for in-app notification bell
      dashboard.py                # GET/PUT /dashboard/layout — widget layout persistence
      event_colors.py             # GET/PUT /event-colors/ — per-event calendar color overrides
      custom_events.py            # GET/POST/DELETE /custom-events/ — user-created calendar blocks

frontend/src/
  App.jsx                         # Router, auth guard; flex layout: Sidebar left + content right
  calendar-custom.css             # RBC style overrides (clean minimal look)
  api/
    client.js                     # apiFetch(), uploadSyllabus(), uploadAudit()
    supabase.js                   # Supabase browser client
  pages/
    Dashboard.jsx                 # Home route (/): drag-reorder widget grid + customize panel
    Classes.jsx                   # Class list, syllabus upload trigger (/classes)
    Assignments.jsx               # Assignments grouped by class, sorted done-last
    Todos.jsx                     # (legacy) original flat todo list
    Matrix.jsx                    # Eisenhower priority matrix (/matrix) — todos + assignments
    Calendar.jsx                  # react-big-calendar: classes, OH, assignments, todos, custom events (/calendar)
    Grades.jsx                    # Grade calculator (weighted categories)
    FocusTimer.jsx                # Dark-theme countdown timer with session log (/focus)
    SyllabusSearch.jsx            # Public syllabus search + import (/syllabus-search)
    DegreeProgress.jsx            # DegreeWorks audit upload + progress dashboard (/degree)
    USCNews.jsx                   # USC + world news digest, auto-refreshes every 6h (/news)
    Groups.jsx                    # Group collaboration hub: todos, chat, availability (/groups)
    Login.jsx                     # Google OAuth sign-in page
  components/
    Sidebar.jsx                   # Fixed left sidebar: nav links (Tabler icons), notifications bell, sign-out
    CalendarToolbar.jsx           # Custom RBC toolbar: Today/prev/next, date label, view toggle, "+ Add Event"
    AddClassForm.jsx              # Inline form to manually add a class
    AddAssignmentForm.jsx         # Inline form to add an assignment
    AddTodoForm.jsx               # Inline form to add a todo
    AssignmentCard.jsx            # Card with Mark Done / Edit Grade / Undo / Delete
    ClassCard.jsx                 # Class info card with delete
    GradeCard.jsx                 # Per-class grade breakdown; grades editable inline (click to edit)
    TodoItem.jsx                  # Todo row with checkbox and delete
    SyllabusUpload.jsx            # PDF upload → Gemini preview modal → save
    EventPopup.jsx                # Calendar click popup: event details + color swatches + delete (custom)
    Navbar.jsx                    # (legacy — replaced by Sidebar.jsx)
    widgets/
      WidgetCard.jsx              # Shared widget wrapper: drag handle, title, resize button, "Open →" link
      WidgetSkeleton.jsx          # Shared skeleton loader (configurable rows)
      PriorityMatrixWidget.jsx    # Mini 2×2 Eisenhower grid; click to mark done
      UpcomingDeadlinesWidget.jsx # Next 7 deadlines with urgency pills; checkbox inline
      TodaysScheduleWidget.jsx    # Today's classes as mini timeline
      GradesWidget.jsx            # Per-class grade summary with letter badge + progress bar
      DegreeProgressWidget.jsx    # SVG circular progress ring + category breakdown
      USCNewsWidget.jsx           # TL;DR quote + 4 headlines
      FocusTimerWidget.jsx        # Full working countdown timer (shares localStorage with /focus)
      GroupActivityWidget.jsx     # Groups with latest chat message + urgent todo count
      SyllabusSearchWidget.jsx    # Live search bar with 400ms debounce
  utils/
    calendarUtils.js              # parseMeetingTimesStr(), buildAllEvents() (each event has eventKey), PALETTE
    saveClassFromGemini.js        # Shared utility: create class+categories+assignments+OH from Gemini JSON
  hooks/
    useAuth.js                    # Supabase session listener
```

---

## Database schema (Supabase, all rows RLS-scoped to user_id)

```
classes           id, user_id, name, location, meeting_times (text), semester, created_at
assignments       id, user_id, class_id→classes, category_id→grade_categories,
                  title, due_date, grade (float), is_done (bool), created_at
todos             id, user_id, title, due_date, is_done, created_at
grade_categories  id, user_id, class_id→classes, name, weight (float 0–100)
office_hours      id, user_id, class_id→classes, day (text), start_time (text),
                  end_time (text), location (text), created_at
public_syllabi    id, uploaded_by_user_id, class_name, class_code (nullable),
                  semester, raw_text, gemini_json (jsonb), created_at
                  RLS: SELECT for all authenticated users; INSERT/UPDATE for owner only
degree_audits     id, user_id (unique), raw_text, parsed_json (jsonb), uploaded_at
                  RLS: user can only read/write their own row; upsert on user_id
dashboard_layout  id, user_id (unique), layout_json (jsonb), updated_at
                  RLS: user reads/writes own row only; upsert on user_id
event_colors      id, user_id, event_key (text), color (text hex), created_at
                  unique(user_id, event_key); RLS: user manages own rows
custom_events     id, user_id, title, start_time (timestamptz), end_time (timestamptz),
                  color (text hex, default '#7F77DD'), notes (text), created_at
                  RLS: user manages own rows
groups            id, name, join_code (unique 6-char), created_by, created_at
group_members     id, group_id→groups, user_id, email, joined_at; unique(group_id, user_id)
group_todos       id, group_id→groups, user_id (owner), title, due_date, is_done, created_at
group_messages    id, group_id→groups, user_id, email, content, created_at
group_availability  id, group_id→groups, user_id, day_of_week (0=Sun…6=Sat),
                  start_time (time), end_time (time), created_at
group_reminders_sent  id, group_todo_id (unique)→group_todos, sent_at
notifications     id, user_id, message, is_read (bool), created_at
```

### Critical RLS note for group_members

Self-referential SELECT policy causes infinite recursion. Fix with a `SECURITY DEFINER` function:

```sql
create or replace function get_my_group_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select group_id from group_members where user_id = auth.uid();
$$;
```

`group_members` needs **two** PERMISSIVE SELECT policies:
1. `"Members can see each other"` — `group_id in (select get_my_group_ids())`
2. `"Users see own membership"` — `auth.uid() = user_id` ← **critical**: fixes PostgREST `return=representation` after INSERT (STABLE snapshot can't see the just-inserted row; this second policy catches it)

### Full migration SQL (run in order)

```sql
-- Security definer function (run first)
create or replace function get_my_group_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select group_id from group_members where user_id = auth.uid();
$$;

-- groups
create table groups (id uuid primary key default gen_random_uuid(), name text not null, join_code text unique not null, created_by uuid references auth.users not null, created_at timestamptz default now());
alter table groups enable row level security;
create policy "All auth can read groups" on groups for select using (auth.uid() is not null);
create policy "Creator can insert" on groups for insert with check (auth.uid() = created_by);
create policy "Creator can delete" on groups for delete using (auth.uid() = created_by);

-- group_members
create table group_members (id uuid primary key default gen_random_uuid(), group_id uuid references groups(id) on delete cascade not null, user_id uuid references auth.users not null, email text, joined_at timestamptz default now(), unique(group_id, user_id));
alter table group_members enable row level security;
create policy "Members can see each other" on group_members for select using (group_id in (select get_my_group_ids()));
create policy "Users see own membership" on group_members for select using (auth.uid() = user_id);
create policy "Users join themselves" on group_members for insert with check (auth.uid() = user_id);
create policy "Users can delete own membership" on group_members for delete using (auth.uid() = user_id);

-- group_todos
create table group_todos (id uuid primary key default gen_random_uuid(), group_id uuid references groups(id) on delete cascade not null, user_id uuid references auth.users not null, title text not null, due_date date, is_done boolean default false, created_at timestamptz default now());
alter table group_todos enable row level security;
create policy "Members read todos" on group_todos for select using (group_id in (select get_my_group_ids()));
create policy "Owner insert" on group_todos for insert with check (auth.uid() = user_id);
create policy "Owner update" on group_todos for update using (auth.uid() = user_id);
create policy "Owner delete" on group_todos for delete using (auth.uid() = user_id);

-- group_messages
create table group_messages (id uuid primary key default gen_random_uuid(), group_id uuid references groups(id) on delete cascade not null, user_id uuid references auth.users not null, email text, content text not null, created_at timestamptz default now());
alter table group_messages enable row level security;
create policy "Members read messages" on group_messages for select using (group_id in (select get_my_group_ids()));
create policy "Members send messages" on group_messages for insert with check (group_id in (select get_my_group_ids()));

-- group_availability
create table group_availability (id uuid primary key default gen_random_uuid(), group_id uuid references groups(id) on delete cascade not null, user_id uuid references auth.users not null, day_of_week smallint not null check (day_of_week between 0 and 6), start_time time not null, end_time time not null, created_at timestamptz default now());
alter table group_availability enable row level security;
create policy "Members read availability" on group_availability for select using (group_id in (select get_my_group_ids()));
create policy "Owner insert availability" on group_availability for insert with check (auth.uid() = user_id);
create policy "Owner delete availability" on group_availability for delete using (auth.uid() = user_id);

-- group_reminders_sent + notifications
create table group_reminders_sent (id uuid primary key default gen_random_uuid(), group_todo_id uuid references group_todos(id) on delete cascade not null unique, sent_at timestamptz default now());
create table notifications (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null, message text not null, is_read boolean default false, created_at timestamptz default now());
alter table notifications enable row level security;
create policy "Own notifications" on notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- degree_audits
create table degree_audits (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null unique, raw_text text, parsed_json jsonb, uploaded_at timestamptz default now());
alter table degree_audits enable row level security;
create policy "Users manage own degree audit" on degree_audits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- dashboard_layout
create table dashboard_layout (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null unique, layout_json jsonb, updated_at timestamptz default now());
alter table dashboard_layout enable row level security;
create policy "Users manage own layout" on dashboard_layout for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- event_colors
create table event_colors (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null, event_key text not null, color text not null, created_at timestamptz default now(), unique(user_id, event_key));
alter table event_colors enable row level security;
create policy "Users manage own event colors" on event_colors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- custom_events
create table custom_events (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null, title text not null, start_time timestamptz not null, end_time timestamptz not null, color text not null default '#7F77DD', notes text, created_at timestamptz default now());
alter table custom_events enable row level security;
create policy "Users manage own events" on custom_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Liveness check |
| GET/POST | /classes/ | List / create class |
| PATCH/DELETE | /classes/{id} | Update / delete class |
| GET/POST | /assignments/ | List (with JOIN classes+grade_categories) / create |
| PATCH | /assignments/{id} | Update is_done, grade, or category_id |
| DELETE | /assignments/{id} | Delete assignment |
| GET/POST/PATCH/DELETE | /todos/ | Full CRUD for todos |
| GET/POST/PATCH/DELETE | /grade-categories/ | Full CRUD for grade weight categories |
| GET/POST | /office-hours/ | List all / create office hours entry |
| DELETE | /office-hours/{id} | Delete office hours entry |
| POST | /upload-syllabus/ | PDF → Gemini → returns structured JSON |
| GET | /syllabus-search/?q= | Case-insensitive search on class_name + class_code in public_syllabi |
| POST | /syllabus-search/ | Save confirmed syllabus to public_syllabi |
| POST | /degree/upload-audit | DegreeWorks PDF → Gemini → upsert degree_audits → return parsed_json |
| GET | /degree/audit | Return user's parsed_json + uploaded_at, or `{ exists: false }` |
| POST | /degree/what-if | Body: `{ course_code, course_name }` → Gemini matches against unfulfilled requirements |
| GET | /usc-news/ | Gemini-summarized USC + world news digest; 6-hour server-side cache; no auth required |
| POST | /groups/ | Create group, auto-generate join_code, add creator as member |
| POST | /groups/join | Body: `{ join_code }` → find group and add user as member |
| GET | /groups/ | List groups the current user belongs to (via group_members join) |
| GET | /groups/{id}/members | List members (user_id, email, joined_at) |
| DELETE | /groups/{id} | Delete group (creator only) |
| GET/POST | /groups/{id}/todos | List all member todos / create own todo |
| PATCH | /groups/{id}/todos/{tid} | Update own todo (title, due_date, is_done) |
| DELETE | /groups/{id}/todos/{tid} | Delete own todo |
| GET/POST | /groups/{id}/messages | Fetch last 100 messages / post a message (REST) |
| WS | /groups/{id}/ws?token= | WebSocket chat: validate token+membership, broadcast JSON |
| GET/POST/DELETE | /groups/{id}/availability | List all blocks / create own block / delete own block |
| GET | /notifications/ | Return up to 50 notifications for current user |
| PATCH | /notifications/{id}/read | Mark one notification read |
| POST | /notifications/mark-all-read | Mark all unread notifications read |
| GET | /dashboard/layout | Return user's widget layout_json or default 9-widget layout |
| PUT | /dashboard/layout | Upsert user's layout_json (body: `{ layout: [...] }`) |
| GET | /event-colors/ | Return all `{ event_key: hex }` color overrides as a flat object |
| PUT | /event-colors/ | Body: `{ event_key, color }` — upsert one color override |
| GET | /custom-events/ | List all user-created calendar blocks |
| POST | /custom-events/ | Create a custom event (`title`, `start_time`, `end_time`, `color`, `notes`) |
| DELETE | /custom-events/{id} | Delete own custom event |

**Assignment PATCH note:** Uses `exclude_unset=True` so `grade: null` can be sent explicitly when undoing a completion.

---

## Features

### Dashboard (`/`) — home route
- Left **Sidebar** replaces the old top Navbar: fixed 220px, collapses to 48px icon-only at <1100px, overlay drawer at <768px; Tabler icon webfont via CDN; notifications bell at bottom
- **Widget grid**: 3-column CSS grid (`grid-auto-rows: 280px`); small=1 row, medium=2 rows, large=2 rows+2 cols
- **Drag to reorder** via `@dnd-kit/sortable` with `rectSortingStrategy`; 800ms debounce save to `PUT /dashboard/layout`
- **Resize** button cycles small→medium→large→small per widget
- **Customize panel**: slide-in from right; toggle switches to show/hide each widget
- **9 widgets** (each self-fetching): PriorityMatrix, UpcomingDeadlines, TodaysSchedule, Grades, DegreeProgress, USCNews, FocusTimer, GroupActivity, SyllabusSearch
- **Greeting header**: time-aware ("Good morning/afternoon/evening, [first name]") + today's date

### Classes page (`/classes`)
- Add classes manually or via syllabus PDF upload

### Assignments page (`/assignments`)
- Mark Done → enter grade; Edit Grade; Undo; Delete

### Priority Matrix page (`/matrix`)
- Eisenhower 2×2 via `@dnd-kit/core`; overrides in `localStorage` (`matrix-overrides`)

### Focus Timer page (`/focus`)
- Countdown timer with Web Audio API chime; session log in `localStorage` (`focus_sessions`)
- FocusTimerWidget on Dashboard shares the same localStorage key

### Calendar page (`/calendar`)
- **Restyled**: custom CSS (`calendar-custom.css`) over RBC; clean minimal Google Calendar look; no outer title; custom toolbar component (`CalendarToolbar.jsx`) with Today/nav/view-toggle and **"+ Add Event" button**
- **Custom events**: `selectable` prop enables drag-to-create on the time grid; "+ Add Event" button opens modal with editable date, start time, end time, title, and 12-color swatch; saved to `custom_events` table; click to delete from EventPopup
- **Per-event color**: right-click any event → floating color picker (12 presets); clicking a color in EventPopup popup also works; saved to `event_colors` table; `eventKey` format: `class_{id}`, `assignment_{id}`, `todo_{id}`, `office_hours_{class_id}`, `custom_{id}`
- **Filter toggles**: 5 pill buttons (Classes, Office Hours, Assignments, Todos, My Events); persisted to `localStorage` (`calendar_visible_groups`)
- **Custom day headers**: today's date number has USC red circle; week view columns show day abbrev + date
- `eventPropGetter`: alpha-fill (`hex + "22"`) background + same-hex text color; time shown first in event block

### Grades page (`/grades`)
- Per-class grade card with editable category weights
- **Inline grade editing**: click any graded percentage → number input → Enter to confirm; PATCHes `/assignments/{id}` and updates local state immediately

### Syllabus DB page (`/syllabus-search`)
- Search + import; saves to `public_syllabi`

### Degree Progress page (`/degree`)
- DegreeWorks PDF upload → Gemini parse; Requirements tab, GE Planner tab, What-If tool, GPA Calculator

### USC News page (`/news`)
- USC + world news digest; 6-hour server-side cache; no auth

### Groups page (`/groups`)
- **Todos tab**, **Chat tab** (WebSocket), **Availability tab** (weekly grid, drag-to-add, best-times panel)

### Notifications
- Bell in Sidebar polls every 60s; hourly reminder task for group todos due in 2 days

---

## Key utilities

### `buildAllEvents()` in `calendarUtils.js`
Each event object includes an `eventKey` field for color override lookup:
- Class: `class_{cls.id}`
- Assignment: `assignment_{a.id}`
- Todo: `todo_{t.id}`
- Office hours: `office_hours_{oh.class_id ?? oh.id}`
- Custom (Calendar.jsx): `custom_{e.id}`

`event.color` is a PALETTE object `{ bg, border, text }` out of `buildAllEvents`. `Calendar.jsx` converts to a hex string via `event.color?.border` before passing to `eventPropGetter`.

### `parseMeetingTimesStr(str)` in `calendarUtils.js`
Parses `"Mon/Wed/Fri 10:00-10:50am"` → `{ days[], startHour, startMin, endHour, endMin }`.

### `uploadAudit(file)` in `api/client.js`
Multipart PDF upload to `POST /degree/upload-audit`.

### `get_my_group_ids()` PostgreSQL function
`SECURITY DEFINER` — returns current user's group IDs without triggering RLS on `group_members`.

### Auth pattern
`apiFetch()` attaches `Authorization: Bearer <token>`. Backend: `get_token()` → `get_user_id()` / `get_user_email()` → `get_supabase(token)` for RLS-scoped client. `/usc-news/` is the only public endpoint. WebSocket passes token as `?token=` query param.

---

## Conventions
- Frontend styles are inline JS objects (`const s = { ... }`) at the bottom of each file
- No TypeScript — plain `.jsx`/`.js` throughout
- API errors throw with the HTTP status; components catch and display in red
- Dates stored as `YYYY-MM-DD` strings; parsed with `isoToDate()` to avoid timezone offset issues
- localStorage keys in use: `matrix-overrides`, `focus_sessions`, `degree-overrides`, `ge-assignments-{studentId}`, `calendar_visible_groups`, `dashboard_layout` (legacy, now backend-synced)
- Tabler icons loaded via CDN webfont in `index.html`; usage: `<i className="ti ti-{name}" />`
- Calendar event colors flow: PALETTE object (buildAllEvents) → `.border` hex extraction → colorOverrides merge → `eventPropGetter` alpha-fill style
