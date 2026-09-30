import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";

// For a student whose matric number was added via roster import but who
// has never logged in — they set a username + password here to activate
// the account the rep/admin already created a roster row for.
export default function ClaimAccount() {
  const [form, setForm] = useState({ matric_number: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { claim } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await claim(form);
      navigate(user.role === "admin" || user.role === "class_rep" ? "/admin" : "/dashboard");
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
              <label>Choose a username</label>
              <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
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
