# Mint Vision Optique - Staff Portal

## Project Overview
A staff portal for Mint Vision Optique (optometry boutique) replacing paper order cards, Google Sheets, and a legacy PMS.

**Stack:** Next.js 15 (App Router) + PostgreSQL (Supabase) + Prisma 7 ORM + TailwindCSS + shadcn/ui
**Node version required:** 22.12+ (Prisma 7 requirement)
**Prisma 7 notes:**
- Schema has no `url` in datasource — configured in `prisma.config.ts`
- PrismaClient uses `@prisma/adapter-pg` (required by Prisma 7 for non-Accelerate connections)
- Connection string passed to adapter: `process.env.DATABASE_URL`

## Architecture

### Route Groups
- `(auth)` — Login page, no sidebar
- `(portal)` — All authenticated pages, has sidebar layout

### Data Layer Pattern
- **Server Components** fetch data directly via Prisma (no API layer)
- **Server Actions** in `src/lib/actions/` handle mutations
- **DAL** (`src/lib/dal.ts`) — always call `verifySession()` at the top of Server Components and Actions
- **No API routes** for CRUD — use Server Actions

### Auth
- Custom session: bcrypt + HMAC-signed token in httpOnly cookie `mvo_session`
- Session max age: 7 days
- Middleware (`src/middleware.ts`) guards all non-public routes
- Admin seed account: `admin@mintvisionsoptique.com` / `changeme123` (must change on first login)

### Key Files
```
src/lib/prisma.ts          # Prisma singleton
src/lib/auth.ts            # Session creation/verification/destruction
src/lib/dal.ts             # verifySession() + verifyAdmin()
src/lib/utils/formatters.ts # formatCurrency, formatDate, formatPhone, formatRxValue
src/lib/utils/cn.ts        # Tailwind class merging utility
src/lib/actions/           # Server Actions per entity
src/lib/validations/       # Zod schemas
```

## Business Rules

### Dual Invoice
- `isDualInvoice = true` → two PDFs generated (customer-facing amounts vs internal real amounts)
- Reports always use `totalReal` / `balanceReal`
- `isDualInvoice = false` → `*Real` = `*Customer`

### Order Status Flow
```
DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → VERIFIED → READY → PICKED_UP
                                                                    ↘ CANCELLED (any stage)
```
VERIFIED = Rx check by optician after lab receives order. PICKED_UP triggers PickupCompleteModal (review request, referral campaign, low-value flag).

### Prescription
- One Rx can serve multiple orders (backup pairs)
- `isActive = false` for superseded prescriptions, don't delete

### Legacy IDs
- Format: `6476485809-A` (phone + suffix)
- Stored in `legacyCustomerId` for migration mapping
- Never reuse for new customers

### Phone Storage
- Store digits only, no formatting: `"6476485809"`
- Display formatted via `formatPhone()` helper

## Conventions

### Components
- Server Components by default, `"use client"` only when needed (forms, interactive UI)
- Form components use `useActionState` from React 19
- No separate `useState` for form data — use uncontrolled inputs + FormData

### Naming
- Files: PascalCase for components (`CustomerForm.tsx`), camelCase for lib (`formatters.ts`)
- Server Actions return `{ error: string }` | success state — never throw
- Zod schemas in `src/lib/validations/`, named `<Entity>Schema`

### Styling
- Tailwind utility classes only, no CSS modules
- `cn()` from `src/lib/utils/cn.ts` for conditional classes
- Primary brand color: `primary` (green, CSS variable `--primary`)
- Card pattern: `bg-white rounded-xl border border-gray-100 shadow-sm`

### Database
- Always use `prisma.$transaction()` for multi-table writes
- Soft delete: `isActive = false` (never hard-delete customers, prescriptions, inventory)
- `legacyCustomerId` is nullable — not all migrated records have it

## Version Status
Current version: **V1.5.1 — Orders Navigation Fix** (2026-02-18)

| Feature | Status |
|---------|--------|
| Auth | ✅ Complete |
| Layout | ✅ Complete |
| Customers CRUD + Medical History + Store Credit | ✅ Complete |
| Orders + Kanban (7-step wizard, VERIFIED status, lens config, work order, AI OCR Rx, PickupCompleteModal) | ✅ Complete |
| Inventory browser | ✅ Complete |
| Vendors CRUD | ✅ Complete |
| Purchase Orders (full lifecycle + receiving workflow) | ✅ Complete |
| Inventory Ledger | ✅ Complete |
| Inventory Analytics (ABC / dead stock / velocity) | ✅ Complete |
| Dashboard | ✅ Complete |
| Migration scripts | ✅ Scaffolded |
| Digital Forms (V1.2: 4 templates, intake packages, kiosk, AI review) | ✅ Complete |
| Invoices (print, email, issue tracking, central list) | ✅ Complete |
| Work order redesign (centered layout, email/phone boxes, spec grids) | ✅ Complete |
| Notification system (bell, polling, 7 types, per-user prefs) | ✅ Complete |
| Staff management | 🔲 V1.1 |
| Reporting | 🔲 V1.1 |
| Walk-ins / Exams | 🔲 V2 |
| SMS / Email | 🔲 V2.1 |

## User Guide
- Source: `user-guide-site/index.html` — single self-contained HTML file, no dependencies
- **Also served from the app:** `public/user-guide.html` — Next.js serves this at `/user-guide.html` on the main domain. This file must always be identical to `user-guide-site/index.html`.
- Deployed to Vercel standalone: `https://mvo-staff-guide.vercel.app` — redeploy with `cd user-guide-site && vercel --prod`
- **Maintenance rule:** After every feature addition or bug fix:
  1. Edit `user-guide-site/index.html`
  2. Copy it to `public/user-guide.html` (`cp user-guide-site/index.html public/user-guide.html`)
  3. Commit both files together
  4. Redeploy to Vercel standalone (`cd user-guide-site && vercel --prod`)
  This is a hard requirement, same as updating `docs/`.

## Documentation Requirements
After every `/ship`, update ALL documentation files in `docs/` to reflect the current state:
- `docs/CHANGELOG.md` — add entry for what was shipped
- `docs/project_status.md` — update feature status table and known issues
- `docs/setup_guide.md` — update if any setup steps changed
- `docs/architecture.md` — update if any architecture changed
- `docs/PRD.md` — update if any requirements changed
- `docs/reference_docs.md` — update if any patterns/conventions changed
- `README.md` — update if setup or overview changed

This is a hard requirement, not optional.

## Unit Tests — Required for Every Feature
After implementing any new feature or server action, write unit tests immediately. Do not defer.

**Test location:** `src/__tests__/actions/<entity>.test.ts` for server actions, `src/__tests__/lib/` for lib utilities.

**Test runner:** `npm run test:run` (Vitest 4, no watch mode)

**Patterns (follow exactly):**
- Import mocks from `../mocks/session` and `../mocks/prisma`
- `beforeEach`: `vi.clearAllMocks()` + `vi.mocked(verifySession).mockResolvedValue(mockSession)`
- Dynamic imports inside each test/describe (not top-level) — required because `vi.mock` hoists
- Supabase (`@/lib/supabase`) is mocked globally in `setup.ts` — mock individual functions with `vi.mocked(...).mockResolvedValue(...)`
- Server actions that call `redirect()` after success will throw — wrap in `try/catch` and assert on side effects
- Return type is `{ error: string }` on failure, or a success payload — always test both branches

**What to test per action:**
1. Auth guard: verifySession is called (implicit — mock is wired in setup)
2. Happy path: correct Prisma method called with right args, success value returned
3. Error path: Prisma throws → returns `{ error: "..." }`
4. Input validation: empty/invalid args → returns `{ error: "..." }` without hitting DB

## User Guide — Required for Every Feature
After implementing any new feature, update `user-guide-site/index.html` immediately. Do not defer.

- Add a TOC entry (sub-link under the relevant section)
- Add a subsection with: what it does, how to use it step by step, any tips or warnings
- Match the existing HTML style (use `<h2>`, `<h3>`, `<h4>`, `<ul>`, `<div class="box box-tip">`, etc.)
- Redeploy after editing: `cd user-guide-site && vercel --prod`

## Running Locally

```bash
# Requires Node 22.12+
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

# Install
npm install

# Generate Prisma client
npm run db:generate

# Push schema to Supabase
npm run db:push

# Seed admin user
npm run db:seed

# Start dev server
npm run dev
```

## Environment Variables
See `.env.example`. Copy to `.env` and fill in Supabase credentials.

Required for V1:
- `DATABASE_URL` (pooled connection via PgBouncer)
- `DIRECT_URL` (direct connection for migrations)
- `SESSION_SECRET` (generate: `openssl rand -base64 32`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (required for AI Rx OCR — `ExternalPrescriptionUpload` component)
