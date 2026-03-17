/**
 * Test script for mark-paid endpoint
 * Run: npx ts-node test-mark-paid.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    results.push({ name, passed: true, message: 'PASSED' })
    console.log(`✓ ${name}`)
  } catch (err: any) {
    results.push({ 
      name, 
      passed: false, 
      message: err.message || String(err),
      details: err
    })
    console.log(`✗ ${name}: ${err.message}`)
  }
}

async function main() {
  console.log('🧪 Testing Mark-as-Paid Flow\n')

  // Test 1: Can connect to Supabase
  await test('Supabase Connection', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await supabase.auth.getSession()
    if (error) throw new Error(`Auth error: ${error.message}`)
  })

  // Test 2: Can read invoices
  await test('Read Invoices', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .limit(1)
    if (error) throw new Error(`Query error: ${error.message}`)
  })

  // Test 3: Can update invoice status
  await test('Update Invoice Status', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    
    // Find a test invoice first
    const { data: invoices, error: selectError } = await supabase
      .from('invoices')
      .select('id')
      .eq('status', 'sent')
      .limit(1)
    
    if (selectError) throw new Error(`Select error: ${selectError.message}`)
    if (!invoices || invoices.length === 0) {
      throw new Error('No "sent" invoices found for testing')
    }

    const invoiceId = invoices[0].id
    console.log(`  Using test invoice: ${invoiceId}`)

    // Update to paid
    const { data: updateData, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()

    if (updateError) throw new Error(`Update error: ${updateError.message}`)
    if (!updateData || updateData.length === 0) {
      throw new Error('Update returned no data')
    }

    // Verify it changed
    if (updateData[0].status !== 'paid') {
      throw new Error(`Status not changed! Got: ${updateData[0].status}`)
    }

    console.log(`  Invoice ${invoiceId} status: ${updateData[0].status}`)

    // Reset back to sent
    await supabase
      .from('invoices')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
  })

  // Test 4: Database schema check
  await test('Database Schema Check', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    
    // Get one invoice and check all expected columns
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .limit(1)
    
    if (error) throw new Error(`Query error: ${error.message}`)
    if (!data || data.length === 0) throw new Error('No invoices found')

    const invoice = data[0]
    const requiredColumns = ['id', 'status', 'paid_date', 'payment_method', 'updated_at']
    const missingColumns = requiredColumns.filter(col => !(col in invoice))

    if (missingColumns.length > 0) {
      throw new Error(`Missing columns: ${missingColumns.join(', ')}`)
    }

    console.log(`  Available columns: ${Object.keys(invoice).join(', ')}`)
  })

  // Summary
  console.log('\n' + '='.repeat(50))
  const passed = results.filter(r => r.passed).length
  const total = results.length
  console.log(`Results: ${passed}/${total} passed`)

  if (passed < total) {
    console.log('\nFailed tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`)
    })
  }

  process.exit(passed === total ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
