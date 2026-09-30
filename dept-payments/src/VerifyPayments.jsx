import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { getUnverifiedPayments } from "../../api/payments";

// Renamed from "Verify Payments": there's no approve/reject action anymore.
// Refund decisions happen in the Django admin — this is a read-only list of
// payments whose amount didn't match what was expected, admin-only.
export default function PaymentsNeedingReview() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUnverifiedPayments().then(({ results }) => {
      setRows(results);
      setLoading(false);
    });
  }, []);

  if (loading) return <AppShell><p>Loading…</p></AppShell>;

  return (
    <AppShell>
      <h1>Payments needing review</h1>
      <p style={{ color: "var(--muted)" }}>
        Payments where the amount received didn't match what was expected. Refund decisions are made in the Django admin.
      </p>

      {rows.length === 0 ? (
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
              {rows.map((r) => (
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
    </AppShell>
  );
}
