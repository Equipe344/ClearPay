import { apiClient, MOCK_MODE, mockDelay } from "./client";
import { mockNotifications } from "../mock/data";

/**
 * Real Django DRF endpoints:
 *
 * GET  /api/notifications/            -> [{ id, notification_type, message,
 *                                            contribution, contribution_title,
 *                                            is_read, created_at }]
 * POST /api/notifications/:id/read/   -> marks one notification read
 */

export async function listNotifications() {
  if (MOCK_MODE) {
    await mockDelay(250);
    return [...mockNotifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  const { data } = await apiClient.get("/notifications/");
  return data;
}

export async function markNotificationRead(id) {
  if (MOCK_MODE) {
    await mockDelay(150);
    const n = mockNotifications.find((n) => n.id === id);
    if (n) n.is_read = true;
    return n;
  }
  const { data } = await apiClient.post(`/notifications/${id}/read/`);
  return data;
}
