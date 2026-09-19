import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { getStudentDetail } from "../../api/students";
import { CURRENT_SESSION } from "../../constants";

export default function StudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentDetail(id)
      .then(setStudent)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppShell><p>Loading…</p></AppShell>;
  if (error || !student) {
    return (
      <AppShell>
        <div className="banner error">{error || "Student not found."}</div>
        <Link className="btn-ghost" to="/admin">← Back to dashboard</Link>
      </AppShell>
    );
  }

  const currentRow = student.history.find((h) => h.session === CURRENT_SESSION);

  return (
    <AppShell>
      <Link className="btn-ghost btn-sm" to="/admin" style={{ paddingLeft: 0 }}>← Back to dashboard</Link>

      <div className="topline" style={{ marginTop: 8 }}>
        <h1>{student.full_name}</h1>
      </div>

      <div className="ledger-card" style={{ padding: "20px 24px", marginBottom: 24 }}>
        <table className="data">
          <tbody>
            <tr><td style={{ width: 160 }}>Matric number</td><td className="ref-code">{student.matric_no}</td></tr>
            <tr><td>Email</td><td>{student.email}</td></tr>
            <tr><td>Department</td><td>{student.department}</td></tr>
            <tr><td>Level</td><td>{student.level}</td></tr>
            <tr>
              <td>Current session ({CURRENT_SESSION})</td>
              <td><StatusBadge status={currentRow?.status || "unpaid"} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Payment history across sessions</h2>
      <p style={{ color: "var(--muted)" }}> — corrections happen through the payment verification queue.</p>

      <div className="ledger-card" style={{ overflowX: "auto" }}>
        <table className="data">
          <thead>
            <tr>
              <th>Session</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {student.history.map((h) => (
              <tr key={h.session}>
                <td>{h.session}{h.session === CURRENT_SESSION ? " (current)" : ""}</td>
                <td>{h.amount ? `₦${Number(h.amount).toLocaleString()}` : "—"}</td>
                <td>{h.date ? new Date(h.date).toLocaleDateString() : "—"}</td>
                <td><StatusBadge status={h.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
