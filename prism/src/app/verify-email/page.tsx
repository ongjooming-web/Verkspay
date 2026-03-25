'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { VerifyEmailContent } from './verify-email-content'

function VerifyEmailLoading() {
  return (
    <div className="space-y-6">
      <div className="glass rounded-lg p-4 border-blue-400/30 bg-blue-500/10 animate-pulse h-24"></div>
      <div className="h-12 glass rounded-lg animate-pulse"></div>
    </div>
  )
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden flex justify-center items-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl border border-white/10">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
            <svg className="w-12 h-12 hover:opacity-80 transition-opacity cursor-pointer" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rainbowGradientVerify" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#ff6b6b', stopOpacity: 1 }} />
                  <stop offset="16.67%" style={{ stopColor: '#ff9f6b', stopOpacity: 1 }} />
                  <stop offset="33.33%" style={{ stopColor: '#ffd93d', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: '#6bdb77', stopOpacity: 1 }} />
                  <stop offset="66.67%" style={{ stopColor: '#4d96ff', stopOpacity: 1 }} />
                  <stop offset="83.33%" style={{ stopColor: '#b565d8', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#ff6b6b', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <polygon points="50,5 93.3,28.33 93.3,75 50,98.33 6.7,75 6.7,28.33" 
                       fill="url(#rainbowGradientVerify)" 
                       stroke="url(#rainbowGradientVerify)" 
                       strokeWidth="1.5"/>
              <text x="50" y="60" fontSize="40" fontWeight="bold" textAnchor="middle" 
                    dominantBaseline="middle" fill="white" fontFamily="Arial">◆</text>
            </svg>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Verify Email
          </h1>
          <p className="text-gray-400 text-sm mt-2">Confirm your email to activate your account</p>
        </CardHeader>
        <CardBody>
          <Suspense fallback={<VerifyEmailLoading />}>
            <VerifyEmailContent />
          </Suspense>
        </CardBody>
      </Card>
    </div>
  )
}
