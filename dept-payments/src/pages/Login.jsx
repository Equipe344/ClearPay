import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ReceiptIllustration() {
  return (
    <svg viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" style={{ maxWidth: 300 }}>
      <path
        d="M100 20h120v186l-10 10-10-10-10 10-10-10-10 10-10-10-10 10-10-10-10 10-10-10-10 10-10-10V20z"
        stroke="#123524"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <line x1="118" y1="55" x2="200" y2="55" stroke="#123524" strokeWidth="1.4" />
      <line x1="118" y1="72" x2="200" y2="72" stroke="#123524" strokeWidth="1.4" />
      <line x1="118" y1="89" x2="180" y2="89" stroke="#123524" strokeWidth="1.4" />
      <line x1="118" y1="118" x2="200" y2="118" stroke="#123524" strokeWidth="1.2" strokeDasharray="2 4" />
      <line x1="118" y1="135" x2="150" y2="135" stroke="#123524" strokeWidth="1.4" />
      <line x1="170" y1="135" x2="200" y2="135" stroke="#123524" strokeWidth="1.4" />
      <line x1="118" y1="152" x2="150" y2="152" stroke="#123524" strokeWidth="1.4" />
      <line x1="170" y1="152" x2="200" y2="152" stroke="#123524" strokeWidth="1.4" />

      <g transform="translate(206,150) rotate(-14)">
        <circle cx="0" cy="0" r="34" stroke="#2e7d5b" strokeWidth="2" />
        <circle cx="0" cy="0" r="27" stroke="#2e7d5b" strokeWidth="1" strokeDasharray="2 3" />
        <text x="0" y="-2" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="600" fill="#123524">
          VERIFIED
        </text>
        <text x="0" y="10" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="600" fill="#123524">
          PAID
        </text>
      </g>

      <circle cx="55" cy="70" r="20" stroke="#123524" strokeWidth="1.4" />
      <text x="55" y="76" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="16" fill="#123524">
        ₦
      </text>
      <path d="M55 90 L55 110" stroke="#123524" strokeWidth="1.2" strokeDasharray="2 3" />
      <path d="M75 70 L100 70" stroke="#123524" strokeWidth="1.2" strokeDasharray="2 3" />
    </svg>
  );
}

export default function Login() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    identifier: "",
    password: "",
    full_name: "",
    matric_no: "",
    email: "",
    level: "100",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const user = await login(form.identifier, form.password);
        navigate(user.role === "admin" ? "/admin" : "/dashboard");
      } else {
        const user = await register({
          full_name: form.full_name,
          matric_no: form.matric_no,
          email: form.email,
          level: form.level,
          password: form.password,
        });
        navigate(user.role === "admin" ? "/admin" : "/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-topbar">
        <div className="mark">
          <span className="dot">N</span>
          NACOS
        </div>
        <span className="ref-code">Departmental Payments</span>
      </div>

      <div className="auth-body">
        <div className="auth-side">
          <span className="chip" style={{ width: "fit-content", marginBottom: 20 }}>
            Session 2026/2027 · Open
          </span>

          <h1>
            Contributions
            <br />
            tracked to the
            <br />
            last receipt
          </h1>
          <p className="sub">
            Dues, excursions, shirts, and project funds — one record of who's paid,
            who hasn't, and proof for every naira in between.
          </p>

          <div className="hero-illustration">
            <ReceiptIllustration />
          </div>

          <div className="stat-strip">
            <div>
              <div className="stat-label">Students tracked</div>
              <div className="stat-value">120+</div>
            </div>
            <div>
              <div className="stat-label">Payment channels</div>
              <div className="stat-value">4</div>
            </div>
            <div>
              <div className="stat-label">Manual spreadsheets</div>
              <div className="stat-value">0</div>
            </div>
          </div>
        </div>

        <div className="auth-form-wrap">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="sub">
              {mode === "login" ? "Sign in to view and settle your contributions." : "Register with your matric number."}
            </p>

            <div className="switch-role">
              <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
                Log in
              </button>
              <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
                Register
              </button>
            </div>

            {error && <div className="banner error">{error}</div>}

            {mode === "register" && (
              <div className="field">
                <label>Full name</label>
                <input required value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
              </div>
            )}

            <div className="field">
              <label>{mode === "login" ? "Matric number or email" : "Matric number"}</label>
              <input
                required
                value={mode === "login" ? form.identifier : form.matric_no}
                onChange={(e) => update(mode === "login" ? "identifier" : "matric_no", e.target.value)}
                placeholder="CSC/2026/041"
              />
            </div>

            {mode === "register" && (
              <>
                <div className="field">
                  <label>Student Email</label>
                  <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div className="field">
                  <label>Level</label>
                  <select value={form.level} onChange={(e) => update("level", e.target.value)}>
                    {["100", "200", "300", "400", "500"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="field">
              <label>Password</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
            </div>

            <button className="btn btn-block" type="submit" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Log in →" : "Create account →"}
            </button>

            
          </form>
        </div>
      </div>
    </div>
  );
}
