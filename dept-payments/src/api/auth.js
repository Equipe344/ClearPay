import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockUsers, mockDepartments } from "../mock/data";
import { mockRoster } from "../mock/students";

/**
 * Real Django DRF endpoints:
 *
 * POST /api/auth/register/   { username, email, password, matric_number, department_id, level }
 *   -> 201, no body needed beyond success — frontend sends the user to login.
 *
 * POST /api/auth/login/      { username, password }  (username accepts matric number, email, or username)
 *   -> { token, user: { id, username, role } }
 *
 * GET  /api/auth/me/         -> { id, username, email, matric_number, department,
 *                                 level, role, phone_number, full_name }
 *
 * POST /api/auth/logout/
 *
 * GET  /api/departments/     -> [{ id, name, faculty }]
 */

export async function listDepartments() {
  if (MOCK_MODE) {
    await mockDelay(200);
    return [...mockDepartments];
  }
  const { data } = await apiClient.get("/departments/");
  return data;
}

export async function login(username, password) {
  if (MOCK_MODE) {
    await mockDelay();
    const user = mockUsers.find(
      (u) =>
        (u.username === username || u.matric_number === username || u.email === username) &&
        u.password === password
    );
    if (!user) throw new Error("Invalid matric number, email, username, or password.");
    const { password: _pw, ...safeUser } = user;
    localStorage.setItem("token", `mock-token-${user.id}`);
    localStorage.setItem("user", JSON.stringify(safeUser));
    return safeUser;
  }

  const { data } = await apiClient.post("/auth/login/", { username, password });
  localStorage.setItem("token", data.token);
  // The login response only has id/username/role — fetch the full profile.
  const { data: me } = await apiClient.get("/auth/me/");
  localStorage.setItem("user", JSON.stringify(me));
  return me;
}

export async function register(payload) {
  if (MOCK_MODE) {
    await mockDelay();
    const exists = mockUsers.some((u) => u.matric_number === payload.matric_number);
    if (exists) throw new Error("A student with this matric number already exists.");
    const dept = mockDepartments.find((d) => d.id === Number(payload.department_id));
    mockUsers.push({
      id: mockUsers.length + 1,
      role: "student",
      department: dept?.name || "",
      full_name: "",
      phone_number: "",
      ...payload,
    });
    return true;
  }

  await apiClient.post("/auth/register/", payload);
  return true;
}

export async function logout() {
  if (!MOCK_MODE) {
    try {
      await apiClient.post("/auth/logout/");
    } catch {
      // Already logged out or token invalid — clear local state regardless.
    }
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

// PATCH /auth/me/ — only phone_number and level are editable, plus email
// once if the account currently has none. Persist the merged user so a
// refresh doesn't lose it.
export async function updateProfile(patch) {
  if (MOCK_MODE) {
    await mockDelay(300);
    const stored = getStoredUser();
    const record = mockUsers.find((u) => u.id === stored.id);
    Object.assign(record, patch);
    const { password: _pw, ...safeUser } = record;
    localStorage.setItem("user", JSON.stringify(safeUser));
    return safeUser;
  }
  const { data } = await apiClient.patch("/auth/me/", patch);
  localStorage.setItem("user", JSON.stringify(data));
  return data;
}

/**
 * The four "later" features. Endpoints are confirmed to exist on the
 * backend but the guide doesn't spell out request/response shapes, so
 * these follow the same conventions as the documented endpoints
 * (Token auth, {error, message} error shape) and should be checked
 * against the real response the first time each is wired up for real.
 */

// POST /auth/import/  (rep/admin) — bulk-create roster entries from a CSV
// of matric_number,full_name,department,level rows. Assumed response:
// { created, skipped, errors: [{ row, message }] }.
export async function importRoster(file) {
  if (MOCK_MODE) {
    await mockDelay(700);
    const text = await file.text();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const dataLines = lines[0]?.toLowerCase().includes("matric") ? lines.slice(1) : lines;
    let created = 0;
    let skipped = 0;
    const errors = [];
    dataLines.forEach((line, i) => {
      const [matric_number, full_name, department, level] = line.split(",").map((c) => c?.trim());
      if (!matric_number) {
        errors.push({ row: i + 1, message: "Missing matric number." });
        return;
      }
      if (mockRoster.some((s) => s.matric_number === matric_number)) {
        skipped += 1;
        return;
      }
      mockRoster.push({ full_name: full_name || matric_number, matric_number, department: department || "", level: level || "" });
      created += 1;
    });
    return { created, skipped, errors };
  }
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("/auth/import/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// POST /auth/claim/  (public) — a student already on the imported roster
// (no login yet) sets a username + password to activate their account.
// Assumed to log the student in the same way /auth/login/ does.
export async function claimAccount({ matric_number, username, password }) {
  if (MOCK_MODE) {
    await mockDelay();
    const onRoster = mockRoster.find((s) => s.matric_number === matric_number);
    if (!onRoster) throw new Error("That matric number isn't on the roster yet — ask your class rep.");
    if (mockUsers.some((u) => u.matric_number === matric_number)) {
      throw new Error("This account has already been claimed. Try logging in instead.");
    }
    const safeUser = {
      id: mockUsers.length + 1,
      username,
      email: "",
      matric_number,
      department: onRoster.department,
      department_id: mockDepartments.find((d) => d.name === onRoster.department)?.id ?? null,
      level: onRoster.level,
      role: "student",
      phone_number: "",
      full_name: onRoster.full_name,
    };
    mockUsers.push({ ...safeUser, password });
    localStorage.setItem("token", `mock-token-${safeUser.id}`);
    localStorage.setItem("user", JSON.stringify(safeUser));
    return safeUser;
  }
  const { data } = await apiClient.post("/auth/claim/", { matric_number, username, password });
  if (data.token) localStorage.setItem("token", data.token);
  if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
  return data.user || data;
}

// POST /auth/reset-code/  (public) — { identifier } sends a reset code to
// the account's email. Mock mode has no email to send to, so it surfaces
// the code directly for the demo.
export async function requestResetCode(identifier) {
  if (MOCK_MODE) {
    await mockDelay();
    const user = mockUsers.find(
      (u) => u.username === identifier || u.matric_number === identifier || u.email === identifier
    );
    if (!user) throw new Error("No account matches that matric number, email, or username.");
    const code = "123456";
    return { message: `Mock mode — no email sent. Use code ${code}.`, mockCode: code };
  }
  const { data } = await apiClient.post("/auth/reset-code/", { identifier });
  return data;
}

// POST /auth/reset-password/  (public) — { identifier, code, new_password }
export async function resetPassword({ identifier, code, new_password }) {
  if (MOCK_MODE) {
    await mockDelay();
    if (code !== "123456") throw new Error("That code is incorrect or has expired.");
    const user = mockUsers.find(
      (u) => u.username === identifier || u.matric_number === identifier || u.email === identifier
    );
    if (!user) throw new Error("No account matches that matric number, email, or username.");
    user.password = new_password;
    return true;
  }
  await apiClient.post("/auth/reset-password/", { identifier, code, new_password });
  return true;
}

// The documented endpoint is POST /auth/users/:id/set-role/ — a numeric ID,
// not a matric number — and there's no user-lookup-by-matric endpoint in
// the cheat sheet. This assumes one exists at GET /auth/users/?matric_number=
// to resolve the ID first; confirm that path with the backend and adjust
// here if it's named differently.
export async function setUserRoleByMatric(matric_number, role) {
  if (MOCK_MODE) {
    await mockDelay();
    const user = mockUsers.find((u) => u.matric_number === matric_number);
    if (!user) throw new Error("No user with that matric number.");
    user.role = role;
    const { password: _pw, ...safeUser } = user;
    return safeUser;
  }
  const { data: lookup } = await apiClient.get("/auth/users/", { params: { matric_number } });
  const match = Array.isArray(lookup) ? lookup[0] : lookup?.results?.[0];
  if (!match) throw new Error("No user found with that matric number.");
  const { data } = await apiClient.post(`/auth/users/${match.id}/set-role/`, { role });
  return data;
}
