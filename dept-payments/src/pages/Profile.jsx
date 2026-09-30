import { useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";

const LEVELS = ["100", "200", "300", "400", "500"];

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [level, setLevel] = useState(user?.level || "");
  const [email, setEmail] = useState(user?.email || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Email is only editable once, when the account currently has none.
  const canSetEmail = !user?.email;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const payload = { phone_number: phone };
      if (user?.level) payload.level = level;
      if (canSetEmail && email) payload.email = email;
      await updateProfile(payload);
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <h1>Profile</h1>
      <p style={{ color: "var(--muted)" }}>Only your phone number and level can be changed here.</p>

      <div className="ledger-card" style={{ maxWidth: 480, padding: 24 }}>
        {success && <div className="banner success">Saved.</div>}
        {error && <div className="banner error">{error}</div>}

        <div className="field">
          <label>Matric number</label>
          <input value={user?.matric_number || ""} disabled />
        </div>
        <div className="field">
          <label>Username</label>
          <input value={user?.username || ""} disabled />
        </div>
        <div className="field">
          <label>Department</label>
          <input value={user?.department || ""} disabled />
        </div>

        <form onSubmit={handleSubmit}>
          {canSetEmail ? (
            <div className="field">
              <label>Email (can only be set once)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@student.edu.ng" />
            </div>
          ) : (
            <div className="field">
              <label>Email</label>
              <input value={user.email} disabled />
            </div>
          )}

          <div className="field">
            <label>Phone number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080…" />
          </div>

          {user?.level && (
            <div className="field">
              <label>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          )}

          <button className="btn btn-block" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
