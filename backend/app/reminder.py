"""
Hourly background task: scan group_todos due in 2 days, send email + in-app notification,
and record in group_reminders_sent to deduplicate.

Requires SUPABASE_SERVICE_KEY (bypasses RLS for cross-user queries).
Requires SMTP_* env vars for email delivery (gracefully skips email if not set).
"""

import asyncio
import smtplib
from datetime import date, timedelta
from email.mime.text import MIMEText

from app.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
)


def _service_client():
    if not SUPABASE_SERVICE_KEY:
        return None
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def _send_email(to_email: str, todo_title: str, due_date: str, group_name: str):
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        return
    subject = f'Reminder: "{todo_title}" is due in 2 days'
    body = (
        f"<p>Hi,</p>"
        f'<p>Your group task <strong>"{todo_title}"</strong> in group <strong>{group_name}</strong> '
        f"is due on <strong>{due_date}</strong> &mdash; that's 2 days away.</p>"
        f"<p>Head to USC Student Hub to check it off when you're done.</p>"
    )
    msg = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"]    = SMTP_USER
    msg["To"]      = to_email
    try:
        with smtplib.SMTP(SMTP_HOST, int(SMTP_PORT)) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
    except Exception:
        pass  # Email failure is non-fatal


async def check_reminders():
    sc = _service_client()
    if not sc:
        return

    target = (date.today() + timedelta(days=2)).isoformat()

    # Fetch todos due in exactly 2 days that aren't done
    todos_res = (
        sc.table("group_todos")
        .select("id, title, due_date, user_id, group_id")
        .eq("due_date", target)
        .eq("is_done", False)
        .execute()
    )
    todos = todos_res.data or []
    if not todos:
        return

    # Fetch already-sent reminder ids
    sent_res = sc.table("group_reminders_sent").select("group_todo_id").execute()
    already_sent = {r["group_todo_id"] for r in (sent_res.data or [])}

    # Fetch group names for display
    group_ids = list({t["group_id"] for t in todos})
    groups_res = sc.table("groups").select("id, name").in_("id", group_ids).execute()
    group_name_map = {g["id"]: g["name"] for g in (groups_res.data or [])}

    for todo in todos:
        if todo["id"] in already_sent:
            continue

        user_id    = todo["user_id"]
        group_name = group_name_map.get(todo["group_id"], "your group")

        # Get user email via admin API
        try:
            user_resp = sc.auth.admin.get_user_by_id(user_id)
            email = user_resp.user.email if user_resp.user else None
        except Exception:
            email = None

        # Send email
        if email:
            _send_email(email, todo["title"], todo["due_date"], group_name)

        # Insert in-app notification (no RLS issue — using service client)
        sc.table("notifications").insert({
            "user_id": user_id,
            "message": f'"{todo["title"]}" in {group_name} is due in 2 days ({todo["due_date"]}).',
            "is_read": False,
        }).execute()

        # Mark as sent
        sc.table("group_reminders_sent").insert({
            "group_todo_id": todo["id"],
        }).execute()


async def reminder_loop():
    while True:
        try:
            await check_reminders()
        except Exception:
            pass
        await asyncio.sleep(3600)  # run every hour
