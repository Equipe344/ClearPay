import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { getUnverifiedPayments, getPendingPayments, reviewPayment } from "../../api/payments";
import { getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

// Two queues, both admin/rep:
//   * offline self-reported payments awaiting approve/reject (with proof), and
//   * amount-mismatch refund reviews (read-only — decided in the Django admin).
export default function VerifyPayments() {
  const { isAdmin } = useAuth();
  const [pending, setPending] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    // The refund queue is admin-only; a class rep only sees offline verifications.
    const [p, r] = await Promise.all([
      getPendingPayments(),
      isAdmin ? getUnverifiedPayments() : Promise.resolve({ results: [] }),
    ]);
    setPending(p.results || []);
    setRefunds(r.results || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, action) {
    setError("");
    setBusyId(id);
    try {
      await reviewPayment(id, { action });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <AppShell><p>Loading…</p></AppShell>;

  return (
    <AppShell>
      <h1>Verify payments</h1>
      {error && <div className="banner error">{error}</div>}

      <h2>Offline payments to verify</h2>
      <p style={{ color: "var(--muted)" }}>
        Self-reported bank transfer / POS / cash payments with proof, awaiting your approval.
      </p>

      {pending.length === 0 ? (
        <div className="ledger-card">
          <div className="empty-state">
            <h3>Nothing here</h3>
            <p>No offline payments are awaiting verification.</p>
          </div>
        </div>
      ) : (
        <div className="ledger-card" style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Student</th>
                <th>Contribution</th>
                <th>Amount</th>
                <th>Channel</th>
                <th>Proof</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td className="ref-code">{r.reference}</td>
                  <td>{r.student_name} <span className="ref-code">({r.student_matric})</span></td>
                  <td>{r.contribution_title}</td>
                  <td>₦{Number(r.amount).toLocaleString()}</td>
                  <td style={{ textTransform: "capitalize" }}>{(r.channel || "").replace("_", " ")}</td>
                  <td>{r.proof_url ? <a href={r.proof_url} target="_blank" rel="noreferrer">View proof</a> : "—"}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn btn-sm" disabled={busyId === r.id} onClick={() => decide(r.id, "approve")}>
                      Approve
                    </button>{" "}
                    <button className="btn-ghost btn-sm" disabled={busyId === r.id} onClick={() => decide(r.id, "reject")}>
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <>
      <h2 style={{ marginTop: 32 }}>Refund review</h2>
      <p style={{ color: "var(--muted)" }}>
        Payments where the amount received didn't match what was expected. Refund decisions are made in the Django admin.
      </p>

      {refunds.length === 0 ? (
        <div className="ledger-card">
          <div className="empty-state">
            <h3>Nothing here</h3>
            <p>No payments currently need review.</p>
          </div>
        </div>
      ) : (
        <div className="ledger-card" style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Student</th>
                <th>Contribution</th>
                <th>Expected</th>
                <th>Received</th>
                <th>Refund status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id}>
                  <td className="ref-code">{r.reference}</td>
                  <td>{r.student_name} <span className="ref-code">({r.student_matric})</span></td>
                  <td>{r.contribution_title}</td>
                  <td>₦{Number(r.expected_amount).toLocaleString()}</td>
                  <td>₦{Number(r.amount_received).toLocaleString()}</td>
                  <td style={{ textTransform: "capitalize" }}>{r.refund_status.replace("_", " ")}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </AppShell>
  );
}
