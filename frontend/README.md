# Ledger — Departmental Payment/Contribution System (Frontend)

A React frontend for tracking departmental dues, event fees, merchandise, and
project contributions — built to plug into a **Django + Django REST
Framework** backend. This package is frontend-only; no backend code is
included.

## Why this exists

Right now, payments happen across bank transfers, POS, and cash, tracked via
screenshots and a class rep's memory. Students don't know if a payment was
actually recorded. This app gives every student a live view of what they owe
and what's been confirmed, and gives admins a single verification queue
instead of a scattered inbox.

## Stack

- React 18 + React Router 6
- Axios for API calls (JWT access/refresh handling built in)
- Plain CSS with a small design-token system (`src/index.css`) — no
  Bootstrap/Tailwind dependency, but nothing here fights a Bootstrap
  migration if your team prefers it
- Fully responsive: sidebar collapses to a horizontal scroll bar under 780px,
  auth screen drops its side panel under 860px, tables scroll horizontally
  on small screens

## Running it standalone (no backend yet)

```bash
npm install
npm run dev
```

Open the printed localhost URL. The app runs entirely on **mock data**
(`src/mock/data.js`) until `VITE_API_BASE_URL` is set — a "Running on mock
data" flag shows in the bottom-right corner as a reminder. Demo logins:

- Student: `CSC/2021/041` / `password123`
- Admin: `ADMIN/001` / `adminpass`

## Connecting the Django + DRF backend

1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your API's
   base path, e.g. `http://127.0.0.1:8000/api`.
2. Every function in `src/api/*.js` (`auth.js`, `contributions.js`,
   `payments.js`) has a `MOCK_MODE` branch and a real-`apiClient` branch —
   once the env var is set, the real branch runs automatically. No component
   code needs to change.
3. Build the backend to the contract documented in the comment block at the
   top of each `src/api/*.js` file. Summary:

### Auth (`djangorestframework-simplejwt` assumed)
| Method | Endpoint | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/login/` | `{ matric_no, password }` | `{ access, refresh, user }` |
| POST | `/api/auth/register/` | `{ full_name, matric_no, email, level, password }` | `{ access, refresh, user }` |
| POST | `/api/auth/token/refresh/` | `{ refresh }` | `{ access }` |
| GET | `/api/auth/me/` | — | `user` |

`user` shape: `{ id, full_name, email, matric_no, role: "student"|"admin", level }`

### Contributions
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/contributions/` | list open contributions |
| POST | `/api/contributions/` | admin only |
| PATCH | `/api/contributions/:id/` | admin only |
| DELETE | `/api/contributions/:id/` | admin only, closes it |

Fields: `{ id, title, category, amount, deadline, description, mandatory, created_at }`

### Payments
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/payments/?student_id=&status=` | filterable list |
| POST | `/api/payments/` | `multipart/form-data`: `contribution_id, amount, channel, proof (file), note` |
| PATCH | `/api/payments/:id/verify/` | admin only, `{ status: "verified"\|"rejected", note }` |

`channel` enum used by the UI: `online_gateway`, `bank_transfer`, `pos`, `cash`.

### Admin — student roster, detail, analytics (`src/api/students.js`)
All of these should be admin-only (`IsAdminUser` or a custom role check).

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/admin/students/?search=&status=` | roster for the Admin Dashboard table. `status` is `paid`\|`unpaid`; `search` matches name or matric no. Returns `{ id, matric_no, full_name, department, level, current_status }` per row. |
| GET | `/api/admin/students/:id/` | read-only detail: `{ id, matric_no, full_name, email, department, level, history: [{ session, amount, date, status }] }`, oldest session first. No PATCH/DELETE — corrections go through payment verification, not editing the student record. |
| GET | `/api/admin/analytics/` | `{ total_students, paid, unpaid, total_collected, total_outstanding }` for the current session. |
| POST | `/api/admin/analytics/ask/` | `{ question }` → `{ answer }`. The frontend currently answers a handful of keyword-matched questions (paid/unpaid counts, collected/outstanding totals) locally in mock mode; the real endpoint can answer the same aggregates, or proxy free-text questions through an LLM call. |

The "current academic session" string (e.g. `2026/2027`) lives in
`src/constants.js` as `CURRENT_SESSION` — point this at whatever your
backend calls the active session, or fetch it from the backend instead if
sessions roll over during the semester.

If/when you wire up a real payment gateway (Paystack/Flutterwave are the
common choices in Nigeria), add:

- `POST /api/payments/initialize/` → `{ authorization_url, reference }`
- `GET /api/payments/verify/:reference/` → confirms the charge and marks the
  payment `verified` automatically

so `online_gateway` payments skip the manual admin review that
`bank_transfer`/`pos`/`cash` proofs require.

## Project structure

```
src/
  api/            axios client + one wrapper file per resource
  components/     AppShell (sidebar), ProtectedRoute, StatusBadge, PaymentModal
  constants.js    CURRENT_SESSION and other app-wide constants
  context/        AuthContext (login/register/logout, current user)
  mock/           in-memory mock dataset used until a backend is connected
  pages/          Login, Dashboard, Contributions, History
  pages/admin/    Overview (dashboard), StudentDetail, ManageContributions,
                  VerifyPayments, Analytics
```

## Roles

- **Student**: Dashboard (outstanding + recent activity), Contributions
  (pay/upload proof), Payment history (receipts, printable).
- **Admin**: logs in through the same form as students — role comes back
  from the backend, not a separate portal.
  - **Dashboard** (`/admin`) — session header, quick stats (total students,
    paid, unpaid, total collected), search by name/matric, All/Paid/Unpaid
    filter, and a student table. Click a row to open that student.
  - **Student detail** (`/admin/students/:id`) — read-only: basic info plus
    dues history across every session, with the current session's status
    called out. No edit/delete actions by design.
  - **Contributions** (`/admin/contributions`) — create/edit/close dues,
    events, merchandise runs, etc.
  - **Verify payments** (`/admin/verify`) — pending/verified/rejected queue
    for manually-submitted (bank transfer/POS/cash) proofs.
  - **Analytics** (`/admin/analytics`) — paid-vs-unpaid donut chart, total
    collected/outstanding, and an "Ask a question" panel that answers basic
    stats questions (wire it to a real LLM later via
    `/api/admin/analytics/ask/`).

Route guarding is in `components/ProtectedRoute.jsx` — admin-only routes
redirect students back to `/dashboard`.
