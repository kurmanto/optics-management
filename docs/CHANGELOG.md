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

## [1.0.2] — 2026-02-15

### Added
- `scripts/seed-test-data.ts` — comprehensive test data for all V1 entities
  - 2 staff users, 3 families, 10 customers, 6 prescriptions, 10 inventory items, 3 insurance policies, 10 orders

---

## Upcoming

### [1.1.0] — Planned
- PDF invoice generation (print/download from order detail)
- Staff management UI (Admin only)
- Reporting page (revenue, orders by status)
- Data migration (run customer + inventory import)
