'use client'

import { useState, useEffect, useRef } from 'react'

const SYSTEM_TAG_TOOLTIPS: Record<string, string> = {
  VIP: "Top 10% of your clients by revenue with 3+ invoices",
  'High Value': "Top 30% of your clients by revenue",
  Recurring: "Has an active recurring invoice or 3+ invoices in the last 90 days",
  'Late Payer': "40%+ of invoices were paid after the due date",
  'At Risk': "Outstanding balance exceeds 30% of total billings",
  Inactive: "No new invoice in 60+ days despite previous activity",
  New: "Added within the last 30 days"
}

interface TagBadgeProps {
  tag: {
    id: string
    name: string
    color: string
    is_system: boolean
    is_auto: boolean
  }
}

export function TagBadge({ tag }: TagBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top')

  const tooltipText = tag.is_system ? SYSTEM_TAG_TOOLTIPS[tag.name] : null
  const hasTooltip = !!tooltipText

  // Handle click outside to dismiss tooltip on mobile
  useEffect(() => {
    if (!showTooltip) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        badgeRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        !badgeRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showTooltip])

  // Calculate tooltip position on mount and when shown
  useEffect(() => {
    if (!showTooltip || !badgeRef.current) return

    const rect = badgeRef.current.getBoundingClientRect()
    // If badge is within 200px from top, show tooltip below
    setTooltipPosition(rect.top > 200 ? 'top' : 'bottom')
  }, [showTooltip])

  const handleMouseEnter = () => {
    if (hasTooltip) {
      setShowTooltip(true)
    }
  }

  const handleMouseLeave = () => {
    // Only auto-dismiss on hover if tooltip is visible and mouse leaves
    setShowTooltip(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (hasTooltip) {
      e.stopPropagation()
      setShowTooltip(!showTooltip)
    }
  }

  return (
    <div className="relative inline-block">
      <span
        ref={badgeRef}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap cursor-pointer transition-all hover:opacity-80"
        style={{ backgroundColor: tag.color + '30', color: tag.color }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {tag.is_auto && tag.is_system && <span>⚡</span>}
        {tag.is_auto && !tag.is_system && <span>✨</span>}
        <span className="truncate max-w-[80px]">{tag.name}</span>
      </span>

      {/* Tooltip */}
      {showTooltip && hasTooltip && (
        <div
          ref={tooltipRef}
          className={`absolute left-1/2 transform -translate-x-1/2 z-50 px-3 py-2 rounded-lg shadow-lg bg-gray-900 text-white text-xs whitespace-normal max-w-xs transition-opacity duration-150 ${
            tooltipPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{
            backgroundColor: '#1F2937',
            maxWidth: '220px'
          }}
        >
          {tooltipText}

          {/* Arrow/Caret */}
          <div
            className={`absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-l-transparent border-r-transparent ${
              tooltipPosition === 'top'
                ? 'top-full border-t-4 border-t-gray-900'
                : 'bottom-full border-b-4 border-b-gray-900'
            }`}
          />
        </div>
      )}
    </div>
  )
}
