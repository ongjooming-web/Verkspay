const https = require('https');

async function inspectApp() {
  const urls = [
    '/login',
    '/signup',
    '/dashboard',
    '/invoices',
    '/settings',
    '/pay/test',
    '/api/auth/login',
    '/api/login',
    '/'
  ];

  for (const path of urls) {
    try {
      const res = await fetch('https://prismops.xyz' + path);
      const text = await res.text();
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Path: ${path}`);
      console.log(`Status: ${res.status}`);
      console.log(`Content-Length: ${text.length}`);
      
      // Look for key indicators
      if (text.includes('form')) console.log('✓ Contains form');
      if (text.includes('input')) console.log('✓ Contains input fields');
      if (text.includes('email')) console.log('✓ Contains email reference');
      if (text.includes('password')) console.log('✓ Contains password reference');
      if (text.includes('dashboard')) console.log('✓ Contains dashboard reference');
      if (text.includes('invoice')) console.log('✓ Contains invoice reference');
      if (text.includes('stripe')) console.log('✓ Contains stripe reference');
      if (text.includes('next')) console.log('✓ Contains Next.js reference');
      if (text.includes('react')) console.log('✓ Contains React reference');
      if (text.includes('__NEXT_DATA__')) console.log('✓ Is Next.js SPA');
      
      // Show first 500 chars of body
      const bodyStart = text.indexOf('<body');
      if (bodyStart !== -1) {
        console.log(`\nHTML snippet:\n${text.substring(bodyStart, bodyStart + 500)}`);
      }
    } catch (e) {
      console.log(`\nPath: ${path} - Error: ${e.message}`);
    }
  }
}

inspectApp().catch(console.error);
