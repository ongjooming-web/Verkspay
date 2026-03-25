# Prism Phase 3: AI Business Insights — Coding Agent Prompts (Updated)

Includes: Rate limiting per plan + 15-day free trial model (no free tier).

Use these prompts in order with your coding agent. Each is self-contained and copy-pasteable.

---

## PROMPT 0: Schema Migration — Trial & Usage Tracking

```
I need to add trial tracking and AI usage tracking to my Supabase database. This supports a 15-day free trial model (no free tier) and rate-limited AI features.

Current context: I have a users table and an invoices table. Users currently have no plan/subscription tracking.

Create a migration file at: supabase-migrations/[timestamp]_add_trial_and_usage_tracking.sql

What it should do:

1. Add these columns to the users table (or profiles table — check which one stores user metadata in my app):

 -- Subscription & trial
 plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
 trial_start_date TIMESTAMP DEFAULT NOW(),
 trial_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '15 days'),
 trial_expired BOOLEAN DEFAULT FALSE,
 stripe_subscription_id TEXT, -- for future Stripe billing integration

 -- AI usage tracking
 insights_generated_count INTEGER DEFAULT 0,
 insights_usage_reset_date TIMESTAMP DEFAULT DATE_TRUNC('month', NOW()),

2. All columns should be nullable or have sensible defaults so existing users aren't broken.

3. For existing users already in the database: they should default to 'trial' plan with trial_start_date = NOW() (giving them a fresh 15-day trial from the moment this migration runs).

4. Add a comment documenting the plan limits:
 -- Plan limits for AI Insights:
 -- trial: 10/month (full Pro access for 15 days)
 -- starter: 10/month
 -- pro: 30/month
 -- enterprise: unlimited

Do NOT create any new tables. Just add columns to the existing user/profile table.
Do NOT modify any existing columns.
```

---

## PROMPT 1: Data Aggregation API Endpoint

```
I need to create an API endpoint that aggregates business data for AI analysis. This collects all the raw data that Claude will later analyze.

Stack: Next.js App Router, Supabase, TypeScript.

Create this endpoint:

FILE: app/api/insights/data/route.ts

GET /api/insights/data

Authentication: Use the same Supabase auth pattern as my other working API routes (Bearer token in Authorization header, same client initialization).

This endpoint queries the authenticated user's data and returns a comprehensive summary:

```ts
type InsightsData = {
 // Revenue overview
 revenue: {
 total_paid: number;
 total_pending: number;
 total_overdue: number;
 currency_code: string; // most used currency
 };

 // Invoice stats
 invoices: {
 total_count: number;
 paid_count: number;
 pending_count: number;
 overdue_count: number;
 draft_count: number;
 average_amount: number;
 largest_invoice: number;
 smallest_invoice: number;
 };

 // Client breakdown
 clients: {
 client_id: string;
 client_name: string;
 total_invoices: number;
 total_revenue: number;
 paid_invoices: number;
 overdue_invoices: number;
 average_payment_days: number | null; // avg days between invoice creation and paid_date
 last_invoice_date: string | null;
 outstanding_balance: number;
 }[];

 // Payment patterns
 payments: {
 on_time_count: number; // paid before or on due_date
 late_count: number; // paid after due_date
 average_days_to_payment: number | null;
 payment_methods: { method: string; count: number }[];
 };

 // Timeline data (last 6 months)
 monthly_revenue: {
 month: string; // "2026-01", "2026-02", etc.
 invoiced: number; // total amount of invoices created
 collected: number; // total amount actually paid
 invoice_count: number;
 }[];

 // Metadata
 account_age_days: number; // days since first invoice
 data_generated_at: string; // ISO timestamp
};
```

Query logic:
1. Fetch all invoices for the user (JOIN with clients table to get client names)
2. Calculate revenue totals by status
3. Group by client for client breakdown
4. For payment timing: compare paid_date vs due_date to determine on-time vs late
5. For monthly revenue: group invoices by month of created_at (last 6 months)
6. For average_payment_days per client: calculate the difference between created_at and paid_date for paid invoices

Handle edge cases:
- New users with no invoices: return zeroed-out data, don't error
- Invoices with no due_date: exclude from on-time/late calculations
- Invoices with no paid_date: exclude from payment timing calculations

Return as JSON. This endpoint does NOT call Claude — it just prepares the data.
```

---

## PROMPT 2: AI Insights Generation Endpoint (with Rate Limiting)

```
I need to create an API endpoint that takes business data and sends it to Claude for analysis. This includes rate limiting based on the user's plan.

Stack: Next.js App Router, TypeScript, Supabase.

Create this endpoint:

FILE: app/api/insights/generate/route.ts

POST /api/insights/generate

Authentication: Same pattern as other routes (Bearer token).

STEP 1 — CHECK TRIAL & PLAN STATUS:
1. Fetch the user's record from the users/profiles table (whichever has the plan columns from the migration)
2. If plan is 'trial':
 - Check if trial_end_date < NOW()
 - If expired: return 403 with { error: "trial_expired", message: "Your 15-day trial has ended. Choose a plan to continue using AI Insights.", trial_ended: true }
 - If still active: continue (treat as Pro-level access)
3. Get the user's plan for rate limit checking

STEP 2 — CHECK RATE LIMIT:
1. Check insights_usage_reset_date — if it's a different month than the current month, reset insights_generated_count to 0 and update insights_usage_reset_date to the start of the current month
2. Check insights_generated_count against the plan limit:
 - trial: 10/month
 - starter: 10/month
 - pro: 30/month
 - enterprise: unlimited (skip check)
3. If over limit: return 429 with { error: "rate_limit", message: "You've used all your AI Insights for this month. Upgrade your plan for more.", used: count, limit: planLimit, resets_at: "first of next month ISO date" }

STEP 3 — GENERATE INSIGHTS:
1. Call the data aggregation logic (reuse the same queries from /api/insights/data — import the function directly, don't make an HTTP call to yourself)
2. Send the data to Claude API:
 - Use direct fetch to https://api.anthropic.com/v1/messages
 - Model: "claude-haiku-4-5-20251001"
 - API key from environment variable: ANTHROPIC_API_KEY
 - Max tokens: 2000
 - Headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }

System prompt for Claude:
```
You are a business analyst for a freelancer's invoicing platform. Analyze the provided business data and generate actionable insights.

Respond ONLY with valid JSON, no markdown, no code blocks, no preamble. Use this exact structure:
{
 "summary": "2-3 sentence executive summary of the business health",
 "highlights": [
 {
 "type": "positive" | "warning" | "action",
 "title": "Short title",
 "description": "1-2 sentence insight"
 }
 ],
 "client_insights": [
 {
 "client_name": "Name",
 "health": "good" | "attention" | "at_risk",
 "note": "1 sentence about this client"
 }
 ],
 "recommendations": [
 "Actionable recommendation 1",
 "Actionable recommendation 2",
 "Actionable recommendation 3"
 ],
 "revenue_trend": "growing" | "stable" | "declining"
}

Rules:
- Be specific with numbers and names, not vague
- Flag clients with overdue invoices or declining payment patterns
- Suggest concrete actions (follow up with X, adjust terms for Y)
- Keep highlights to 3-5 items max
- Keep recommendations to 3-5 items max
- If there's very little data (< 3 invoices), say so and give basic advice
- Use the user's currency in any amounts you mention
```

User message: `Here is my business data: ${JSON.stringify(insightsData)}`

STEP 4 — UPDATE USAGE & RETURN:
1. Increment insights_generated_count by 1 in the database
2. Parse Claude's JSON response (strip any ```json ``` wrappers if present before parsing)
3. Return the parsed insights JSON along with usage info:
```json
{
 "insights": { ... Claude's response ... },
 "usage": {
 "used": currentCount + 1,
 "limit": planLimit,
 "plan": userPlan
 }
}
```

Error handling:
- If Claude API fails: return 500 with { error: "ai_error", message: "Failed to generate insights. Please try again." }
- If data fetch fails: return 500 with { error: "data_error", message: "Failed to fetch business data." }
- If ANTHROPIC_API_KEY is not set: return 500 with { error: "config_error", message: "AI service not configured." }
- All errors should be caught in a try/catch that logs the actual error to console

Environment variable needed: ANTHROPIC_API_KEY
```

---

## PROMPT 3: Insights Page (Full Breakdown)

```
I need to create a dedicated Insights page for my invoicing app.

Stack: Next.js App Router, TypeScript, Tailwind CSS.
Current app style: Dark theme (dark backgrounds, similar to the existing invoices page).

Create this page:

FILE: src/app/insights/page.tsx

The page should have:

1. HEADER SECTION:
 - Page title: "Business Insights" with a sparkle/brain emoji ✨
 - Subtitle: "AI-powered analysis of your business data"
 - "Generate Insights" button (primary/accent color, prominent)
 - Show usage counter next to the button: "3 of 10 used this month" (from the usage data in the API response)
 - When clicked: calls POST /api/insights/generate with Bearer token (same auth pattern as other pages)
 - Show a loading state while generating (spinner + "Analyzing your data..." text)

2. EMPTY STATE (before first generation):
 - Friendly message: "Click 'Generate Insights' to get an AI-powered analysis of your invoicing data"
 - Maybe a simple icon or illustration

3. RESULTS DISPLAY (after generation):

 a. EXECUTIVE SUMMARY card:
 - Display the "summary" text prominently
 - Show "revenue_trend" as a badge (green for growing, yellow for stable, red for declining)

 b. HIGHLIGHTS section:
 - Card for each highlight
 - Color-coded by type: green border/accent for "positive", yellow for "warning", red/orange for "action"
 - Show title bold, description below
 - Use appropriate icons or colored dots (checkmark for positive, warning triangle for warning, arrow for action)

 c. CLIENT HEALTH section:
 - Table or card list showing each client
 - Health indicator: green dot for "good", yellow for "attention", red for "at_risk"
 - Show the note next to each client

 d. RECOMMENDATIONS section:
 - Numbered list of actionable recommendations
 - Clean, readable formatting

4. ERROR STATES:
 - Trial expired (403 trial_expired): Show a message "Your 15-day trial has ended" with a "View Plans" button linking to /pricing
 - Rate limited (429 rate_limit): Show "You've used all X insights this month. Resets on [date]." with "Upgrade Plan" button
 - API error (500): Show "Something went wrong. Please try again." with a retry button

5. NAVIGATION:
 - Add "Insights" to the main nav bar (between existing nav items — look at the current nav component and add it there)

6. STYLING:
 - Match the existing dark theme of the app exactly
 - Use the same card styles, fonts, spacing as other pages
 - Make it responsive (works on mobile)

7. STATE MANAGEMENT:
 - Store the generated insights in component state (useState)
 - Store usage info (used/limit/plan) in state too, update after each generation
 - No need to persist to database — insights regenerate each time

Don't import any new UI libraries — use Tailwind and existing patterns from the app.
```

---

## PROMPT 4: Dashboard Summary Widget

```
I need to add an AI Insights summary widget to the existing dashboard page.

Look at the current dashboard page (likely src/app/dashboard/page.tsx or src/app/page.tsx — find whichever file renders the main dashboard).

Add a new section/card to the dashboard:

1. INSIGHTS SUMMARY CARD:
 - Title: "AI Insights" with a sparkle emoji ✨
 - "Generate" button (smaller than the one on the full insights page)
 - Show usage: "X of Y used"
 - When clicked: calls POST /api/insights/generate (same endpoint, same auth)
 - Loading state while generating

2. AFTER GENERATION, show:
 - The executive summary text (2-3 sentences)
 - The revenue trend badge (growing/stable/declining)
 - Top 2 highlights only (not all of them)
 - A "View All Insights →" link that navigates to /insights

3. ERROR HANDLING:
 - Trial expired: show "Trial ended" with link to /pricing
 - Rate limited: show "X/Y insights used this month" with upgrade link
 - API error: show "Could not generate insights" with retry option

4. COMPACT DESIGN:
 - This is a summary widget, not the full page — keep it compact
 - Should fit naturally among other dashboard cards/widgets
 - Match existing dashboard card styling exactly

5. PLACEMENT:
 - Add it below the existing dashboard stats (revenue, pending, overdue cards)
 - But above any invoice lists or other content

Don't break any existing dashboard functionality. This is purely additive.
```

---

## Implementation Order

0. **Run Prompt 0** → Apply migration, verify new columns in Supabase dashboard
1. **Run Prompt 1** → Test: `GET /api/insights/data` — verify comprehensive data returns
2. **Run Prompt 2** → Test: `POST /api/insights/generate` — verify Claude returns insights JSON + usage info
 - Make sure ANTHROPIC_API_KEY is set in .env.local AND Vercel env vars
3. **Run Prompt 3** → Visit /insights page, click Generate, verify full display + error states
4. **Run Prompt 4** → Check dashboard for the summary widget

## Environment Setup

Before running Prompt 2, you need:
1. Get an Anthropic API key from https://console.anthropic.com
2. Add to .env.local: `ANTHROPIC_API_KEY=sk-ant-...`
3. Add to Vercel environment variables (Settings → Environment Variables)

## Testing Checklist

- [ ] Migration applied, new columns visible in Supabase
- [ ] Data endpoint returns correct aggregated stats
- [ ] Data endpoint handles new user with no invoices gracefully
- [ ] Claude generates valid JSON insights
- [ ] Rate limiting works: count increments, blocks after limit
- [ ] Monthly reset works: count resets on new month
- [ ] Trial expiry works: returns 403 after 15 days
- [ ] Insights page displays all sections correctly
- [ ] Loading states work (spinner while generating)
- [ ] Error states work (trial expired, rate limited, API error)
- [ ] Usage counter shows correct "X of Y used"
- [ ] Dashboard widget shows compact summary
- [ ] "View All Insights" link navigates correctly
- [ ] "Insights" appears in the nav bar
- [ ] Mobile responsive
