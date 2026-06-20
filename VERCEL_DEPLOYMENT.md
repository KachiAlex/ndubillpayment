# Vercel + Neon Deployment Guide

## Overview

The project has been migrated from Firebase to:
- **Frontend**: Vercel (React static hosting)
- **Backend**: Vercel Serverless Functions (Express via `serverless-http`)
- **Database**: Neon PostgreSQL

## Architecture Changes

| Component | Before | After |
|-----------|--------|-------|
| Auth | Firebase Auth | JWT (backend-managed) |
| Frontend Hosting | Firebase Hosting | Vercel |
| Backend | Firebase Functions | Vercel Serverless |
| Database | Firestore + PostgreSQL | Neon PostgreSQL only |
| Receipts | Filesystem (local) | Base64 in PostgreSQL |

## Prerequisites

- [Vercel account](https://vercel.com)
- [Neon account](https://neon.tech)
- Node.js 18+

## 1. Neon Database Setup

1. Create a new project in Neon.
2. Create a database (e.g., `ndu_tuition`).
3. Copy the **connection string** from Neon dashboard.

## 2. Environment Variables

### Vercel Project Settings

Add these environment variables in your Vercel project dashboard (Settings > Environment Variables):

```
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_key
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-your_key
FLUTTERWAVE_WEBHOOK_SECRET=your_webhook_secret
SCHOOL_BANK_ACCOUNT=1234567890
SCHOOL_BANK_CODE=058
FRONTEND_URL=https://your-project.vercel.app
NODE_ENV=production
```

### Local Development

Copy `backend/.env.example` to `backend/.env` and fill in values.
Copy `frontend/.env.example` to `frontend/.env.local` (optional for local dev).

## 3. Database Migrations

Run migrations against your Neon database from your local machine:

```bash
cd backend
npm install
npx knex migrate:latest
```

> Note: Ensure `DATABASE_URL` in `backend/.env` points to Neon before running.

## 4. Deploy to Vercel

### Option A: Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel --prod
```

### Option B: Git Integration

1. Push this repo to GitHub.
2. Import the project in Vercel dashboard.
3. Vercel will auto-detect the `vercel.json` configuration.
4. Add environment variables in the dashboard.
5. Deploy.

## 5. Post-Deployment

### Create Bursar Account

Run the bursar creation script locally (pointed at Neon):

```bash
cd backend
node scripts/createBursar.js
```

Or insert directly via SQL:
```sql
INSERT INTO users (matric_no, email, password, first_name, last_name, user_type, department, session, is_verified, created_at, updated_at)
VALUES ('ADMIN001', 'bursar@ndu.edu.ng', '$2a$12$...hashed_password...', 'NDU', 'Bursar', 'bursar', 'Administration', 'N/A', true, NOW(), NOW());
```

### Configure Flutterwave Webhook

Set your Flutterwave webhook URL to:
```
https://your-project.vercel.app/api/webhooks/flutterwave/callback
```

## 6. Local Development

Start the backend:
```bash
cd backend
npm install
npm run dev
```

Start the frontend (in a new terminal):
```bash
cd frontend
npm install
npm start
```

The frontend proxy (`package.json`) forwards `/api` requests to `http://localhost:5000`.

## File Structure

```
/api/index.js              # Vercel serverless entry (Express wrapper)
/backend/
  app.js                   # Express app definition
  server.js                # Local dev server
  knexfile.js              # DB config (Neon-compatible)
  routes/                  # API routes
  ...
/frontend/
  src/
    contexts/AuthContext.js  # JWT auth (replaced Firebase)
    api/config.js            # API client with JWT header
  ...
vercel.json                # Vercel build & routing config
package.json               # Root dependencies for Vercel
```

## Troubleshooting

- **Cold starts**: First request after inactivity may be slow (Vercel serverless). Neon handles DB connections well.
- **CORS errors**: Ensure `FRONTEND_URL` env var matches your actual Vercel deployment URL.
- **DB connection errors**: Verify `DATABASE_URL` includes `?sslmode=require` for Neon.
- **Missing receipts table column**: The migration `004_create_receipts_table.js` now stores `receipt_data` (JSON) instead of file paths. Run migrations if the schema is old.
