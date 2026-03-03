# Project Status
## Mint Vision Optique — Staff Portal

**Last updated:** 2026-03-03

---

## Current Version: V3.1.0 — Lens Match Quiz & In-App Booking

---

### V3.1.0 — Lens Match Quiz & In-App Booking (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| CONSULTATION appointment type | ✅ Complete | 15-min lens recommendation review added to AppointmentType enum |
| LensQuote booking fields | ✅ Complete | `appointmentId`, `requestedAppointmentType`, `callbackRequestedAt` |
| Public lens match quiz (`/lens-match`) | ✅ Complete | 6-question quiz, 6 packages (SV/Progressive x Standard/Premium/Elite) |
| Lens package recommendation engine | ✅ Complete | `src/lib/utils/lens-packages.ts` — scoring + recommendation logic |
| In-app booking (replaces Jane App) | ✅ Complete | Inline date/time picker for logged-in portal users |
| Anonymous callback request flow | ✅ Complete | "Request a Callback" + "Log in to book online" for anonymous users |
| Portal route (`/my/lens-match`) | ✅ Complete | Authenticated version within client portal layout |
| QuickActionsRow update | ✅ Complete | Label changed to "Lens Fit", href to `/my/lens-match` |
| Quiz data in appointment notes | ✅ Complete | Auto-generated notes: package name, price range, answers, contact info |
| Email results (`sendLensMatchEmail`) | ✅ Complete | Sends recommendation to user's email |
| New components (8) | ✅ Complete | LensMatchWizard, ResultsPage, PackageCard, QuizQuestion, QuizProgress, LeadCaptureForm, LensMatchBooking, LensMatchCallbackForm |
| Server actions (4) | ✅ Complete | `submitLensQuiz`, `bookLensMatchAppointment`, `requestLensMatchCallback`, `getAvailableSlotsPublic` |
| Zod validations (3) | ✅ Complete | `LensQuizSubmissionSchema`, `LensMatchBookingSchema`, `LensMatchCallbackSchema` |
| Unit tests (791 total) | ✅ Complete | +117 tests; 26 in `lens-match.test.ts` |

---

### Previous Version: V3.0.0 — Client Portal

---

### V3.0.0 — Client Portal (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| ClientAccount, MagicLink, ClientSession models | ✅ Complete | Separate auth entity for client portal |
| UnlockCard model | ✅ Complete | Achievement/bonus tracking (LOCKED/UNLOCKED/CLAIMED/EXPIRED) |
| Family extensions (tier, portal fields) | ✅ Complete | `tierLevel`, `tierPointsTotal`, `portalEnabled`, `avatarUrl` |
| SQL migration | ✅ Complete | `client_portal_migration.sql` |
| Magic link login (15-min TTL) | ✅ Complete | Via Resend email, single-use, rate-limited |
| Password login | ✅ Complete | bcrypt, 5-attempt lockout |
| `mvo_client_session` cookie | ✅ Complete | HMAC-signed, 30-day max, httpOnly |
| 60-min idle timeout | ✅ Complete | `mvo_client_last_active` cookie |
| Client middleware branch | ✅ Complete | `/my/` route guard in `src/middleware.ts` |
| Family overview page (`/my`) | ✅ Complete | Banner, quick actions, upcoming exams, benefits, credits, orders, unlocks |
| Member profile (`/my/member/[id]`) | ✅ Complete | Exam timeline, current Rx, Rx comparison, frame history |
| Exam detail (`/my/exam/[id]`) | ✅ Complete | Summary, Rx result, change indicators |
| Booking wizard (`/my/book`) | ✅ Complete | 4-step: member → type → date/time → confirm; 6 types with icons |
| Unlock cards (`/my/unlocks`) | ✅ Complete | Responsive grid, status-based styling |
| Settings page (`/my/settings`) | ✅ Complete | Account info, password change, logout |
| Login page (`/my/login`) | ✅ Complete | Magic link + password forms |
| Verify page (`/my/verify`) | ✅ Complete | Token verification + session creation |
| Mobile-first layout | ✅ Complete | Bottom nav, max-w-lg container, large touch targets |
| Staff admin: ClientPortalCard | ✅ Complete | Create/invite/disable from customer detail page |
| Staff admin: Unlock card management | ✅ Complete | Create/update unlock cards |
| PHI data scoping (PHIPA/PIPEDA) | ✅ Complete | All queries scoped by familyId; clinical data hidden |
| Seed script | ✅ Complete | `scripts/seed-client-portal.ts`; test: `portal@mintvisionsoptique.com` / `Portal123!` |
| Unit tests (591 total, 36 files) | ✅ Complete | Client auth + portal + booking + admin tests |

---

### Previous Version: V2.8.0 — Work Order Redesign

---

### V2.8.0 — Work Order Redesign (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| 12 new Order fields (frame/lens/QC) | ✅ Complete | `frameSource`, `frameStatus`, `frameConditionNotes`, `lensBrand`, `lensProductName`, `lensMaterial`, `lensTint`, `lensEdgeType`, `qcCheckedAt`, `preparedBy`, `verifiedBy` |
| `nearPd` on Prescription | ✅ Complete | Near PD for progressive/bifocal |
| SQL migration | ✅ Complete | `work_order_redesign.sql` |
| Wizard: expanded lens types | ✅ Complete | Bifocal, Reading, Non-Prescription added |
| Wizard: Lens Details section | ✅ Complete | Brand/Supplier, Product Name, Material, Tint, Edge Type |
| Wizard: Frame Source/Status | ✅ Complete | 3-button groups with auto-set defaults |
| WorkOrderView rewrite | ✅ Complete | New header, 6-col Rx table, frame/lens spec grids, status checklist |
| `markQcChecked` action | ✅ Complete | Independent QC timestamp |
| `verifiedBy`/`preparedBy` auto-set | ✅ Complete | Set from session.name during status transitions |
| Scope guard (exam-only) | ✅ Complete | Work Order link hidden + page guard |
| Unit tests (559 total, 36 files) | ✅ Complete | +7 new tests |

---

### Previous Version: V2.7.1 — Invoice System Redesign (PDF Generation + Email Attachment + B&W Layout)

---

### V2.7.1 — Invoice System Redesign (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| B&W invoice layout | ✅ Complete | All green brand color removed; plain text website; inline footer logo |
| Prescription table removed from invoice | ✅ Complete | Rx data still accessible on order detail page |
| Totals restructured (SUBTOTAL first) | ✅ Complete | Always show all rows including $0.00 (Insurance, Referral, Deposit) |
| `@react-pdf/renderer` integration | ✅ Complete | Server-side PDF generation, no headless browser |
| `generateInvoicePdf()` in `src/lib/invoice-pdf.tsx` | ✅ Complete | React-PDF document matching B&W spec |
| PDF download endpoint (`/api/invoices/[orderId]/pdf`) | ✅ Complete | Authenticated GET, mode=customer\|internal, Content-Disposition: attachment |
| Download PDF button on invoice page | ✅ Complete | Links to API endpoint |
| Simplified invoice email body | ✅ Complete | Short thank-you message, PDF attached as `MintVision-Invoice-XXXX.pdf` |
| Email action orchestration | ✅ Complete | Fetch order → generate PDF → send email with Buffer attachment |
| "resalable" → "resellable" typo fix | ✅ Complete | In terms text |
| Unit tests (552 total, 37 files) | ✅ Complete | +7 tests: email flow, PDF generation, call ordering, error cases |

---

### Previous Version: V2.7.0 — Staff Task Queue, Dashboard Cycling, Exam Tracking, Google Review Tracking

---

### V2.7.0 — Staff Task Queue, Dashboard Cycling, Exam Tracking, Google Review Tracking (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| StaffTask + TaskComment models | ✅ Complete | 3 new enums (TaskStatus, TaskPriority, TaskCategory), 2 new tables, 7 indexes |
| TASK_ASSIGNED / TASK_DUE_SOON notification types | ✅ Complete | Added to NotificationType enum; TASK_ASSIGNED fires on create/reassign |
| Task CRUD server actions | ✅ Complete | createTask, updateTask, updateTaskStatus, deleteTask (soft), addTaskComment, getActiveStaff, getTaskComments, getMyOpenTaskCount |
| Tasks list page (`/tasks`) | ✅ Complete | Filter chips (status, category, priority), "My Tasks" toggle, search, overdue highlighting, pagination (25/page) |
| CreateTaskModal | ✅ Complete | Category, priority toggle, staff/role assignee dropdown, debounced patient search, due date, description |
| TaskDetailPanel (slide-over) | ✅ Complete | Inline editing, status transitions, comment thread, delete |
| Sidebar Tasks link + badge | ✅ Complete | ClipboardList icon, red badge with open task count |
| CustomerTasksCard | ✅ Complete | Shows patient-linked tasks on customer detail; inline quick-add form |
| Dashboard scoreboard click-to-cycle | ✅ Complete | Monthly → Year to Date → All Time; dot indicators; goal bar for monthly/yearly |
| `ScoreboardCard` client component | ✅ Complete | `src/components/dashboard/ScoreboardCard.tsx` |
| Weekly exam tracking page (`/exams`) | ✅ Complete | Week navigation, summary cards, detailed table, payment breakdown |
| Log Exam modal | ✅ Complete | Customer search, date/type/doctor/payment/amounts/OHIP/notes |
| `paymentMethod` on Exam model | ✅ Complete | `PaymentMethod?` reuses existing enum |
| Google review fields on Customer | ✅ Complete | `googleReviewGiven`, `googleReviewDate`, `googleReviewNote` |
| `GoogleReviewCard` + star indicator + filter | ✅ Complete | Mark/unmark, optional note, yellow star, "Reviewed"/"Not Reviewed" filter pills |
| Unit tests (534 total, 35 files) | ✅ Complete | +53 tests across all features |

---

### Previous Version: V2.6.0 — Smart Intake Form + Current Glasses Reading (Complete)

---

### V2.6.0 — Smart Intake Form + Current Glasses Reading (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Universal `/intake/start` public route | ✅ Complete | Shareable link for SMS, website, QR code; patients choose New or Returning |
| Returning patient phone/email lookup | ✅ Complete | Rate-limited (5/identifier, 10/IP per 15 min) + 500ms timing-safe delay |
| Email fallback for returning patients | ✅ Complete | If phone not found, option to try email before falling back to new patient flow |
| Pre-fill forms for returning patients | ✅ Complete | Name, contact, address, insurance fields auto-populated from existing record |
| Self-service intake packages (`sentByUserId: null`) | ✅ Complete | `createSelfServiceIntakePackage` action; view pages show "Self-service" |
| Returning patient update (no duplicate) | ✅ Complete | `completeIntakeStep` updates existing customer when `pkg.customerId` already set |
| `CURRENT_GLASSES` prescription source | ✅ Complete | New enum value; `recordCurrentGlassesReading` action with `$transaction` |
| Current Glasses Form + customer detail section | ✅ Complete | Teal section above "Our Prescriptions"; OD/OS table, PD, optional lensometer photo |
| Prescription filter fix | ✅ Complete | "Our Prescriptions" now uses `source === "INTERNAL"` to exclude CURRENT_GLASSES |
| In-memory rate limiter (`src/lib/rate-limit.ts`) | ✅ Complete | Sliding window, auto-cleanup every 5 min |
| Unit tests (470 total, 32 files) | ✅ Complete | +29 tests: intake lookup, self-service packages, returning patient update, glasses reading, rate-limit utility |

---

### Previous Version: V2.5.1 — Post-Purchase Campaign Enrollment (Complete)

---

### V2.5.1 — Post-Purchase Campaign Enrollment (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Referral campaign enrollment at pickup | ✅ Complete | `handlePickupComplete` upserts `CampaignRecipient` for active `POST_PURCHASE_REFERRAL` campaign when toggle is checked |
| Family promo enrollment at pickup | ✅ Complete | Upserts `CampaignRecipient` for active `FAMILY_ADDON` campaign for each linked family member (purchaser excluded) |
| Graceful degradation (no active campaign) | ✅ Complete | Silently skips enrollment if no active campaign of the target type exists; pickup never fails |
| Fire-and-forget pattern | ✅ Complete | Enrollment runs after transaction; campaign DB errors never block pickup confirmation |
| Unit tests (445 total, 31 files) | ✅ Complete | +4 tests: referral happy path, no-active-campaign skip, family member enrollment, no-op both-off |

---

## Previous Version: V2.5.0 — PHIPA/PIPEDA Compliance (Security & Audit)

---

---

### V2.5.0 — PHIPA/PIPEDA Compliance (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Security headers (5 HTTP headers) | ✅ Complete | Referrer-Policy, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Permissions-Policy added in `next.config.ts` |
| Session idle timeout (30 min) | ✅ Complete | `mvo_last_active` httpOnly cookie; redirect to `/login?reason=idle_timeout`; yellow banner on login page |
| Account lockout after 5 failures (15 min) | ✅ Complete | `lockedUntil` field on User; error returned before password check |
| Password complexity (12+ chars, upper/lower/number/special) | ✅ Complete | Zod schema enforced on Change Password; `PasswordStrengthIndicator` component |
| Audit logging (`logAudit()`) | ✅ Complete | Fire-and-forget; wired in 10 action files; logs IP, actor, action, model, before/after diff |
| `verifyRole()` — VIEWER enforcement | ✅ Complete | VIEWER (0) < STAFF (1) < ADMIN (2) hierarchy; all mutations require STAFF; admin actions require ADMIN |
| Breach report workflow | ✅ Complete | `/admin/breach` list, `/admin/breach/new`, `/admin/breach/[id]` with IPC letter generator; Admin-only |
| Audit log viewer | ✅ Complete | `/admin/audit` with filters + expandable JSON diff; Admin-only |
| Admin sidebar section | ✅ Complete | Visible only to ADMIN; links to Audit Log and Breach Reports |
| SQL migration | ✅ Complete | `compliance_20260222.sql` — User lockout fields + `breach_reports` table |
| Unit tests (441 total, 31 files) | ✅ Complete | +27 new tests: audit.test.ts, breach.test.ts, dal.test.ts, auth lockout tests |

---

## Previous Version: V2.4.1 — Missing Features Trio (Frame Lookup · Pickup Auto-Print · Queue Another Order)

---

### V2.4.1 — Missing Features Trio (Complete — superseded by V2.5.0)

| Feature | Status | Notes |
|---------|--------|-------|
| Frame image auto-lookup ("Find image online" link) | ✅ Complete | Appears in SavedFramesCard Add Frame form when brand + model filled; opens Google Images search in new tab |
| Frame photo auto-populate from inventory | ✅ Complete | If customer already has a SavedFrame for the same inventory item with a photo, photo URL pre-fills automatically on item select |
| Pickup invoice auto-print | ✅ Complete | "Print invoice" checkbox (default on) in PickupCompleteModal; confirms → opens `/orders/[id]/invoice?autoprint=true` in new tab; `InvoiceView` calls `window.print()` after 600ms |
| Add another order — step 7 checkbox | ✅ Complete | "Add another order for {firstName}" checkbox in wizard Review step; when checked, creates order then resets wizard to step 1 with same customer (no success overlay) |
| E2E tests (22 new specs) | ✅ Complete | saved-frames.spec.ts (+6), pickup-autoprint.spec.ts (new, 10), add-another-order.spec.ts (+6) |

---

## Current Version: V2.4.0 — Appointment Manager (Weekly Calendar)

---

## Feature Status

### V1.0 — Core

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication (login/logout) | ✅ Complete | |
| Session management | ✅ Complete | HMAC cookie, 7-day expiry |
| Role-based access (Admin/Staff/Viewer) | ✅ Complete | |
| Portal layout (sidebar + header) | ✅ Complete | |
| Customer list + search | ✅ Complete | |
| Customer create / edit | ✅ Complete | |
| Customer soft-delete | ✅ Complete | |
| Customer detail page | ✅ Complete | |
| Order wizard (multi-step) | ✅ Complete | |
| Order detail page | ✅ Complete | |
| Order status flow | ✅ Complete | DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → VERIFIED → READY → PICKED_UP |
| Kanban board | ✅ Complete | Includes VERIFIED column |
| Order notes + lab notes | ✅ Complete | |
| Payment recording | ✅ Complete | |
| Inventory browser | ✅ Complete | |
| Dashboard with KPIs | ✅ Complete | |
| Dual invoice (customer vs real) | ✅ Complete | Data model + order creation |
| Prisma schema (all V1–V4 models) | ✅ Complete | |
| Migration script — customers | ✅ Scaffolded | Not yet run — needs CSV export |
| Migration script — inventory | ✅ Scaffolded | Not yet run — needs CSV export |
| **Data migration (actual run)** | 🔲 Pending | Needs CSV export from Google Sheets |
| **Database connected (Supabase)** | ✅ Complete | aws-1-ca-central-1 pooler, schema deployed, admin seeded |
| **GitHub repo** | ✅ Complete | kurmanto/optics-management |
| **Digital Forms** | ✅ Complete | See V1.2 section below |

---

---

### V1.2 — Digital Forms (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Form templates (4 types) | ✅ Complete | New Patient, HIPAA Consent, Insurance, Frame Repair Waiver |
| Individual form send + share link | ✅ Complete | |
| Public form fill page `/f/[token]` | ✅ Complete | No login required |
| Canvas digital signature pad | ✅ Complete | New Patient, HIPAA Consent, Frame Repair Waiver |
| Intake package (3-form bundle) | ✅ Complete | Registration + Privacy + Insurance |
| Sequential intake flow `/intake/[token]` | ✅ Complete | Progress bar, auto-advances |
| In-person intake (kiosk mode) | ✅ Complete | Handoff screen, opens on current device |
| Auto-create customer from intake | ✅ Complete | NEW_PATIENT form creates Customer record |
| `isOnboarded` flag on Customer | ✅ Complete | Set to true when intake applied |
| Intake review page + "Apply All" | ✅ Complete | One-click import to PMS |
| Needs Review queue on Forms Hub | ✅ Complete | Completed-but-unapplied packages surfaced |
| Completed forms browser (search/filter) | ✅ Complete | |
| Forms & Documents on customer detail | ✅ Complete | |

---

### V1.3 — Orders Upgrade (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| VERIFIED status in order flow | ✅ Complete | Rx check step between LAB_RECEIVED and READY |
| VERIFIED Kanban column | ✅ Complete | |
| 7-step order wizard | ✅ Complete | Added Lens Type + Lens Config steps |
| Lens material / index / design selection | ✅ Complete | |
| Coatings + tints config step | ✅ Complete | AR, blue light, photochromic, UV, prism |
| Work Order view | ✅ Complete | `/orders/[id]/work-order` printable page |
| External Rx upload (AI OCR) | ✅ Complete | Claude AI parses paper Rx photo |
| PickupCompleteModal | ✅ Complete | Post-pickup retention workflow; Print invoice checkbox + auto-print in v2.4.1 |

---

### Inventory V2 (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Vendors CRUD | ✅ Complete | Contact info, payment terms, lead time, rep |
| Purchase Order creation | ✅ Complete | Multi-line PO with draft/send |
| PO lifecycle (DRAFT→RECEIVED) | ✅ Complete | 6-state flow |
| Receiving workflow | ✅ Complete | Per-line-item partial receipt |
| Inventory Ledger | ✅ Complete | Immutable stock movement log |
| Item: vendorId, UPC, colorCode, styleTags | ✅ Complete | |
| Item: committedQty / onOrderQty | ✅ Complete | Separate from raw stockQty |
| Item: landedCost / abcCategory | ✅ Complete | |
| ABC analysis page | ✅ Complete | A/B/C revenue segmentation |
| Dead stock report | ✅ Complete | 90-day no-movement items |
| Best/worst sellers report | ✅ Complete | Unit velocity trailing 90 days |
| Redesigned filter UI | ✅ Complete | Collapsible sidebar + active filter chips |

---

### V1.6 — Scan Rx + Prescription Image Storage (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| `/scan-rx` standalone page | ✅ Complete | Two-step: find/create patient → scan Rx |
| Debounced customer search | ✅ Complete | OR filter on name/phone/email, 10 results |
| Quick-create patient | ✅ Complete | Minimal fields, digits-only phone |
| Prescription scan image upload | ✅ Complete | `prescription-scans` Supabase Storage bucket |
| `uploadPrescriptionScan` utility | ✅ Complete | base64 → Buffer → Storage → public URL |
| `uploadPrescriptionScanAction` server action | ✅ Complete | Wraps upload for client components |
| ExternalPrescriptionUpload image storage | ✅ Complete | Uploads before save, passes URL to DB |
| "View scan" link — post-save | ✅ Complete | Shown in ExternalPrescriptionUpload after save |
| "View scan" link — customer detail | ✅ Complete | Next to each external Rx row |
| Sidebar Customers sub-nav | ✅ Complete | All Customers + Scan Rx (ScanLine icon) |
| Unit tests (11 new, 220 total) | ✅ Complete | searchCustomers, quickCreateCustomer, uploadPrescriptionScanAction |
| CLAUDE.md dev standards | ✅ Complete | Unit test + user guide required for every feature |
| User guide updated (in-app + site) | ✅ Complete | Section 3.5 added |

---

### V1.5 — Notification System (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Notification bell (Radix Popover) | ✅ Complete | Top-right of every portal page |
| 30-second polling | ✅ Complete | useEffect + setInterval, no WebSocket |
| Red badge with 9+ cap | ✅ Complete | |
| 7 notification types | ✅ Complete | FORM_COMPLETED, INTAKE_COMPLETED, ORDER_READY, ORDER_CANCELLED, ORDER_LAB_RECEIVED, PO_RECEIVED, LOW_STOCK |
| Actor exclusion (self-triggered) | ✅ Complete | Null-safe OR filter |
| Per-user read tracking | ✅ Complete | NotificationRead join table |
| Mark single / mark all read | ✅ Complete | |
| Notification preferences in Settings | ✅ Complete | Radix Switch toggles per type |
| Event injection — orders | ✅ Complete | advanceOrderStatus |
| Event injection — forms | ✅ Complete | completeFormSubmission + completeIntakeStep |
| Event injection — purchase orders | ✅ Complete | receivePOItems + LOW_STOCK check |

---

### V1.1 — Staff & Reporting

| Feature | Status | Notes |
|---------|--------|-------|
| Staff management UI | 🔲 Pending | Admin can create/deactivate staff |
| PDF invoice generation | 🔲 Pending | Print/download from order detail |
| Reporting page | 🔲 Pending | Revenue, orders by status |

---

### V2.0 — Walk-ins & Exams

| Feature | Status | Notes |
|---------|--------|-------|
| Walk-in logging | 🔲 Future | DB model exists |
| Eye exam records | 🔲 Future | DB model exists |
| Prescription entry from exam | 🔲 Future | |

---

### Campaign Engine (Partially Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Campaign schema (DB models) | ✅ Complete | Campaign, CampaignRecipient, CampaignRun, Message, MessageTemplate |
| 21 campaign types + drip presets | ✅ Complete | EXAM_REMINDER, INSURANCE_RENEWAL, ONE_TIME_BLAST, etc. |
| Segment engine (SQL builder) | ✅ Complete | age, lifetimeOrderCount, daysSinceLastExam, rxExpiresInDays, etc. |
| Campaign engine (processCampaign) | ✅ Complete | Enrollment, drip step advancement, conversion detection |
| Vercel cron job (daily 9am UTC) | ✅ Complete | `vercel.json` — calls `/api/cron/campaigns` |
| Campaign management UI | ✅ Complete | List, create wizard, detail, edit, analytics pages |
| Unit tests (316 total) | ✅ Complete | Engine, segment SQL, template, actions all covered |
| **SMS delivery via Twilio** | ❌ Not implemented | `dispatch.ts` → `sendSms()` is a console.log stub. Replace with Twilio SDK. |
| **Email delivery via Resend** | ❌ Not implemented | `dispatch.ts` → `sendEmail()` is a console.log stub. Replace with Resend SDK. |
| **MessageTemplate seed records** | ❌ Not implemented | `message_templates` table is empty — no default templates in DB |
| **CRON_SECRET env var** | ❌ Not set | Cron endpoint has no auth in dev — set `CRON_SECRET` in production env |

> **To make campaigns live:** wire `sendSms()` with Twilio and `sendEmail()` with Resend in `src/lib/campaigns/dispatch.ts`, then set `CRON_SECRET` in the Vercel environment.

---

### V2.1 — Messaging & Campaigns

| Feature | Status | Notes |
|---------|--------|-------|
| SMS via Twilio | 🔲 Future | See Campaign Engine section above |
| Email via Resend | 🔲 Future | See Campaign Engine section above |
| Walk-in follow-up drip | ✅ Preset exists | Engine built — blocked on SMS/email delivery |
| Insurance renewal reminder | ✅ Preset exists | Engine built — blocked on SMS/email delivery |

---

### Phase 1 & Phase 2 Features (V2.2.0 — Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Eye Exam order sub-flow (3-step: type, payment, insurance amount) | ✅ Complete | |
| Customer Insurance Manager (CRUD cards on profile) | ✅ Complete | contractNumber, estimatedCoverage added |
| Family Members Auto-linking (match by phone/address) | ✅ Complete | |
| Referral Code Tracking ($25 store credit auto-awarded) | ✅ Complete | Code format: MV-{FIRST2}{LAST2}-{4digits}; code lookup in order wizard Payment step; `referral_id` FK on orders |
| Saved Frames (photo upload, favorites, expected return, inline date edit) | ✅ Complete | Inline edit in v2.3.0; Supabase Storage for photos; image auto-lookup + "Find image online" in v2.4.1 |
| Dual Invoice explicit toggle (Customer / Internal tabs) | ✅ Complete | |
| IssueInvoiceButton — dual invoice dropdown | ✅ Complete | Issue each type separately or both |
| Auto-generate work order + auto-print on creation | ✅ Complete | `?autoprint=true` query param |
| Dashboard "Follow Ups" section (side-by-side with Money on the Table) | ✅ Complete | v2.3.0 layout; saved frames, appointments, quotes |
| "Add Another Order" success overlay | ✅ Complete | Keeps customer, resets order form; also available as step-7 checkbox before saving (v2.4.1) |
| Styling Appointment Quick-Booking | ✅ Complete | STYLING enum, mini-list on customer profile |
| Automated Invoice Email via Resend | ✅ Complete | Manual (button) + auto-send on PICKED_UP (v2.3.0) |
| Auto-send invoice email on pickup | ✅ Complete | Fire-and-forget in handlePickupComplete; skipped if no email |
| Post-Pickup Family Promo Campaign Toggle | ✅ Complete | Enrolls family members in FAMILY_ADDON campaign |
| PO Line Item Fields Expansion (14 new fields) | ✅ Complete | Select Existing + Add New Frame modes |
| SKU Auto-Generation (`RAY-RB5154-2000-49-21` format) | ✅ Complete | `src/lib/utils/sku.ts` |
| Received Frames tab with Display Tracking | ✅ Complete | `/inventory/purchase-orders/received` |
| Unit tests (368 total) | ✅ Complete | +2 in v2.3.0 (pickup auto-email); 366 prior |

---

### V3.0 — Referrals

| Feature | Status | Notes |
|---------|--------|-------|
| Referral tracking | ✅ Complete | See Phase 1 & 2 section above |

---

### V4.0 — PMS Replacement

| Feature | Status | Notes |
|---------|--------|-------|
| Appointment scheduling | ✅ Complete | All 6 types; full SCHEDULED→CONFIRMED→CHECKED_IN→COMPLETED flow; Cancel, No Show, Reschedule |
| Calendar view | ✅ Complete | Weekly grid 9am–7pm; slot-click pre-fill; overlap detection; live time indicator; week navigation |
| Book Appointment Modal | ✅ Complete | Debounced customer search; 6 types; "+ Book Styling" shortcut; slot-click pre-fill |
| Appointment Actions Popover | ✅ Complete | Status-aware buttons; reschedule inline datetime picker |

---

## Immediate Next Steps

1. **Run data migration** — export Customer Master CSV, run `migrate-customers.ts`
2. **Staff management** — create/deactivate staff accounts (Admin only)
3. **Reporting** — revenue by period, orders by status
4. **Wire SMS/email delivery** — replace stubs in `dispatch.ts` with Twilio/Resend

---

## Known Issues / Tech Debt

| Issue | Priority | Notes |
|-------|----------|-------|
| Settings page is a stub | Medium | Placeholder only |
| `addPayment` action updates only `*Customer` fields, not `*Real` | Medium | Should update both when not dual invoice |
| No input validation on order wizard line item prices | Low | Easy to enter bad data |
| No pagination on customer/order/inventory lists | Low | Fine until data grows |
| Migration scripts not tested with real data | High | Need to test before running on prod |
| `committedQty` / `onOrderQty` on InventoryItem not auto-synced on order state changes | Medium | Currently manual or batch process |
| Campaign SMS delivery not implemented | High | `sendSms()` in `dispatch.ts` is a stub — needs Twilio integration |
| Campaign email delivery not implemented | High | `sendEmail()` in `dispatch.ts` is a stub — needs Resend integration |
| `message_templates` table is empty | Medium | No seed records — campaigns send preset body text from drip-presets.ts |
| `CRON_SECRET` not set in production | High | Cron endpoint is publicly accessible without auth — set env var before go-live |
