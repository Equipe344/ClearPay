import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockPayments } from "../mock/data";

/**
 * Expected Django DRF endpoints:
 *
 * GET  /api/payments/?student_id=:id        -> a student's own payment history
 * GET  /api/payments/?status=pending        (admin) -> verification queue
 * GET  /api/payments/                       (admin) -> all payments
 * POST /api/payments/                       multipart/form-data:
 *        { contribution_id, amount, channel, proof (file), note }
 *      -> { id, reference, status: "pending", proof_url, ... }
 *      Use multipart/form-data because of the proof-of-payment upload.
 *      `proof_url` in every response (list and detail) should be a real,
 *      publicly-fetchable URL to the uploaded file (e.g. Django's MEDIA_URL
 *      path) so the admin verification screen can render it as an image.
 * PATCH /api/payments/:id/verify/           (admin only) { status: "verified" | "rejected", note }
 *
 * "channel" enum should match whatever the department actually accepts,
 * e.g. bank_transfer | pos | cash | online_gateway. If/when a payment
 * gateway (Paystack/Flutterwave) is integrated, add:
 *   POST /api/payments/initialize/  -> { authorization_url, reference }
 *   GET  /api/payments/verify/:reference/ -> confirms + auto-marks as verified
 * so "online_gateway" payments skip manual review entirely.
 */

let mockIdCounter = 200;

export async function listPayments({ studentId, status } = {}) {
  if (MOCK_MODE) {
    await mockDelay();
    let results = [...mockPayments];
    if (studentId) results = results.filter((p) => p.student_id === studentId);
    if (status) results = results.filter((p) => p.status === status);
    return results.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  }
  const params = {};
  if (studentId) params.student_id = studentId;
  if (status) params.status = status;
  const { data } = await apiClient.get("/payments/", { params });
  return data;
}

export async function submitPayment({ contributionId, studentId, amount, channel, note, proofFile }) {
  if (MOCK_MODE) {
    await mockDelay(700);
    mockIdCounter += 1;
    const reference = `PMT-2026-${mockIdCounter}`;
    const record = {
      id: reference,
      contribution_id: contributionId,
      student_id: studentId,
      amount,
      channel,
      status: channel === "online_gateway" ? "verified" : "pending",
      // In mock mode there's no server to upload to, so we keep a live,
      // in-browser preview via createObjectURL — this only lasts for the
      // current tab/session (it won't survive a refresh). A real backend
      // would instead return a permanent media URL for `proof_url` here.
      proof_url: proofFile ? URL.createObjectURL(proofFile) : null,
      proof_name: proofFile ? proofFile.name : null,
      reference,
      submitted_at: new Date().toISOString(),
      verified_at: channel === "online_gateway" ? new Date().toISOString() : null,
      verified_by: channel === "online_gateway" ? "System (auto)" : null,
      note: note || "",
    };
    mockPayments.unshift(record);
    return record;
  }

  const form = new FormData();
  form.append("contribution_id", contributionId);
  form.append("amount", amount);
  form.append("channel", channel);
  if (note) form.append("note", note);
  if (proofFile) form.append("proof", proofFile);

  const { data } = await apiClient.post("/payments/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function verifyPayment(paymentId, { status, note }) {
  if (MOCK_MODE) {
    await mockDelay();
    const idx = mockPayments.findIndex((p) => p.id === paymentId);
    if (idx === -1) throw new Error("Payment not found.");
    mockPayments[idx] = {
      ...mockPayments[idx],
      status,
      note: note ?? mockPayments[idx].note,
      verified_at: new Date().toISOString(),
      verified_by: "Mr. Femi Ade",
    };
    return mockPayments[idx];
  }
  const { data } = await apiClient.patch(`/payments/${paymentId}/verify/`, { status, note });
  return data;
}
