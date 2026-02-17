# Developer Reference
## Mint Vision Optique — Staff Portal

**Last updated:** 2026-02-17

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Prisma singleton — import from here everywhere |
| `src/lib/auth.ts` | `createSession()`, `destroySession()`, `getSession()` |
| `src/lib/dal.ts` | `verifySession()`, `verifyAdmin()` — call at top of every page/action |
| `src/lib/utils/formatters.ts` | `formatCurrency`, `formatDate`, `formatPhone`, `formatRxValue`, `generateOrderNumber` |
| `src/lib/utils/cn.ts` | `cn()` — Tailwind class merging |
| `src/lib/actions/auth.ts` | Login, logout, change password actions |
| `src/lib/actions/customers.ts` | `createCustomer`, `updateCustomer`, `deleteCustomer` |
| `src/lib/actions/orders.ts` | `createOrder`, `advanceOrderStatus`, `updateOrderNotes`, `addPayment`, `verifyOrder` |
| `src/lib/actions/forms.ts` | `createFormSubmission`, `createIntakePackage`, `completeFormSubmission`, `completeIntakeStep`, `autoPopulateFromSubmission`, `applyIntakePackage` |
| `src/lib/actions/inventory.ts` | `createInventoryItem`, `updateInventoryItem`, `deleteInventoryItem` |
| `src/lib/actions/vendors.ts` | `createVendor`, `updateVendor`, `deleteVendor` |
| `src/lib/actions/purchase-orders.ts` | `createPurchaseOrder`, `updatePOStatus`, `receivePOLineItems` |
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
// Pattern
export async function doSomething(
  prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  await verifySession(); // always first

  // ... validate with Zod
  // ... mutate with Prisma
  // ... revalidatePath()

  redirect("/somewhere"); // or return {}
}
```

### Error handling
- Return `{ error: "message" }` for user-facing errors
- Use `{ fieldErrors: Record<string, string[]> }` for Zod field validation errors
- Zod 4: use `.issues` not `.errors` for error arrays

---

## verifySession()

Call at the top of every Server Component page and Server Action.

```typescript
import { verifySession } from "@/lib/dal";

// In a Server Component:
const session = await verifySession();
// session = { id, email, name, role }

// In a Server Action:
await verifySession();
```

Redirects to `/login` if not authenticated.

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

## Form Token Flow

Individual forms: `FormSubmission.token` (UUID) → `/f/[token]`
Intake packages: `FormPackage.token` (UUID) → `/intake/[token]`
In-person: `/intake/[token]?handoff=1` → shows welcome/handoff screen before starting
