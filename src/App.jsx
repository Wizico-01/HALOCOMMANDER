import { supabase } from "./supabase.js";
import ControlRoom from "./ControlRoom.jsx";
import { useState, useEffect, useRef } from "react";

const C = {
  white: "#ffffff",
  bg: "#f5f6fa",
  bgCard: "#ffffff",
  navy: "#0d1b3e",
  navyLight: "#1a2d55",
  gold: "#f0a500",
  goldLight: "#ffc233",
  goldDark: "#c47f00",
  goldBg: "rgba(240,165,0,0.08)",
  goldBorder: "rgba(240,165,0,0.25)",
  border: "#e8eaef",
  text: "#0d1b3e",
  textSub: "#6b7fa8",
  textMuted: "#a0aec0",
  danger: "#e53e3e",
  dangerBg: "rgba(229,62,62,0.06)",
  success: "#38a169",
  successBg: "rgba(56,161,105,0.06)",
  shadow: "0 1px 3px rgba(13,27,62,0.08), 0 4px 16px rgba(13,27,62,0.06)",
  shadowMd: "0 4px 24px rgba(13,27,62,0.12)",
  shadowLg: "0 8px 40px rgba(13,27,62,0.16)",
};

const TRACKING_OPTIONS = [
  "Halo-trackable",
  "Halo-untrackable",
  "Vendor-trackable",
  "Vendor-untrackable",
  "Not on tracker",
  "Personal only",
  "Halo-trackable/Halo-untrackable",
];

const REGION_OPTIONS = ["Lagos", "East", "North 1", "North 2"];

const getNow = () => new Date().toTimeString().slice(0, 5);
const getToday = () => new Date().toISOString().slice(0, 10);
const getWeek = (d) => {
  const dt = new Date(d),
    s = new Date(dt.getFullYear(), 0, 1);
  return Math.ceil(((dt - s) / 86400000 + s.getDay() + 1) / 7);
};
const getMonth = (d) =>
  new Date(d).toLocaleString("default", { month: "long" });
const hashPw = (s) =>
  btoa(encodeURIComponent(s + "halocommander_2026")).slice(0, 32);

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
async function dbGetAll(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.error("dbGetAll error:", table, error.message);
    return [];
  }
  return data || [];
}

async function dbGetWhere(table, col, val) {
  const { data, error } = await supabase.from(table).select("*").eq(col, val);
  if (error) {
    console.error("dbGetWhere error:", error.message);
    return [];
  }
  return data || [];
}

async function dbUpsert(table, row) {
  const { error } = await supabase.from(table).upsert(row);
  if (error) console.error("dbUpsert error:", table, error.message);
}

async function dbInsert(table, row) {
  const { error } = await supabase.from(table).insert(row);
  if (error) console.error("dbInsert error:", table, error.message);
  return !error;
}

async function dbUpdate(table, col, val, updates) {
  const { error } = await supabase.from(table).update(updates).eq(col, val);
  if (error) console.error("dbUpdate error:", table, error.message);
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function HaloLogo({ size = 48 }) {
  const rays = 42,
    r = size * 0.26,
    cx = size / 2,
    cy = size * 0.47;
  const lines = [];
  for (let i = 0; i < rays; i++) {
    const a = ((-178 + (176 / (rays - 1)) * i) * Math.PI) / 180;
    const inn = r + size * 0.03;
    const out =
      r +
      size * 0.33 +
      (Math.abs(i - rays / 2) < rays * 0.15 ? size * 0.07 : 0);
    lines.push(
      <line
        key={i}
        x1={cx + inn * Math.cos(a)}
        y1={cy + inn * Math.sin(a)}
        x2={cx + out * Math.cos(a)}
        y2={cy + out * Math.sin(a)}
        stroke={`url(#lg_${size})`}
        strokeWidth={size * 0.008}
        strokeLinecap="round"
        opacity={0.95}
      />,
    );
  }
  return (
    <svg width={size} height={size * 1.1} viewBox={`0 0 ${size} ${size * 1.1}`}>
      <defs>
        <radialGradient id={`lg_${size}`} cx="50%" cy="47%" r="55%">
          <stop offset="0%" stopColor={C.goldLight} />
          <stop offset="100%" stopColor={C.gold} />
        </radialGradient>
      </defs>
      {lines}
      <circle cx={cx} cy={cy} r={r} fill={C.navy} />
      <circle cx={cx} cy={cy} r={r * 0.55} fill={C.gold} opacity={0.15} />
    </svg>
  );
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
const inpStyle = (ex = {}) => ({
  width: "100%",
  padding: "12px 14px",
  background: C.white,
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 400,
  outline: "none",
  transition: "border 0.2s",
  ...ex,
});

function Input({ label, hint, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 600,
            color: C.textSub,
            letterSpacing: 1,
            marginBottom: 6,
            fontFamily: "'DM Sans'",
          }}
        >
          {label}
        </label>
      )}
      <input style={inpStyle()} {...props} />
      {hint && (
        <p
          style={{
            fontSize: 11,
            color: C.textMuted,
            marginTop: 4,
            fontFamily: "'DM Sans'",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function SelectInput({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 600,
            color: C.textSub,
            letterSpacing: 1,
            marginBottom: 6,
            fontFamily: "'DM Sans'",
          }}
        >
          {label}
        </label>
      )}
      <select style={inpStyle()} {...props}>
        {children}
      </select>
    </div>
  );
}

function PwInput({ label, value, onChange, placeholder, onKeyDown }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 600,
            color: C.textSub,
            letterSpacing: 1,
            marginBottom: 6,
            fontFamily: "'DM Sans'",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder || "••••••••"}
          onKeyDown={onKeyDown}
          style={inpStyle({ paddingRight: 44 })}
        />
        <button
          onClick={() => setShow((p) => !p)}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: C.textMuted,
          }}
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
  style: s = {},
  icon,
}) {
  const base = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "13px 20px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.5,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans'",
    border: "none",
    transition: "all 0.2s",
    opacity: disabled ? 0.55 : 1,
    ...s,
  };
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
      color: C.white,
      boxShadow: "0 4px 16px rgba(13,27,62,0.25)",
    },
    gold: {
      background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
      color: C.white,
      boxShadow: "0 4px 16px rgba(240,165,0,0.35)",
    },
    danger: {
      background: `linear-gradient(135deg, ${C.danger}, #c53030)`,
      color: C.white,
      boxShadow: "0 4px 16px rgba(229,62,62,0.3)",
    },
    success: {
      background: `linear-gradient(135deg, ${C.success}, #276749)`,
      color: C.white,
      boxShadow: "0 4px 16px rgba(56,161,105,0.3)",
    },
    outline: {
      background: C.white,
      color: C.navy,
      border: `1.5px solid ${C.border}`,
      boxShadow: C.shadow,
    },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant] }}
    >
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      {children}
    </button>
  );
}

function Card({ children, style: s = {}, onClick, hover }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: C.bgCard,
        border: `1.5px solid ${hov ? C.gold : C.border}`,
        borderRadius: 16,
        padding: 20,
        boxShadow: hov ? C.shadowMd : C.shadow,
        transition: "all 0.2s",
        cursor: onClick ? "pointer" : "default",
        ...s,
      }}
    >
      {children}
    </div>
  );
}

function Badge({ status }) {
  const ok = status === "Completed";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        padding: "4px 10px",
        borderRadius: 20,
        background: ok ? C.successBg : C.goldBg,
        color: ok ? C.success : C.goldDark,
        border: `1px solid ${ok ? "rgba(56,161,105,0.2)" : C.goldBorder}`,
        fontFamily: "'DM Sans'",
      }}
    >
      {ok ? "✓ COMPLETED" : "● ONGOING"}
    </span>
  );
}

function AlertBox({ type = "error", children, onClose }) {
  const cfg = {
    error: [C.danger, C.dangerBg, "⚠"],
    success: [C.success, C.successBg, "✓"],
    info: [C.gold, C.goldBg, "ℹ"],
  };
  const [color, bg, icon] = cfg[type] || cfg.error;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}33`,
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 16,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 14, color, fontWeight: 700, flexShrink: 0 }}>
        {icon}
      </span>
      <span
        style={{
          fontSize: 13,
          color,
          fontFamily: "'DM Sans'",
          flex: 1,
          lineHeight: 1.5,
        }}
      >
        {children}
      </span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color,
            fontSize: 16,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function SectionHeading({ children, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: C.text,
          fontFamily: "'Outfit'",
          margin: 0,
        }}
      >
        {children}
      </h2>
      {sub && (
        <p
          style={{
            fontSize: 13,
            color: C.textSub,
            marginTop: 4,
            fontFamily: "'DM Sans'",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "16px 0" }} />;
}

function Toast({ msg, type = "success" }) {
  if (!msg) return null;
  const color =
    type === "error" ? C.danger : type === "info" ? C.gold : C.success;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 90,
        left: "50%",
        transform: "translateX(-50%)",
        background: C.navy,
        color: C.white,
        padding: "12px 24px",
        borderRadius: 30,
        fontSize: 13,
        fontFamily: "'DM Sans'",
        fontWeight: 500,
        boxShadow: C.shadowLg,
        zIndex: 9999,
        whiteSpace: "nowrap",
        borderLeft: `3px solid ${color}`,
      }}
    >
      {msg}
    </div>
  );
}

// ─── PANIC BUTTON ─────────────────────────────────────────────────────────────
function PanicButton({ user, taskId }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const confirmTimer = useRef(null);

  async function triggerPanic() {
    if (!confirmed) {
      setConfirmed(true);
      confirmTimer.current = setTimeout(() => setConfirmed(false), 4000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setLoading(true);
    const panic = {
      id: Date.now().toString(),
      commanderName: user.fullName,
      commanderUsername: user.username,
      taskId: taskId || null,
      message: "PANIC ALERT — Immediate assistance required",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    const ok = await dbInsert("panics", panic);
    setLoading(false);
    setConfirmed(false);
    if (ok) {
      setSent(true);
    } else {
      alert("Failed to send panic alert. Check your connection.");
    }
  }

  if (sent) {
    return (
      <div
        style={{
          background: "#fff1f1",
          border: `2px solid ${C.danger}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 14,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 8 }}>🚨</div>
        <div
          style={{
            fontFamily: "'Outfit'",
            fontSize: 16,
            fontWeight: 800,
            color: C.danger,
            marginBottom: 6,
          }}
        >
          PANIC ALERT SENT
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#c53030",
            fontFamily: "'DM Sans'",
            lineHeight: 1.6,
          }}
        >
          Control room has been notified.
          <br />
          Stay calm. Help is on the way.
        </div>
        <button
          onClick={() => setSent(false)}
          style={{
            marginTop: 14,
            padding: "8px 20px",
            background: "transparent",
            border: `1px solid ${C.danger}`,
            borderRadius: 20,
            color: C.danger,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'DM Sans'",
          }}
        >
          Send Another Alert
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: confirmed ? "#fff1f1" : C.white,
        border: `2px solid ${confirmed ? C.danger : "#fecaca"}`,
        borderRadius: 16,
        padding: "16px 18px",
        marginBottom: 14,
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Outfit'",
              fontSize: 14,
              fontWeight: 800,
              color: C.danger,
            }}
          >
            🚨 PANIC BUTTON
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#fc8181",
              fontFamily: "'DM Sans'",
              marginTop: 3,
            }}
          >
            {confirmed
              ? "Tap again to CONFIRM and send alert"
              : "Tap to alert control room immediately"}
          </div>
        </div>
        <button
          onClick={triggerPanic}
          disabled={loading}
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: confirmed
              ? `linear-gradient(135deg, ${C.danger}, #9b2c2c)`
              : "linear-gradient(135deg, #fc8181, #e53e3e)",
            border: confirmed ? "3px solid #9b2c2c" : "3px solid #fca5a5",
            color: C.white,
            fontSize: 24,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: confirmed
              ? "0 0 0 6px rgba(229,62,62,0.25), 0 4px 16px rgba(229,62,62,0.5)"
              : "0 4px 16px rgba(229,62,62,0.3)",
            transition: "all 0.2s",
            animation: confirmed ? "panicPulse 0.6s infinite" : "none",
            flexShrink: 0,
          }}
        >
          {loading ? "⏳" : "🚨"}
        </button>
      </div>
      {confirmed && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "rgba(229,62,62,0.08)",
            borderRadius: 8,
            fontSize: 12,
            color: C.danger,
            fontFamily: "'DM Sans'",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          ⚠️ TAP THE BUTTON AGAIN TO CONFIRM PANIC ALERT
        </div>
      )}
    </div>
  );
}

// ─── LIVE LOCATION ────────────────────────────────────────────────────────────
function LocationCard({ user, taskId, onSuccess }) {
  const [loc, setLoc] = useState(null);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const watchRef = useRef(null);

  async function broadcastLoc(coords) {
    await dbUpsert("locations", {
      username: user.username,
      commanderName: user.fullName,
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: Math.round(coords.accuracy),
      taskId: taskId,
      timestamp: new Date().toISOString(),
    });
  }

  function startSharing() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setError("");
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLoc(pos.coords);
        broadcastLoc(pos.coords);
        if (!sharing) {
          setSharing(true);
          if (onSuccess)
            onSuccess(
              "📍 Location sharing started — Control Room can see you!",
            );
        }
      },
      () => {
        setError(
          "Location access denied. Please allow location in your browser/phone settings.",
        );
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  }

  function stopSharing() {
    if (watchRef.current !== null)
      navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setSharing(false);
    setLoc(null);
  }

  useEffect(() => {
    return () => {
      if (watchRef.current !== null)
        navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const mapsUrl = loc
    ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
    : null;

  return (
    <Card
      style={{
        marginBottom: 14,
        border: sharing
          ? `1.5px solid ${C.success}`
          : `1.5px solid ${C.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: sharing || error ? 12 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: sharing ? C.successBg : C.goldBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            📍
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
                fontFamily: "'Outfit'",
              }}
            >
              Live Location
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.textSub,
                fontFamily: "'DM Sans'",
              }}
            >
              {sharing
                ? "Broadcasting to Control Room"
                : "Share your real-time position"}
            </div>
          </div>
        </div>
        <div>
          {sharing ? (
            <button
              onClick={stopSharing}
              style={{
                background: C.dangerBg,
                border: `1px solid ${C.danger}33`,
                color: C.danger,
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans'",
              }}
            >
              ■ STOP
            </button>
          ) : (
            <button
              onClick={startSharing}
              style={{
                background: C.goldBg,
                border: `1px solid ${C.goldBorder}`,
                color: C.goldDark,
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans'",
              }}
            >
              ▶ SHARE
            </button>
          )}
        </div>
      </div>

      {sharing && loc && (
        <div
          style={{ background: C.bg, borderRadius: 10, padding: "10px 14px" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: C.textMuted,
                  letterSpacing: 1,
                  marginBottom: 2,
                  fontFamily: "'DM Sans'",
                }}
              >
                LATITUDE
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.text,
                  fontWeight: 600,
                  fontFamily: "monospace",
                }}
              >
                {loc.latitude.toFixed(6)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: C.textMuted,
                  letterSpacing: 1,
                  marginBottom: 2,
                  fontFamily: "'DM Sans'",
                }}
              >
                LONGITUDE
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.text,
                  fontWeight: 600,
                  fontFamily: "monospace",
                }}
              >
                {loc.longitude.toFixed(6)}
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.textSub,
              marginBottom: 8,
              fontFamily: "'DM Sans'",
            }}
          >
            Accuracy: ±{Math.round(loc.accuracy)}m · Updated:{" "}
            {new Date().toLocaleTimeString()}
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: C.gold,
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "'DM Sans'",
            }}
          >
            🗺️ Open in Google Maps →
          </a>
        </div>
      )}

      {error && <AlertBox type="error">{error}</AlertBox>}

      {sharing && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: C.success,
              animation: "pulse 1.5s infinite",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: C.success,
              fontWeight: 600,
              fontFamily: "'DM Sans'",
            }}
          >
            Live — Control Room can see your position
          </span>
        </div>
      )}
    </Card>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ screen, setScreen, hasActive }) {
  const tabs = [
    { id: "home", icon: "⊞", label: "Home" },
    { id: "newTask", icon: "＋", label: "New Task" },
    { id: "activeTask", icon: "◉", label: "Active", dot: hasActive },
    { id: "history", icon: "≡", label: "History" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: C.white,
        borderTop: `1.5px solid ${C.border}`,
        display: "flex",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setScreen(tab.id)}
          style={{
            flex: 1,
            padding: "10px 0 8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            position: "relative",
          }}
        >
          {tab.dot && (
            <div
              style={{
                position: "absolute",
                top: 8,
                right: "calc(50% - 14px)",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: C.gold,
              }}
            />
          )}
          <span
            style={{
              fontSize: 18,
              lineHeight: 1,
              color: screen === tab.id ? C.navy : C.textMuted,
              fontFamily: "system-ui",
              filter: screen === tab.id ? "none" : "grayscale(1) opacity(0.4)",
            }}
          >
            {tab.icon}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: screen === tab.id ? 700 : 500,
              color: screen === tab.id ? C.navy : C.textMuted,
              fontFamily: "'DM Sans'",
              letterSpacing: 0.5,
            }}
          >
            {tab.label.toUpperCase()}
          </span>
          {screen === tab.id && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: "25%",
                right: "25%",
                height: 2,
                background: C.gold,
                borderRadius: "2px 2px 0 0",
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("commander");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  function handleUsername(val) {
    setUsername(val.replace(/\s/g, "").toLowerCase());
  }

  async function doSignup() {
    setErr("");
    setOkMsg("");
    if (!fullName.trim()) return setErr("Please enter your full name.");
    if (!email.includes("@"))
      return setErr("Please enter a valid email address.");
    if (!username || username.length < 3)
      return setErr("Please enter a username.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== pw2) return setErr("Passwords do not match.");
    setLoading(true);
    const existing = await dbGetWhere("users", "email", email.toLowerCase());
    if (existing.length > 0) {
      setLoading(false);
      return setErr("Email already registered. Please log in.");
    }
    const existingUsername = await dbGetWhere("users", "username", username);
    if (existingUsername.length > 0) {
      setLoading(false);
      return setErr("Username taken. Try a different one.");
    }
    const newUser = {
      id: Date.now().toString(),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      username,
      passwordHash: hashPw(pw),
      role: "commander",
      createdAt: new Date().toISOString(),
    };
    const ok = await dbInsert("users", newUser);
    setLoading(false);
    if (!ok) return setErr("Failed to create account. Please try again.");
    setOkMsg("Account created! Signing you in...");
    setTimeout(() => onAuth(newUser), 1200);
  }

  async function doLogin() {
    setErr("");
    setOkMsg("");
    if (!email.trim() || !pw) return setErr("Please fill in all fields.");
    setLoading(true);
    const rows = await dbGetWhere("users", "email", email.trim().toLowerCase());
    const user = rows.find((u) => u.passwordHash === hashPw(pw));
    setLoading(false);
    if (user) {
      onAuth(user);
    } else {
      setErr("Incorrect email or password.");
    }
  }

  const isLogin = mode === "login";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, button { font-family: inherit; }
        input::placeholder { color: #c0c8d8; }
        input:focus { border-color: #f0a500 !important; box-shadow: 0 0 0 3px rgba(240,165,0,0.12) !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        .au { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .au2 { animation: fadeUp 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 400 }}>
        <div className="au" style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              background: C.navy,
              borderRadius: 24,
              marginBottom: 16,
              boxShadow: C.shadowLg,
            }}
          >
            <HaloLogo size={56} />
          </div>
          <div
            style={{
              fontFamily: "'Outfit'",
              fontSize: 26,
              fontWeight: 900,
              color: C.navy,
              letterSpacing: -0.5,
            }}
          >
            HALO<span style={{ color: C.gold }}>COMMANDER</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: C.textSub,
              marginTop: 4,
              fontFamily: "'DM Sans'",
              letterSpacing: 1,
            }}
          >
            HALOGEN GROUP · JOURNEY MANAGEMENT
          </div>
        </div>

        <div
          className="au2"
          style={{
            background: C.white,
            borderRadius: 20,
            padding: "28px 24px",
            boxShadow: C.shadowLg,
            border: `1.5px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              background: C.bg,
              borderRadius: 12,
              padding: 4,
              marginBottom: 24,
            }}
          >
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setErr("");
                  setOkMsg("");
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "none",
                  borderRadius: 9,
                  background: mode === m ? C.white : "transparent",
                  color: mode === m ? C.navy : C.textSub,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'DM Sans'",
                  boxShadow: mode === m ? C.shadow : "none",
                  transition: "all 0.2s",
                  letterSpacing: 0.5,
                }}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {err && (
            <AlertBox type="error" onClose={() => setErr("")}>
              {err}
            </AlertBox>
          )}
          {okMsg && <AlertBox type="success">{okMsg}</AlertBox>}

          {!isLogin && (
            <div>
              <Input
                label="FULL NAME"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Okafor"
              />
              <Input
                label="EMAIL ADDRESS"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <Input
                label="USERNAME"
                value={username}
                onChange={(e) => handleUsername(e.target.value)}
                placeholder="commanderyourname"
                autoCapitalize="none"
                hint="Choose a unique username (no spaces)"
              />
              <PwInput
                label="CREATE PASSWORD"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <PwInput
                label="CONFIRM PASSWORD"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSignup()}
              />
              <Btn onClick={doSignup} disabled={loading} variant="primary">
                {loading ? "Creating account..." : "Create Account"}
              </Btn>
              <p
                style={{
                  textAlign: "center",
                  marginTop: 16,
                  fontSize: 13,
                  color: C.textSub,
                  fontFamily: "'DM Sans'",
                }}
              >
                Already have an account?{" "}
                <span
                  onClick={() => setMode("login")}
                  style={{ color: C.gold, cursor: "pointer", fontWeight: 600 }}
                >
                  Log in
                </span>
              </p>
            </div>
          )}

          {isLogin && (
            <div>
              <Input
                label="EMAIL ADDRESS"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
              />
              <PwInput
                label="PASSWORD"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
              />
              <div style={{ marginBottom: 20 }} />
              <Btn onClick={doLogin} disabled={loading} variant="primary">
                {loading ? "Signing in..." : "Sign In"}
              </Btn>
              <p
                style={{
                  textAlign: "center",
                  marginTop: 16,
                  fontSize: 13,
                  color: C.textSub,
                  fontFamily: "'DM Sans'",
                }}
              >
                No account yet?{" "}
                <span
                  onClick={() => setMode("signup")}
                  style={{ color: C.gold, cursor: "pointer", fontWeight: 600 }}
                >
                  Sign up
                </span>
              </p>
            </div>
          )}
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 11,
            color: C.textMuted,
            fontFamily: "'DM Sans'",
          }}
        >
          Halogen Group · Confidential System
        </p>
      </div>
    </div>
  );
}

// ─── COMMANDER APP ────────────────────────────────────────────────────────────
function CommanderApp({ user, onLogout }) {
  const [screen, setScreen] = useState("home");
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const [legPhase, setLegPhase] = useState("depart");
  const [depInput, setDepInput] = useState("");
  const [arrInput, setArrInput] = useState("");
  const [form, setForm] = useState({
    date: getToday(),
    region: "",
    client: "",
    vehicleNumber: "",
    trackingStatus: "",
    timeOfPickup: "",
    pilotDriver: "",
  });

  useEffect(() => {
    loadAll();
    // Real-time subscription for tasks
    const channel = supabase
      .channel("tasks_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          loadAll();
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function loadAll() {
    const t = await dbGetAll("tasks");
    setTasks(t);
    const mine = t.find(
      (x) => x.commanderUsername === user.username && x.status === "Ongoing",
    );
    if (mine) setActiveTask(mine);
  }

  function flash(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3000);
  }

  const live = activeTask
    ? tasks.find((t) => t.id === activeTask.id) || activeTask
    : null;

  async function startTask() {
    if (!form.region || !form.client || !form.vehicleNumber) {
      flash("Fill in Region, Client and Vehicle Number.", "error");
      return;
    }
    const task = {
      id: Date.now().toString(),
      date: form.date,
      week: getWeek(form.date),
      month: getMonth(form.date),
      region: form.region,
      client: form.client,
      vehicleNumber: form.vehicleNumber,
      trackingStatus: form.trackingStatus,
      timeOfPickup: form.timeOfPickup,
      pilotDriver: form.pilotDriver,
      commanderName: user.fullName,
      commanderUsername: user.username,
      legs: [],
      finalDestination: "",
      completionTime: "",
      status: "Ongoing",
      createdAt: new Date().toISOString(),
    };
    await dbInsert("tasks", task);
    setTasks((prev) => [task, ...prev]);
    setActiveTask(task);
    setLegPhase("depart");
    setDepInput("");
    setArrInput("");
    setScreen("activeTask");
    flash("Task initiated. Log your first departure.");
  }

  async function doDepart() {
    if (!depInput.trim()) {
      flash("Enter departure point.", "error");
      return;
    }
    const time = getNow();
    const legs = [
      ...(live.legs || []),
      {
        departurePoint: depInput.trim(),
        timeDeparted: time,
        arrivalPoint: "",
        timeArrived: "",
      },
    ];
    const updated = { ...live, legs };
    await dbUpdate("tasks", "id", live.id, { legs });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setActiveTask(updated);
    setDepInput("");
    setLegPhase("arrive");
    flash(`Departed from ${depInput.trim()} at ${time}`);
  }

  async function doArrive() {
    if (!arrInput.trim()) {
      flash("Enter arrival point.", "error");
      return;
    }
    const time = getNow();
    const legs = [...(live.legs || [])];
    const li = legs.length - 1;
    if (li >= 0) {
      legs[li] = {
        ...legs[li],
        arrivalPoint: arrInput.trim(),
        timeArrived: time,
      };
    }
    const updated = { ...live, legs };
    await dbUpdate("tasks", "id", live.id, { legs });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setActiveTask(updated);
    setArrInput("");
    setLegPhase("depart");
    flash(`Arrived at ${arrInput.trim()} at ${time}`);
  }

  async function completeTask() {
    const time = getNow();
    const last = (live.legs || [])[live.legs.length - 1];
    const updates = {
      finalDestination: last?.arrivalPoint || "—",
      completionTime: time,
      status: "Completed",
    };
    await dbUpdate("tasks", "id", live.id, updates);
    const updated = { ...live, ...updates };
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setActiveTask(updated);
    flash("Task marked as completed.");
  }

  const myTasks = tasks.filter((t) => t.commanderUsername === user.username);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'DM Sans', sans-serif",
        paddingBottom: 80,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, button { font-family: inherit; }
        input::placeholder { color: #c0c8d8; }
        input:focus, select:focus { border-color: #f0a500 !important; box-shadow: 0 0 0 3px rgba(240,165,0,0.12) !important; outline: none; }
        ::-webkit-scrollbar { width: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        @keyframes panicPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        .screen { animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: C.navy,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 2px 12px rgba(13,27,62,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HaloLogo size={34} />
          <div>
            <div
              style={{
                fontFamily: "'Outfit'",
                fontSize: 15,
                fontWeight: 800,
                color: C.white,
                letterSpacing: -0.3,
              }}
            >
              HALO<span style={{ color: C.gold }}>COMMANDER</span>
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: 1.5,
                fontFamily: "'DM Sans'",
              }}
            >
              HALOGEN GROUP
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.white,
                fontFamily: "'DM Sans'",
              }}
            >
              {user.fullName.split(" ")[0]}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'DM Sans'",
              }}
            >
              {user.username}
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "6px 12px",
              color: "rgba(255,255,255,0.7)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'DM Sans'",
              fontWeight: 600,
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} />

      <div style={{ padding: "20px 16px", maxWidth: 500, margin: "0 auto" }}>
        {/* HOME */}
        {screen === "home" && (
          <div className="screen">
            <div
              style={{
                background: C.navy,
                borderRadius: 20,
                padding: "24px 20px",
                marginBottom: 20,
                position: "relative",
                overflow: "hidden",
                boxShadow: C.shadowLg,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -20,
                  top: -20,
                  opacity: 0.07,
                }}
              >
                <HaloLogo size={160} />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "'DM Sans'",
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                WELCOME BACK
              </div>
              <div
                style={{
                  fontFamily: "'Outfit'",
                  fontSize: 22,
                  fontWeight: 800,
                  color: C.white,
                  marginBottom: 4,
                }}
              >
                {user.fullName}
              </div>
              <div
                style={{ fontSize: 12, color: C.gold, fontFamily: "'DM Sans'" }}
              >
                {user.username}
              </div>
              {live && (
                <div
                  style={{
                    marginTop: 14,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: C.gold,
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: C.goldLight,
                      fontFamily: "'DM Sans'",
                      fontWeight: 600,
                    }}
                  >
                    Active task: {live.client}
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                { label: "Total Ops", value: myTasks.length, icon: "📊" },
                {
                  label: "Ongoing",
                  value: myTasks.filter((t) => t.status === "Ongoing").length,
                  icon: "🔴",
                },
                {
                  label: "Completed",
                  value: myTasks.filter((t) => t.status === "Completed").length,
                  icon: "✅",
                },
              ].map((s, i) => (
                <Card
                  key={i}
                  style={{ textAlign: "center", padding: "16px 10px" }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: "'Outfit'",
                      fontSize: 22,
                      fontWeight: 800,
                      color: C.navy,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: C.textSub,
                      fontFamily: "'DM Sans'",
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </div>
                </Card>
              ))}
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.textSub,
                letterSpacing: 1,
                marginBottom: 12,
                fontFamily: "'DM Sans'",
              }}
            >
              QUICK ACTIONS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Card
                hover
                onClick={() => setScreen("newTask")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    background: C.navy,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  🚀
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Outfit'",
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.navy,
                    }}
                  >
                    Start New Task
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textSub,
                      fontFamily: "'DM Sans'",
                      marginTop: 2,
                    }}
                  >
                    Log a new journey or escort operation
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    color: C.textMuted,
                    fontSize: 18,
                  }}
                >
                  ›
                </div>
              </Card>
              <Card
                hover
                onClick={() => setScreen("activeTask")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  opacity: live ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    background: live ? C.goldBg : C.bg,
                    border: `1.5px solid ${live ? C.goldBorder : C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  📡
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Outfit'",
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.navy,
                    }}
                  >
                    Active Task
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textSub,
                      fontFamily: "'DM Sans'",
                      marginTop: 2,
                    }}
                  >
                    {live
                      ? `${live.client} — ${live.region}`
                      : "No active task"}
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    color: C.textMuted,
                    fontSize: 18,
                  }}
                >
                  ›
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* NEW TASK */}
        {screen === "newTask" && (
          <div className="screen">
            <SectionHeading sub="Fill in the task details below">
              New Task Briefing
            </SectionHeading>
            <Card>
              <Input
                label="DATE OF TASK"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
              <SelectInput
                label="REGION"
                value={form.region}
                onChange={(e) =>
                  setForm((f) => ({ ...f, region: e.target.value }))
                }
              >
                <option value="">Select region...</option>
                {REGION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectInput>
              <Input
                label="CLIENT / TASK"
                value={form.client}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client: e.target.value }))
                }
                placeholder="Client name or task description..."
              />
              <Input
                label="VEHICLE NUMBER"
                value={form.vehicleNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vehicleNumber: e.target.value }))
                }
                placeholder="e.g. LAG-234-XY"
              />
              <SelectInput
                label="TRACKING STATUS"
                value={form.trackingStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trackingStatus: e.target.value }))
                }
              >
                <option value="">Select tracking status...</option>
                {TRACKING_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectInput>
              <Input
                label="TIME OF PICKUP"
                type="time"
                value={form.timeOfPickup}
                onChange={(e) =>
                  setForm((f) => ({ ...f, timeOfPickup: e.target.value }))
                }
              />
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.textSub,
                    letterSpacing: 1,
                    marginBottom: 6,
                    fontFamily: "'DM Sans'",
                  }}
                >
                  COMMANDER
                </label>
                <div
                  style={{
                    padding: "12px 14px",
                    background: C.goldBg,
                    border: `1.5px solid ${C.goldBorder}`,
                    borderRadius: 10,
                    fontSize: 14,
                    color: C.goldDark,
                    fontWeight: 600,
                    fontFamily: "'DM Sans'",
                  }}
                >
                  {user.fullName}
                </div>
              </div>
              <Input
                label="PILOT / DRIVER"
                value={form.pilotDriver}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pilotDriver: e.target.value }))
                }
                placeholder="Driver's full name..."
              />
              <Btn onClick={startTask} variant="primary" icon="🚀">
                Initiate Task
              </Btn>
            </Card>
          </div>
        )}

        {/* ACTIVE TASK */}
        {screen === "activeTask" && (
          <div className="screen">
            <SectionHeading sub="Live situation report">
              Active Task
            </SectionHeading>

            {!live ? (
              <Card style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
                <div
                  style={{
                    fontFamily: "'Outfit'",
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.navy,
                    marginBottom: 8,
                  }}
                >
                  No Active Task
                </div>
                <div
                  style={{
                    color: C.textSub,
                    fontSize: 13,
                    fontFamily: "'DM Sans'",
                    marginBottom: 20,
                  }}
                >
                  Start a new task to begin logging
                </div>
                <Btn
                  onClick={() => setScreen("newTask")}
                  variant="primary"
                  icon="🚀"
                >
                  Start New Task
                </Btn>
              </Card>
            ) : (
              <div>
                <Card
                  style={{
                    marginBottom: 14,
                    background: C.navy,
                    border: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "'Outfit'",
                          fontSize: 19,
                          fontWeight: 800,
                          color: C.white,
                          marginBottom: 4,
                        }}
                      >
                        {live.client}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.55)",
                          fontFamily: "'DM Sans'",
                        }}
                      >
                        {live.region} · {live.date}
                      </div>
                    </div>
                    <Badge status={live.status} />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {[
                      ["🚗 Vehicle", live.vehicleNumber],
                      ["⏰ Pickup", live.timeOfPickup || "—"],
                      ["👤 Driver", live.pilotDriver || "—"],
                      [
                        "📡 Tracking",
                        (live.trackingStatus || "—")
                          .split("-")
                          .slice(0, 2)
                          .join("-"),
                      ],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          borderRadius: 10,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,0.4)",
                            letterSpacing: 1,
                            marginBottom: 3,
                            fontFamily: "'DM Sans'",
                          }}
                        >
                          {k}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: C.white,
                            fontWeight: 600,
                            fontFamily: "'DM Sans'",
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* PANIC BUTTON */}
                <PanicButton user={user} taskId={live.id} />

                {/* LIVE LOCATION */}
                <LocationCard
                  user={user}
                  taskId={live.id}
                  onSuccess={(msg) => flash(msg, "success")}
                />

                {/* Movement Log */}
                {(live.legs || []).length > 0 && (
                  <Card style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.textSub,
                        letterSpacing: 1,
                        marginBottom: 14,
                        fontFamily: "'DM Sans'",
                      }}
                    >
                      MOVEMENT LOG · {live.legs.length} LEG
                      {live.legs.length !== 1 ? "S" : ""}
                    </div>
                    {live.legs.map((leg, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 12,
                          marginBottom: i < live.legs.length - 1 ? 16 : 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: 20,
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              border: `2px solid ${i === live.legs.length - 1 ? C.gold : C.border}`,
                              background:
                                i === live.legs.length - 1 ? C.gold : C.white,
                              flexShrink: 0,
                              marginTop: 3,
                            }}
                          />
                          {i < live.legs.length - 1 && (
                            <div
                              style={{
                                width: 2,
                                flex: 1,
                                background: C.border,
                                marginTop: 4,
                              }}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            paddingBottom: i < live.legs.length - 1 ? 8 : 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: C.textMuted,
                              letterSpacing: 0.5,
                              fontFamily: "'DM Sans'",
                              marginBottom: 4,
                            }}
                          >
                            LEG {i + 1}
                          </div>
                          {leg.departurePoint && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: C.danger,
                                  background: C.dangerBg,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontFamily: "'DM Sans'",
                                }}
                              >
                                DEP
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  color: C.text,
                                  fontFamily: "'DM Sans'",
                                }}
                              >
                                {leg.departurePoint}
                              </span>
                              {leg.timeDeparted && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: C.textMuted,
                                    marginLeft: "auto",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {leg.timeDeparted}
                                </span>
                              )}
                            </div>
                          )}
                          {leg.arrivalPoint && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: C.success,
                                  background: C.successBg,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontFamily: "'DM Sans'",
                                }}
                              >
                                ARR
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  color: C.text,
                                  fontFamily: "'DM Sans'",
                                }}
                              >
                                {leg.arrivalPoint}
                              </span>
                              {leg.timeArrived && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: C.textMuted,
                                    marginLeft: "auto",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {leg.timeArrived}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </Card>
                )}

                {live.status === "Ongoing" && (
                  <div>
                    {legPhase === "depart" && (
                      <Card
                        style={{
                          marginBottom: 12,
                          border: `1.5px solid ${C.danger}33`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: C.dangerBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 16,
                            }}
                          >
                            ↑
                          </div>
                          <div>
                            <div
                              style={{
                                fontFamily: "'Outfit'",
                                fontSize: 14,
                                fontWeight: 700,
                                color: C.danger,
                              }}
                            >
                              Departing From
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: C.textSub,
                                fontFamily: "'DM Sans'",
                              }}
                            >
                              Enter your current departure point
                            </div>
                          </div>
                        </div>
                        <input
                          value={depInput}
                          onChange={(e) => setDepInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && doDepart()}
                          placeholder="Location name or address..."
                          style={inpStyle({ marginBottom: 12 })}
                          autoFocus
                        />
                        <Btn onClick={doDepart} variant="danger" icon="↑">
                          Log Departure · {getNow()}
                        </Btn>
                      </Card>
                    )}

                    {legPhase === "arrive" && (
                      <Card
                        style={{
                          marginBottom: 12,
                          border: `1.5px solid ${C.success}33`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: C.successBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 16,
                            }}
                          >
                            ↓
                          </div>
                          <div>
                            <div
                              style={{
                                fontFamily: "'Outfit'",
                                fontSize: 14,
                                fontWeight: 700,
                                color: C.success,
                              }}
                            >
                              Arrived At
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: C.textSub,
                                fontFamily: "'DM Sans'",
                              }}
                            >
                              Enter your current arrival point
                            </div>
                          </div>
                        </div>
                        <input
                          value={arrInput}
                          onChange={(e) => setArrInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && doArrive()}
                          placeholder="Location name or address..."
                          style={inpStyle({ marginBottom: 12 })}
                          autoFocus
                        />
                        <Btn onClick={doArrive} variant="success" icon="↓">
                          Log Arrival · {getNow()}
                        </Btn>
                      </Card>
                    )}

                    <Divider />
                    <Btn onClick={completeTask} variant="outline" icon="✓">
                      Mark Task Complete
                    </Btn>
                  </div>
                )}

                {live.status === "Completed" && (
                  <Card
                    style={{
                      textAlign: "center",
                      padding: "28px 20px",
                      border: `1.5px solid ${C.success}33`,
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: C.successBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        margin: "0 auto 14px",
                      }}
                    >
                      ✓
                    </div>
                    <div
                      style={{
                        fontFamily: "'Outfit'",
                        fontSize: 18,
                        fontWeight: 800,
                        color: C.success,
                        marginBottom: 8,
                      }}
                    >
                      Task Completed
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: C.textSub,
                        fontFamily: "'DM Sans'",
                        lineHeight: 1.8,
                      }}
                    >
                      Final destination:{" "}
                      <strong style={{ color: C.text }}>
                        {live.finalDestination}
                      </strong>
                      <br />
                      Completed at:{" "}
                      <strong style={{ color: C.text }}>
                        {live.completionTime}
                      </strong>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {screen === "history" && (
          <div className="screen">
            <SectionHeading sub={`${myTasks.length} total operations`}>
              My Task History
            </SectionHeading>
            {myTasks.length === 0 ? (
              <Card style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div
                  style={{
                    fontFamily: "'Outfit'",
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.navy,
                  }}
                >
                  No tasks yet
                </div>
                <div
                  style={{
                    color: C.textSub,
                    marginTop: 8,
                    fontFamily: "'DM Sans'",
                    fontSize: 13,
                  }}
                >
                  Your completed tasks will appear here
                </div>
              </Card>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {myTasks.map((task) => (
                  <Card
                    key={task.id}
                    style={{
                      borderLeft: `3px solid ${task.status === "Completed" ? C.success : C.gold}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: "'Outfit'",
                            fontSize: 15,
                            fontWeight: 700,
                            color: C.navy,
                          }}
                        >
                          {task.client}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: C.textSub,
                            fontFamily: "'DM Sans'",
                            marginTop: 2,
                          }}
                        >
                          {task.region} · {task.date}
                        </div>
                      </div>
                      <Badge status={task.status} />
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {[
                        ["🚗", task.vehicleNumber],
                        ["📍", task.region],
                        ["🔗", `${(task.legs || []).length} legs`],
                      ].map(([ic, v]) => (
                        <div
                          key={ic}
                          style={{
                            fontSize: 11,
                            color: C.textSub,
                            fontFamily: "'DM Sans'",
                          }}
                        >
                          {ic} {v}
                        </div>
                      ))}
                    </div>
                    {task.status === "Completed" && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: `1px solid ${C.border}`,
                          fontSize: 11,
                          color: C.textSub,
                          fontFamily: "'DM Sans'",
                        }}
                      >
                        ✓ Completed at {task.completionTime} · Final:{" "}
                        {task.finalDestination}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav screen={screen} setScreen={setScreen} hasActive={!!live} />
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("halocommander_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState(
    window.location.pathname === "/control" ? "control" : "commander",
  );

  useEffect(() => {
    const handlePath = () => {
      setPage(
        window.location.pathname === "/control" ? "control" : "commander",
      );
    };
    window.addEventListener("popstate", handlePath);
    return () => window.removeEventListener("popstate", handlePath);
  }, []);

  function handleLogin(u) {
    localStorage.setItem("halocommander_session", JSON.stringify(u));
    setUser(u);
  }

  function handleLogout() {
    localStorage.removeItem("halocommander_session");
    setUser(null);
  }

  if (page === "control") {
    return <ControlRoom />;
  }

  return user ? (
    <CommanderApp user={user} onLogout={handleLogout} />
  ) : (
    <AuthScreen onAuth={handleLogin} />
  );
}
