# Tria Ventures Holding Company OS - Complete Specification

**Status:** Enterprise ERP for Holding Company + Subsidiaries  
**Date:** 2026-03-19  
**Version:** 2.0 (Multi-Entity Architecture)

---

## Executive Summary

**Tria Ventures** is a holding company with multiple subsidiaries (Bintang Flavours, Prism, future ventures). This OS provides:

1. **Parent-Level Visibility:** Tria Ventures admin sees consolidated financials across all entities
2. **Entity-Level Operations:** Each subsidiary operates independently with their own accounting, CRM, inventory
3. **Flexible Reporting:** Roll-up reports (all units) or drill-down (single unit)
4. **Multi-Account Banking:** Each subsidiary has its own bank details and payment methods

**Core Goal:** Single platform for holding company financial control + operational independence per entity.

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
  sku_code TEXT, -- 'BF-001'
  name TEXT,
  cost_price NUMERIC,
  sale_price NUMERIC,
  unit TEXT,
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
  due_date DATE,
  items JSONB,
  subtotal NUMERIC,
  tax NUMERIC,
  total NUMERIC,
  status TEXT,
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT,
  payment_bank_account_id UUID REFERENCES bank_accounts,
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

## Module Details (Updated for Multi-Entity)

### MODULE 1: ACCOUNTING

**Features:**
- Separate Chart of Accounts per business unit
- Transaction ledger per unit
- GL entries auto-generated
- Consolidated P&L (hold company view)
- Intercompany transaction support (future)

**Key Endpoints:**
```
GET    /api/ledger?business_unit_id=X     -- Single unit
GET    /api/ledger?consolidated=true      -- All units
POST   /api/transactions                   -- Create GL entry
GET    /api/accounts/chart                 -- Per unit or consolidated
```

### MODULE 2: CRM

**Features:**
- Contacts per business unit (can't mix Bintang Flavours customers with Prism leads)
- Purchase history linked to unit
- Pipeline management per unit

**Key Endpoints:**
```
GET    /api/contacts?business_unit_id=X
POST   /api/contacts                      -- Creates for user's assigned unit
GET    /api/contacts/[id]/orders
```

### MODULE 3: POS INTEGRATION

**Features:**
- Webhook payload includes `business_unit_id` or inferred from store/channel mapping
- Auto-create transactions in correct unit
- Stock movements in correct unit

**Webhook Enhancement:**
```json
{
  "business_unit_code": "BF",  // or infer from POS terminal ID
  "order_id": "POS-20260319-001",
  "channel": "pos",
  ...
}
```

Backend maps `business_unit_code` → `business_unit_id` before processing.

### MODULE 4-6: INVENTORY, EXPENSES, REPORTS

All operate per business unit with optional rollup.

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
