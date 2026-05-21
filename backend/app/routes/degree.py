import json
import re
from datetime import datetime, timezone

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from google import genai

from app.config import GEMINI_API_KEY
from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/degree", tags=["degree"])

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

AUDIT_PROMPT = """\
You are parsing a USC DegreeWorks degree audit PDF. Extract ALL information and return \
ONLY valid JSON matching this exact schema. No markdown, no code fences, no explanation.

Rules:
- status must be exactly "completed", "in_progress", or "missing"
- Separate regular major/core requirements from GE requirements into their respective arrays
- For ge_requirements, identify which other GE categories each category's courses could \
potentially also satisfy and list them in can_double_count
- Include ALL courses listed in the audit, including missing ones
- overall_gpa, total_units_completed, total_units_required, in_progress_units must be \
numbers (floats), not strings
- grade and term should be null for non-completed courses
- current_semester_courses lists courses the student is currently enrolled in

Schema:
{
  "student": {
    "name": "string",
    "id": "string",
    "major": "string",
    "catalog_year": "string",
    "overall_gpa": 3.45,
    "total_units_completed": 64.0,
    "total_units_required": 128.0,
    "in_progress_units": 16.0
  },
  "requirements": [
    {
      "category": "string",
      "units_required": 32,
      "units_completed": 24,
      "courses": [
        {
          "code": "CSCI 104",
          "name": "Data Structures and Object Oriented Design",
          "units": 4,
          "status": "completed",
          "grade": "A",
          "term": "Fall 2023"
        }
      ]
    }
  ],
  "ge_requirements": [
    {
      "category": "string",
      "units_required": 4,
      "units_completed": 4,
      "courses": [
        {
          "code": "BISC 120",
          "name": "General Biology",
          "units": 4,
          "status": "completed",
          "grade": "B+",
          "term": "Spring 2023",
          "assigned_to_ge_category": "Category A"
        }
      ],
      "can_double_count": ["Category C"]
    }
  ],
  "current_semester_courses": [
    { "code": "CSCI 356", "name": "Introduction to Computer Systems", "units": 4 }
  ]
}

DegreeWorks PDF text:
"""

WHAT_IF_PROMPT = """\
Given this USC degree audit summary, which requirement bucket(s) would the proposed course \
most likely satisfy? Only match unfulfilled requirements.

Unfulfilled requirements:
{audit_summary}

Proposed course: {course_code} — {course_name}

Return ONLY valid JSON (no markdown):
{{
  "matches": [
    {{
      "category": "string (exact category name from audit)",
      "reasoning": "string (brief 1-sentence explanation)"
    }}
  ],
  "ge_categories": [
    {{
      "category": "string",
      "reasoning": "string"
    }}
  ]
}}

If no matches, return empty arrays. Be conservative — only match if reasonably confident.
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    return json.loads(cleaned.strip())


def _build_audit_summary(parsed: dict) -> str:
    lines = []
    for cat in parsed.get("requirements", []):
        missing = [c["code"] for c in cat.get("courses", []) if c.get("status") == "missing"]
        in_prog = [c["code"] for c in cat.get("courses", []) if c.get("status") == "in_progress"]
        if missing or (cat.get("units_completed", 0) < cat.get("units_required", 1)):
            need = missing[:8]
            suffix = f" (in progress: {in_prog[:4]})" if in_prog else ""
            lines.append(f"  {cat['category']}: needs {need}{suffix}")
    for cat in parsed.get("ge_requirements", []):
        if cat.get("units_completed", 0) < cat.get("units_required", 1):
            lines.append(
                f"  GE {cat['category']}: "
                f"{cat.get('units_completed', 0)}/{cat.get('units_required', 0)} units"
            )
    return "\n".join(lines) if lines else "All requirements fulfilled."


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/upload-audit")
async def upload_audit(
    file: UploadFile = File(...),
    token: str = Depends(get_token),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    user_id = get_user_id(token)
    sb = get_supabase(token)

    pdf_bytes = await file.read()

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = "".join(page.get_text() for page in doc)
        doc.close()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read PDF: {e}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF appears to have no extractable text.")

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=AUDIT_PROMPT + text[:65_000],
        )
        raw = response.text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

    try:
        parsed = _extract_json(raw)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=422,
            detail=(
                "We couldn't read your audit PDF. Make sure you're uploading the "
                "DegreeWorks PDF from OASIS, not a transcript or other document."
            ),
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        sb.table("degree_audits").upsert(
            {
                "user_id": user_id,
                "raw_text": text[:200_000],
                "parsed_json": parsed,
                "uploaded_at": now_iso,
            },
            on_conflict="user_id",
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audit: {e}")

    return {"parsed_json": parsed, "uploaded_at": now_iso}


@router.get("/audit")
async def get_audit(token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)

    result = (
        sb.table("degree_audits")
        .select("parsed_json, uploaded_at")
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        return {"exists": False}

    row = result.data[0]
    return {"exists": True, "parsed_json": row["parsed_json"], "uploaded_at": row["uploaded_at"]}


class WhatIfRequest(BaseModel):
    course_code: str
    course_name: str = ""


@router.post("/what-if")
async def what_if(body: WhatIfRequest, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)

    result = (
        sb.table("degree_audits")
        .select("parsed_json")
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="No degree audit found. Please upload your DegreeWorks PDF first.",
        )

    parsed = result.data[0]["parsed_json"]
    audit_summary = _build_audit_summary(parsed)

    prompt = WHAT_IF_PROMPT.format(
        audit_summary=audit_summary,
        course_code=body.course_code,
        course_name=body.course_name or "unknown",
    )

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
        raw = response.text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

    try:
        return _extract_json(raw)
    except (json.JSONDecodeError, ValueError):
        return {"matches": [], "ge_categories": []}
