# Changelog
## Mint Vision Optique — Staff Portal

All notable changes to this project are documented here.
Format: `[Version] — Date`

---

## [1.0.0] — 2026-02-15

### Added
- **Authentication** — email + password login with HMAC-signed httpOnly session cookie (`mvo_session`), 7-day expiry, role-based access (Admin/Staff/Viewer)
- **Portal layout** — responsive sidebar navigation with header, route groups for auth vs portal
- **Customer management** — create, view, edit, soft-delete; fields include name, phone, email, DOB, gender, address, tags, family grouping, SMS/email opt-in
- **Order wizard** — multi-step order creation (customer → Rx → frame/lens → pricing → review); supports Glasses, Contacts, Sunglasses, Accessories, Exam Only
- **Order line items** — Frame, Lens, Coating, Contact Lens, Exam, Accessory, Discount, Other types with dual pricing (customer vs real)
- **Dual invoice** — separate `totalCustomer`/`totalReal` fields throughout order and line item models
- **Order status flow** — `DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → READY → PICKED_UP` with timestamping at each transition
- **Order detail page** — status history, notes, lab notes, due date, payments
- **Kanban board** — visual order tracking across active statuses
- **Payment recording** — Cash, Debit, Visa, MC, Amex, Cheque, e-Transfer, Insurance
- **Inventory browser** — browse frames by brand/category/gender with stock levels
- **Dashboard** — KPI cards (total customers, today's revenue, ready for pickup, in progress) + recent orders
- **Migration scripts** — scaffolded `migrate-customers.ts` and `migrate-inventory.ts`
- **Prisma schema** — full schema including V2–V4 models (Exam, Walkin, Campaign, Message, Referral, Appointment)

---

## [1.0.1] — 2026-02-15

### Added
- All documentation: PRD, architecture, setup guide, reference docs, project status, changelog, README

### Fixed
- Supabase connection: use `aws-1-ca-central-1.pooler.supabase.com` (not `aws-0`) for this project
- SSL: set `NODE_TLS_REJECT_UNAUTHORIZED=0` and `ssl: { rejectUnauthorized: false }` in Prisma adapter
- `prisma.config.ts` datasource uses `DIRECT_URL` (session pooler, port 5432) for schema operations
- Schema deployed to Supabase via SQL editor; admin user seeded manually

### Infrastructure
- GitHub repo created: `kurmanto/optics-management`
- Initial commit pushed to `master`

---

## [1.0.3] — 2026-02-15

### Added
- **Inter font** — loaded via `next/font/google`, applied as `--font-sans` CSS variable on body
- **Button component** (`src/components/ui/Button.tsx`) — reusable component with variants (`primary`, `secondary`, `destructive`, `ghost`, `outline`), sizes (`sm`, `md`, `lg`), `loading` spinner state, and `buttonVariants()` helper for Link-based buttons in server components

### Changed
- **globals.css** — sharper foreground color (224 15% 12%), cleaner borders (214 20% 90%), border-radius to `0.625rem`, improved muted/secondary tones
- **All CTA buttons** across `LoginForm`, `OrderStatusActions`, `CustomerForm`, `ChangePasswordForm`, `NewOrderWizard`, and all portal pages now use consistent `shadow-sm`, `active:scale-[0.98]`, and `transition-all duration-150` classes for a polished press effect

---

## [1.0.2] — 2026-02-15

### Added
- `scripts/seed-test-data.ts` — comprehensive test data for all V1 entities
  - 2 staff users, 3 families, 10 customers, 6 prescriptions, 10 inventory items, 3 insurance policies, 10 orders

---

---

## [1.2.0] — 2026-02-16

### Added — Digital Forms System

#### Core Infrastructure
- `form_templates` + `form_submissions` tables with SQL migration (`prisma/migrations/forms_migration.sql`)
- `form_packages` table + `PackageStatus` enum for multi-form intake bundles (`prisma/migrations/intake_migration.sql`)
- `isOnboarded` boolean on `Customer` model — tracks whether a patient has completed intake
- `appliedAt` timestamp on `FormPackage` — tracks when staff reviewed and applied intake data to PMS
- New Prisma models: `FormTemplate`, `FormSubmission`, `FormPackage` with full relations
- Middleware: `/f/` and `/intake/` added to `PUBLIC_PATHS` (no auth required for patients)
- Server actions in `src/lib/actions/forms.ts`: `createFormSubmission`, `createIntakePackage`, `completeFormSubmission`, `completeIntakeStep`, `autoPopulateFromSubmission`, `applyIntakePackage`

#### Public Patient Forms (no login required)
- `/f/[token]` — individual form fill route
- `/intake/[token]` — sequential multi-form intake flow with step progress bar
- `/intake/[token]?handoff=1` — in-person handoff welcome screen (shown when staff opens form on device for patient)
- 4 form templates: New Patient Registration, Privacy & Consent (PIPEDA/HIPAA), Insurance Verification, Frame Repair Waiver
- Canvas-based digital signature pad on forms that require signing (New Patient, HIPAA Consent, Frame Repair Waiver)
- Auto-creates Customer record from NEW_PATIENT form data; links all package submissions to customer

#### Staff Portal — Forms Hub (`/forms`)
- Forms Hub page with: intake CTA, intake packages section, individual form templates, outstanding forms queue, completed forms browser
- **Send Intake Package** modal — create a 3-form bundle (Registration + Privacy + Insurance) and share via link or email
- **In-Person Intake** button — creates package and opens `/intake/[token]?handoff=1` on the current device for walk-in patients
- **Intake Packages** section — shows each package's per-step completion status with Copy Link + Email buttons
- **Needs Review** queue — completed-but-not-applied intake packages surfaced with amber indicator and Review link
- **Completed Forms** browser — searchable (by name) + filterable (by form type), shows Signed badge for forms with signatures
- Individual form send modal (`SendFormModal`) — send any single form to an existing or new patient

#### Staff Portal — Intake Review (`/forms/review/[packageId]`)
- Unified review page showing all 3 intake forms' submitted data in ordered, labelled field layout
- Renders drawn canvas signatures as `<img>` (with fallback to italic text for legacy text signatures)
- Status indicators: "Needs Review" (amber), "Applied" (green with date)
- **Apply All to Patient Record** button — runs `applyIntakePackage` server action to import Registration, PIPEDA preferences, and Insurance data in one transaction; sets `isOnboarded = true`
- Linked patient record navigation

#### Customer Detail Page
- `isOnboarded` / `Not onboarded` badge next to patient name
- **Forms & Documents** section — lists all form submissions for the customer with type, date, Signed badge, status badge, and View link

---

## [1.3.0] — 2026-02-17

### Added — Orders Upgrade

#### VERIFIED Status
- Added `VERIFIED` as a mandatory step between `LAB_RECEIVED` and `READY`
- Status flow is now: `DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → VERIFIED → READY → PICKED_UP`
- `verifiedAt` timestamp set on verification
- New **VERIFIED** Kanban column added to board view

#### 7-Step Order Wizard
- Expanded from 5 to 7 steps: Customer → Prescription → Frame → Lens Type → Lens Config → Review → Payment
- Step 4 (Lens Type): select lens material, index, design (single vision, bifocal, progressive)
- Step 5 (Lens Config): coatings (AR, blue light, photochromic), tints, UV, prism notes

#### Work Order View
- `/orders/[id]/work-order` — printable work order page
- Displays: patient name, Rx values (OD/OS), frame details, lens specs, coatings, lab notes
- Designed for handing off to optical lab

#### External Prescription Upload (AI OCR)
- `ExternalPrescriptionUpload` component in `src/components/customers/`
- Upload a photo/scan of a paper Rx from an external doctor
- AI (Claude via `@anthropic-ai/sdk`) extracts: OD/OS sphere, cylinder, axis, add, PD, expiry, doctor name/clinic
- Parsed values pre-fill the prescription form — staff review and confirm before saving

#### Pickup Complete Modal
- `PickupCompleteModal` triggered automatically when order is moved to `PICKED_UP`
- Prompts staff to: flag if low-value order (< threshold), capture referral source, note if patient asked about next exam
- Post-pickup workflow embeds best-practice retention prompts into the status transition

---

## [2.0.0] — 2026-02-17

### Added — Inventory V2

#### Vendors
- New `Vendor` model with full contact info: name, email, phone, address, website
- Fields: `repName`, `repEmail`, `repPhone`, `paymentTerms` (Net 30 / Net 60 / COD / Prepaid), `leadTimeDays`
- Full CRUD: list, create, edit, view, soft-delete
- Routes: `/inventory/vendors`, `/inventory/vendors/new`, `/inventory/vendors/[id]`, `/inventory/vendors/[id]/edit`

#### Purchase Orders
- New `PurchaseOrder` and `PurchaseOrderLineItem` models
- Full lifecycle: `DRAFT → SENT → CONFIRMED → PARTIAL → RECEIVED → CANCELLED`
- Create PO with multiple line items (frame, qty, unit cost)
- **Receiving workflow**: mark individual line items received with actual quantities — partial receipt handled automatically
- Status auto-advances: all items received → `RECEIVED`, some received → `PARTIAL`
- Routes: `/inventory/purchase-orders`, `/inventory/purchase-orders/new`, `/inventory/purchase-orders/[id]`

#### Inventory Ledger
- New `InventoryLedger` model — immutable transaction log for every stock movement
- Reasons tracked: `PURCHASE_ORDER_RECEIVED`, `MANUAL_ADJUSTMENT`, `ORDER_COMMITTED`, `ORDER_FULFILLED`, `ORDER_CANCELLED`, `PHYSICAL_COUNT`, `DAMAGED`, `LOST`, `RETURN_FROM_CUSTOMER`
- Quantity delta (`+` or `−`) recorded per transaction with reference to source (PO, Order)

#### Inventory Item Enhancements
- New fields added to `InventoryItem`: `upc`, `colorCode`, `styleTags` (array), `vendorId` (FK to Vendor)
- Stock tracking split into: `stockQty`, `committedQty` (reserved for open orders), `onOrderQty` (on active POs)
- Costing fields: `wholesaleCost`, `landedCost` (wholesale + freight + duty)
- ABC classification: `abcCategory` (A/B/C) — manually set or derived from analytics

#### Inventory Analytics
- New `/inventory/analytics` page with 4 analysis panels:
  - **Dead Stock** — items with no sales movement in 90+ days; sorted by cost exposure
  - **Best Sellers** — top items by units sold in trailing 90 days
  - **Worst Sellers** — items with lowest velocity
  - **ABC Analysis** — A (top 80% of revenue), B (next 15%), C (bottom 5%); category breakdown table

#### Redesigned Filter UI
- Inventory browser filter panel redesigned: collapsible sidebar with brand, category, gender, vendor, price range, stock level, ABC category filters
- Active filter chips show applied filters with one-click clear

---

## [1.5.0] — 2026-02-17

### Added — Notification System

#### Database
- New `Notification` model — global record per event (1 row shared across all staff, not per-user copy)
- New `NotificationRead` join table — per-user read tracking with unique constraint `(notificationId, userId)`
- New `NotificationPreference` table — per-user per-type on/off toggle
- `NotificationType` enum: `FORM_COMPLETED`, `INTAKE_COMPLETED`, `ORDER_READY`, `ORDER_CANCELLED`, `ORDER_LAB_RECEIVED`, `PO_RECEIVED`, `LOW_STOCK`
- SQL migration: `prisma/migrations/notifications_migration.sql`

#### Event Injection
- `orders.ts → advanceOrderStatus` — creates ORDER_READY, ORDER_CANCELLED, ORDER_LAB_RECEIVED notifications with actorId
- `forms.ts → completeFormSubmission` — creates FORM_COMPLETED notification (actorId null — public action)
- `forms.ts → completeIntakeStep` — creates INTAKE_COMPLETED notification when all 3 forms done
- `purchase-orders.ts → receivePOItems` — creates PO_RECEIVED + per-line LOW_STOCK notifications after transaction commits
- All notifications created after the primary write; errors swallowed so they never block the action

#### UI
- `NotificationBell` (client) — 30-second polling via `useEffect + setInterval`; Radix Popover dropdown; red badge with 9+ cap; unread blue dot per item; type icons (FileText/ShoppingBag/Package/AlertTriangle); click to mark read + navigate; "Mark all read" button; visible error state
- `NotificationBar` (server wrapper) — `h-14` header bar added to `(portal)/layout.tsx`
- `Header.tsx` — simplified to title-only div; static non-functional bell removed
- `NotificationPreferencesForm` (client) — Radix Switch toggles for all 7 types with optimistic revert on error
- Settings page — new "Notification Preferences" card

#### Architecture Notes
- Actor exclusion uses `OR: [{ actorId: null }, { actorId: { not: userId } }]` — null-safe so public form notifications always show for all staff
- No WebSockets/SSE — simple polling is sufficient for a 2–5 person team
- Notification failure never crashes the primary action (`createNotification` swallows all errors)

---

## [1.5.1] — 2026-02-18

### Fixed — Orders Navigation & CI

#### Orders Navigation
- `/orders` no longer auto-redirects to `/orders/board` — the list view is now always reachable via the **All Orders** sidebar link and the **List View** toggle button
- Sidebar Orders group: **Fulfillment Board** is now the primary link (`/orders/board`); **All Orders** is the secondary link (`/orders`)
- `isGroupActive` checks children routes before the parent so the Orders group highlights correctly when on `/orders` or `/invoices`

#### CI / Infrastructure
- Added `"overrides"` in `package.json` to pin `magicast@^0.5.1` and `picomatch@^4.0.3`, resolving `npm ci` failures caused by `c12`'s optional peer dep (`magicast@^0.3.5`) and `fdir`'s `picomatch@^3||^4` requirement conflicting with the hoisted versions
- Added GitHub Actions CI workflow (`npm ci` → `prisma generate` → `tsc` → `vitest run`) triggered on push/PR to `master`

---

## Upcoming

### [1.1.0] — Planned
- Staff management UI (Admin only)
- Reporting page (revenue, orders by status)
- Data migration (run customer + inventory import)
