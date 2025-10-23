// Debug script to examine the full invoice creation response
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://piluvdxahsstsgcseybj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpbHV2ZHhhaHNzdHNnY3NleWJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTcwOTY1NSwiZXhwIjoyMDYxMjg1NjU1fQ.zCwTGhWFI93EUvCKkmQaGj7TbMGtI4e7YGEgBVtuXtM'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugInvoiceResponse() {
  console.log('🔍 Debugging Invoice Response Format')
  console.log('='.repeat(60))
  
  const LND_REST_URL = process.env.LND_REST_URL
  const LND_ADMIN_MACAROON = process.env.LND_ADMIN_MACAROON
  
  if (!LND_REST_URL || !LND_ADMIN_MACAROON) {
    console.log('❌ Lightning configuration missing!')
    return
  }
  
  try {
    const baseUrl = LND_REST_URL.startsWith("http") ? LND_REST_URL : `https://${LND_REST_URL}`
    const url = `${baseUrl}/v1/invoices`
    
    console.log(`🧪 Creating test invoice...`)
    console.log(`  URL: ${url}`)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Grpc-Metadata-macaroon': LND_ADMIN_MACAROON,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: '1000',
        memo: 'Debug test invoice',
        expiry: '3600'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Invoice created successfully!')
      console.log('📋 Full Response:')
      console.log(JSON.stringify(data, null, 2))
      console.log('')
      
      // Check what fields are available
      console.log('🔍 Available Fields:')
      Object.keys(data).forEach(key => {
        console.log(`  ${key}: ${typeof data[key]} = ${JSON.stringify(data[key])}`)
      })
      console.log('')
      
      // Try to find the r_hash in different formats
      if (data.r_hash) {
        console.log('📝 R-Hash (base64):', data.r_hash)
        try {
          const rHashHex = Buffer.from(data.r_hash, 'base64').toString('hex')
          console.log('📝 R-Hash (hex):', rHashHex)
          
          // Now try to check this invoice
          console.log('🔍 Checking invoice with hex r_hash...')
          const checkUrl = `${baseUrl}/v1/invoice/${rHashHex}`
          console.log(`  Checking: ${checkUrl}`)
          
          const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: {
              'Grpc-Metadata-macaroon': LND_ADMIN_MACAROON,
              'Content-Type': 'application/json',
            }
          })
          
          if (checkResponse.ok) {
            const invoiceData = await checkResponse.json()
            console.log('✅ Invoice found with hex r_hash!')
            console.log('  Invoice Data:', JSON.stringify(invoiceData, null, 2))
          } else {
            console.log('❌ Invoice not found with hex r_hash')
            const errorText = await checkResponse.text()
            console.log(`  Error: ${errorText}`)
          }
        } catch (error) {
          console.log('❌ Error converting r_hash:', error.message)
        }
      } else {
        console.log('❌ No r_hash field found in response')
      }
      
    } else {
      console.log('❌ Failed to create invoice!')
      const errorText = await response.text()
      console.log(`  Error: ${errorText}`)
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
}

debugInvoiceResponse().catch(console.error)


