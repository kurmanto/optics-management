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

## [1.6.0] — 2026-02-18

### Added — Scan Rx + Prescription Image Storage

#### Scan Rx Page (`/scan-rx`)
- New standalone page accessible from **Customers → Scan Rx** in the sidebar
- Two-step flow: (1) find existing patient via debounced search, or quick-create a new patient with name/phone/email; (2) scan Rx with camera/upload + AI OCR
- Done state with "Scan another" and "View patient" actions

#### Prescription Image Storage
- `prescription-scans` Supabase Storage bucket — original scan images stored permanently at `{customerId}/{timestamp}.{ext}`
- `uploadPrescriptionScan` in `supabase.ts` handles base64 → Buffer → Storage upload
- `uploadPrescriptionScanAction` server action wraps the upload for client-side use
- `ExternalPrescriptionUpload` now uploads the scan image before saving the prescription record, passing the public URL to `addExternalPrescription` → `externalImageUrl` field
- "View scan" link shown immediately after save and on customer detail page next to each external Rx row

#### New Server Actions
- `searchCustomers(query)` — multi-field OR search (name, phone, email), returns up to 10 results
- `quickCreateCustomer(input)` — minimal-field customer creation for walk-up patients, digits-only phone normalisation

#### Sidebar
- Customers converted from single link to sub-nav group: **All Customers** (`/customers`) and **Scan Rx** (`/scan-rx`, ScanLine icon)

#### Developer Standards
- `CLAUDE.md`: added mandatory rules — unit tests and user guide update required for every new feature
- 11 new unit tests (`searchCustomers`, `quickCreateCustomer`, `uploadPrescriptionScanAction`); total 220 tests passing

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

## [2.1.0] — 2026-02-20

### Added — Campaign Engine (Marketing Automation)

#### Campaign Schema
- New models: `Campaign`, `CampaignRecipient`, `CampaignRun`, `Message`, `MessageTemplate`
- New enums: `CampaignType` (21 types), `CampaignStatus`, `MessageChannel`, `MessageStatus`, `RecipientStatus`
- SQL migration: `prisma/migrations/campaigns_v1.sql`

#### Campaign Engine (`src/lib/campaigns/`)
- `campaign-engine.ts` — `processCampaign()`, `processAllCampaigns()`, `checkConversions()`
- `segment-engine.ts` — SQL builder for customer segments (age, order count, days since exam, Rx expiry, insurance renewal month, and more)
- `drip-presets.ts` — 21 campaign type presets with multi-step drip sequences, delay days, and channel configs (SMS/EMAIL)
- `dispatch.ts` — `dispatchMessage()` creates `Message` DB record and dispatches via channel (SMS/email stubs — Twilio/Resend not yet wired)
- `template-engine.ts` — `resolveVariables()` + `interpolateTemplate()` for `{{firstName}}`, `{{insuranceProvider}}`, `{{rxExpiryDate}}` etc.
- `opt-out.ts` — `canContact()`, `processOptOut()` — respects `marketingOptOut`, `smsOptIn`, `emailOptIn`
- `segment-presets.ts`, `segment-fields.ts`, `segment-types.ts`, `template-variables.ts` — supporting configs

#### Campaign Actions (`src/lib/actions/campaigns.ts`)
- `createCampaign`, `updateCampaign`, `deleteCampaign`
- `activateCampaign`, `pauseCampaign`, `archiveCampaign`
- `enrollCustomer`, `removeRecipient`
- `triggerCampaignRun` (Admin only)
- `getCampaignAnalytics`
- `previewSegment`, `createMessageTemplate`, `updateMessageTemplate`, `deleteMessageTemplate`

#### Campaign UI
- `/campaigns` — list page with status filter, metrics summary
- `/campaigns/new` — campaign creation wizard (type selector → segment config → drip preview → create)
- `/campaigns/[id]` — campaign detail (metrics, recipient table, message log, run history)
- `/campaigns/[id]/edit` — campaign edit form
- `/campaigns/analytics` — cross-campaign analytics dashboard

#### Cron / Scheduler
- `GET /api/cron/campaigns` — processes all ACTIVE campaigns, secured with `CRON_SECRET` Bearer token
- `vercel.json` — Vercel Cron configured to run daily at 9am UTC

#### Notifications
- `CAMPAIGN_COMPLETED` notification fired after each successful campaign run
- `CAMPAIGN_ERROR` notification fired when a campaign run fails

#### Bug Fixes (Campaign Engine)
- `excludeRecentlyContacted` SQL clause was silently ignored — customers recently messaged were being re-enrolled
- `INSURANCE_RENEWAL` drip preset was missing — campaigns fell back to single generic SMS
- `processOptOut` never set the `optOutBy` field on the Customer record
- `checkConversions` used a stale recipient list after mid-run enrollment — newly enrolled recipients missed conversion detection
- `processAllCampaigns` never fired `CAMPAIGN_COMPLETED` / `CAMPAIGN_ERROR` notifications
- `<body>` tag missing `suppressHydrationWarning` — Grammarly extension caused React hydration noise in dev

#### Tests
- 316 total tests passing (107 new) across 22 test files
- New: `campaign-engine-process.test.ts` (12 tests — full engine lifecycle)
- Extended: `campaign-engine.test.ts`, `segment-engine.test.ts`, `template-engine.test.ts`, `campaigns.test.ts`
- Vitest coverage now includes `src/lib/campaigns/**`

> **Not yet live:** SMS delivery (Twilio stub) and email delivery (Resend stub) are not implemented. See `docs/project_status.md` Known Issues.

---

## [2.2.0] — 2026-02-20

### Added — Phase 1 & Phase 2 Feature Suite (17 features)

#### Eye Exam Sub-flow (Feature 1)
- New "Eye Exam" order category triggers a dedicated **Exam Details** step in the order wizard
- Exam Type selector: Complete Adult Eye Exam, Child/Teenager (Under 19), Senior (Above 65)
- Payment Method selector: Insurance Full, Insurance Partial, OHIP, Self-bill/Out of Pocket
- "Insurance Partial" reveals an amount-covered input; balance auto-calculates
- `examType`, `examPaymentMethod`, `insuranceCoveredAmount` fields stored on `Order` model

#### Customer Insurance Enhancement (Feature 2)
- New `InsurancePolicyManager` component replacing inline insurance display on customer profile
- Insurance policy cards show: Provider, Contract Number, Member ID, Last Claim Date, Estimated Next Claim Date (auto-computed from last claim + eligibility interval), Estimated Insured Amount
- Add / edit / deactivate policies without page reload
- New `src/lib/actions/insurance.ts`: `addInsurancePolicy`, `updateInsurancePolicy`, `deactivateInsurancePolicy`
- New Zod validation in `src/lib/validations/insurance.ts`

#### Family Members Auto-linking (Feature 4)
- Auto-suggest family linkage when customers share phone numbers or addresses
- `FamilyMembersCard` on customer detail: shows linked family members with name/phone/link
- "Find Family Matches" button surfaces potential matches in real time
- "Create Family Group" and "Add to Existing Family" workflows
- New actions: `findFamilyMatches`, `createFamilyAndLink`, `addToFamily` in `customers.ts`

#### Referral Code Tracking System (Feature 5)
- Unique referral codes generated per customer: format `MV-{FIRST2}{LAST2}-{4digits}`
- `ReferralCodeCard` on customer profile: shows code, copy-to-clipboard, referral history table
- Referral code input in Order Wizard payment step — real-time validation shows referrer name
- Auto-awards **$25 store credit** to referrer when referred customer completes a purchase
- New `src/lib/actions/referrals.ts`: `generateReferralCode`, `validateReferralCode`, `redeemReferral`, `getCustomerReferrals`
- `referrals` table gains `status` and `orderId` columns

#### Saved Frames Feature (Feature 6)
- Save frames to customer profile with optional photo (camera/file upload via Supabase Storage)
- `SavedFramesCard`: grid of saved frames with photo thumbnails, heart icon, expected return date
- "Save Frame" form: search existing inventory OR manual brand/model/color entry
- Toggle favorite, set expected return date, remove with confirmation
- New `src/lib/actions/saved-frames.ts`: `saveFrame`, `removeSavedFrame`, `toggleFavorite`, `updateExpectedReturnDate`
- New `saved_frames` DB table

#### Dual Invoicing Explicit Toggle (Feature 7)
- When `isDualInvoice = true`, invoice page shows amber toggle bar: **Customer View** / **Internal View** tabs
- Switching tab changes which amounts are displayed in `InvoiceView`
- `IssueInvoiceButton` updated: dual-invoice mode shows dropdown — "Issue Insurance Invoice", "Issue Actual Invoice", "Issue Both"

#### Auto-Generate Work Order on Completion (Feature 8)
- "Print work order" checkbox in Order Wizard review step auto-redirects to `/orders/[id]/work-order?autoprint=true` after creation
- `WorkOrderView` detects `autoprint` prop and triggers `window.print()` after 500ms render delay
- `InvoiceView` similarly accepts `autoprint` query param

#### Dashboard "Follow Ups" Section (Feature 9)
- New **Follow Ups** card section on dashboard, alongside existing "Money on the Table"
- Three sub-cards: Saved Frames (pending return in next 14 days), Styling Appointments (upcoming in 7 days), Quotes Given (walk-ins with quote in last 14 days, no order placed)
- Each row shows customer name (linked), reason, due date, and action button

#### "Add Another Order" Prompt (Feature 10)
- After order submission, success overlay appears instead of immediate redirect
- Options: "View Order", "Add Another Order for {customer}" (resets form, keeps customer), "Back to Orders"
- Re-creating an order for the same customer skips the customer selection step

#### Eyewear Styling Appointment Quick-Booking (Feature 11)
- `QuickBookAppointment` component on customer profile — compact modal with date/time/duration/notes
- Upcoming appointments listed as mini-list on customer profile
- New `src/lib/actions/appointments.ts`: `createAppointment`, `getUpcomingAppointments`, `updateAppointmentStatus`, `cancelAppointment`
- `STYLING` added to `AppointmentType` enum

#### Automated Invoice Email via Resend (Feature 12)
- `emailInvoice` server action sends a formatted HTML invoice email via Resend
- `InvoiceView` "Email Invoice" button replaces `mailto:` link — shows live loading/sent/error state
- `emailWorkOrder` server action for work order email delivery
- New `src/lib/email.ts`: Resend client + `sendInvoiceEmail()` with inline-styled HTML template
- New dependency: `resend` package
- New env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

#### Post-Pickup Campaign Toggle — Family Promo (Feature 13)
- New "Send family promo offer" checkbox in PickupCompleteModal
- When checked, family members are enrolled in FAMILY_ADDON campaign
- `order.familyPromoCampaignEnrolled` field records enrollment

#### PO Line Item Fields Expansion (Feature 15)
- Purchase Order form now supports two line item modes: **Select Existing** (search inventory) and **Add New Frame** (manual entry)
- New frame fields per line item: Brand, Model #, Gender, Eye Size, Bridge, Temple, Colour (dropdown), Colour Code, Retail Price, Gross Profit (auto-calc, read-only), Frame Type, Material
- Live **SKU Preview** shown as fields are filled in: `RAY-RB5154-2000-49-21`
- "Add New Frame" mode auto-creates an `InventoryItem` linked to the vendor when the PO is saved
- `purchase_order_line_items` table gains all expanded fields

#### SKU Auto-Generation (Feature 16)
- New `src/lib/utils/sku.ts`: `generateSku({ brand, model, colorCode, eyeSize, bridge })` + `ensureUniqueSku(baseSku)`
- SKU format: `{BRAND3}-{MODEL}-{COLORCODE}-{EYESIZE}-{BRIDGE}` (e.g., `RAY-RB5154-2000-49-21`)
- Brand prefix: first 3 chars uppercase, special characters stripped
- `ensureUniqueSku` appends `-2`, `-3`, etc. on collision
- Used in `createInventoryItem` and `createPurchaseOrder` (new items)

#### Received Frames Tab with Display Tracking (Feature 17)
- New `/inventory/purchase-orders/received` page — table of all received PO line items
- Filter: Not Yet Displayed (default) / Displayed / All; sort by received date (oldest first)
- **Mark as Displayed** button per item — records `displayedAt`, `isDisplayed`, optional `displayLocation`
- `MarkDisplayedButton` client component with location input
- New actions: `markAsDisplayed(inventoryItemId, location?)`, `removeFromDisplay(inventoryItemId)`
- Sidebar link "Received Frames" added under Purchase Orders

#### Tests
- 5 new test files: `appointments.test.ts` (7 tests), `insurance.test.ts` (7 tests), `referrals.test.ts` (9 tests), `saved-frames.test.ts` (12 tests), `email.test.ts` (5 tests)
- `src/__tests__/utils/sku.test.ts` — 10 tests covering SKU generation + uniqueness
- Prisma mock extended with `referral`, `savedFrame`, `appointment`, `family` models
- **366 total tests passing** (50 new)

---

## [2.3.0] — 2026-02-21

### Added

#### Auto-Send Invoice Email on Pickup
- `handlePickupComplete` now automatically sends a formatted HTML invoice email to the customer via Resend when an order is marked `PICKED_UP`
- Email is fire-and-forget — pickup action never fails due to email errors
- Guarded by `if (order.customer.email)` — silently skipped for customers without an email address on file
- Uses the same `sendInvoiceEmail()` template as the manual Email Invoice button (Mint Vision branded, line items, deposit/balance, insurance deductions)

#### Dashboard Follow Ups Layout
- "Money on the Table" and "Follow Ups" sections now render in a 2-column side-by-side grid on large screens
- "Money on the Table" shows an empty-state card when there are no open opportunities (previously the entire section was hidden)

#### Saved Frames — Inline Return Date Edit
- Expected return date on each saved frame card is now an inline editable field
- Click the date label (or "Set return date" placeholder) to open a date picker inline; click **Save** to persist or **✕** to cancel
- After saving, page refreshes via `router.refresh()` (server re-render) instead of local state mutation — always in sync with DB
- `savedBy` staff name now displayed on each frame card

#### Order Wizard Fixes
- Fixed stale closure bug in `addLineItem`, `removeLineItem`, and `updateLineItem` — all now use functional `setState(prev => ...)` form
- Inventory item search restricted to FRAME line items only (was incorrectly showing the search dropdown for all line item types)

### Changed
- `src/lib/email.ts`: Resend client now lazily initialized via `getResend()` to prevent module-load failures when `RESEND_API_KEY` is not set in test/build environments

### Tests
- 2 new unit tests in `orders.test.ts`: auto-sends invoice email on pickup, skips when no customer email
- 4 new E2E tests in `saved-frames.spec.ts`: inline date edit open, cancel, save, seeded frame visibility (Tremblay)
- 2 new E2E tests in `invoice-email.spec.ts`: pickup modal renders confirm button, modal has engagement checkboxes

---

## Upcoming

### [1.1.0] — Planned
- Staff management UI (Admin only)
- Reporting page (revenue, orders by status)
- Data migration (run customer + inventory import)
