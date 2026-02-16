# Architecture
## Mint Vision Optique — Staff Portal

**Last updated:** 2026-02-15

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 7 |
| Auth | Custom (bcrypt + HMAC) |
| UI | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| Validation | Zod 4 |
| Node | 22.12+ (Prisma 7 requirement) |

---

## Directory Structure

```
optics_boutique/
├── prisma/
│   └── schema.prisma          # Database schema
├── prisma.config.ts           # Prisma 7 config (datasource URL)
├── scripts/
│   ├── migrate-customers.ts   # Customer import script
│   └── migrate-inventory.ts   # Inventory import script
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login page — no sidebar
│   │   │   └── login/
│   │   ├── (portal)/          # All authenticated pages — has sidebar
│   │   │   ├── layout.tsx     # Portal shell (sidebar + header)
│   │   │   ├── dashboard/
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx         # Customer list
│   │   │   │   ├── new/page.tsx     # Create customer
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx     # Customer detail
│   │   │   │       └── edit/page.tsx
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx         # Orders list
│   │   │   │   ├── board/page.tsx   # Kanban board
│   │   │   │   ├── new/page.tsx     # Order wizard
│   │   │   │   └── [id]/page.tsx    # Order detail
│   │   │   ├── inventory/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx           # Redirects to /dashboard
│   ├── components/
│   │   ├── auth/              # LoginForm, ChangePasswordForm
│   │   ├── customers/         # CustomerForm
│   │   ├── layout/            # Sidebar, Header
│   │   ├── orders/            # KanbanBoard, NewOrderWizard, OrderStatusActions
│   │   ├── shared/            # Reusable UI pieces
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── actions/           # Server Actions (mutations)
│   │   │   ├── auth.ts
│   │   │   ├── customers.ts
│   │   │   └── orders.ts
│   │   ├── validations/       # Zod schemas
│   │   │   ├── customer.ts
│   │   │   └── order.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts  # formatCurrency, formatDate, formatPhone, formatRxValue
│   │   │   └── cn.ts          # Tailwind class merging
│   │   ├── auth.ts            # Session create/verify/destroy
│   │   ├── dal.ts             # verifySession(), verifyAdmin()
│   │   └── prisma.ts          # Prisma singleton
│   ├── middleware.ts           # Route guard
│   └── types/
└── docs/
```

---

## Data Flow

### Reads (Server Components)
Pages are Server Components that call Prisma directly. No API layer for reads.

```
Browser → Next.js Server Component → Prisma → PostgreSQL (Supabase)
```

### Writes (Server Actions)
All mutations go through Server Actions in `src/lib/actions/`.

```
Browser → <form action={serverAction}> → Server Action → Prisma → DB
```

Forms use React 19's `useActionState` with uncontrolled inputs + FormData. No `useState` for form data.

### Auth Flow
```
POST /login → createSession() → HMAC token → httpOnly cookie (mvo_session)
Every request → middleware.ts → verifySession() → continue or redirect /login
Every Server Action → verifySession() at top → ensures auth even without middleware
```

---

## Authentication

- **Cookie name:** `mvo_session`
- **Algorithm:** HMAC-SHA256 signed token containing `{ id, email, name, role }`
- **Secret:** `SESSION_SECRET` env var (generate with `openssl rand -base64 32`)
- **Expiry:** 7 days
- **Password hashing:** bcrypt, cost factor 12

### Key files
- `src/lib/auth.ts` — `createSession()`, `destroySession()`, `getSession()`
- `src/lib/dal.ts` — `verifySession()` (throws/redirects if unauthenticated), `verifyAdmin()`
- `src/middleware.ts` — protects all routes except `/login`

---

## Database

### Connection
Prisma 7 requires explicit adapter configuration. The datasource in `schema.prisma` has **no `url` field** — connection is configured in `prisma.config.ts`:

```typescript
// prisma.config.ts
import { defineConfig } from 'prisma/config'
export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
})
```

The Prisma singleton in `src/lib/prisma.ts` uses `@prisma/adapter-pg`.

### Key conventions
- IDs: `cuid()` (not auto-increment integers)
- Soft delete: `isActive = false` — never hard-delete customers, prescriptions, inventory
- Timestamps: `createdAt` (default now), `updatedAt` (auto-managed by Prisma)
- Multi-table writes: always use `prisma.$transaction()`
- Indices: on all foreign keys and common query fields

### Models summary

| Model | Purpose |
|-------|---------|
| `User` | Staff accounts |
| `Family` | Groups customers by family unit |
| `Customer` | Customer profiles |
| `Prescription` | Eye Rx records (glasses or contacts) |
| `InventoryItem` | Frame/product stock |
| `Order` | Sales orders |
| `OrderLineItem` | Line items within an order |
| `OrderStatusHistory` | Audit trail of status changes |
| `Payment` | Payments recorded against an order |
| `Invoice` | Generated PDF invoice records |
| `InsurancePolicy` | Customer insurance coverage |
| `Exam` | Eye exam records (V2) |
| `Walkin` | Walk-in visit log (V2) |
| `Campaign` | Marketing campaigns (V2.1) |
| `CampaignRecipient` | Campaign enrollment |
| `Message` | SMS/email messages sent |
| `Referral` | Customer referral tracking (V3) |
| `Appointment` | Scheduled appointments (V4) |
| `AuditLog` | General audit trail |
| `SystemSetting` | Key-value store for app settings |

---

## Styling Conventions

- Tailwind utility classes only — no CSS modules
- `cn()` from `src/lib/utils/cn.ts` for conditional classes
- Primary brand color: `primary` (green, defined in CSS variables)
- Card pattern: `bg-white rounded-xl border border-gray-100 shadow-sm`
- Server Components by default; `"use client"` only for interactive components

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Pooled Supabase connection (via PgBouncer) |
| `DIRECT_URL` | Yes | Direct connection for migrations |
| `SESSION_SECRET` | Yes | HMAC signing key for session tokens |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role (for admin operations) |

---

## Prisma 7 Gotchas

1. Schema datasource has **no `url` field** — configured in `prisma.config.ts`
2. PrismaClient requires `@prisma/adapter-pg` — not optional
3. `datasourceUrl` is **not** a valid PrismaClient constructor option
4. Zod 4 uses `.issues` not `.errors` for error arrays
5. Node 22.12+ required — use `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`