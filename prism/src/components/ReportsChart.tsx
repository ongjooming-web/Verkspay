'use client'

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'

interface ReportsChartProps {
  type: 'revenue' | 'tax'
  data: any[]
}

export function ReportsChart({ type, data }: ReportsChartProps) {
  if (type === 'revenue') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" stroke="#999" />
          <YAxis stroke="#999" />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
          <Legend />
          <Bar dataKey="invoiced" fill="#3b82f6" name="Invoiced" />
          <Bar dataKey="collected" fill="#10b981" name="Collected" />
          <Bar dataKey="outstanding" fill="#f59e0b" name="Outstanding" />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'tax') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" stroke="#999" />
          <YAxis stroke="#999" />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
          <Legend />
          <Bar dataKey="income" fill="#10b981" name="Income Received" />
          <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" name="Cumulative" />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return null
}
