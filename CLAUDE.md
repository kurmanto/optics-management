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
DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → READY → PICKED_UP
                                                        ↘ CANCELLED (any stage)
```

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
Current version: **V1.0**

| Feature | Status |
|---------|--------|
| Auth | ✅ Complete |
| Layout | ✅ Complete |
| Customers CRUD | ✅ Complete |
| Orders + Kanban | ✅ Complete |
| Inventory browser | ✅ Complete |
| Dashboard | ✅ Complete |
| Migration scripts | ✅ Scaffolded |
| Digital Forms (V1) | ✅ Complete |
| PDF invoices | 🔲 Pending |
| Staff management | 🔲 V1.1 |
| Reporting | 🔲 V1.1 |
| Walk-ins / Exams | 🔲 V2 |
| SMS / Email | 🔲 V2.1 |

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
