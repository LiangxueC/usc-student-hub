from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import SUPABASE_URL
from app.routes import health, assignments, classes, todos, syllabus, grade_categories

app = FastAPI(title="USC Student Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
