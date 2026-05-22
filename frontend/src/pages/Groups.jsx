import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api/client";
import { supabase } from "../api/supabase";
import { PALETTE } from "../utils/calendarUtils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_BASE = API_URL.replace(/^http/, "ws");

// ---------------------------------------------------------------------------
// Grid constants
// ---------------------------------------------------------------------------
const START_HOUR   = 8;
const END_HOUR     = 23;           // last slot starts at 22:30
const TOTAL_SLOTS  = (END_HOUR - START_HOUR) * 2;   // 30 half-hour slots
const CELL_H       = 26;           // px per 30-min slot
const TIME_COL_W   = 52;           // px for left time label column
const DAYS         = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// column index → day_of_week  (Mon=1 … Sun=0)
const COL_TO_DOW   = [1, 2, 3, 4, 5, 6, 0];
const DOW_NAMES    = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------
function slotToTimeStr(slot) {
  const m = START_HOUR * 60 + slot * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function timeToSlot(timeStr) {
  const [h, min] = timeStr.split(":").map(Number);
  return (h - START_HOUR) * 2 + (min >= 30 ? 1 : 0);
}

function fmt12(slot) {
  const totalMin = START_HOUR * 60 + slot * 30;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ---------------------------------------------------------------------------
// Other helpers
// ---------------------------------------------------------------------------
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtMsgTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isUrgent(due_date) {
  if (!due_date) return false;
  const diff = (new Date(due_date + "T23:59:59") - new Date()) / 86400000;
  return diff <= 2 && diff >= 0;
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function Groups() {
  const [groups, setGroups]           = useState([]);
  const [selectedId, setSelectedId]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [showJoin, setShowJoin]       = useState(false);
  const [createdGroup, setCreatedGroup] = useState(null);

  async function loadGroups() {
    try {
      const data = await apiFetch("/groups/");
      setGroups(data);
      if (data.length && !selectedId) setSelectedId(data[0].id);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadGroups(); }, []);

  const selected = groups.find((g) => g.id === selectedId) ?? null;

  return (
    <div style={s.layout}>
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}><span style={s.sidebarTitle}>My Groups</span></div>
        <div style={s.sidebarActions}>
          <button style={s.actionBtn} onClick={() => setShowCreate(true)}>+ Create</button>
          <button style={s.actionBtn} onClick={() => setShowJoin(true)}>Join</button>
        </div>
        {loading ? (
          <p style={s.sidebarEmpty}>Loading…</p>
        ) : groups.length === 0 ? (
          <p style={s.sidebarEmpty}>No groups yet. Create or join one.</p>
        ) : (
          <div style={s.groupList}>
            {groups.map((g) => (
              <button
                key={g.id}
                style={{ ...s.groupItem, ...(g.id === selectedId ? s.groupItemActive : {}) }}
                onClick={() => setSelectedId(g.id)}
              >
                <span style={s.groupItemName}>{g.name}</span>
                <span style={s.groupItemCode}>{g.join_code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={s.main}>
        {selected ? (
          <GroupPanel key={selected.id} group={selected} onDeleted={() => {
            setGroups((prev) => prev.filter((g) => g.id !== selected.id));
            setSelectedId(null);
          }} />
        ) : (
          <div style={s.emptyMain}><p style={s.emptyText}>Select or create a group to get started.</p></div>
        )}
      </div>

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={(g) => {
          setGroups((prev) => [g, ...prev]);
          setSelectedId(g.id);
          setCreatedGroup(g);
          setShowCreate(false);
        }} />
      )}
      {showJoin && (
        <JoinModal onClose={() => setShowJoin(false)} onJoined={(g) => {
          setGroups((prev) => prev.find((x) => x.id === g.id) ? prev : [g, ...prev]);
          setSelectedId(g.id);
          setShowJoin(false);
        }} />
      )}
      {createdGroup && <JoinCodeModal group={createdGroup} onClose={() => setCreatedGroup(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group panel (tabs)
// ---------------------------------------------------------------------------
function GroupPanel({ group }) {
  const [tab, setTab] = useState("todos");
  const TABS = [
    { key: "todos",        label: "Todos" },
    { key: "chat",         label: "Chat" },
    { key: "availability", label: "Availability" },
  ];

  return (
    <div style={s.panel}>
      <div style={s.panelHeader}>
        <div>
          <h2 style={s.panelTitle}>{group.name}</h2>
          <span style={s.codeChip}>Code: {group.join_code}</span>
        </div>
      </div>
      <div style={s.tabBar}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            style={{ ...s.tab, ...(tab === key ? s.tabActive : {}) }}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "todos"        && <TodosTab       group={group} />}
      {tab === "chat"         && <ChatTab         group={group} />}
      {tab === "availability" && <AvailabilityTab group={group} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Todos tab
// ---------------------------------------------------------------------------
function TodosTab({ group }) {
  const [todos, setTodos]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [myTitle, setMyTitle]   = useState("");
  const [myDue, setMyDue]       = useState("");
  const [adding, setAdding]     = useState(false);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setMyUserId(session?.user?.id ?? null));
    load();
  }, [group.id]);

  async function load() {
    setLoading(true);
    try { setTodos(await apiFetch(`/groups/${group.id}/todos`)); } catch {}
    setLoading(false);
  }

  async function addTodo(e) {
    e.preventDefault();
    if (!myTitle.trim()) return;
    setAdding(true);
    try {
      const t = await apiFetch(`/groups/${group.id}/todos`, {
        method: "POST",
        body: JSON.stringify({ title: myTitle.trim(), due_date: myDue || null }),
      });
      setTodos((prev) => [...prev, t]);
      setMyTitle(""); setMyDue("");
    } catch {}
    setAdding(false);
  }

  async function toggleDone(todo) {
    if (todo.user_id !== myUserId) return;
    const updated = await apiFetch(`/groups/${group.id}/todos/${todo.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_done: !todo.is_done }),
    });
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
  }

  async function deleteTodo(todo) {
    if (todo.user_id !== myUserId) return;
    await apiFetch(`/groups/${group.id}/todos/${todo.id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
  }

  const byMember = todos.reduce((acc, t) => {
    (acc[t.user_id] = acc[t.user_id] || []).push(t);
    return acc;
  }, {});

  return (
    <div style={s.tabContent}>
      <form style={s.addTodoForm} onSubmit={addTodo}>
        <input style={s.addTodoInput} placeholder="Add your own todo…" value={myTitle} onChange={(e) => setMyTitle(e.target.value)} />
        <input style={{ ...s.addTodoInput, width: "140px" }} type="date" value={myDue} onChange={(e) => setMyDue(e.target.value)} />
        <button style={s.addTodoBtn} type="submit" disabled={adding || !myTitle.trim()}>{adding ? "Adding…" : "Add"}</button>
      </form>
      {loading ? (
        <p style={s.loadMsg}>Loading…</p>
      ) : Object.keys(byMember).length === 0 ? (
        <p style={s.loadMsg}>No todos yet — add the first one above.</p>
      ) : (
        Object.entries(byMember).map(([uid, items]) => (
          <div key={uid} style={s.memberSection}>
            <p style={s.memberLabel}>{uid === myUserId ? "You" : items[0]?.email ?? uid.slice(0, 8)}</p>
            {items.map((todo) => {
              const urgent = isUrgent(todo.due_date);
              const isOwner = todo.user_id === myUserId;
              return (
                <div key={todo.id} style={{ ...s.todoRow, ...(todo.is_done ? s.todoRowDone : {}) }}>
                  <input type="checkbox" checked={todo.is_done} onChange={() => toggleDone(todo)} disabled={!isOwner} style={{ cursor: isOwner ? "pointer" : "default", flexShrink: 0 }} />
                  <span style={{ ...s.todoTitle, ...(todo.is_done ? s.strikethrough : {}) }}>{todo.title}</span>
                  {todo.due_date && (
                    <span style={{ ...s.todoDue, ...(urgent ? s.todoDueUrgent : {}) }}>{fmtDate(todo.due_date)}</span>
                  )}
                  {isOwner && <button style={s.deleteTodoBtn} onClick={() => deleteTodo(todo)}>×</button>}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat tab
// ---------------------------------------------------------------------------
const MAX_RETRIES = 5;

function ChatTab({ group }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [wsStatus, setWsStatus]   = useState("connecting");
  const [myUserId, setMyUserId]   = useState(null);
  const wsRef    = useRef(null);
  const retries  = useRef(0);
  const bottomRef = useRef(null);
  const tokenRef  = useRef(null);
  const groupId   = group.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      tokenRef.current = session?.access_token ?? null;
      setMyUserId(session?.user?.id ?? null);
      try {
        const hist = await apiFetch(`/groups/${groupId}/messages`);
        if (!cancelled) setMessages(hist);
      } catch {}
      connect();
    }

    function connect() {
      if (cancelled || !tokenRef.current) return;
      const ws = new WebSocket(`${WS_BASE}/groups/${groupId}/ws?token=${tokenRef.current}`);
      wsRef.current = ws;
      ws.onopen  = () => { if (!cancelled) { setWsStatus("open"); retries.current = 0; } };
      ws.onclose = () => {
        if (cancelled) return;
        setWsStatus("closed");
        if (retries.current < MAX_RETRIES) {
          setTimeout(connect, Math.min(500 * Math.pow(2, retries.current++), 20000));
        }
      };
      ws.onerror  = () => ws.close();
      ws.onmessage = (e) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(e.data);
          if (data.type === "message") setMessages((prev) => [...prev, data]);
        } catch {}
      };
    }

    init();
    return () => { cancelled = true; wsRef.current?.close(); };
  }, [groupId]);

  function send() {
    const content = input.trim();
    if (!content || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content }));
    setInput("");
  }

  return (
    <div style={s.chatWrap}>
      <div style={s.chatStatus}>
        <span style={{ ...s.statusDot, background: wsStatus === "open" ? "#22c55e" : wsStatus === "connecting" ? "#f59e0b" : "#ef4444" }} />
        <span style={s.statusText}>
          {wsStatus === "open" ? "Connected" : wsStatus === "connecting" ? "Connecting…" : `Disconnected${retries.current >= MAX_RETRIES ? " (max retries)" : " — retrying…"}`}
        </span>
      </div>
      <div style={s.messageList}>
        {messages.length === 0 && <p style={s.loadMsg}>No messages yet — say hi!</p>}
        {messages.map((m, i) => {
          const isMe = m.user_id === myUserId;
          return (
            <div key={m.id ?? i} style={{ ...s.msgRow, ...(isMe ? s.msgRowMe : {}) }}>
              <div style={{ ...s.bubble, ...(isMe ? s.bubbleMe : s.bubbleThem) }}>
                {!isMe && <span style={s.msgSender}>{m.email ?? m.user_id?.slice(0, 8)}</span>}
                <span style={s.msgContent}>{m.content}</span>
                <span style={s.msgTime}>{fmtMsgTime(m.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={s.chatInput}>
        <input style={s.chatInputField} placeholder="Type a message…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={wsStatus !== "open"} />
        <button style={{ ...s.sendBtn, opacity: wsStatus !== "open" ? 0.5 : 1 }} onClick={send} disabled={wsStatus !== "open"}>Send</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Availability tab
// ---------------------------------------------------------------------------
function AvailabilityTab({ group }) {
  const [blocks, setBlocks]     = useState([]);
  const [members, setMembers]   = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [loading, setLoading]   = useState(true);

  // Drag state
  const dragRef    = useRef({ dragging: false, col: null, startSlot: null, endSlot: null });
  const [dragSel, setDragSel] = useState(null); // { col, startSlot, endSlot }
  const gridBodyRef = useRef(null);
  // Stable saveBlock callback for window listener
  const saveRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setMyUserId(session?.user?.id ?? null));
    load();
  }, [group.id]);

  async function load() {
    setLoading(true);
    try {
      const [b, m] = await Promise.all([
        apiFetch(`/groups/${group.id}/availability`),
        apiFetch(`/groups/${group.id}/members`),
      ]);
      setBlocks(b);
      setMembers(m);
    } catch {}
    setLoading(false);
  }

  // Stable color map: member order → PALETTE index
  const colorMap = useMemo(() => {
    const map = {};
    members.forEach((m, i) => { map[m.user_id] = PALETTE[i % PALETTE.length]; });
    return map;
  }, [members]);

  // Best times: slots where ALL members who have submitted any availability are all covered
  const { bestTimes, activeMemberCount } = useMemo(() => {
    const activeMembers = new Set(blocks.map((b) => b.user_id));
    if (activeMembers.size < 2) return { bestTimes: [], activeMemberCount: activeMembers.size };

    const coverage = {}; // "dow-slot" → Set<userId>
    for (const b of blocks) {
      const s0 = Math.max(0, timeToSlot(b.start_time));
      const s1 = Math.min(TOTAL_SLOTS, timeToSlot(b.end_time));
      for (let s = s0; s < s1; s++) {
        const k = `${b.day_of_week}-${s}`;
        if (!coverage[k]) coverage[k] = new Set();
        coverage[k].add(b.user_id);
      }
    }

    const results = [];
    for (let dow = 0; dow < 7; dow++) {
      let run = null;
      for (let slot = 0; slot <= TOTAL_SLOTS; slot++) {
        const allFree = slot < TOTAL_SLOTS
          && coverage[`${dow}-${slot}`]
          && [...activeMembers].every((uid) => coverage[`${dow}-${slot}`].has(uid));
        if (allFree) {
          if (run === null) run = slot;
        } else if (run !== null) {
          results.push({ dow, startSlot: run, endSlot: slot });
          run = null;
        }
      }
    }
    return { bestTimes: results, activeMemberCount: activeMembers.size };
  }, [blocks]);

  // Save a newly dragged block
  async function saveBlock(col, startSlot, endSlotExcl) {
    if (endSlotExcl <= startSlot) return;
    const dow = COL_TO_DOW[col];
    try {
      const b = await apiFetch(`/groups/${group.id}/availability`, {
        method: "POST",
        body: JSON.stringify({
          day_of_week: dow,
          start_time: slotToTimeStr(startSlot),
          end_time:   slotToTimeStr(endSlotExcl),
        }),
      });
      setBlocks((prev) => [...prev, b]);
    } catch {}
  }
  saveRef.current = saveBlock;

  async function deleteBlock(blockId) {
    try {
      await apiFetch(`/groups/${group.id}/availability/${blockId}`, { method: "DELETE" });
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch {}
  }

  // Mouse handlers
  function handleMouseDown(e, col) {
    if (e.button !== 0) return;
    const body = gridBodyRef.current;
    if (!body) return;
    const rect = body.getBoundingClientRect();
    const y = e.clientY - rect.top + body.scrollTop;
    const slot = Math.floor(y / CELL_H);
    if (slot < 0 || slot >= TOTAL_SLOTS) return;
    dragRef.current = { dragging: true, col, startSlot: slot, endSlot: slot };
    setDragSel({ col, startSlot: slot, endSlot: slot });
    e.preventDefault();
  }

  function handleMouseMove(e) {
    if (!dragRef.current.dragging) return;
    const body = gridBodyRef.current;
    if (!body) return;
    const rect = body.getBoundingClientRect();
    const x    = e.clientX - rect.left - TIME_COL_W;
    const y    = e.clientY - rect.top  + body.scrollTop;
    if (x < 0) return;
    const colW = (rect.width - TIME_COL_W) / 7;
    const col  = Math.floor(x / colW);
    if (col !== dragRef.current.col || col < 0 || col >= 7) return;
    const slot = Math.floor(y / CELL_H);
    if (slot < 0 || slot >= TOTAL_SLOTS || slot === dragRef.current.endSlot) return;
    dragRef.current.endSlot = slot;
    setDragSel({ col, startSlot: dragRef.current.startSlot, endSlot: slot });
  }

  useEffect(() => {
    function onUp() {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      const { col, startSlot, endSlot } = dragRef.current;
      if (col !== null && startSlot !== null) {
        const lo = Math.min(startSlot, endSlot ?? startSlot);
        const hi = Math.max(startSlot, endSlot ?? startSlot);
        saveRef.current(col, lo, hi + 1);
      }
      setDragSel(null);
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  if (loading) return <div style={s.tabContent}><p style={s.loadMsg}>Loading…</p></div>;

  const myColor = myUserId ? colorMap[myUserId] : PALETTE[0];

  return (
    <div style={s.availWrap}>
      <div style={s.availHint}>
        <span>Drag to add your availability · Click your own block to remove</span>
        <span style={{ color: "#9ca3af" }}>{activeMemberCount} of {members.length} member{members.length !== 1 ? "s" : ""} submitted</span>
      </div>

      {/* Sticky day-header row */}
      <div style={s.gridHeaderRow}>
        <div style={{ width: TIME_COL_W, flexShrink: 0 }} />
        {DAYS.map((d) => (
          <div key={d} style={s.gridDayHeader}>{d}</div>
        ))}
      </div>

      {/* Scrollable grid body */}
      <div
        ref={gridBodyRef}
        style={s.gridBody}
        onMouseMove={handleMouseMove}
      >
        <div style={s.gridInner}>
          {/* Time labels */}
          <div style={{ width: TIME_COL_W, flexShrink: 0 }}>
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
              <div key={i} style={s.timeCell}>
                {i % 2 === 0 && <span style={s.timeLabel}>{fmt12(i)}</span>}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((_, colIdx) => {
            const dow = COL_TO_DOW[colIdx];
            const dayBlocks = blocks.filter((b) => b.day_of_week === dow);
            const bestDay   = bestTimes.filter((bt) => bt.dow === dow);
            const sel = dragSel?.col === colIdx ? dragSel : null;
            const loSel = sel ? Math.min(sel.startSlot, sel.endSlot) : 0;
            const hiSel = sel ? Math.max(sel.startSlot, sel.endSlot) + 1 : 0;

            return (
              <div
                key={colIdx}
                style={s.dayCol}
                onMouseDown={(e) => handleMouseDown(e, colIdx)}
              >
                {/* Grid lines */}
                {Array.from({ length: TOTAL_SLOTS }, (_, slot) => (
                  <div
                    key={slot}
                    style={{
                      height: CELL_H,
                      borderBottom: slot % 2 === 1 ? "1px solid #e5e4e7" : "1px dashed #f0f0f2",
                      boxSizing: "border-box",
                    }}
                  />
                ))}

                {/* Best-times green overlay */}
                {bestDay.map((bt, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: bt.startSlot * CELL_H,
                      height: (bt.endSlot - bt.startSlot) * CELL_H,
                      left: 0, right: 0,
                      background: "rgba(34,197,94,0.13)",
                      borderLeft: "3px solid #22c55e",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  />
                ))}

                {/* Member blocks */}
                {dayBlocks.map((b) => {
                  const s0 = Math.max(0, timeToSlot(b.start_time));
                  const s1 = Math.min(TOTAL_SLOTS, timeToSlot(b.end_time));
                  if (s1 <= s0) return null;
                  const color = colorMap[b.user_id] || PALETTE[0];
                  const isOwn = b.user_id === myUserId;
                  return (
                    <div
                      key={b.id}
                      style={{
                        position: "absolute",
                        top: s0 * CELL_H + 1,
                        height: (s1 - s0) * CELL_H - 2,
                        left: "2px", right: "2px",
                        background: color.bg,
                        border: `1.5px solid ${color.border}`,
                        borderRadius: "4px",
                        opacity: isOwn ? 0.9 : 0.55,
                        zIndex: isOwn ? 3 : 2,
                        cursor: isOwn ? "pointer" : "default",
                        pointerEvents: isOwn ? "auto" : "none",
                        overflow: "hidden",
                      }}
                      onMouseDown={isOwn ? (e) => e.stopPropagation() : undefined}
                      onClick={isOwn ? () => deleteBlock(b.id) : undefined}
                    />
                  );
                })}

                {/* Drag selection */}
                {sel && (
                  <div
                    style={{
                      position: "absolute",
                      top: loSel * CELL_H,
                      height: (hiSel - loSel) * CELL_H,
                      left: "2px", right: "2px",
                      background: myColor ? `${myColor.bg}cc` : "rgba(59,130,246,0.25)",
                      border: `1.5px solid ${myColor?.border ?? "#3b82f6"}`,
                      borderRadius: "4px",
                      pointerEvents: "none",
                      zIndex: 4,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Best times panel */}
      <BestTimesPanel bestTimes={bestTimes} activeMemberCount={activeMemberCount} memberCount={members.length} />
    </div>
  );
}

function BestTimesPanel({ bestTimes, activeMemberCount, memberCount }) {
  return (
    <div style={s.bestPanel}>
      <p style={s.bestTitle}>Best Times to Meet</p>
      {bestTimes.length === 0 ? (
        <p style={s.bestEmpty}>
          {activeMemberCount < 2
            ? "At least 2 members need to submit availability to find overlaps."
            : "No common availability found yet — keep filling in the grid!"}
        </p>
      ) : (
        <div style={s.bestList}>
          {bestTimes.map((bt, i) => (
            <div key={i} style={s.bestItem}>
              <span style={s.bestDot} />
              <span>
                <strong>{DOW_NAMES[bt.dow]}</strong>{" "}
                {fmt12(bt.startSlot)}–{fmt12(bt.endSlot)}
                <span style={s.bestMeta}> — all {activeMemberCount} members free</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------
function CreateModal({ onClose, onCreated }) {
  const [name, setName]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError(null);
    try {
      onCreated(await apiFetch("/groups/", { method: "POST", body: JSON.stringify({ name: name.trim() }) }));
    } catch (err) { setError(err.message); setLoading(false); }
  }

  return (
    <Overlay onClose={onClose}>
      <h3 style={s.modalTitle}>Create a Group</h3>
      <form style={s.modalForm} onSubmit={submit}>
        <input style={s.modalInput} placeholder="Group name (e.g. CS 104 Study Group)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        {error && <p style={s.modalError}>{error}</p>}
        <div style={s.modalActions}>
          <button style={s.modalPrimary} type="submit" disabled={loading || !name.trim()}>{loading ? "Creating…" : "Create Group"}</button>
          <button style={s.modalSecondary} type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

function JoinModal({ onClose, onJoined }) {
  const [code, setCode]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setError(null);
    try {
      onJoined(await apiFetch("/groups/join", { method: "POST", body: JSON.stringify({ join_code: code.trim().toUpperCase() }) }));
    } catch (err) { setError(err.message); setLoading(false); }
  }

  return (
    <Overlay onClose={onClose}>
      <h3 style={s.modalTitle}>Join a Group</h3>
      <form style={s.modalForm} onSubmit={submit}>
        <input style={{ ...s.modalInput, textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }} placeholder="6-character join code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} maxLength={6} autoFocus />
        {error && <p style={s.modalError}>{error}</p>}
        <div style={s.modalActions}>
          <button style={s.modalPrimary} type="submit" disabled={loading || code.length !== 6}>{loading ? "Joining…" : "Join Group"}</button>
          <button style={s.modalSecondary} type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

function JoinCodeModal({ group, onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(group.join_code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <Overlay onClose={onClose}>
      <h3 style={s.modalTitle}>Group Created!</h3>
      <p style={s.modalSub}>Share this join code with your group members:</p>
      <div style={s.joinCodeDisplay}>{group.join_code}</div>
      <div style={s.modalActions}>
        <button style={s.modalPrimary} onClick={copy}>{copied ? "Copied!" : "Copy Code"}</button>
        <button style={s.modalSecondary} onClick={onClose}>Done</button>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const USC_RED = "#9b1b30";

const s = {
  layout: { display: "flex", height: "100vh", overflow: "hidden" },

  sidebar: { width: "260px", flexShrink: 0, borderRight: "1px solid #e5e4e7", background: "#fafafa", display: "flex", flexDirection: "column", overflow: "hidden" },
  sidebarHeader: { padding: "20px 16px 10px", borderBottom: "1px solid #e5e4e7" },
  sidebarTitle: { fontSize: "13px", fontWeight: 700, color: "#08060d", textTransform: "uppercase", letterSpacing: "0.06em" },
  sidebarActions: { display: "flex", gap: "6px", padding: "10px 12px", borderBottom: "1px solid #f3f4f6" },
  actionBtn: { flex: 1, padding: "7px 10px", background: "#fff", border: "1px solid #e5e4e7", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#08060d" },
  groupList: { flex: 1, overflowY: "auto", padding: "6px 8px" },
  groupItem: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "none", border: "none", borderRadius: "8px", cursor: "pointer", textAlign: "left", marginBottom: "2px" },
  groupItemActive: { background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  groupItemName: { fontSize: "14px", fontWeight: 500, color: "#08060d" },
  groupItemCode: { fontSize: "11px", fontFamily: "monospace", color: "#9ca3af" },
  sidebarEmpty: { padding: "20px 16px", fontSize: "13px", color: "#9ca3af", margin: 0 },

  main: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" },
  emptyMain: { display: "flex", alignItems: "center", justifyContent: "center", flex: 1 },
  emptyText: { fontSize: "14px", color: "#9ca3af" },

  panel: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  panelHeader: { padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  panelTitle: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#08060d" },
  codeChip: { display: "inline-block", marginTop: "4px", padding: "2px 10px", background: "#f3f4f6", borderRadius: "10px", fontSize: "12px", fontFamily: "monospace", color: "#6b6375" },

  tabBar: { display: "flex", gap: "2px", padding: "12px 24px 0", borderBottom: "1px solid #e5e4e7" },
  tab: { padding: "8px 18px", background: "none", border: "none", borderBottom: "2px solid transparent", cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#6b6375", marginBottom: "-1px" },
  tabActive: { color: USC_RED, borderBottomColor: USC_RED },
  tabContent: { flex: 1, overflowY: "auto", padding: "20px 24px" },

  addTodoForm: { display: "flex", gap: "8px", marginBottom: "20px" },
  addTodoInput: { flex: 1, padding: "8px 12px", border: "1px solid #e5e4e7", borderRadius: "7px", fontSize: "13px" },
  addTodoBtn: { padding: "8px 16px", background: USC_RED, color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  memberSection: { marginBottom: "20px" },
  memberLabel: { margin: "0 0 8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af" },
  todoRow: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#fff", border: "1px solid #f3f4f6", borderRadius: "7px", marginBottom: "6px" },
  todoRowDone: { background: "#fafafa", opacity: 0.65 },
  todoTitle: { flex: 1, fontSize: "14px", color: "#08060d" },
  strikethrough: { textDecoration: "line-through", color: "#9ca3af" },
  todoDue: { fontSize: "12px", color: "#6b6375", background: "#f3f4f6", padding: "2px 8px", borderRadius: "8px", whiteSpace: "nowrap" },
  todoDueUrgent: { background: "#fef2f2", color: USC_RED, fontWeight: 600 },
  deleteTodoBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#d1d5db", lineHeight: 1, flexShrink: 0 },
  loadMsg: { margin: 0, fontSize: "13px", color: "#9ca3af" },

  chatWrap: { flex: 1, display: "flex", flexDirection: "column", height: 0, minHeight: 0, overflow: "hidden" },
  chatStatus: { display: "flex", alignItems: "center", gap: "6px", padding: "6px 24px", borderBottom: "1px solid #f3f4f6", background: "#fafafa" },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  statusText: { fontSize: "12px", color: "#6b6375" },
  messageList: { flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "8px" },
  msgRow: { display: "flex" },
  msgRowMe: { justifyContent: "flex-end" },
  bubble: { maxWidth: "68%", padding: "8px 12px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "2px" },
  bubbleThem: { background: "#f3f4f6", borderBottomLeftRadius: "4px" },
  bubbleMe: { background: USC_RED, color: "#fff", borderBottomRightRadius: "4px" },
  msgSender: { fontSize: "11px", color: "#9ca3af", fontWeight: 600 },
  msgContent: { fontSize: "14px", lineHeight: 1.45 },
  msgTime: { fontSize: "10px", color: "rgba(0,0,0,0.35)", alignSelf: "flex-end" },
  chatInput: { display: "flex", gap: "8px", padding: "12px 24px", borderTop: "1px solid #e5e4e7", background: "#fff" },
  chatInputField: { flex: 1, padding: "10px 14px", border: "1px solid #e5e4e7", borderRadius: "8px", fontSize: "14px", outline: "none" },
  sendBtn: { padding: "10px 20px", background: USC_RED, color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },

  // ---- Availability ----
  availWrap: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "16px 20px", gap: "12px" },
  availHint: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#6b6375" },

  gridHeaderRow: { display: "flex", borderBottom: "2px solid #e5e4e7", flexShrink: 0 },
  gridDayHeader: { flex: 1, textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#6b6375", padding: "4px 0", borderLeft: "1px solid #e5e4e7" },

  gridBody: { flex: 1, overflowY: "auto", overflowX: "auto", userSelect: "none" },
  gridInner: { display: "flex", minWidth: "480px" },

  timeCell: { height: CELL_H, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: "6px", boxSizing: "border-box" },
  timeLabel: { fontSize: "10px", color: "#9ca3af", lineHeight: 1, paddingTop: "1px", whiteSpace: "nowrap" },

  dayCol: { flex: 1, position: "relative", borderLeft: "1px solid #e5e4e7", minWidth: "40px" },

  bestPanel: { flexShrink: 0, background: "#f9fafb", border: "1px solid #e5e4e7", borderRadius: "10px", padding: "12px 16px" },
  bestTitle: { margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#08060d", textTransform: "uppercase", letterSpacing: "0.05em" },
  bestEmpty: { margin: 0, fontSize: "13px", color: "#9ca3af" },
  bestList:  { display: "flex", flexDirection: "column", gap: "5px" },
  bestItem:  { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#08060d" },
  bestDot:   { width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", flexShrink: 0 },
  bestMeta:  { color: "#9ca3af" },

  // ---- Modals ----
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "20px" },
  modal: { background: "#fff", borderRadius: "14px", padding: "28px 32px", maxWidth: "420px", width: "100%", display: "flex", flexDirection: "column", gap: "16px" },
  modalTitle: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#08060d" },
  modalSub:   { margin: "-8px 0 0", fontSize: "14px", color: "#6b6375" },
  modalForm:  { display: "flex", flexDirection: "column", gap: "12px" },
  modalInput: { padding: "10px 14px", border: "1px solid #e5e4e7", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" },
  modalError: { margin: 0, fontSize: "13px", color: "#dc2626" },
  modalActions: { display: "flex", gap: "10px" },
  modalPrimary: { flex: 1, padding: "10px", background: USC_RED, color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
  modalSecondary: { padding: "10px 16px", background: "#fff", border: "1px solid #e5e4e7", borderRadius: "8px", fontSize: "14px", cursor: "pointer", color: "#6b6375" },
  joinCodeDisplay: { textAlign: "center", fontSize: "36px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", color: USC_RED, background: "#fef2f2", borderRadius: "10px", padding: "16px" },
};
