import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listDepartments } from "../api/auth";
import { getErrorMessage } from "../api/client";

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

// Backend rule: letters, digits and @ . + - _ only — no "/" and no "@" beyond
// the one email allows. Matric numbers contain "/", so prefill by swapping
// it for "-" and let the student edit from there.
function usernameFromMatric(matric) {
  return matric.replace(/\//g, "-");
}

export default function Login() {
  const [mode, setMode] = useState("login");
  const [departments, setDepartments] = useState([]);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [form, setForm] = useState({
    identifier: "",
    password: "",
    username: "",
    usernameTouched: false,
    matric_number: "",
    email: "",
    department_id: "",
    level: "100",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    listDepartments().then((rows) => {
      setDepartments(rows);
      setForm((f) => (f.department_id ? f : { ...f, department_id: rows[0]?.id ?? "" }));
      setDepartmentsLoaded(true);
    });
  }, []);

  // Registering requires a department (the backend's department_id is a
  // required PK field). With zero departments the old code sent Number("") ->
  // NaN and surfaced a confusing 400 — block it with a clear message instead.
  const noDepartments = departmentsLoaded && departments.length === 0;

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "matric_number" && !f.usernameTouched) {
        next.username = usernameFromMatric(value);
      }
      if (field === "username") next.usernameTouched = true;
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const user = await login(form.identifier, form.password);
        navigate(user.role === "admin" || user.role === "class_rep" ? "/admin" : "/dashboard");
      } else {
        if (noDepartments) {
          setError("No departments are set up yet. Ask an administrator to create one.");
          return;
        }
        await register({
          username: form.username,
          email: form.email,
          password: form.password,
          matric_number: form.matric_number,
          department_id: Number(form.department_id),
          level: form.level,
        });
        setRegistered(true);
        setMode("login");
        setForm((f) => ({ ...f, identifier: form.username, password: "" }));
      }
    } catch (err) {
      setError(getErrorMessage(err) || err.message || "Something went wrong.");
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

            {registered && mode === "login" && (
              <div className="banner success">Account created — log in to continue.</div>
            )}
            {error && <div className="banner error">{error}</div>}

            {mode === "login" && (
              <div className="field">
                <label>Matric number, email or username</label>
                <input
                  required
                  value={form.identifier}
                  onChange={(e) => update("identifier", e.target.value)}
                  placeholder="CSC/2026/041"
                />
              </div>
            )}

            {mode === "register" && (
              <>
                <div className="field">
                  <label>Matric number</label>
                  <input
                    required
                    value={form.matric_number}
                    onChange={(e) => update("matric_number", e.target.value)}
                    placeholder="CSC/2026/041"
                  />
                </div>
                <div className="field">
                  <label>Username</label>
                  <input
                    required
                    value={form.username}
                    onChange={(e) => update("username", e.target.value)}
                    placeholder="Letters, digits, and @ . + - _ only"
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div className="field">
                  <label>Department</label>
                  {noDepartments ? (
                    <div className="banner info" style={{ margin: 0 }}>
                      No departments are set up yet, so registration is disabled.
                      Ask your class rep or an administrator to create one.
                    </div>
                  ) : (
                    <select value={form.department_id} onChange={(e) => update("department_id", e.target.value)}>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
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
              <div style={{ position: "relative" }}>
                <input
                  required
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1rem",
                    padding: "6px 8px",
                    lineHeight: 1,
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {mode === "register" && (
                <div className="hint">At least 8 characters. Not all digits, not too common.</div>
              )}
            </div>

            <button
              className="btn btn-block"
              type="submit"
              disabled={loading || (mode === "register" && noDepartments)}
            >
              {loading ? "Please wait…" : mode === "login" ? "Log in →" : "Create account →"}
            </button>

            {mode === "login" && (
              <p className="sub" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 12 }}>
                <Link to="/forgot-password">Forgot password?</Link>
                <Link to="/claim">Claim a roster account</Link>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
