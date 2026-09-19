import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockUsers } from "../mock/data";

/**
 * Expected Django DRF endpoints:
 *
 * POST /api/auth/login/          { matric_no | email, password }
 *   -> { access, refresh, user: { id, full_name, email, matric_no, role, level } }
 *
 * POST /api/auth/register/       { full_name, matric_no, email, level, password }
 *   -> { access, refresh, user }
 *
 * POST /api/auth/token/refresh/  { refresh } -> { access }
 *
 * GET  /api/auth/me/             -> { id, full_name, email, matric_no, role, level }
 */

export async function login({ identifier, password }) {
  if (MOCK_MODE) {
    await mockDelay();
    const user = mockUsers.find(
      (u) => (u.matric_no === identifier || u.email === identifier) && u.password === password
    );
    if (!user) throw new Error("Invalid matric number/email or password.");
    const { password: _pw, ...safeUser } = user;
    localStorage.setItem("access_token", `mock-access-${user.id}`);
    localStorage.setItem("refresh_token", `mock-refresh-${user.id}`);
    localStorage.setItem("user", JSON.stringify(safeUser));
    return safeUser;
  }

  const { data } = await apiClient.post("/auth/login/", {
    matric_no: identifier,
    password,
  });
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data.user;
}

export async function register(payload) {
  if (MOCK_MODE) {
    await mockDelay();
    const exists = mockUsers.some((u) => u.matric_no === payload.matric_no);
    if (exists) throw new Error("A student with this matric number already exists.");
    const newUser = {
      id: mockUsers.length + 1,
      role: "student",
      ...payload,
    };
    mockUsers.push(newUser);
    const { password: _pw, ...safeUser } = newUser;
    localStorage.setItem("access_token", `mock-access-${newUser.id}`);
    localStorage.setItem("refresh_token", `mock-refresh-${newUser.id}`);
    localStorage.setItem("user", JSON.stringify(safeUser));
    return safeUser;
  }

  const { data } = await apiClient.post("/auth/register/", payload);
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
