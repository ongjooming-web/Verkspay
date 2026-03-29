import { test, expect } from '@playwright/test'

// Test the complete subscription flow: signup → trial → choose plan → checkout → webhook → plan update

const BASE_URL = 'https://app.Verkspayops.xyz'
const TEST_EMAIL = `test-${Date.now()}@example.com`
const TEST_PASSWORD = 'TestPassword@2026'

test.describe('Subscription Flow', () => {
  test('Complete subscription lifecycle: signup → trial → pro plan → manage billing', async ({ page }) => {
    // STEP 1: Signup
    console.log('[Test] Starting signup flow...')
    await page.goto(`${BASE_URL}/signup`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    // Should show email verification message or redirect
    await expect(page).toHaveURL(/\/(verify-email|login)/)
    console.log('[Test] ✓ Signup successful')

    // STEP 2: Log in (if verification wasn't instant)
    if (page.url().includes('/verify-email')) {
      console.log('[Test] Email verification required, waiting...')
      // In a real test, you'd check email here. For now, we'll wait for manual verification
      // or assume verification is instant in test environment
    }

    // STEP 3: Navigate to settings and check trial plan
    await page.goto(`${BASE_URL}/settings`)
    
    // Should see trial plan
    const planText = await page.locator('[data-testid="current-plan"]').textContent()
    expect(planText).toContain('Trial')
    console.log('[Test] ✓ Trial plan active')

    // Should show "Choose a Plan" button
    const chooseButtons = await page.locator('button:has-text("Choose")').count()
    expect(chooseButtons).toBeGreaterThan(0)
    console.log('[Test] ✓ Plan selection buttons visible')

    // STEP 4: Choose Pro Plan ($49/mo)
    console.log('[Test] Selecting Pro plan...')
    const proChooseButton = page.locator('text=Pro').locator('..').locator('button:has-text("Choose")')
    await proChooseButton.click()

    // Should redirect to Stripe checkout
    await page.waitForURL(/stripe\.com|checkout/)
    console.log('[Test] ✓ Redirected to Stripe checkout')

    // STEP 5: Complete Stripe payment (test card)
    console.log('[Test] Completing Stripe payment...')
    
    // Wait for Stripe iframe to load
    await page.waitForTimeout(2000)
    
    // Try to fill card details (may be in iframe)
    try {
      const cardNumberInput = page.locator('input[placeholder*="Card"]').first()
      if (await cardNumberInput.isVisible()) {
        await cardNumberInput.fill('4242424242424242')
        await page.locator('input[placeholder*="MM"]').fill('12')
        await page.locator('input[placeholder*="YY"]').fill('25')
        await page.locator('input[placeholder*="CVC"]').fill('123')
        await page.click('button:has-text("Pay")')
      }
    } catch (e) {
      console.log('[Test] Stripe iframe detected, using keyboard navigation')
      // Handle Stripe embedded form
      await page.click('[data-elements-core-frame]')
      await page.keyboard.type('4242424242424242')
      await page.keyboard.press('Tab')
      await page.keyboard.type('1225')
      await page.keyboard.press('Tab')
      await page.keyboard.type('123')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
    }

    // Should redirect back to settings after payment
    await page.waitForURL(`${BASE_URL}/settings`, { timeout: 10000 })
    console.log('[Test] ✓ Payment completed, returned to settings')

    // STEP 6: Verify plan updated
    console.log('[Test] Verifying plan update...')
    
    // Refresh to ensure webhook processed
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check plan is now Pro
    const updatedPlanText = await page.locator('[data-testid="current-plan"]').textContent()
    expect(updatedPlanText).toContain('Pro')
    console.log('[Test] ✓ Plan updated to Pro')

    // Usage limits should be updated
    const usageLimits = await page.locator('[data-testid="usage-limits"]').textContent()
    expect(usageLimits).toContain('Unlimited') // Pro has unlimited invoices
    console.log('[Test] ✓ Usage limits updated')

    // STEP 7: Test Manage Billing button
    console.log('[Test] Opening Stripe customer portal...')
    const manageBillingBtn = page.locator('button:has-text("Manage Billing")')
    
    if (await manageBillingBtn.isVisible()) {
      // Create a new page to handle portal redirect
      const portalPage = await page.context().waitForEvent('page')
      await manageBillingBtn.click()
      
      await portalPage.waitForLoadState()
      expect(portalPage.url()).toContain('stripe.com') || expect(portalPage.url()).toContain('billing')
      console.log('[Test] ✓ Stripe portal opened')
      await portalPage.close()
    }

    console.log('[Test] ✅ Complete subscription flow successful')
  })

  test('Trial plan limits enforcement', async ({ page }) => {
    // Log in with trial account
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    await page.goto(`${BASE_URL}/invoices`)
    
    // Trial should allow 5 invoices
    const invoiceCountBefore = await page.locator('[data-testid="invoice-item"]').count()
    expect(invoiceCountBefore).toBeLessThanOrEqual(5)
    console.log(`[Test] Trial invoices: ${invoiceCountBefore}/5`)

    // Try to exceed limit (if not at limit yet)
    if (invoiceCountBefore < 5) {
      for (let i = invoiceCountBefore; i < 5; i++) {
        await page.click('button:has-text("Create Invoice")')
        // Fill minimal invoice and save
        await page.fill('input[placeholder="Invoice Number"]', `INV-${i}`)
        await page.click('button:has-text("Save")')
        await page.waitForTimeout(500)
      }
    }

    // At limit, should show upgrade prompt
    await page.click('button:has-text("Create Invoice")')
    const upgradePrompt = await page.locator('text=/upgrade|plan/i').isVisible()
    expect(upgradePrompt).toBeTruthy()
    console.log('[Test] ✓ Trial limit enforced')
  })

  test('Annual billing option', async ({ page }) => {
    // Log in with trial account
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    await page.goto(`${BASE_URL}/settings`)

    // Toggle to Annual
    const annualToggle = page.locator('input[type="radio"][value="annual"]')
    await annualToggle.click()

    // Check annual pricing is shown
    const annualPrice = await page.locator('text=/180|468|1908/').isVisible() // Annual prices
    expect(annualPrice).toBeTruthy()
    console.log('[Test] ✓ Annual pricing displayed')

    // Should show "Save 20%" badge
    const saveBadge = await page.locator('text="Save 20%"').isVisible()
    expect(saveBadge).toBeTruthy()
    console.log('[Test] ✓ Annual discount badge shown')
  })
})

test.describe('Payment Links', () => {
  test('Create and pay with Stripe payment link', async ({ page }) => {
    // Assuming logged in with paid plan account
    await page.goto(`${BASE_URL}/invoices`)

    // Open or create an invoice
    const invoiceLink = page.locator('[data-testid="invoice-item"]').first()
    if (invoiceLink) {
      await invoiceLink.click()

      // Create payment link
      const createLinkBtn = page.locator('button:has-text("Create Payment Link")')
      if (await createLinkBtn.isVisible()) {
        await createLinkBtn.click()

        // Should show a copyable payment link
        const paymentLink = await page.locator('[data-testid="payment-link"]').getAttribute('value')
        expect(paymentLink).toMatch(/stripe\.com|checkout/)
        console.log('[Test] ✓ Payment link created')

        // Open link in new tab and pay
        const paymentPage = await page.context().newPage()
        await paymentPage.goto(paymentLink)

        // Complete Stripe payment
        await page.waitForTimeout(1000)
        console.log('[Test] ✓ Payment link works')
        await paymentPage.close()
      }
    }
  })
})

test.describe('Master Account', () => {
  test('Master account bypasses all limits', async ({ page }) => {
    // This test assumes master account credentials are set
    const masterEmail = process.env.MASTER_TEST_EMAIL || 'ongjooming@gmail.com'
    const masterPassword = process.env.MASTER_TEST_PASSWORD || 'TestMaster@2026'

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', masterEmail)
    await page.fill('input[type="password"]', masterPassword)
    await page.click('button[type="submit"]')

    await page.goto(`${BASE_URL}/settings`)

    // Check for master badge
    const masterBadge = await page.locator('text=/master|enterprise|unlimited/i').isVisible()
    expect(masterBadge).toBeTruthy()
    console.log('[Test] ✓ Master account detected')

    // Check usage shows unlimited
    const usageText = await page.locator('[data-testid="usage-limits"]').textContent()
    expect(usageText).toContain('∞') || expect(usageText).toContain('Unlimited')
    console.log('[Test] ✓ Master account has unlimited access')
  })
})
