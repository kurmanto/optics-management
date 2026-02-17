# Software Capabilities
## Mint Vision Optique — Staff Portal

**Last updated:** 2026-02-17
**Version:** V1.3 / Inventory V2

This document describes what the portal can do, section by section. It is written for staff and management — not developers.

---

## Table of Contents

1. [Authentication & Access](#1-authentication--access)
2. [Dashboard](#2-dashboard)
3. [Customers](#3-customers)
4. [Orders](#4-orders)
5. [Inventory](#5-inventory)
6. [Digital Forms](#6-digital-forms)
7. [Settings](#7-settings)
8. [Future Capabilities (Roadmap)](#8-future-capabilities-roadmap)

---

## 1. Authentication & Access

### What it does
- Staff log in with email and password
- Sessions last 7 days — no need to log in every shift
- Three access levels control what each person can see and do

### Access Levels

| Role | What they can do |
|------|-----------------|
| **Admin** | Full access — create staff accounts, see internal pricing, all reports |
| **Staff** | Create and manage orders, customers, inventory browsing |
| **Viewer** | Read-only — can view but not create or edit (reserved for future use) |

### Security
- Passwords are hashed with bcrypt (industry standard)
- Sessions use tamper-proof cryptographic tokens
- All staff-facing pages require login — patients cannot access any portal data
- Public form pages (`/f/...`, `/intake/...`) are completely separate and require no login

### First Login
- New staff accounts are flagged `Must Change Password`
- Staff are required to set their own password on first login

---

## 2. Dashboard

### What it does
Gives staff an at-a-glance view of the clinic's activity when they arrive at their shift.

### Key Metrics (KPI Cards)
| Metric | What it shows |
|--------|--------------|
| Total Customers | All active customer records in the system |
| Today's Revenue | Sum of payments recorded today (uses internal/real amounts) |
| Ready for Pickup | Orders in READY status waiting for patients |
| Orders In Progress | Active orders not yet picked up |

### Recent Orders
- Shows the most recent orders with status, customer name, and type
- Quick links to order detail pages

---

## 3. Customers

### What it does
The customer database is the core of the PMS. Every patient has a record that links their prescriptions, orders, insurance, and forms.

### Customer Records

**Basic Information**
- Full name, phone, email, date of birth, gender
- Mailing address (street, city, province, postal code)
- Tags (free-text labels for grouping — e.g. "VIP", "Contact lens wearer")
- Internal notes (not visible to patient)
- SMS and email opt-in flags

**Family Grouping**
- Multiple customers can be linked to a Family record
- Useful for tracking household members who share coverage or often visit together

**Onboarding Status**
- `Onboarded` badge — shown when patient has completed their intake package
- `Not onboarded` — intake forms not yet completed or applied

### Prescriptions
- Each customer can have multiple prescriptions on file (glasses and contacts are tracked separately)
- Rx values stored: sphere (OD/OS), cylinder, axis, add power, near/distance PD, monocular PDs
- Source: Internal (entered by staff) or External (uploaded from paper Rx)
- When a new Rx is entered, the old one is kept in history — never deleted
- Multiple active Rx allowed (e.g. one glasses Rx + one contacts Rx)

**AI Prescription Upload**
- Staff can photograph or scan a paper Rx from an outside doctor
- The system uses AI (Claude) to read the handwritten or printed values
- Extracted values are pre-filled into the Rx form for staff review before saving
- Fields extracted: OD/OS sphere/cylinder/axis/add, PD, expiry date, prescribing doctor name and clinic

### Insurance Policies
- Multiple policies per customer (vision, OHIP, extended health, combined)
- Fields: provider, policy number, coverage type, annual limit, renewal month, last claim date

### Medical History
- Eye conditions: cataracts, glaucoma, macular degeneration, dry eye, etc.
- Systemic conditions: diabetes, hypertension, autoimmune, thyroid
- Current medications and known allergies
- Family eye history
- Internal notes

### Store Credit
- Track credit balances per customer
- Sources: referral reward, insurance overpayment, promotion, refund
- History of all credit transactions with amounts and dates

### Forms & Documents
- View all form submissions for a customer: type, date signed, current status
- Forms with signatures show a "Signed" badge
- Direct link to view full form submission

### Search & Browse
- Search customers by name, phone, or email
- Customers are soft-deleted (`isActive = false`) — never permanently removed

---

## 4. Orders

### What it does
Orders are the core workflow item. A sales order tracks everything from when a patient chooses frames to when they pick up their completed glasses.

### Order Types
- **Glasses** — standard optical order to lab
- **Contacts** — contact lens order
- **Sunglasses** — non-prescription or prescription sun
- **Accessories** — cases, cleaning kits, accessories
- **Exam Only** — exam fee with no product order

### Creating an Order — 7-Step Wizard

| Step | What happens |
|------|-------------|
| 1. Customer | Select existing customer or create new |
| 2. Prescription | Select from patient's Rx history or enter new Rx |
| 3. Frame | Enter frame brand, model, colour, size; optionally link to inventory item |
| 4. Lens Type | Select material (plastic, polycarbonate, trivex, hi-index), index, design (single vision, bifocal, progressive/PAL) |
| 5. Lens Config | Select coatings (AR, blue light, photochromic, UV), tints, prism notes |
| 6. Review & Pricing | Add line items with prices; set customer amount and real amount (dual invoice) |
| 7. Payment | Record initial deposit (method, amount) |

### Order Line Items
Each order can have multiple line items representing exactly what the patient is paying for:

| Type | Examples |
|------|---------|
| Frame | Frame retail price |
| Lens | Lens pair cost |
| Coating | AR coating, photochromic upgrade |
| Contact Lens | Box of contacts |
| Exam | Eye examination fee |
| Accessory | Case, cloth, etc. |
| Discount | Dollar or percentage discount |
| Other | Miscellaneous |

### Dual Invoice
When enabled, each order stores two separate price sets:
- **Customer amount** — what appears on the patient's receipt
- **Real amount** — internal actual cost/revenue for reporting

All internal reports and revenue calculations always use the **real** amounts. This supports scenarios where insurance reimbursement or adjustments apply.

### Order Status Flow

```
DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → VERIFIED → READY → PICKED_UP
                                                                    ↘ CANCELLED
```

| Status | Meaning |
|--------|---------|
| DRAFT | Order created but not confirmed |
| CONFIRMED | Patient has approved, ready to send to lab |
| LAB_ORDERED | Order has been sent to optical lab |
| LAB_RECEIVED | Lab has completed and returned the order |
| VERIFIED | Optician has checked the Rx against the finished lenses |
| READY | Patient has been notified, waiting for pickup |
| PICKED_UP | Patient has collected their order |
| CANCELLED | Order cancelled at any stage |

Each status transition records a timestamp. Status history is visible on the order detail page.

### Kanban Board
- All active orders displayed in columns by status
- Drag-and-drop or button-click to advance status
- At-a-glance view of how many orders are at each stage
- Visual priority for orders that have been in a stage too long

### Order Detail Page
- Full order summary: customer, Rx, frame/lens details, line items, pricing
- Status history timeline
- Internal notes and lab notes fields
- Payment history with running balance
- Due date display

### Work Order (Printable)
- `/orders/[id]/work-order` — clean, print-optimized page
- Contains everything the lab needs: patient name, full Rx (OD/OS), frame brand/model/colour/size, lens type, coatings, tints, lab notes
- Used when physically dispatching frames and instructions to the optical lab

### Payments
- Record multiple payments against one order (e.g. deposit at order, balance at pickup)
- Payment methods: Cash, Debit, Visa, Mastercard, Amex, Cheque, e-Transfer, Insurance
- Running balance shown in real-time

### Pickup Complete Workflow
When an order is marked `PICKED_UP`, a modal prompts staff to:
- Flag if this was a low-value order (below threshold)
- Note if the patient mentioned needing a referral or next exam
- Capture any retention or follow-up notes

---

## 5. Inventory

### What it does
Track all frame and product stock, manage vendor relationships, create purchase orders, and analyze inventory performance.

### Inventory Items

**Core fields**
- Brand, model name, colour, colour code, UPC/barcode
- Category: Optical, Sun, Reading, Safety, Sport
- Gender: Men's, Women's, Unisex, Kids
- Rim type: Full rim, Half rim, Rimless
- Material, temple length, bridge width, lens width
- Style tags (free-text, e.g. "tortoise", "titanium", "oversized")

**Pricing & Cost**
- Retail price (customer-facing)
- Wholesale cost (from vendor)
- Landed cost (wholesale + freight + duty) — used for true margin calculations

**Stock Tracking**
| Field | Meaning |
|-------|---------|
| `stockQty` | Physical units on hand |
| `committedQty` | Units reserved for open orders not yet picked up |
| `onOrderQty` | Units in-flight on active purchase orders |

**ABC Classification**
- A — top ~20% of SKUs that generate ~80% of revenue (high priority)
- B — next tier (medium priority)
- C — bottom tier (low priority, candidates for clearance)
- Set manually or derived from analytics

### Inventory Ledger
Every stock movement is logged permanently. No value can be silently changed. Each record shows:
- Date and time
- Reason (purchase receipt, order fulfilled, manual adjustment, physical count, damage, loss, return, etc.)
- Quantity change (+/−)
- Reference to the source (PO number, Order number)
- Staff member who made the change

This creates a full audit trail for inventory reconciliation.

### Vendors

**Vendor profiles include:**
- Company name, website
- Contact email and phone
- Sales rep name, email, phone
- Payment terms: Net 30, Net 60, COD, or Prepaid
- Lead time in days (used for reorder planning)

**Managing vendors**
- Create, edit, and soft-delete vendors
- Link inventory items to their vendor
- View all POs placed with each vendor from the vendor detail page

### Purchase Orders

**Creating a PO**
- Select vendor
- Add line items: choose inventory item, quantity to order, unit cost
- Save as Draft, then send (status: SENT)

**PO Lifecycle**

```
DRAFT → SENT → CONFIRMED → PARTIAL → RECEIVED
                         ↘ CANCELLED
```

| Status | Meaning |
|--------|---------|
| DRAFT | PO created but not yet sent to vendor |
| SENT | PO sent to vendor |
| CONFIRMED | Vendor has acknowledged the order |
| PARTIAL | Some items received, some still pending |
| RECEIVED | All items received and stocked |
| CANCELLED | PO cancelled |

**Receiving workflow**
- When stock arrives, open the PO and mark each line item received
- Enter the actual quantity received (may differ from ordered)
- Stock is automatically added to `stockQty` and logged in the Inventory Ledger
- PO status auto-updates: all received → RECEIVED; some received → PARTIAL

### Analytics

Located at `/inventory/analytics`, four panels:

#### Dead Stock
- Items with zero sales movement in the past 90 days
- Sorted by total cost exposure (landed cost × qty on hand)
- Helps identify candidates for clearance, return, or promotion

#### Best Sellers
- Items with the highest unit sales in the past 90 days
- Useful for reorder prioritization and identifying what to stock more of

#### Worst Sellers
- Items with the lowest sales velocity
- Helps identify slow movers before they become dead stock

#### ABC Analysis
- Classifies all items into A, B, and C categories by revenue contribution
- Summary table: count of items per category, total revenue per category, average margin
- Can be used to set `abcCategory` on items for filtering and prioritization

### Filtering & Browsing
- Filter inventory by: brand, category, gender, vendor, price range, stock level, ABC category
- Active filters shown as chips with one-click clear
- Collapsible filter sidebar to maximize browsing space

---

## 6. Digital Forms

### What it does
Collect required patient information digitally — without paper. Forms can be sent as links (email, text), opened on the clinic device, or handed to patients on a tablet.

### Form Types

| Form | Purpose | Signature Required |
|------|---------|-------------------|
| New Patient Registration | Demographics, contact info, emergency contact | Yes |
| Privacy & Consent (PIPEDA) | Privacy policy acknowledgment, communication preferences | Yes |
| Insurance Verification | Insurance carrier, policy number, subscriber info | No |
| Frame Repair Waiver | Liability waiver for frame adjustments | Yes |

### Sending Forms

**Individual form**
- Open Forms Hub → select a template → Send Form
- Enter patient name and email (or phone for SMS in future)
- A unique link is generated and can be copied or emailed

**Intake Package (recommended for new patients)**
- One bundle containing all 3 intake forms: Registration + Privacy + Insurance
- Send as a single link
- Patient completes all 3 forms in sequence with a progress bar

### Public Form Experience (Patient-facing)
- Patient opens link on any device — phone, tablet, desktop
- No login or account required
- Canvas-based digital signature pad for forms that need signing
- Multi-page forms with clear field labels
- Confirmation page shown on submission

### In-Person Kiosk Mode
- Staff opens the intake package on the clinic's own device
- A welcome/handoff screen appears: "Please hand this device to the patient"
- Patient fills out all 3 forms on the device
- Staff takes the device back when complete

### Intake Review & Apply (Staff)

After a patient completes their intake package:

1. The package appears in the **Needs Review** queue on the Forms Hub
2. Staff clicks **Review** to open the intake review page
3. All 3 forms' submitted data is shown side-by-side with labelled fields
4. Signatures are rendered as images
5. Staff clicks **Apply All to Patient Record** — one click imports:
   - Registration data → creates or updates the Customer record
   - Privacy preferences → updates SMS/email opt-in on the customer
   - Insurance data → creates an InsurancePolicy record
6. The customer's `isOnboarded` flag is set to `true`
7. The package is marked as applied with a timestamp

### Forms Hub (Staff Portal)

The Forms Hub at `/forms` provides:

| Section | What it shows |
|---------|--------------|
| Intake CTA | Quick button to create and send a new intake package |
| Needs Review | Completed intake packages waiting for staff to apply |
| Intake Packages | All sent intake packages with per-step completion status and resend links |
| Form Templates | All 4 templates — click to send or preview |
| Outstanding Forms | Individual forms sent but not yet completed |
| Completed Forms | All submitted forms — searchable by patient name, filterable by type |

### Forms on Customer Detail
- Every customer's detail page has a "Forms & Documents" section
- Shows all forms submitted by that patient
- Signed badge, status, date, and link to view full submission

---

## 7. Settings

**Current status: Stub**

The settings page is a placeholder. Planned features:
- Staff account management (Admin only): create, deactivate, reset password
- App-level settings (store name, tax rates, order number prefix)
- Notification preferences

---

## 8. Future Capabilities (Roadmap)

### V1.1 — Staff & Reporting (Next)
- **PDF Invoices** — generate and print/download customer invoices and internal invoices from any order
- **Staff Management** — Admin-only page to create and deactivate staff accounts, assign roles, force password reset
- **Reporting** — revenue by date range, orders by status, top customers, exam-to-purchase conversion

### V2.0 — Walk-ins & Exams
- **Walk-in Logging** — log walk-in visits with or without a linked patient; track source (Google, referral, walk-by), interest level, and outcome; auto-enroll in follow-up campaign
- **Eye Exam Records** — record clinical exam data: IOP, visual acuity, clinical notes; link directly to Rx; OHIP/insurance billing codes

### V2.1 — Messaging & Campaigns
- **SMS & Email** (via Twilio/SendGrid) — send messages directly from the portal
- **Campaign Types**: walk-in follow-up drip (14-day), exam reminder (annual), insurance renewal reminder, one-time blast
- **Opt-in/out management** — honor patient communication preferences per channel

### V3.0 — Referrals
- Track which customer referred a new patient
- Referral codes and reward amounts
- Referral history per customer

### V4.0 — Appointments
- Schedule eye exams, contact lens fittings, pickups, and adjustments
- Calendar view by day/week
- Automated reminders via SMS/email

---

## Appendix: Business Rules Summary

| Rule | Detail |
|------|--------|
| Dual Invoice | When enabled, orders store two price sets: customer-facing and internal real. Reports always use real amounts. |
| Order Numbers | Auto-generated in format `ORD-YYYY-NNN` (e.g. `ORD-2026-047`) |
| Phone Storage | Stored as digits only (`6476485809`). Displayed formatted via `(647) 648-5809`. |
| Soft Deletes | Customers, prescriptions, and inventory items are never permanently deleted. Deleted = `isActive: false`. |
| Prescription History | Previous Rx records are kept forever when a new one is entered. |
| Legacy IDs | Migrated customers have a `legacyCustomerId` (e.g. `6476485809-A`) for migration mapping. |
| Real Amounts | All revenue, payment totals, and financial reports use `*Real` fields — never `*Customer` fields. |
