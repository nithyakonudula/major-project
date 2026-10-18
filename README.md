# Unfazed — Therapist Practice Management SaaS

A MERN-style major project for therapists in India. It includes a responsive React dashboard/client portal and an Express + MongoDB API with JWT auth, scheduling, CRM/intake, notes privacy, payments adapter, chat sockets, configurable subscription entitlements, notifications, and analytics.

## Quick start

### Requirements
- Node.js 18+
- MongoDB local instance or MongoDB Atlas connection string

### 1. Backend
```bash
cd unfazed-backend
cp .env.example .env
# set MONGO_URI and JWT_SECRET in .env
npm install
npm run seed   # creates demo therapist and sample data (optional)
npm run dev
```
API runs at `http://localhost:5001`; health check: `http://localhost:5001/api/health`.

Demo login (after seed): `demo@unfazed.in` / `UnfazedDemo123!`

### 2. Frontend
Open a second terminal:
```bash
cd unfazed-frontend
cp .env.example .env
npm install
npm run dev
```
Open the URL Vite prints (normally `http://localhost:5173`). The frontend works in **demo mode** without the API using seeded local sample data; set `VITE_API_BASE_URL=http://localhost:5001/api` to connect it to the backend.

## Project structure
- `unfazed-backend/` — Express API, Mongoose models, auth middleware, centralized entitlement service, payment adapter, notification stub, Socket.IO chat.
- `unfazed-frontend/` — Vite + React dashboard and public therapist/client views.

## Deploy from GitHub with Render

The root `render.yaml` defines the frontend static site and backend API. To deploy:

1. Create a MongoDB Atlas account and a database. Create a database user and copy the connection URI; replace its password placeholder with the database user's password.
2. In Atlas Network Access, allow connections from Render. Render's free instances do not have fixed outbound IP addresses, so `0.0.0.0/0` may be required; use a strong, unique database password and never share the URI.
3. Create a Render account, choose **New > Blueprint**, and connect this GitHub repository's `main` branch.
4. Enter the Atlas URI when Render prompts for `MONGO_URI`. Render generates `JWT_SECRET`; keep it private. The blueprint connects the frontend and API automatically.
5. Wait for both services to deploy. Render displays the public frontend URL and API URL in the service dashboards. The API health check is at `/api/health`.

The free API service may sleep when idle, so its first request can take longer. This is an educational demo, not a production medical-records system: do not enter real client or clinical information.

## Modules implemented
1. Authentication, therapist profile and branded slug
2. Weekly availability and booking flow with overlap protection
3. Client CRM, intake and consent capture
4. Payment records, package model and Razorpay adapter interface
5. Private/shared clinical notes (private notes excluded from client-facing API)
6. Socket.IO chat + notification event stubs
7. Configurable subscription tiers, centralized feature gating and MongoDB analytics aggregation

## Integrations and production notes
- Razorpay is test-mode-ready when keys are supplied. Never expose the secret key in the frontend. Payment verification/webhooks must be configured with a real Razorpay dashboard before accepting payments.
- Email/WhatsApp notifications are intentionally stubbed/logged. Add provider credentials and delivery retries before production use.
- The client UI includes demo fallback behavior; API mode requires MongoDB and valid `.env` values.
- This is an educational project starter, not a production medical-records compliance certification. Before storing real clinical data, add formal consent, audit logs, encryption/key management, backups, retention policies, rate limiting, monitoring, and legal/privacy review.

## Git suggestion
Commit each module on its own branch and keep `.env` out of Git. Use `.env.example` for placeholders only.
