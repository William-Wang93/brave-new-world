# Brave New World — Deploy Guide

## Overview
This gets your app live on Vercel with Supabase (Postgres) for data persistence and email/password auth. Total time: ~30 minutes.

---

## Step 1: Create Supabase Project (5 min)

1. Go to **https://supabase.com** → Sign up (GitHub login is fastest)
2. Click **New Project**
   - Organization: create one or use default
   - Name: `brave-new-world`
   - Database password: save this somewhere (you won't need it in code, but keep it) 'efcYHAdBI4vrsXo7'
   - Region: pick the closest to you (East US)
   - Click **Create new project** — takes ~2 minutes to provision

3. Once ready, go to **Settings > API** (left sidebar)
   - Copy **Project URL** (looks like `https://xxxxx.supabase.co`)
   - Copy **anon public** key (the long string under "Project API keys")
   - Save both. You'll need them for Vercel.

## Step 2: Create Database Tables (3 min)

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste the entire contents of `supabase-schema.sql` from this project
4. Click **Run** (or Cmd+Enter)
5. You should see "Success. No rows returned" — that's correct, it created the tables

**Verify:** Go to **Table Editor** (left sidebar). You should see three tables: `entries`, `signals`, `milestones`.

## Step 3: Create Your Admin User (2 min)

1. In Supabase dashboard, go to **Authentication > Users**
2. Click **Add User > Create New User**
   - Email: your email
   - Password: pick a strong password
   - Check "Auto Confirm User" (so you don't need email verification)
   - Click **Create User**

This is the only account that can create/edit/delete entries, signals, and milestones. Anyone else can view the site but not edit it.

## Step 4: Push Code to GitHub (5 min)

1. Create a new repo on GitHub:
   - Go to **github.com/new**
   - Name: `brave-new-world`
   - Private or Public (your choice — data is in Supabase either way)
   - Don't initialize with README (you already have files)

2. From your terminal, in the `brave-new-world` folder:
```bash
cd brave-new-world
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/brave-new-world.git
git push -u origin main
```

## Step 5: Deploy on Vercel (5 min)

1. Go to **https://vercel.com/dashboard**
2. Click **Add New > Project**
3. Select your `brave-new-world` repo from GitHub
4. Framework Preset: **Vite** (should auto-detect)
5. **Environment Variables** — add these two:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **Deploy**
7. Wait ~60 seconds. You'll get a URL like `brave-new-world-xxx.vercel.app`

## Step 6: Verify (2 min)

1. Open your Vercel URL — you should see the Brave New World skill tree
2. Click the ✎ button in the header
3. Sign in with the email/password you created in Step 3
4. You should now see the + Entry button on Archive, + Signal on Signal Board, and milestone checkboxes should be toggleable
5. Create a test entry — then check Supabase Table Editor to confirm it shows up in the `entries` table

---

## How Updates Work

**To update the app:**
1. Edit files locally
2. `git add . && git commit -m "description" && git push`
3. Vercel auto-rebuilds and redeploys (~60 seconds)
4. Your data is untouched in Supabase — code and data are completely separate

**To update data:** Just use the app. Everything saves to Supabase in real-time.

**To add a custom domain:** Vercel dashboard > Project > Settings > Domains

---

## File Structure
```
brave-new-world/
├── index.html              # Entry point with font imports
├── package.json            # Dependencies
├── vite.config.js          # Build config
├── supabase-schema.sql     # Database schema (run once)
├── .env.example            # Template for env vars
├── .gitignore              # Excludes node_modules, .env
└── src/
    ├── main.jsx            # React mount
    ├── supabase.js         # Supabase client init
    ├── data.js             # Nodes, branches, categories, signal types
    ├── hooks.js            # useAuth, useEntries, useSignals, useMilestones
    └── App.jsx             # Full app (tree, archive, signals, stats)
```

---

## Troubleshooting

**"Invalid API key" or blank screen:**
Check that your env vars in Vercel match exactly what's in Supabase Settings > API. The URL should NOT have a trailing slash.

**Can't sign in:**
Make sure you checked "Auto Confirm User" when creating the user. If you didn't, go to Authentication > Users, click the user, and confirm them manually.

**Entries not saving:**
Check Supabase Table Editor > entries. If the table is empty, go to SQL Editor and re-run the schema. If you see RLS errors in browser console, make sure the policies were created (the schema SQL includes them).

**Build fails on Vercel:**
Run `npm install && npm run build` locally first to catch errors before pushing.
