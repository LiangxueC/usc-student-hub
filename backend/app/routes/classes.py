from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/classes", tags=["classes"])


class ClassCreate(BaseModel):
    name: str
    location: str | None = None
    meeting_times: str | None = None
    semester: str | None = None


@router.get("/")
async def list_classes(token: str = Depends(get_token)):
    sb = get_supabase(token)
    result = sb.table("classes").select("*").order("created_at", desc=True).execute()
    return result.data


@router.post("/")
async def create_class(body: ClassCreate, token: str = Depends(get_token)):
    sb = get_supabase(token)
    user_id = get_user_id(token)
    result = sb.table("classes").insert({
        "user_id": user_id,
        "name": body.name,
        "location": body.location,
        "meeting_times": body.meeting_times,
        "semester": body.semester,
    }).execute()
    return result.data[0]


@router.delete("/{class_id}")
async def delete_class(class_id: str, token: str = Depends(get_token)):
    sb = get_supabase(token)
    sb.table("classes").delete().eq("id", class_id).execute()
    return {"ok": True}
