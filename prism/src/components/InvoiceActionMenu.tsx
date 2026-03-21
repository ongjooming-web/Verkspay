'use client'

import { useState } from 'react'
import { Button } from './Button'

interface InvoiceActionMenuProps {
  invoice: {
    id: string
    status: string
    sent_at?: string
  }
  onDownloadPDF: () => void
  onSendToClient: () => void
  onSharePaymentLink: () => void
  onMarkAsPaid: () => void
  onEdit: () => void
  onDelete: () => void
  isEditing: boolean
}

export function InvoiceActionMenu({
  invoice,
  onDownloadPDF,
  onSendToClient,
  onSharePaymentLink,
  onMarkAsPaid,
  onEdit,
  onDelete,
  isEditing,
}: InvoiceActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (isEditing) {
    return null
  }

  return (
    <div className="relative">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-blue-500/20 transition"
        title="More options"
      >
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-0.9 2-2s-0.9-2-2-2-2 0.9-2 2 0.9 2 2 2zm0 2c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2zm0 6c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 glass rounded-lg border border-blue-400/30 shadow-lg z-50 py-2">
          {/* Download PDF */}
          <button
            onClick={() => {
              onDownloadPDF()
              setIsOpen(false)
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-blue-500/20 transition"
          >
            📥 Download PDF
          </button>

          {/* Send to Client */}
          <button
            onClick={() => {
              onSendToClient()
              setIsOpen(false)
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-blue-500/20 transition"
          >
            📨 {invoice.sent_at ? 'Resend' : 'Send to Client'}
          </button>

          {/* Share Payment Link */}
          {invoice.status !== 'paid' && (
            <button
              onClick={() => {
                onSharePaymentLink()
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-blue-500/20 transition"
            >
              🔗 Share Payment Link
            </button>
          )}

          {/* Mark as Paid */}
          {invoice.status !== 'paid' && (
            <button
              onClick={() => {
                onMarkAsPaid()
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-green-300 hover:bg-green-500/20 transition"
            >
              ✓ Mark as Paid
            </button>
          )}

          {/* Divider */}
          <div className="border-t border-gray-600/30 my-2"></div>

          {/* Edit */}
          <button
            onClick={() => {
              onEdit()
              setIsOpen(false)
            }}
            className="w-full text-left px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/20 transition"
          >
            ✎ Edit
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              onDelete()
              setIsOpen(false)
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 transition"
          >
            🗑 Delete
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  )
}
