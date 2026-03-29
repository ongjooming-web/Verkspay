# Bintang Flavours Business OS - Complete Specification

**Status:** Major Pivot - From Freelance Invoicing → Internal ERP  
**Date:** 2026-03-19  
**Version:** 1.0

---

## Executive Summary

Verkspay is now **Bintang Flavours' internal business operating system**. It consolidates accounting, CRM, POS integration, inventory, expenses, and reporting into a single platform.

**Core Goal:** Real-time visibility into sales, costs, margins, and customer relationships across all channels (POS, Shopee, Lazada, direct).

---

## System Architecture

### Tech Stack
- **Frontend:** Next.js 15 + React + Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** Supabase (PostgreSQL) + RLS
- **Auth:** Supabase Auth (multi-user, role-based)
- **Currency:** MYR primary (no USD)
- **Webhooks:** Generic webhook receiver for POS/Shopee/Lazada

### Database Schema (New)

```sql
-- CORE ENTITIES
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name TEXT,
  currency TEXT DEFAULT 'MYR',
  created_at TIMESTAMP
);

CREATE TABLE users (
  id UUID PRIMARY KEY (from Supabase auth),
  company_id UUID REFERENCES companies,
  role TEXT ('admin', 'staff'),
  created_at TIMESTAMP
);

-- CHART OF ACCOUNTS
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  code TEXT, -- GL code (e.g. 1000, 5000)
  name TEXT, -- Account name
  type TEXT, -- 'asset', 'liability', 'equity', 'income', 'expense', 'cogs'
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP
);

-- TRANSACTION LEDGER
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  date DATE,
  description TEXT,
  reference TEXT, -- Invoice/order number
  debit_account_id UUID REFERENCES accounts,
  credit_account_id UUID REFERENCES accounts,
  amount NUMERIC,
  source TEXT, -- 'invoice', 'expense', 'pos', 'shopee', 'lazada', 'manual'
  source_id UUID, -- Links to originating document
  created_by UUID REFERENCES users,
  created_at TIMESTAMP
);

-- CRM: CONTACTS
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  type TEXT, -- 'b2b' (cafes, retailers), 'b2c' (repeat customers)
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  tags JSONB, -- ['wholesale', 'KL', 'prospect', etc]
  status TEXT, -- 'prospect', 'contacted', 'sampled', 'active', 'churned'
  last_contacted_at TIMESTAMP,
  created_at TIMESTAMP
);

-- CRM: PURCHASE HISTORY
CREATE TABLE customer_orders (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts,
  order_date DATE,
  channel TEXT, -- 'pos', 'shopee', 'lazada', 'direct'
  items JSONB, -- [{sku, qty, unit_price, total}, ...]
  total_amount NUMERIC,
  payment_status TEXT, -- 'unpaid', 'partial', 'paid'
  amount_paid NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP
);

-- CRM: FOLLOW-UP REMINDERS
CREATE TABLE contact_reminders (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts,
  reminder_date DATE,
  reminder_type TEXT, -- 'follow_up', 'check_in', 'sample'
  status TEXT, -- 'pending', 'completed', 'skipped'
  completed_at TIMESTAMP,
  created_at TIMESTAMP
);

-- INVENTORY: SKU CATALOG
CREATE TABLE skus (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  sku_code TEXT UNIQUE, -- 'BF-001', 'BF-002', etc
  name TEXT, -- Product name
  cost_price NUMERIC, -- Per unit
  sale_price NUMERIC, -- Per unit (can vary by channel)
  unit TEXT, -- 'bottle', 'box', 'pack'
  current_stock INT,
  reorder_level INT, -- Alert when below this
  supplier_id UUID REFERENCES contacts,
  created_at TIMESTAMP
);

-- INVENTORY: STOCK TRACKING
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  sku_id UUID REFERENCES skus,
  movement_type TEXT, -- 'purchase', 'sale', 'adjustment', 'damage'
  quantity INT,
  reference TEXT, -- Order/PO number
  notes TEXT,
  created_at TIMESTAMP
);

-- EXPENSES
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  date DATE,
  category TEXT, -- 'ingredients', 'packaging', 'logistics', 'marketing', 'utilities'
  amount NUMERIC,
  description TEXT,
  vendor_id UUID REFERENCES contacts,
  receipt_url TEXT, -- Attachment
  notes TEXT,
  created_by UUID REFERENCES users,
  created_at TIMESTAMP
);

-- INVOICES (SIMPLIFIED - for B2B sales)
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  contact_id UUID REFERENCES contacts,
  invoice_number TEXT UNIQUE,
  issue_date DATE,
  due_date DATE,
  items JSONB, -- [{sku_id, qty, unit_price, total}, ...]
  subtotal NUMERIC,
  tax NUMERIC,
  total NUMERIC,
  status TEXT, -- 'draft', 'sent', 'unpaid', 'paid_partial', 'paid'
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT, -- 'maybank_transfer', 'duitnow', 'other'
  notes TEXT,
  created_at TIMESTAMP
);

-- PURCHASE ORDERS (FOR SUPPLIERS)
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES contacts,
  po_number TEXT UNIQUE,
  order_date DATE,
  expected_delivery DATE,
  items JSONB, -- [{sku_id, qty, unit_cost, total}, ...]
  total NUMERIC,
  status TEXT, -- 'draft', 'sent', 'received', 'invoiced'
  received_date DATE,
  created_at TIMESTAMP
);

-- WEBHOOK LOG (for debugging POS/Shopee/Lazada integrations)
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  source TEXT, -- 'pos', 'shopee', 'lazada'
  event_type TEXT, -- 'order.created', 'order.paid', etc
  payload JSONB,
  status TEXT, -- 'received', 'processed', 'failed'
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP
);

-- ACTIVITY LOG (for team accountability)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  user_id UUID REFERENCES users,
  action TEXT, -- 'created_invoice', 'marked_paid', 'logged_expense', etc
  entity_type TEXT, -- 'invoice', 'expense', 'contact'
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP
);
```

---

## Module Details

### MODULE 1: ACCOUNTING ⭐ PRIORITY 1

**Core Features:**
- Chart of Accounts (assets, liabilities, income, COGS, expenses)
- Double-entry transaction ledger
- Auto-generate GL entries from:
  - POS orders (debit cash, credit revenue)
  - Expenses (debit expense account, credit cash/payables)
  - Inventory purchases (debit inventory, credit payables)
  - Invoices (debit receivables, credit revenue)

**Key Endpoints:**
- `POST /api/transactions/create` — Manual entry
- `GET /api/ledger` — View transaction history
- `GET /api/accounts/chart` — View COA with balances
- `POST /api/transactions/batch` — Called by webhooks

**Reports:**
- P&L (Income - COGS - Expenses = Profit)
- Cash position (assets vs liabilities)
- Receivables aging (unpaid invoices by age)

---

### MODULE 2: CRM ⭐ PRIORITY 2

**Contact Types:**
- **B2B:** Cafes, restaurants, retailers (wholesale customers)
- **B2C:** Repeat retail customers

**Features:**
- Full contact profile (name, phone, address, tags)
- Purchase history (linked to every order)
- Sales pipeline: Prospect → Contacted → Sampled → Active → Churned
- Follow-up reminders (when to contact next)
- Notes + last contacted timestamp

**Key Endpoints:**
- `GET/POST /api/contacts` — CRUD
- `GET /api/contacts/[id]/orders` — Purchase history
- `GET /api/contacts/pipeline` — Pipeline view by stage
- `POST /api/contacts/[id]/reminder` — Set follow-up

---

### MODULE 3: POS INTEGRATION ⭐ PRIORITY 1

**Architecture:**
Generic webhook receiver that accepts orders from any channel and auto-creates accounting entries.

**Webhook Endpoint:**
```
POST /api/webhooks/pos
POST /api/webhooks/shopee
POST /api/webhooks/lazada
```

**Webhook Payload (normalized across all channels):**
```json
{
  "order_id": "POS-20260319-001",
  "channel": "pos",
  "customer": {
    "name": "Cafe XYZ",
    "phone": "0123456789"
  },
  "items": [
    {
      "sku": "BF-001",
      "quantity": 12,
      "unit_price": 45,
      "total": 540
    }
  ],
  "total": 540,
  "payment_status": "paid",
  "timestamp": "2026-03-19T11:30:00Z"
}
```

**Auto-Actions on webhook:**
1. Create/update contact (if new)
2. Create transaction record
3. Deduct from inventory
4. Create GL entries:
   - Debit: Cash/Bank (receivables)
   - Credit: Revenue
   - Debit: COGS
   - Credit: Inventory
5. Log in webhook_log for audit trail

**Multi-Channel Support:**
- POS systems (various brands)
- Shopee API
- Lazada API
- Future: TikTok Shop, offline orders

---

### MODULE 4: INVENTORY

**SKU Catalog:**
- Cost price (per unit)
- Sale price (can differ by channel)
- Current stock level
- Reorder point (alert when below)
- Supplier link

**Stock Movements:**
- Purchase: +stock (on received PO)
- Sale: -stock (on confirmed order)
- Adjustment: Manual stock count correction
- Damage/waste: Write-off

**COGS Calculation:**
On each sale, automatically:
- Deduct stock
- Calculate COGS = cost_price × quantity
- Create GL entry (debit COGS, credit Inventory)

---

### MODULE 5: EXPENSES

**Expense Types:**
- Ingredients/raw materials
- Packaging
- Logistics/shipping
- Marketing
- Utilities/rent
- Other

**Features:**
- Log expense with amount, date, category
- Attach receipt photo
- Link to supplier/vendor in CRM
- Monthly summary by category
- GL integration (debit expense account, credit cash)

---

### MODULE 6: REPORTS DASHBOARD

**Available Reports:**
1. **P&L (Monthly/Quarterly/Annual)**
   - Revenue (by channel)
   - COGS (auto-calculated)
   - Gross margin %
   - Operating expenses (by category)
   - Net profit

2. **Revenue Breakdown**
   - By channel (POS, Shopee, Lazada, direct)
   - By SKU (top performers)
   - By customer (top B2B buyers)

3. **Profitability**
   - Margin by SKU (revenue - COGS)
   - Margin by channel

4. **Cash Flow**
   - 30/60/90 day trend
   - Outstanding receivables
   - Payables aging

5. **Inventory Status**
   - Stock levels vs reorder points
   - Low stock alerts
   - Inventory valuation (FIFO/LIFO)

6. **Customer Metrics**
   - Active vs churned
   - LTV (lifetime value)
   - Repeat purchase rate

---

### MODULE 7: TEAM

**User Roles:**
- **Admin:** Full access, can manage users, edit settings
- **Staff:** Can create invoices, log expenses, but not delete/edit others' work

**Features:**
- 2-5 user accounts
- Task assignment (linked to customers or orders)
- Activity log (who created/edited/deleted what, when)
- Audit trail for compliance

---

## Build Order (Phased)

### PHASE 1: Foundation + POS Integration (Weeks 1-2)
**Goal:** Auto-create accounting entries from POS orders
- [ ] Database schema setup
- [ ] User/company multi-tenancy
- [ ] Generic webhook receiver (`POST /api/webhooks/[source]`)
- [ ] Auto-create transactions on order received
- [ ] Stock deduction
- [ ] GL entry auto-generation

**Success Criteria:**
- Send test webhook → invoice in accounting, stock updated, GL balanced

### PHASE 2: CRM + Purchase History (Week 3)
**Goal:** Know customer details and buying patterns
- [ ] Contact CRUD
- [ ] Purchase history per contact
- [ ] Pipeline management
- [ ] Follow-up reminders

**Success Criteria:**
- View customer profile + all their orders

### PHASE 3: Inventory + COGS (Week 4)
**Goal:** Track stock and auto-calculate costs
- [ ] SKU catalog
- [ ] Cost/sale pricing per channel
- [ ] Stock tracking
- [ ] COGS auto-calculation on orders
- [ ] Low stock alerts

**Success Criteria:**
- Create order → COGS auto-calculated, stock auto-deducted

### PHASE 4: Reports Dashboard (Week 5)
**Goal:** Real-time business visibility
- [ ] P&L report
- [ ] Revenue by channel
- [ ] Top SKUs
- [ ] Cash flow

**Success Criteria:**
- View monthly P&L with all channels

### PHASE 5: Expenses (Week 6)
**Goal:** Track all costs
- [ ] Expense logging
- [ ] Receipt attachments
- [ ] GL integration
- [ ] Monthly summary

**Success Criteria:**
- Log expense → appears in P&L

### PHASE 6: Team + Activity Log (Week 7)
**Goal:** Multi-user accountability
- [ ] Role-based access
- [ ] Activity log
- [ ] Task assignment

**Success Criteria:**
- Multi-user login, see who did what

---

## Key API Endpoints (by priority)

### PHASE 1
```
POST   /api/webhooks/pos          — Receive POS order
POST   /api/webhooks/shopee       — Receive Shopee order
POST   /api/webhooks/lazada       — Receive Lazada order
POST   /api/transactions          — Create manual GL entry
GET    /api/ledger                — View transactions
GET    /api/accounts/chart        — View COA
```

### PHASE 2
```
GET/POST /api/contacts            — Contact CRUD
GET    /api/contacts/[id]/orders  — Purchase history
GET    /api/contacts/pipeline     — Pipeline view
POST   /api/contacts/[id]/reminder — Set follow-up
```

### PHASE 3
```
GET/POST /api/skus                — SKU CRUD
GET    /api/inventory             — Stock levels
GET    /api/inventory/alerts      — Low stock
```

### PHASE 4
```
GET    /api/reports/p-l           — P&L report
GET    /api/reports/revenue       — Revenue breakdown
GET    /api/reports/cash-flow     — Cash flow
```

### PHASE 5
```
GET/POST /api/expenses            — Expense CRUD
GET    /api/expenses/summary      — Monthly summary
```

### PHASE 6
```
GET    /api/activity-log          — Activity trail
POST   /api/tasks                 — Task assignment
```

---

## Data Flow Example: POS Order → Accounting Entry

```
POS Terminal Sale:
Customer: Cafe XYZ
Items: BF-001 (cost 30, sell 45) × 12 units
Total: RM 540

↓

Webhook Payload → POST /api/webhooks/pos
{
  order_id: "POS-20260319-001",
  customer: { name: "Cafe XYZ" },
  items: [{ sku: "BF-001", qty: 12, unit_price: 45, total: 540 }],
  total: 540,
  timestamp: ...
}

↓

Backend Processing:
1. Find/create contact: Cafe XYZ
2. Create customer_order record
3. Deduct inventory: BF-001 -= 12
4. Create GL transactions:
   a. Debit: Cash (1000) RM 540
      Credit: Revenue (4000) RM 540
   b. Debit: COGS (5000) RM 360 (30 × 12)
      Credit: Inventory (1500) RM 360
5. Log webhook_logs entry
6. Post activity: "User X processed POS order POS-20260319-001"

↓

Result in System:
- Cafe XYZ contact created with 1 order
- Inventory: BF-001 now at current_stock - 12
- GL Ledger shows:
  - Cash: +540
  - Revenue: +540
  - COGS: +360
  - Inventory: -360
- P&L auto-updates (Revenue 540 - COGS 360 = GP 180)
```

---

## Key Design Principles

1. **Generic Webhook System:** Any channel (POS, Shopee, Lazada, future) posts normalized JSON → backend handles consistently
2. **Double-Entry Accounting:** Every transaction creates debit/credit entries that balance
3. **Auto-Calculation:** COGS, margins, profits calculated automatically from source data
4. **Audit Trail:** Every action logged (who, what, when)
5. **Multi-Tenancy:** Multiple companies can use same system (each company has own data)
6. **Real-Time:** Dashboard updates immediately as orders come in

---

## Success Metrics (Post-Launch)

- All orders from POS/Shopee/Lazada flowing into ledger (100% accuracy)
- Inventory stock matches physical count (daily)
- P&L numbers match manual accounting (to RM)
- Team can see customer purchase history instantly
- Cash flow projections accurate within 5%
- Zero duplicate orders across channels

---

## NOT Included (Out of Scope)

- ❌ Payroll/HR
- ❌ Banking integration (auto-import bank statements)
- ❌ Tax/GST calculation (manual for now)
- ❌ Forecasting/ML
- ❌ Multi-location support (single location only)
- ❌ Barcode scanning (manual entry)

---

## Next Steps

**Immediately:** Set up database schema (can use Supabase migrations)  
**Week 1:** Build webhook receiver + transaction auto-creation  
**Week 2:** CRM module  
**Week 3-4:** Inventory + reports  
**Week 5-6:** Polish + team management  

This document is the complete specification. Each phase has clear success criteria and API contracts.
