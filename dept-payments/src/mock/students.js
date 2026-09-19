import { CURRENT_SESSION } from "../constants";
import { mockContributions, mockPayments } from "./data";

// This roster models what GET /api/admin/students/ should return: every
// student in the department, plus their dues history. In this mock, past
// sessions are flat historical records (a real backend would just query old
// Payment rows). The CURRENT session's status is deliberately NOT stored
// here — it's derived live from mockPayments/mockContributions in
// src/api/students.js, so it always agrees with whatever a student does on
// the Contributions/Payment screens elsewhere in the app.

export const mockStudentRoster = [
  {
    id: 1,
    matric_no: "CSC/2021/041",
    full_name: "Amina Bello",
    email: "amina.bello@student.edu.ng",
    department: "Computer Science",
    level: "300",
    pastSessions: [
      { session: "2024/2025", amount: 4000, date: "2024-11-04", status: "verified" },
      { session: "2025/2026", amount: 4800, date: "2025-10-22", status: "verified" },
    ],
  },
  {
    id: 2,
    matric_no: "CSC/2021/012",
    full_name: "Tobiloba Adekunle",
    email: "tobi.adekunle@student.edu.ng",
    department: "Computer Science",
    level: "300",
    pastSessions: [
      { session: "2024/2025", amount: 4000, date: "2024-11-10", status: "verified" },
      { session: "2025/2026", amount: 4800, date: "2025-10-30", status: "verified" },
    ],
  },
  {
    id: 3,
    matric_no: "CSC/2022/077",
    full_name: "Chiamaka Nwosu",
    email: "chiamaka.nwosu@student.edu.ng",
    department: "Computer Science",
    level: "200",
    pastSessions: [
      { session: "2025/2026", amount: 4800, date: "2025-11-02", status: "verified" },
    ],
  },
  {
    id: 4,
    matric_no: "CSC/2021/058",
    full_name: "Ibrahim Musa",
    email: "ibrahim.musa@student.edu.ng",
    department: "Computer Science",
    level: "300",
    pastSessions: [
      { session: "2024/2025", amount: 4000, date: "2024-12-01", status: "verified" },
      { session: "2025/2026", amount: 4800, date: null, status: "unpaid" },
    ],
  },
  {
    id: 5,
    matric_no: "CSC/2023/019",
    full_name: "Grace Okon",
    email: "grace.okon@student.edu.ng",
    department: "Computer Science",
    level: "100",
    pastSessions: [],
  },
  {
    id: 6,
    matric_no: "CSC/2020/003",
    full_name: "David Eze",
    email: "david.eze@student.edu.ng",
    department: "Computer Science",
    level: "400",
    pastSessions: [
      { session: "2024/2025", amount: 4000, date: "2024-11-08", status: "verified" },
      { session: "2025/2026", amount: 4800, date: "2025-10-25", status: "verified" },
    ],
  },
  {
    id: 7,
    matric_no: "CSC/2022/044",
    full_name: "Fatima Yusuf",
    email: "fatima.yusuf@student.edu.ng",
    department: "Computer Science",
    level: "200",
    pastSessions: [
      { session: "2025/2026", amount: 4800, date: "2025-11-15", status: "verified" },
    ],
  },
  {
    id: 8,
    matric_no: "CSC/2021/029",
    full_name: "Samuel Okafor",
    email: "samuel.okafor@student.edu.ng",
    department: "Computer Science",
    level: "300",
    pastSessions: [
      { session: "2024/2025", amount: 4000, date: null, status: "unpaid" },
      { session: "2025/2026", amount: 4800, date: "2025-12-01", status: "verified" },
    ],
  },
  {
    id: 9,
    matric_no: "CSC/2023/061",
    full_name: "Blessing Etim",
    email: "blessing.etim@student.edu.ng",
    department: "Computer Science",
    level: "100",
    pastSessions: [],
  },
  {
    id: 10,
    matric_no: "CSC/2020/015",
    full_name: "Emeka Obi",
    email: "emeka.obi@student.edu.ng",
    department: "Computer Science",
    level: "400",
    pastSessions: [
      { session: "2024/2025", amount: 4000, date: "2024-10-30", status: "verified" },
      { session: "2025/2026", amount: 4800, date: "2025-11-05", status: "verified" },
    ],
  },
  {
    id: 11,
    matric_no: "CSC/2022/090",
    full_name: "Hauwa Abdullahi",
    email: "hauwa.abdullahi@student.edu.ng",
    department: "Computer Science",
    level: "200",
    pastSessions: [
      { session: "2025/2026", amount: 4800, date: null, status: "unpaid" },
    ],
  },
  {
    id: 12,
    matric_no: "CSC/2021/066",
    full_name: "Peter Nnamdi",
    email: "peter.nnamdi@student.edu.ng",
    department: "Computer Science",
    level: "300",
    pastSessions: [
      { session: "2024/2025", amount: 4000, date: "2024-11-20", status: "verified" },
      { session: "2025/2026", amount: 4800, date: "2025-10-18", status: "verified" },
    ],
  },
];

function currentSessionDues() {
  return mockContributions.find((c) => c.category === "dues" && c.session === CURRENT_SESSION);
}

// Derives this student's CURRENT session dues status from the live
// contributions/payments data, so it always matches what they see on their
// own Contributions/Dashboard screens.
export function currentSessionStatusFor(studentId) {
  const dues = currentSessionDues();
  if (!dues) return { status: "unpaid", amount: 0, date: null };
  const relevant = mockPayments
    .filter((p) => p.student_id === studentId && p.contribution_id === dues.id)
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  const latest = relevant[0];
  if (!latest) return { status: "unpaid", amount: dues.amount, date: null };
  return {
    status: latest.status, // "verified" | "pending" | "rejected"
    amount: latest.amount,
    date: latest.submitted_at,
  };
}

export function buildFullHistoryFor(student) {
  const current = currentSessionStatusFor(student.id);
  return [
    ...student.pastSessions.map((s) => ({ ...s })),
    { session: CURRENT_SESSION, amount: current.amount, date: current.date, status: current.status },
  ].sort((a, b) => (a.session > b.session ? 1 : -1));
}
