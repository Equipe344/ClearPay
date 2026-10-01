import { useState } from "react";
import AppShell from "../../components/AppShell";
import { setUserRoleByMatric, issueResetCode } from "../../api/auth";
import { getErrorMessage } from "../../api/client";

// A rep is a normal student until an admin ticks them — so only the two
// self-service-able roles are offered (the backend rejects anything else).
const ROLES = [
  { value: "student", label: "Student" },
  { value: "class_rep", label: "Class rep" },
];

export default function ManageRoles() {
  const [matric, setMatric] = useState("");
  const [role, setRole] = useState("class_rep");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset-code issuer (assisted password reset): the rep/admin shares the code
  // with the student, who redeems it on the Forgot-password page.
  const [resetMatric, setResetMatric] = useState("");
  const [resetCode, setResetCode] = useState(null);
  const [resetError, setResetError] = useState("");
  const [issuing, setIssuing] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setSaving(true);
    try {
      const user = await setUserRoleByMatric(matric, role);
      setResult(user);
    } catch (err) {
      setError(getErrorMessage(err) || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleIssueCode(e) {
    e.preventDefault();
    setResetError("");
    setResetCode(null);
    setIssuing(true);
    try {
      const res = await issueResetCode(resetMatric);
      setResetCode(res);
    } catch (err) {
      setResetError(getErrorMessage(err) || err.message);
    } finally {
      setIssuing(false);
    }
  }

  return (
    <AppShell>
      <h1>Manage users</h1>
      <p style={{ color: "var(--muted)" }}>Promote a class rep, or issue a password-reset code for a student.</p>

      <div className="ledger-card" style={{ maxWidth: 460, padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Change a role</h3>
        {error && <div className="banner error">{error}</div>}
        {result && (
          <div className="banner success">
            {result.full_name || result.username || "User"} is now{" "}
            <strong style={{ textTransform: "capitalize" }}>{(result.role || "").replace("_", " ")}</strong>.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Matric number</label>
            <input required value={matric} onChange={(e) => setMatric(e.target.value)} placeholder="CSC/2021/041" />
          </div>
          <div className="field">
            <label>New role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-block" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Update role"}
          </button>
        </form>
      </div>

      <div className="ledger-card" style={{ maxWidth: 460, padding: 24 }}>
        <h3 style={{ marginTop: 0 }}>Issue a password-reset code</h3>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Hand this one-time code to the student; they redeem it on the Forgot-password page. It expires in 30 minutes.
        </p>
        {resetError && <div className="banner error">{resetError}</div>}
        {resetCode && (
          <div className="banner success">
            Code for {resetCode.matric_number}: <strong className="ref-code">{resetCode.code}</strong>
          </div>
        )}
        <form onSubmit={handleIssueCode}>
          <div className="field">
            <label>Student matric number</label>
            <input required value={resetMatric} onChange={(e) => setResetMatric(e.target.value)} placeholder="CSC/2021/041" />
          </div>
          <button className="btn btn-block" type="submit" disabled={issuing}>
            {issuing ? "Issuing…" : "Issue reset code"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
