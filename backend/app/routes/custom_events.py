from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/custom-events", tags=["custom-events"])


class CustomEventCreate(BaseModel):
    title: str
    start_time: str   # ISO 8601
    end_time: str
    color: str = "#7F77DD"
    notes: str | None = None


@router.get("/")
async def list_custom_events(token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    return (
        sb.table("custom_events")
        .select("*")
        .eq("user_id", user_id)
        .order("start_time")
        .execute()
        .data
    )


@router.post("/")
async def create_custom_event(body: CustomEventCreate, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    return (
        sb.table("custom_events")
        .insert({
            "user_id": user_id,
            "title": body.title.strip(),
            "start_time": body.start_time,
            "end_time": body.end_time,
            "color": body.color,
            "notes": body.notes,
        })
        .execute()
        .data[0]
    )


@router.delete("/{event_id}")
async def delete_custom_event(event_id: str, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    sb.table("custom_events").delete().eq("id", event_id).eq("user_id", user_id).execute()
    return {"ok": True}
