# Data Aggregation API Endpoint - Complete ✅

## File Created
`prism/src/app/api/insights/data/route.ts`

## Endpoint
- **Route:** `GET /api/insights/data`
- **Authentication:** Bearer token (Authorization header)
- **Response:** Comprehensive `InsightsData` object for AI analysis

## What It Does

This endpoint aggregates all business invoice data into a single JSON response that Claude can analyze. It's the data layer for the AI insights feature — no API calls to Claude happen here, just pure data preparation.

### Query Flow

1. **Auth verification** → Validates Bearer token
2. **Profile fetch** → Gets user's account age & preferred currency
3. **Invoices fetch** → Queries all user invoices with client JOIN
4. **Data aggregation** → Processes 6 data categories:
   - Revenue totals (paid, pending, overdue)
   - Invoice statistics (counts, averages, min/max)
   - Client breakdown (per-client metrics)
   - Payment patterns (on-time/late rates, methods)
   - Monthly timeline (last 6 months)
   - Metadata (account age, timestamp)

## Edge Cases Handled

✅ **New users** → Returns zeroed-out data structure (no errors)
✅ **No invoices** → Returns valid response with all counts at 0
✅ **Missing due_dates** → Excluded from on-time/late calculations
✅ **Missing paid_dates** → Excluded from payment timing calculations
✅ **Draft invoices** → Counted separately, excluded from revenue/pending
✅ **Partial payments** → Tracked via `remaining_balance`
✅ **Multiple currencies** → Most-used currency determined automatically
✅ **Empty payment methods** → Defaults to 'unknown'
✅ **No clients with invoices** → Empty clients array returned

## Response Structure

```typescript
{
  revenue: {
    total_paid: number;        // Sum of all paid invoices
    total_pending: number;     // Sum of non-overdue unpaid amounts
    total_overdue: number;     // Sum of past-due unpaid amounts
    currency_code: string;     // Most frequently used (e.g., "USD")
  },
  
  invoices: {
    total_count: number;       // All invoices (including drafts)
    paid_count: number;        // Status = 'paid'
    pending_count: number;     // Unpaid, not overdue
    overdue_count: number;     // Due date passed
    draft_count: number;       // Status = 'draft'
    average_amount: number;    // Mean invoice value
    largest_invoice: number;   // Max invoice amount
    smallest_invoice: number;  // Min invoice amount
  },
  
  clients: [
    {
      client_id: string;
      client_name: string;
      total_invoices: number;
      total_revenue: number;        // Sum of all invoice amounts
      paid_invoices: number;
      overdue_invoices: number;
      average_payment_days: number | null;  // Avg days from creation to paid
      last_invoice_date: string | null;    // ISO date
      outstanding_balance: number;  // Unpaid amount
    }
  ],
  
  payments: {
    on_time_count: number;          // Paid by or before due_date
    late_count: number;             // Paid after due_date
    average_days_to_payment: number | null;  // Avg days to payment (all)
    payment_methods: [
      { method: string; count: number }
    ]
  },
  
  monthly_revenue: [
    {
      month: string;          // "2026-03" format
      invoiced: number;       // Total invoices created that month
      collected: number;      // Total paid invoices created that month
      invoice_count: number;  // Count of invoices
    }
  ],
  
  account_age_days: number;   // Days since account creation
  data_generated_at: string;  // ISO timestamp
}
```

## Key Implementation Details

### Authentication
Uses existing auth pattern from Prism:
```typescript
const { user, error: authError } = await requireAuth(request)
```
- Validates Bearer token from Authorization header
- Returns 401 if missing or invalid
- Extracts user ID for row-level data filtering

### Database Query
Single optimized query with client JOIN:
```typescript
await supabase
  .from('invoices')
  .select(`...`, clients:client_id(id, name))
  .eq('user_id', userId)
```

### Calculations
- **Revenue splits:** Logic compares `status` and `due_date` with current date
- **Payment timing:** Calculates `(paid_date - created_at)` in days
- **Client aggregation:** Groups by `client_id`, accumulates metrics
- **Monthly buckets:** Extracts "YYYY-MM" from `created_at`, initializes 6 months
- **Currency preference:** Counts occurrences, uses most frequent

### Error Handling
- 401 for auth failures
- 500 for Supabase errors
- Empty-but-valid response for zero invoices (not an error case)
- Graceful parsing of null/missing fields

## Testing

To test the endpoint:

```bash
curl -X GET http://localhost:3000/api/insights/data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response: Full `InsightsData` JSON object

## Next Steps

This endpoint is ready to be called by Claude (or any AI model) for business insights. The frontend/client can use it like:

```typescript
const response = await fetch('/api/insights/data', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const data: InsightsData = await response.json()
// Pass to Claude for analysis
```

The data is normalized, typed, and ready for analysis. 🚀
