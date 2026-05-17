# USC Student Hub — Project Planning

## Stack
- Frontend: React + Vite (JavaScript)
- Backend: FastAPI (Python)
- Database: Supabase (Postgres + Auth)
- AI: Gemini API (syllabus parsing)
- Hosting: Vercel (frontend), Render (backend)

## Features
1. Assignment tracker (per class, per semester)
2. Todo list (miscellaneous tasks)
3. Dynamic calendar (auto-updates when assignments/todos added)
4. Syllabus upload → Gemini extracts assignments, class times, location, grade weights
5. Grade calculator (weights per assignment, input grade when marked done)
6. Calendar time blocks → click location → opens Google Maps

## Database Tables (Supabase)
- users (handled by Supabase Auth)
- classes (id, user_id, name, location, meeting_times, semester)
- assignments (id, user_id, class_id, title, due_date, weight, grade, is_done)
- todos (id, user_id, title, due_date, is_done)

## API Routes (FastAPI)
- POST /upload-syllabus → parse PDF with Gemini, return structured data
- GET/POST/PATCH/DELETE /assignments
- GET/POST/PATCH/DELETE /todos
- GET/POST /classes

## Key Decisions
- Google login via Supabase Auth
- PDF text extraction: PyMuPDF → send to Gemini API
- Calendar library: react-big-calendar
- Google Maps: build URL string from class location on click
- .env for all secrets, never committed to git