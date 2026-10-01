import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockContributions } from "../mock/data";
import { buildPaymentsForContribution, buildSummaryForContribution } from "../mock/students";

/**
 * Real Django DRF endpoints:
 *
 * GET    /api/contributions/                -> [{ id, title, description,
 *                                               amount, deadline,
 *                                               is_mandatory, target_level,
 *                                               is_closed, has_paid, created_at }]
 * GET    /api/contributions/:id/            -> one item
 * POST   /api/contributions/                (class rep / admin) { title,
 *                                               description, amount, deadline,
 *                                               is_mandatory, target_level,
 *                                               department_id? (admin only) }
 * PATCH  /api/contributions/:id/            (rep/admin) — edit title,
 *                                               description, amount, deadline,
 *                                               is_mandatory, target_level,
 *                                               is_closed
 * DELETE /api/contributions/:id/            (rep/admin) — CLOSE the fee
 *                                               (reverses via PATCH
 *                                               is_closed=false)
 *
 *   `category`, `available_sizes`, `available_colors` are not stored by the
 *   backend — they're sent for merch contributions anyway so the frontend
 *   keeps working end-to-end (the backend silently ignores them).
 *
 * GET  /api/contributions/:id/summary/    (any) -> { total_expected, total_collected, outstanding_count }
 * GET  /api/contributions/:id/payments/   (rep/admin) -> [{ student, matric_number, status, paid_at }]
 * POST /api/contributions/:id/payments/   (rep/admin) { matric_number, receipt_reference }
 *      Marks an offline (cash/POS/bank) payment. Amount is set by the server.
 */

export async function listContributions() {
  if (MOCK_MODE) {
    await mockDelay();
    return [...mockContributions];
  }
  const { data } = await apiClient.get("/contributions/");
  return data;
}

export async function createContribution(payload) {
  if (MOCK_MODE) {
    await mockDelay();
    const item = {
      id: Math.max(...mockContributions.map((c) => c.id)) + 1,
      has_paid: false,
      is_closed: false,
      ...payload,
    };
    mockContributions.unshift(item);
    return item;
  }
  const { data } = await apiClient.post("/contributions/", payload);
  return data;
}

// Update a contribution (rep/admin). The backend accepts everything except
// department moves by a rep, which stay server-side.
export async function updateContribution(id, payload) {
  if (MOCK_MODE) {
    await mockDelay();
    const idx = mockContributions.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Contribution not found.");
    mockContributions[idx] = { ...mockContributions[idx], ...payload };
    return mockContributions[idx];
  }
  const { data } = await apiClient.patch(`/contributions/${id}/`, payload);
  return data;
}

// Close (or reopen) a fee. CLOSED keeps all totals and history but hides the
// fee from students and blocks new payments. Reopen with is_closed=false.
export async function setContributionOpen(id, isOpen) {
  if (MOCK_MODE) {
    await mockDelay();
    return updateContribution(id, { is_closed: !isOpen });
  }
  const { data } = await apiClient.patch(`/contributions/${id}/`, { is_closed: !isOpen });
  return data;
}

export async function getContributionSummary(id) {
  if (MOCK_MODE) {
    await mockDelay();
    return buildSummaryForContribution(id);
  }
  const { data } = await apiClient.get(`/contributions/${id}/summary/`);
  return data;
}

export async function getContributionPayments(id) {
  if (MOCK_MODE) {
    await mockDelay();
    return buildPaymentsForContribution(id);
  }
  const { data } = await apiClient.get(`/contributions/${id}/payments/`);
  return data;
}

export async function markOfflinePayment(id, { matric_number, receipt_reference }) {
  if (MOCK_MODE) {
    await mockDelay(500);
    return { matric_number, receipt_reference, status: "success" };
  }
  const { data } = await apiClient.post(`/contributions/${id}/payments/`, { matric_number, receipt_reference });
  return data;
}
