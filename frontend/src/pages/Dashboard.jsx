import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { listContributions } from "../api/contributions";
import { listHistory } from "../api/payments";

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

export default function Dashboard() {
  const { displayName } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listContributions(), listHistory()]).then(([c, p]) => {
      setContributions(c);
      setPayments(p);
      setLoading(false);
    });
  }, []);

  const outstanding = useMemo(() => contributions.filter((c) => !c.has_paid), [contributions]);

  const totals = useMemo(() => {
    const success = payments.filter((p) => p.status === "success");
    const pending = payments.filter((p) => p.status === "pending");
    return {
      paid: success.reduce((s, p) => s + Number(p.amount), 0),
      pendingAmount: pending.reduce((s, p) => s + Number(p.amount), 0),
      outstandingCount: outstanding.length,
    };
  }, [payments, outstanding]);

  if (loading) {
    return (
      <AppShell>
        <p>Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1>Hello, {displayName.split(" ")[0]}</h1>
      <p style={{ color: "var(--muted)" }}>Here's where things stand with your departmental contributions.</p>

      <div className="tiles">
        <div className="tile">
          <div className="label">Total confirmed paid</div>
          <div className="value paid">{formatNaira(totals.paid)}</div>
        </div>
        <div className="tile">
          <div className="label">Awaiting confirmation</div>
          <div className="value pending">{formatNaira(totals.pendingAmount)}</div>
        </div>
        <div className="tile">
          <div className="label">Contributions outstanding</div>
          <div className="value">{totals.outstandingCount}</div>
        </div>
      </div>

      <h2>Needs your attention</h2>
      {outstanding.length === 0 ? (
        <div className="ledger-card">
          <div className="empty-state">
            <h3>You're all caught up</h3>
            <p>No outstanding contributions right now.</p>
          </div>
        </div>
      ) : (
        <div className="ledger-card">
          {outstanding.map((c) => (
            <div className="stub-row" key={c.id}>
              <div>
                <strong>{c.title}</strong>
                <div className="ref-code">Due {new Date(c.deadline).toLocaleString()} · {formatNaira(c.amount)}</div>
              </div>
              <Link className="btn btn-sm" to="/contributions">
                Pay now
              </Link>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 32 }}>Recent activity</h2>
      {payments.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No payments yet.</p>
      ) : (
        <div className="ledger-card">
          {payments.slice(0, 5).map((p) => (
            <div className="stub-row" key={p.id}>
              <div>
                <strong>{p.contribution}</strong>
                <div className="ref-code">{p.reference} · {formatNaira(p.amount)}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
