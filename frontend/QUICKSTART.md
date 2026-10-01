# Quickstart (VS Code)

This is the frontend only — a React app, built with Vite. Do this once per
machine, then it's just `npm run dev` every time after.

## 1. Install Node.js
You need Node 18 or newer. Check with:
```bash
node -v
```
If you don't have it, grab the LTS installer from https://nodejs.org.

## 2. Open the project
In VS Code: **File → Open Folder…** → select the `dept-payments` folder
(the one with `package.json` in it, not a parent folder).

If VS Code prompts "This workspace has extension recommendations," click
**Install All** — that gets everyone on the same ESLint/Prettier/formatting
setup so we're not fighting diffs over whitespace.

## 3. Install dependencies
Open a terminal in VS Code (`` Ctrl+` `` / `` Cmd+` ``) and run:
```bash
npm install
```

## 4. Run it
```bash
npm run dev
```
Vite will print a local URL (usually `http://localhost:5173`). Open that in
your browser, or press `o` in the terminal to open it automatically.

The app runs on **mock data** out of the box — no backend needed to work on
UI. You'll see a small "Running on mock data" tag in the bottom-right corner
as a reminder. Demo logins:
- Student: `CSC/2021/041` / `password123`
- Admin: `ADMIN/001` / `adminpass`

## 5. Connecting to the real backend (once it's ready)
Copy `.env.example` to `.env`, set `VITE_API_BASE_URL` to wherever the
Django + DRF backend is running (e.g. `http://127.0.0.1:8000/api`), restart
`npm run dev`. Full endpoint contract is in `README.md`.

## Where things live
```
src/pages/            one file per screen (Login, Dashboard, Contributions, History)
src/pages/admin/      admin screens (Overview, Managebutions, VerifyPayments)
src/components/       shared UI pieces (sidebar shell, payment modal, status badge)
src/api/              everything that talks to the backend (or mock data)
src/context/          logged-in user state
src/index.css         all styling — colors/fonts/spacing are CSS variables at the top
```

## If something won't run
- **"vite: not found"** → you skipped `npm install`, or it failed partway —
  delete `node_modules` and `package-lock.json`, run `npm install` again.
- **Port 5173 already in use** → close whatever else is running, or Vite
  will just pick the next free port automatically (check the terminal output).
- **Blank white page** → open the browser dev tools console (F12) and check
  for a red error; nine times out of ten it's a typo in a file someone just
  edited — the terminal running `npm run dev` will usually also show it.
