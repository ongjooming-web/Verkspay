'use client'

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'

interface ReportsChartProps {
  type: 'revenue' | 'tax'
  data: any[]
  currencyCode?: string
}

const makeFormatCurrency = (code: string) => (value: number) => {
  if (value >= 1000000) return `${code} ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${code} ${(value / 1000).toFixed(0)}k`
  return `${code} ${value.toFixed(0)}`
}

const CustomTooltip = ({ active, payload, formatCurrency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-3 rounded border border-gray-600 shadow-lg">
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function ReportsChart({ type, data, currencyCode = 'MYR' }: ReportsChartProps) {
  const formatCurrency = makeFormatCurrency(currencyCode)
  if (type === 'revenue') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.2)" vertical={false} />
          <XAxis 
            dataKey="month" 
            stroke="#9ca3af" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              // Format "Mar 26" from "Mar 2026"
              return value.replace(' ', '\n')
            }}
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar 
            dataKey="collected" 
            stackId="stack" 
            fill="#1D9E75" 
            name="Collected" 
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="outstanding" 
            stackId="stack" 
            fill="rgba(239, 159, 39, 0.3)" 
            name="Outstanding" 
            radius={[4, 4, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'tax') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.2)" vertical={false} />
          <XAxis 
            dataKey="month" 
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar 
            dataKey="income" 
            fill="#1D9E75" 
            name="Income Received" 
            radius={[4, 4, 0, 0]}
          />
          <Line 
            type="monotone" 
            dataKey="cumulative" 
            stroke="#378ADD" 
            strokeWidth={2}
            name="Cumulative" 
            dot={{ fill: '#378ADD', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return null
}
