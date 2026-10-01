import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ClaimAccount from "./pages/ClaimAccount";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Contributions from "./pages/Contributions";
import History from "./pages/History";
import PaymentCallback from "./pages/PaymentCallback";
import Profile from "./pages/Profile";
import AdminOverview from "./pages/admin/Overview";
import ManageContributions from "./pages/admin/ManageContributions";
import VerifyPayments from "./pages/admin/VerifyPayments";
import StudentDetail from "./pages/admin/StudentDetail";
import Analytics from "./pages/admin/Analytics";
import RosterImport from "./pages/admin/RosterImport";
import ManageRoles from "./pages/admin/ManageRoles";

function RootRedirect() {
  const { user, canManage } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={canManage ? "/admin" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/claim" element={<ClaimAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/contributions" element={<ProtectedRoute><Contributions /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute manageOnly><AdminOverview /></ProtectedRoute>} />
          <Route path="/admin/students/:matric" element={<ProtectedRoute manageOnly><StudentDetail /></ProtectedRoute>} />
          <Route path="/admin/contributions" element={<ProtectedRoute manageOnly><ManageContributions /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute manageOnly><Analytics /></ProtectedRoute>} />
          <Route path="/admin/roster" element={<ProtectedRoute manageOnly><RosterImport /></ProtectedRoute>} />
          <Route path="/admin/verify" element={<ProtectedRoute manageOnly><VerifyPayments /></ProtectedRoute>} />
          <Route path="/admin/roles" element={<ProtectedRoute adminOnly><ManageRoles /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
