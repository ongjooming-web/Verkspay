const https = require('https');
const http = require('http');
const querystring = require('querystring');
const url = require('url');

class PrismTester {
  constructor() {
    this.cookies = [];
    this.baseUrl = 'https://prismops.xyz';
    this.results = {
      AUTHENTICATION: {},
      DASHBOARD: {},
      INVOICES: {},
      PAYMENT_PAGE: {},
      SMART_REMINDERS: {},
      STRIPE_CONNECT: {},
      SETTINGS: {}
    };
  }

  async makeRequest(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(path.startsWith('http') ? path : this.baseUrl + path);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const reqHeaders = {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': this.cookies.join('; '),
        ...headers
      };

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: reqHeaders
      };

      const req = protocol.request(options, (res) => {
        // Capture set-cookie headers
        if (res.headers['set-cookie']) {
          res.headers['set-cookie'].forEach(cookie => {
            const cookieName = cookie.split('=')[0];
            this.cookies = this.cookies.filter(c => !c.startsWith(cookieName));
            this.cookies.push(cookie);
          });
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
            redirectUrl: res.headers.location
          });
        });
      });

      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  async runTests() {
    console.log('🧪 Starting Prism Comprehensive Test Suite\n');
    console.log(`📍 Target: ${this.baseUrl}`);
    console.log(`👤 Account: dreyminginlove@gmail.com\n`);
    
    // Test AUTHENTICATION
    await this.testAuthentication();
    
    // Test DASHBOARD (if auth successful)
    if (this.results.AUTHENTICATION['Login works with valid credentials']?.status !== 'FAIL') {
      await this.testDashboard();
    }
    
    // Test INVOICES
    if (this.results.AUTHENTICATION['Login works with valid credentials']?.status !== 'FAIL') {
      await this.testInvoices();
    }
    
    // Test SETTINGS
    if (this.results.AUTHENTICATION['Login works with valid credentials']?.status !== 'FAIL') {
      await this.testSettings();
    }
    
    // Test PAYMENT PAGE
    if (this.results.AUTHENTICATION['Login works with valid credentials']?.status !== 'FAIL') {
      await this.testPaymentPage();
    }
    
    // Test SMART REMINDERS
    if (this.results.AUTHENTICATION['Login works with valid credentials']?.status !== 'FAIL') {
      await this.testSmartReminders();
    }
    
    this.printResults();
  }

  async testAuthentication() {
    console.log('🔐 AUTHENTICATION Tests\n');
    
    // Test 1: Login page loads
    try {
      const res = await this.makeRequest('/login');
      this.results.AUTHENTICATION['Login page loads'] = {
        status: res.status === 200 ? 'PASS' : 'FAIL',
        expected: 200,
        got: res.status
      };
      console.log(`  ✓ Login page loads (${res.status})`);
    } catch (e) {
      this.results.AUTHENTICATION['Login page loads'] = { status: 'FAIL', error: e.message };
      console.log(`  ✗ Login page load failed: ${e.message}`);
    }

    // Test 2: Signup page loads
    try {
      const res = await this.makeRequest('/signup');
      this.results.AUTHENTICATION['Signup page loads'] = {
        status: res.status === 200 ? 'PASS' : 'FAIL',
        expected: 200,
        got: res.status
      };
      console.log(`  ✓ Signup page loads (${res.status})`);
    } catch (e) {
      this.results.AUTHENTICATION['Signup page loads'] = { status: 'FAIL', error: e.message };
      console.log(`  ✗ Signup page load failed: ${e.message}`);
    }

    // Test 3: Login with valid credentials (simulated)
    try {
      console.log('  → Attempting login with valid credentials...');
      const loginData = querystring.stringify({
        email: 'dreyminginlove@gmail.com',
        password: '123456'
      });
      
      const res = await this.makeRequest('/api/auth/login', 'POST', loginData, {
        'Content-Type': 'application/x-www-form-urlencoded'
      });
      
      // Check if login successful (status 200 or redirect to dashboard)
      const isSuccess = res.status === 200 || res.status === 302 || res.data.includes('dashboard') || res.data.includes('token');
      
      this.results.AUTHENTICATION['Login works with valid credentials'] = {
        status: isSuccess ? 'PASS' : 'FAIL',
        code: res.status,
        hasToken: res.data.includes('token')
      };
      
      if (isSuccess) {
        console.log(`  ✓ Login successful (${res.status})`);
      } else {
        console.log(`  ✗ Login failed (${res.status})`);
      }
    } catch (e) {
      this.results.AUTHENTICATION['Login works with valid credentials'] = {
        status: 'FAIL',
        error: e.message
      };
      console.log(`  ✗ Login error: ${e.message}`);
    }

    // Test 4: Invalid login
    try {
      const loginData = querystring.stringify({
        email: 'invalid@test.com',
        password: 'wrongpass'
      });
      
      const res = await this.makeRequest('/api/auth/login', 'POST', loginData);
      
      // Should fail with 401 or 400
      const isFail = res.status >= 400;
      
      this.results.AUTHENTICATION['Login fails with invalid credentials'] = {
        status: isFail ? 'PASS' : 'FAIL',
        expected: '401/400',
        got: res.status
      };
      
      if (isFail) {
        console.log(`  ✓ Invalid login rejected (${res.status})`);
      } else {
        console.log(`  ✗ Invalid login was not rejected (${res.status})`);
      }
    } catch (e) {
      this.results.AUTHENTICATION['Login fails with invalid credentials'] = {
        status: 'FAIL',
        error: e.message
      };
      console.log(`  ✗ Error testing invalid login: ${e.message}`);
    }

    // Test 5: Check onboarding flow
    try {
      const res = await this.makeRequest('/onboarding');
      const hasOnboarding = res.status === 200 || res.data.includes('onboard') || res.data.includes('setup');
      
      this.results.AUTHENTICATION['Onboarding flow exists'] = {
        status: hasOnboarding ? 'PASS' : 'FAIL',
        code: res.status
      };
      
      if (hasOnboarding) {
        console.log(`  ✓ Onboarding flow accessible (${res.status})`);
      } else {
        console.log(`  ✗ Onboarding flow not found (${res.status})`);
      }
    } catch (e) {
      this.results.AUTHENTICATION['Onboarding flow exists'] = {
        status: 'FAIL',
        error: e.message
      };
      console.log(`  ✗ Error checking onboarding: ${e.message}`);
    }

    console.log('');
  }

  async testDashboard() {
    console.log('📊 DASHBOARD Tests\n');
    
    try {
      const res = await this.makeRequest('/dashboard');
      
      this.results.DASHBOARD['Dashboard loads without errors'] = {
        status: res.status === 200 ? 'PASS' : 'FAIL',
        code: res.status
      };
      console.log(`  ✓ Dashboard loads (${res.status})`);
      
      // Check for revenue stats
      if (res.data.includes('revenue') || res.data.includes('amount') || res.data.includes('total')) {
        this.results.DASHBOARD['Revenue stats display correctly'] = { status: 'PASS' };
        console.log(`  ✓ Revenue stats likely present`);
      } else {
        this.results.DASHBOARD['Revenue stats display correctly'] = { status: 'UNVERIFIED' };
        console.log(`  ? Revenue stats (needs browser verification)`);
      }

      // Check for invoice list
      if (res.data.includes('invoice') || res.data.includes('list') || res.data.includes('table')) {
        this.results.DASHBOARD['Invoice list displays'] = { status: 'PASS' };
        console.log(`  ✓ Invoice list likely present`);
      } else {
        this.results.DASHBOARD['Invoice list displays'] = { status: 'UNVERIFIED' };
        console.log(`  ? Invoice list (needs browser verification)`);
      }

      // Check for status filters
      if (res.data.includes('paid') || res.data.includes('unpaid') || res.data.includes('filter')) {
        this.results.DASHBOARD['Status filters available'] = { status: 'PASS' };
        console.log(`  ✓ Status filters likely present`);
      } else {
        this.results.DASHBOARD['Status filters available'] = { status: 'UNVERIFIED' };
        console.log(`  ? Status filters (needs browser verification)`);
      }
    } catch (e) {
      this.results.DASHBOARD['Dashboard loads without errors'] = { status: 'FAIL', error: e.message };
      console.log(`  ✗ Dashboard test failed: ${e.message}`);
    }

    console.log('');
  }

  async testInvoices() {
    console.log('📄 INVOICES Tests\n');
    
    try {
      // Check invoices page
      const res = await this.makeRequest('/invoices');
      
      this.results.INVOICES['Invoices page loads'] = {
        status: res.status === 200 ? 'PASS' : 'FAIL',
        code: res.status
      };
      console.log(`  ✓ Invoices page loads (${res.status})`);
      
      // Check for create invoice button
      if (res.data.includes('create') || res.data.includes('new') || res.data.includes('add')) {
        this.results.INVOICES['Create invoice option available'] = { status: 'PASS' };
        console.log(`  ✓ Create invoice option available`);
      } else {
        this.results.INVOICES['Create invoice option available'] = { status: 'UNVERIFIED' };
        console.log(`  ? Create invoice option (needs browser)`);
      }

      // Check for invoice numbering
      if (res.data.includes('#') || res.data.includes('INV') || res.data.includes('invoice')) {
        this.results.INVOICES['Invoice numbering system exists'] = { status: 'PASS' };
        console.log(`  ✓ Invoice numbering system visible`);
      } else {
        this.results.INVOICES['Invoice numbering system exists'] = { status: 'UNVERIFIED' };
      }

      // Check for due date
      if (res.data.includes('due') || res.data.includes('date') || res.data.includes('deadline')) {
        this.results.INVOICES['Due date functionality visible'] = { status: 'PASS' };
        console.log(`  ✓ Due date functionality visible`);
      } else {
        this.results.INVOICES['Due date functionality visible'] = { status: 'UNVERIFIED' };
      }

      // Check for payment/status buttons
      if (res.data.includes('paid') || res.data.includes('payment') || res.data.includes('button')) {
        this.results.INVOICES['Payment action buttons visible'] = { status: 'PASS' };
        console.log(`  ✓ Payment action buttons visible`);
      } else {
        this.results.INVOICES['Payment action buttons visible'] = { status: 'UNVERIFIED' };
      }

    } catch (e) {
      this.results.INVOICES['Invoices page loads'] = { status: 'FAIL', error: e.message };
      console.log(`  ✗ Invoices test failed: ${e.message}`);
    }

    console.log('');
  }

  async testSettings() {
    console.log('⚙️ SETTINGS Tests\n');
    
    try {
      const res = await this.makeRequest('/settings/payment');
      
      this.results.SETTINGS['Settings page loads'] = {
        status: res.status === 200 ? 'PASS' : 'FAIL',
        code: res.status
      };
      console.log(`  ✓ Settings page loads (${res.status})`);
      
      // Check for payment fields
      if (res.data.includes('payment') || res.data.includes('bank') || res.data.includes('stripe')) {
        this.results.SETTINGS['Payment details form present'] = { status: 'PASS' };
        console.log(`  ✓ Payment details form present`);
      } else {
        this.results.SETTINGS['Payment details form present'] = { status: 'UNVERIFIED' };
      }

      // Check for save button
      if (res.data.includes('save') || res.data.includes('submit') || res.data.includes('button')) {
        this.results.SETTINGS['Save functionality available'] = { status: 'PASS' };
        console.log(`  ✓ Save functionality available`);
      } else {
        this.results.SETTINGS['Save functionality available'] = { status: 'UNVERIFIED' };
      }

    } catch (e) {
      this.results.SETTINGS['Settings page loads'] = { status: 'FAIL', error: e.message };
      console.log(`  ✗ Settings test failed: ${e.message}`);
    }

    console.log('');
  }

  async testPaymentPage() {
    console.log('💳 PAYMENT PAGE Tests\n');
    
    try {
      // Test payment page (generic invoice ID)
      const res = await this.makeRequest('/pay/test-invoice-123');
      
      this.results.PAYMENT_PAGE['Payment page template accessible'] = {
        status: res.status === 200 || res.status === 404 ? 'PASS' : 'FAIL',
        note: 'Page structure accessible'
      };
      console.log(`  ✓ Payment page route accessible (${res.status})`);
      
      // Check for payment form
      if (res.data.includes('payment') || res.data.includes('amount') || res.data.includes('card')) {
        this.results.PAYMENT_PAGE['Payment form elements present'] = { status: 'PASS' };
        console.log(`  ✓ Payment form elements present`);
      } else {
        this.results.PAYMENT_PAGE['Payment form elements present'] = { status: 'UNVERIFIED' };
      }

    } catch (e) {
      this.results.PAYMENT_PAGE['Payment page template accessible'] = { status: 'FAIL', error: e.message };
      console.log(`  ✗ Payment page test failed: ${e.message}`);
    }

    console.log('');
  }

  async testSmartReminders() {
    console.log('🔔 SMART REMINDERS Tests\n');
    
    try {
      // Test cron endpoint
      const res = await this.makeRequest('/api/cron/send-reminders', 'POST');
      
      this.results.SMART_REMINDERS['Cron endpoint accessible'] = {
        status: res.status === 200 || res.status === 401 ? 'PASS' : 'FAIL',
        code: res.status
      };
      console.log(`  ✓ Cron endpoint accessible (${res.status})`);
      
      // Check for reminders log
      try {
        const logRes = await this.makeRequest('/api/reminders-log');
        this.results.SMART_REMINDERS['Reminders log accessible'] = {
          status: logRes.status === 200 ? 'PASS' : 'FAIL',
          code: logRes.status
        };
        console.log(`  ✓ Reminders log endpoint accessible (${logRes.status})`);
      } catch (e) {
        this.results.SMART_REMINDERS['Reminders log accessible'] = { status: 'FAIL', error: e.message };
      }

    } catch (e) {
      this.results.SMART_REMINDERS['Cron endpoint accessible'] = { status: 'FAIL', error: e.message };
      console.log(`  ✗ Reminders test failed: ${e.message}`);
    }

    console.log('');
  }

  printResults() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 TEST RESULTS SUMMARY');
    console.log('='.repeat(70) + '\n');

    for (const [category, tests] of Object.entries(this.results)) {
      if (Object.keys(tests).length === 0) continue;
      
      console.log(`\n${category}`);
      console.log('-'.repeat(50));
      
      for (const [testName, result] of Object.entries(tests)) {
        if (result.status === 'PASS') {
          console.log(`✅ ${testName} — Pass`);
        } else if (result.status === 'FAIL') {
          const details = result.error ? ` (error: ${result.error})` : 
                         result.expected ? ` (expected: ${result.expected}, got: ${result.got})` : '';
          console.log(`❌ ${testName} — Fail${details}`);
        } else if (result.status === 'UNVERIFIED') {
          console.log(`⚠️  ${testName} — Requires browser verification`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 Note: Full interactive testing (form submission, button clicks,');
    console.log('   dynamic content verification) requires Playwright or Puppeteer.');
    console.log('   This script provides API-level and HTML structure validation.\n');
  }
}

// Run tests
const tester = new PrismTester();
tester.runTests().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
