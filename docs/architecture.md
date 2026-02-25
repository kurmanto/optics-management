# Architecture
## Mint Vision Optique — Staff Portal

**Last updated:** 2026-02-23

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
│   │   │   │   ├── page.tsx                    # Orders list
│   │   │   │   ├── board/page.tsx              # Kanban board (7 columns)
│   │   │   │   ├── new/page.tsx                # 7-step order wizard
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx                # Order detail
│   │   │   │       └── work-order/page.tsx     # Printable work order
│   │   │   ├── inventory/
│   │   │   │   ├── page.tsx                    # Inventory browser
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   ├── [id]/edit/page.tsx
│   │   │   │   ├── analytics/page.tsx          # Dead stock, ABC, velocity
│   │   │   │   ├── vendors/                    # Vendor CRUD (4 routes)
│   │   │   │   └── purchase-orders/            # PO lifecycle (3 routes)
│   │   │   ├── forms/
│   │   │   │   ├── page.tsx                    # Forms hub
│   │   │   │   ├── [id]/page.tsx               # Form detail
│   │   │   │   └── review/[packageId]/page.tsx # Intake review + apply
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx                    # Campaign list
│   │   │   │   ├── new/page.tsx                # Campaign creation wizard
│   │   │   │   ├── analytics/page.tsx          # Cross-campaign analytics
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx                # Campaign detail
│   │   │   │       └── edit/page.tsx
│   │   │   ├── admin/
│   │   │   │   ├── audit/page.tsx              # Audit log viewer (Admin only)
│   │   │   │   └── breach/                     # Breach report workflow (Admin only)
│   │   │   │       ├── page.tsx                # Breach list
│   │   │   │       ├── new/page.tsx            # Report a breach
│   │   │   │       └── [id]/page.tsx           # Detail + IPC letter
│   │   │   ├── appointments/
│   │   │   │   └── page.tsx                    # Weekly calendar view
│   │   │   ├── tasks/
│   │   │   │   └── page.tsx                    # Staff task queue (filters, search, detail panel)
│   │   │   └── settings/page.tsx
│   │   ├── (forms)/                            # Public — no auth required
│   │   │   ├── f/[token]/page.tsx              # Individual form fill
│   │   │   ├── f/[token]/success/page.tsx
│   │   │   ├── intake/[token]/page.tsx         # Sequential intake flow
│   │   │   └── intake/start/page.tsx          # Self-service intake entry point
│   │   ├── layout.tsx
│   │   └── page.tsx           # Redirects to /dashboard
│   ├── components/
│   │   ├── auth/              # LoginForm, ChangePasswordForm
│   │   ├── customers/         # CustomerForm, MedicalHistoryForm, ExternalPrescriptionUpload, StoreCreditManager, CurrentGlassesForm
│   │   ├── appointments/      # AppointmentCalendar, AppointmentCard, AppointmentActions, BookAppointmentModal
│   │   ├── forms/             # FormsHub, SendFormModal, IntakePackageModal, InPersonIntakeButton
│   │   │   └── public/        # NewPatientForm, HipaaConsentForm, InsuranceVerificationForm, FrameRepairWaiverForm, SignaturePad, IntakeStartClient
│   │   ├── inventory/         # InventoryForm, VendorForm, PurchaseOrderForm, POStatusButtons, ReceivingWorkflow
│   │   ├── layout/            # Sidebar, Header
│   │   ├── orders/            # KanbanBoard, NewOrderWizard, OrderStatusActions, WorkOrderView, PickupCompleteModal
│   │   └── ui/                # Button (with variants/sizes/loading state)
│   ├── lib/
│   │   ├── actions/           # Server Actions (mutations)
│   │   │   ├── auth.ts
│   │   │   ├── appointments.ts  # createAppointment, getAppointmentsForRange, rescheduleAppointment, updateAppointmentStatus, cancelAppointment
│   │   │   ├── breach.ts        # createBreachReport, updateBreachStatus, generateIPCNotificationText
│   │   │   ├── customers.ts
│   │   │   ├── invoices.ts
│   │   │   ├── orders.ts
│   │   │   ├── forms.ts
│   │   │   ├── inventory.ts
│   │   │   ├── vendors.ts
│   │   │   ├── purchase-orders.ts
│   │   │   └── campaigns.ts
│   │   ├── campaigns/         # Campaign engine
│   │   │   ├── campaign-engine.ts   # processCampaign, processAllCampaigns
│   │   │   ├── segment-engine.ts    # SQL segment builder
│   │   │   ├── drip-presets.ts      # 21 campaign type configs
│   │   │   ├── dispatch.ts          # dispatchMessage (SMS/email stubs)
│   │   │   ├── template-engine.ts   # resolveVariables, interpolateTemplate
│   │   │   ├── opt-out.ts           # canContact, processOptOut
│   │   │   ├── segment-presets.ts   # Segment configs per campaign type
│   │   │   ├── segment-fields.ts    # Segment field definitions
│   │   │   ├── segment-types.ts     # TypeScript types for segments
│   │   │   └── template-variables.ts # Template variable definitions
│   │   ├── validations/       # Zod schemas
│   │   │   ├── customer.ts
│   │   │   ├── order.ts
│   │   │   ├── forms.ts
│   │   │   └── campaign.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts  # formatCurrency, formatDate, formatPhone, formatRxValue
│   │   │   └── cn.ts          # Tailwind class merging
│   │   ├── audit.ts           # logAudit() — fire-and-forget audit writer
│   │   ├── auth.ts            # Session create/verify/destroy
│   │   ├── dal.ts             # verifySession(), verifyRole(), verifyAdmin()
│   │   ├── rate-limit.ts      # In-memory sliding window rate limiter (checkRateLimit, timingSafeDelay)
│   │   └── prisma.ts          # Prisma singleton
│   ├── middleware.ts           # Route guard
│   ├── types/
│   │   ├── appointment.ts     # CalendarAppointment type, label/color maps, calendar constants
│   │   └── forms.ts           # ReturningPatientPrefill type
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
POST /login → createSession() → HMAC token → httpOnly cookies (mvo_session + mvo_last_active)
Every request → middleware.ts → verifySession() → idle timeout check → continue or redirect /login
Every Server Action → verifyRole('STAFF') or verifySession() at top → ensures auth even without middleware
```

### Idle Timeout
A second httpOnly cookie `mvo_last_active` stores a Unix timestamp. Middleware checks it on every authenticated page navigation. If absent or older than 30 minutes, both cookies are deleted and the request redirects to `/login?reason=idle_timeout`.

### Security Headers
`next.config.ts` exports an async `headers()` function applying these headers to all routes (`source: '/(.*)'`):
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## Authentication

- **Cookie name:** `mvo_session` (+ `mvo_last_active` for idle timeout)
- **Algorithm:** HMAC-SHA256 signed token containing `{ id, email, name, role }`
- **Secret:** `SESSION_SECRET` env var (generate with `openssl rand -base64 32`)
- **Expiry:** 7 days (session cookie; idle timeout enforced separately via `mvo_last_active`)
- **Password hashing:** bcrypt, cost factor 12
- **Password policy:** min 12 chars, requires uppercase + lowercase + number + special character
- **Account lockout:** 5 consecutive failures → locked for 15 min (`lockedUntil` field on `User`)

### Key files
- `src/lib/auth.ts` — `createSession()`, `destroySession()`, `getSession()`
- `src/lib/dal.ts` — `verifySession()` (throws/redirects if unauthenticated), `verifyRole(minRole)`, `verifyAdmin()`
- `src/lib/audit.ts` — `logAudit()` — fire-and-forget audit event writer
- `src/middleware.ts` — protects all routes except `/login`; enforces idle timeout

### Role Hierarchy (`verifyRole`)
```typescript
const ROLE_HIERARCHY = { VIEWER: 0, STAFF: 1, ADMIN: 2 } as const;
// All mutating server actions call verifyRole('STAFF')
// Admin-only actions call verifyRole('ADMIN')
// Read-only server components call verifySession()
```

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

| Model | Purpose | Status |
|-------|---------|--------|
| `User` | Staff accounts | ✅ Active |
| `Family` | Groups customers by family unit | ✅ Active |
| `Customer` | Customer profiles | ✅ Active |
| `MedicalHistory` | Eye/systemic conditions, meds, allergies | ✅ Active |
| `StoreCredit` | Customer store credit log | ✅ Active |
| `Prescription` | Eye Rx records (glasses or contacts) | ✅ Active |
| `InsurancePolicy` | Customer insurance coverage | ✅ Active |
| `Vendor` | Supplier/vendor profiles | ✅ Active (Inv V2) |
| `InventoryItem` | Frame/product stock | ✅ Active |
| `PurchaseOrder` | Vendor purchase orders | ✅ Active (Inv V2) |
| `PurchaseOrderLineItem` | Individual line items in a PO | ✅ Active (Inv V2) |
| `InventoryLedger` | Immutable stock movement log | ✅ Active (Inv V2) |
| `Order` | Sales orders | ✅ Active |
| `OrderLineItem` | Line items within an order | ✅ Active |
| `OrderStatusHistory` | Audit trail of status changes | ✅ Active |
| `Payment` | Payments recorded against an order | ✅ Active |
| `Invoice` | Generated PDF invoice records | ✅ Schema only |
| `FormTemplate` | Form template definitions | ✅ Active (V1.2) |
| `FormSubmission` | Patient form responses + signatures | ✅ Active (V1.2) |
| `FormPackage` | 3-form intake bundle grouping | ✅ Active (V1.2) |
| `Exam` | Eye exam records | 🔲 V2 |
| `Walkin` | Walk-in visit log | 🔲 V2 |
| `Campaign` | Marketing campaigns | ✅ Active (V2.1) |
| `CampaignRecipient` | Campaign enrollment + drip state | ✅ Active (V2.1) |
| `CampaignRun` | Per-run execution log | ✅ Active (V2.1) |
| `Message` | SMS/email messages sent | ✅ Active (V2.1) |
| `MessageTemplate` | Reusable message templates | ✅ Active (V2.1) |
| `Referral` | Customer referral tracking | ✅ Active |
| `Appointment` | Scheduled appointments | ✅ Active (V4) |
| `AuditLog` | General audit trail | ✅ Active (V2.5) |
| `BreachReport` | PHIPA breach notification records | ✅ Active (V2.5) |
| `SystemSetting` | Key-value store for app settings | ✅ Schema only |

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
| `ANTHROPIC_API_KEY` | Yes (V1.3+) | Claude AI for external prescription OCR |
| `CRON_SECRET` | Yes (production) | Bearer token for `/api/cron/campaigns` — set in Vercel env |

---

## External Services

| Service | Purpose | SDK/Package |
|---------|---------|-------------|
| Supabase (PostgreSQL) | Primary database + file storage | `pg`, `@supabase/supabase-js` |
| Anthropic Claude API | AI OCR for external prescription photos | `@anthropic-ai/sdk` |
| Twilio | SMS delivery for campaigns | ❌ Not yet integrated — `sendSms()` in `dispatch.ts` is a stub |
| Resend | Email delivery for campaigns | ❌ Not yet integrated — `sendEmail()` in `dispatch.ts` is a stub |

### AI OCR (External Rx Upload)
The `ExternalPrescriptionUpload` component calls Claude's vision API to parse prescription images. The prompt asks Claude to return structured JSON with OD/OS sphere, cylinder, axis, add, PD, expiry date, and prescribing doctor info. The response is validated before pre-filling the prescription form.

Required env var: `ANTHROPIC_API_KEY`

---

## Prisma 7 Gotchas

1. Schema datasource has **no `url` field** — configured in `prisma.config.ts`
2. PrismaClient requires `@prisma/adapter-pg` — not optional
3. `datasourceUrl` is **not** a valid PrismaClient constructor option
4. Zod 4 uses `.issues` not `.errors` for error arrays
5. Node 22.12+ required — use `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`