"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Line, LineChart as RechartsLineChart, Pie, PieChart, Cell, Tooltip, XAxis, YAxis, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { TrendingUp, Users, ShieldAlert, BookOpenCheck } from "lucide-react";
import { PageHeader } from '@/components/layout/page-header';

// --- MOCK DATA ---
// In a real application, this data would be fetched and aggregated from your database (e.g., Firestore).

const teacherPerformanceData = [
  { name: 'SENIROSI LEDUA', averageRating: 4.8 },
  { name: 'GAYLESHNI DEV', averageRating: 4.2 },
  { name: 'SHIVAM RAJ', averageRating: 4.5 },
  { name: 'SEEMA SHARMA', averageRating: 3.9 },
  { name: 'GRACE WILSON', averageRating: 4.9 },
];

const examPerformanceData = [
  { term: 'Term 1, 2024', averageScore: 68 },
  { term: 'Term 2, 2024', averageScore: 75 },
  { term: 'Term 3, 2024', averageScore: 72 },
  { term: 'Term 4, 2024', averageScore: 81 },
];

const disciplinaryIncidentsData = [
  { type: 'Absent', count: 12, fill: 'hsl(var(--chart-1))' },
  { type: 'Bullying', count: 5, fill: 'hsl(var(--chart-2))' },
  { type: 'Vandalism', count: 3, fill: 'hsl(var(--chart-3))' },
  { type: 'Disrespect', count: 8, fill: 'hsl(var(--chart-4))' },
  { type: 'Other', count: 4, fill: 'hsl(var(--chart-5))' },
];

const attendanceData = [
    { week: 'Week 1', percentage: 95.5 },
    { week: 'Week 2', percentage: 96.2 },
    { week: 'Week 3', percentage: 94.8 },
    { week: 'Week 4', percentage: 97.1 },
    { week: 'Week 5', percentage: 96.5 },
];


// --- CHART CONFIGS ---
const teacherChartConfig = {
  averageRating: {
    label: "Average Rating",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const examChartConfig = {
    averageScore: {
        label: "Average Score %",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;

const incidentChartConfig = {
    count: {
        label: "Incidents",
    },
    ...disciplinaryIncidentsData.reduce((acc, cur) => {
        acc[cur.type] = { label: cur.type, color: cur.fill };
        return acc;
    }, {} as ChartConfig)
} satisfies ChartConfig;

const attendanceChartConfig = {
    percentage: {
        label: "Attendance %",
        color: "hsl(var(--chart-3))",
    },
} satisfies ChartConfig;


export default function KpiReportsPage() {
  return (
      <div className="p-8 space-y-8">
        <PageHeader 
            title="Key Performance Indicator Reports"
            description="Visual overview of school performance metrics. Data is for demonstration purposes."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Teacher Performance Chart */}
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary flex items-center">
                        <Users className="mr-2 h-6 w-6" />
                        Teacher Average Ratings
                    </CardTitle>
                    <CardDescription>Average rating out of 5 based on user submissions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={teacherChartConfig} className="min-h-[300px] w-full">
                        <BarChart data={teacherPerformanceData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} hide />
                            <YAxis domain={[0, 5]} />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Bar dataKey="averageRating" fill="var(--color-averageRating)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Exam Performance Chart */}
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary flex items-center">
                        <BookOpenCheck className="mr-2 h-6 w-6" />
                        Overall Exam Performance
                    </CardTitle>
                    <CardDescription>Average student scores across all subjects by term.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={examChartConfig} className="min-h-[300px] w-full">
                        <RechartsLineChart data={examPerformanceData} margin={{ left: 12, right: 12 }}>
                             <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="term"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                            />
                            <YAxis domain={[50, 100]} />
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="line" />}
                            />
                            <Line
                                dataKey="averageScore"
                                type="monotone"
                                stroke="var(--color-averageScore)"
                                strokeWidth={2}
                                dot={true}
                            />
                        </RechartsLineChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Disciplinary Incidents Chart */}
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary flex items-center">
                        <ShieldAlert className="mr-2 h-6 w-6" />
                        Disciplinary Incidents by Type
                    </CardTitle>
                    <CardDescription>Breakdown of reported incidents this semester.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    <ChartContainer config={incidentChartConfig} className="min-h-[300px] w-full max-w-[400px]">
                        <PieChart>
                             <Tooltip content={<ChartTooltipContent nameKey="count" hideLabel />} />
                            <Pie data={disciplinaryIncidentsData} dataKey="count" nameKey="type" innerRadius={60}>
                                {disciplinaryIncidentsData.map((entry) => (
                                    <Cell key={`cell-${entry.type}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Legend content={({ payload }) => (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-4 text-sm">
                                    {payload?.map((entry, index) => (
                                    <div key={`item-${index}`} className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span>{entry.value}</span>
                                    </div>
                                    ))}
                                </div>
                            )} />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            
            {/* Student Attendance Chart */}
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary flex items-center">
                        <TrendingUp className="mr-2 h-6 w-6" />
                        Weekly Student Attendance
                    </CardTitle>
                    <CardDescription>Overall student attendance percentage per week.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={attendanceChartConfig} className="min-h-[300px] w-full">
                        <RechartsLineChart data={attendanceData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="week" />
                            <YAxis domain={[90, 100]} tickFormatter={(value) => `${value}%`} />
                            <Tooltip
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Line
                                dataKey="percentage"
                                type="monotone"
                                stroke="var(--color-percentage)"
                                strokeWidth={2}
                                dot={{
                                    fill: "var(--color-percentage)",
                                }}
                                activeDot={{
                                    r: 6,
                                }}
                            />
                        </RechartsLineChart>
                    </ChartContainer>
                </CardContent>
            </Card>

        </div>
      </div>
  );
}
