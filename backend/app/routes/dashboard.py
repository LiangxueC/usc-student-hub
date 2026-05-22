from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

DEFAULT_LAYOUT = [
    {"id": "priority_matrix",    "visible": True,  "order": 0, "size": "large"},
    {"id": "upcoming_deadlines", "visible": True,  "order": 1, "size": "medium"},
    {"id": "todays_schedule",    "visible": True,  "order": 2, "size": "medium"},
    {"id": "grades",             "visible": True,  "order": 3, "size": "medium"},
    {"id": "degree_progress",    "visible": True,  "order": 4, "size": "small"},
    {"id": "usc_news",           "visible": True,  "order": 5, "size": "medium"},
    {"id": "focus_timer",        "visible": True,  "order": 6, "size": "small"},
    {"id": "group_activity",     "visible": True,  "order": 7, "size": "small"},
    {"id": "syllabus_search",    "visible": False, "order": 8, "size": "small"},
]


@router.get("/layout")
async def get_layout(token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    result = (
        sb.table("dashboard_layout")
        .select("layout_json")
        .eq("user_id", user_id)
        .execute()
    )
    if result.data:
        return {"layout": result.data[0]["layout_json"]}
    return {"layout": DEFAULT_LAYOUT}


class LayoutBody(BaseModel):
    layout: list[dict[str, Any]]


@router.put("/layout")
async def put_layout(body: LayoutBody, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    sb.table("dashboard_layout").upsert(
        {
            "user_id": user_id,
            "layout_json": body.layout,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id",
    ).execute()
    return {"ok": True}
