# Hermes The Quizzer — Deployment Guide

## Overview

| Component | Platform | Project Name |
|-----------|----------|--------------|
| Frontend | Vercel | `hermes-quizzer` |
| Backend | Vercel | `hermes-quizzer-server` |
| Database | Neon (Free Tier) | `neondb` |

---

## Step 1: Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and sign in
2. Your database is already created. Copy the **connection string** from the Neon dashboard
3. Open the **SQL Editor** in Neon and run the schema:
   - Copy the contents of `sql/schema.sql` and execute it
   - This creates all 7 required tables

---

## Step 2: Seed the Admin Account

Option A — **Run the seed script locally:**
```bash
cd server
npm install
node seed.js
```
This requires your `.env` file to have the correct `DATABASE_URL`.

Option B — **Use the Neon SQL Editor:**
Run this SQL (the seed.js script generates the proper bcrypt hash, but you can also register as `bchbenjamin` through the app after deployment):
```sql
-- After deployment, register with username "bchbenjamin" and password "Benjamin1312!"
-- Then run this to promote to admin:
UPDATE users SET role = 'admin' WHERE username = 'bchbenjamin';
```

---

## Step 3: Deploy Backend to Vercel

### 3a. Push to GitHub

Your repo structure should look like:
```
hermes/
├── client/
├── server/
├── sql/
├── examples/
└── ...
```

Make sure `.env` files are in `.gitignore` (they already are).

### 3b. Create Backend Vercel Project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo: `BenjaminChristopherHermesB/hermes`
3. Set **Project Name**: `hermes-quizzer-server`
4. Set **Root Directory**: `server`
5. Set **Framework Preset**: `Other`
6. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_SnBJMZ8iWGq4@ep-cold-hall-a1cfj5jz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | `hErM3s_Qu1zZ3r_$ecr3t_K3y_2026!xYz@bCh` |
| `JWT_REFRESH_SECRET` | `hErM3s_R3fr3sh_$ecr3t_K3y_2026!aBc@xYz` |
| `FRONTEND_URL` | `https://hermes-quizzer.vercel.app` |
| `NODE_ENV` | `production` |

7. Click **Deploy**

### 3c. Verify Backend

Visit `https://hermes-quizzer-server.vercel.app/` — should return:
```json
{"status":"Hermes The Quizzer API is running","version":"1.0.0"}
```

---

## Step 4: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the same GitHub repo
3. Set **Project Name**: `hermes-quizzer`
4. Set **Root Directory**: `client`
5. Set **Framework Preset**: `Vite`
6. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://hermes-quizzer-server.vercel.app` |

7. Click **Deploy**

### 4a. Verify Frontend

Visit `https://hermes-quizzer.vercel.app` — should show the login page.

---

## Step 5: First-Time Setup

1. Visit the frontend URL
2. Click "Create Account" and register with:
   - **Username**: `bchbenjamin`
   - **Password**: `Benjamin1312!`
   - **Name**: `Benjamin`
3. After registering, promote to admin via Neon SQL Editor:
   ```sql
   UPDATE users SET role = 'admin' WHERE username = 'bchbenjamin';
   ```
4. Log out and log back in — you should see the **Admin** button in the header
5. Go to Admin → Upload → Upload the example JSON from `examples/data_structures.json`

---

## Local Development

### Backend
```bash
cd server
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets
npm install
node api/index.js
# Backend runs on http://localhost:3001
```

### Frontend
```bash
cd client
npm install
npm run dev
# Frontend runs on http://localhost:5173 (auto-proxies /api to backend)
```

---

## Environment Variables Summary

### Backend (`server/.env`)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_URL=https://hermes-quizzer.vercel.app
PORT=3001
NODE_ENV=production
```

### Frontend (`client/.env`)
```
VITE_API_URL=https://hermes-quizzer-server.vercel.app
```

> ⚠️ **Never commit `.env` files to Git.** They are excluded by `.gitignore`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS errors | Check `FRONTEND_URL` env var on backend matches your frontend domain exactly |
| 401 errors | Check JWT secrets match between env vars, try logging out and back in |
| DB connection fails | Check `DATABASE_URL` and ensure Neon project is active |
| Frontend 404 on refresh | `vercel.json` rewrites handle SPA routing — ensure it's in the `client/` directory |
