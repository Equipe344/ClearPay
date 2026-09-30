import { useState } from "react";
import AppShell from "../../components/AppShell";
import { setUserRoleByMatric } from "../../api/auth";
import { getErrorMessage } from "../../api/client";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "class_rep", label: "Class rep" },
  { value: "admin", label: "Admin" },
];

export default function ManageRoles() {
  const [matric, setMatric] = useState("");
  const [role, setRole] = useState("class_rep");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

  return (
    <AppShell>
      <h1>Manage roles</h1>
      <p style={{ color: "var(--muted)" }}>Promote a student to class rep, or change any user's role.</p>

      <div className="ledger-card" style={{ maxWidth: 420, padding: 24 }}>
        {error && <div className="banner error">{error}</div>}
        {result && (
          <div className="banner success">
            {result.full_name || result.username} is now <strong style={{ textTransform: "capitalize" }}>{result.role.replace("_", " ")}</strong>.
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
    </AppShell>
  );
}
