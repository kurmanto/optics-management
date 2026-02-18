# Project Status
## Mint Vision Optique — Staff Portal

**Last updated:** 2026-02-17

---

## Current Version: V1.5 — Notification System

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
| PickupCompleteModal | ✅ Complete | Post-pickup retention workflow |

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

### V2.1 — Messaging & Campaigns

| Feature | Status | Notes |
|---------|--------|-------|
| SMS via Twilio | 🔲 Future | |
| Email via SendGrid | 🔲 Future | |
| Campaign management | 🔲 Future | DB model exists |
| Walk-in follow-up drip | 🔲 Future | |
| Insurance renewal reminder | 🔲 Future | |

---

### V3.0 — Referrals

| Feature | Status | Notes |
|---------|--------|-------|
| Referral tracking | 🔲 Future | DB model exists |

---

### V4.0 — PMS Replacement

| Feature | Status | Notes |
|---------|--------|-------|
| Appointment scheduling | 🔲 Future | DB model exists |
| Calendar view | 🔲 Future | |

---

## Immediate Next Steps

1. **PDF invoices** — most operationally critical; staff need to hand invoices to customers
2. **Run data migration** — export Customer Master CSV, run `migrate-customers.ts`
3. **Staff management** — create/deactivate staff accounts (Admin only)
4. **Reporting** — revenue by period, orders by status

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
