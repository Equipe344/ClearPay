import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockContributions } from "../mock/data";

/**
 * Expected Django DRF endpoints:
 *
 * GET    /api/contributions/            -> [ { id, title, category, amount,
 *                                               deadline, description,
 *                                               mandatory, created_at } ]
 * GET    /api/contributions/:id/        -> { ...single contribution }
 * POST   /api/contributions/            (admin only) create a new contribution
 * PATCH  /api/contributions/:id/        (admin only) edit a contribution
 * DELETE /api/contributions/:id/        (admin only) close/remove a contribution
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
      created_at: new Date().toISOString().slice(0, 10),
      ...payload,
    };
    mockContributions.unshift(item);
    return item;
  }
  const { data } = await apiClient.post("/contributions/", payload);
  return data;
}

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

export async function deleteContribution(id) {
  if (MOCK_MODE) {
    await mockDelay();
    const idx = mockContributions.findIndex((c) => c.id === id);
    if (idx !== -1) mockContributions.splice(idx, 1);
    return true;
  }
  await apiClient.delete(`/contributions/${id}/`);
  return true;
}
