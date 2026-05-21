import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const SOURCE_STYLES = {
  "USC News":     { bg: "#fef2f2", color: "#9b1b30",  border: "#fecaca" },
  "Daily Trojan": { bg: "#eff6ff", color: "#1d4ed8",  border: "#bfdbfe" },
  "BBC News":     { bg: "#fefce8", color: "#854d0e",  border: "#fde68a" },
};

function badgeStyle(source) {
  return SOURCE_STYLES[source] ?? { bg: "#f3f4f6", color: "#6b6375", border: "#e5e4e7" };
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function USCNews() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/usc-news/");
      setData(result);
      setFetchedAt(result.fetched_at ? new Date(result.fetched_at) : new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, SIX_HOURS_MS);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.errorCard}>
          <span style={s.errorIcon}>📰</span>
          <p style={s.errorTitle}>News unavailable right now — try again later</p>
          <p style={s.errorDetail}>We couldn't reach the news sources. Check your connection or try in a moment.</p>
          <button style={s.retryBtn} onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  const { usc_tldr, world_tldr, usc_items = [], world_items = [] } = data;

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>News Digest</h2>
        {fetchedAt && (
          <p style={s.lastUpdated}>
            Last updated {fetchedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {fmtTime(fetchedAt.toISOString())}
            &nbsp;·&nbsp;refreshes every 6 hours
          </p>
        )}
      </div>

      <NewsSection
        title="USC Campus"
        accent="#9b1b30"
        tldr={usc_tldr}
        items={usc_items}
      />

      <NewsSection
        title="World News"
        accent="#1d4ed8"
        tldr={world_tldr}
        items={world_items}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section (TL;DR card + feed)
// ---------------------------------------------------------------------------

function NewsSection({ title, accent, tldr, items }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeaderRow}>
        <span style={{ ...s.sectionDot, background: accent }} />
        <h3 style={{ ...s.sectionTitle, color: accent }}>{title}</h3>
        <span style={s.sectionCount}>{items.length} stories</span>
      </div>

      {tldr && (
        <div style={{ ...s.tldrCard, borderLeftColor: accent }}>
          <span style={s.tldrBadge}>TL;DR</span>
          <p style={s.tldrText}>{tldr}</p>
        </div>
      )}

      <div style={s.feed}>
        {items.map((item, i) => <NewsCard key={i} item={item} />)}
        {items.length === 0 && (
          <p style={s.emptyFeed}>No stories loaded for this section.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// News card
// ---------------------------------------------------------------------------

function NewsCard({ item }) {
  const { headline, source, url, date, summary } = item;
  const bs = badgeStyle(source);

  return (
    <div style={s.card}>
      <div style={s.cardMeta}>
        <span style={{ ...s.badge, background: bs.bg, color: bs.color, border: `1px solid ${bs.border}` }}>
          {source}
        </span>
        <span style={s.cardDate}>{date}</span>
      </div>

      <p style={s.headline}>{headline}</p>
      <p style={s.summary}>{summary}</p>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={s.readMore}
        >
          Read more →
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div style={{ ...s.skel, width: "160px", height: "24px" }} />
        <div style={{ ...s.skel, width: "220px", height: "13px" }} />
      </div>

      {[0, 1].map((si) => (
        <div key={si} style={s.section}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ ...s.skel, width: "10px", height: "10px", borderRadius: "50%" }} />
            <div style={{ ...s.skel, width: "120px", height: "18px" }} />
          </div>
          <div style={{ ...s.tldrCard, borderLeftColor: "#e5e4e7" }}>
            <div style={{ ...s.skel, width: "48px", height: "12px", borderRadius: "10px", marginBottom: "8px" }} />
            <div style={{ ...s.skel, width: "100%", height: "14px", marginBottom: "5px" }} />
            <div style={{ ...s.skel, width: "88%",  height: "14px", marginBottom: "5px" }} />
            <div style={{ ...s.skel, width: "70%",  height: "14px" }} />
          </div>
          <div style={s.feed}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={s.card}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <div style={{ ...s.skel, width: "80px", height: "20px", borderRadius: "10px" }} />
                  <div style={{ ...s.skel, width: "72px", height: "12px" }} />
                </div>
                <div style={{ ...s.skel, width: "92%", height: "17px", marginTop: "2px" }} />
                <div style={{ ...s.skel, width: "100%", height: "13px" }} />
                <div style={{ ...s.skel, width: "80%",  height: "13px" }} />
                <div style={{ ...s.skel, width: "72px", height: "13px", marginTop: "2px" }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = {
  page: {
    padding: "32px",
    maxWidth: "760px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "36px",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "8px",
  },
  pageTitle:   { margin: 0, fontSize: "22px", fontWeight: 700, color: "#08060d" },
  lastUpdated: { margin: 0, fontSize: "12px", color: "#9ca3af" },

  // ---- Section ----
  section: { display: "flex", flexDirection: "column", gap: "14px" },
  sectionHeaderRow: { display: "flex", alignItems: "center", gap: "8px" },
  sectionDot: { width: "9px", height: "9px", borderRadius: "50%", flexShrink: 0 },
  sectionTitle: { margin: 0, fontSize: "16px", fontWeight: 700 },
  sectionCount: { fontSize: "12px", color: "#9ca3af", marginLeft: "2px" },

  // ---- TL;DR card ----
  tldrCard: {
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderLeft: "4px solid transparent",
    borderRadius: "10px",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  tldrBadge: {
    alignSelf: "flex-start",
    padding: "2px 8px",
    background: "#f3f4f6",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#6b6375",
  },
  tldrText: { margin: 0, fontSize: "14px", color: "#08060d", lineHeight: 1.7 },

  // ---- Feed ----
  feed: { display: "flex", flexDirection: "column", gap: "12px" },
  emptyFeed: { margin: 0, fontSize: "13px", color: "#9ca3af", padding: "8px 0" },

  // ---- Card ----
  card: {
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "10px",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    transition: "box-shadow 0.15s",
  },
  cardMeta: { display: "flex", alignItems: "center", gap: "10px" },
  badge: {
    padding: "2px 9px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  cardDate:  { fontSize: "12px", color: "#9ca3af" },
  headline: { margin: 0, fontSize: "15px", fontWeight: 600, color: "#08060d", lineHeight: 1.45 },
  summary:  { margin: 0, fontSize: "13px", color: "#6b6375", lineHeight: 1.65 },
  readMore: {
    alignSelf: "flex-start",
    fontSize: "13px",
    color: "#9b1b30",
    fontWeight: 500,
    textDecoration: "none",
  },

  // ---- Error ----
  errorCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "64px 40px",
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "12px",
    textAlign: "center",
  },
  errorIcon:   { fontSize: "36px" },
  errorTitle:  { margin: 0, fontSize: "16px", fontWeight: 600, color: "#08060d" },
  errorDetail: { margin: 0, fontSize: "13px", color: "#6b6375", maxWidth: "380px" },
  retryBtn: {
    marginTop: "4px",
    padding: "9px 22px",
    background: "#9b1b30",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  // ---- Skeleton ----
  skel: {
    background: "#f3f4f6",
    borderRadius: "5px",
    flexShrink: 0,
  },
};
