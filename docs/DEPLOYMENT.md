# Deployment guide

Two supported backend paths and one frontend path. **Render is the recommended
default**; Docker is offered as an optional alternative for anyone who prefers
containers. Pick one — do not run both.

---

## 1. Backend on Render (recommended)

The repo ships `render.yaml`, a one-click Blueprint.

1. Render dashboard → **New + → Blueprint** → select this repository.
2. Render reads the root `render.yaml` and creates:
   - Web service `dpt-backend` (root dir `backend`).
   - Managed PostgreSQL `dpt-postgres`.
3. Set the two secrets marked `sync: false` in the dashboard:
   - `PAYSTACK_SECRET_KEY` — Paystack **test** secret key (`sk_test_...`).
   - `PAYSTACK_PUBLIC_KEY`  — Paystack **test** public key (`pk_test_...`).
4. Set `CORS_ALLOWED_ORIGINS` to the deployed frontend origin, e.g.
   `https://your-frontend.vercel.app` (exact origin, no trailing slash, no `*`).
5. Deploy, then confirm `https://<service>.onrender.com/api/health/` returns OK.

Leave `BMONI_API_KEY` empty — the feature stays off (its endpoints answer 503
rather than inventing an account). See `docs/BMONI_SANDBOX_RUNBOOK.md`.

`SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `NUM_PROXIES=1` and `DATABASE_URL`
are already handled by the Blueprint — do not set them by hand.

---

## 2. Backend with Docker (optional alternative)

Same app, same env vars, containerised. Useful when a host prefers images or for
reproducible local runs.

**Local (backend + Postgres, one command):**

```bash
docker compose up --build
# → http://127.0.0.1:8000/api/health/
```

`docker-compose.yml` uses obvious local-only placeholder secrets and `DEBUG=True`
so it works over plain HTTP. Never reuse those values in production.

**Build the image on its own:**

```bash
docker build -t dpt-backend ./backend
docker run --rm -p 8000:8000 \
  -e SECRET_KEY=change-me \
  -e DEBUG=False \
  -e ALLOWED_HOSTS=.onrender.com,localhost \
  -e DATABASE_URL=postgres://user:pass@host:5432/db \
  -e PAYSTACK_SECRET_KEY=sk_test_xxx \
  dpt-backend
```

The image runs `migrate` + `collectstatic` at **startup** (not build), so no
secret is ever baked in. Uploaded proofs live on the container filesystem —
attach a persistent volume or object storage for anything long-lived.

> Deployment hosts that accept a Dockerfile (Render “Docker” runtime, Railway,
> Fly.io, a VPS) can build this image directly. Vercel should host the frontend
> only — Django needs a long-running server, not serverless functions.

---

## 3. Frontend on Vercel

- Project root: the `frontend/` folder.
- Build command: `npm run build` · Output directory: `dist`.
- Environment variable:

  ```text
  VITE_API_BASE_URL=https://<your-backend>.onrender.com/api
  ```

Then add that Vercel origin back into the backend's `CORS_ALLOWED_ORIGINS` and
redeploy the backend if it was already live.

---

## 4. After deploying (both paths)

1. `GET /api/health/` returns OK.
2. Create the demo data (department, admin, rep, students, one or two
   contributions).
3. Log in from the deployed frontend — a CORS error here means
   `CORS_ALLOWED_ORIGINS` does not exactly match the frontend origin.
4. Point the Paystack dashboard webhook at
   `https://<backend>/api/payments/webhook/` and make one test payment.

---

## Environment variables (reference)

| Variable | Local | Production |
|---|---|---|
| `SECRET_KEY` | any dev string | Render-generated |
| `DEBUG` | `True` | `False` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | `.onrender.com` (+ custom domain) |
| `DATABASE_URL` | `sqlite:///db.sqlite3` | Render Postgres connection string |
| `NUM_PROXIES` | `0` | `1` |
| `CORS_ALLOWED_ORIGINS` | local Vite origins | exact deployed frontend origin |
| `PAYSTACK_SECRET_KEY` | test key | test key (required) |
| `PAYSTACK_PUBLIC_KEY` | test key | test key |
| `BMONI_API_KEY` | empty (off) | empty (off) for the demo |
| `BMONI_WEBHOOK_SECRET` | empty | empty |

`SECRET_KEY` and `PAYSTACK_SECRET_KEY` have no defaults — the app refuses to
boot without them, by design.

---

## Known constraints

- **Ephemeral storage:** uploaded proofs are on local disk. Demo-upload and
  review in one session, or move to object storage before long-term use.
- **Free Postgres:** no backups; the free instance is removed ~30 days after
  creation. Upgrade before it matters.
- **Forward-only migrations:** roll forward with a fix; never edit the
  production schema by hand.
- **Free services sleep:** warm `/api/health/` before presenting.
