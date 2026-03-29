// Script to verify Supabase keys
// Run: node verify-keys.js

const fs = require('fs')
const path = require('path')

// Read .env.local
const envPath = path.join(__dirname, 'prism', '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found at:', envPath)
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf-8')
const lines = envContent.split('\n')

const env = {}
lines.forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

console.log('=== Supabase Key Verification ===\n')

const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

console.log('Anon Key:')
console.log('  Env var name: NEXT_PUBLIC_SUPABASE_ANON_KEY')
console.log('  Present:', !!anonKey)
if (anonKey) {
  console.log('  First 10 chars:', anonKey.substring(0, 10))
  try {
    const [header, payload] = anonKey.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
    console.log('  Role:', decoded.role)
  } catch (e) {
    console.log('  Could not decode payload')
  }
}

console.log('\nService Role Key:')
console.log('  Env var name: SUPABASE_SERVICE_ROLE_KEY')
console.log('  Present:', !!serviceRoleKey)
if (serviceRoleKey) {
  console.log('  First 10 chars:', serviceRoleKey.substring(0, 10))
  try {
    const [header, payload] = serviceRoleKey.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
    console.log('  Role:', decoded.role)
    console.log('  ✓ Has correct "service_role":', decoded.role === 'service_role')
  } catch (e) {
    console.log('  Could not decode payload')
  }
} else {
  console.log('  ❌ SERVICE_ROLE_KEY NOT SET!')
  console.log('  You need to add SUPABASE_SERVICE_ROLE_KEY to .env.local')
  console.log('  Get it from: Supabase Dashboard → Settings → API')
}

console.log('\n=== Next Steps ===')
if (!serviceRoleKey) {
  console.log('1. Go to https://app.supabase.com')
  console.log('2. Select your Prism project')
  console.log('3. Go to Settings → API')
  console.log('4. Copy the "service_role secret" (NOT the anon key)')
  console.log('5. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>')
  console.log('6. Add to Vercel environment variables with the same name')
}
