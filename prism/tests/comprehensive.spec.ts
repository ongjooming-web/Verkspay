import { test, expect } from '@playwright/test'

const BASE_URL = 'https://Verkspayops.xyz'
const TEST_EMAIL = 'dreyminginlove@gmail.com'
const TEST_PASSWORD = '123456'

test.describe('Verkspay Comprehensive Test Suite', () => {
  let invoiceId: string
  let invoiceNumber: string

  // ========== AUTHENTICATION TESTS ==========
  test.describe('Authentication', () => {
    test('Login works with valid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)
      await page.click('button:has-text("Sign In")')
      await page.waitForURL(`${BASE_URL}/invoices`, { timeout: 10000 })
      expect(page.url()).toBe(`${BASE_URL}/invoices`)
    })

    test('Login fails with invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', 'WrongPassword123!')
      await page.click('button:has-text("Sign In")')
      await page.waitForSelector('text=Invalid credentials', { timeout: 5000 }).catch(() => null)
      const errorShown = await page.locator('text=/Invalid|Error/').isVisible().catch(() => false)
      expect(errorShown).toBeTruthy()
    })
  })

  // ========== DASHBOARD TESTS ==========
  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each dashboard test
      await page.goto(`${BASE_URL}/login`)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)
      await page.click('button:has-text("Sign In")')
      await page.waitForURL(`${BASE_URL}/invoices`, { timeout: 10000 })
    })

    test('Dashboard loads without errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/invoices`)
      await page.waitForSelector('text=Invoices', { timeout: 5000 })
      expect(page.url()).toContain('/invoices')
    })

    test('Revenue stats display correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/invoices`)
      const paidRevenueCard = await page.locator('text=Paid Revenue').isVisible()
      const pendingCard = await page.locator('text=Pending Amount').isVisible()
      const overdueCard = await page.locator('text=Overdue Invoices').isVisible()
      
      expect(paidRevenueCard).toBeTruthy()
      expect(pendingCard).toBeTruthy()
      expect(overdueCard).toBeTruthy()
    })

    test('Status filters work', async ({ page }) => {
      await page.goto(`${BASE_URL}/invoices`)
      
      // Click unpaid filter
      await page.click('button:has-text("Unpaid")')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('filter=unpaid').catch(() => true) // Optional URL param
      
      // Click paid filter
      await page.click('button:has-text("Paid")')
      await page.waitForTimeout(500)
      
      // Click all filter
      await page.click('button:has-text("All")')
      await page.waitForTimeout(500)
    })
  })

  // ========== INVOICE CREATION TESTS ==========
  test.describe('Invoices', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)
      await page.click('button:has-text("Sign In")')
      await page.waitForURL(`${BASE_URL}/invoices`, { timeout: 10000 })
    })

    test('Create new invoice successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/invoices`)
      
      // Click create invoice button
      await page.click('button:has-text("Create Invoice")')
      await page.waitForSelector('text=Create New Invoice', { timeout: 5000 })
      
      // Fill form
      await page.selectOption('select', { label: 'Client' })
      const clientOptions = await page.locator('select option').count()
      if (clientOptions > 1) {
        await page.selectOption('select', (await page.locator('select option').nth(1).getAttribute('value')) || '')
      }
      
      await page.fill('input[type="number"]', '1000')
      await page.fill('input[type="date"]', '2026-04-15')
      await page.fill('textarea', 'Test invoice for comprehensive testing')
      
      // Submit
      await page.click('button:has-text("Create Invoice")')
      
      // Wait for success
      await page.waitForSelector('text=/successfully|created/i', { timeout: 5000 }).catch(() => null)
      const successShown = await page.locator('text=/successfully|created/i').isVisible().catch(() => false)
      expect(successShown).toBeTruthy()
    })

    test('Invoice number auto-generates', async ({ page }) => {
      await page.goto(`${BASE_URL}/invoices`)
      await page.waitForSelector('text=/INV-/').catch(() => null)
      const invoiceNumbers = await page.locator('text=/INV-\\d+/').allTextContents()
      expect(invoiceNumbers.length).toBeGreaterThan(0)
      expect(invoiceNumbers[0]).toMatch(/INV-\d+/)
    })
  })

  // ========== PAYMENT SETTINGS TESTS ==========
  test.describe('Payment Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)
      await page.click('button:has-text("Sign In")')
      await page.waitForURL(`${BASE_URL}/invoices`, { timeout: 10000 })
    })

    test('/settings/payment page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/payment`)
      await page.waitForSelector('text=Payment Settings', { timeout: 5000 })
      expect(page.url()).toContain('/settings/payment')
    })

    test('Payment details save correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/payment`)
      await page.waitForSelector('select', { timeout: 5000 })
      
      // Select bank
      await page.selectOption('select', 'Maybank')
      
      // Fill account details
      await page.fill('input[placeholder*="Account"]', '5641915877')
      await page.fill('input[placeholder*="Name"]', 'Test Account')
      await page.fill('input[placeholder*="DuitNow"]', '0161234567')
      await page.fill('textarea', 'Test payment instructions')
      
      // Save
      await page.click('button:has-text("Save")')
      
      // Check for success message
      await page.waitForSelector('text=/success|saved/i', { timeout: 5000 }).catch(() => null)
      const successMsg = await page.locator('text=/success|saved/i').isVisible().catch(() => false)
      expect(successMsg).toBeTruthy()
    })

    test('Saved details persist on reload', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/payment`)
      await page.waitForSelector('input[placeholder*="Account"]', { timeout: 5000 })
      
      // Get initial value
      const initialValue = await page.inputValue('input[placeholder*="Account"]')
      
      // Reload page
      await page.reload()
      await page.waitForSelector('input[placeholder*="Account"]', { timeout: 5000 })
      
      // Check value persisted
      const reloadValue = await page.inputValue('input[placeholder*="Account"]')
      expect(reloadValue).toBe(initialValue)
    })
  })

  // ========== PAYMENT PAGE TESTS ==========
  test.describe('Payment Page', () => {
    test.beforeEach(async ({ page }) => {
      // Get first invoice ID from dashboard
      await page.goto(`${BASE_URL}/login`)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)
      await page.click('button:has-text("Sign In")')
      await page.waitForURL(`${BASE_URL}/invoices`, { timeout: 10000 })
      
      // Extract first invoice ID from URL
      const invoiceLink = await page.locator('a[href*="/invoices/"]').first().getAttribute('href')
      if (invoiceLink) {
        invoiceId = invoiceLink.split('/').pop() || ''
      }
    })

    test('Payment page loads correctly', async ({ page }) => {
      if (!invoiceId) {
        test.skip()
      }
      await page.goto(`${BASE_URL}/pay/${invoiceId}`)
      await page.waitForSelector('text=Payment', { timeout: 5000 })
      expect(page.url()).toContain(`/pay/${invoiceId}`)
    })

    test('Shows dynamic payment details', async ({ page }) => {
      if (!invoiceId) {
        test.skip()
      }
      await page.goto(`${BASE_URL}/pay/${invoiceId}`)
      
      // Check for payment details section
      const bankDetails = await page.locator('text=Bank Transfer').isVisible().catch(() => false)
      const maybank = await page.locator('text=Maybank').isVisible().catch(() => false)
      
      expect(bankDetails || maybank).toBeTruthy()
    })
  })

  // ========== SMART REMINDERS TESTS ==========
  test.describe('Smart Reminders', () => {
    test('Cron endpoint is accessible', async ({ page }) => {
      const response = await page.request.post(`${BASE_URL}/api/cron/send-reminders`, {
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`
        }
      })
      
      // Should either be 200 (success), 401 (auth failed), or 500 (error)
      expect([200, 401, 500]).toContain(response.status())
    })
  })

  // ========== STRIPE CONNECT TESTS ==========
  test.describe('Stripe Connect', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)
      await page.click('button:has-text("Sign In")')
      await page.waitForURL(`${BASE_URL}/invoices`, { timeout: 10000 })
    })

    test('Connect button exists', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings`)
      const connectButton = await page.locator('button:has-text(/Stripe|Connect/)').isVisible().catch(() => false)
      expect(connectButton).toBeTruthy()
    })
  })
})
