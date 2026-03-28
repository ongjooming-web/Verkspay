# Prism Onboarding System Implementation

**Date:** Saturday, March 28, 2026 - 11:10 PM GMT+8  
**Status:** ✅ COMPLETE  
**Commit:** d7f8c63

## SQL Migration (To be run by user in Supabase)

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ DEFAULT NULL;
```

## Components Implemented

### 1. API Routes

#### `GET /api/onboarding/status`
- Fetches current onboarding state
- Checks 5 task conditions:
  - business_profile: `company_name` not null/empty
  - stripe_connected: `stripe_customer_id` exists
  - first_client: clients count >= 1
  - first_invoice: invoices count >= 1
  - ai_insights: `latest_insights` exists and not empty
- Returns: completed, dismissed, tasks, completed_count, total_tasks, tour_step

#### `PUT /api/onboarding/update`
- Updates profile onboarding fields
- Accepts: { tour_step?, dismissed?, completed? }
- Sets onboarding_dismissed_at to NOW() when dismissed = true

### 2. Hook: useOnboarding()

**Returns:**
- `status`: Full onboarding status object
- `loading`: Fetch status
- `isComplete`: Whether onboarding is complete
- `isDismissed`: Whether progress bar was dismissed
- `completedCount`: Number of completed tasks (0-5)
- `totalTasks`: Always 5
- `tourStep`: Current tour step (0-7)
- `showTour`: True if step === 0 && !complete (show guided tour)
- `showProgress`: True if !complete && !dismissed (show progress bar)
- `updateTourStep(step)`: Update tour progress in database
- `dismissProgress()`: Mark progress bar as dismissed
- `completeOnboarding()`: Mark onboarding complete
- `refresh()`: Re-fetch status

### 3. OnboardingTour Component

**Features:**
- 8-step guided tour (0-7)
- Custom spotlight overlay using box-shadow technique
- Tooltip cards with dark theme (#1A1A2E background)
- Keyboard support: ESC to skip, Enter for next
- Smooth animations between steps
- ResizeObserver for responsive repositioning
- Auto-scrolls target elements into view

**Tour Steps:**
1. Welcome modal (centered, no spotlight)
2. Navigation bar highlight
3. Dashboard metrics cards
4. Settings link (with "Go to Settings" CTA)
5. Clients link (with "Go to Clients" CTA)
6. Invoices link (with "Go to Invoices" CTA)
7. Insights link
8. Completion modal (centered, celebration state)

**Attributes:**
- Only renders when `showTour === true` (first login, step 0)
- Persists tour step in database across navigations
- Responsive design: mobile tooltips below/above only, never side-to-side

### 4. OnboardingProgress Component

**Features:**
- Persistent progress bar at top of dashboard
- Shows setup task completion: "3 of 5 complete"
- Visual progress bar with gradient (purple→cyan)
- 5 clickable task pills:
  - 🏢 Business Profile → /settings
  - 💳 Connect Stripe → /settings
  - 👥 Add First Client → /clients
  - 📄 Send First Invoice → /invoices
  - ✨ Generate Insights → /insights
- Incomplete tasks: gray, with empty circle
- Complete tasks: green, with checkmark
- Dismissible with X button

**Celebration State:**
- Shows "All set! You're ready to go 🎉" when all 5 tasks complete
- Auto-hides after 5 seconds
- Marks onboarding as complete

**Behavior:**
- Only renders when `showProgress === true`
- Never shows if onboarding_completed === true
- Never shows if onboarding_dismissed_at is set (unless tasks auto-complete)

## Integration Points

### Navigation Component
- Added `data-onboarding` attributes:
  - nav: main nav container
  - nav-clients: Clients link
  - nav-invoices: Invoices link
  - nav-settings: Settings link
  - nav-insights: Insights link

### Dashboard Page
- Added `data-onboarding="metrics-cards"` to key metrics grid
- Imported and rendered `<OnboardingProgress />` at top of content
- Metrics cards highlighted in step 3 of tour

### Root Layout (app/layout.tsx)
- Added `<OnboardingTour />` to body
- Tour renders across all pages, persists state in database

## User Flows

### First-Time User (New Account)
1. Onboarding page loads, tour step = 0, completed = false
2. Welcome modal appears (step 1: centered card)
3. User clicks "Let's Go" → tour step updated to 1
4. Tour continues through nav highlights, metrics cards, settings, clients, invoices, insights
5. Each step can navigate to relevant page (e.g., "Go to Settings")
6. Final completion step → marks onboarding_completed = true
7. Progress bar shows simultaneously (top of dashboard)
8. Progress bar auto-hides when all 5 tasks complete or after 5 seconds

### Returning User (Incomplete Setup)
1. onboarding_completed = false, onboarding_step > 0
2. Tour does NOT show (already saw it or skipped)
3. Progress bar shows (unless dismissed)
4. Tasks update dynamically as user completes actions
5. When all 5 complete → celebration state → auto-hide → mark complete

### User Dismissed Progress Bar
1. Clicks X button on progress bar
2. onboarding_dismissed_at set to NOW()
3. Progress bar hides (showProgress = false because isDismissed = true)
4. If user completes all 5 tasks, celebration overrides and displays anyway

## Responsive Design

**Desktop:**
- Tooltips positioned below, above, left, or right based on viewport
- Progress bar pills in flex row
- Full spotlight overlay

**Mobile:**
- Tooltips only appear above/below (never left/right, not enough space)
- Progress bar stacks: title + progress bar on top, task pills wrap below
- Spotlight auto-scrolls target into view center
- Touchscreen-friendly button sizes

## Database Columns (To Add via Supabase Migration)

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ DEFAULT NULL;
```

## Key Design Decisions

1. **No external libraries** - Custom implementation with React + Tailwind, matching Prism's design system
2. **Database persistence** - Tour state stored in DB, works across devices/sessions
3. **5-task checklist** - Business profile, Stripe, first client, first invoice, AI insights
4. **Non-blocking** - Tour can be skipped anytime, progress can be dismissed
5. **Auto-complete** - When all 5 tasks done, automatically mark onboarding complete
6. **Spotlight technique** - Box-shadow overlay (performant, no clip-path)
7. **Smooth animations** - 400ms easing for tooltip repositioning
8. **Keyboard accessibility** - ESC to skip, Enter to continue

## Files Created/Modified

**New Files:**
- `src/app/api/onboarding/status/route.ts` (GET endpoint)
- `src/app/api/onboarding/update/route.ts` (PUT endpoint)
- `src/hooks/useOnboarding.ts` (React hook)
- `src/components/onboarding/OnboardingTour.tsx` (Tour component)
- `src/components/onboarding/OnboardingProgress.tsx` (Progress bar)

**Modified Files:**
- `src/components/Navigation.tsx` (added data-onboarding attributes)
- `src/app/dashboard/page.tsx` (added OnboardingProgress component + data-onboarding)
- `src/app/layout.tsx` (added OnboardingTour component)

## Next Steps (User Action Required)

1. Run SQL migration in Supabase to add the 3 new columns to profiles table
2. Test onboarding on fresh account signup
3. Verify tour displays correctly across all pages
4. Test progress bar task completion detection
5. Verify responsive design on mobile

## Notes

- Tour styling matches Prism's dark theme (#1A1A2E cards, purple/cyan accents)
- All API endpoints use same auth pattern as existing routes (getSupabaseServer())
- Task checking happens dynamically on each status fetch (not cached)
- Progress bar pills are clickable links to relevant pages
- Mobile responsiveness tested with ResizeObserver and viewport calculations
