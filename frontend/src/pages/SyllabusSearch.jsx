import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { saveClassFromGemini } from "../utils/saveClassFromGemini";

export default function SyllabusSearch() {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched,  setSearched]  = useState(false); // has a search been run?
  const [expandedId, setExpandedId] = useState(null);
  // Per-card import status: { [id]: "idle" | "importing" | "done" | "error" }
  const [importStatus, setImportStatus] = useState({});

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch(`/syllabus-search/?q=${encodeURIComponent(q)}`);
        setResults(data);
        setSearched(true);
      } catch (_) {
        setResults([]);
        setSearched(true);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleImport(result) {
    const id = result.id;
    setImportStatus((prev) => ({ ...prev, [id]: "importing" }));
    try {
      await saveClassFromGemini(result.gemini_json, apiFetch);
      setImportStatus((prev) => ({ ...prev, [id]: "done" }));
    } catch (e) {
      setImportStatus((prev) => ({ ...prev, [id]: "error:" + e.message }));
    }
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <h2 style={s.title}>Syllabus Database</h2>
        <p style={s.sub}>Search syllabi uploaded by USC students. Import any result directly into your classes.</p>
      </div>

      {/* Search bar */}
      <div style={s.searchRow}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>🔍</span>
          <input
            style={s.searchInput}
            placeholder="Search by class name or code (e.g. CSCI 104, Data Structures)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {searching && <span style={s.spinner} />}
        </div>
      </div>

      {/* Results */}
      {!query.trim() && (
        <p style={s.hint}>Start typing to search syllabi shared by other USC students.</p>
      )}

      {searched && !searching && results.length === 0 && (
        <p style={s.hint}>No syllabi found for "{query}". Try a different search.</p>
      )}

      {results.length > 0 && (
        <p style={s.count}>{results.length} result{results.length !== 1 ? "s" : ""}</p>
      )}

      <div style={s.list}>
        {results.map((r) => {
          const expanded = expandedId === r.id;
          const g = r.gemini_json ?? {};
          const status = importStatus[r.id] ?? "idle";
          const isDone  = status === "done";
          const isErr   = typeof status === "string" && status.startsWith("error:");
          const errMsg  = isErr ? status.slice(6) : "";

          return (
            <div key={r.id} style={s.card}>
              {/* Card header — always visible */}
              <button style={s.cardHeader} onClick={() => toggleExpand(r.id)}>
                <div style={s.cardLeft}>
                  <div style={s.cardTitleRow}>
                    <span style={s.cardName}>{r.class_name}</span>
                    {r.class_code && <span style={s.codeBadge}>{r.class_code}</span>}
                  </div>
                  <div style={s.cardMeta}>
                    {r.semester && <span style={s.metaChip}>📅 {r.semester}</span>}
                    <span style={s.metaChip}>🕐 {fmtDate(r.created_at)}</span>
                    <span style={s.metaChip}>
                      {(g.assignments ?? []).length} assignments · {(g.grade_weights ?? []).length} grade categories
                    </span>
                  </div>
                </div>
                <span style={s.chevron}>{expanded ? "▾" : "▸"}</span>
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div style={s.detail}>

                  {/* Grade weights */}
                  {(g.grade_weights ?? []).length > 0 && (
                    <Section label="Grade Categories">
                      <div style={s.weightGrid}>
                        {g.grade_weights.map((gw, i) => (
                          <div key={i} style={s.weightRow}>
                            <span style={s.weightName}>{gw.category}</span>
                            <span style={s.weightVal}>{gw.weight}%</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Assignments */}
                  {(g.assignments ?? []).length > 0 && (
                    <Section label={`Assignments (${g.assignments.length})`}>
                      <div style={s.asgList}>
                        {g.assignments.map((a, i) => (
                          <div key={i} style={s.asgRow}>
                            <span style={s.asgTitle}>{a.title}</span>
                            <span style={s.asgMeta}>
                              {a.due_date && <span style={s.asgDue}>{a.due_date}</span>}
                              {a.category && <span style={s.asgCat}>{a.category}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Office hours */}
                  {(g.office_hours ?? []).length > 0 && (
                    <Section label="Office Hours">
                      {g.office_hours.map((oh, i) => (
                        <div key={i} style={s.ohRow}>
                          <span style={s.ohDay}>{oh.day}</span>
                          <span style={s.ohTime}>{oh.start_time} – {oh.end_time}</span>
                          {oh.location && <span style={s.ohLoc}>📍 {oh.location}</span>}
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Meeting times / location from class info */}
                  {(g.meeting_times || g.location) && (
                    <Section label="Class Info">
                      {g.meeting_times && <p style={s.infoLine}>🕐 {g.meeting_times}</p>}
                      {g.location      && <p style={s.infoLine}>📍 {g.location}</p>}
                    </Section>
                  )}

                  {/* Import button */}
                  <div style={s.importRow}>
                    {isDone ? (
                      <span style={s.importDone}>✓ Imported — view in <a href="/" style={s.importLink}>My Classes</a></span>
                    ) : (
                      <button
                        style={{ ...s.importBtn, ...(status === "importing" ? s.importBtnBusy : {}) }}
                        onClick={() => handleImport(r)}
                        disabled={status === "importing"}
                      >
                        {status === "importing" ? "Importing…" : "Import to my classes"}
                      </button>
                    )}
                    {isErr && <p style={s.importErr}>Error: {errMsg}</p>}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={s.section}>
      <p style={s.sectionLabel}>{label}</p>
      {children}
    </div>
  );
}

const s = {
  page: {
    padding: "32px",
    maxWidth: "860px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  topBar: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    color: "#08060d",
  },
  sub: {
    margin: 0,
    fontSize: "14px",
    color: "#6b6375",
  },
  searchRow: {
    display: "flex",
    gap: "10px",
  },
  searchWrap: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    fontSize: "15px",
    pointerEvents: "none",
  },
  searchInput: {
    flex: 1,
    padding: "11px 44px 11px 42px",
    borderRadius: "10px",
    border: "1px solid #e5e4e7",
    fontSize: "14px",
    outline: "none",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    width: "100%",
    boxSizing: "border-box",
  },
  spinner: {
    position: "absolute",
    right: "14px",
    width: "16px",
    height: "16px",
    border: "2px solid #f3f4f6",
    borderTop: "2px solid #9b1b30",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  hint: {
    margin: 0,
    fontSize: "14px",
    color: "#9ca3af",
    textAlign: "center",
    padding: "24px 0",
  },
  count: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "10px",
    overflow: "hidden",
  },
  cardHeader: {
    width: "100%",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    padding: "16px 20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  cardLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  cardName: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#08060d",
  },
  codeBadge: {
    fontSize: "11px",
    fontWeight: 700,
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: "5px",
    padding: "2px 7px",
    letterSpacing: "0.03em",
  },
  cardMeta: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  metaChip: {
    fontSize: "12px",
    color: "#6b6375",
  },
  chevron: {
    fontSize: "14px",
    color: "#9ca3af",
    flexShrink: 0,
    marginTop: "2px",
  },
  detail: {
    borderTop: "1px solid #f3f4f6",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sectionLabel: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#9b1b30",
  },
  weightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "4px 16px",
  },
  weightRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#374151",
    padding: "3px 0",
    borderBottom: "1px solid #f9fafb",
  },
  weightName: {
    color: "#374151",
  },
  weightVal: {
    fontWeight: 600,
    color: "#6b6375",
  },
  asgList: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    maxHeight: "240px",
    overflowY: "auto",
  },
  asgRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "4px 0",
    borderBottom: "1px solid #f9fafb",
    fontSize: "13px",
  },
  asgTitle: {
    color: "#374151",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  asgMeta: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexShrink: 0,
  },
  asgDue: {
    fontSize: "11px",
    color: "#9ca3af",
    fontFamily: "monospace",
  },
  asgCat: {
    fontSize: "11px",
    background: "#f3f4f6",
    color: "#6b6375",
    borderRadius: "4px",
    padding: "1px 6px",
  },
  ohRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    fontSize: "13px",
    color: "#374151",
    padding: "3px 0",
  },
  ohDay: {
    fontWeight: 600,
    minWidth: "90px",
  },
  ohTime: {
    color: "#6b6375",
  },
  ohLoc: {
    color: "#9ca3af",
    fontSize: "12px",
  },
  infoLine: {
    margin: 0,
    fontSize: "13px",
    color: "#6b6375",
  },
  importRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    paddingTop: "4px",
    borderTop: "1px dashed #e5e4e7",
  },
  importBtn: {
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#9b1b30",
    color: "#fff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  importBtnBusy: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  importDone: {
    fontSize: "13px",
    color: "#15803d",
    fontWeight: 600,
  },
  importLink: {
    color: "#9b1b30",
    fontWeight: 700,
  },
  importErr: {
    margin: 0,
    fontSize: "12px",
    color: "#dc2626",
  },
};
