import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockContributions } from "../mock/data";
import { buildPaymentsForContribution, buildSummaryForContribution } from "../mock/students";

/**
 * Real Django DRF endpoints:
 *
 * GET  /api/contributions/                -> [{ id, title, amount, deadline,
 *                                               is_mandatory, target_level, has_paid }]
 * GET  /api/contributions/:id/            -> one item
 * POST /api/contributions/                (class rep / admin) { title, description,
 *                                               amount, deadline, is_mandatory,
 *                                               target_level, department_id? }
 *
 *   `category`, `available_sizes`, `available_colors` are NOT documented on
 *   this endpoint — they're sent for merch contributions anyway so the
 *   frontend keeps working end-to-end in mock mode. Confirm with the
 *   backend whether it accepts/stores them before relying on this for real
 *   merch runs; until then they'll likely be ignored by a real POST here.
 *
 * Edit and close don't exist on the backend (PATCH/DELETE return 405) — no
 * functions for them here; hide those actions in the UI.
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
      ...payload,
    };
    mockContributions.unshift(item);
    return item;
  }
  const { data } = await apiClient.post("/contributions/", payload);
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
