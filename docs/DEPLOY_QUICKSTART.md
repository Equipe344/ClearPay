# Deploy quickstart (Render + Vercel)

The shortest path from this repo to a working demo. Backend → **Render**,
frontend → **Vercel**, database → **Render Postgres**. All three are free-tier
friendly. Do the phases in order.

> The two halves are independent services that must be *wired together*:
> the frontend needs the backend's URL, and the backend needs to allow the
> frontend's origin (CORS). Get that handshake right and everything works.

---

## Phase 1 — Backend on Render

1. Render dashboard → **New + → Blueprint** → pick this repo.
   Render reads `render.yaml` and creates the web service `dpt-backend`
   (root dir `backend`) **and** the Postgres database `dpt-postgres`.
2. When Render prompts, fill the `sync: false` values:

   | Variable | Value |
   |---|---|
   | `PAYSTACK_SECRET_KEY` | your Paystack **test** secret key (`sk_test_…`) |
   | `PAYSTACK_PUBLIC_KEY` | your Paystack **test** public key (`pk_test_…`) |
   | `FRONTEND_URL` | the Vercel URL from Phase 2 (you can set it after Phase 2) |
   | `ADMIN_EMAIL` | optional — your email |
   | `ADMIN_PASSWORD` | **set this** — the first admin's password |
   | `CORS_ALLOWED_ORIGINS` | the Vercel origin from Phase 2 |

   `ADMIN_USERNAME` defaults to `admin`. Everything else (`SECRET_KEY`,
   `DEBUG=False`, `ALLOWED_HOSTS`, `NUM_PROXIES=1`, `DATABASE_URL`) is handled by
   the blueprint — do not set those by hand.
3. Deploy. The build runs, in order:
   `pip install … && collectstatic && migrate && seed_admin`.
   `seed_admin` creates your first admin (with `role=admin`) from the
   `ADMIN_*` values — this is how you get an admin without a shell, since free
   Render web services have **no Shell/SSH**. It **also creates the department**
   named by `ADMIN_DEPARTMENT` (`Computer Science` by default) and assigns the
   admin to it, so the very first deploy can create fees, register students, and
   import a roster with **no manual setup**. It is idempotent and never rewrites
   an existing user's password, so it is safe on every redeploy.
4. Check `https://<service>.onrender.com/api/health/` returns OK.
5. Log into `https://<service>.onrender.com/admin/` with your admin to confirm.

---

## Phase 2 — Frontend on Vercel

1. Vercel → **Add New… → Project** → import this repo.
2. **Root Directory = `frontend`** (Edit next to Root Directory). Required —
   the repo is a monorepo.
3. Framework preset **Vite**; build `npm run build`; output `dist`.
4. Add environment variable:
   ```
   VITE_API_BASE_URL = https://<your-backend>.onrender.com/api
   ```
   No trailing slash, must end in `/api`. Vite bakes this in **at build time**.
5. Deploy. `frontend/vercel.json` (already in the repo) adds the SPA rewrite so
   deep links like `/payment/callback` don't 404 on refresh.

---

## Phase 3 — Connect them

1. Copy the Vercel URL (e.g. `https://your-app.vercel.app`).
2. In Render → `dpt-backend` → **Environment**, set:
   - `CORS_ALLOWED_ORIGINS = https://your-app.vercel.app`
   - `FRONTEND_URL = https://your-app.vercel.app`
3. **Redeploy** the backend (or restart) so the new env vars take effect.
4. Log in from the Vercel site. A CORS error in the browser console means
   `CORS_ALLOWED_ORIGINS` does not *exactly* match the Vercel origin.

---

## Phase 4 — Paystack

1. Paystack dashboard → **Settings → API Keys & Webhooks** → **Webhook URL** =
   `https://<your-backend>.onrender.com/api/payments/webhook/`
2. Make one test payment end to end. After paying, the student is redirected to
   `FRONTEND_URL/payment/callback?reference=…` (this is the `callback_url` the
   backend now sends), which verifies and shows the receipt.

---

## Managing departments

Departments are the parent of every contribution and every roster row. A fresh
deploy gets one automatically (from `ADMIN_DEPARTMENT`), but you can add more
from inside the app:

- **Admin → Departments** (`/admin/departments`) → **+ New department**.
- The same list feeds the student signup dropdown. With **zero** departments the
  login page now disables registration with a clear message instead of bouncing
  off a confusing `400`.

## Deploy-day gotchas

| Symptom | Fix |
|---|---|
| "Running on mock data" tag in production | `VITE_API_BASE_URL` was not set when Vercel built — set it and **redeploy** |
| Deep link 404s on refresh | Ensure `frontend/vercel.json` is present (it ships in this repo) |
| CORS error | `CORS_ALLOWED_ORIGINS` must be the exact origin (no slash, no path) |
| First request slow (~50s) | Free Render sleeps after ~15 min idle — ping `/api/health/` before the demo |
| Payment 502 `gateway_unavailable` | Paystack keys missing/invalid in Render env |
| Data gone after ~30 days | Free Postgres expires — upgrade to `basic-256mb` before then |

---

## Known limitations (by design / infrastructure)

These are not bugs — know them before the demo:

- **Uploaded proof files are ephemeral in production.** Offline payment proofs
  (`POST /payments/submit/`) are written to the container's local disk. On Render
  that disk is wiped on every deploy/restart, so **upload a proof and review it in
  the same session**. For anything long-lived, front the uploads with S3-compatible
  object storage (`django-storages` + `boto3`) — a post-hackathon change, since it
  adds a dependency the project deliberately avoids today.
- **Free Postgres has no backups and is deleted ~30 days after creation.** Upgrade
  the `dpt-postgres` instance to `basic-256mb` before then if it must outlive the
  hackathon.
- **Free web services sleep after ~15 min idle** (~50s cold start). Warm
  `/api/health/` right before you present so the wake-up doesn't eat your slot.
- **Refunds are never automatic.** Any amount mismatch is flagged
  `refund_status=pending_review` and a human decides in the Django admin. This is
  deliberate (financial/legal safety), not an omission.
