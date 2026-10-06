import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listNotifications, markNotificationRead } from "../api/notifications";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    listNotifications().then((rows) => {
      setNotifications(rows);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleOpenNotification(n) {
    if (!n.is_read) {
      setNotifications((rows) => rows.map((r) => (r.id === n.id ? { ...r, is_read: true } : r)));
      try {
        await markNotificationRead(n.id);
      } catch {
        // Best-effort — leave it marked read locally even if the request fails.
      }
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn-ghost btn-sm"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        style={{ position: "relative", fontSize: "1.05rem" }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "var(--rejected, #c0392b)",
              color: "#fff",
              borderRadius: "50%",
              minWidth: 16,
              height: 16,
              fontSize: "0.65rem",
              lineHeight: "16px",
              textAlign: "center",
              padding: "0 3px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="ledger-card"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 320,
            maxHeight: 380,
            overflowY: "auto",
            padding: 0,
            zIndex: 20,
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600 }}>
            Notifications
          </div>
          {loading ? (
            <div style={{ padding: 16, color: "var(--muted)" }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 16, color: "var(--muted)" }}>Nothing yet.</div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={n.contribution ? `/contributions` : "#"}
                onClick={() => handleOpenNotification(n)}
                style={{
                  display: "block",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--line)",
                  background: n.is_read ? "transparent" : "var(--paper-raised)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: "0.88rem" }}>{n.message}</div>
                <div className="ref-code" style={{ marginTop: 4 }}>{timeAgo(n.created_at)}</div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
