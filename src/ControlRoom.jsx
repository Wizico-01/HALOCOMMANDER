import { useState, useEffect, useRef } from "react";
import { supabase } from './supabase.js';

const C = {
  white: "#ffffff", bg: "#f5f6fa", bgCard: "#ffffff",
  navy: "#0d1b3e", navyLight: "#1a2d55",
  gold: "#f0a500", goldLight: "#ffc233", goldDark: "#c47f00",
  goldBg: "rgba(240,165,0,0.08)", goldBorder: "rgba(240,165,0,0.25)",
  border: "#e8eaef", text: "#0d1b3e", textSub: "#6b7fa8", textMuted: "#a0aec0",
  danger: "#e53e3e", dangerBg: "rgba(229,62,62,0.06)",
  success: "#38a169", successBg: "rgba(56,161,105,0.06)",
  shadow: "0 1px 3px rgba(13,27,62,0.08), 0 4px 16px rgba(13,27,62,0.06)",
  shadowMd: "0 4px 24px rgba(13,27,62,0.12)",
};

async function dbGetAll(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) { console.error('dbGetAll error:', table, error.message); return []; }
  return data || [];
}

async function dbUpdate(table, col, val, updates) {
  const { error } = await supabase.from(table).update(updates).eq(col, val);
  if (error) console.error('dbUpdate error:', table, error.message);
}

function HaloLogo({ size = 40 }) {
  const rays = 42, r = size * 0.26, cx = size / 2, cy = size * 0.47;
  const lines = [];
  for (let i = 0; i < rays; i++) {
    const a = (-178 + (176 / (rays - 1)) * i) * Math.PI / 180;
    const inn = r + size * 0.03;
    const out = r + size * 0.33 + (Math.abs(i - rays / 2) < rays * 0.15 ? size * 0.07 : 0);
    lines.push(
      <line key={i}
        x1={cx + inn * Math.cos(a)} y1={cy + inn * Math.sin(a)}
        x2={cx + out * Math.cos(a)} y2={cy + out * Math.sin(a)}
        stroke="url(#crlg)" strokeWidth={size * 0.008}
        strokeLinecap="round" opacity={0.95}
      />
    );
  }
  return (
    <svg width={size} height={size * 1.1} viewBox={`0 0 ${size} ${size * 1.1}`}>
      <defs>
        <radialGradient id="crlg" cx="50%" cy="47%" r="55%">
          <stop offset="0%" stopColor="#ffc233" />
          <stop offset="100%" stopColor="#f0a500" />
        </radialGradient>
      </defs>
      {lines}
      <circle cx={cx} cy={cy} r={r} fill={C.navy} />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#f0a500" opacity={0.15} />
    </svg>
  );
}

function Badge({ status }) {
  const ok = status === "Completed";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "4px 10px",
      borderRadius: 20,
      background: ok ? C.successBg : C.goldBg,
      color: ok ? C.success : C.goldDark,
      border: `1px solid ${ok ? "rgba(56,161,105,0.2)" : C.goldBorder}`,
      fontFamily: "'DM Sans'", whiteSpace: "nowrap",
    }}>
      {ok ? "✓ Done" : "● Live"}
    </span>
  );
}

function Card({ children, style: s = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.bgCard, border: `1.5px solid ${C.border}`,
      borderRadius: 14, boxShadow: C.shadow, ...s,
    }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <Card style={{ padding: "16px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: "'Outfit'", fontSize: 26, fontWeight: 800, color: color || C.navy, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.textSub, marginTop: 4, fontFamily: "'DM Sans'", letterSpacing: 0.5 }}>{label}</div>
    </Card>
  );
}

function currentLoc(task) {
  const legs = task.legs || [];
  const leg = legs[legs.length - 1];
  if (!leg) return { text: "Standby", color: C.textMuted };
  if (leg.timeArrived) return { text: leg.arrivalPoint, color: C.success };
  if (leg.timeDeparted) return { text: "En route from " + leg.departurePoint, color: C.gold };
  return { text: "Standby", color: C.textMuted };
}

export default function ControlRoom() {
  const [tasks, setTasks] = useState([]);
  const [locs, setLocs] = useState({});
  const [panics, setPanics] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [tab, setTab] = useState("tasks");
  const [alarmActive, setAlarmActive] = useState(false);
  const alarmRef = useRef(null);
  const prevPanicCount = useRef(0);

  useEffect(() => {
    load();

    // Real-time subscriptions
    const taskChannel = supabase
      .channel('cr_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => load())
      .subscribe();

    const locChannel = supabase
      .channel('cr_locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => load())
      .subscribe();

    const panicChannel = supabase
      .channel('cr_panics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'panics' }, payload => {
        setPanics(prev => {
          const updated = [payload.new, ...prev];
          const active = updated.filter(p => p.status === 'ACTIVE');
          if (active.length > 0) {
            startAlarm();
            setAlarmActive(true);
          }
          return updated;
        });
        setTab("panics");
      })
      .subscribe();

    // Fallback poll every 5 seconds
    const iv = setInterval(load, 5000);

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(locChannel);
      supabase.removeChannel(panicChannel);
      clearInterval(iv);
      stopAlarm();
    };
  }, []);

  async function load() {
    const [t, locsArr, p] = await Promise.all([
      dbGetAll('tasks'),
      dbGetAll('locations'),
      dbGetAll('panics'),
    ]);

    const l = {};
    locsArr.forEach(loc => { if (loc.username) l[loc.username] = loc; });

    setTasks(t);
    setLocs(l);
    setPanics(p);
    setLastSync(new Date());

    const activePanics = p.filter(x => x.status === 'ACTIVE');
    if (activePanics.length > prevPanicCount.current && activePanics.length > 0) {
      startAlarm();
      setAlarmActive(true);
      setTab("panics");
    }
    if (activePanics.length === 0 && alarmActive) {
      stopAlarm();
      setAlarmActive(false);
    }
    prevPanicCount.current = activePanics.length;

    if (selected) {
      const fresh = t.find(x => x.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }

  function startAlarm() {
    if (alarmRef.current) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    alarmRef.current = { ctx, playing: true };

    function beep(freq, start, duration) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.35, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    }

    function loop() {
      if (!alarmRef.current?.playing) return;
      const now = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        beep(880, now + i * 0.18, 0.14);
        beep(660, now + i * 0.18 + 0.09, 0.09);
      }
      setTimeout(loop, 1200);
    }
    loop();
  }

  function stopAlarm() {
    if (alarmRef.current) {
      alarmRef.current.playing = false;
      try { alarmRef.current.ctx.close(); } catch {}
      alarmRef.current = null;
    }
  }

  async function dismissPanic(id) {
    await dbUpdate('panics', 'id', id, { status: 'DISMISSED' });
    setPanics(prev => prev.map(p => p.id === id ? { ...p, status: 'DISMISSED' } : p));
    const remaining = panics.filter(p => p.id !== id && p.status === 'ACTIVE');
    if (remaining.length === 0) {
      stopAlarm();
      setAlarmActive(false);
      prevPanicCount.current = 0;
    }
  }

  const ongoing = tasks.filter(t => t.status === "Ongoing");
  const activePanics = panics.filter(p => p.status === "ACTIVE");

  const filtered = tasks.filter(t => {
    const mf = filter === "all" || t.status.toLowerCase() === filter;
    const q = search.toLowerCase();
    const ms = !search || [t.client, t.commanderName, t.vehicleNumber, t.region]
      .some(v => v && v.toLowerCase().includes(q));
    return mf && ms;
  });

  const activeLocations = Object.values(locs).filter(l => {
    const age = (new Date() - new Date(l.timestamp)) / 1000 / 60;
    return age < 30;
  });

  const tabList = [
    { id: "tasks", label: "📋 Tasks" },
    { id: "locations", label: "📍 Locations" },
    { id: "panics", label: activePanics.length > 0 ? `🚨 Panics (${activePanics.length})` : "🚨 Panics" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { outline: none; font-family: inherit; }
        input::placeholder { color: #c0c8d8; }
        input:focus { border-color: #f0a500 !important; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f5f6fa; }
        ::-webkit-scrollbar-thumb { background: #d0d3de; border-radius: 3px; }
        .row:hover { background: rgba(240,165,0,0.04) !important; cursor: pointer; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes slideRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        .slide-r { animation: slideRight 0.3s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes popIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .pop { animation: popIn 0.2s ease-out both; }
        @keyframes panicPulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(229,62,62,0.4)} 50%{transform:scale(1.01);box-shadow:0 0 0 8px rgba(229,62,62,0)} }
        .panic-banner { animation: panicPulse 0.9s infinite; }
      `}</style>

      {/* Top bar */}
      <div style={{
        background: C.navy, padding: "0 28px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 16px rgba(13,27,62,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <HaloLogo size={38} />
          <div>
            <div style={{ fontFamily: "'Outfit'", fontSize: 17, fontWeight: 900, color: C.white, letterSpacing: -0.3 }}>
              HALO<span style={{ color: C.gold }}>COMMANDER</span>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontFamily: "'DM Sans'" }}>CONTROL ROOM</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {activePanics.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)", borderRadius: 20, padding: "4px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.danger, animation: "blink 0.6s infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.danger, fontFamily: "'DM Sans'" }}>
                {activePanics.length} PANIC ALERT{activePanics.length > 1 ? "S" : ""}
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: ongoing.length > 0 ? C.success : C.textMuted,
              animation: ongoing.length > 0 ? "blink 1.5s infinite" : "none",
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: ongoing.length > 0 ? C.success : C.textMuted, fontFamily: "'DM Sans'", letterSpacing: 0.5 }}>
              {ongoing.length} LIVE
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>📍</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: activeLocations.length > 0 ? C.goldLight : C.textMuted, fontFamily: "'DM Sans'" }}>
              {activeLocations.length} TRACKED
            </span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans'" }}>
            {lastSync ? lastSync.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Connecting..."}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: C.white, borderBottom: `1.5px solid ${C.border}`, padding: "16px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, maxWidth: 1200, margin: "0 auto" }}>
          <StatCard icon="📋" label="Total Tasks" value={tasks.length} />
          <StatCard icon="🟡" label="Ongoing" value={ongoing.length} color={C.goldDark} />
          <StatCard icon="✅" label="Completed" value={tasks.filter(t => t.status === "Completed").length} color={C.success} />
          <StatCard icon="👤" label="Commanders" value={[...new Set(tasks.map(t => t.commanderName).filter(Boolean))].length} color={C.navy} />
          <StatCard icon="🚨" label="Active Panics" value={activePanics.length} color={activePanics.length > 0 ? C.danger : C.textMuted} />
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 156px)" }}>

        {/* Left panel */}
        <div style={{
          flex: selected ? "0 0 58%" : 1,
          display: "flex", flexDirection: "column",
          overflow: "hidden", borderRight: `1.5px solid ${C.border}`,
        }}>
          {/* Toolbar */}
          <div style={{
            padding: "12px 20px", background: C.white,
            borderBottom: `1.5px solid ${C.border}`,
            display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              {tabList.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: "7px 14px", borderRadius: 20,
                    border: `1.5px solid ${tab === t.id ? (t.id === "panics" && activePanics.length > 0 ? C.danger : C.navy) : C.border}`,
                    background: tab === t.id ? (t.id === "panics" && activePanics.length > 0 ? C.danger : C.navy) : C.white,
                    color: tab === t.id ? C.white : C.textSub,
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'DM Sans'", letterSpacing: 0.5, transition: "all 0.2s",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "tasks" && (
              <>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search commander, client, vehicle, region..."
                  style={{
                    flex: 1, padding: "8px 14px",
                    background: C.bg, border: `1.5px solid ${C.border}`,
                    borderRadius: 10, color: C.text, fontSize: 12, fontFamily: "'DM Sans'",
                  }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  {["all", "ongoing", "completed"].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: "7px 12px", borderRadius: 20,
                        border: `1.5px solid ${filter === f ? C.gold : C.border}`,
                        background: filter === f ? C.goldBg : C.white,
                        color: filter === f ? C.goldDark : C.textSub,
                        fontSize: 10, fontWeight: 700, cursor: "pointer",
                        fontFamily: "'DM Sans'", letterSpacing: 0.5, transition: "all 0.2s",
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* TASKS TAB */}
          {tab === "tasks" && (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: "85px 48px 1fr 140px 90px 75px 80px",
                padding: "8px 20px",
                background: C.bg, borderBottom: `1.5px solid ${C.border}`,
                fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                color: C.textMuted, fontFamily: "'DM Sans'",
              }}>
                {["DATE", "WK", "CLIENT / TASK", "COMMANDER", "VEHICLE", "REGION", "STATUS"].map(h => (
                  <div key={h}>{h}</div>
                ))}
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 20px", color: C.textMuted }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
                    <div style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>No tasks found</div>
                    <div style={{ fontSize: 13, fontFamily: "'DM Sans'" }}>Awaiting field reports</div>
                  </div>
                ) : filtered.map(task => (
                  <div
                    key={task.id}
                    className="row"
                    onClick={() => setSelected(selected?.id === task.id ? null : task)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "85px 48px 1fr 140px 90px 75px 80px",
                      padding: "12px 20px",
                      borderBottom: `1px solid ${C.bg}`,
                      background: selected?.id === task.id ? C.goldBg : C.white,
                      borderLeft: `3px solid ${task.status === "Completed" ? C.success : C.gold}`,
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 11, color: C.textSub, fontFamily: "'DM Sans'" }}>{task.date}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "'DM Sans'" }}>W{task.week}</div>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 600, fontFamily: "'DM Sans'", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{task.client}</div>
                    <div style={{ fontSize: 11, color: C.textSub, fontFamily: "'DM Sans'", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.commanderName}</div>
                    <div style={{ fontSize: 11, color: C.textSub, fontFamily: "'DM Sans'" }}>{task.vehicleNumber}</div>
                    <div style={{ fontSize: 11, color: C.textSub, fontFamily: "'DM Sans'", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.region}</div>
                    <div><Badge status={task.status} /></div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* LOCATIONS TAB */}
          {tab === "locations" && (
            <div style={{ overflowY: "auto", flex: 1, padding: 20 }}>
              {activeLocations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
                  <div style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>No live locations</div>
                  <div style={{ fontSize: 13, color: C.textSub, fontFamily: "'DM Sans'" }}>Commanders must tap SHARE on their Active Task screen</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {activeLocations.map((loc, i) => {
                    const ageMin = Math.round((new Date() - new Date(loc.timestamp)) / 1000 / 60);
                    const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
                    return (
                      <Card key={i} style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 12,
                              background: C.navy,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 20, flexShrink: 0,
                            }}>👤</div>
                            <div>
                              <div style={{ fontFamily: "'Outfit'", fontSize: 15, fontWeight: 700, color: C.navy }}>{loc.commanderName}</div>
                              <div style={{ fontSize: 11, color: C.textSub, fontFamily: "'DM Sans'", marginTop: 2 }}>
                                Updated {ageMin < 1 ? "just now" : `${ageMin}m ago`}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{
                              width: 7, height: 7, borderRadius: "50%",
                              background: ageMin < 2 ? C.success : C.gold,
                              animation: ageMin < 2 ? "pulse 1.5s infinite" : "none",
                            }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: ageMin < 2 ? C.success : C.goldDark, fontFamily: "'DM Sans'" }}>
                              {ageMin < 2 ? "LIVE" : "RECENT"}
                            </span>
                          </div>
                        </div>

                        <div style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1, marginBottom: 2, fontFamily: "'DM Sans'" }}>LATITUDE</div>
                              <div style={{ fontSize: 12, color: C.text, fontWeight: 600, fontFamily: "monospace" }}>{Number(loc.lat).toFixed(5)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1, marginBottom: 2, fontFamily: "'DM Sans'" }}>LONGITUDE</div>
                              <div style={{ fontSize: 12, color: C.text, fontWeight: 600, fontFamily: "monospace" }}>{Number(loc.lng).toFixed(5)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1, marginBottom: 2, fontFamily: "'DM Sans'" }}>ACCURACY</div>
                              <div style={{ fontSize: 12, color: C.text, fontWeight: 600, fontFamily: "'DM Sans'" }}>±{loc.accuracy}m</div>
                            </div>
                          </div>
                          <a
                            href={mapsUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.gold, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans'" }}
                          >
                            🗺️ Open in Google Maps →
                          </a>
                        </div>

                        <a
                          href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}&zoom=15`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            height: 44, background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
                            borderRadius: 10, textDecoration: "none", gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 16 }}>🗺️</span>
                          <span style={{ fontSize: 12, color: C.white, fontWeight: 600, fontFamily: "'DM Sans'" }}>View on OpenStreetMap</span>
                        </a>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PANICS TAB */}
          {tab === "panics" && (
            <div style={{ overflowY: "auto", flex: 1, padding: 20 }}>
              {alarmActive && (
                <div
                  className="panic-banner"
                  style={{
                    background: C.danger, borderRadius: 14,
                    padding: "16px 20px", marginBottom: 20,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 900, color: C.white, letterSpacing: 1 }}>
                      🚨 PANIC ALERT ACTIVE
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "'DM Sans'", marginTop: 4 }}>
                      Immediate response required
                    </div>
                  </div>
                  <button
                    onClick={() => { stopAlarm(); setAlarmActive(false); }}
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderRadius: 10, padding: "8px 16px",
                      color: C.white, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'DM Sans'",
                    }}
                  >
                    🔕 Silence Alarm
                  </button>
                </div>
              )}

              {panics.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🟢</div>
                  <div style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>All Clear</div>
                  <div style={{ fontSize: 13, color: C.textSub, fontFamily: "'DM Sans'" }}>No panic alerts received</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {panics.map(p => (
                    <div
                      key={p.id}
                      style={{
                        background: p.status === "ACTIVE" ? "#fff1f1" : C.bg,
                        border: `2px solid ${p.status === "ACTIVE" ? C.danger : C.border}`,
                        borderRadius: 14, padding: "18px 20px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={{
                            fontFamily: "'Outfit'", fontSize: 16, fontWeight: 800,
                            color: p.status === "ACTIVE" ? C.danger : C.textSub,
                            display: "flex", alignItems: "center", gap: 8,
                          }}>
                            {p.status === "ACTIVE" ? "🚨" : "✓"} {p.commanderName}
                          </div>
                          <div style={{ fontSize: 12, color: C.textSub, fontFamily: "'DM Sans'", marginTop: 4 }}>
                            {new Date(p.createdAt).toLocaleString("en-GB")}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: 1,
                          padding: "4px 12px", borderRadius: 20,
                          background: p.status === "ACTIVE" ? "rgba(229,62,62,0.12)" : C.successBg,
                          color: p.status === "ACTIVE" ? C.danger : C.success,
                          border: `1px solid ${p.status === "ACTIVE" ? "rgba(229,62,62,0.25)" : "rgba(56,161,105,0.2)"}`,
                          fontFamily: "'DM Sans'",
                        }}>
                          {p.status}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 13, color: C.text, fontFamily: "'DM Sans'",
                        marginBottom: p.status === "ACTIVE" ? 14 : 0,
                        padding: "10px 14px",
                        background: p.status === "ACTIVE" ? "rgba(229,62,62,0.05)" : "rgba(0,0,0,0.02)",
                        borderRadius: 8,
                      }}>
                        {p.message}
                      </div>
                      {p.status === "ACTIVE" && (
                        <button
                          onClick={() => dismissPanic(p.id)}
                          style={{
                            width: "100%", padding: "10px",
                            background: C.navy, border: "none",
                            borderRadius: 10, color: C.white,
                            fontSize: 12, fontWeight: 700,
                            cursor: "pointer", fontFamily: "'DM Sans'",
                          }}
                        >
                          ✓ Mark as Responded & Dismiss
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="slide-r pop" style={{ flex: "0 0 42%", overflowY: "auto", background: C.white }}>
            <div style={{
              padding: "16px 20px", borderBottom: `1.5px solid ${C.border}`,
              position: "sticky", top: 0, background: C.white, zIndex: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <div style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 4 }}>{selected.client}</div>
                  <div style={{ fontSize: 12, color: C.textSub, fontFamily: "'DM Sans'" }}>{selected.commanderName} · {selected.region}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <Badge status={selected.status} />
                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      border: `1.5px solid ${C.border}`, background: C.white,
                      cursor: "pointer", fontSize: 16, color: C.textSub,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >×</button>
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 20px" }}>
              {/* Current location */}
              <div style={{ background: C.navy, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, marginBottom: 6, fontFamily: "'DM Sans'", fontWeight: 700 }}>
                  CURRENT LOCATION
                </div>
                <div style={{ fontSize: 15, color: C.white, fontWeight: 700, fontFamily: "'Outfit'" }}>
                  {(() => {
                    const l = currentLoc(selected);
                    const col = l.color === C.success ? "#6ee7b7" : l.color === C.gold ? C.goldLight : "rgba(255,255,255,0.5)";
                    return <span style={{ color: col }}>{l.text}</span>;
                  })()}
                </div>
              </div>

              {/* GPS if available */}
              {locs[selected.commanderUsername] && (() => {
                const gps = locs[selected.commanderUsername];
                const ageMin = Math.round((new Date() - new Date(gps.timestamp)) / 1000 / 60);
                if (ageMin >= 30) return null;
                return (
                  <div style={{ background: C.successBg, border: `1.5px solid ${C.success}33`, borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 9, color: C.success, letterSpacing: 1.5, marginBottom: 6, fontFamily: "'DM Sans'", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, animation: "pulse 1.5s infinite" }} />
                      GPS LOCATION · {ageMin < 1 ? "LIVE" : `${ageMin}m AGO`}
                    </div>
                    <div style={{ fontSize: 12, color: C.text, fontFamily: "monospace", marginBottom: 8 }}>
                      {Number(gps.lat).toFixed(6)}, {Number(gps.lng).toFixed(6)} (±{gps.accuracy}m)
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: C.success, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans'" }}
                    >
                      🗺️ Open in Google Maps →
                    </a>
                  </div>
                );
              })()}

              {/* Info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  ["Date", selected.date],
                  ["Week", `Week ${selected.week}`],
                  ["Month", selected.month],
                  ["Region", selected.region],
                  ["Commander", selected.commanderName],
                  ["Driver", selected.pilotDriver || "—"],
                  ["Vehicle", selected.vehicleNumber],
                  ["Pickup", selected.timeOfPickup || "—"],
                  ["Tracking", selected.trackingStatus || "—"],
                  ["Status", selected.status],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1, marginBottom: 3, fontFamily: "'DM Sans'", fontWeight: 700 }}>{k.toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 600, fontFamily: "'DM Sans'", wordBreak: "break-all" }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Movement log */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, marginBottom: 14, fontFamily: "'DM Sans'" }}>
                  MOVEMENT LOG · {(selected.legs || []).length} LEGS
                </div>
                {(!selected.legs || selected.legs.length === 0) && (
                  <div style={{ color: C.textMuted, fontSize: 12, fontFamily: "'DM Sans'" }}>No movements logged yet.</div>
                )}
                {(selected.legs || []).map((leg, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < selected.legs.length - 1 ? 16 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        border: `2px solid ${i === selected.legs.length - 1 ? C.gold : C.border}`,
                        background: i === selected.legs.length - 1 ? C.gold : C.white,
                        flexShrink: 0, marginTop: 3,
                      }} />
                      {i < selected.legs.length - 1 && <div style={{ width: 2, flex: 1, background: C.border, marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 4 }}>
                      <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "'DM Sans'", marginBottom: 4 }}>LEG {i + 1}</div>
                      {leg.departurePoint && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.danger, background: C.dangerBg, padding: "2px 7px", borderRadius: 4, fontFamily: "'DM Sans'" }}>DEP</span>
                          <span style={{ fontSize: 13, color: C.text, fontFamily: "'DM Sans'" }}>{leg.departurePoint}</span>
                          {leg.timeDeparted && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: "auto", fontFamily: "monospace" }}>{leg.timeDeparted}</span>}
                        </div>
                      )}
                      {leg.arrivalPoint && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: C.successBg, padding: "2px 7px", borderRadius: 4, fontFamily: "'DM Sans'" }}>ARR</span>
                          <span style={{ fontSize: 13, color: C.text, fontFamily: "'DM Sans'" }}>{leg.arrivalPoint}</span>
                          {leg.timeArrived && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: "auto", fontFamily: "monospace" }}>{leg.timeArrived}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Completion */}
              {selected.status === "Completed" && (
                <div style={{ background: C.successBg, border: `1.5px solid ${C.success}33`, borderRadius: 12, padding: "16px" }}>
                  <div style={{ fontSize: 9, color: C.success, letterSpacing: 1.5, marginBottom: 10, fontFamily: "'DM Sans'", fontWeight: 700 }}>TASK COMPLETION</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1, fontFamily: "'DM Sans'", marginBottom: 3 }}>FINAL DESTINATION</div>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 600, fontFamily: "'DM Sans'" }}>{selected.finalDestination || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1, fontFamily: "'DM Sans'", marginBottom: 3 }}>COMPLETED AT</div>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 600, fontFamily: "'DM Sans'" }}>{selected.completionTime || "—"}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: C.white, borderTop: `1.5px solid ${C.border}`,
        padding: "8px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        zIndex: 100,
      }}>
        <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "'DM Sans'", letterSpacing: 0.5 }}>
          HALOCOMMANDER · Halogen Group · Journey Management System · Real-time sync
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: activePanics.length > 0 ? C.danger : ongoing.length > 0 ? C.goldDark : C.textMuted, fontFamily: "'DM Sans'" }}>
          {activePanics.length > 0 ? `🚨 ${activePanics.length} PANIC ALERT${activePanics.length > 1 ? "S" : ""}` : ongoing.length > 0 ? `⚡ ${ongoing.length} active operation${ongoing.length > 1 ? "s" : ""}` : "All clear"}
        </div>
      </div>
    </div>
  );
}