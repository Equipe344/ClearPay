import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockStudentRoster, currentSessionStatusFor, buildFullHistoryFor } from "../mock/students";
import { mockContributions } from "../mock/data";
import { CURRENT_SESSION } from "../constants";

/**
 * Expected Django DRF endpoints (admin only — enforce with IsAdminUser or
 * a custom role permission):
 *
 * GET /api/admin/students/?search=&status=&session=
 *   -> [ { id, matric_no, full_name, department, level,
 *          current_session: { session, status, amount, date } } ]
 *   `status` filters to "paid" | "unpaid". `search` matches name or matric_no.
 *
 * GET /api/admin/students/:id/
 *   -> { id, matric_no, full_name, email, department, level,
 *        history: [ { session, amount, date, status } ] }
 *   `history` is every session's dues record, current session included,
 *   oldest first. This is intentionally read-only — no PATCH/DELETE here;
 *   corrections happen through the Payments/verify flow, not by editing a
 *   student's record directly.
 *
 * GET /api/admin/analytics/?session=
 *   -> { total_students, paid, unpaid, total_collected, total_outstanding }
 *
 * POST /api/admin/analytics/ask/   { question, session }
 *   -> { answer }
 *   Backend can answer from the same aggregates above, optionally proxied
 *   through an LLM call for free-text questions.
 */

export async function listStudents({ search = "", status = "all" } = {}) {
  if (MOCK_MODE) {
    await mockDelay();
    let rows = mockStudentRoster.map((s) => {
      const current = currentSessionStatusFor(s.id);
      return {
        id: s.id,
        matric_no: s.matric_no,
        full_name: s.full_name,
        department: s.department,
        level: s.level,
        current_status: current.status === "verified" ? "paid" : "unpaid",
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) => r.full_name.toLowerCase().includes(q) || r.matric_no.toLowerCase().includes(q)
      );
    }
    if (status !== "all") {
      rows = rows.filter((r) => r.current_status === status);
    }
    return rows;
  }

  const { data } = await apiClient.get("/admin/students/", { params: { search, status } });
  return data;
}

export async function getStudentDetail(id) {
  if (MOCK_MODE) {
    await mockDelay();
    const student = mockStudentRoster.find((s) => s.id === Number(id));
    if (!student) throw new Error("Student not found.");
    return {
      ...student,
      history: buildFullHistoryFor(student),
    };
  }
  const { data } = await apiClient.get(`/admin/students/${id}/`);
  return data;
}

export async function getAnalyticsSummary() {
  if (MOCK_MODE) {
    await mockDelay();
    const rows = await listStudents();
    const totalStudents = rows.length;
    const paid = rows.filter((r) => r.current_status === "paid").length;
    const unpaid = totalStudents - paid;
    const dues = mockContributions.find((c) => c.category === "dues" && c.session === CURRENT_SESSION);
    const duesAmount = dues?.amount || 0;
    return {
      total_students: totalStudents,
      paid,
      unpaid,
      total_collected: paid * duesAmount,
      total_outstanding: unpaid * duesAmount,
    };
  }
  const { data } = await apiClient.get("/admin/analytics/");
  return data;
}

export async function askAnalyticsQuestion(question, context) {
  if (MOCK_MODE) {
    await mockDelay(500);
    const q = question.toLowerCase();
    const { total_students, paid, unpaid, total_collected, total_outstanding } = context;
    if (q.includes("outstanding") || q.includes("owe")) {
      return `₦${total_outstanding.toLocaleString()} is still outstanding for the current session (${unpaid} student${unpaid === 1 ? "" : "s"} unpaid).`;
    }
    if (q.includes("collect")) {
      return `₦${total_collected.toLocaleString()} has been collected so far this session.`;
    }
    if (q.includes("unpaid") || q.includes("not paid") || q.includes("haven't")) {
      return `${unpaid} out of ${total_students} students haven't paid this session's dues yet.`;
    }
    if (q.includes("paid") || q.includes("how many")) {
      return `${paid} out of ${total_students} students have paid this session — that's ${Math.round((paid / total_students) * 100)}%.`;
    }
    return `I can answer questions about paid/unpaid counts and amounts for this session. Try asking "how much is outstanding?" or "how many students have paid?" — once this is wired to the backend's /api/admin/analytics/ask/ endpoint, it can handle more open-ended questions.`;
  }
  const { data } = await apiClient.post("/admin/analytics/ask/", { question });
  return data.answer;
}
