import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { listPayments } from "../api/payments";
import { listContributions } from "../api/contributions";

function ReceiptModal({ payment, contribution, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Receipt</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="ledger-card" style={{ padding: 20 }}>
          <p className="ref-code" style={{ marginBottom: 4 }}>{payment.reference}</p>
          <h3 style={{ marginBottom: 4 }}>{contribution?.title}</h3>
          <StatusBadge status={payment.status} />
          <table className="data" style={{ marginTop: 18 }}>
            <tbody>
              <tr><td>Amount</td><td>₦{Number(payment.amount).toLocaleString()}</td></tr>
              <tr><td>Channel</td><td style={{ textTransform: "capitalize" }}>{payment.channel.replace("_", " ")}</td></tr>
              <tr><td>Submitted</td><td>{new Date(payment.submitted_at).toLocaleString()}</td></tr>
              {payment.verified_at && (
                <tr><td>Verified</td><td>{new Date(payment.verified_at).toLocaleString()} by {payment.verified_by}</td></tr>
              )}
              {payment.note && <tr><td>Note</td><td>{payment.note}</td></tr>}
            </tbody>
          </table>
        </div>
        <button className="btn btn-outline btn-block" style={{ marginTop: 16 }} onClick={() => window.print()}>
          Print / save as PDF
        </button>
      </div>
    </div>
  );
}

export default function History() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listPayments({ studentId: user.id }), listContributions()]).then(([p, c]) => {
      setPayments(p);
      setContributions(c);
      setLoading(false);
    });
  }, [user.id]);

  if (loading) return <AppShell><p>Loading history…</p></AppShell>;

  return (
    <AppShell>
      <h1>Payment history</h1>
      <p style={{ color: "var(--muted)" }}>Every payment you've submitted, and its current status.</p>

      {payments.length === 0 ? (
        <div className="ledger-card">
          <div className="empty-state">
            <h3>Nothing here yet</h3>
            <p>Once you submit a payment, it'll show up in this list.</p>
          </div>
        </div>
      ) : (
        <div className="ledger-card" style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Contribution</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const c = contributions.find((c) => c.id === p.contribution_id);
                return (
                  <tr key={p.id}>
                    <td className="ref-code">{p.reference}</td>
                    <td>{c?.title || "—"}</td>
                    <td>₦{Number(p.amount).toLocaleString()}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>{new Date(p.submitted_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-ghost btn-sm" onClick={() => setReceipt(p)}>View receipt</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {receipt && (
        <ReceiptModal
          payment={receipt}
          contribution={contributions.find((c) => c.id === receipt.contribution_id)}
          onClose={() => setReceipt(null)}
        />
      )}
    </AppShell>
  );
}
