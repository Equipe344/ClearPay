import axios from "axios";

/**
 * Backend contract: Django REST Framework, JWT auth (e.g. simplejwt).
 *
 * Set VITE_API_BASE_URL in a .env file once the backend is live, e.g.:
 *   VITE_API_BASE_URL=https://api.yourdept.edu/api
 *
 * Until that variable is set, the app runs fully on mock data (see
 * src/mock/data.js) so the UI/UX can be reviewed and demoed without
 * the backend existing yet. Every function in src/api/*.js is written
 * against the endpoint shape the Django team should implement, so
 * switching MOCK_MODE off is a drop-in swap, not a rewrite.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export const MOCK_MODE = !API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh access token on 401, matching djangorestframework-simplejwt's
// POST /api/auth/token/refresh/ { refresh } -> { access }
let isRefreshing = false;
let queue = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !MOCK_MODE) {
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject, original });
        });
      }
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh,
        });
        localStorage.setItem("access_token", data.access);
        queue.forEach(({ resolve, original: o }) => {
          o.headers.Authorization = `Bearer ${data.access}`;
          resolve(apiClient(o));
        });
        queue = [];
        original.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(original);
      } catch (refreshErr) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Small helper so mock functions can simulate network latency without
// littering every mock file with setTimeout boilerplate.
export const mockDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
