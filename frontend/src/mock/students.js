// Mock roster + per-contribution payment status, modelling what
// GET /contributions/{id}/payments/ returns: [{ student, matric_number,
// status, paid_at }]. A real backend derives this by joining Payment rows
// against every student eligible for that contribution (department/level);
// this mock does the same joining locally so the admin screens have
// realistic, consistent data without a server.

import { mockContributions, mockPayments } from "./data";

export const mockRoster = [
  { full_name: "Amina Bello", matric_number: "CSC/2021/041", department: "Computer Science", level: "300" },
  { full_name: "Tobiloba Adekunle", matric_number: "CSC/2021/012", department: "Computer Science", level: "300" },
  { full_name: "Chiamaka Nwosu", matric_number: "CSC/2022/077", department: "Computer Science", level: "200" },
  { full_name: "Ibrahim Musa", matric_number: "CSC/2021/058", department: "Computer Science", level: "300" },
  { full_name: "Grace Okon", matric_number: "CSC/2023/019", department: "Computer Science", level: "100" },
  { full_name: "David Eze", matric_number: "CSC/2020/003", department: "Computer Science", level: "400" },
  { full_name: "Fatima Yusuf", matric_number: "CSC/2022/044", department: "Computer Science", level: "200" },
  { full_name: "Samuel Okafor", matric_number: "CSC/2021/029", department: "Computer Science", level: "300" },
];

function eligibleFor(contribution) {
  if (!contribution.target_level) return mockRoster;
  return mockRoster.filter((s) => s.level === contribution.target_level);
}

export function buildPaymentsForContribution(contributionId) {
  const contribution = mockContributions.find((c) => c.id === Number(contributionId));
  if (!contribution) return [];
  return eligibleFor(contribution).map((s) => {
    const payment = mockPayments.find(
      (p) => p.contribution_id === contribution.id && p.student_matric === s.matric_number
    );
    return {
      student: s.full_name,
      matric_number: s.matric_number,
      status: payment ? payment.status : "unpaid",
      paid_at: payment?.verified_at || null,
    };
  });
}

export function buildSummaryForContribution(contributionId) {
  const contribution = mockContributions.find((c) => c.id === Number(contributionId));
  if (!contribution) return { total_expected: 0, total_collected: 0, outstanding_count: 0 };
  const rows = buildPaymentsForContribution(contributionId);
  const amount = Number(contribution.amount);
  const paidCount = rows.filter((r) => r.status === "success").length;
  return {
    total_expected: rows.length * amount,
    total_collected: paidCount * amount,
    outstanding_count: rows.length - paidCount,
  };
}
