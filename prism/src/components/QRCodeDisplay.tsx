'use client'

import { useEffect, useRef, useState } from 'react'
import QRCodeStyling from 'qr-code-styling'
import { Card } from './Card'

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
  const qrRef = useRef<HTMLDivElement>(null)
  const [qrInstance, setQrInstance] = useState<QRCodeStyling | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Generate QR code value based on network
    let value = ''
    
    if (network === 'solana') {
      // Solana pay format: solana:ADDRESS?amount=X&label=Invoice
      value = `solana:${walletAddress}${amount ? `?amount=${amount}&label=${currency}+Invoice` : ''}`
    } else {
      // ERC-681 format for Ethereum-based networks (Base, Ethereum)
      const chainId = network === 'base' ? 8453 : 1
      value = `ethereum:${walletAddress}@${chainId}${amount ? `/transfer?address=${walletAddress}&uint256=${(amount * 1e6).toFixed(0)}` : ''}`
    }
    
    // Create QR code instance
    const qr = new QRCodeStyling({
      width: 256,
      height: 256,
      data: value,
      image: undefined,
      margin: 10,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: 'H'
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.1,
        margin: 10
      },
      dotsOptions: {
        color: '#000000',
        type: 'rounded'
      },
      backgroundOptions: {
        color: '#ffffff'
      },
      cornersSquareOptions: {
        color: '#667eea',
        type: 'extra-rounded'
      },
      cornersDotOptions: {
        color: '#667eea',
        type: 'dot'
      }
    })
    
    setQrInstance(qr)
    
    // Append to DOM
    if (qrRef.current) {
      qrRef.current.innerHTML = ''
      qr.append(qrRef.current)
    }
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

  const downloadQR = async () => {
    if (qrInstance) {
      try {
        qrInstance.download({ name: `invoice-payment-${Date.now()}`, extension: 'png' })
      } catch (err) {
        console.error('Failed to download QR:', err)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Card className="p-6 bg-white/10 backdrop-blur-xl border border-white/20">
          <div
            ref={qrRef}
            className="p-4 bg-white rounded-lg flex items-center justify-center"
            style={{ width: '300px', height: '300px' }}
          />
        </Card>
      </div>

      <div className="glass rounded-lg p-4 space-y-3 backdrop-blur-xl border border-white/20">
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
          className="flex-1 px-4 py-2 glass rounded-lg text-white hover:bg-white/10 transition text-sm font-medium backdrop-blur-xl border border-white/20"
        >
          {copied ? '✓ Copied!' : '📋 Copy Address'}
        </button>
        <button
          onClick={downloadQR}
          className="flex-1 px-4 py-2 glass rounded-lg text-white hover:bg-white/10 transition text-sm font-medium backdrop-blur-xl border border-white/20"
        >
          ⬇ Download QR
        </button>
      </div>
    </div>
  )
}
