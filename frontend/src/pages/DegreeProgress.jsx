import { useEffect, useRef, useState } from "react";
import { apiFetch, uploadAudit } from "../api/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

const GE_LS_KEY = (studentId) => `ge-assignments-${studentId}`;

function loadGEAssignments(studentId) {
  try { return JSON.parse(localStorage.getItem(GE_LS_KEY(studentId)) || "{}"); }
  catch { return {}; }
}

function saveGEAssignments(studentId, map) {
  localStorage.setItem(GE_LS_KEY(studentId), JSON.stringify(map));
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function DegreeProgress() {
  const [status, setStatus]       = useState("loading"); // loading | upload | dashboard
  const [audit, setAudit]         = useState(null);
  const [uploadedAt, setUploadedAt] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setStatus("loading");
    try {
      const data = await apiFetch("/degree/audit");
      if (data.exists) {
        setAudit(data.parsed_json);
        setUploadedAt(data.uploaded_at);
        setStatus("dashboard");
      } else {
        setStatus("upload");
      }
    } catch {
      setStatus("upload");
    }
  }

  function handleUploadSuccess({ parsed_json, uploaded_at }) {
    setAudit(parsed_json);
    setUploadedAt(uploaded_at);
    setStatus("dashboard");
  }

  if (status === "loading") {
    return (
      <div style={s.page}>
        <div style={s.centerMsg}><Spinner size={28} /> <span style={{ marginLeft: 12, color: "#6b6375" }}>Loading…</span></div>
      </div>
    );
  }

  if (status === "upload") {
    return <UploadCard onSuccess={handleUploadSuccess} />;
  }

  return (
    <Dashboard
      audit={audit}
      uploadedAt={uploadedAt}
      onReupload={() => setStatus("upload")}
    />
  );
}

// ---------------------------------------------------------------------------
// Upload card
// ---------------------------------------------------------------------------

const PARSE_MSGS = [
  "Uploading PDF…",
  "Extracting text from PDF…",
  "Analyzing your degree requirements with Gemini…",
  "Parsing course history and requirement blocks…",
  "Almost done — finalizing your audit…",
];

function UploadCard({ onSuccess }) {
  const fileRef = useRef(null);
  const [phase, setPhase]   = useState("idle"); // idle | parsing | error
  const [error, setError]   = useState(null);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (phase !== "parsing") return;
    const timers = [
      setTimeout(() => setMsgIdx(1), 2500),
      setTimeout(() => setMsgIdx(2), 5500),
      setTimeout(() => setMsgIdx(3), 9500),
      setTimeout(() => setMsgIdx(4), 13500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setPhase("parsing");
    setMsgIdx(0);
    setError(null);
    try {
      const data = await uploadAudit(file);
      onSuccess(data);
    } catch (err) {
      setPhase("error");
      setError(err.message);
    }
  }

  return (
    <div style={s.uploadPage}>
      <div style={s.uploadCard}>
        <div style={s.uploadIcon}>🎓</div>
        <h2 style={s.uploadTitle}>Upload your DegreeWorks Audit</h2>
        <p style={s.uploadInstructions}>
          Download your degree audit PDF from{" "}
          <strong>OASIS → Student Records → Degree Audit (DegreeWorks)</strong>.
          Upload it here — Gemini will parse your full requirement history automatically.
        </p>

        {phase === "parsing" ? (
          <div style={s.parsingBox}>
            <Spinner size={24} />
            <p style={s.parsingMsg}>{PARSE_MSGS[msgIdx]}</p>
            <p style={s.parsingNote}>This may take 10–15 seconds for large PDFs.</p>
          </div>
        ) : (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={handleFile}
            />
            <button style={s.chooseBtn} onClick={() => fileRef.current.click()}>
              Choose PDF file
            </button>

            {phase === "error" && (
              <div style={s.errorBox}>
                <p style={s.errorText}>{error}</p>
                <button style={s.retryBtn} onClick={() => setPhase("idle")}>Try again</button>
              </div>
            )}
          </>
        )}

        <p style={s.uploadNote}>Re-upload anytime to refresh after a new semester.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard shell
// ---------------------------------------------------------------------------

function Dashboard({ audit, uploadedAt, onReupload }) {
  const { student, requirements = [], ge_requirements = [] } = audit;

  return (
    <div style={s.page}>
      <div style={s.dashHeader}>
        <div>
          <h2 style={s.title}>Degree Progress</h2>
          <p style={s.meta}>
            {student.major} · {student.catalog_year}
            {uploadedAt && <> · updated {fmtDate(uploadedAt)}</>}
          </p>
        </div>
        <button style={s.reuploadBtn} onClick={onReupload}>Re-upload audit</button>
      </div>

      <div style={s.cols}>
        <LeftColumn student={student} />
        <CenterColumn
          requirements={requirements}
          geRequirements={ge_requirements}
          studentId={student.id}
        />
        <RightColumn audit={audit} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left column — overall progress + GPA card
// ---------------------------------------------------------------------------

function LeftColumn({ student }) {
  const {
    name, major, catalog_year, overall_gpa,
    total_units_completed: completed = 0,
    total_units_required: required = 128,
    in_progress_units: inProgress = 0,
  } = student;

  const completedPct  = clamp(Math.round(completed / required * 100), 0, 100);
  const inProgressPct = clamp(Math.round(inProgress / required * 100), 0, 100 - completedPct);
  const remaining     = Math.max(0, required - completed - inProgress);
  const semesters     = remaining > 0 ? Math.ceil(remaining / 16) : 0;

  return (
    <div style={s.leftCol}>
      <div style={s.card}>
        {/* Overall bar */}
        <div style={s.progressBarBg}>
          <div style={{ ...s.progressFill, width: `${completedPct}%` }} />
          <div style={{ ...s.progressInProgress, left: `${completedPct}%`, width: `${inProgressPct}%` }} />
        </div>
        <div style={s.barLabels}>
          <span style={s.barLabelLeft}>{completedPct}% complete</span>
          {inProgress > 0 && (
            <span style={s.barLabelRight}>{inProgress}u in progress</span>
          )}
        </div>

        <div style={s.divider} />

        {/* GPA */}
        <div style={s.gpaBlock}>
          <span style={s.gpaNumber}>{overall_gpa?.toFixed(2) ?? "—"}</span>
          <span style={s.gpaLabel}>GPA</span>
        </div>

        {/* Unit stats */}
        <div style={s.statGrid}>
          <StatRow label="Completed" value={`${completed}u`} />
          {inProgress > 0 && <StatRow label="In progress" value={`${inProgress}u`} accent="#3b82f6" />}
          <StatRow label="Remaining" value={`${remaining}u`} />
          <StatRow label="Required" value={`${required}u`} />
        </div>

        <div style={s.divider} />

        {/* Graduation estimate */}
        <div style={s.gradBlock}>
          {semesters <= 0 ? (
            <p style={s.gradText}>🎉 Graduation eligible!</p>
          ) : (
            <p style={s.gradText}>
              ~{semesters} semester{semesters !== 1 ? "s" : ""} to graduation
              <span style={s.gradNote}> (estimated at 16u/sem)</span>
            </p>
          )}
        </div>

        <div style={s.divider} />

        {/* Student info */}
        <div style={s.studentInfo}>
          {name    && <p style={s.studentName}>{name}</p>}
          {major   && <p style={s.studentDetail}>{major}</p>}
          {catalog_year && <p style={s.studentDetail}>Catalog year: {catalog_year}</p>}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, accent }) {
  return (
    <div style={s.statRow}>
      <span style={s.statLabel}>{label}</span>
      <span style={{ ...s.statValue, ...(accent ? { color: accent } : {}) }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Center column — tabs
// ---------------------------------------------------------------------------

function CenterColumn({ requirements, geRequirements, studentId }) {
  const [tab, setTab] = useState("requirements");

  return (
    <div style={s.centerCol}>
      <div style={s.tabBar}>
        <TabBtn active={tab === "requirements"} onClick={() => setTab("requirements")}>
          Requirements
        </TabBtn>
        <TabBtn active={tab === "ge"} onClick={() => setTab("ge")}>
          GE Planner
        </TabBtn>
      </div>

      {tab === "requirements" && <RequirementsTab requirements={requirements} />}
      {tab === "ge" && (
        <GEPlannerTab geRequirements={geRequirements} studentId={studentId} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button style={{ ...s.tab, ...(active ? s.tabActive : {}) }} onClick={onClick}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Requirements tab
// ---------------------------------------------------------------------------

function RequirementsTab({ requirements }) {
  if (!requirements.length) {
    return <p style={s.emptyMsg}>No requirements found in your audit.</p>;
  }
  return (
    <div style={s.sectionList}>
      {requirements.map((cat) => (
        <CategorySection key={cat.category} cat={cat} />
      ))}
    </div>
  );
}

function CategorySection({ cat }) {
  const [open, setOpen] = useState(true);
  const catPct = cat.units_required > 0
    ? clamp(Math.round(cat.units_completed / cat.units_required * 100), 0, 100)
    : 0;

  return (
    <div style={s.catCard}>
      <button style={s.catHeader} onClick={() => setOpen((v) => !v)}>
        <div style={s.catHeaderLeft}>
          <span style={s.catChevron}>{open ? "▾" : "▸"}</span>
          <span style={s.catName}>{cat.category}</span>
        </div>
        <div style={s.catHeaderRight}>
          <span style={s.catUnits}>{cat.units_completed}/{cat.units_required}u</span>
          <div style={s.miniBarBg}>
            <div style={{ ...s.miniBarFill, width: `${catPct}%` }} />
          </div>
          <span style={s.catPct}>{catPct}%</span>
        </div>
      </button>

      {open && cat.courses?.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={s.courseTable}>
            <thead>
              <tr>
                {["Code", "Course", "Units", "Term", "Grade", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cat.courses.map((c, i) => (
                <tr
                  key={i}
                  style={
                    c.status === "missing"      ? s.trMissing :
                    c.status === "in_progress"  ? s.trInProgress :
                    s.trDone
                  }
                >
                  <td style={{ ...s.td, ...s.tdCode }}>{c.code}</td>
                  <td style={s.td}>{c.name}</td>
                  <td style={{ ...s.td, textAlign: "center" }}>{c.units}</td>
                  <td style={{ ...s.td, color: "#6b6375" }}>{c.term ?? "—"}</td>
                  <td style={{ ...s.td, textAlign: "center", fontWeight: 600 }}>{c.grade ?? "—"}</td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    <StatusIcon status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === "completed")  return <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "15px" }}>✓</span>;
  if (status === "in_progress") return <span style={{ color: "#3b82f6", fontSize: "15px" }}>⟳</span>;
  return <span style={{ color: "#d1d5db", fontSize: "15px" }}>○</span>;
}

// ---------------------------------------------------------------------------
// GE Planner tab
// ---------------------------------------------------------------------------

function GEPlannerTab({ geRequirements, studentId }) {
  const [assignments, setAssignments] = useState(() => loadGEAssignments(studentId));
  const [pending, setPending]         = useState({});

  if (!geRequirements.length) {
    return <p style={s.emptyMsg}>No GE requirements found in your audit.</p>;
  }

  function confirmAssignment(courseCode, category) {
    const next = { ...assignments, [courseCode]: category };
    setAssignments(next);
    saveGEAssignments(studentId, next);
    setPending((prev) => { const n = { ...prev }; delete n[courseCode]; return n; });
  }

  // Collect courses that need assignment decisions
  const needsDecision = [];
  for (const geCat of geRequirements) {
    if (!geCat.can_double_count?.length) continue;
    for (const course of geCat.courses ?? []) {
      if (course.status === "completed" && !assignments[course.code]) {
        needsDecision.push({
          course,
          currentCat: geCat.category,
          options: [geCat.category, ...geCat.can_double_count],
        });
      }
    }
  }

  const totalGe     = geRequirements.length;
  const completedGe = geRequirements.filter((g) => g.units_completed >= g.units_required).length;

  return (
    <div style={s.sectionList}>
      {/* Unassigned panel */}
      {needsDecision.length > 0 && (
        <div style={s.unassignedPanel}>
          <p style={s.unassignedTitle}>
            ⚠ {needsDecision.length} course{needsDecision.length > 1 ? "s" : ""} can satisfy multiple GE categories — confirm your assignment
          </p>
          {needsDecision.map(({ course, options }) => (
            <div key={course.code} style={s.unassignedRow}>
              <span style={s.unassignedCode}>{course.code}</span>
              <span style={s.unassignedName}>{course.name}</span>
              <select
                style={s.selectInput}
                value={pending[course.code] ?? options[0]}
                onChange={(e) => setPending((prev) => ({ ...prev, [course.code]: e.target.value }))}
              >
                {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <button
                style={s.confirmSmallBtn}
                onClick={() => confirmAssignment(course.code, pending[course.code] ?? options[0])}
              >
                Confirm
              </button>
            </div>
          ))}
        </div>
      )}

      {/* GE category cards */}
      <div style={s.geGrid}>
        {geRequirements.map((geCat) => {
          const catPct  = geCat.units_required > 0
            ? clamp(Math.round(geCat.units_completed / geCat.units_required * 100), 0, 100)
            : 0;
          const isDone  = catPct >= 100;
          const warningCourses = (geCat.courses ?? []).filter(
            (c) => c.status === "completed" && geCat.can_double_count?.length > 0
          );

          return (
            <div key={geCat.category} style={{ ...s.geCard, ...(isDone ? s.geCardDone : {}) }}>
              <div style={s.geCardHead}>
                <span style={s.geCardName}>{geCat.category}</span>
                {isDone
                  ? <span style={s.geCheck}>✓</span>
                  : <span style={s.geUnits}>{geCat.units_completed}/{geCat.units_required}u</span>
                }
              </div>
              {!isDone && (
                <div style={s.geMiniBarBg}>
                  <div style={{ ...s.geMiniBarFill, width: `${catPct}%` }} />
                </div>
              )}
              {(geCat.courses ?? []).filter((c) => c.status !== "missing").map((c, i) => (
                <div key={i} style={s.geCourseRow}>
                  <StatusIcon status={c.status} />
                  <span style={s.geCourseCode}>{c.code}</span>
                  <span style={s.geCourseName}>{c.name}</span>
                </div>
              ))}
              {warningCourses.length > 0 && (
                <div style={s.overlapWarn}>
                  ⚠ {warningCourses.map((c) => c.code).join(", ")} could also satisfy{" "}
                  {geCat.can_double_count.join(", ")}.{" "}
                  {assignments[warningCourses[0]?.code]
                    ? `Assigned to: ${assignments[warningCourses[0].code]}.`
                    : "Confirm your assignment above."}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <p style={s.geSummary}>
        {completedGe} of {totalGe} GE categories complete · {totalGe - completedGe} remaining
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right column — tools
// ---------------------------------------------------------------------------

function RightColumn({ audit }) {
  return (
    <div style={s.rightCol}>
      <WhatIfTool audit={audit} />
      <GPACalculator student={audit.student} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// What-if tool
// ---------------------------------------------------------------------------

function WhatIfTool({ audit }) {
  const [code, setCode]         = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const [history, setHistory]   = useState([]);
  const [histOpen, setHistOpen] = useState(false);

  async function check() {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await apiFetch("/degree/what-if", {
        method: "POST",
        body: JSON.stringify({ course_code: code.trim(), course_name: name.trim() }),
      });
      setResult(data);
      setHistory((prev) => [
        { code: code.trim(), name: name.trim(), data },
        ...prev.slice(0, 4),
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const hasMatches = result && (result.matches?.length > 0 || result.ge_categories?.length > 0);

  return (
    <div style={s.toolCard}>
      <p style={s.toolTitle}>What-If Scheduler</p>

      <input
        style={s.toolInput}
        placeholder="Course code (e.g. CSCI 499)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && check()}
      />
      <input
        style={{ ...s.toolInput, marginTop: 6 }}
        placeholder="Course name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && check()}
      />
      <button style={s.toolBtn} onClick={check} disabled={loading || !code.trim()}>
        {loading ? <><Spinner size={12} /> Checking…</> : "Check Requirement"}
      </button>

      {error && <p style={s.toolError}>{error}</p>}

      {result && (
        <div style={s.whatIfResult}>
          {hasMatches ? (
            <>
              {result.matches?.map((m, i) => (
                <div key={i} style={s.matchItem}>
                  <span style={s.matchCat}>{m.category}</span>
                  <span style={s.matchReason}>{m.reasoning}</span>
                </div>
              ))}
              {result.ge_categories?.map((g, i) => (
                <div key={i} style={s.matchItem}>
                  <span style={{ ...s.matchCat, color: "#3b82f6" }}>GE: {g.category}</span>
                  <span style={s.matchReason}>{g.reasoning}</span>
                </div>
              ))}
            </>
          ) : (
            <p style={s.noMatch}>
              This course doesn't appear to satisfy any unfulfilled requirement. It may count
              as free elective units.
            </p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button style={s.histToggle} onClick={() => setHistOpen((v) => !v)}>
            {histOpen ? "▾" : "▸"} Recent checks ({history.length})
          </button>
          {histOpen && history.map((h, i) => (
            <div key={i} style={s.histRow}>
              <span style={s.histCode}>{h.code}</span>
              <span style={s.histResult}>
                {(h.data.matches?.length || 0) + (h.data.ge_categories?.length || 0) > 0
                  ? [...(h.data.matches ?? []), ...(h.data.ge_categories ?? [])].map(m => m.category).join(", ")
                  : "No match"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GPA calculator
// ---------------------------------------------------------------------------

function GPACalculator({ student }) {
  const currentGpa = student.overall_gpa ?? 0;
  const completed  = student.total_units_completed ?? 0;

  const [target, setTarget]     = useState("3.50");
  const [remaining, setRemaining] = useState("16");

  const targetNum    = parseFloat(target)    || 0;
  const remainingNum = parseFloat(remaining) || 0;

  let needed = null;
  let feasible = false;
  if (remainingNum > 0 && targetNum > 0 && completed >= 0) {
    needed = (targetNum * (completed + remainingNum) - currentGpa * completed) / remainingNum;
    feasible = needed <= 4.0 && needed >= 0;
  }

  return (
    <div style={s.toolCard}>
      <p style={s.toolTitle}>GPA Calculator</p>

      <div style={s.gpaStatRow}>
        <span style={s.gpaStatLabel}>Current GPA</span>
        <span style={s.gpaStatValue}>{currentGpa.toFixed(2)}</span>
      </div>
      <div style={s.gpaStatRow}>
        <span style={s.gpaStatLabel}>Units completed</span>
        <span style={s.gpaStatValue}>{completed}</span>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={s.calcLabel}>
          Target GPA
          <input
            style={s.calcInput}
            type="number"
            step="0.01"
            min="0"
            max="4"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </label>
        <label style={s.calcLabel}>
          Units remaining this semester
          <input
            style={s.calcInput}
            type="number"
            step="1"
            min="1"
            value={remaining}
            onChange={(e) => setRemaining(e.target.value)}
          />
        </label>
      </div>

      {needed !== null && (
        <div style={{ ...s.calcResult, ...(feasible ? s.calcGood : s.calcBad) }}>
          {feasible ? (
            <>
              <p style={s.calcResultMain}>You need a {needed.toFixed(2)} semester GPA</p>
              <p style={s.calcResultSub}>
                Reference: A = 4.0 · A– = 3.7 · B+ = 3.3 · B = 3.0
              </p>
            </>
          ) : needed < 0 ? (
            <p style={s.calcResultMain}>Your GPA already exceeds the target!</p>
          ) : (
            <>
              <p style={s.calcResultMain}>Not achievable in {remainingNum}u alone</p>
              <p style={s.calcResultSub}>Would require a {needed.toFixed(2)} GPA — above 4.0</p>
            </>
          )}
        </div>
      )}
      <p style={s.calcNote}>Assumes in-progress units count toward GPA.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared micro-components
// ---------------------------------------------------------------------------

function Spinner({ size = 16 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `${Math.max(2, size / 8)}px solid #f3f4f6`,
        borderTop: `${Math.max(2, size / 8)}px solid ${USC_RED}`,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const USC_RED = "#9b1b30";

const s = {
  page: {
    padding: "32px",
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  centerMsg: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 0",
    fontSize: "15px",
  },

  // ---- Upload ----
  uploadPage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 32px",
  },
  uploadCard: {
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "16px",
    padding: "40px 48px",
    maxWidth: "520px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    textAlign: "center",
  },
  uploadIcon:  { fontSize: "40px" },
  uploadTitle: { margin: 0, fontSize: "22px", fontWeight: 700, color: "#08060d" },
  uploadInstructions: { margin: 0, fontSize: "14px", color: "#6b6375", lineHeight: 1.6 },
  parsingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "12px 0",
  },
  parsingMsg:  { margin: 0, fontSize: "14px", fontWeight: 600, color: "#08060d" },
  parsingNote: { margin: 0, fontSize: "12px", color: "#9ca3af" },
  chooseBtn: {
    padding: "11px 28px",
    background: USC_RED,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },
  errorBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "12px 16px",
    width: "100%",
  },
  errorText:  { margin: 0, color: "#dc2626", fontSize: "13px" },
  retryBtn: {
    padding: "6px 16px",
    background: "#fff",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#dc2626",
  },
  uploadNote: { margin: 0, fontSize: "12px", color: "#9ca3af" },

  // ---- Dashboard ----
  dashHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
  },
  title:      { margin: 0, fontSize: "22px", fontWeight: 700, color: "#08060d" },
  meta:       { margin: "2px 0 0", fontSize: "13px", color: "#9ca3af" },
  reuploadBtn: {
    padding: "6px 14px",
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#6b6375",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  cols: { display: "flex", gap: "20px", alignItems: "flex-start" },

  // ---- Left column ----
  leftCol: { width: "240px", flexShrink: 0 },
  card: {
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  progressBarBg: {
    position: "relative",
    height: "14px",
    background: "#f3f4f6",
    borderRadius: "7px",
    overflow: "hidden",
  },
  progressFill: {
    position: "absolute",
    left: 0, top: 0, height: "100%",
    background: USC_RED,
    transition: "width 0.5s ease",
    borderRadius: "7px",
  },
  progressInProgress: {
    position: "absolute",
    top: 0, height: "100%",
    background: "#d4849a",
    transition: "width 0.5s ease",
  },
  barLabels: { display: "flex", justifyContent: "space-between" },
  barLabelLeft:  { fontSize: "11px", color: USC_RED, fontWeight: 600 },
  barLabelRight: { fontSize: "11px", color: "#3b82f6", fontWeight: 500 },
  divider: { height: "1px", background: "#f3f4f6" },
  gpaBlock: { display: "flex", alignItems: "baseline", gap: "6px" },
  gpaNumber: { fontSize: "40px", fontWeight: 800, color: USC_RED, lineHeight: 1 },
  gpaLabel:  { fontSize: "14px", color: "#6b6375", fontWeight: 500 },
  statGrid:  { display: "flex", flexDirection: "column", gap: "5px" },
  statRow: {
    display: "flex", justifyContent: "space-between",
    fontSize: "13px",
  },
  statLabel: { color: "#6b6375" },
  statValue: { fontWeight: 600, color: "#08060d" },
  gradBlock: {},
  gradText:  { margin: 0, fontSize: "13px", color: "#08060d", fontWeight: 500 },
  gradNote:  { color: "#9ca3af", fontWeight: 400 },
  studentInfo: { display: "flex", flexDirection: "column", gap: "2px" },
  studentName:   { margin: 0, fontSize: "13px", fontWeight: 600, color: "#08060d" },
  studentDetail: { margin: 0, fontSize: "12px", color: "#9ca3af" },

  // ---- Center column ----
  centerCol: { flex: 1, minWidth: 0 },
  tabBar: {
    display: "flex",
    gap: "4px",
    marginBottom: "12px",
    borderBottom: "1px solid #e5e4e7",
    paddingBottom: "0",
  },
  tab: {
    padding: "8px 18px",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    color: "#6b6375",
    marginBottom: "-1px",
    transition: "color 0.15s",
  },
  tabActive: {
    color: USC_RED,
    borderBottomColor: USC_RED,
  },
  sectionList: { display: "flex", flexDirection: "column", gap: "10px" },
  emptyMsg: { margin: 0, fontSize: "14px", color: "#9ca3af", padding: "16px 0" },

  // ---- Category section ----
  catCard: {
    background: "#fff",
    border: "1px solid #e5e4e7",
    borderRadius: "10px",
    overflow: "hidden",
  },
  catHeader: {
    width: "100%", background: "none", border: "none", cursor: "pointer",
    padding: "13px 18px", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: "12px", textAlign: "left",
  },
  catHeaderLeft:  { display: "flex", alignItems: "center", gap: "8px" },
  catHeaderRight: { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 },
  catChevron: { fontSize: "11px", color: "#9ca3af", width: "12px" },
  catName:    { fontSize: "14px", fontWeight: 600, color: "#08060d" },
  catUnits:   { fontSize: "12px", color: "#6b6375", whiteSpace: "nowrap" },
  miniBarBg: {
    width: "72px", height: "5px", background: "#f3f4f6",
    borderRadius: "3px", overflow: "hidden",
  },
  miniBarFill: {
    height: "100%", background: USC_RED, borderRadius: "3px", transition: "width 0.4s",
  },
  catPct: { fontSize: "12px", fontWeight: 600, color: USC_RED, width: "32px", textAlign: "right" },
  courseTable: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: {
    textAlign: "left", padding: "7px 10px",
    background: "#f9f9fb", color: "#9ca3af", fontWeight: 600,
    borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap",
  },
  td: { padding: "7px 10px", borderBottom: "1px solid #f9f9fb", verticalAlign: "middle" },
  tdCode: { fontFamily: "monospace", fontWeight: 600, color: "#6b6375", whiteSpace: "nowrap" },
  trDone:       { background: "#fff" },
  trInProgress: { background: "#eff6ff" },
  trMissing:    { background: "#fff5f5" },

  // ---- GE Planner ----
  unassignedPanel: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "10px",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  unassignedTitle: {
    margin: 0, fontSize: "13px", fontWeight: 600, color: "#92400e",
  },
  unassignedRow: {
    display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
  },
  unassignedCode: { fontSize: "12px", fontFamily: "monospace", fontWeight: 700, color: "#6b6375" },
  unassignedName: { fontSize: "13px", color: "#08060d", flex: 1, minWidth: "120px" },
  selectInput: {
    padding: "4px 8px", borderRadius: "5px", border: "1px solid #e5e4e7",
    fontSize: "12px", background: "#fff", cursor: "pointer",
  },
  confirmSmallBtn: {
    padding: "4px 12px", background: USC_RED, color: "#fff",
    border: "none", borderRadius: "5px", fontSize: "12px",
    fontWeight: 600, cursor: "pointer",
  },
  geGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "10px",
  },
  geCard: {
    background: "#fff", border: "1px solid #e5e4e7",
    borderRadius: "10px", padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  geCardDone: { borderColor: "#bbf7d0", background: "#f0fdf4" },
  geCardHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" },
  geCardName: { fontSize: "13px", fontWeight: 600, color: "#08060d", lineHeight: 1.3 },
  geCheck:    { fontSize: "14px", color: "#22c55e", fontWeight: 700, flexShrink: 0 },
  geUnits:    { fontSize: "12px", color: "#6b6375", flexShrink: 0 },
  geMiniBarBg: {
    height: "4px", background: "#f3f4f6", borderRadius: "2px", overflow: "hidden",
  },
  geMiniBarFill: {
    height: "100%", background: USC_RED, borderRadius: "2px", transition: "width 0.4s",
  },
  geCourseRow: { display: "flex", alignItems: "center", gap: "6px" },
  geCourseCode: { fontSize: "11px", fontFamily: "monospace", color: "#9ca3af", flexShrink: 0 },
  geCourseName: { fontSize: "12px", color: "#6b6375" },
  overlapWarn: {
    background: "#fffbeb", borderRadius: "6px", padding: "6px 8px",
    fontSize: "11px", color: "#92400e", lineHeight: 1.4,
  },
  geSummary: {
    margin: "4px 0 0",
    fontSize: "12px", color: "#9ca3af", textAlign: "center",
  },

  // ---- Right column ----
  rightCol: {
    width: "240px", flexShrink: 0,
    display: "flex", flexDirection: "column", gap: "14px",
  },
  toolCard: {
    background: "#fff", border: "1px solid #e5e4e7",
    borderRadius: "12px", padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  toolTitle: { margin: 0, fontSize: "13px", fontWeight: 700, color: "#08060d", textTransform: "uppercase", letterSpacing: "0.04em" },
  toolInput: {
    padding: "7px 10px", border: "1px solid #e5e4e7",
    borderRadius: "6px", fontSize: "13px", width: "100%",
    boxSizing: "border-box",
  },
  toolBtn: {
    padding: "8px 14px", background: USC_RED, color: "#fff",
    border: "none", borderRadius: "6px", fontSize: "13px",
    fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
  },
  toolError: { margin: 0, fontSize: "12px", color: "#dc2626" },
  whatIfResult: {
    background: "#f9f9fb", borderRadius: "8px", padding: "10px 12px",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  matchItem: { display: "flex", flexDirection: "column", gap: "2px" },
  matchCat:  { fontSize: "13px", fontWeight: 600, color: "#08060d" },
  matchReason: { fontSize: "12px", color: "#6b6375", fontStyle: "italic" },
  noMatch:   { margin: 0, fontSize: "12px", color: "#9ca3af" },
  histToggle: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "12px", color: "#6b6375", padding: 0,
  },
  histRow: {
    display: "flex", gap: "6px", paddingTop: "5px",
    borderBottom: "1px solid #f3f4f6", paddingBottom: "5px",
  },
  histCode:   { fontSize: "11px", fontFamily: "monospace", color: "#6b6375", flexShrink: 0 },
  histResult: { fontSize: "11px", color: "#9ca3af" },

  // ---- GPA calculator ----
  gpaStatRow: {
    display: "flex", justifyContent: "space-between",
    fontSize: "13px",
  },
  gpaStatLabel: { color: "#6b6375" },
  gpaStatValue: { fontWeight: 600, color: "#08060d" },
  calcLabel: {
    display: "flex", flexDirection: "column", gap: "4px",
    fontSize: "12px", color: "#6b6375",
  },
  calcInput: {
    padding: "6px 9px", border: "1px solid #e5e4e7",
    borderRadius: "6px", fontSize: "13px",
    width: "100%", boxSizing: "border-box",
  },
  calcResult: {
    borderRadius: "8px", padding: "10px 12px",
    display: "flex", flexDirection: "column", gap: "4px",
  },
  calcGood:        { background: "#f0fdf4", border: "1px solid #bbf7d0" },
  calcBad:         { background: "#fef2f2", border: "1px solid #fecaca" },
  calcResultMain:  { margin: 0, fontSize: "13px", fontWeight: 600, color: "#08060d" },
  calcResultSub:   { margin: 0, fontSize: "11px", color: "#6b6375" },
  calcNote:        { margin: 0, fontSize: "11px", color: "#9ca3af" },
};
