import json
import re
from datetime import datetime, timedelta
from urllib.request import urlopen, Request

from fastapi import APIRouter, HTTPException
from google import genai

from app.config import GEMINI_API_KEY

router = APIRouter(prefix="/usc-news", tags=["usc-news"])

_cache: dict = {"data": None, "expires_at": None}

USC_SOURCES = [
    "https://news.usc.edu",
    "https://dailytrojan.com",
]

WORLD_SOURCES = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
]

NEWS_PROMPT = """\
You are a news digest assistant. Today is {today}.

Below is content fetched from USC campus news sources and a BBC World News RSS feed.
Extract and summarize the most recent and relevant stories from each.

--- USC CAMPUS CONTENT ---
{usc_content}

--- BBC WORLD NEWS RSS ---
{world_content}

Return ONLY valid JSON (no markdown, no code fences):
{{
  "usc_tldr": "3-sentence digest summarizing today's USC/campus news",
  "world_tldr": "3-sentence digest summarizing today's world news",
  "usc_items": [
    {{
      "headline": "string",
      "source": "USC News or Daily Trojan",
      "url": "string (full article URL if found; otherwise source homepage)",
      "date": "string (e.g. May 20, 2025 — use 'Recent' if not found)",
      "summary": "2-3 sentence summary of the story"
    }}
  ],
  "world_items": [
    {{
      "headline": "string",
      "source": "BBC News",
      "url": "string (from RSS <link> tag)",
      "date": "string",
      "summary": "2-3 sentence summary of the story"
    }}
  ]
}}

Include 5-7 items in usc_items and 4-5 items in world_items. \
Prefer the most recent and newsworthy stories. Do not invent stories.
"""


def _fetch(url: str) -> str:
    req = Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; USC-Student-Hub/1.0)"},
    )
    with urlopen(req, timeout=12) as resp:
        raw = resp.read()
        enc = resp.headers.get_content_charset("utf-8")
        return raw.decode(enc, errors="replace")


def _clean(text: str) -> str:
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;|&#160;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&#\d+;", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    return json.loads(cleaned.strip())


async def _build_digest() -> dict:
    global _cache

    if _cache["data"] and _cache["expires_at"] and datetime.now() < _cache["expires_at"]:
        return _cache["data"]

    usc_parts = []
    for url in USC_SOURCES:
        try:
            html = _fetch(url)
            usc_parts.append(f"=== {url} ===\n{_clean(html)[:12_000]}")
        except Exception:
            pass

    world_parts = []
    for url in WORLD_SOURCES:
        try:
            xml = _fetch(url)
            world_parts.append(f"=== {url} ===\n{_clean(xml)[:12_000]}")
        except Exception:
            pass

    usc_content  = "\n\n".join(usc_parts)  or "USC news sources unavailable."
    world_content = "\n\n".join(world_parts) or "World news sources unavailable."

    prompt = NEWS_PROMPT.format(
        today=datetime.now().strftime("%B %d, %Y"),
        usc_content=usc_content[:20_000],
        world_content=world_content[:14_000],
    )

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    result = _extract_json(response.text)
    result["fetched_at"] = datetime.now().isoformat()

    _cache["data"] = result
    _cache["expires_at"] = datetime.now() + timedelta(hours=6)
    return result


@router.get("/")
async def get_usc_news():
    try:
        return await _build_digest()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
