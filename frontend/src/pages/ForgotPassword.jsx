import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { getErrorMessage } from "../api/client";

// Assisted reset: a class rep / admin issues a one-time code (see Manage roles),
// the student redeems it here. There is deliberately no public "email me a
// code" endpoint — the backend has no mail dependency and never hands a reset
// code to an unauthenticated caller for an account.
export default function ForgotPassword() {
  const [matric, setMatric] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword({ matric_number: matric, code, new_password: newPassword });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err) || err.message);
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
          <form className="auth-form" onSubmit={handleReset}>
            <h1>Reset your password</h1>
            <p className="sub">
              Ask your class rep or department admin for a reset code, then set a new password here.
            </p>

            {error && <div className="banner error">{error}</div>}

            {!done && (
              <>
                <div className="field">
                  <label>Matric number</label>
                  <input required value={matric} onChange={(e) => setMatric(e.target.value)} placeholder="CSC/2021/041" />
                </div>
                <div className="field">
                  <label>Reset code</label>
                  <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Issued by your rep" />
                </div>
                <div className="field">
                  <label>New password</label>
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button className="btn btn-block" type="submit" disabled={loading}>
                  {loading ? "Please wait…" : "Reset password →"}
                </button>
              </>
            )}

            {done && (
              <>
                <div className="banner success">Your password has been reset.</div>
                <button className="btn btn-block" type="button" onClick={() => navigate("/login")}>
                  Back to login
                </button>
              </>
            )}

            <p className="sub" style={{ marginTop: 16 }}>
              <Link to="/login">Back to login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
