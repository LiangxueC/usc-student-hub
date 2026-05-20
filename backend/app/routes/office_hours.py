from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/office-hours", tags=["office_hours"])


class OfficeHoursCreate(BaseModel):
    class_id: str
    day: str
    start_time: str
    end_time: str
    location: str = ""


@router.get("/")
async def list_office_hours(token: str = Depends(get_token)):
    sb = get_supabase(token)
    return sb.table("office_hours").select("*, classes(name)").order("created_at").execute().data


@router.post("/")
async def create_office_hours(body: OfficeHoursCreate, token: str = Depends(get_token)):
    sb = get_supabase(token)
    user_id = get_user_id(token)
    result = sb.table("office_hours").insert({
        "user_id": user_id,
        "class_id": body.class_id,
        "day": body.day,
        "start_time": body.start_time,
        "end_time": body.end_time,
        "location": body.location,
    }).execute()
    return result.data[0]


@router.delete("/{oh_id}")
async def delete_office_hours(oh_id: str, token: str = Depends(get_token)):
    sb = get_supabase(token)
    sb.table("office_hours").delete().eq("id", oh_id).execute()
    return {"ok": True}
