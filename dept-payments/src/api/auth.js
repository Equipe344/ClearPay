import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockUsers, mockDepartments } from "../mock/data";
import { mockRoster } from "../mock/students";

/**
 * Real Django DRF endpoints:
 *
 * POST /api/auth/register/   { username, email, password, matric_number, department_id, level }
 *   -> 201, no body needed beyond success — frontend sends the user to login.
 *
 * POST /api/auth/login/      { username | email | matric_number, password }
 *   exactly one identifier key — the backend routes the lookup by which key
 *   is present (email and matric_number are case-insensitive; usernames with
 *   "@" are rejected at signup). -> { token, user: { id, username, role } }
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

// The backend login resolves its lookup by WHICH key is present: `email`,
// `matric_number`, or `username`. Route the single login box to the right key
// so a student can type any of the three. A matric number contains "/"
// (CSC/2021/041); an email contains "@"; anything else is a username. The
// server still throttles attempts and returns one generic error, so this does
// not open an enumeration path.
export function identifierKey(value) {
  const v = (value || "").trim();
  if (v.includes("@")) return "email";
  if (v.includes("/")) return "matric_number";
  return "username";
}

export async function login(identifier, password) {
  if (MOCK_MODE) {
    await mockDelay();
    const user = mockUsers.find(
      (u) =>
        (u.username === identifier || u.matric_number === identifier || u.email === identifier) &&
        u.password === password
    );
    if (!user) throw new Error("Invalid matric number, email, username, or password.");
    const { password: _pw, ...safeUser } = user;
    localStorage.setItem("token", `mock-token-${user.id}`);
    localStorage.setItem("user", JSON.stringify(safeUser));
    return safeUser;
  }

  const key = identifierKey(identifier);
  const { data } = await apiClient.post("/auth/login/", { [key]: identifier, password });
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
// with header first_name, last_name, matric_number, level, department, email
// (only first_name + matric_number are required). Response:
// { created, skipped_existing, errors: [{ row, matric_number, errors: [...] }],
//   errors_total, claim_batch_code }.
//
// Mock mode parses the same header so the demo behaves identically offline.
export async function importRoster(file) {
  if (MOCK_MODE) {
    await mockDelay(700);
    const text = await file.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return { created: 0, skipped_existing: 0, errors: [] };
    // Header-driven like the backend reader: first_name and matric_number are
    // the only required columns; unknown/extra columns are ignored.
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const dataLines = header.includes("matric_number") ? lines.slice(1) : lines;
    const idx = (name) => header.indexOf(name);
    let created = 0;
    let skipped_existing = 0;
    const errors = [];
    dataLines.forEach((line, i) => {
      const cells = line.split(",").map((c) => c?.trim());
      const rowNum = (header.includes("matric_number") ? 2 : 1) + i;
      const at = (name) => (idx(name) === -1 ? "" : cells[idx(name)] || "");
      const matric_number = at("matric_number") || cells[0] || "";
      const first_name = at("first_name") || cells[1] || "";
      const rowErrors = [];
      if (!matric_number) rowErrors.push("matric_number is required");
      if (!first_name) rowErrors.push("first_name is required");
      if (rowErrors.length) {
        errors.push({ row: rowNum, matric_number, errors: rowErrors });
        return;
      }
      if (mockRoster.some((s) => s.matric_number === matric_number)) {
        skipped_existing += 1;
        return;
      }
      mockRoster.push({
        first_name,
        last_name: at("last_name"),
        full_name: `${first_name} ${at("last_name")}`.trim(),
        matric_number,
        level: at("level"),
        department: at("department"),
      });
      created += 1;
    });
    return {
      created,
      skipped_existing,
      errors,
      errors_total: errors.length,
      claim_batch_code: "MOCK-BATCH",
    };
  }
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("/auth/import/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// POST /auth/claim/  (public) — a student whose account was created from the
// rep's roster CSV sets the first password on it. The backend already owns the
// username (it equals the matric number), so nothing is chosen here: the
// student proves ownership with matric number + first name + the batch code
// the rep shared, then logs in normally.
export async function claimAccount({ matric_number, first_name, batch_code, password, email }) {
  if (MOCK_MODE) {
    await mockDelay();
    const onRoster = mockRoster.find((s) => s.matric_number === matric_number);
    const name = ((onRoster?.full_name || onRoster?.first_name || "").split(" ")[0] || "").toLowerCase();
    if (!onRoster || name !== (first_name || "").trim().toLowerCase()) {
      throw new Error("Claim failed. Check your matric number, first name and claim code.");
    }
    return { message: "Account claimed successfully. You can now log in.", username: matric_number };
  }
  const payload = { matric_number, first_name, batch_code, password };
  if (email) payload.email = email;
  const { data } = await apiClient.post("/auth/claim/", payload);
  return data;
}

// POST /auth/reset-code/  (rep/admin) — issue a one-time reset code for a
// student. The rep hands the code to the student in person (no email needed);
// the student then redeems it themselves below.
export async function issueResetCode(matric_number) {
  if (MOCK_MODE) {
    await mockDelay();
    return { matric_number, code: "123456", expires_in_minutes: 30 };
  }
  const { data } = await apiClient.post("/auth/reset-code/", { matric_number });
  return data;
}

// POST /auth/reset-password/  (public) — redeem a reset code and set a new
// password. `matric_number` is the identifier the code was issued against.
export async function resetPassword({ matric_number, code, new_password }) {
  if (MOCK_MODE) {
    await mockDelay();
    if (code !== "123456") throw new Error("That code is incorrect or has expired.");
    return true;
  }
  await apiClient.post("/auth/reset-password/", { matric_number, code, new_password });
  return true;
}

// Resolve a matric number (or name) to a user, then promote them. Looks the
// user up via the admin-only GET /auth/users/?search= endpoint the backend
// added for this screen, then calls set-role with the numeric id.
export async function setUserRoleByMatric(matric_number, role) {
  if (MOCK_MODE) {
    await mockDelay();
    const user = mockUsers.find((u) => u.matric_number === matric_number);
    if (!user) throw new Error("No user with that matric number.");
    user.role = role;
    const { password: _pw, ...safeUser } = user;
    return safeUser;
  }
  const { data: lookup } = await apiClient.get("/auth/users/", { params: { search: matric_number } });
  const match = Array.isArray(lookup) ? lookup[0] : lookup?.results?.[0];
  if (!match) throw new Error("No user found with that matric number.");
  const { data } = await apiClient.post(`/auth/users/${match.id}/set-role/`, { role });
  return data.user || data;
}
