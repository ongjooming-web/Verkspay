#!/usr/bin/env node

/**
 * Test script for /api/invoices/suggestions endpoint
 * Uses Supabase service role to test internally
 */

const https = require('https');

// Test configuration
const PRISM_URL = 'https://app.prismops.xyz';

async function testSuggestionsEndpoint() {
  console.log('🧪 Testing Suggestions API Endpoint\n');

  try {
    // Step 1: Fetch a test client from the database using Supabase
    console.log('📍 Step 1: Fetching test data from Supabase...');
    
    // Note: In production, we'd use the Supabase client directly
    // For this test, we'll call the endpoint with a test clientId
    
    const testClientId = 'test-client-id'; // Replace with real ID from your DB
    console.log(`   Using test client ID: ${testClientId}\n`);

    // Step 2: Call the suggestions endpoint
    console.log('📍 Step 2: Calling /api/invoices/suggestions endpoint...');
    
    const url = `${PRISM_URL}/api/invoices/suggestions?clientId=${testClientId}`;
    console.log(`   URL: ${url}`);
    
    // Since we don't have a user token, we'll test with no auth
    // The endpoint should still return empty suggestions gracefully
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}\n`);
    console.log('📊 Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Step 3: Validate response structure
    console.log('\n📍 Step 3: Validating response structure...');
    
    if (data.error) {
      console.log(`   ❌ Error: ${data.error}`);
      return;
    }
    
    const requiredFields = ['payment_terms', 'currency_code', 'suggested_line_items', 'average_amount', 'invoice_count'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
      return;
    }
    
    console.log('   ✅ Response structure is valid');
    
    if (data.invoice_count > 0) {
      console.log(`   ✅ Found ${data.invoice_count} past invoices for this client`);
      console.log(`   ✅ ${data.suggested_line_items.length} line item suggestions`);
      console.log(`   ✅ Payment terms: ${data.payment_terms || '(none)'}`);
      console.log(`   ✅ Average amount: ${data.average_amount || '(none)'}`);
    } else {
      console.log('   ℹ️  New client (no invoice history)');
    }
    
    console.log('\n✅ Endpoint test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Alternative: Direct Node.js test without fetch
async function testWithNodeHttps() {
  return new Promise((resolve, reject) => {
    const url = new URL('https://app.prismops.xyz/api/invoices/suggestions?clientId=test');
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response Body:', data);
        resolve();
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Run test
console.log('🚀 Prism Suggestions Endpoint Test\n');
console.log('='.repeat(50) + '\n');

testSuggestionsEndpoint().catch(console.error);
