from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/grade-categories", tags=["grade_categories"])


class CategoryCreate(BaseModel):
    class_id: str
    name: str
    weight: float


class CategoryUpdate(BaseModel):
    name: str | None = None
    weight: float | None = None


@router.get("/")
async def list_categories(class_id: str | None = None, token: str = Depends(get_token)):
    sb = get_supabase(token)
    query = sb.table("grade_categories").select("*").order("weight", desc=True)
    if class_id:
        query = query.eq("class_id", class_id)
    return query.execute().data


@router.post("/")
async def create_category(body: CategoryCreate, token: str = Depends(get_token)):
    sb = get_supabase(token)
    user_id = get_user_id(token)
    result = sb.table("grade_categories").insert({
        "user_id": user_id,
        "class_id": body.class_id,
        "name": body.name,
        "weight": body.weight,
    }).execute()
    return result.data[0]


@router.patch("/{category_id}")
async def update_category(category_id: str, body: CategoryUpdate, token: str = Depends(get_token)):
    sb = get_supabase(token)
    updates = body.model_dump(exclude_none=True)
    result = sb.table("grade_categories").update(updates).eq("id", category_id).execute()
    return result.data[0]


@router.delete("/{category_id}")
async def delete_category(category_id: str, token: str = Depends(get_token)):
    sb = get_supabase(token)
    sb.table("grade_categories").delete().eq("id", category_id).execute()
    return {"ok": True}
