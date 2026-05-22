import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/client";

export default function SyllabusSearchWidget() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/syllabus-search/?q=${encodeURIComponent(query.trim())}`);
        setResults(data.slice(0, 5));
      } catch { setResults([]); }
      setLoading(false);
    }, 400);
    return () => clearTimeout(debounce.current);
  }, [query]);

  return (
    <div style={s.wrap}>
      <div style={s.searchRow}>
        <input
          style={s.input}
          placeholder="Search syllabi (class name or code)…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
        />
        {loading && <span style={s.spinner} />}
      </div>

      {results.length > 0 && (
        <div style={s.results}>
          {results.map(r => (
            <button
              key={r.id}
              style={s.resultRow}
              onClick={() => navigate("/syllabus-search")}
            >
              <span style={s.className}>{r.class_name}</span>
              {r.class_code && <span style={s.code}>{r.class_code}</span>}
              {r.semester    && <span style={s.sem}>{r.semester}</span>}
            </button>
          ))}
        </div>
      )}

      {query.trim() && !loading && results.length === 0 && (
        <p style={s.noResult}>No results found.</p>
      )}

      {!query.trim() && (
        <p style={s.hint}>Type to search USC syllabi uploaded by other students.</p>
      )}
    </div>
  );
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: "8px" },
  searchRow: { display: "flex", alignItems: "center", gap: "8px" },
  input: { flex: 1, padding: "7px 10px", border: "1px solid #e5e4e7", borderRadius: "7px", fontSize: "12px", outline: "none" },
  spinner: { width: 14, height: 14, border: "2px solid #f3f4f6", borderTop: "2px solid #9D2235", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 },
  results: { display: "flex", flexDirection: "column", gap: "2px" },
  resultRow: { display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", border: "none", background: "none", cursor: "pointer", textAlign: "left", width: "100%", transition: "background 0.1s" },
  className: { fontSize: "12px", fontWeight: 600, color: "#08060d", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  code: { fontSize: "10px", fontFamily: "monospace", color: "#6b6375", flexShrink: 0 },
  sem:  { fontSize: "10px", color: "#9ca3af", flexShrink: 0 },
  noResult: { margin: 0, fontSize: "12px", color: "#9ca3af" },
  hint: { margin: 0, fontSize: "12px", color: "#d1d5db", fontStyle: "italic" },
};
