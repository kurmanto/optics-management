# Product Requirements Document
## Mint Vision Optique — Staff Portal

**Version:** 1.0
**Last updated:** 2026-02-15
**Status:** V1 shipped, V1.1 in progress

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