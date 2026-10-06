import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import { listHistory, getReceipt } from "../api/payments";

function ReceiptModal({ payment, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Receipt</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="ledger-card" style={{ padding: 20 }}>
          <p className="ref-code" style={{ marginBottom: 4 }}>{payment.reference}</p>
          <h3 style={{ marginBottom: 4 }}>{payment.contribution}</h3>
          <StatusBadge status={payment.status} />
          <table className="data" style={{ marginTop: 18 }}>
            <tbody>
              <tr><td>Amount</td><td>₦{Number(payment.amount).toLocaleString()}</td></tr>
              <tr><td>Method</td><td style={{ textTransform: "capitalize" }}>{payment.method}</td></tr>
              {payment.channel && (
                <tr><td>Channel</td><td style={{ textTransform: "capitalize" }}>{payment.channel.replace("_", " ")}</td></tr>
              )}
              <tr><td>Created</td><td>{new Date(payment.created_at).toLocaleString()}</td></tr>
              {payment.verified_at && (
                <tr><td>Verified</td><td>{new Date(payment.verified_at).toLocaleString()}</td></tr>
              )}
              {payment.note && <tr><td>Note</td><td>{payment.note}</td></tr>}
              {payment.proof_file_name && <tr><td>Proof file</td><td>{payment.proof_file_name}</td></tr>}
              {payment.refund_status && payment.refund_status !== "none" && (
                <tr><td>Refund status</td><td style={{ textTransform: "capitalize" }}>{payment.refund_status.replace("_", " ")}</td></tr>
              )}
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
  const [payments, setPayments] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHistory().then((p) => {
      setPayments(p);
      setLoading(false);
    });
  }, []);

  async function viewReceipt(payment) {
    try {
      const full = await getReceipt(payment.id);
      setReceipt(full);
    } catch {
      setReceipt(payment);
    }
  }

  if (loading) return <AppShell><p>Loading history…</p></AppShell>;

  return (
    <AppShell>
      <h1>Payment history</h1>
      <p style={{ color: "var(--muted)" }}>Every payment you've made, and its current status.</p>

      {payments.length === 0 ? (
        <div className="ledger-card">
          <div className="empty-state">
            <h3>Nothing here yet</h3>
            <p>Once you pay a contribution, it'll show up in this list.</p>
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
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="ref-code">{p.reference}</td>
                  <td>{p.contribution}</td>
                  <td>₦{Number(p.amount).toLocaleString()}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-ghost btn-sm" onClick={() => viewReceipt(p)}>View receipt</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}
