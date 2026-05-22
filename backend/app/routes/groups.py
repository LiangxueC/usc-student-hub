import json
import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.dependencies import get_token, get_user_id, get_user_email
from app.supabase_client import get_supabase

router = APIRouter(prefix="/groups", tags=["groups"])


# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, group_id: str, ws: WebSocket):
        await ws.accept()
        self._connections.setdefault(group_id, []).append(ws)

    def disconnect(self, group_id: str, ws: WebSocket):
        conns = self._connections.get(group_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, group_id: str, payload: dict):
        for ws in list(self._connections.get(group_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                pass


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _join_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


def _assert_member(sb, group_id: str, user_id: str):
    res = (
        sb.table("group_members")
        .select("id")
        .eq("group_id", group_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=403, detail="Not a member of this group.")


# ---------------------------------------------------------------------------
# Group CRUD
# ---------------------------------------------------------------------------

class GroupCreate(BaseModel):
    name: str


@router.post("/")
async def create_group(body: GroupCreate, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    email   = get_user_email(token)
    sb      = get_supabase(token)

    code = _join_code()
    group = sb.table("groups").insert({
        "name": body.name.strip(),
        "join_code": code,
        "created_by": user_id,
    }).execute().data[0]

    sb.table("group_members").insert({
        "group_id": group["id"],
        "user_id": user_id,
        "email": email,
    }).execute()

    return group


class JoinBody(BaseModel):
    join_code: str


@router.post("/join")
async def join_group(body: JoinBody, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    email   = get_user_email(token)
    sb      = get_supabase(token)

    res = (
        sb.table("groups")
        .select("*")
        .eq("join_code", body.join_code.strip().upper())
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Group not found. Check the join code.")

    group = res.data[0]

    already = (
        sb.table("group_members")
        .select("id")
        .eq("group_id", group["id"])
        .eq("user_id", user_id)
        .execute()
    )
    if already.data:
        return group  # already a member — just return the group

    sb.table("group_members").insert({
        "group_id": group["id"],
        "user_id": user_id,
        "email": email,
    }).execute()

    return group


@router.get("/")
async def list_groups(token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    # Query through group_members so RLS scopes to only groups this user has joined.
    # The permissive SELECT policy on `groups` is intentionally kept for the join-by-code
    # lookup, but this endpoint must NOT return every group in the DB.
    rows = (
        sb.table("group_members")
        .select("joined_at, groups(*)")
        .eq("user_id", user_id)
        .order("joined_at")
        .execute()
        .data
    )
    return [row["groups"] for row in rows if row.get("groups")]


@router.get("/{group_id}/members")
async def list_members(group_id: str, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    _assert_member(sb, group_id, user_id)
    return (
        sb.table("group_members")
        .select("user_id, email, joined_at")
        .eq("group_id", group_id)
        .order("joined_at")
        .execute()
        .data
    )


@router.delete("/{group_id}")
async def delete_group(group_id: str, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)

    grp = sb.table("groups").select("created_by").eq("id", group_id).execute().data
    if not grp:
        raise HTTPException(status_code=404, detail="Group not found.")
    if grp[0]["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Only the creator can delete a group.")

    sb.table("groups").delete().eq("id", group_id).execute()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Group todos
# ---------------------------------------------------------------------------

class TodoCreate(BaseModel):
    title: str
    due_date: str | None = None


class TodoUpdate(BaseModel):
    title: str | None = None
    due_date: str | None = None
    is_done: bool | None = None


@router.get("/{group_id}/todos")
async def list_todos(group_id: str, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    _assert_member(sb, group_id, user_id)
    return (
        sb.table("group_todos")
        .select("*")
        .eq("group_id", group_id)
        .order("created_at")
        .execute()
        .data
    )


@router.post("/{group_id}/todos")
async def create_todo(group_id: str, body: TodoCreate, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    _assert_member(sb, group_id, user_id)
    return (
        sb.table("group_todos")
        .insert({
            "group_id": group_id,
            "user_id": user_id,
            "title": body.title.strip(),
            "due_date": body.due_date or None,
        })
        .execute()
        .data[0]
    )


@router.patch("/{group_id}/todos/{todo_id}")
async def update_todo(
    group_id: str, todo_id: str, body: TodoUpdate, token: str = Depends(get_token)
):
    user_id = get_user_id(token)
    sb = get_supabase(token)

    existing = (
        sb.table("group_todos")
        .select("user_id")
        .eq("id", todo_id)
        .eq("group_id", group_id)
        .execute()
        .data
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Todo not found.")
    if existing[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can update this todo.")

    updates = body.model_dump(exclude_unset=True)
    return (
        sb.table("group_todos")
        .update(updates)
        .eq("id", todo_id)
        .execute()
        .data[0]
    )


@router.delete("/{group_id}/todos/{todo_id}")
async def delete_todo(group_id: str, todo_id: str, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)

    existing = (
        sb.table("group_todos")
        .select("user_id")
        .eq("id", todo_id)
        .eq("group_id", group_id)
        .execute()
        .data
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Todo not found.")
    if existing[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this todo.")

    sb.table("group_todos").delete().eq("id", todo_id).execute()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Group messages (REST)
# ---------------------------------------------------------------------------

class MessageCreate(BaseModel):
    content: str


@router.get("/{group_id}/messages")
async def list_messages(group_id: str, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    _assert_member(sb, group_id, user_id)
    return (
        sb.table("group_messages")
        .select("*")
        .eq("group_id", group_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
        .data[::-1]  # reverse so oldest-first
    )


@router.post("/{group_id}/messages")
async def post_message(group_id: str, body: MessageCreate, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    email   = get_user_email(token)
    sb = get_supabase(token)
    _assert_member(sb, group_id, user_id)
    return (
        sb.table("group_messages")
        .insert({
            "group_id": group_id,
            "user_id": user_id,
            "email": email,
            "content": body.content.strip(),
        })
        .execute()
        .data[0]
    )


# ---------------------------------------------------------------------------
# WebSocket chat
# ---------------------------------------------------------------------------

@router.websocket("/{group_id}/ws")
async def group_ws(
    websocket: WebSocket,
    group_id: str,
    token: str = Query(...),
):
    # Validate token and membership before accepting
    try:
        user_id = get_user_id(token)
        email   = get_user_email(token)
        sb      = get_supabase(token)
        _assert_member(sb, group_id, user_id)
    except HTTPException:
        await websocket.close(code=4003)
        return
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(group_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            content = (data.get("content") or "").strip()
            if not content:
                continue

            now_iso = datetime.now(timezone.utc).isoformat()

            # Persist to DB
            try:
                sb.table("group_messages").insert({
                    "group_id": group_id,
                    "user_id": user_id,
                    "email": email,
                    "content": content,
                    "created_at": now_iso,
                }).execute()
            except Exception:
                pass

            # Broadcast to all connected group members
            await manager.broadcast(group_id, {
                "type": "message",
                "group_id": group_id,
                "user_id": user_id,
                "email": email,
                "content": content,
                "created_at": now_iso,
            })

    except WebSocketDisconnect:
        manager.disconnect(group_id, websocket)
    except Exception:
        manager.disconnect(group_id, websocket)


# ---------------------------------------------------------------------------
# Group availability
# ---------------------------------------------------------------------------

class AvailBlock(BaseModel):
    day_of_week: int   # 0=Sun … 6=Sat
    start_time: str    # "HH:MM"
    end_time: str      # "HH:MM"


@router.get("/{group_id}/availability")
async def list_availability(group_id: str, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    _assert_member(sb, group_id, user_id)
    return (
        sb.table("group_availability")
        .select("*")
        .eq("group_id", group_id)
        .order("day_of_week")
        .order("start_time")
        .execute()
        .data
    )


@router.post("/{group_id}/availability")
async def create_availability(group_id: str, body: AvailBlock, token: str = Depends(get_token)):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    _assert_member(sb, group_id, user_id)
    return (
        sb.table("group_availability")
        .insert({
            "group_id": group_id,
            "user_id": user_id,
            "day_of_week": body.day_of_week,
            "start_time": body.start_time,
            "end_time": body.end_time,
        })
        .execute()
        .data[0]
    )


@router.delete("/{group_id}/availability/{block_id}")
async def delete_availability(
    group_id: str, block_id: str, token: str = Depends(get_token)
):
    user_id = get_user_id(token)
    sb = get_supabase(token)
    existing = (
        sb.table("group_availability")
        .select("user_id")
        .eq("id", block_id)
        .eq("group_id", group_id)
        .execute()
        .data
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Block not found.")
    if existing[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this block.")
    sb.table("group_availability").delete().eq("id", block_id).execute()
    return {"ok": True}
