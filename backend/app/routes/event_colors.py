from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/event-colors", tags=["event-colors"])


@router.get("/")
async def get_event_colors(token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    result = (
        sb.table("event_colors")
        .select("event_key, color")
        .eq("user_id", user_id)
        .execute()
    )
    return {row["event_key"]: row["color"] for row in result.data}


class ColorUpdate(BaseModel):
    event_key: str
    color: str


@router.put("/")
async def put_event_color(body: ColorUpdate, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    sb.table("event_colors").upsert(
        {"user_id": user_id, "event_key": body.event_key, "color": body.color},
        on_conflict="user_id,event_key",
    ).execute()
    return {"ok": True}
