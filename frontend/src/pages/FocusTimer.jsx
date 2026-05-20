import { useEffect, useRef, useState } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadSessions() {
  try { return JSON.parse(localStorage.getItem("focus_sessions") || "[]"); }
  catch { return []; }
}

function saveSessions(list) {
  localStorage.setItem("focus_sessions", JSON.stringify(list.slice(-10)));
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[523.25, 0], [659.25, 0.22], [783.99, 0.44]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      osc.start(t);
      osc.stop(t + 1.5);
    });
  } catch (_) {}
}

function pad(n) { return String(n).padStart(2, "0"); }

function fmtSec(total) {
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || !parts.length) parts.push(`${s}s`);
  return parts.join(" ");
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FocusTimer() {
  const [h,         setH]         = useState(0);
  const [m,         setM]         = useState(25);
  const [sec,       setSec]       = useState(0);
  const [remaining, setRemaining] = useState(null); // null = idle (not started)
  const [running,   setRunning]   = useState(false);
  const [label,     setLabel]     = useState("");
  const [complete,  setComplete]  = useState(false);
  const [sessions,  setSessions]  = useState(loadSessions);

  const intervalRef    = useRef(null);
  const originalTitle  = useRef(document.title);
  const totalRef       = useRef(0);
  const labelRef       = useRef(label);
  labelRef.current = label; // always current without re-subscribing effects

  // ── Interval ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // ── Completion detection ──────────────────────────────────────────────────
  useEffect(() => {
    if (remaining !== 0 || !running) return;
    clearInterval(intervalRef.current);
    setRunning(false);
    setComplete(true);
    playChime();
    document.title = originalTitle.current;
    const session = {
      label: labelRef.current.trim() || "Untitled session",
      duration_seconds: totalRef.current,
      completed_at: new Date().toISOString(),
    };
    setSessions((prev) => {
      const next = [...prev, session].slice(-10);
      saveSessions(next);
      return next;
    });
  }, [remaining, running]);

  // ── Tab title ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (running && remaining !== null) {
      document.title = `${fmtSec(remaining)} — Focus`;
    } else {
      document.title = originalTitle.current;
    }
  }, [remaining, running]);

  // Restore title on page leave
  useEffect(() => () => { document.title = originalTitle.current; }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleStart() {
    if (remaining === null) {
      const total = h * 3600 + m * 60 + sec;
      if (total === 0) return;
      totalRef.current = total;
      setRemaining(total);
    }
    setComplete(false);
    setRunning(true);
  }

  function handlePause() {
    setRunning(false);
  }

  function handleReset() {
    setRunning(false);
    setRemaining(null);
    setComplete(false);
    document.title = originalTitle.current;
  }

  function handleClearHistory() {
    setSessions([]);
    localStorage.removeItem("focus_sessions");
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const isIdle  = remaining === null;
  const dispH   = isIdle ? h   : Math.floor(remaining / 3600);
  const dispM   = isIdle ? m   : Math.floor((remaining % 3600) / 60);
  const dispS   = isIdle ? sec : remaining % 60;
  const isEmpty = isIdle && h === 0 && m === 0 && sec === 0;

  return (
    <div style={s.page}>

      {/* Session label */}
      <input
        style={s.labelInput}
        placeholder="What are you working on?"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        disabled={running}
        spellCheck={false}
      />

      {/* Countdown display */}
      <div style={s.timerRow}>
        <TimeField value={dispH} onChange={(v) => setH(Math.min(99, Math.max(0, v)))} editable={isIdle} unit="hours" />
        <Colon running={running} />
        <TimeField value={dispM} onChange={(v) => setM(Math.min(59, Math.max(0, v)))} editable={isIdle} unit="minutes" />
        <Colon running={running} />
        <TimeField value={dispS} onChange={(v) => setSec(Math.min(59, Math.max(0, v)))} editable={isIdle} unit="seconds" />
      </div>

      {/* Controls */}
      <div style={s.controls}>
        {!running ? (
          <button
            style={{ ...s.btn, ...s.startBtn, ...(complete || isEmpty ? s.btnOff : {}) }}
            onClick={handleStart}
            disabled={complete || isEmpty}
          >
            {!isIdle && !complete ? "Resume" : "Start"}
          </button>
        ) : (
          <button style={{ ...s.btn, ...s.pauseBtn }} onClick={handlePause}>
            Pause
          </button>
        )}
        <button
          style={{ ...s.btn, ...s.resetBtn, ...(isIdle && !complete ? s.btnOff : {}) }}
          onClick={handleReset}
          disabled={isIdle && !complete}
        >
          Reset
        </button>
      </div>

      {/* Completion banner */}
      {complete && <div style={s.banner}>🎉 Session complete!</div>}

      {/* Session history */}
      <div style={s.log}>
        <div style={s.logHead}>
          <span style={s.logTitle}>Recent Sessions</span>
          {sessions.length > 0 && (
            <button style={s.clearBtn} onClick={handleClearHistory}>Clear history</button>
          )}
        </div>

        {sessions.length === 0 ? (
          <p style={s.logEmpty}>No sessions yet — complete a timer to log one.</p>
        ) : (
          <div style={s.logList}>
            {[...sessions].reverse().map((sess, i) => (
              <div key={i} style={s.logItem}>
                <span style={s.logLabel}>{sess.label}</span>
                <span style={s.logDur}>{fmtDuration(sess.duration_seconds)}</span>
                <span style={s.logTs}>
                  {new Date(sess.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {" "}
                  {new Date(sess.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Colon({ running }) {
  return (
    <span style={{ ...s.colon, color: running ? "#3f3f55" : "#1e1e2e" }}>:</span>
  );
}

function TimeField({ value, onChange, editable, unit }) {
  const [editing,  setEditing]  = useState(false);
  const [inputVal, setInputVal] = useState("");

  function start() {
    if (!editable) return;
    setInputVal(String(value));
    setEditing(true);
  }

  function commit() {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n >= 0) onChange(n);
    setEditing(false);
  }

  function onKey(e) {
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); commit(); }
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <input
        style={s.editInput}
        type="number"
        min="0"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        autoFocus
      />
    );
  }

  return (
    <span
      style={{ ...s.seg, ...(editable ? s.segEditable : {}) }}
      onClick={start}
      title={editable ? `Click to edit ${unit}` : undefined}
    >
      {pad(value)}
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const FONT = "'Courier New', Courier, monospace";
const TIMER_SIZE = "clamp(64px, 11vw, 104px)";

const s = {
  page: {
    background: "#0c0c12",
    minHeight: "calc(100vh - 56px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px 56px",
    gap: "30px",
  },
  labelInput: {
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #1e1e2e",
    color: "#6b7280",
    fontSize: "15px",
    textAlign: "center",
    padding: "6px 20px",
    width: "min(360px, 80vw)",
    outline: "none",
    caretColor: "#818cf8",
  },
  timerRow: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },
  seg: {
    fontFamily: FONT,
    fontSize: TIMER_SIZE,
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "-1px",
    lineHeight: 1,
    minWidth: "2.1ch",
    textAlign: "center",
    userSelect: "none",
  },
  segEditable: {
    cursor: "pointer",
    color: "#c7d2fe",
    borderRadius: "8px",
    padding: "0 6px",
  },
  editInput: {
    fontFamily: FONT,
    fontSize: TIMER_SIZE,
    fontWeight: 700,
    color: "#818cf8",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid #818cf8",
    width: "2.4ch",
    textAlign: "center",
    outline: "none",
    letterSpacing: "-1px",
    padding: 0,
    appearance: "textfield",
    MozAppearance: "textfield",
  },
  colon: {
    fontFamily: FONT,
    fontSize: "clamp(52px, 9vw, 86px)",
    fontWeight: 700,
    lineHeight: 1,
    marginTop: "-4px",
    userSelect: "none",
    transition: "color 0.4s",
  },
  controls: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  btn: {
    borderRadius: "50px",
    fontWeight: 700,
    fontSize: "16px",
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "opacity 0.15s",
  },
  startBtn: {
    padding: "13px 52px",
    border: "none",
    background: "#6d28d9",
    color: "#fff",
  },
  pauseBtn: {
    padding: "13px 52px",
    border: "1px solid #2a2a3a",
    background: "transparent",
    color: "#cbd5e1",
  },
  resetBtn: {
    padding: "13px 24px",
    border: "1px solid #2a2a3a",
    background: "transparent",
    color: "#4b5563",
  },
  btnOff: {
    opacity: 0.3,
    cursor: "not-allowed",
  },
  banner: {
    background: "#052e16",
    color: "#86efac",
    padding: "14px 36px",
    borderRadius: "12px",
    fontSize: "18px",
    fontWeight: 700,
    border: "1px solid #166534",
    letterSpacing: "0.02em",
  },
  log: {
    width: "min(500px, 92vw)",
    borderTop: "1px solid #1a1a28",
    paddingTop: "22px",
  },
  logHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  logTitle: {
    color: "#374151",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "#374151",
    fontSize: "12px",
    cursor: "pointer",
    textDecoration: "underline",
  },
  logEmpty: {
    margin: 0,
    color: "#2a2a3a",
    fontSize: "13px",
    textAlign: "center",
    padding: "16px 0",
  },
  logList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  logItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "9px 14px",
    background: "#0f0f1a",
    borderRadius: "8px",
    border: "1px solid #1a1a28",
  },
  logLabel: {
    flex: 1,
    color: "#9ca3af",
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },
  logDur: {
    color: "#818cf8",
    fontSize: "12px",
    fontWeight: 600,
    fontFamily: FONT,
    flexShrink: 0,
  },
  logTs: {
    color: "#2d2d42",
    fontSize: "11px",
    flexShrink: 0,
  },
};
