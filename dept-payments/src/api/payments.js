import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockPayments, mockUnverifiedPayments, mockContributions } from "../mock/data";
import { getStoredUser } from "./auth";

/**
 * Real Django DRF endpoints:
 *
 * POST /api/payments/initiate/          { contribution_id } -> { reference, checkout_url, payment }
 *   The backend decides the price — never send an amount from the browser.
 * GET  /api/payments/verify/:reference/ -> { message, payment: { status: "success"|"pending"|"failed", refund_status, ... } }
 * GET  /api/payments/history/           (owner) -> list, see shape in mockPayments below
 * GET  /api/payments/:id/receipt/       (owner) -> one payment
 * GET  /api/payments/unverified/        (rep/admin) -> { count, results: [...] }
 *   Amount-mismatch refund queue (read-only — decided in the Django admin).
 *
 *   Self-reported bank transfer / POS / cash, with a proof upload:
 * POST /api/payments/submit/            (student, multipart)
 *   { contribution_id, channel: bank_transfer|pos|cash, note?, proof? }
 *   -> 201 { message, payment } pending — credited only after review.
 * GET  /api/payments/pending/           (rep/admin) -> { count, results: [...] }
 * POST /api/payments/:id/review/        (rep/admin) { action: approve|reject }
 *   Both mirrored one level down under /api/contributions/:id/payments/
 *   (rep/admin): GET reads the same queue, POST { matric_number,
 *   receipt_reference } books a payment offline directly.
 */

let mockRefCounter = 200;
const mockPendingInitiations = new Map(); // reference -> contribution_id, mock mode only

export async function initiatePayment(contributionId) {
  if (MOCK_MODE) {
    await mockDelay(500);
    mockRefCounter += 1;
    const reference = `PSK-2026-${mockRefCounter}`;
    mockPendingInitiations.set(reference, contributionId);
    // In mock mode there's no real Paystack checkout to redirect to, so we
    // simulate it by sending the browser straight to the callback route,
    // the same place Paystack would return the student to.
    return { reference, checkout_url: `/payment/callback?reference=${reference}` };
  }
  const { data } = await apiClient.post("/payments/initiate/", { contribution_id: contributionId });
  return data;
}

export async function verifyPayment(reference) {
  if (MOCK_MODE) {
    await mockDelay(600);
    const existing = mockPayments.find((p) => p.reference === reference);
    if (existing) {
      return { message: "Payment already verified.", payment: existing };
    }
    // A freshly "paid" mock reference — mark it a success so the demo flow
    // (Contributions -> pay -> callback -> history) completes end to end.
    const contributionId = mockPendingInitiations.get(reference) || 5;
    const contribution = mockContributions.find((c) => c.id === contributionId) || mockContributions[0];
    const user = getStoredUser();
    const record = {
      id: mockPayments.length + 100,
      reference,
      contribution: contribution.title,
      contribution_id: contribution.id,
      student_matric: user?.matric_number || "CSC/2021/041",
      amount: contribution.amount,
      status: "success",
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      method: "online",
      refund_status: "none",
    };
    mockPayments.unshift(record);
    return { message: "Payment verified.", payment: record };
  }
  const { data } = await apiClient.get(`/payments/verify/${reference}/`);
  return data;
}

// Self-reported bank transfer / POS / cash, with a proof screenshot/photo.
// Goes in as "pending" for manual review — there's no auto-verify for these.
export async function submitPayment({ contributionId, channel, note, proofFile }) {
  if (MOCK_MODE) {
    await mockDelay(600);
    const contribution = mockContributions.find((c) => c.id === contributionId);
    if (!contribution) throw new Error("Contribution not found.");
    const user = getStoredUser();
    const record = {
      id: mockPayments.length + 200,
      reference: `SELF-${Date.now()}`,
      contribution: contribution.title,
      contribution_id: contribution.id,
      student_matric: user?.matric_number || "",
      amount: contribution.amount,
      status: "pending",
      verified_at: null,
      created_at: new Date().toISOString(),
      method: "manual",
      channel,
      note,
      proof_file_name: proofFile?.name || null,
      refund_status: "none",
    };
    mockPayments.unshift(record);
    return record;
  }
  const form = new FormData();
  form.append("contribution_id", contributionId);
  form.append("channel", channel);
  if (note) form.append("note", note);
  if (proofFile) form.append("proof", proofFile);
  const { data } = await apiClient.post("/payments/submit/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listHistory() {
  if (MOCK_MODE) {
    await mockDelay();
    return [...mockPayments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  const { data } = await apiClient.get("/payments/history/");
  return data;
}

export async function getReceipt(paymentId) {
  if (MOCK_MODE) {
    await mockDelay();
    const payment = mockPayments.find((p) => p.id === paymentId);
    if (!payment) throw new Error("Payment not found.");
    return payment;
  }
  const { data } = await apiClient.get(`/payments/${paymentId}/receipt/`);
  return data;
}

// { count, results: [...] } — the one endpoint that keeps the `results`
// wrapper other list endpoints don't have.
export async function getUnverifiedPayments() {
  if (MOCK_MODE) {
    await mockDelay();
    return { count: mockUnverifiedPayments.length, results: [...mockUnverifiedPayments] };
  }
  const { data } = await apiClient.get("/payments/unverified/");
  return data;
}

// Self-reported offline payments awaiting review (rep/admin). Distinct from the
// refund queue above: these are pending submissions, not amount mismatches.
export async function getPendingPayments() {
  if (MOCK_MODE) {
    await mockDelay();
    return { count: 0, results: [] };
  }
  const { data } = await apiClient.get("/payments/pending/");
  return data;
}

// Approve or reject a self-reported payment. action: "approve" | "reject".
export async function reviewPayment(id, { action, note } = {}) {
  if (MOCK_MODE) {
    await mockDelay();
    return { message: "Payment reviewed." };
  }
  const { data } = await apiClient.post(`/payments/${id}/review/`, { action, note });
  return data;
}
