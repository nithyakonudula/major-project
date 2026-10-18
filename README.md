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
