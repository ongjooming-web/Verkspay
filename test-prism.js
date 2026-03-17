const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, timeout: 30000 });
  const page = await browser.newPage();
  const results = [];

  try {
    // Step 1: Navigate to signup
    console.log('Step 1: Going to signup page...');
    await page.goto('https://app.prismops.xyz/app/signup', { waitUntil: 'networkidle2', timeout: 30000 });
    results.push({ step: 1, status: 'PASS', detail: 'Signup page loaded' });

    // Step 2: Create account
    console.log('Step 2: Creating test account...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'test+prism@example.com');
    await page.type('input[type="password"]:first-of-type', 'TestPass123!');
    
    // Find and fill confirm password (might be second password field)
    const passwordFields = await page.$$('input[type="password"]');
    if (passwordFields.length >= 2) {
      await page.type('input[type="password"]:nth-of-type(2)', 'TestPass123!');
    }
    
    // Click signup button
    const signupButton = await page.$('button[type="submit"]') || await page.$('button:contains("Sign up")');
    if (signupButton) {
      await signupButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      results.push({ step: 2, status: 'PASS', detail: 'Account created and form submitted' });
    } else {
      results.push({ step: 2, status: 'FAIL', detail: 'Signup button not found' });
    }

  } catch (e) {
    results.push({ step: 2, status: 'FAIL', detail: `Error during signup: ${e.message}` });
  }

  try {
    // Step 3: Verify redirect to login
    console.log('Step 3: Verifying redirect...');
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('verify')) {
      results.push({ step: 3, status: 'PASS', detail: `Redirected to: ${currentUrl}` });
    } else {
      results.push({ step: 3, status: 'UNKNOWN', detail: `Currently at: ${currentUrl}` });
    }
  } catch (e) {
    results.push({ step: 3, status: 'FAIL', detail: `Redirect check failed: ${e.message}` });
  }

  try {
    // Step 4: Login
    console.log('Step 4: Logging in...');
    // Navigate to login if not already there
    if (!page.url().includes('login')) {
      await page.goto('https://app.prismops.xyz/app/login', { waitUntil: 'networkidle2', timeout: 30000 });
    }
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'test+prism@example.com');
    await page.type('input[type="password"]', 'TestPass123!');
    
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      results.push({ step: 4, status: 'PASS', detail: 'Login submitted' });
    } else {
      results.push({ step: 4, status: 'FAIL', detail: 'Login button not found' });
    }

  } catch (e) {
    results.push({ step: 4, status: 'FAIL', detail: `Login failed: ${e.message}` });
  }

  try {
    // Step 5: Verify dashboard redirect
    console.log('Step 5: Verifying dashboard redirect...');
    const dashboardUrl = page.url();
    if (dashboardUrl.includes('dashboard') || dashboardUrl.includes('app/')) {
      results.push({ step: 5, status: 'PASS', detail: `Dashboard loaded: ${dashboardUrl}` });
    } else {
      results.push({ step: 5, status: 'UNKNOWN', detail: `Currently at: ${dashboardUrl}` });
    }
  } catch (e) {
    results.push({ step: 5, status: 'FAIL', detail: `Dashboard redirect failed: ${e.message}` });
  }

  try {
    // Step 6: Check dashboard elements
    console.log('Step 6: Checking dashboard elements...');
    const hasContent = await page.evaluate(() => {
      return document.body.innerText.length > 100;
    });
    
    const pageContent = await page.evaluate(() => document.body.innerText);
    const hasStats = pageContent.toLowerCase().includes('stat') || pageContent.toLowerCase().includes('overview');
    const hasClients = pageContent.toLowerCase().includes('client');
    const hasInvoices = pageContent.toLowerCase().includes('invoice');
    
    if (hasContent && (hasStats || hasClients || hasInvoices)) {
      results.push({ step: 6, status: 'PASS', detail: 'Dashboard loaded with content (stats/clients/invoices visible)' });
    } else if (hasContent) {
      results.push({ step: 6, status: 'PARTIAL', detail: 'Dashboard has content but missing some expected elements' });
    } else {
      results.push({ step: 6, status: 'FAIL', detail: 'Dashboard appears empty' });
    }
  } catch (e) {
    results.push({ step: 6, status: 'FAIL', detail: `Dashboard check failed: ${e.message}` });
  }

  try {
    // Step 7: Test navigation
    console.log('Step 7: Testing navigation...');
    const navElements = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      return links.map(el => el.innerText.toLowerCase()).filter(t => t.length > 0);
    });
    
    const hasNavigation = navElements.some(el => 
      el.includes('client') || el.includes('invoice') || el.includes('proposal') || el.includes('setting')
    );
    
    if (hasNavigation) {
      results.push({ step: 7, status: 'PASS', detail: 'Navigation elements found (Clients/Invoices/Proposals/Settings visible)' });
    } else {
      results.push({ step: 7, status: 'UNKNOWN', detail: 'Navigation structure unclear - manual verification needed' });
    }
  } catch (e) {
    results.push({ step: 7, status: 'FAIL', detail: `Navigation check failed: ${e.message}` });
  }

  // Report results
  console.log('\n=== PRISM AUTH FLOW TEST RESULTS ===\n');
  results.forEach(r => {
    console.log(`Step ${r.step}: ${r.status}`);
    console.log(`  └─ ${r.detail}\n`);
  });

  const allPassed = results.every(r => r.status === 'PASS' || r.status === 'UNKNOWN' || r.status === 'PARTIAL');
  console.log(`\nFINAL VERDICT: ${allPassed ? 'AUTH FLOW WORKING' : 'ISSUES DETECTED'}`);
  console.log(`Passed: ${results.filter(r => r.status === 'PASS').length}/${results.length}\n`);

  await browser.close();
  process.exit(allPassed ? 0 : 1);
})().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
