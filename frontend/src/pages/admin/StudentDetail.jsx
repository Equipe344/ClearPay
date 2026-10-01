import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { listContributions, getContributionPayments } from "../../api/contributions";

// There's no dedicated "one student" endpoint on the backend — a student's
// status is read by filtering GET /contributions/:id/payments/ by matric
// number, per contribution. This page shows that student's status across
// every contribution so an admin gets a fuller picture than one row.
export default function StudentDetail() {
  const { matric } = useParams();
  const [searchParams] = useSearchParams();
  const initialContributionId = searchParams.get("contribution");
  const matricNumber = decodeURIComponent(matric);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const contributions = await listContributions();
      const perContribution = await Promise.all(
        contributions.map(async (c) => {
          const payments = await getContributionPayments(c.id);
          const row = payments.find((p) => p.matric_number === matricNumber);
          return row ? { contribution: c, ...row } : null;
        })
      );
      if (cancelled) return;
      const found = perContribution.filter(Boolean);
      setRows(found);
      setStudentName(found[0]?.student || "");
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [matricNumber]);

  if (loading) return <AppShell><p>Loading…</p></AppShell>;

  const backHref = initialContributionId ? `/admin?contribution=${initialContributionId}` : "/admin";

  return (
    <AppShell>
      <Link className="btn-ghost btn-sm" to={backHref} style={{ paddingLeft: 0 }}>← Back to dashboard</Link>

      <div className="topline" style={{ marginTop: 8 }}>
        <h1>{studentName || matricNumber}</h1>
      </div>

      <div className="ledger-card" style={{ padding: "20px 24px", marginBottom: 24 }}>
        <table className="data">
          <tbody>
            <tr><td style={{ width: 160 }}>Matric number</td><td className="ref-code">{matricNumber}</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Status by contribution</h2>

      {rows.length === 0 ? (
        <div className="ledger-card">
          <div className="empty-state">
            <h3>No records</h3>
            <p>This student isn't eligible for any open contribution.</p>
          </div>
        </div>
      ) : (
        <div className="ledger-card" style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Contribution</th>
                <th>Amount</th>
                <th>Paid at</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.contribution.id}>
                  <td>{r.contribution.title}</td>
                  <td>₦{Number(r.contribution.amount).toLocaleString()}</td>
                  <td>{r.paid_at ? new Date(r.paid_at).toLocaleDateString() : "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
