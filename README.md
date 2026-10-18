# Unfazed

Unfazed is a therapist practice-management project for India. The repository contains a React/Vite interactive dashboard demo and an Express/MongoDB API starter. The frontend is **not yet fully connected** to the API: most dashboard data and actions remain demo-only. Do not enter real client or clinical information.

## Requirements

- Node.js 20.19+ (Node.js 24 is supported by the frontend toolchain)
- npm
- MongoDB running locally, or a MongoDB Atlas URI

## Recommended Windows setup

The ZIP was extracted under OneDrive, where the original project folder has a delete-child ACL restriction. Keep that original copy as a backup and work from the clean copy at `C:\Projects\unfazed-project`.

Open two PowerShell terminals in the safe copy.

### Backend

```powershell
Set-Location C:\Projects\unfazed-project\unfazed-backend
Copy-Item .env.example .env
```

Edit `.env` and set `JWT_SECRET` to a unique random value of at least 32 characters. Keep `MONGO_URI` pointed at your local MongoDB or Atlas database. Razorpay values may remain blank for demo use.

```powershell
npm ci
npm run dev
```

The API listens on `http://localhost:5000`; its health endpoint is `http://localhost:5000/api/health`.

To generate a local JWT secret in PowerShell:

```powershell
$bytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Optional demo data:

```powershell
npm run seed
```

Demo credentials: `demo@unfazed.in` / `UnfazedDemo123!`. Do not reuse this account or password outside a disposable development database.

### Frontend

```powershell
Set-Location C:\Projects\unfazed-project\unfazed-frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

Vite serves the site at `http://localhost:5173` when that port is available. Set `VITE_API_BASE_URL` in `.env` to `http://localhost:5000/api` to point the few currently wired requests at the API.

## Current implementation boundaries

- The React dashboard, clients, schedule, notes, payments, analytics, settings and client-portal preview use local demo data. Notes stay in memory only; the app removes an older `uf_notes` local-storage entry on startup.
- The backend contains therapist authentication, profile, client, scheduling, notes, payments, analytics, entitlements, invoices and health routes. Therapist-owned API queries are scoped to the authenticated therapist.
- Public profile/intake/booking and shared-note endpoints exist in the API; the client portal UI is only a preview and there is no client-account authentication yet.
- Booking writes are serialized per therapist to prevent concurrent overlapping bookings. Configure MongoDB backups and monitoring for any non-demo use.
- Razorpay order creation, signature verification and webhooks are API-side boundaries only. The frontend checkout is not wired. Empty keys enable clearly flagged demo orders; this is not payment processing.
- Socket.IO requires a valid therapist JWT. Chat is not persisted and the frontend message view remains demo-only.
- Email/WhatsApp notifications intentionally log a stub event; no delivery provider is configured.
- Subscription tier definitions and `canAccess(therapistId, featureKey)` are centralized in the backend. Billing/subscription lifecycle and frontend entitlements are not implemented.

## Clinical-data and production notice

This is an educational starter, not a production medical-records or regulatory-compliance system. Before any real use, add client identity/access flows, audit logs, encryption and key management, backups, retention controls, rate limiting, monitoring, tested deployment/restore procedures, provider verification, and legal/privacy review. Never expose `RAZORPAY_KEY_SECRET` or `JWT_SECRET` in frontend variables.

`.env` files are ignored by Git; commit only placeholder templates such as `.env.example`.
