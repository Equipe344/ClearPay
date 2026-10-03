import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MOCK_MODE } from "../api/client";
import UnverifiedPaymentsBanner from "./UnverifiedPaymentsBanner";
import NotificationBell from "./NotificationBell";

const studentLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/contributions", label: "Contributions" },
  { to: "/history", label: "Payment history" },
];

const manageLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/contributions", label: "Contributions" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/roster", label: "Import roster" },
  { to: "/admin/verify", label: "Verify payments" },
];

// Role management is admin-only, so it's only in the nav for admins — class
// reps don't see it.
const adminOnlyLinks = [
  { to: "/admin/roles", label: "Manage users" },
  { to: "/admin/departments", label: "Departments" },
];

export default function AppShell({ children }) {
  const { user, logout, isAdmin, canManage, displayName } = useAuth();
  const navigate = useNavigate();
  const links = canManage ? [...manageLinks, ...(isAdmin ? adminOnlyLinks : [])] : studentLinks;

  async function handleLogout() {
    await logout();
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
        <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : "")}>
          Profile
        </NavLink>
        <div className="spacer" />
        <button className="nav-item" onClick={handleLogout}>
          Log out
        </button>
      </aside>
      <main className="main-area">
        <div className="topline">
          <NotificationBell />
          <div className="who">
            <div className="name">{displayName}</div>
            <div className="role">
              {isAdmin ? "Administrator" : canManage ? "Class rep" : `${user?.matric_number} · ${user?.level} level`}
            </div>
          </div>
        </div>
        {canManage && <UnverifiedPaymentsBanner />}
        {children}
      </main>
      {MOCK_MODE && <div className="mock-flag">Running on mock data — backend not connected</div>}
    </div>
  );
}
