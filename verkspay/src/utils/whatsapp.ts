/**
 * WhatsApp utility functions for sending invoices, proposals, and reminders
 */

/**
 * Format phone number for WhatsApp wa.me links
 * Converts various formats to country code + number (e.g., "60123456789")
 */
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return ''

  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')

  // Remove leading + (wa.me doesn't need it)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1)
  }

  // If starts with 0 and no country code, assume Malaysia (60)
  if (cleaned.startsWith('0')) {
    cleaned = '60' + cleaned.slice(1)
  }

  // If no country code prefix, add Malaysia
  if (!cleaned.startsWith('6') && !cleaned.startsWith('1')) {
    cleaned = '60' + cleaned
  }

  return cleaned
}

/**
 * Generate WhatsApp link to send invoice
 */
export function generateInvoiceWhatsAppLink(
  clientName: string,
  invoiceNumber: string,
  amount: number,
  currencyCode: string,
  dueDate: string,
  description: string,
  paymentLinkUrl: string,
  businessName: string,
  phoneNumber: string
): string {
  const cleanPhone = formatWhatsAppNumber(phoneNumber)

  if (!cleanPhone) {
    return ''
  }

  const message = `Hi ${clientName},

Here's your invoice from ${businessName}:

📄 Invoice: ${invoiceNumber}
💰 Amount: ${currencyCode} ${amount.toFixed(2)}
📅 Due: ${new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}
📋 Description: ${description || 'N/A'}

Pay here: ${paymentLinkUrl}

Thank you!`

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Generate WhatsApp reminder for overdue invoice
 */
export function generateReminderWhatsAppLink(
  clientName: string,
  invoiceNumber: string,
  remainingBalance: number,
  currencyCode: string,
  dueDate: string,
  daysOverdue: number,
  paymentLinkUrl: string,
  businessName: string,
  phoneNumber: string
): string {
  const cleanPhone = formatWhatsAppNumber(phoneNumber)

  if (!cleanPhone) {
    return ''
  }

  const message = `Hi ${clientName},

This is a friendly reminder about your outstanding invoice:

📄 Invoice: ${invoiceNumber}
💰 Amount Due: ${currencyCode} ${remainingBalance.toFixed(2)}
📅 Due Date: ${new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })} (${daysOverdue} days overdue)

Pay here: ${paymentLinkUrl}

Please let me know if you have any questions.

Thank you,
${businessName}`

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Generate WhatsApp link for proposal
 */
export function generateProposalWhatsAppLink(
  clientName: string,
  proposalTitle: string,
  amount: number,
  currencyCode: string,
  validUntil: string,
  proposalUrl: string,
  businessName: string,
  phoneNumber: string
): string {
  const cleanPhone = formatWhatsAppNumber(phoneNumber)

  if (!cleanPhone) {
    return ''
  }

  const message = `Hi ${clientName},

I've prepared a proposal for you:

📋 ${proposalTitle}
💰 Total: ${currencyCode} ${amount.toFixed(2)}
📅 Valid until: ${new Date(validUntil).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}

View proposal: ${proposalUrl}

Let me know your thoughts!

${businessName}`

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Generate WhatsApp link for blank chat (no pre-filled message)
 */
export function generateBlankWhatsAppLink(phoneNumber: string): string {
  const cleanPhone = formatWhatsAppNumber(phoneNumber)
  return cleanPhone ? `https://wa.me/${cleanPhone}` : ''
}
