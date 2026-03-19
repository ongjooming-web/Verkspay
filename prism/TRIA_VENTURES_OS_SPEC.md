# Tria Ventures Holding Company OS - Complete Specification

**Status:** Enterprise ERP for Holding Company + Subsidiaries  
**Date:** 2026-03-19  
**Version:** 2.0 (Multi-Entity Architecture)

---

## Executive Summary

**Tria Ventures** is a holding company with distinct operational subsidiaries:

1. **Tai Chew Hardware & Timber** — Cash retail business
   - Daily cash reconciliation critical
   - POS integration (existing system)
   - No credit terms, immediate payment
   - Non-standard inventory units (length, volume, batch)

2. **Bintang Flavours** — B2B wholesale/distribution
   - 4 channels: Distributors, Wholesalers, HoReCa, Ecommerce
   - Channel-specific pricing tiers
   - Credit terms per customer (Net 30/60/90/COD)
   - Overdue tracking + auto reminder emails
   - Strong CRM + receivables aging

3. **Shared Infrastructure**
   - Generic webhook receiver (POS, ecommerce)
   - Consolidated P&L + receivables dashboard
   - Per-unit bank accounts

**Core Goal:** Flexible platform supporting cash retail (Tai Chew) and B2B credit sales (Bintang) from single backend.

---

## System Architecture

### Tech Stack
- **Frontend:** Next.js 15 + React + Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** Supabase (PostgreSQL) + RLS
- **Auth:** Supabase Auth (multi-user, role-based)
- **Currency:** MYR primary (no USD)
- **Webhooks:** Generic webhook receiver for POS/Shopee/Lazada

### Multi-Entity Permission Model

```
Tria Ventures (Holding Company - Parent)
├── Bintang Flavours (Subsidiary 1)
├── Prism (Subsidiary 2)
└── [Future subsidiaries]

User Roles:
├── Tria Ventures Admin
│   └── Sees ALL entities, consolidated P&L, group cash flow
├── Business Unit Admin (e.g. Bintang Flavours Admin)
│   └── Sees only their unit + can manage team
└── Business Unit Staff (e.g. Bintang Flavours Staff)
    └── Sees only their unit (limited operations)
```

---

## Database Schema (Multi-Entity)

```sql
-- HOLDING COMPANY STRUCTURE
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE, -- 'Tria Ventures'
  headquarters_address TEXT,
  created_at TIMESTAMP
);

CREATE TABLE business_units (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations,
  name TEXT, -- 'Bintang Flavours', 'Prism', etc.
  code TEXT UNIQUE, -- 'BF', 'PR' for shorthand
  currency TEXT DEFAULT 'MYR',
  status TEXT, -- 'active', 'inactive'
  created_at TIMESTAMP
);

-- USER AUTHENTICATION & PERMISSIONS
CREATE TABLE users (
  id UUID PRIMARY KEY (from Supabase auth),
  organization_id UUID REFERENCES organizations,
  business_unit_id UUID REFERENCES business_units (nullable - NULL = Tria Ventures admin),
  email TEXT UNIQUE,
  role TEXT, -- 'org_admin', 'unit_admin', 'unit_staff'
  permissions JSONB, -- Fine-grained permissions (can expand later)
  created_at TIMESTAMP
);

-- BANK ACCOUNTS (Per Business Unit)
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  bank_name TEXT, -- 'Maybank', 'CIMB', etc.
  account_name TEXT,
  account_number TEXT,
  swift_code TEXT,
  duit_now_id TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);

-- CHART OF ACCOUNTS (Per Business Unit)
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  code TEXT, -- GL code (e.g. 1000, 5000)
  name TEXT, -- Account name
  type TEXT, -- 'asset', 'liability', 'equity', 'income', 'expense', 'cogs'
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP,
  UNIQUE(business_unit_id, code)
);

-- TRANSACTION LEDGER (Per Business Unit)
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  date DATE,
  description TEXT,
  reference TEXT, -- Invoice/order number
  debit_account_id UUID REFERENCES accounts,
  credit_account_id UUID REFERENCES accounts,
  amount NUMERIC,
  source TEXT, -- 'invoice', 'expense', 'pos', 'shopee', 'lazada', 'manual', 'intercompany'
  source_id UUID, -- Links to originating document
  created_by UUID REFERENCES users,
  created_at TIMESTAMP
);

-- CRM: CONTACTS (Per Business Unit)
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  type TEXT, -- 'b2b', 'b2c', 'supplier'
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  tags JSONB,
  status TEXT, -- 'prospect', 'contacted', 'sampled', 'active', 'churned'
  price_tier TEXT, -- Bintang Flavours: 'distributor', 'wholesaler', 'horeca', 'ecommerce' (NULL for Tai Chew)
  credit_term TEXT, -- Bintang Flavours: 'net_30', 'net_60', 'net_90', 'cod' (NULL for Tai Chew - cash only)
  credit_limit NUMERIC, -- Max credit allowed for B2B customers (Bintang)
  outstanding_balance NUMERIC DEFAULT 0, -- Running total of unpaid invoices
  last_contacted_at TIMESTAMP,
  created_at TIMESTAMP
);

-- CRM: PURCHASE HISTORY (Per Business Unit)
CREATE TABLE customer_orders (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  contact_id UUID REFERENCES contacts,
  order_date DATE,
  channel TEXT, -- 'pos', 'shopee', 'lazada', 'direct'
  items JSONB,
  total_amount NUMERIC,
  payment_status TEXT,
  amount_paid NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP
);

-- CRM: FOLLOW-UP REMINDERS (Per Business Unit)
CREATE TABLE contact_reminders (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  contact_id UUID REFERENCES contacts,
  reminder_date DATE,
  reminder_type TEXT,
  status TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP
);

-- INVENTORY: SKU CATALOG (Per Business Unit)
CREATE TABLE skus (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  sku_code TEXT, -- 'BF-001', 'TC-HW-001'
  name TEXT,
  category TEXT, -- For Tai Chew: 'hardware', 'timber', 'tools'; For Bintang: 'spice_blend', 'sauce', etc.
  cost_price NUMERIC,
  -- Tai Chew: single sale price
  sale_price NUMERIC,
  -- Bintang Flavours: tiered pricing (NULL if Tai Chew)
  distributor_price NUMERIC,
  wholesaler_price NUMERIC,
  horeca_price NUMERIC,
  ecommerce_price NUMERIC,
  unit TEXT, -- 'box', 'kg', 'meter', 'liter', 'batch' (non-standard units for Tai Chew)
  current_stock INT,
  reorder_level INT,
  supplier_id UUID REFERENCES contacts,
  created_at TIMESTAMP,
  UNIQUE(business_unit_id, sku_code)
);

-- INVENTORY: STOCK MOVEMENTS (Per Business Unit)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  sku_id UUID REFERENCES skus,
  movement_type TEXT,
  quantity INT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP
);

-- EXPENSES (Per Business Unit)
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  date DATE,
  category TEXT,
  amount NUMERIC,
  description TEXT,
  vendor_id UUID REFERENCES contacts,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES users,
  created_at TIMESTAMP
);

-- INVOICES (Per Business Unit)
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  contact_id UUID REFERENCES contacts,
  invoice_number TEXT,
  issue_date DATE,
  due_date DATE, -- Auto-calculated from issue_date + contact.credit_term (Bintang); TODAY for Tai Chew
  items JSONB, -- [{sku_id, qty, unit_price, price_tier_used, total}, ...]
  subtotal NUMERIC,
  tax NUMERIC,
  total NUMERIC,
  status TEXT, -- 'draft', 'sent', 'unpaid', 'paid_partial', 'paid', 'overdue'
  amount_paid NUMERIC DEFAULT 0,
  days_overdue INT DEFAULT 0, -- Auto-calculated: (TODAY - due_date)
  payment_method TEXT, -- Tai Chew: 'cash', 'card'; Bintang: 'bank_transfer', 'duitnow', 'cash'
  payment_bank_account_id UUID REFERENCES bank_accounts,
  credit_term_applied TEXT, -- 'net_30', 'net_60', etc. (for audit trail)
  notes TEXT,
  created_at TIMESTAMP,
  UNIQUE(business_unit_id, invoice_number)
);

-- PURCHASE ORDERS (Per Business Unit)
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  supplier_id UUID REFERENCES contacts,
  po_number TEXT,
  order_date DATE,
  expected_delivery DATE,
  items JSONB,
  total NUMERIC,
  status TEXT,
  received_date DATE,
  created_at TIMESTAMP
);

-- WEBHOOK LOG (Per Business Unit)
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  source TEXT,
  event_type TEXT,
  payload JSONB,
  status TEXT,
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP
);

-- DAILY CASH RECONCILIATION (Tai Chew Hardware)
CREATE TABLE daily_cash_reconciliation (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  reconciliation_date DATE,
  opening_balance NUMERIC,
  cash_sales NUMERIC,
  card_sales NUMERIC,
  expenses NUMERIC,
  closing_balance NUMERIC,
  discrepancy NUMERIC, -- closing_balance - expected
  notes TEXT,
  reconciled_by UUID REFERENCES users,
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP,
  UNIQUE(business_unit_id, reconciliation_date)
);

-- OVERDUE INVOICE REMINDERS (Bintang Flavours)
CREATE TABLE overdue_reminders (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  invoice_id UUID REFERENCES invoices,
  contact_id UUID REFERENCES contacts,
  days_overdue INT,
  reminder_type TEXT, -- '30_day_overdue', '60_day_overdue', '90_day_overdue'
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  status TEXT, -- 'pending', 'sent', 'paid'
  created_at TIMESTAMP,
  UNIQUE(invoice_id, reminder_type)
);

-- ACTIVITY LOG (Per Business Unit - but visible to Tria Ventures admin)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units,
  user_id UUID REFERENCES users,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP
);

-- CONSOLIDATED REPORTING (Parent-level, read-only)
CREATE VIEW consolidated_p_l AS
  SELECT 
    bu.id as business_unit_id,
    bu.name as business_unit_name,
    -- Income accounts (type='income')
    SUM(CASE WHEN a.type = 'income' THEN t.amount ELSE 0 END) as total_revenue,
    -- COGS accounts
    SUM(CASE WHEN a.type = 'cogs' THEN t.amount ELSE 0 END) as total_cogs,
    -- Expense accounts
    SUM(CASE WHEN a.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses
  FROM business_units bu
  LEFT JOIN accounts a ON a.business_unit_id = bu.id
  LEFT JOIN transactions t ON t.debit_account_id = a.id OR t.credit_account_id = a.id
  WHERE bu.organization_id = current_org_id
  GROUP BY bu.id, bu.name;
```

---

## Two Distinct Business Models

### TAI CHEW HARDWARE & TIMBER
**Model:** Cash retail, immediate payment

**Characteristics:**
- No credit terms → all sales are immediate (COD/cash/card)
- POS webhook integration required
- Daily cash reconciliation is critical
- Inventory: non-standard units (meters, liters, batches)
- No CRM tracking needed (retail, not relationship-based)
- Reports: daily cash flow, daily sales by category, POS vs manual

**Data Structure:**
- `contacts.price_tier` = NULL (not applicable)
- `contacts.credit_term` = NULL (always cash)
- `contacts.outstanding_balance` = always 0
- `invoices.due_date` = issue_date (immediate payment)
- `invoices.status` transitions: draft → sent → paid (no unpaid state)
- Uses `daily_cash_reconciliation` table

**Example Transaction:**
```
POS webhook: Customer buys hardware
→ Invoice created with status='sent'
→ Payment processed immediately (cash/card)
→ Invoice status='paid'
→ Money added to daily cash reconciliation
```

### BINTANG FLAVOURS
**Model:** B2B wholesale, credit-based sales

**Characteristics:**
- 4 distinct channels: Distributors, Wholesalers, HoReCa, Ecommerce
- Each channel has different pricing tiers
- Credit terms per customer (Net 30/60/90/COD)
- Strong CRM: every account has contact history, order history, balance
- Overdue tracking + automated reminder emails
- Reports: receivables aging (30/60/90), revenue by channel, top accounts

**Data Structure:**
- `contacts.price_tier` = 'distributor', 'wholesaler', 'horeca', 'ecommerce'
- `contacts.credit_term` = 'net_30', 'net_60', 'net_90', 'cod'
- `contacts.credit_limit` = max credit allowed
- `contacts.outstanding_balance` = sum of unpaid invoices
- `skus` has tiered pricing: distributor_price, wholesaler_price, horeca_price, ecommerce_price
- `invoices.due_date` = issue_date + credit_term (auto-calculated)
- `invoices.status` transitions: draft → sent → unpaid → paid_partial → paid OR overdue
- Uses `overdue_reminders` table for auto-emails

**Pricing Logic:**
When creating invoice:
1. System fetches customer's `price_tier`
2. Auto-populates line item price from matching tier (e.g., contact.price_tier='distributor' → use sku.distributor_price)
3. User can manually override price if needed (special deals, promotions)
4. Price tier used is stored in invoice line items for audit

**Example Transaction:**
```
New order from Distributor ABC:
1. Create invoice
2. Add SKU BF-001:
   - Distributor price: RM 35
   - Wholesaler price: RM 40
   - HoReCa price: RM 45
   - System auto-selects: RM 35 (contact tier = distributor)
3. Issue invoice with due_date = issue_date + Net 60 days
4. Send to customer
5. After 60 days, if unpaid → trigger overdue_reminder
6. Auto-send email: "Invoice ABC-001 is now 60 days overdue..."
7. Track outstanding balance on contact record
```

---

## Key Architectural Changes

### 1. Foreign Keys Changed
Every table now has **`business_unit_id`** instead of `company_id`:
- `transactions.business_unit_id`
- `contacts.business_unit_id`
- `invoices.business_unit_id`
- `expenses.business_unit_id`
- etc.

### 2. Multi-Entity Reporting
All reports can be filtered:
- **Single Unit:** `WHERE business_unit_id = [unit_id]`
- **Consolidated:** `WHERE business_unit_id IN (SELECT id FROM business_units WHERE organization_id = [tria_ventures_id])`

Example:
```sql
-- Bintang Flavours P&L
SELECT * FROM consolidated_p_l WHERE business_unit_id = 'BF-uuid'

-- All units consolidated
SELECT * FROM consolidated_p_l
```

### 3. User Permissions
```
Tria Ventures Admin (org_admin):
- Can see all business units
- Can view consolidated reports
- Can manage users across organization
- Can view all activity logs

Business Unit Admin (unit_admin):
- Can see only their unit
- Can manage their unit's team
- Can view their unit's reports
- Can approve transactions, invoices

Business Unit Staff (unit_staff):
- Can see only their unit
- Limited to operations (create invoices, log expenses)
- Cannot delete or manage users
```

### 4. Bank Account Per Unit
Each subsidiary has its own bank details:
```
Bintang Flavours:
- Maybank: 5641 9158 7752 (Tria Ventures)
- DuitNow: [QR code]

Prism (future):
- [Different Maybank account]
- [Different DuitNow]
```

When generating invoices, pull payment details from `bank_accounts` WHERE `business_unit_id = [invoicing_unit]`

---

## Module Details (Updated for Multi-Entity + Dual Models)

### MODULE 1: ACCOUNTING

**Features:**
- Separate Chart of Accounts per business unit
- Transaction ledger per unit
- GL entries auto-generated
- Consolidated P&L (holding company view)
- Intercompany transaction support (future)

**Tai Chew:**
- Daily cash reconciliation report
- Cash account cleared each day

**Bintang Flavours:**
- Receivables aging report (30/60/90 days overdue)
- Outstanding balance per customer

**Key Endpoints:**
```
GET    /api/ledger?business_unit_id=X     -- Single unit
GET    /api/ledger?consolidated=true      -- All units
POST   /api/transactions                   -- Create GL entry
GET    /api/accounts/chart                 -- Per unit or consolidated
GET    /api/daily-cash?business_unit_id=TC -- Tai Chew daily reconciliation
GET    /api/receivables-aging?business_unit_id=BF -- Bintang aging report
```

### MODULE 2: CRM

**Tai Chew (Minimal):**
- Basic contact records (optional for receipt/warranty)
- No purchase history tracking (retail)
- No pipeline

**Bintang Flavours (Critical):**
- Full contact profiles per distributor/wholesaler/HoReCa/ecommerce channel
- Complete purchase history (every order)
- Outstanding balance tracking
- Price tier + credit term per contact
- Sales pipeline (if prospecting new accounts)
- Follow-up reminders for collections

**Key Endpoints:**
```
GET    /api/contacts?business_unit_id=X
GET    /api/contacts?business_unit_id=BF&price_tier=distributor -- Filter by channel
GET    /api/contacts/[id]/orders
GET    /api/contacts/[id]/outstanding-balance
POST   /api/contacts/[id]/credit-limit-update
```

### MODULE 3: POS INTEGRATION

**Features:**
- Generic webhook receiver handles both Tai Chew POS and future Bintang ecommerce
- Webhook payload includes `business_unit_code` or inferred from terminal/store ID
- Auto-create transactions in correct unit
- Stock movements in correct unit

**Tai Chew POS Webhook:**
```json
{
  "business_unit_code": "TC",
  "order_id": "POS-TC-20260319-001",
  "channel": "pos",
  "customer": { "name": "Anonymous" },
  "items": [
    {
      "sku": "TC-HW-001",
      "quantity": 2,
      "unit_price": 45,
      "total": 90
    }
  ],
  "total": 90,
  "payment_method": "cash",
  "timestamp": "2026-03-19T11:30:00Z"
}
```

**Bintang Ecommerce Webhook (Future):**
```json
{
  "business_unit_code": "BF",
  "order_id": "SHOP-BF-20260319-001",
  "channel": "ecommerce",
  "customer": { "name": "Distributor ABC", "id": "[contact_id]" },
  "items": [...],
  "total": 5400,
  "payment_method": "bank_transfer",
  "timestamp": "2026-03-19T11:30:00Z"
}
```

Backend maps `business_unit_code` → `business_unit_id` before processing.

**Key Endpoints:**
```
POST   /api/webhooks/pos          -- Tai Chew POS
POST   /api/webhooks/ecommerce    -- Bintang Flavours online store
POST   /api/webhooks/shopee       -- Bintang Shopee
POST   /api/webhooks/lazada       -- Bintang Lazada
```

### MODULE 4: INVENTORY

**Tai Chew:**
- Non-standard units: meter, liter, batch, pack, box
- Cost price + single sale price
- Daily stock reconciliation (physical count vs system)

**Bintang Flavours:**
- Standard units: kg, liter, box, pack
- Cost price + tiered pricing (distributor/wholesaler/horeca/ecommerce)
- Stock levels per channel (if future: separate warehouses)

### MODULE 5: EXPENSES

All per business unit with optional rollup.

### MODULE 6: REPORTS & DASHBOARD

**Tai Chew Reports:**
- Daily cash flow (opening + sales - expenses = closing)
- Daily sales by category (hardware vs timber vs tools)
- POS vs manual sales breakdown
- Weekly/monthly cash summary

**Bintang Flavours Reports:**
- Receivables aging (0-30 days, 30-60 days, 60-90 days, >90 days)
- Revenue by channel (Distributors, Wholesalers, HoReCa, Ecommerce)
- Top accounts by volume/revenue
- Price tier performance (distributor vs wholesaler margin %)
- Outstanding balance per account

**Consolidated (Tria Ventures):**
- Combined P&L (Tai Chew cash profit + Bintang gross margin)
- Total receivables (Bintang only)
- Total cash position (Tai Chew daily + Bintang receivables)
- Revenue by subsidiary + channel

---

## Data Flow: Multi-Unit Example

**Scenario:** Bintang Flavours POS order

```
Bintang Flavours POS:
Order ID: POS-BF-001
Customer: Cafe XYZ
Items: BF-001 × 12 units
Total: RM 540

↓

Webhook Payload:
{
  "business_unit_code": "BF",
  "order_id": "POS-BF-001",
  "customer": { "name": "Cafe XYZ" },
  ...
}

↓

Backend Processing:
1. Look up: business_units WHERE code = 'BF' → id = [BF-uuid]
2. Create contact in Bintang Flavours (business_unit_id = [BF-uuid])
3. Create GL entries in Bintang Flavours:
   - Debit: Cash (1000) [BF account]
   - Credit: Revenue (4000) [BF account]
   - etc.
4. Log webhook in webhook_logs WHERE business_unit_id = [BF-uuid]

↓

Later - Prism POS order comes in:
- Webhook: business_unit_code = "PR"
- Creates separate contact/GL entries in Prism (business_unit_id = [PR-uuid])
- No mixing with Bintang Flavours data

↓

Tria Ventures Admin View:
- GET /api/reports/p-l?consolidated=true
- Sees combined: Revenue (Bintang Flavours + Prism)
- Can drill down: GET /api/reports/p-l?business_unit_id=[BF-uuid]
```

---

## User Permissions Matrix

| Action | Tria Admin | Unit Admin | Unit Staff |
|--------|-----------|-----------|-----------|
| View own unit data | ✅ | ✅ | ✅ |
| View all units | ✅ | ❌ | ❌ |
| Create invoice | ✅ | ✅ | ✅ |
| Delete invoice | ✅ | ✅ | ❌ |
| Manage users | ✅ | ✅* | ❌ |
| View activity log | ✅ | ✅* | ❌ |
| View consolidated reports | ✅ | ❌ | ❌ |
| Export P&L | ✅ | ✅* | ❌ |

*Unit Admin can only manage their own unit

---

## RLS Policies (Supabase)

```sql
-- Users can only see/edit their business unit's data
CREATE POLICY unit_isolation ON transactions
  USING (business_unit_id IN (
    SELECT business_unit_id FROM users WHERE id = auth.uid()
    UNION
    SELECT NULL FROM users WHERE role = 'org_admin' AND id = auth.uid()
  ));

-- Org admin sees everything
CREATE POLICY org_admin_access ON transactions
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'org_admin'
    )
  );
```

---

## Implementation Roadmap

### Phase 1: Foundation
- [ ] Create `organizations` and `business_units` tables
- [ ] Update `users` table with `business_unit_id` and `role`
- [ ] Add `bank_accounts` table
- [ ] Update all existing tables to include `business_unit_id`

### Phase 2: Migration
- [ ] Create initial business units (Bintang Flavours, Prism)
- [ ] Assign existing users to units
- [ ] Set up bank account records

### Phase 3: RLS
- [ ] Implement RLS policies for unit isolation
- [ ] Test cross-unit access is blocked

### Phase 4: API Updates
- [ ] Update all API endpoints to filter by `business_unit_id`
- [ ] Add `business_unit_id` to webhook processing

### Phase 5: Reporting
- [ ] Build consolidated views
- [ ] Add unit filter to all reports

---

## Success Criteria

- [x] Architecture supports multiple business units
- [x] Users see only their assigned unit's data
- [x] Org admin sees consolidated across all units
- [x] Bank details are per-unit
- [x] Reports can drill down or roll up
- [x] RLS prevents cross-unit access

---

## Future Enhancements

- Intercompany transactions (transfer funds between units)
- Consolidated tax reporting
- Parent-level purchase orders (negotiate with suppliers)
- Group cash management
- Subsidiary performance dashboards

---

## Notes

This architecture is **future-proof**. Adding a new subsidiary (e.g., "Prism") is as simple as:
1. CREATE business_unit record
2. CREATE chart of accounts for that unit
3. Assign user to unit
4. Done—all modules automatically available

The system scales from 1 entity (Bintang Flavours only) to 10+ subsidiaries without code changes.
