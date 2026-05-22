import { useEffect, useRef, useState } from "react";

const LS_KEY = "focus_sessions";

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function saveSessions(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(-10)));
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[523.25, 0], [659.25, 0.22], [783.99, 0.44]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.8);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.8);
    });
  } catch {}
}

function pad(n) { return String(n).padStart(2, "0"); }

export default function FocusTimerWidget() {
  const [h, setH] = useState(0);
  const [m, setM] = useState(25);
  const [sec, setSec] = useState(0);
  const [remaining, setRemaining] = useState(null); // null = idle
  const [running, setRunning]     = useState(false);
  const [done, setDone]           = useState(false);
  const intervalRef = useRef(null);
  const totalRef    = useRef(0);

  function totalSecs() { return h * 3600 + m * 60 + sec; }

  function start() {
    const t = remaining ?? totalSecs();
    if (t <= 0) return;
    totalRef.current = remaining ?? totalSecs();
    setRemaining(t);
    setRunning(true);
    setDone(false);
  }

  function pause() { setRunning(false); }

  function reset() {
    setRunning(false);
    setRemaining(null);
    setDone(false);
  }

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setDone(true);
          playChime();
          saveSessions([...loadSessions(), {
            label: "Widget session",
            duration: totalRef.current,
            ts: new Date().toISOString(),
          }]);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const display = remaining !== null ? remaining : totalSecs();
  const dH = Math.floor(display / 3600);
  const dM = Math.floor((display % 3600) / 60);
  const dS = display % 60;
  const pct = remaining !== null && totalRef.current > 0
    ? Math.round((1 - remaining / totalRef.current) * 100)
    : 0;

  return (
    <div style={s.wrap}>
      {done && <div style={s.doneBanner}>Session complete! 🎉</div>}

      {/* Circular indicator */}
      <div style={s.circleWrap}>
        <svg width={100} height={100} style={{ position: "absolute", top: 0, left: 0 }}>
          <circle cx={50} cy={50} r={44} fill="none" stroke="#f3f4f6" strokeWidth={7} />
          {pct > 0 && (
            <circle cx={50} cy={50} r={44} fill="none" stroke="#9D2235" strokeWidth={7}
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          )}
        </svg>
        <div style={s.timerDisplay}>
          {dH > 0 && <span style={s.digit}>{pad(dH)}<span style={s.unit}>h</span></span>}
          <span style={s.digit}>{pad(dM)}<span style={s.unit}>m</span></span>
          <span style={s.digit}>{pad(dS)}<span style={s.unit}>s</span></span>
        </div>
      </div>

      {/* Inputs (only when idle) */}
      {remaining === null && (
        <div style={s.inputs}>
          {[["h", h, setH, 23], ["m", m, setM, 59], ["s", sec, setSec, 59]].map(([lbl, val, set, max]) => (
            <label key={lbl} style={s.inputGroup}>
              <input
                style={s.input}
                type="number" min={0} max={max} value={val}
                onChange={e => set(Math.max(0, Math.min(max, +e.target.value || 0)))}
              />
              <span style={s.inputLabel}>{lbl}</span>
            </label>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={s.controls}>
        {!running
          ? <button style={{ ...s.btn, background: "#9D2235", color: "#fff" }} onClick={start}>
              {remaining !== null ? "Resume" : "Start"}
            </button>
          : <button style={s.btn} onClick={pause}>Pause</button>
        }
        <button style={{ ...s.btn, background: "#f3f4f6" }} onClick={reset}>Reset</button>
      </div>
    </div>
  );
}

const s = {
  wrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  doneBanner: { background: "#dcfce7", color: "#15803d", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, width: "100%", textAlign: "center", boxSizing: "border-box" },
  circleWrap: { position: "relative", width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  timerDisplay: { display: "flex", gap: "2px", alignItems: "baseline" },
  digit: { fontSize: "18px", fontWeight: 800, color: "#08060d" },
  unit:  { fontSize: "10px", color: "#9ca3af", marginLeft: "1px" },
  inputs: { display: "flex", gap: "6px", alignItems: "center" },
  inputGroup: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
  input: { width: "40px", textAlign: "center", padding: "4px", border: "1px solid #e5e4e7", borderRadius: "6px", fontSize: "13px" },
  inputLabel: { fontSize: "10px", color: "#9ca3af" },
  controls: { display: "flex", gap: "6px" },
  btn: { padding: "6px 14px", borderRadius: "6px", border: "1px solid #e5e4e7", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "#fff", color: "#08060d" },
};
