import json
import re

import fitz  # PyMuPDF
from google import genai
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import GEMINI_API_KEY
from app.dependencies import get_token

router = APIRouter(prefix="/upload-syllabus", tags=["syllabus"])

PROMPT = """Extract the following from this course syllabus and return ONLY valid JSON with no markdown, no code fences, no extra text:
{
  "class_name": "string or null",
  "location": "string or null",
  "meeting_times": "string or null",
  "semester": "string or null",
  "grade_weights": [
    { "category": "string", "weight": "number" }
  ],
  "assignments": [
    {
      "title": "string",
      "due_date": "YYYY-MM-DD or null",
      "category": "string matching one of the grade_weights category names, or null"
    }
  ]
}

Rules:
- grade_weights are grading categories like Homework, Midterm, Final, Quizzes, etc. with their percentage weights.
- Each assignment's category must exactly match one of the grade_weights category names if possible.
- If a field is not found, use null.

Syllabus text:
"""


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    return json.loads(cleaned.strip())


@router.post("/")
async def upload_syllabus(
    file: UploadFile = File(...),
    token: str = Depends(get_token),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()

    # Extract text with PyMuPDF
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = "".join(page.get_text() for page in doc)
        doc.close()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read PDF: {e}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF appears to have no extractable text.")

    text = text[:50_000]

    # Call Gemini via the new google-genai SDK
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=PROMPT + text,
        )
        raw = response.text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

    try:
        parsed = _extract_json(raw)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=422,
            detail="Gemini returned malformed JSON. Try uploading a different PDF.",
        )

    return parsed
