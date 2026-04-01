'use client'

import React, { ReactNode } from 'react'
import { Card, CardBody, CardHeader } from '@/components/Card'

interface SafeWidgetWrapperProps {
  children: ReactNode
  title: string
  fallbackMessage?: string
}

export class SafeWidgetWrapper extends React.Component<SafeWidgetWrapperProps> {
  state: { hasError: boolean }

  constructor(props: SafeWidgetWrapperProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[SafeWidgetWrapper] Error in ${this.props.title}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-gray-700/50">
          <CardHeader>
            <h3 className="text-lg font-bold text-white">{this.props.title}</h3>
          </CardHeader>
          <CardBody>
            <p className="text-gray-400 text-sm">
              {this.props.fallbackMessage || 'This feature is temporarily unavailable'}
            </p>
          </CardBody>
        </Card>
      )
    }

    return this.props.children
  }
}
