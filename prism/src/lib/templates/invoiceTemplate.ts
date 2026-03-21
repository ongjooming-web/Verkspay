import { formatCurrency } from '@/lib/countries'

export interface InvoiceTemplateData {
  business_name: string
  business_email?: string
  business_phone?: string
  business_address?: string
  business_logo_url?: string
  business_reg_number?: string
  tax_number?: string
  invoice_number: string
  created_at: string
  due_date: string
  payment_terms?: string
  description?: string
  currency_code: string
  subtotal: number
  tax_rate?: number
  tax_amount?: number
  total: number
  client_name: string
  client_email?: string
  payment_url: string
}

export function generateInvoiceHTML(data: InvoiceTemplateData): string {
  const taxLine = data.tax_amount && data.tax_amount > 0 ? `
    <tr>
      <td colspan="1" style="padding:6px 0;color:#666;font-size:14px;">Tax (${data.tax_rate || 8}%)</td>
      <td style="padding:6px 0;text-align:right;color:#666;font-size:14px;">
        ${formatCurrency(data.tax_amount, data.currency_code)}
      </td>
    </tr>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 14px; line-height: 1.6; }
    .page { max-width: 800px; margin: 0 auto; padding: 60px 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
    .logo { max-height: 48px; max-width: 160px; object-fit: contain; }
    .business-name { font-size: 22px; font-weight: 700; color: #1a1a1a; }
    .business-details { margin-top: 6px; color: #666; font-size: 13px; line-height: 1.8; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 36px; font-weight: 800; color: #1a1a1a; letter-spacing: -1px; }
    .invoice-title .invoice-number { font-size: 14px; color: #666; margin-top: 4px; }
    .divider { border: none; border-top: 1px solid #e5e5e5; margin: 32px 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 48px; }
    .meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 4px; }
    .meta-value { font-size: 15px; color: #1a1a1a; font-weight: 500; }
    .meta-value-small { font-size: 13px; color: #444; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    thead tr { border-bottom: 2px solid #1a1a1a; }
    thead th { padding: 10px 0; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #999; }
    thead th:last-child { text-align: right; }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody td { padding: 16px 0; font-size: 14px; color: #1a1a1a; vertical-align: top; }
    tbody td:last-child { text-align: right; }
    .totals-table { width: 320px; margin-left: auto; }
    .totals-table td { padding: 6px 0; font-size: 14px; }
    .totals-table td:last-child { text-align: right; }
    .total-row td { padding-top: 12px; border-top: 2px solid #1a1a1a; font-size: 18px; font-weight: 700; }
    .payment-section { margin-top: 48px; padding: 24px; background: #f8f8f8; border-radius: 8px; text-align: center; }
    .payment-section p { color: #666; font-size: 13px; margin-bottom: 16px; }
    .pay-button { display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.02em; }
    .footer { margin-top: 60px; padding-top: 24px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: center; }
    .footer-left { font-size: 12px; color: #999; }
    .footer-right { font-size: 12px; color: #bbb; }
    @media print {
      .page { padding: 40px 32px; }
      .pay-button { background: #1a1a1a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        ${data.business_logo_url
          ? `<img src="${data.business_logo_url}" alt="${data.business_name}" class="logo" />`
          : `<div class="business-name">${data.business_name}</div>`
        }
        <div class="business-details">
          ${data.business_address ? `${data.business_address}<br>` : ''}
          ${data.business_email ? `${data.business_email}<br>` : ''}
          ${data.business_phone ? `${data.business_phone}<br>` : ''}
          ${data.business_reg_number ? `SSM: ${data.business_reg_number}<br>` : ''}
          ${data.tax_number ? `SST Reg: ${data.tax_number}` : ''}
        </div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-number">${data.invoice_number}</div>
      </div>
    </div>
    <hr class="divider">
    <div class="meta-grid">
      <div>
        <div class="meta-label">Bill To</div>
        <div class="meta-value">${data.client_name}</div>
        ${data.client_email ? `<div class="meta-value-small">${data.client_email}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="margin-bottom:16px">
          <div class="meta-label">Issue Date</div>
          <div class="meta-value">${new Date(data.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div style="margin-bottom:16px">
          <div class="meta-label">Due Date</div>
          <div class="meta-value">${new Date(data.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        ${data.payment_terms ? `
        <div>
          <div class="meta-label">Payment Terms</div>
          <div class="meta-value">${data.payment_terms}</div>
        </div>` : ''}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:60%">Description</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.description || 'Professional Services'}</td>
          <td>${formatCurrency(data.subtotal, data.currency_code)}</td>
        </tr>
      </tbody>
    </table>
    <table class="totals-table">
      <tbody>
        <tr>
          <td style="color:#666">Subtotal</td>
          <td>${formatCurrency(data.subtotal, data.currency_code)}</td>
        </tr>
        ${taxLine}
        <tr class="total-row">
          <td>Total Due</td>
          <td>${formatCurrency(data.total, data.currency_code)}</td>
        </tr>
      </tbody>
    </table>
    <div class="payment-section">
      <p>Click below to view and pay this invoice securely online.</p>
      <a href="${data.payment_url}" class="pay-button">Pay Now →</a>
    </div>
    <div class="footer">
      <div class="footer-left">
        Thank you for your business.
      </div>
      <div class="footer-right">
        Powered by Prism · prismops.xyz
      </div>
    </div>
  </div>
</body>
</html>`
}
