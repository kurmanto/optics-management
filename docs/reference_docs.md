# Developer Reference
## Mint Vision Optique — Staff Portal

**Last updated:** 2026-03-03

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Prisma singleton — import from here everywhere |
| `src/lib/auth.ts` | `createSession()`, `destroySession()`, `getSession()` |
| `src/lib/dal.ts` | `verifySession()`, `verifyRole(minRole)`, `verifyAdmin()` — call at top of every page/action |
| `src/lib/audit.ts` | `logAudit(params)` — fire-and-forget audit event writer |
| `src/lib/utils/formatters.ts` | `formatCurrency`, `formatDate`, `formatPhone`, `formatRxValue`, `generateOrderNumber` |
| `src/lib/utils/cn.ts` | `cn()` — Tailwind class merging |
| `src/lib/actions/auth.ts` | Login, logout, change password actions |
| `src/lib/actions/customers.ts` | `createCustomer`, `updateCustomer`, `deleteCustomer` |
| `src/lib/actions/orders.ts` | `createOrder`, `advanceOrderStatus`, `updateOrderNotes`, `addPayment`, `verifyOrder`, `recordCurrentGlassesReading` |
| `src/lib/actions/forms.ts` | `createFormSubmission`, `createIntakePackage`, `completeFormSubmission`, `completeIntakeStep`, `autoPopulateFromSubmission`, `applyIntakePackage`, `lookupReturningPatient`, `createSelfServiceIntakePackage` |
| `src/lib/actions/inventory.ts` | `createInventoryItem`, `updateInventoryItem`, `deleteInventoryItem` |
| `src/lib/actions/vendors.ts` | `createVendor`, `updateVendor`, `deleteVendor` |
| `src/lib/actions/purchase-orders.ts` | `createPurchaseOrder`, `updatePOStatus`, `receivePOLineItems` |
| `src/lib/actions/campaigns.ts` | `createCampaign`, `updateCampaign`, `deleteCampaign`, `activateCampaign`, `pauseCampaign`, `archiveCampaign`, `enrollCustomer`, `removeRecipient`, `triggerCampaignRun` (Admin), `getCampaignAnalytics`, `previewSegment`, `createMessageTemplate`, `updateMessageTemplate`, `deleteMessageTemplate` |
| `src/lib/actions/breach.ts` | `createBreachReport`, `updateBreachStatus`, `generateIPCNotificationText` (all Admin-only) |
| `src/lib/actions/tasks.ts` | `createTask`, `updateTask`, `updateTaskStatus`, `deleteTask`, `addTaskComment`, `getActiveStaff`, `getTaskComments`, `getMyOpenTaskCount` |
| `src/lib/actions/tasks-client.ts` | `searchCustomersForTask` — debounced patient search for task creation |
| `src/lib/client-auth.ts` | Client portal HMAC session: `createClientSession()`, `destroyClientSession()`, `getClientSession()` |
| `src/lib/client-dal.ts` | `verifyClientSession()` — returns `{ clientAccountId, familyId, primaryCustomerId, email }` |
| `src/lib/actions/client-auth.ts` | `requestMagicLink`, `verifyMagicLink`, `clientLogin`, `clientLogout`, `setClientPassword`, `requestPasswordReset` |
| `src/lib/actions/client-portal.ts` | `getFamilyOverview`, `getMemberProfile`, `getExamDetail`, `getUnlockCards`, `getFamilyMembers` |
| `src/lib/actions/client-booking.ts` | `getAvailableSlots`, `bookAppointment`, `cancelAppointment` (client-side, family-scoped) |
| `src/lib/actions/client-portal-admin.ts` | `createClientPortalAccount`, `disableClientPortalAccount`, `sendPortalInviteEmail`, `createUnlockCard`, `updateUnlockCardStatus` |
| `src/lib/validations/client-portal.ts` | Zod schemas for client portal actions |
| `src/lib/campaigns/campaign-engine.ts` | `processCampaign(id)`, `processAllCampaigns()` |
| `src/lib/campaigns/segment-engine.ts` | `executeSegment(config)`, `previewSegmentCount(config)`, `previewSegmentSample(config)` |
| `src/lib/campaigns/dispatch.ts` | `dispatchMessage(opts)` — creates Message record + sends (SMS/email stubs) |
| `src/lib/campaigns/template-engine.ts` | `resolveVariables(customerId)`, `interpolateTemplate(body, vars)` |
| `src/lib/campaigns/opt-out.ts` | `canContact(customer, channel)`, `processOptOut(customerId, source)` |
| `src/lib/campaigns/drip-presets.ts` | `getDripConfig(campaignType)` — returns steps, cooldownDays, enrollmentMode |
| `src/lib/rate-limit.ts` | `checkRateLimit(key, max, windowMs)`, `timingSafeDelay(ms)` — in-memory sliding window rate limiter |
| `src/lib/types/forms.ts` | `ReturningPatientPrefill` — prefill data type for returning patient intake |
| `src/lib/actions/lens-match.ts` | `submitLensQuiz`, `bookLensMatchAppointment`, `requestLensMatchCallback`, `getAvailableSlotsPublic` (public, no auth) |
| `src/lib/utils/lens-packages.ts` | 6 lens package definitions (SV/Progressive x Standard/Premium/Elite), scoring/recommendation logic |
| `src/lib/validations/lens-match.ts` | `LensQuizSubmissionSchema`, `LensMatchBookingSchema`, `LensMatchCallbackSchema` |
| `src/lib/validations/customer.ts` | `CustomerSchema` (Zod) |
| `src/lib/validations/order.ts` | Order validation schemas (Zod) |
| `src/lib/validations/forms.ts` | Form submission schemas (Zod) |
| `src/middleware.ts` | Route guard — redirects unauthenticated users to `/login` |
| `prisma/schema.prisma` | Full database schema |
| `prisma.config.ts` | Prisma 7 datasource config (reads `DATABASE_URL`) |

---

## Server Actions Pattern

All mutations use Server Actions. They always return an error-first result object (never throw).

```typescript
// Pattern (mutating action — staff or above)
export async function doSomething(
  prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const session = await verifyRole("STAFF"); // replaces verifySession() for mutations

  // ... validate with Zod
  // ... mutate with Prisma
  void logAudit({ userId: session.id, action: "CREATE", model: "...", recordId: "..." });
  // ... revalidatePath()

  redirect("/somewhere"); // or return {}
}
```

### Error handling
- Return `{ error: "message" }` for user-facing errors
- Use `{ fieldErrors: Record<string, string[]> }` for Zod field validation errors
- Zod 4: use `.issues` not `.errors` for error arrays

---

## verifySession() / verifyRole()

Call at the top of every Server Component page and Server Action.

```typescript
import { verifySession, verifyRole } from "@/lib/dal";

// In a read-only Server Component:
const session = await verifySession();
// session = { id, email, name, role, ... }

// In a mutating Server Action (staff-level):
const session = await verifyRole("STAFF");
// → redirects to /dashboard?error=insufficient_permissions if VIEWER

// In an admin-only Server Action:
const session = await verifyRole("ADMIN");
// → redirects if STAFF or VIEWER
```

Role hierarchy: `VIEWER (0) < STAFF (1) < ADMIN (2)`

Redirects to `/login` if not authenticated.

---

## logAudit()

Fire-and-forget audit event writer. Never throws — failures are silently swallowed.

```typescript
import { logAudit } from "@/lib/audit";

// After a successful DB write:
void logAudit({
  userId: session.id,          // optional — null for public actions
  action: "CREATE",            // AuditAction union type
  model: "Customer",           // DB model name
  recordId: customer.id,
  changes: { after: created }, // optional before/after diff
});
```

Available `AuditAction` values: `LOGIN | LOGOUT | LOGIN_FAILED | PASSWORD_CHANGE | ACCOUNT_LOCKED | CREATE | UPDATE | DELETE | STATUS_CHANGE | FORM_SUBMITTED | INTAKE_APPLIED | PO_RECEIVED | PO_CANCELLED`

---

## Formatters

```typescript
import { formatCurrency, formatDate, formatPhone, formatRxValue } from "@/lib/utils/formatters";

formatCurrency(149.99)       // "$149.99"
formatDate(new Date())       // "Feb 15, 2026"
formatPhone("6476485809")    // "(647) 648-5809"
formatRxValue(-1.25)         // "-1.25"
formatRxValue(0)             // "Plano"
```

---

## Order Status Flow

```
DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → VERIFIED → READY → PICKED_UP
                                                                   ↘ CANCELLED (any stage)
```

Status timestamps are auto-set when advancing:
- `LAB_ORDERED` → sets `labOrderedAt`
- `LAB_RECEIVED` → sets `labReceivedAt`
- `VERIFIED` → sets `verifiedAt`
- `READY` → sets `readyAt`
- `PICKED_UP` → sets `pickedUpAt`

VERIFIED = optician's Rx verification step. Moving to VERIFIED triggers no external action. Moving to PICKED_UP triggers `PickupCompleteModal`.

---

## Dual Invoice

When `isDualInvoice = true`:
- `totalCustomer` / `depositCustomer` / `balanceCustomer` — shown on customer invoice
- `totalReal` / `depositReal` / `balanceReal` — used in all reports and internal views

When `isDualInvoice = false`:
- Both sets of fields are equal

**Always use `*Real` fields for reporting and revenue calculations.**

---

## Database Conventions

```typescript
// Always use transactions for multi-table writes
await prisma.$transaction([
  prisma.payment.create({ ... }),
  prisma.order.update({ ... }),
]);

// Soft delete — never hard delete customers, Rx, or inventory
await prisma.customer.update({
  where: { id },
  data: { isActive: false },
});

// IDs are cuid() strings, not integers
const customer = await prisma.customer.findUnique({
  where: { id: "clxyz123..." },
});
```

---

## Component Conventions

```typescript
// Server Component (default — no "use client")
export default async function MyPage() {
  const session = await verifySession();
  const data = await prisma.something.findMany();
  return <div>...</div>;
}

// Client Component (only when needed: forms, interactivity)
"use client";
import { useActionState } from "react";
export function MyForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction}>...</form>;
}
```

### Naming
- Component files: `PascalCase.tsx`
- Lib files: `camelCase.ts`
- Server Actions return `{ error: string }` | success state

---

## Styling

```typescript
import { cn } from "@/lib/utils/cn";

// Conditional classes
<div className={cn("base-class", condition && "conditional-class")} />

// Card pattern
<div className="bg-white rounded-xl border border-gray-100 shadow-sm" />

// Primary color (green)
<button className="bg-primary text-primary-foreground" />
```

---

## Phone Number Handling

- **Store:** digits only — `"6476485809"`
- **Display:** via `formatPhone()` — `"(647) 648-5809"`
- **Input:** strip non-digits before saving: `phone.replace(/\D/g, "")`

---

## Order Numbers

Generated by `generateOrderNumber()` in `src/lib/utils/formatters.ts`.
Format: `ORD-YYYY-NNN` (e.g. `ORD-2026-001`).

---

## Enum Reference

### OrderStatus
`DRAFT | CONFIRMED | LAB_ORDERED | LAB_RECEIVED | VERIFIED | READY | PICKED_UP | CANCELLED`

### OrderType
`GLASSES | CONTACTS | SUNGLASSES | ACCESSORIES | EXAM_ONLY`

### LineItemType
`FRAME | LENS | COATING | CONTACT_LENS | EXAM | ACCESSORY | DISCOUNT | OTHER`

### PaymentMethod
`CASH | DEBIT | CREDIT_VISA | CREDIT_MASTERCARD | CREDIT_AMEX | CHEQUE | E_TRANSFER | INSURANCE | OTHER`

### UserRole
`ADMIN | STAFF | VIEWER`

### BreachReportStatus
`OPEN | INVESTIGATING | IPC_NOTIFIED | INDIVIDUALS_NOTIFIED | RESOLVED`

### Gender
`MALE | FEMALE | OTHER | PREFER_NOT_TO_SAY`

### FrameCategory
`OPTICAL | SUN | READING | SAFETY | SPORT`

### FrameGender
`MENS | WOMENS | UNISEX | KIDS`

### RimType
`FULL_RIM | HALF_RIM | RIMLESS`

### AbcCategory
`A | B | C`

### PurchaseOrderStatus
`DRAFT | SENT | CONFIRMED | PARTIAL | RECEIVED | CANCELLED`

### LedgerReason
`PURCHASE_ORDER_RECEIVED | MANUAL_ADJUSTMENT | ORDER_COMMITTED | ORDER_FULFILLED | ORDER_CANCELLED | PHYSICAL_COUNT | DAMAGED | LOST | RETURN_FROM_CUSTOMER`

### FormTemplateType
`NEW_PATIENT | HIPAA_CONSENT | FRAME_REPAIR_WAIVER | INSURANCE_VERIFICATION`

### FormStatus
`PENDING | COMPLETED | EXPIRED`

### PackageStatus
`PENDING | IN_PROGRESS | COMPLETED`

### CoverageType
`VISION | OHIP | EXTENDED_HEALTH | COMBINED`

### CampaignType (21 types)
`WALKIN_FOLLOWUP | EXAM_REMINDER | INSURANCE_RENEWAL | ONE_TIME_BLAST | SECOND_PAIR | PRESCRIPTION_EXPIRY | ABANDONMENT_RECOVERY | POST_PURCHASE_REFERRAL | VIP_INSIDER | BIRTHDAY_ANNIVERSARY | DORMANT_REACTIVATION | INSURANCE_MAXIMIZATION | DAMAGE_REPLACEMENT | COMPETITOR_SWITCHER | NEW_ARRIVAL_VIP | LIFESTYLE_MARKETING | EDUCATIONAL_NURTURE | LENS_EDUCATION | AGING_INVENTORY | STYLE_EVOLUTION | FAMILY_ADDON`

### CampaignStatus
`DRAFT | ACTIVE | PAUSED | ARCHIVED | COMPLETED`

### MessageChannel
`SMS | EMAIL`

### MessageStatus
`PENDING | SENT | DELIVERED | FAILED | OPTED_OUT`

### RecipientStatus
`ACTIVE | COMPLETED | OPTED_OUT | CONVERTED | PAUSED`

### UnlockCardStatus
`LOCKED | UNLOCKED | CLAIMED | EXPIRED`

### AppointmentType
`EYE_EXAM | CONTACT_LENS_FITTING | FRAME_STYLING | FRAME_ADJUSTMENT | FRAME_REPAIR | FOLLOW_UP | CONSULTATION`

---

## Client Portal Auth Pattern

Client portal actions use `verifyClientSession()` instead of `verifySession()`. All data is scoped by `familyId`.

```typescript
// Client portal action pattern
export async function getFamilyOverview() {
  const session = await verifyClientSession();
  // session = { clientAccountId, familyId, primaryCustomerId, email }

  const family = await prisma.family.findUnique({
    where: { id: session.familyId },
    include: { customers: true, ... },
  });
  // All queries MUST include familyId scoping
}
```

Staff-side admin actions for managing client portal accounts use `verifyRole('STAFF')` or `verifyRole('ADMIN')`.

---

## Lens Match Quiz — Public vs Authenticated Slots

Two slot availability actions exist:
- `getAvailableSlotsPublic` (`src/lib/actions/lens-match.ts`) — **no auth required**; used by the public `/lens-match` quiz page for anonymous visitors
- `getAvailableSlots` (`src/lib/actions/client-booking.ts`) — **client auth required**; used by the portal `/my/book` and `/my/lens-match` pages, scoped to family

Both return the same slot structure; the public version omits family-scoped logic.

Lens match components (`src/components/lens-match/`): `LensMatchWizard`, `ResultsPage`, `PackageCard`, `QuizQuestion`, `QuizProgress`, `LeadCaptureForm`, `LensMatchBooking`, `LensMatchCallbackForm`. The wizard is shared between the public route and the portal route.

---

## Purchase Order Flow

```
DRAFT → SENT → CONFIRMED → (PARTIAL) → RECEIVED
                         ↘ CANCELLED (any stage before RECEIVED)
```

- `PARTIAL` is auto-set when some but not all line items are received
- `RECEIVED` is auto-set when all line items are received
- Stock is updated via `InventoryLedger` on each line item receipt (reason: `PURCHASE_ORDER_RECEIVED`)

---

## Campaign Engine Flow

```
Vercel Cron (daily 9am UTC)
  → GET /api/cron/campaigns (Bearer CRON_SECRET)
  → processAllCampaigns()
    → find ACTIVE campaigns
    → processCampaign(id) for each:
        1. executeSegment() — find matching customers
        2. campaignRecipient.createMany() — enroll new customers
        3. For each ACTIVE recipient:
           - canContact() — check opt-out + channel availability
           - delayElapsed() — check drip step delay
           - resolveVariables() + interpolateTemplate() — build message
           - dispatchMessage() — create Message record + send
           - advance drip step or mark COMPLETED
        4. checkConversions() — mark CONVERTED if qualifying order placed
        5. Update CampaignRun stats
        6. createNotification(CAMPAIGN_COMPLETED)
```

### Campaign Status Flow

```
DRAFT → ACTIVE → PAUSED → ACTIVE (re-activate)
                         ↘ ARCHIVED
```

---

## Campaign Segment Fields

| Field | Operators | Description |
|-------|-----------|-------------|
| `age` | `gt`, `lt`, `gte`, `lte`, `between` | Customer age from DOB |
| `lifetimeOrderCount` | `gt`, `lt`, `gte`, `lte` | Total orders placed |
| `daysSinceLastExam` | `gt`, `lt`, `between` | Days since last eye exam |
| `daysSinceLastOrder` | `gt`, `lt`, `between` | Days since last order |
| `hasExam` | `eq` (true/false) | Has any exam on record |
| `rxExpiresInDays` | `between` | Rx expiry within N–M days |
| `insuranceRenewalMonth` | `in` | Insurance renewal month (1–12) |
| `gender` | `eq` | `MALE`, `FEMALE`, `OTHER` |
| `city` | `eq` | City field on customer |
| `isOnboarded` | `eq` | Completed intake package |

Options: `excludeMarketingOptOut`, `requireChannel` (SMS/EMAIL), `excludeRecentlyContacted` (days)

---

## Template Variables

`{{firstName}}`, `{{lastName}}`, `{{fullName}}`, `{{phone}}`, `{{email}}`,
`{{frameBrand}}`, `{{frameModel}}`, `{{orderDate}}`, `{{rxExpiryDate}}`,
`{{insuranceProvider}}`, `{{insuranceRenewalMonth}}`, `{{examDate}}`,
`{{referralCode}}`, `{{storeName}}`, `{{storePhone}}`

---

## Form Token Flow

Individual forms: `FormSubmission.token` (UUID) → `/f/[token]`
Intake packages: `FormPackage.token` (UUID) → `/intake/[token]`
In-person: `/intake/[token]?handoff=1` → shows welcome/handoff screen before starting
