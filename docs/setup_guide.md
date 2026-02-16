# Setup Guide
## Mint Vision Optique — Staff Portal

**Last updated:** 2026-02-15

---

## Prerequisites

- **Node.js 22.12+** — Prisma 7 requires this
- **npm** (comes with Node)
- Access to the Supabase project credentials

### Check / fix Node version

The default system Node on this machine is v22.3.0, which is too old for Prisma 7.

```bash
# Use the correct Node version
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

# Verify
node --version  # should be 22.12 or higher
```

Add the export to your shell profile (`~/.zshrc`) to make it permanent.

---

## Initial Setup

```bash
# 1. Navigate to the project
cd /Users/tomerkurman/optics-management/optics_boutique

# 2. Set correct Node version
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.example .env
# Edit .env and fill in your Supabase credentials + SESSION_SECRET
```

### Generate SESSION_SECRET
```bash
openssl rand -base64 32
```

---

## Environment Variables

Edit `.env` with the following values from your Supabase project:

```env
# Supabase — get exact URLs from project dashboard → Connect button
# NOTE: pooler hostname is region-specific (e.g. aws-1-ca-central-1, NOT aws-0)
# Transaction pooler (port 6543) → DATABASE_URL
# Session pooler (port 5432) → DIRECT_URL
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-1-ca-central-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-1-ca-central-1.pooler.supabase.com:5432/postgres"

# Auth (generate with: openssl rand -base64 32)
SESSION_SECRET="your-secret-here"

# Supabase API (Settings > API)
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

---

## Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (creates all tables)
npm run db:push

# Seed the admin account
npm run db:seed
```

Default admin credentials (change immediately after first login):
- **Email:** `admin@mintvisionsoptique.com`
- **Password:** `changeme123`

---

## Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## Data Migration

Once the app is running and connected to the database, import legacy data:

### Step 1 — Export source data as CSV

1. Open the Customer Master Google Sheet
2. File → Download → CSV
3. Save to: `scripts/data/customers.csv`

For inventory:
1. Export inventory data to CSV
2. Save to: `scripts/data/inventory.csv`

### Step 2 — Run migration scripts

```bash
# Migrate customers
npx tsx scripts/migrate-customers.ts

# Migrate inventory
npx tsx scripts/migrate-inventory.ts
```

### Known migration issues

| Issue | Handling |
|-------|---------|
| Phone stored as float (`6476485809.0`) | Script strips `.0` suffix |
| Row 1 column misalignment | Script skips row 1 |
| Duplicate customer names | Script flags for manual review |

---

## npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Start dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:push` | `prisma db push` | Push schema to DB |
| `db:migrate` | `prisma migrate dev` | Run migrations (dev) |
| `db:seed` | `tsx scripts/seed.ts` | Seed admin user |
| `db:studio` | `prisma studio` | Visual DB browser |

---

## Deployment

The app is designed to run on Vercel (or any Node.js host).

### Vercel setup
1. Connect the repo to Vercel
2. Set all environment variables in Vercel project settings
3. Deploy — Vercel auto-detects Next.js

### Important
- Use the **pooled** `DATABASE_URL` for the app (PgBouncer for connection pooling)
- Use the **direct** `DIRECT_URL` for migrations only
- Prisma 7 requires Node 22.12+ — configure in `package.json` engines field or Vercel settings

---

## Known Supabase Connection Issues

### "Tenant or user not found"
The pooler hostname is region-specific. **Copy the exact URL from your Supabase project → Connect button.** Do not guess the region — `aws-1` and `aws-0` are different and project-specific.

### SSL / self-signed certificate error
Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env`. The Prisma adapter also needs `ssl: { rejectUnauthorized: false }` in `src/lib/prisma.ts`.

### `db.[project-ref].supabase.co` not resolving
The direct DB hostname may not resolve from some networks. Use the **session pooler** (port 5432) for `DIRECT_URL` instead.

### `prisma db push` failing
`prisma.config.ts` must use `DIRECT_URL` (session pooler, port 5432), not the transaction pooler. The transaction pooler (port 6543) does not support schema operations.

---

## Troubleshooting

### "Cannot find module '@prisma/client'"
Run `npm run db:generate` to regenerate the Prisma client.

### "PrismaClientInitializationError"
Check that `DATABASE_URL` is set in `.env` and the Supabase project is accessible.

### Node version errors
Make sure you're using Node 22.12+:
```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
node --version
```

### Migration script fails on row 1
Expected — the script skips row 1 due to known column misalignment in the source CSV.
