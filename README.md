url:https://automated-firewall-validator.vercel.app/login
id:admin@firewall.local
pass:admin123
# Automated Firewall Rule Validation System

An educational firewall-management simulator that combines **Computer Networks**, **Full Stack Web Development** and **Finite Automata & Formal Language Theory**.

- Frontend: React 18, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide
- Backend: Node.js, Express, Mongoose, JWT, bcrypt (`bcryptjs`), dotenv
- Database: MongoDB
- Validation: regular expressions + semantic range checks (`server/validators/ruleValidator.js`)
- Classification: a hand-written DFA (`server/automata/firewallDFA.js`) that contains **no regular expressions**

> This is a simulator. It never reads or changes the real Windows Firewall.

---

## Requirements (install once)

| Tool | Notes |
|---|---|
| Node.js 18.11 or newer (LTS recommended) | https://nodejs.org - check with `node -v` |
| MongoDB Atlas cluster | https://www.mongodb.com/atlas |
| Visual Studio Code | optional but recommended |

---

## Setup on Windows (PowerShell)

### 1. Extract the project
Right-click `automated-firewall-validator.zip` -> **Extract All...** -> choose e.g. `C:\Projects`. You should get `C:\Projects\automated-firewall-validator`.

### 2. Open it in VS Code
```powershell
cd C:\Projects\automated-firewall-validator
code .
```
(or VS Code -> File -> Open Folder). Open a terminal with **Terminal -> New Terminal** (make sure it is PowerShell).

### 3. Install dependencies
```powershell
npm run install:all
```
This installs the root, `server` and `client` packages. If PowerShell blocks scripts ("running scripts is disabled"), run once:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 4. Configure `.env`
```powershell
Copy-Item .env.example .env
notepad .env
```
Set at least a long random `JWT_SECRET`. Generate one with:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Set these values for local development. Atlas provides the URI shown below; the sample host is a placeholder:
```
PORT=5000
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@<cluster-host>/firewall_validator?retryWrites=true&w=majority
JWT_SECRET=<long-random-secret>
```
The Vite development server defaults to `http://localhost:5000/api`; no client `.env` is needed for local development.

### 5. Connect MongoDB
**MongoDB Atlas:** open Atlas > **Database** > **Connect** > **Drivers**, select Node.js, copy the full connection string, replace `<db_password>` with the database user's password (URL-encode reserved characters), and set it as `MONGODB_URI`. Under **Network Access**, allow the server's egress IP; for Render, allow the outbound IP ranges Render lists for your service/region or use a suitable Atlas network access strategy. `querySrv EBADNAME` or `ECONNREFUSED` usually means the hostname in the URI is wrong/unresolvable or DNS/network access is blocked. Never guess the hostname.

### 6. Seed sample data
```powershell
npm run seed
```
This creates a superadmin account and 12 sample rules plus validation history when they do not already exist. Seeding is idempotent and does not delete existing records. Set `ALLOW_REGISTRATION=true` to accept public registration requests; all new accounts stay pending until a superadmin approves them.

Admin login: use `SEED_ADMIN_EMAIL` and the password you set in `.env` (change it under *Settings*).

### 7. Run the backend
```powershell
npm run server
```
You should see `MongoDB connected` and `API listening on http://localhost:5000`.
Check: open http://localhost:5000/api/health in a browser.

### 8. Open a second terminal
In VS Code click the **+** icon in the terminal panel (or press `Ctrl+Shift+5`). Keep the backend running in the first one.

### 9. Run the frontend
```powershell
cd C:\Projects\automated-firewall-validator
npm run client
```

### 10. Open the application
Go to **http://localhost:5173** and sign in.

> Shortcut: `npm run dev` starts backend and frontend together in one terminal.

---

## Commands

| Command | What it does |
|---|---|
| `npm run install:all` | install all dependencies |
| `npm run seed` | reset and seed the database |
| `npm run server` | API with Node's built-in file watcher |
| `npm run client` | Vite dev server |
| `npm run dev` | both at once |
| `npm test` | run all tests |
| `npm run build` | production build of the client into `client/dist` |

## Tests

```powershell
npm test
```
- `validators.test.js` - valid/invalid IPs, ports, protocols, actions, whole rules
- `dfa.test.js` - accepted and rejected strings, transitions, trap state, independence from regex, regex/DFA agreement
- `status.test.js` - ACTIVE / BLOCKED (DENY vs disabled) / INVALID classification
- `api.test.js` - integration tests: approval/rejection workflow, auth, create, update, delete, enable/disable, duplicate detection, validation, history, dashboard. Set `TEST_MONGODB_URI` to a dedicated disposable database whose name includes `test`; tests are skipped if unset or unreachable and refuse the production URI.

---

## How it works

**Rule string read by the DFA:** `destinationIP,destinationPort,protocol,action`, e.g. `192.168.1.10,443,TCP,ALLOW`.

```
q0 --IP--> q1 --PORT--> q2 --PROTOCOL--> q3 --ACTION--> q4 (accepting)
any other (state, symbol) --> qReject (trap; never left)
```
Tokens are turned into symbols by small character-level recognisers (IPv4, port, keyword trie), not by regex. The DFA then moves through states using the transition function. The UI shows the transition table, an SVG state diagram, step-by-step animation and a stored execution history.

**Status model** - three independent stored properties: `validationStatus` (VALID/INVALID), `enabled`, `action` (ALLOW/DENY). The display status is derived:

| Display status | Rule |
|---|---|
| INVALID | failed validation - never active, cannot be enabled |
| ACTIVE | VALID + enabled + ALLOW |
| BLOCKED | VALID + (DENY policy **or** disabled); a chip shows which one |

**Conventions:** `0.0.0.0` = any address, port `0` = any port. Ports are optional only for ICMP. Invalid rules can be saved (so you can study them) but are stored INVALID and forced disabled.

## API

| Method | Path | |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public (rate limited) |
| GET | `/api/auth/profile` | |
| PUT | `/api/auth/password` | |
| GET | `/api/admin/users`, `/api/admin/users?status=PENDING\|APPROVED\|REJECTED` | superadmin only; user lists and status totals |
| GET | `/api/admin/users/pending-count` | superadmin only; sidebar badge count |
| PATCH | `/api/admin/users/:id/approve`, `/api/admin/users/:id/reject` | superadmin only; pending requests only |
| POST/GET | `/api/rules` | create / list (`q, status, protocol, action, enabled, sort, order, page, limit`) |
| GET/PUT/DELETE | `/api/rules/:id` | |
| PATCH | `/api/rules/:id/toggle` | enable / disable |
| POST | `/api/validate` | `{ "rule": "ip,port,proto,action" }` or `{ "fields": {...} }` |
| GET | `/api/validation-history`, `/api/validation-history/:id` | |
| DELETE | `/api/validation-history` | |
| GET | `/api/dfa/definition` | states, alphabet, transitions |
| GET | `/api/dashboard/stats`, `/api/dashboard/analytics` | |

All except register/login/health require `Authorization: Bearer <token>`.

## Project structure
```
automated-firewall-validator/
|-- client/   React app (components, pages, layouts, services, context, hooks, utils)
|-- server/   config, controllers, middleware, models, routes, services, validators, automata, seed, tests
|-- package.json  .env.example  .gitignore  README.md
```
`client/src/utils/validators.js` is a copy of `server/validators/ruleValidator.js` (identical, dependency-free) so the browser gives live field errors using the same rules. The server always re-validates.

## Deploy to Render and Vercel

The project includes `render.yaml` and `client/vercel.json`.

1. Push the source to `Shivapriya-M/automated-firewall-validator` from a checkout that has its Git history and authenticated `origin` configured. This extracted workspace has no `.git` directory, so it cannot push or inspect that history.
2. In Render, create a **Blueprint** from the GitHub repository and supply `MONGODB_URI`, `CLIENT_URL` and the three `SEED_ADMIN_*` values when prompted. Render generates `JWT_SECRET`; retain that value. Use the service URL Render assigns. Set Atlas Network Access to permit the Render service.
3. Run the seed command once from a trusted environment configured with the same production `MONGODB_URI` and admin seed variables: `npm run seed --prefix server`. Seeding is idempotent and does not delete existing records. It will not change a pre-existing admin's password.
4. In Vercel, import the repository and set the **Root Directory** to `client`. Add `VITE_API_URL=https://<your-render-service>.onrender.com/api` for Production (and Preview if desired), then deploy. The Vercel rewrite serves the SPA routes.
5. Update Render's `CLIENT_URL` to the exact Vercel production origin, without a path (for example `https://<your-project>.vercel.app`), and redeploy/restart the API. Check `https://<your-render-service>.onrender.com/api/health`, then sign in using `SEED_ADMIN_EMAIL` and the password used at first seed.

Production environment values:

| Render | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Real URI from Atlas > Database > Connect > Drivers |
| `JWT_SECRET` | Generate securely in Render; keep private |
| `JWT_EXPIRES_IN` | `8h` |
| `CLIENT_URL` | Exact Vercel origin |
| `ALLOW_REGISTRATION` | `true` (registrations remain pending until superadmin approval) |
| `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Unique admin credentials |

| Vercel | Value |
|---|---|
| `VITE_API_URL` | `https://<your-render-service>.onrender.com/api` |

Do not place Render secrets in Vercel or commit populated environment files. Live deployments require GitHub, Render, Vercel, and Atlas account access; no hosting credentials or live URLs are available from this workspace.

## Troubleshooting

- **`Could not connect to MongoDB`** - copy the current connection string from Atlas > Database > Connect > Drivers, check its hostname, database user/password encoding, and Atlas Network Access.
- **Browser shows "Cannot reach the API"** - backend not running, or port mismatch with `VITE_API_URL`.
- **CORS error** - add your frontend origin to `CLIENT_URL` in `.env` and restart the server.
- **Port 5000 or 5173 busy** - change `PORT` (and `VITE_API_URL`) or stop the other program.
- **"Too many attempts"** on login - the login rate limit (40 / 15 min) was hit; wait a few minutes.
- **Registration disabled** - set `ALLOW_REGISTRATION=true`, or use the seeded admin.
# automated-firewall-validator

