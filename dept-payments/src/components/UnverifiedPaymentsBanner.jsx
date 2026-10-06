import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUnverifiedPayments } from "../api/payments";
import { useAuth } from "../context/AuthContext";

// Admin-only: a small "N payments need review" nudge toward the read-only
// review list. Class reps don't see this — the review endpoint is admin-only.
export default function UnverifiedPaymentsBanner() {
  const { isAdmin } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getUnverifiedPayments().then(({ count: c }) => {
      if (!cancelled) {
        setCount(c);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin || loading || dismissed || count === 0) return null;

  return (
    <div className="banner info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <strong>
        {count} payment{count === 1 ? "" : "s"} need{count === 1 ? "s" : ""} review
      </strong>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Link to="/admin/verify" className="btn btn-sm">
          Review now
        </Link>
        <button className="btn-ghost btn-sm" onClick={() => setDismissed(true)} aria-label="Dismiss">
          Dismiss
        </button>
      </div>
    </div>
  );
}
