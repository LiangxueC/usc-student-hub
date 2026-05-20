from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/syllabus-search", tags=["syllabus_search"])


class PublicSyllabusCreate(BaseModel):
    class_name: str
    class_code: str | None = None
    semester: str | None = None
    gemini_json: dict


@router.get("/")
async def search_syllabi(q: str = "", token: str = Depends(get_token)):
    q = q.strip()[:100]
    if not q:
        return []

    sb = get_supabase(token)
    safe = q.replace("%", "").replace("_", " ").strip()
    if not safe:
        return []

    pattern = f"%{safe}%"
    result = (
        sb.table("public_syllabi")
        .select("id, class_name, class_code, semester, uploaded_by_user_id, created_at, gemini_json")
        .or_(f"class_name.ilike.{pattern},class_code.ilike.{pattern}")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return result.data


@router.post("/")
async def save_public_syllabus(body: PublicSyllabusCreate, token: str = Depends(get_token)):
    sb = get_supabase(token)
    user_id = get_user_id(token)
    try:
        result = sb.table("public_syllabi").insert({
            "uploaded_by_user_id": user_id,
            "class_name": body.class_name,
            "class_code": body.class_code,
            "semester": body.semester,
            "gemini_json": body.gemini_json,
        }).execute()
        if not result.data:
            raise HTTPException(status_code=403, detail="Insert blocked — check RLS policy on public_syllabi.")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
