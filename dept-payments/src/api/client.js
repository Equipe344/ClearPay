import axios from "axios";

/**
 * Backend contract: Django REST Framework, Token auth (rest_framework.authtoken).
 *
 * Set VITE_API_BASE_URL in a .env file once the backend is live, e.g.:
 *   VITE_API_BASE_URL=https://<render-app>/api
 *
 * Until that variable is set, the app runs fully on mock data (see
 * src/mock/data.js) so the UI/UX can be reviewed and demoed without
 * the backend existing yet.
 *
 * Source of truth for every endpoint: docs/API_CONTRACT.md on the backend
 * branch — don't keep a separate copy of it here.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export const MOCK_MODE = !API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach the auth token to every request. Tokens don't expire and there's
// no refresh endpoint, so this is the only auth interceptor needed.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

// On any 401, the token is no longer valid — clear it and send the user
// back to login. There is no refresh flow to attempt first.
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !MOCK_MODE) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

// Every error from the backend is shaped { error: "code", message: "text" }.
// Always read .message, never .detail.
export const getErrorMessage = (err) =>
  err.response?.data?.message || "Something went wrong. Please try again.";

// The specific error `code` string, when the caller needs to branch on it
// (e.g. "already_paid", "email_required") rather than just show the message.
export const getErrorCode = (err) => err.response?.data?.error;

// Small helper so mock functions can simulate network latency without
// littering every mock file with setTimeout boilerplate.
export const mockDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
