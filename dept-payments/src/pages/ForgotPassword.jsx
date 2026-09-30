import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestResetCode, resetPassword } from "../api/auth";
import { getErrorMessage, MOCK_MODE } from "../api/client";

export default function ForgotPassword() {
  const [step, setStep] = useState("request"); // "request" | "reset" | "done"
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRequestCode(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await requestResetCode(identifier);
      setInfo(res?.message || "If that account exists, a reset code has been sent.");
      setStep("reset");
    } catch (err) {
      setError(getErrorMessage(err) || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword({ identifier, code, new_password: newPassword });
      setStep("done");
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
          <form className="auth-form" onSubmit={step === "request" ? handleRequestCode : handleReset}>
            <h1>Reset your password</h1>
            <p className="sub">
              {step === "request" && "Enter your matric number, email, or username."}
              {step === "reset" && "Enter the code you received and a new password."}
              {step === "done" && "Your password has been reset."}
            </p>

            {error && <div className="banner error">{error}</div>}
            {info && step === "reset" && <div className="banner success">{info}</div>}

            {step === "request" && (
              <div className="field">
                <label>Matric number, email, or username</label>
                <input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
              </div>
            )}

            {step === "reset" && (
              <>
                <div className="field">
                  <label>Reset code</label>
                  <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder={MOCK_MODE ? "123456" : "6-digit code"} />
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
              </>
            )}

            {step !== "done" && (
              <button className="btn btn-block" type="submit" disabled={loading}>
                {loading ? "Please wait…" : step === "request" ? "Send reset code →" : "Reset password →"}
              </button>
            )}

            {step === "done" && (
              <button className="btn btn-block" type="button" onClick={() => navigate("/login")}>
                Back to login
              </button>
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
