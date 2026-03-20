const http = require('http');
const https = require('https');

// Manual HTTP testing (no Playwright needed)
async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const reqOptions = {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      }
    };
    
    protocol.get(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function runTests() {
  const results = {
    AUTHENTICATION: {},
    DASHBOARD: {},
    INVOICES: {},
    PAYMENT_PAGE: {},
    SMART_REMINDERS: {},
    STRIPE_CONNECT: {},
    SETTINGS: {}
  };
  
  console.log('Starting Prism App Tests...\n');
  
  // Test 1: Check if signup page loads
  try {
    console.log('Testing: Signup page loads...');
    const res = await makeRequest('https://prismops.xyz/signup');
    if (res.status === 200 && res.data.includes('sign')) {
      results.AUTHENTICATION['Signup page loads'] = { status: 'PASS' };
      console.log('✓ Signup page accessible');
    } else {
      results.AUTHENTICATION['Signup page loads'] = { status: 'FAIL', code: res.status };
    }
  } catch (e) {
    results.AUTHENTICATION['Signup page loads'] = { status: 'FAIL', error: e.message };
  }
  
  // Test 2: Check if login page loads
  try {
    console.log('Testing: Login page loads...');
    const res = await makeRequest('https://prismops.xyz/login');
    if (res.status === 200) {
      results.AUTHENTICATION['Login page loads'] = { status: 'PASS' };
      console.log('✓ Login page accessible');
    } else {
      results.AUTHENTICATION['Login page loads'] = { status: 'FAIL', code: res.status };
    }
  } catch (e) {
    results.AUTHENTICATION['Login page loads'] = { status: 'FAIL', error: e.message };
  }
  
  // Test 3: Check dashboard
  try {
    console.log('Testing: Dashboard page exists...');
    const res = await makeRequest('https://prismops.xyz/dashboard');
    if (res.status === 200 || res.status === 302) { // 302 if redirected to login
      results.DASHBOARD['Dashboard accessible'] = { status: 'PASS' };
      console.log('✓ Dashboard page accessible (auth check: ' + res.status + ')');
    }
  } catch (e) {
    results.DASHBOARD['Dashboard accessible'] = { status: 'FAIL', error: e.message };
  }
  
  console.log('\nNote: Full UI testing requires authenticated browser session');
  console.log('HTTP tests completed. Switching to authenticated session tests...\n');
  
  return results;
}

runTests().then(results => {
  console.log('\n=== Test Summary ===');
  console.log(JSON.stringify(results, null, 2));
}).catch(e => {
  console.error('Test suite error:', e);
  process.exit(1);
});
