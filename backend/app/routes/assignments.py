from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/assignments", tags=["assignments"])


class AssignmentCreate(BaseModel):
    title: str
    class_id: str | None = None
    due_date: str | None = None   # ISO date: "2026-05-20"
    weight: float | None = None


class AssignmentUpdate(BaseModel):
    is_done: bool | None = None
    grade: float | None = None


@router.get("/")
async def list_assignments(token: str = Depends(get_token)):
    sb = get_supabase(token)
    result = (
        sb.table("assignments")
        .select("*, classes(name)")
        .order("due_date", desc=False)
        .execute()
    )
    return result.data


@router.post("/")
async def create_assignment(body: AssignmentCreate, token: str = Depends(get_token)):
    sb = get_supabase(token)
    user_id = get_user_id(token)
    inserted = sb.table("assignments").insert({
        "user_id": user_id,
        "class_id": body.class_id,
        "title": body.title,
        "due_date": body.due_date,
        "weight": body.weight,
    }).execute()
    # Re-fetch with class name joined
    created_id = inserted.data[0]["id"]
    result = sb.table("assignments").select("*, classes(name)").eq("id", created_id).execute()
    return result.data[0]


@router.patch("/{assignment_id}")
async def update_assignment(
    assignment_id: str, body: AssignmentUpdate, token: str = Depends(get_token)
):
    sb = get_supabase(token)
    updates = body.model_dump(exclude_none=True)
    sb.table("assignments").update(updates).eq("id", assignment_id).execute()
    result = sb.table("assignments").select("*, classes(name)").eq("id", assignment_id).execute()
    return result.data[0]


@router.delete("/{assignment_id}")
async def delete_assignment(assignment_id: str, token: str = Depends(get_token)):
    sb = get_supabase(token)
    sb.table("assignments").delete().eq("id", assignment_id).execute()
    return {"ok": True}
