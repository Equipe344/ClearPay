import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MOCK_MODE } from "../api/client";

const studentLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/contributions", label: "Contributions" },
  { to: "/history", label: "Payment history" },
];

const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/contributions", label: "Contributions" },
  { to: "/admin/verify", label: "Verify payments" },
  { to: "/admin/analytics", label: "Analytics" },
];

export default function AppShell({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const links = isAdmin ? adminLinks : studentLinks;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Ledger
          <small>Departmental contributions</small>
        </div>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/admin"}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {link.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <button className="nav-item" onClick={handleLogout}>
          Log out
        </button>
      </aside>
      <main className="main-area">
        <div className="topline">
          <div />
          <div className="who">
            <div className="name">{user?.full_name}</div>
            <div className="role">
              {isAdmin ? "Administrator" : `${user?.matric_no} · ${user?.level} level`}
            </div>
          </div>
        </div>
        {children}
      </main>
      {MOCK_MODE && <div className="mock-flag">Running on mock data — backend not connected</div>}
    </div>
  );
}
