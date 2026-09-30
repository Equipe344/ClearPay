import { createContext, useContext, useState, useCallback } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authApi.getStoredUser());

  const login = useCallback(async (username, password) => {
    const u = await authApi.login(username, password);
    setUser(u);
    return u;
  }, []);

  // Activating a roster-imported account logs the student in immediately,
  // same as login — Login.jsx and ClaimAccount.jsx share this shape.
  const claim = useCallback(async (payload) => {
    const u = await authApi.claimAccount(payload);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    await authApi.register(payload);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  // Called after PATCH /auth/me/ so Profile.jsx doesn't need its own copy
  // of user state — the sidebar name/role updates immediately too.
  const updateProfile = useCallback(async (patch) => {
    const u = await authApi.updateProfile(patch);
    setUser(u);
    return u;
  }, []);

  const isAdmin = user?.role === "admin";
  const isRep = user?.role === "class_rep";
  const canManage = isAdmin || isRep;

  // Kept for the Dashboard/AppShell "hi there" fallback — the Django
  // signup flow doesn't collect a full name, so it can be blank.
  const displayName = user?.full_name || user?.username || "there";

  return (
    <AuthContext.Provider
      value={{ user, login, claim, register, logout, updateProfile, isAdmin, isRep, canManage, displayName }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
