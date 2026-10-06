import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";

// For a student whose matric number was added via roster import but who
// has never logged in — they activate the account the rep/admin already
// created, using the claim code the rep shared. No username is chosen: the
// backend owns the username (it equals the matric number).
export default function ClaimAccount() {
  const [form, setForm] = useState({ matric_number: "", first_name: "", batch_code: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [loading, setLoading] = useState(false);
  const { claim } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await claim(form);
      setDone("Account activated. Log in with your matric number and the password you just set.");
    } catch (err) {
      setError(getErrorMessage(err) || err.message || "Couldn't claim that account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-topbar">
        <div className="mark"><span className="dot">N</span>NACOS</div>
        <span className="ref-code">Departmental Payments</span>
      </div>
      <div className="auth-body">
        <div className="auth-form-wrap" style={{ margin: "0 auto" }}>
          <form className="auth-form" onSubmit={handleSubmit}>
            <h1>Claim your account</h1>
            <p className="sub">
              If your class rep already added you to the roster, activate your account here instead of registering.
            </p>

            {error && <div className="banner error">{error}</div>}
            {done && <div className="banner success">{done} <Link to="/login">Go to login</Link>.</div>}

            <div className="field">
              <label>Matric number</label>
              <input
                required
                value={form.matric_number}
                onChange={(e) => setForm({ ...form, matric_number: e.target.value })}
                placeholder="CSC/2021/041"
              />
            </div>
            <div className="field">
              <label>First name (as it is on the roster)</label>
              <input
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Amina"
              />
            </div>
            <div className="field">
              <label>Claim code (from your class rep)</label>
              <input
                required
                value={form.batch_code}
                onChange={(e) => setForm({ ...form, batch_code: e.target.value })}
                placeholder="Shared by your rep"
              />
            </div>
            <div className="field">
              <label>Choose a password</label>
              <input
                required
                minLength={8}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <button className="btn btn-block" type="submit" disabled={loading}>
              {loading ? "Please wait…" : "Activate account →"}
            </button>

            <p className="sub" style={{ marginTop: 16 }}>
              Not on a roster yet? <Link to="/login">Register instead</Link>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
