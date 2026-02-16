# Project Status
## Mint Vision Optique — Staff Portal

**Last updated:** 2026-02-15

---

## Current Version: V1.0

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
| Order status flow | ✅ Complete | DRAFT → CONFIRMED → LAB_ORDERED → LAB_RECEIVED → READY → PICKED_UP |
| Kanban board | ✅ Complete | |
| Order notes + lab notes | ✅ Complete | |
| Payment recording | ✅ Complete | |
| Inventory browser | ✅ Complete | |
| Dashboard with KPIs | ✅ Complete | |
| Dual invoice (customer vs real) | ✅ Complete | Data model + order creation |
| Prisma schema (all V1–V4 models) | ✅ Complete | |
| Migration script — customers | ✅ Scaffolded | Not yet run — needs CSV export |
| Migration script — inventory | ✅ Scaffolded | Not yet run — needs CSV export |
| **Data migration (actual run)** | 🔲 Pending | Needs CSV export from Google Sheets |

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

## Immediate Next Steps (V1.1)

1. **PDF invoices** — most operationally critical; staff need to hand invoices to customers
2. **Run data migration** — export Customer Master CSV, run `migrate-customers.ts`
3. **Staff management** — settings page is a stub; need staff list + create/deactivate

---

## Known Issues / Tech Debt

| Issue | Priority | Notes |
|-------|----------|-------|
| Settings page is a stub | Medium | Placeholder only |
| `addPayment` action updates only `*Customer` fields, not `*Real` | Medium | Should update both when not dual invoice |
| No input validation on order wizard line item prices | Low | Easy to enter bad data |
| No pagination on customer/order lists | Low | Fine until data grows |
| Migration scripts not tested with real data | High | Need to test before running on prod |
