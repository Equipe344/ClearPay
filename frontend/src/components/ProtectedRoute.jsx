import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// manageOnly: admin or class rep (create contributions, payment lists, mark
// offline). adminOnly: admin only (the refund review page).
export default function ProtectedRoute({ children, manageOnly = false, adminOnly = false }) {
  const { user, isAdmin, canManage } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (manageOnly && !canManage) return <Navigate to="/dashboard" replace />;

  return children;
}
