# Product Requirements Document
## Mint Vision Optique — Staff Portal

**Version:** 1.3 / Inventory V2
**Last updated:** 2026-02-17
**Status:** V1.3 + Inventory V2 shipped; V1.1 (Staff/Reporting/PDF) next

---

## 1. Overview

The Mint Vision Optique Staff Portal is an internal web application for the staff of Mint Vision Optique, an independent optometry boutique in Toronto. It replaces:

- Paper order cards
- A Google Sheets customer master
- A legacy practice management system (PMS)

The portal is **staff-only** (not customer-facing). It runs in-store on tablets and desktop browsers.

---

## 2. Goals

| Goal | Description |
|------|-------------|
| Replace paper order cards | Digital order creation, tracking, and Kanban board |
| Centralize customer data | Single source of truth for customer profiles, Rx history, insurance |
| Improve order visibility | Staff can see order status at a glance without digging through binders |
| Enable reporting | Revenue, orders, and customer data reportable without manual spreadsheet work |
| Foundation for future CRM | Walk-ins, campaigns, referrals, appointments (V2+) |

---

## 3. Non-Goals (V1)

- Customer-facing portal or booking system
- Online store / e-commerce
- Direct integration with labs or insurance portals
- SMS / email automation (V2.1)
- Appointment scheduling (V4)

---

## 4. Users

| Role | Access | Description |
|------|--------|-------------|
| Admin | Full access | Owner/manager. Can manage staff, view internal pricing, access all reports |
| Staff | Standard access | Can create/manage orders, customers, inventory browsing |
| Viewer | Read-only | Future use — could be used for a read-only owner view |

---

## 5. Features by Version

### V1.0 — Core (Shipped)

#### Authentication
- Email + password login
- HMAC-signed session cookie (`mvo_session`), 7-day expiry
- `mustChangePassword` flag for new staff accounts
- Role-based access: Admin, Staff, Viewer

#### Customer Management
- Create, view, edit, soft-delete customers
- Fields: name, phone, email, DOB, gender, address, city, province, postal code, notes, tags
- Family grouping (link customers to a family)
- SMS/email opt-in flags
- Legacy ID preserved for migration mapping

#### Order Management
- Multi-step order wizard (customer → Rx → frame/lens → pricing → review)
- Order types: Glasses, Contacts, Sunglasses, Accessories, Exam Only
- Line items: Frame, Lens, Coating, Contact Lens, Exam, Accessory, Discount, Other
- Dual invoice support: `totalCustomer` vs `totalReal` (for insurance gaming scenarios)
- Order status flow: `DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → READY → PICKED_UP`
- Kanban board view of active orders
- Order detail page with status history, notes, lab notes, due date
- Payment recording (Cash, Debit, Visa, MC, Amex, Cheque, e-Transfer, Insurance)
- Balance tracking per order

#### Inventory Browser
- Browse inventory by brand, category, gender
- Stock quantities and reorder points
- Frame details: size, material, rim type, wholesale cost, retail price

---

### V1.2 — Digital Forms (Shipped)

#### Form Templates
- 4 built-in templates: New Patient Registration, Privacy & Consent (PIPEDA), Insurance Verification, Frame Repair Waiver
- Public share links — patients fill forms on any device without logging in
- Canvas digital signature pad for forms requiring a signature

#### Intake Packages
- 3-form intake bundle (Registration + Privacy + Insurance) created from Forms Hub
- Sequential intake flow with step progress bar at `/intake/[token]`
- In-person kiosk mode: staff launches on clinic device, hands to patient
- Auto-creates Customer record when new patient form is submitted
- `isOnboarded` flag set on Customer when intake reviewed and applied

#### Forms Hub (Staff)
- Send individual forms or intake packages to patients (link or email)
- Needs Review queue — surfaces completed-but-unapplied intake packages
- Completed forms browser with search and type filter

#### Intake Review
- Unified review page showing all 3 submitted forms with labelled fields
- Renders canvas signatures as images
- "Apply All to Patient Record" — one-click import to PMS in a single transaction

---

### V1.3 — Orders Upgrade (Shipped)

#### Enhanced Order Status Flow
- Added `VERIFIED` status: `DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → VERIFIED → READY → PICKED_UP`
- VERIFIED represents optician's Rx check after lab receives the order
- `verifiedAt` timestamp recorded; VERIFIED column on Kanban board

#### 7-Step Order Wizard
- Expanded wizard: Customer → Prescription → Frame → Lens Type → Lens Config → Review → Payment
- Lens Type step: select material (plastic, polycarbonate, trivex, hi-index), index, design (single vision, bifocal, progressive, PAL)
- Lens Config step: coatings (AR, blue light, photochromic, UV), tints, prism notes

#### Work Order
- Printable work order page at `/orders/[id]/work-order`
- Shows patient info, Rx values (OD/OS), frame details, lens specs, coatings, lab notes
- Used when dispatching to optical lab

#### External Prescription Upload (AI OCR)
- Staff can upload a photo or scan of a paper Rx from an external prescriber
- Claude AI (via `@anthropic-ai/sdk`) extracts Rx values: sphere, cylinder, axis, add, PD, expiry, doctor info
- Pre-fills the prescription form; staff review before saving

#### Pickup Complete Modal
- Triggered when order moves to `PICKED_UP`
- Prompts staff to flag low-value orders, capture referral source, note patient's next exam inquiry

---

### Inventory V2 (Shipped)

#### Vendors
- Vendor profiles: name, contact, rep, payment terms (Net 30/60/COD/Prepaid), lead time
- Full CRUD at `/inventory/vendors`
- Link inventory items to their vendor

#### Purchase Orders
- Create POs against a vendor with multiple line items
- PO lifecycle: `DRAFT → SENT → CONFIRMED → PARTIAL → RECEIVED → CANCELLED`
- Receiving workflow: mark individual lines received with actual qty; partial receipt auto-sets `PARTIAL` status
- Stock automatically updated via Inventory Ledger on receipt

#### Inventory Ledger
- Immutable transaction log for all stock movements
- Every change recorded: reason, qty delta, user, reference (PO ID, Order ID)
- Reasons: purchase receipt, order committed/fulfilled/cancelled, manual adjustment, physical count, damage, loss, customer return

#### Enhanced Inventory Items
- New fields: UPC, color code, style tags, vendor link
- Separate quantity tracking: `stockQty`, `committedQty` (reserved), `onOrderQty` (in-flight POs)
- Cost fields: `wholesaleCost`, `landedCost`
- ABC category: A / B / C for inventory prioritization

#### Inventory Analytics
- `/inventory/analytics` with 4 panels:
  - **Dead Stock** — items with no movement in 90+ days, sorted by cost exposure
  - **Best Sellers** — top items by units sold (trailing 90 days)
  - **Worst Sellers** — lowest-velocity items
  - **ABC Analysis** — revenue segmentation table with per-category summaries

#### Dashboard
- KPIs: Total customers, today's revenue, orders ready for pickup, orders in progress
- Recent orders list

#### Data Migration (scaffolded)
- `scripts/migrate-customers.ts` — import from Customer Master CSV
- `scripts/migrate-inventory.ts` — import inventory data

---

### V1.1 — Staff & Reporting (Next)

#### Staff Management
- Create/deactivate staff accounts (Admin only)
- Role assignment
- Force password reset

#### Reporting
- Revenue by date range (using `totalReal`)
- Orders by status
- Top customers
- Eye exams and how many people actually purchase after

#### PDF Invoices
- Print/download invoice from order detail page
- Dual invoice: separate customer-facing and internal versions
- Shows: customer info, Rx, frame/lens details, pricing, deposit, balance

---

### V2.0 — Walk-ins & Exams

#### Walk-in Logging
- Log walk-in visits with or without a linked customer
- Track source (Google, referral, etc.), interest, and outcome
- Automatic follow-up campaign enrollment

#### Eye Exam Records
- Record exam data (IOP, VA, clinical notes)
- Link to prescription
- OHIP / insurance billing codes

---

### V2.1 — Messaging & Campaigns

- SMS and email via Twilio / SendGrid
- Campaign types: Walk-in follow-up (14-day drip), exam reminder, insurance renewal, one-time blast
- Opt-in/opt-out management

---

### V3.0 — Referrals

- Track referral relationships between customers
- Referral codes and reward tracking

---

### V4.0 — PMS Replacement

- Appointment scheduling (eye exams, fittings, pickups, adjustments)
- Calendar view
- Reminder automation

---

## 6. Business Rules

### Dual Invoice
When `isDualInvoice = true`, two invoice totals are stored:
- `totalCustomer` / `depositCustomer` / `balanceCustomer` — what the customer sees
- `totalReal` / `depositReal` / `balanceReal` — actual amounts for internal reporting

All reports and revenue calculations **always use `*Real` fields**.

### Order Numbers
Format: `ORD-YYYY-NNN` (e.g. `ORD-2025-001`). Auto-generated, sequential by year.

### Phone Numbers
Stored as digits only (e.g. `6476485809`). Displayed formatted via `formatPhone()` helper.

### Soft Deletes
Customers, prescriptions, and inventory items are never hard-deleted. Use `isActive = false`.

### Prescription History
When a new Rx is entered, old ones are set `isActive = false`. Never deleted. Multiple active Rx allowed (glasses + contacts).

### Legacy IDs
Migrated customers have a `legacyCustomerId` in format `6476485809-A`. New customers do not.

---

## 7. Data Sources (Migration)

| Source | Format | Location |
|--------|--------|----------|
| Customer Master | Google Sheets → CSV | `scripts/data/customers.csv` |
| Inventory | Excel (`.xlsx`) | `current_data/Patient Orders (6).xlsx` |
| Historical orders | Excel | `current_data/Patient Orders (6).xlsx` |

Known migration issues:
- Phone stored as float in source (`6476485809.0`) — strip `.0`
- Row 1 column misalignment — skip or flag
- Duplicate customers (same name, different IDs) — flag for manual review