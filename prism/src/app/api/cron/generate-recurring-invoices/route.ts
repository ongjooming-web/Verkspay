import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInvoiceNumber } from '@/utils/invoice-numbering'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GenerationResult {
  success: boolean
  templateId: string
  invoiceNumber: string
  clientId: string
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`

    if (!authHeader || authHeader !== expectedSecret) {
      console.error('[RecurringCron] Unauthorized attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    console.log(`[RecurringCron] Starting generation run at ${now.toISOString()}`)

    // 1. Query all active recurring invoices due today or earlier
    const { data: recurringTemplates, error: queryError } = await supabase
      .from('recurring_invoices')
      .select(`
        id,
        user_id,
        client_id,
        description,
        line_items,
        amount,
        currency_code,
        payment_terms,
        frequency,
        next_generate_date,
        end_date,
        invoices_generated,
        last_generated_at
      `)
      .eq('status', 'active')
      .lte('next_generate_date', todayStr)

    if (queryError) {
      console.error('[RecurringCron] Query error:', queryError)
      return NextResponse.json(
        { error: 'Failed to query recurring invoices', details: queryError },
        { status: 500 }
      )
    }

    const templates = recurringTemplates || []
    console.log(`[RecurringCron] Found ${templates.length} templates due for generation`)

    const results: GenerationResult[] = []
    let generated = 0
    let errors = 0

    // 2. For each template, create invoice and update template
    for (const template of templates) {
      try {
        // Generate invoice number for this user
        let invoiceNumber: string
        try {
          invoiceNumber = await generateInvoiceNumber(template.user_id, supabase)
        } catch (err) {
          console.error(`[RecurringCron] Failed to generate number for template ${template.id}:`, err)
          results.push({
            success: false,
            templateId: template.id,
            invoiceNumber: 'ERROR',
            clientId: template.client_id,
            error: 'Failed to generate invoice number'
          })
          errors++
          continue
        }

        // Calculate due date based on payment terms
        const generatedDate = new Date(template.next_generate_date)
        const dueDate = new Date(generatedDate)

        if (template.payment_terms) {
          if (template.payment_terms.includes('Net 15')) {
            dueDate.setDate(dueDate.getDate() + 15)
          } else if (template.payment_terms.includes('Net 30')) {
            dueDate.setDate(dueDate.getDate() + 30)
          } else if (template.payment_terms.includes('Net 60')) {
            dueDate.setDate(dueDate.getDate() + 60)
          }
          // Due on Receipt = same day
        }

        // Create invoice from template
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert([
            {
              user_id: template.user_id,
              client_id: template.client_id,
              invoice_number: invoiceNumber,
              amount: template.amount,
              currency_code: template.currency_code,
              status: 'unpaid',
              description: template.description || `Recurring invoice from ${new Date(generatedDate).toLocaleDateString()}`,
              payment_terms: template.payment_terms,
              line_items: template.line_items,
              due_date: dueDate.toISOString().split('T')[0],
              recurring_invoice_id: template.id,
              amount_paid: 0,
              remaining_balance: template.amount,
              created_at: generatedDate.toISOString(),
              updated_at: generatedDate.toISOString()
            }
          ])
          .select()

        if (invoiceError) {
          console.error(`[RecurringCron] Failed to create invoice for template ${template.id}:`, invoiceError)
          results.push({
            success: false,
            templateId: template.id,
            invoiceNumber: invoiceNumber,
            clientId: template.client_id,
            error: invoiceError.message
          })
          errors++
          continue
        }

        // Calculate next generation date
        let nextDate = new Date(template.next_generate_date)
        
        switch (template.frequency) {
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7)
            break
          case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14)
            break
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1)
            break
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3)
            break
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1)
            break
        }

        const nextDateStr = nextDate.toISOString().split('T')[0]

        // Determine if template should be marked completed
        let newStatus = 'active'
        if (template.end_date && nextDateStr > template.end_date) {
          newStatus = 'completed'
        }

        // Update template
        const { error: updateError } = await supabase
          .from('recurring_invoices')
          .update({
            invoices_generated: (template.invoices_generated || 0) + 1,
            last_generated_at: new Date().toISOString(),
            next_generate_date: nextDateStr,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id)

        if (updateError) {
          console.error(`[RecurringCron] Failed to update template ${template.id}:`, updateError)
          results.push({
            success: false,
            templateId: template.id,
            invoiceNumber: invoiceNumber,
            clientId: template.client_id,
            error: `Invoice created but template update failed: ${updateError.message}`
          })
          errors++
          continue
        }

        console.log(`[RecurringCron] Generated ${invoiceNumber} for template ${template.id}`)
        results.push({
          success: true,
          templateId: template.id,
          invoiceNumber: invoiceNumber,
          clientId: template.client_id
        })
        generated++
      } catch (err) {
        console.error(`[RecurringCron] Unexpected error for template ${template.id}:`, err)
        results.push({
          success: false,
          templateId: template.id,
          invoiceNumber: 'ERROR',
          clientId: template.client_id,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
        errors++
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      generated,
      errors,
      total: templates.length,
      results
    }

    console.log(`[RecurringCron] Completed: ${generated} generated, ${errors} errors`)

    return NextResponse.json(summary, { status: 200 })
  } catch (err) {
    console.error('[RecurringCron] Fatal error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
