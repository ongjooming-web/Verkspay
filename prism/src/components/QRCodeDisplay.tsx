'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode.react'
import { Card, CardBody } from './Card'

interface QRCodeDisplayProps {
  walletAddress: string
  amount?: number
  network: 'base' | 'ethereum' | 'solana'
  currency?: string
}

export function QRCodeDisplay({
  walletAddress,
  amount,
  network,
  currency = 'USDC'
}: QRCodeDisplayProps) {
  const [qrValue, setQrValue] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Generate QR code value based on network
    let value = ''
    
    if (network === 'solana') {
      // Solana pay format: solana:ADDRESS?amount=X&label=Invoice
      value = `solana:${walletAddress}${amount ? `?amount=${amount}&label=${currency}+Invoice` : ''}`
    } else {
      // ERC-681 format for Ethereum-based networks (Base, Ethereum)
      // ethereum:ADDRESS?chainId=X
      const chainId = network === 'base' ? 8453 : 1
      value = `ethereum:${walletAddress}@${chainId}${amount ? `/transfer?address=${walletAddress}&uint256=${(amount * 1e6).toFixed(0)}` : ''}`
    }
    
    setQrValue(value)
  }, [walletAddress, amount, network, currency])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadQR = () => {
    const qrElement = document.getElementById('qr-code-canvas')
    if (qrElement) {
      const canvas = qrElement.querySelector('canvas')
      if (canvas) {
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = url
        link.download = `invoice-payment-${Date.now()}.png`
        link.click()
      }
    }
  }

  if (!qrValue) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Card className="p-6 bg-white/10">
          <div id="qr-code-canvas" className="p-4 bg-white rounded-lg">
            <QRCode
              value={qrValue}
              size={256}
              level="H"
              includeMargin={true}
              renderAs="canvas"
            />
          </div>
        </Card>
      </div>

      <div className="glass rounded-lg p-4 space-y-3">
        <div>
          <p className="text-gray-400 text-sm mb-2">Wallet Address</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-white font-mono text-sm break-all bg-black/30 rounded px-3 py-2">
              {walletAddress}
            </code>
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 bg-blue-600/50 hover:bg-blue-700/50 rounded text-sm text-white transition"
              title="Copy address"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {amount && (
          <div>
            <p className="text-gray-400 text-sm mb-2">Amount to Send</p>
            <p className="text-2xl font-bold text-blue-400">{amount.toLocaleString()} {currency}</p>
          </div>
        )}

        <div>
          <p className="text-gray-400 text-sm mb-2">Network</p>
          <p className="text-white font-semibold">
            {network === 'base' && '⚡ Base (Mainnet)'}
            {network === 'ethereum' && 'Ξ Ethereum (Mainnet)'}
            {network === 'solana' && '◎ Solana'}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={copyToClipboard}
          className="flex-1 px-4 py-2 glass rounded-lg text-white hover:bg-white/10 transition text-sm font-medium"
        >
          {copied ? '✓ Copied!' : '📋 Copy Address'}
        </button>
        <button
          onClick={downloadQR}
          className="flex-1 px-4 py-2 glass rounded-lg text-white hover:bg-white/10 transition text-sm font-medium"
        >
          ⬇ Download QR
        </button>
      </div>
    </div>
  )
}
