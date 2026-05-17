from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_ANON_KEY


def get_supabase(token: str) -> Client:
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    client.postgrest.auth(token)
    return client
