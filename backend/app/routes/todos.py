from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_token, get_user_id
from app.supabase_client import get_supabase

router = APIRouter(prefix="/todos", tags=["todos"])


class TodoCreate(BaseModel):
    title: str
    due_date: str | None = None


class TodoUpdate(BaseModel):
    is_done: bool


@router.get("/")
async def list_todos(token: str = Depends(get_token)):
    sb = get_supabase(token)
    result = (
        sb.table("todos")
        .select("*")
        .order("is_done", desc=False)       # incomplete first
        .order("due_date", desc=False)       # soonest due within each group
        .execute()
    )
    return result.data


@router.post("/")
async def create_todo(body: TodoCreate, token: str = Depends(get_token)):
    sb = get_supabase(token)
    user_id = get_user_id(token)
    result = sb.table("todos").insert({
        "user_id": user_id,
        "title": body.title,
        "due_date": body.due_date,
    }).execute()
    return result.data[0]


@router.patch("/{todo_id}")
async def update_todo(todo_id: str, body: TodoUpdate, token: str = Depends(get_token)):
    sb = get_supabase(token)
    result = (
        sb.table("todos")
        .update({"is_done": body.is_done})
        .eq("id", todo_id)
        .execute()
    )
    return result.data[0]


@router.delete("/{todo_id}")
async def delete_todo(todo_id: str, token: str = Depends(get_token)):
    sb = get_supabase(token)
    sb.table("todos").delete().eq("id", todo_id).execute()
    return {"ok": True}
