import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # service role key — bypasses RLS for background tasks
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# SMTP config for deadline reminder emails (optional — reminders skipped if not set)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=yourapp@gmail.com
# SMTP_PASS=your_app_password
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = os.getenv("SMTP_PORT", "587")
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
