from fastapi import APIRouter, Depends

from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def list_notifications(token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    return (
        sb.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
        .data
    )


@router.patch("/{notif_id}/read")
async def mark_read(notif_id: str, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    sb.table("notifications").update({"is_read": True}).eq("id", notif_id).eq("user_id", user_id).execute()
    return {"ok": True}


@router.post("/mark-all-read")
async def mark_all_read(token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    sb.table("notifications").update({"is_read": True}).eq("user_id", user_id).eq("is_read", False).execute()
    return {"ok": True}
