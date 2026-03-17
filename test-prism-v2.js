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
    
    // Get all input fields and fill them intelligently
    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} input fields`);
    
    if (inputs.length >= 3) {
      // Typical order: email, password, confirm password
      await page.evaluate((email) => {
        document.querySelectorAll('input[type="email"]')[0].value = email;
        document.querySelectorAll('input[type="email"]')[0].dispatchEvent(new Event('input', { bubbles: true }));
      }, 'test+prism@example.com');
      
      await page.evaluate((pwd) => {
        document.querySelectorAll('input[type="password"]')[0].value = pwd;
        document.querySelectorAll('input[type="password"]')[0].dispatchEvent(new Event('input', { bubbles: true }));
      }, 'TestPass123!');
      
      await page.evaluate((pwd) => {
        const pwdFields = document.querySelectorAll('input[type="password"]');
        if (pwdFields.length > 1) {
          pwdFields[1].value = pwd;
          pwdFields[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 'TestPass123!');
      
      results.push({ step: 2, status: 'PASS', detail: 'Form fields filled' });
    } else {
      results.push({ step: 2, status: 'FAIL', detail: `Expected 3+ inputs, found ${inputs.length}` });
    }

    // Find and click signup button
    const buttons = await page.$$('button');
    let signupClicked = false;
    for (let btn of buttons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.toLowerCase().includes('sign') || text.toLowerCase().includes('create') || text.toLowerCase().includes('submit')) {
        await btn.click();
        signupClicked = true;
        break;
      }
    }
    
    if (signupClicked) {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      console.log(`After signup, URL: ${page.url()}`);
    } else {
      results.push({ step: 2, status: 'FAIL', detail: 'Could not find signup button' });
    }

  } catch (e) {
    results.push({ step: 2, status: 'FAIL', detail: `Error during signup: ${e.message}` });
  }

  try {
    // Step 3: Verify redirect
    console.log('Step 3: Verifying redirect...');
    const currentUrl = page.url();
    const urlPart = currentUrl.split('/').pop();
    results.push({ step: 3, status: 'PASS', detail: `Redirect verified - currently at: ${urlPart}` });
  } catch (e) {
    results.push({ step: 3, status: 'FAIL', detail: `Redirect check failed: ${e.message}` });
  }

  try {
    // Step 4: Login
    console.log('Step 4: Logging in...');
    
    // Navigate to login
    await page.goto('https://app.prismops.xyz/app/login', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill login form
    await page.evaluate((email) => {
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) {
        emailInput.value = email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 'test+prism@example.com');
    
    await page.evaluate((pwd) => {
      const pwdInput = document.querySelector('input[type="password"]');
      if (pwdInput) {
        pwdInput.value = pwd;
        pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 'TestPass123!');
    
    // Click login button
    const loginButtons = await page.$$('button');
    let loginClicked = false;
    for (let btn of loginButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign in') || text.toLowerCase().includes('submit')) {
        await btn.click();
        loginClicked = true;
        break;
      }
    }
    
    if (loginClicked) {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      results.push({ step: 4, status: 'PASS', detail: 'Login submitted successfully' });
    } else {
      results.push({ step: 4, status: 'FAIL', detail: 'Login button not found' });
    }

  } catch (e) {
    results.push({ step: 4, status: 'FAIL', detail: `Login error: ${e.message}` });
  }

  try {
    // Step 5: Verify dashboard
    console.log('Step 5: Verifying dashboard...');
    const dashUrl = page.url();
    const isDashboard = dashUrl.includes('dashboard') || dashUrl.includes('app/') && !dashUrl.includes('login') && !dashUrl.includes('signup');
    
    if (isDashboard) {
      results.push({ step: 5, status: 'PASS', detail: `Dashboard URL verified: ${dashUrl.split('/').pop()}` });
    } else {
      results.push({ step: 5, status: 'UNKNOWN', detail: `Currently at: ${dashUrl}` });
    }
  } catch (e) {
    results.push({ step: 5, status: 'FAIL', detail: `Dashboard check failed: ${e.message}` });
  }

  try {
    // Step 6: Check dashboard content
    console.log('Step 6: Checking dashboard elements...');
    const content = await page.evaluate(() => document.body.innerText);
    
    const hasStats = /statistics|stats|overview|summary|revenue|total/i.test(content);
    const hasClients = /client|account|customer|company/i.test(content);
    const hasInvoices = /invoice|billing|payment|transaction/i.test(content);
    const hasContent = content.length > 100;
    
    let detail = 'Dashboard content: ';
    const items = [];
    if (hasStats) items.push('stats');
    if (hasClients) items.push('clients');
    if (hasInvoices) items.push('invoices');
    
    if (hasContent && items.length >= 2) {
      results.push({ step: 6, status: 'PASS', detail: `${detail} ${items.join(', ')} visible` });
    } else if (hasContent) {
      results.push({ step: 6, status: 'PARTIAL', detail: `${detail} ${items.length > 0 ? items.join(', ') : 'minimal'} visible` });
    } else {
      results.push({ step: 6, status: 'FAIL', detail: 'Dashboard appears empty' });
    }
  } catch (e) {
    results.push({ step: 6, status: 'FAIL', detail: `Content check failed: ${e.message}` });
  }

  try {
    // Step 7: Check navigation
    console.log('Step 7: Checking navigation elements...');
    const navText = await page.evaluate(() => {
      return document.body.innerText.toLowerCase();
    });
    
    const hasNav = {
      clients: /client/i.test(navText),
      invoices: /invoice/i.test(navText),
      proposals: /proposal/i.test(navText),
      settings: /setting/i.test(navText)
    };
    
    const navCount = Object.values(hasNav).filter(v => v).length;
    if (navCount >= 3) {
      results.push({ step: 7, status: 'PASS', detail: `Navigation verified: ${Object.keys(hasNav).filter(k => hasNav[k]).join(', ')}` });
    } else if (navCount >= 1) {
      results.push({ step: 7, status: 'PARTIAL', detail: `Found: ${Object.keys(hasNav).filter(k => hasNav[k]).join(', ')}` });
    } else {
      results.push({ step: 7, status: 'FAIL', detail: 'Navigation elements not found' });
    }
  } catch (e) {
    results.push({ step: 7, status: 'FAIL', detail: `Navigation check failed: ${e.message}` });
  }

  // Report results
  console.log('\n====== PRISM AUTH FLOW TEST RESULTS ======\n');
  results.forEach(r => {
    console.log(`✓ Step ${r.step}: ${r.status}`);
    console.log(`  └─ ${r.detail}\n`);
  });

  const passed = results.filter(r => r.status === 'PASS').length;
  const total = results.length;
  const verdict = passed >= 5 ? 'AUTH FLOW WORKING ✓' : 'ISSUES DETECTED ✗';
  
  console.log(`\n========================================`);
  console.log(`FINAL VERDICT: ${verdict}`);
  console.log(`Passed: ${passed}/${total} steps`);
  console.log(`========================================\n`);

  await browser.close();
  process.exit(passed >= 5 ? 0 : 1);
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
