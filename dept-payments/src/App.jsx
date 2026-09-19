import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Contributions from "./pages/Contributions";
import History from "./pages/History";
import AdminOverview from "./pages/admin/Overview";
import ManageContributions from "./pages/admin/ManageContributions";
import VerifyPayments from "./pages/admin/VerifyPayments";
import StudentDetail from "./pages/admin/StudentDetail";
import Analytics from "./pages/admin/Analytics";

function RootRedirect() {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/contributions" element={<ProtectedRoute><Contributions /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminOverview /></ProtectedRoute>} />
          <Route path="/admin/students/:id" element={<ProtectedRoute adminOnly><StudentDetail /></ProtectedRoute>} />
          <Route path="/admin/contributions" element={<ProtectedRoute adminOnly><ManageContributions /></ProtectedRoute>} />
          <Route path="/admin/verify" element={<ProtectedRoute adminOnly><VerifyPayments /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute adminOnly><Analytics /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
