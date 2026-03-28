# Onboarding Tour - Current Flow & Parameters

## Hook: useOnboarding.ts

### Initial Fetch on Mount
```typescript
useEffect(() => {
  console.log('[useOnboarding] Hook mounted, fetching status...')
  refresh()
}, [])
```

**Parameters sent to API:**
- Authorization header: `Bearer {access_token}`
- Content-Type: application/json

### API Response Expected
```json
{
  "completed": false,
  "dismissed": false,
  "tour_step": 0,
  "tasks": {
    "business_profile": false,
    "stripe_connected": false,
    "first_client": false,
    "first_invoice": false,
    "ai_insights": false
  },
  "completed_count": 0,
  "total_tasks": 5
}
```

### State Variables
- `status`: Full response object (OnboardingStatus)
- `loading`: boolean (true until first fetch completes)
- `showTour`: computed via useMemo → `(completed === false && tour_step === 0)`
- `showProgress`: computed via useMemo → `(!completed && !dismissed && completed_count < total_tasks)`

### Logic Flow
1. **On mount**: fetch `/api/onboarding/status` with auth token
2. **If loading OR !status**: don't show anything
3. **showTour = true IF**: `status.completed === false` AND `status.tour_step === 0`
4. **showProgress = true IF**: NOT completed AND NOT dismissed AND tasks incomplete

## OnboardingTour Component

### Render Guards
```typescript
if (!mounted || !showTour || !status || status.completed) {
  return null
}
```

**Tour shows ONLY when:**
- Component mounted ✅
- showTour === true ✅
- status object exists ✅
- status.completed !== true ✅

### Step Definition
- **Step 0**: Centered welcome modal
- **Steps 1-6**: Navigation highlights + tooltips
- **Step 7**: Centered completion modal

### Actions
- **"Next" button**: calls `updateTourStep(tourStep + 1)` or `completeOnboarding()` on final step
- **"Skip Tour" button**: calls `completeOnboarding()` (sets completed: true forever)

## OnboardingProgress Component

### Render Guards
```typescript
if (loading || !status) return null
if (status.completed) return null
if (status.dismissed && completedCount < totalTasks && !showCelebration) return null
if (!showProgress && !showCelebration) return null
```

**Progress shows when:**
- NOT loading AND status exists ✅
- NOT completed ✅
- NOT dismissed (OR all tasks complete for celebration) ✅
- showProgress = true (tasks incomplete) ✅

### Task Tracking
Displays 5 pills:
1. Business Profile - complete when `company_name` not null/empty
2. Connect Stripe - complete when `stripe_customer_id` exists
3. Add First Client - complete when `clients.count >= 1`
4. Send First Invoice - complete when `invoices.count >= 1`
5. Generate Insights - complete when `latest_insights` not null/has content

### Celebration State
- Shows ONLY if: all 5 tasks done AND user previously dismissed bar
- Auto-hides after 5 seconds

## API Endpoint: GET /api/onboarding/status

### Request
```
GET /api/onboarding/status
Authorization: Bearer {token}
Content-Type: application/json
```

### Validation Steps
1. Check Authorization header starts with "Bearer "
2. Extract token from header
3. Verify token with `supabase.auth.getUser(token)`
4. Fetch profile row for user
5. Count clients and invoices
6. Evaluate 5 tasks
7. Return computed response

### Response Fields
- `completed`: boolean (from profile.onboarding_completed)
- `dismissed`: boolean (profile.onboarding_dismissed_at exists)
- `tour_step`: number (from profile.onboarding_step, default 0)
- `tasks`: object with 5 boolean task completion values
- `completed_count`: number of completed tasks
- `total_tasks`: 5

### Database Columns Required
- `profiles.onboarding_completed` (BOOLEAN DEFAULT FALSE)
- `profiles.onboarding_step` (INTEGER DEFAULT 0)
- `profiles.onboarding_dismissed_at` (TIMESTAMPTZ DEFAULT NULL)

## API Endpoint: PUT /api/onboarding/update

### Request
```
PUT /api/onboarding/update
Authorization: Bearer {token}
Content-Type: application/json
Body: { tour_step?: number, dismissed?: boolean, completed?: boolean }
```

### Actions
- `{ tour_step: N }` → sets `onboarding_step = N` in profiles
- `{ dismissed: true }` → sets `onboarding_dismissed_at = NOW()` in profiles
- `{ completed: true }` → sets `onboarding_completed = true` in profiles

### Local State Update (Immediate Feedback)
```typescript
// After API call succeeds, update local state immediately
setStatus(prev => prev ? { ...prev, [field]: newValue } : null)
```

This ensures UI updates instantly without waiting for refresh.

## Expected Flow for New User

### First Load
1. User logs in → redirected to /dashboard
2. useOnboarding hook mounts
3. Fetches `/api/onboarding/status` with token
4. Response: `{ completed: false, tour_step: 0, ... }`
5. showTour evaluates to TRUE
6. OnboardingTour renders step 0 (welcome modal)
7. OnboardingProgress shows (5 tasks, all incomplete)

### User Clicks "Next"
1. handleNext() calls `updateTourStep(1)`
2. Sends PUT to `/api/onboarding/update` with `{ tour_step: 1 }`
3. Local state updates: `tour_step: 1`
4. STEPS[1] renders (navigation highlight)

### User Clicks "Skip Tour"
1. handleSkip() calls `completeOnboarding()`
2. Sends PUT to `/api/onboarding/update` with `{ completed: true, tour_step: 8 }`
3. Local state updates: `completed: true, tour_step: 8`
4. showTour evaluates to FALSE (completed === true)
5. OnboardingTour returns null
6. OnboardingProgress still shows (user can still complete tasks)

### User Completes Full Tour
1. On step 7 (final), handleNext() calls `completeOnboarding()`
2. Same as skip flow
3. Tour disappears, progress bar continues

### User Completes All 5 Tasks
1. Each task completion updates database:
   - Add company name → business_profile = true
   - Add stripe customer → stripe_connected = true
   - Add client → first_client = true
   - Create invoice → first_invoice = true
   - Generate insights → ai_insights = true
2. Next time /api/onboarding/status is called, completed_count = 5
3. OnboardingProgress shows celebration "All set! 🎉"

## Debugging Checklist

- [ ] Check browser console for `[useOnboarding] Hook mounted, fetching status...`
- [ ] Check browser console for `[useOnboarding] Status fetched:` with response data
- [ ] Check Vercel logs for `[Onboarding Status] Profile data:` showing profile values
- [ ] Check Vercel logs for `[Onboarding Status] Returning response:` showing calculated values
- [ ] Verify Authorization header is being sent (should see in Vercel logs)
- [ ] Verify profile row exists in Supabase with correct columns
- [ ] Verify onboarding_completed default is FALSE for new users
- [ ] Verify onboarding_step default is 0 for new users

## Common Issues & Fixes

### Tour not showing
- ❌ `completed === true` → user already completed tour, it won't show again (expected)
- ❌ `tour_step !== 0` → user was in middle of tour, showing step N (expected)
- ❌ `loading === true` → still fetching status, wait a moment
- ❌ No Authorization header → API returns 401, status stays null
- ❌ profile row missing → API returns 404, status stays null
- ✅ New user, completed=false, tour_step=0 → tour should show

### Completed field stuck at false
- Check if API is returning `onboarding_completed: true` after completeOnboarding() called
- Check Vercel logs for PUT request logging
- Verify profile row was updated in Supabase
- Run manual Supabase query: `SELECT onboarding_completed FROM profiles WHERE id = 'USER_ID'`

### Progress bar not showing
- Check if `dismissed === true` (user clicked X)
- Check if `completed === true` (tour was completed, progress auto-hides)
- Check if all 5 tasks are done (progress auto-hides)
- If all of above are false, progress should show

### Celebration not showing
- Celebration only shows if: dismissed=true AND all 5 tasks complete
- Check `status.dismissed` in browser console
- Check `completed_count` is 5 in browser console
