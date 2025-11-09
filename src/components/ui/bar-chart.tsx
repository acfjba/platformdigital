// src/components/ui/bar-chart.tsx
"use client"

import React from 'react'
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface BarChartProps {
    data: any[];
    category: string;
    index: string;
    className?: string;
}

export function BarChart({ data, category, index, className }: BarChartProps) {
  return (
    <div className={className}>
        <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey={index} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                    cursor={{ fill: 'hsl(var(--accent))' }} 
                    contentStyle={{
                        background: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                    }}
                />
                <Bar dataKey={category} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
        </ResponsiveContainer>
    </div>
  )
}
