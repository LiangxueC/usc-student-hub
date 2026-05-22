import asyncio
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import SUPABASE_URL
from app.routes import (
    health, assignments, classes, todos, syllabus,
    grade_categories, office_hours, syllabus_search,
    degree, usc_news, groups, notifications, dashboard, event_colors, custom_events,
)
from app.reminder import reminder_loop

app = FastAPI(title="USC Student Hub API")

# ALLOWED_ORIGINS: comma-separated list of allowed origins.
# Default includes localhost for local dev.
# In production, set ALLOWED_ORIGINS=https://your-app.vercel.app in Render env vars.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(assignments.router)
app.include_router(classes.router)
app.include_router(todos.router)
app.include_router(syllabus.router)
app.include_router(grade_categories.router)
app.include_router(office_hours.router)
app.include_router(syllabus_search.router)
app.include_router(degree.router)
app.include_router(usc_news.router)
app.include_router(groups.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(event_colors.router)
app.include_router(custom_events.router)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(reminder_loop())
