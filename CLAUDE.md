# USC Student Hub — CLAUDE.md

A student productivity web app for USC students. Tracks classes, assignments, todos, grades, and a calendar, with AI-powered syllabus parsing.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite (JavaScript) — `frontend/` |
| Backend | FastAPI (Python 3.14) — `backend/` |
| Database + Auth | Supabase (Postgres + Google OAuth) |
| AI | Gemini API (`gemini-2.5-flash-lite`) via `google-generativeai` |
| PDF parsing | PyMuPDF (`fitz`) |
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
- `backend/.env` — `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `frontend/.env` — `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Directory structure

```
backend/
  main.py                         # FastAPI app, CORS, router registration
  app/
    config.py                     # Loads .env vars
    dependencies.py               # get_token(), get_user_id() helpers
    supabase_client.py            # get_supabase(token) → RLS-scoped client
    routes/
      assignments.py              # CRUD + PATCH (is_done, grade, category_id)
      classes.py                  # CRUD for class records
      todos.py                    # CRUD for todos
      grade_categories.py         # CRUD for per-class grade weight categories
      syllabus.py                 # POST /upload-syllabus → Gemini PDF parsing
      health.py                   # GET /health

frontend/src/
  App.jsx                         # Router, auth guard (Google login via Supabase)
  api/
    client.js                     # apiFetch() wrapper + uploadSyllabus()
    supabase.js                   # Supabase browser client
  pages/
    Classes.jsx                   # Class list, syllabus upload trigger
    Assignments.jsx               # Assignments grouped by class, sorted done-last
    Todos.jsx                     # (legacy) original flat todo list
    Matrix.jsx                    # Eisenhower priority matrix (/matrix) — todos + assignments
    Calendar.jsx                  # react-big-calendar with class blocks + due dates
    Grades.jsx                    # Grade calculator (weighted categories)
    FocusTimer.jsx                # Dark-theme countdown timer with session log (/focus)
    SyllabusSearch.jsx            # Public syllabus search + import (/syllabus-search)
    Login.jsx                     # Google OAuth sign-in page
  components/
    AddClassForm.jsx              # Inline form to manually add a class
    AddAssignmentForm.jsx         # Inline form to add an assignment
    AddTodoForm.jsx               # Inline form to add a todo
    AssignmentCard.jsx            # Card with Mark Done / Edit Grade / Undo / Delete
    ClassCard.jsx                 # Class info card with delete
    GradeCard.jsx                 # Per-class grade breakdown with editable weights
    TodoItem.jsx                  # Todo row with checkbox and delete
    SyllabusUpload.jsx            # PDF upload → Gemini preview modal → save
    EventPopup.jsx                # Calendar click popup (class/assignment/todo details)
    Navbar.jsx                    # Top nav with page links + sign-out
  utils/
    calendarUtils.js              # parseMeetingTimesStr(), buildAllEvents(), PALETTE
    saveClassFromGemini.js        # Shared utility: create class+categories+assignments+OH from Gemini JSON
  hooks/
    useAuth.js                    # Supabase session listener
```

---

## Database schema (Supabase, all rows RLS-scoped to user_id)

```
classes         id, user_id, name, location, meeting_times (text), semester, created_at
assignments     id, user_id, class_id→classes, category_id→grade_categories,
                title, due_date, grade (float), is_done (bool), created_at
todos           id, user_id, title, due_date, is_done, created_at
grade_categories  id, user_id, class_id→classes, name, weight (float 0–100)
office_hours    id, user_id, class_id→classes, day (text), start_time (text),
                end_time (text), location (text), created_at
public_syllabi  id, uploaded_by_user_id, class_name, class_code (nullable),
                semester, raw_text, gemini_json (jsonb), created_at
                RLS: SELECT for all authenticated users; INSERT/UPDATE for owner only
```

**Supabase migration SQL for `office_hours`:**
```sql
create table office_hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  class_id uuid references classes(id) on delete cascade not null,
  day text not null,
  start_time text not null,
  end_time text not null,
  location text not null default '',
  created_at timestamptz default now()
);
alter table office_hours enable row level security;
create policy "Users manage own office hours" on office_hours for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Liveness check |
| GET/POST | /classes/ | List / create class |
| DELETE | /classes/{id} | Delete class |
| GET/POST | /assignments/ | List (with JOIN classes+grade_categories) / create |
| PATCH | /assignments/{id} | Update is_done, grade, or category_id |
| DELETE | /assignments/{id} | Delete assignment |
| GET/POST/PATCH/DELETE | /todos/ | Full CRUD for todos |
| GET/POST/PATCH/DELETE | /grade-categories/ | Full CRUD for grade weight categories |
| GET/POST | /office-hours/ | List all / create office hours entry |
| DELETE | /office-hours/{id} | Delete office hours entry |
| POST | /upload-syllabus/ | PDF → Gemini → returns structured JSON |
| GET | /syllabus-search/?q= | Case-insensitive search on class_name + class_code in public_syllabi |
| POST | /syllabus-search/ | Save confirmed syllabus to public_syllabi (called at confirm time, not parse time) |

**Assignment PATCH note:** Uses `exclude_unset=True` so `grade: null` can be sent explicitly when undoing a completion.

---

## Features

### Classes page (`/`)
- Add classes manually (name, location, meeting_times, semester)
- Upload syllabus PDF → Gemini extracts class info, grade weights, and assignments → editable preview modal → confirm saves everything
- Meeting times field is editable in the preview so the user can fix Gemini's format if needed
- Delete classes

### Assignments page (`/assignments`)
- Assignments grouped by class, sorted by due date (done items always at bottom)
- Mark Done → enter grade → confirmed
- Edit Grade — re-enter grade on already-completed assignment
- Undo — marks assignment incomplete, clears grade
- Delete assignment

### Priority Matrix page (`/matrix`)
- Eisenhower 2×2 grid: Q1 Do First (urgent+important), Q2 Schedule (not urgent+important), Q3 Delegate (urgent+not important), Q4 Eliminate (not urgent+not important)
- Shows all undone todos and assignments due within 14 days (undated items always shown in Q2/Q4)
- Assignments = Important; due ≤ 2 days = Urgent
- Drag-and-drop between quadrants via `@dnd-kit/core`; overrides persisted to `localStorage` (`matrix-overrides` key)
- Checking an assignment card prompts for grade before marking done; todos mark done immediately
- Collapsible "Completed" panel at the bottom lists done items with Undo button
- AddTodoForm embedded in Q3

### Focus Timer page (`/focus`)
- Dark-theme full-screen countdown timer (no Pomodoro presets)
- Click-to-edit H/M/S fields; Start / Pause / Resume / Reset controls
- Optional session label ("What are you working on?")
- On completion: plays a soft ascending chime (C5→E5→G5) via Web Audio API, shows "Session complete!" banner
- Tab title shows remaining time while running (e.g. `25:00 — Focus`); restored on pause/reset/complete
- Session log in `localStorage` (`focus_sessions` key): last 10 sessions with label, duration, timestamp. "Clear history" button.

### Calendar page (`/calendar`)
- Week and month views via `react-big-calendar`
- Class meeting blocks generated from `meeting_times` string (4 weeks back → 20 weeks forward)
- Office hours blocks generated weekly from the `office_hours` table; styled with dashed border in the class's color
- Overlapping events (e.g. class and office hours at the same time) render side by side automatically via react-big-calendar's built-in overlap layout
- Assignment due dates shown as all-day events
- Todo due dates shown as all-day events
- Click any event → popup with details; assignments can be marked done from popup
- Each class gets a color from `PALETTE` in calendarUtils.js

### Grades page (`/grades`)
- Per-class grade card showing each grade category, weight, and graded assignments
- Calculates current grade (weighted avg of graded categories only) and projected grade (assumes 100% on remaining)
- Editable category weights inline

### Syllabus parsing
- `POST /upload-syllabus/` extracts text with PyMuPDF, sends to Gemini
- Returns: `class_name`, `class_code`, `location`, `meeting_times`, `semester`, `grade_weights[]`, `assignments[]`, `office_hours[]`
- After a successful parse, best-effort upserts a row into `public_syllabi` (keyed on uploaded_by_user_id + class_name + semester)
- Frontend shows editable preview before saving; saves class → grade categories → assignments → office hours in sequence

### Syllabus DB page (`/syllabus-search`)
- Search bar with 350ms debounce; queries `GET /syllabus-search/?q=` across class_name and class_code
- Results as expandable cards: grade weights grid, scrollable assignment list (max-height 240px), office hours, class info
- "Import to my classes" button calls `saveClassFromGemini(gemini_json, apiFetch)` — the shared utility in `utils/saveClassFromGemini.js`
- Import status tracked per card: idle → importing → done (link to /classes) or error
- **Save flow**: `POST /syllabus-search/` is called by `SyllabusUpload.jsx` at confirm time (after user reviews/edits the preview), using the final class_name. This avoids silent failures when Gemini returns null for class_name on the raw parse.

---

## Key utilities

### `parseMeetingTimesStr(str)` in `calendarUtils.js`
Parses meeting times like `"Mon/Wed/Fri 10:00-10:50am"` or `"Tue/Thu 2:00-3:20pm"` into `{ days, startHour, startMin, endHour, endMin }`.
- Canonical format: 3-letter abbreviations separated by slashes (`Mon/Wed/Fri`, `Tue/Thu`)
- Also accepts comma- or space-separated days and full names (`Monday Wednesday Friday`)
- Accepts hyphen, en dash, em dash as time separators
- AM/PM optional on both sides (inherits end → start; treats bare numbers as 24-hour)
- Tries days before the time range, then after (handles both orderings)

### Auth pattern
All API calls go through `apiFetch()` which attaches `Authorization: Bearer <supabase_access_token>`. Backend extracts and validates the token in `get_token()` / `get_user_id()`, then creates a user-scoped Supabase client so RLS policies apply automatically.

---

## Conventions
- Frontend styles are inline JS objects (`const s = { ... }`) at the bottom of each file
- No TypeScript — plain `.jsx`/`.js` throughout
- API errors throw with the HTTP status; components catch and display in red
- Dates stored as `YYYY-MM-DD` strings; parsed with `isoToDate()` to avoid timezone offset issues
