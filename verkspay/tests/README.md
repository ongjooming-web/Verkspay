# Verkspay Testing

## Test Files

### `e2e-test-flows.md`
Manual end-to-end test flows covering all features:
- Account signup & onboarding
- Client management
- Invoice creation with line items
- Payment links (Stripe)
- Partial payments
- Subscription & billing
- Plan limits & gating
- Dashboard, settings, navigation
- Bug tracking table

**When to use:** Run before every release to verify all features work correctly.
**Effort:** 2-3 hours for full manual testing

### `subscription-flow.spec.ts`
Automated Playwright tests for subscription flow:
- Complete signup → trial → choose plan → payment → plan update
- Trial limits enforcement
- Annual billing option
- Payment link creation
- Master account bypass

**When to use:** Quick validation of critical subscription flow after code changes.
**Runtime:** ~5-10 minutes

## Running Automated Tests

### Setup
```bash
npm install --save-dev @playwright/test

# Or if already installed, ensure latest
npm install --save-dev @playwright/test@latest
```

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test
```bash
npx playwright test subscription-flow
npx playwright test --grep "subscription lifecycle"
```

### Run with UI (recommended for debugging)
```bash
npx playwright test --ui
```

### Generate Test Report
```bash
npx playwright test
npx playwright show-report
```

### Debug Mode
```bash
npx playwright test --debug
```

## Test Environment Variables

Create a `.env.test` or set in your shell:

```bash
# For master account tests
MASTER_TEST_EMAIL=ongjooming@gmail.com
MASTER_TEST_PASSWORD=TestMaster@2026

# Or use trial account for signup tests
TRIAL_TEST_EMAIL=fresh-trial@example.com
TRIAL_TEST_PASSWORD=TestPassword@2026
```

## Stripe Test Cards

Used in automated and manual testing:

| Card | Purpose | Result |
|------|---------|--------|
| 4242 4242 4242 4242 | Standard test card | ✅ Success |
| 4000 0000 0000 0002 | Declined card | ❌ Payment fails |
| 4000 0000 0000 3220 | 3D Secure required | ⚠️ Requires OTP |
| 5555 5555 5555 4444 | Mastercard test | ✅ Success |

## CI/CD Integration

To run tests in CI pipeline:

```yaml
# .github/workflows/test.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npx playwright install
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Common Issues

### "Page was closed" error
- Likely means page redirected or timed out
- Check network tab in browser dev tools
- Increase `timeout` in playwright config if needed

### Stripe iframe not filling
- Stripe embeds checkout in iframe
- May need to switch to Stripe-hosted checkout (already done)
- Check test card format (16 digits, no spaces)

### Session/Auth issues
- Ensure `MASTER_TEST_EMAIL` credentials are correct
- Check if account exists and is not deleted
- Verify Supabase auth is working

### Flaky tests
- Add `await page.waitForLoadState('networkidle')`
- Increase timeouts for slow networks
- Run tests serially (not in parallel)

## Debugging Tips

1. **Screenshots & Videos**
   - Automatic on failure, saved to `test-results/`
   - Check `trace.zip` for detailed interaction logs

2. **Browser DevTools**
   - `npx playwright test --debug` opens DevTools
   - Step through code, inspect elements

3. **Logs**
   - `console.log()` in test code prints to stdout
   - Check Verkspay's Vercel logs for backend errors

4. **Network Traffic**
   - Enable `HAR` recording: `har: 'tests.har'` in config
   - Review API responses for unexpected data

## Performance Baseline

For reference, these are expected timings:

| Action | Time | Notes |
|--------|------|-------|
| Signup page load | 1-2s | Includes Next.js hydration |
| Email verification | instant-30s | Depends on email service |
| Stripe checkout redirect | 1-2s | Stripe API latency |
| Payment processing | 1-3s | Stripe processing |
| Webhook processing | 1-5s | Plan update in DB |
| Settings page reload | 1-2s | Profile fetch + render |
| Full subscription flow | 3-5 mins | Includes manual verification |

## Next Steps

1. Add more test coverage (client creation, invoice generation, partial payments)
2. Set up GitHub Actions to run tests on every push
3. Create test data cleanup script (delete test invoices/clients after run)
4. Add load testing for bulk invoice creation
5. Monitor test reliability and add retries for flaky tests
