
// src/app/dashboard/platform-management/platform-status/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Line, LineChart as RechartsLineChart } from 'recharts';
import { CheckCircle, AlertCircle, Wifi, Server, DatabaseZap, FileText, ArrowUp, ArrowDown, Activity } from "lucide-react";
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// --- MOCK DATA & SIMULATION ---

interface School {
    id: string;
    name: string;
}

interface SchoolStatus {
    id: string;
    name: string;
    status: 'Connected' | 'Disconnected' | 'High Latency';
    latency: number;
    dataInput: number;
    dataOutput: number;
}

const dbOpsData = [
    { date: '7 days ago', Reads: 2500, Writes: 1200, Deletes: 50 },
    { date: '6 days ago', Reads: 2800, Writes: 1400, Deletes: 70 },
    { date: '5 days ago', Reads: 3200, Writes: 1500, Deletes: 60 },
    { date: '4 days ago', Reads: 2900, Writes: 1600, Deletes: 80 },
    { date: '3 days ago', Reads: 3500, Writes: 1800, Deletes: 90 },
    { date: '2 days ago', Reads: 4000, Writes: 2000, Deletes: 100 },
    { date: 'Yesterday', Reads: 4500, Writes: 2200, Deletes: 120 },
];

async function fetchSchoolsFromFirestore(): Promise<School[]> {
    if (!db || !isFirebaseConfigured) {
        return [{ id: '2009', name: 'Navalau District School (Demo)' }]; // fallback for offline
    }
    try {
        const schoolsSnapshot = await getDocs(collection(db, "schools"));
        if (schoolsSnapshot.empty) {
             return [{ id: '2009', name: 'Navalau District School (Demo)' }];
        }
        return schoolsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
        }));
    } catch (e) {
        console.error("Could not fetch schools, returning demo data.", e);
        return [{ id: '2009', name: 'Navalau District School (Demo)' }];
    }
}


// Simulate fetching and dynamically updating school status
async function fetchSchoolStatuses(schools: School[]): Promise<SchoolStatus[]> {
    console.log("Simulating fetch of school statuses...");
    await new Promise(resolve => setTimeout(resolve, 800));

    return schools.map(school => {
        const random = Math.random();
        let status: SchoolStatus['status'] = 'Connected';
        let latency = Math.floor(Math.random() * 80) + 20; // 20-100ms

        if (random > 0.9) {
            status = 'Disconnected';
            latency = -1;
        } else if (random > 0.8) {
            status = 'High Latency';
            latency = Math.floor(Math.random() * 200) + 150; // 150-350ms
        }
        
        return {
            id: school.id,
            name: school.name,
            status,
            latency,
            dataInput: Math.floor(Math.random() * 5000), // in KB
            dataOutput: Math.floor(Math.random() * 10000), // in KB
        };
    });
}

export default function PlatformStatusPage() {
    const [schoolStatuses, setSchoolStatuses] = useState<SchoolStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        // Don't set loading to true on interval refresh to avoid flicker
        try {
            const schools = await fetchSchoolsFromFirestore();
            if (schools.length > 0) {
                const data = await fetchSchoolStatuses(schools);
                setSchoolStatuses(data);
            } else {
                setSchoolStatuses([]);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error fetching data",
                description: "Could not load school status information."
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();

        const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [loadData]);

    const latencyChartData = schoolStatuses
        .filter(s => s.status !== 'Disconnected')
        .map(s => ({ name: s.id, latency: s.latency }));

    const getLatencyColor = (latency: number) => {
        if (latency > 150) return 'hsl(var(--destructive))';
        if (latency > 80) return 'hsl(var(--chart-3))';
        return 'hsl(var(--chart-2))';
    };
    
    const connectedSchools = schoolStatuses.filter(s => s.status === 'Connected').length;
    const totalSchools = schoolStatuses.length;
    const apiUptime = 99.98; // Mocked value
    const avgResponseTime = schoolStatuses.length > 0
        ? Math.round(schoolStatuses.reduce((acc, s) => acc + (s.latency > 0 ? s.latency : 0), 0) / schoolStatuses.filter(s => s.latency > 0).length)
        : 0;

    // Simulated Database Metrics
    const dbSize = 150.2; // in MB
    const totalDocuments = 12450;
    const lastDayReads = dbOpsData[dbOpsData.length - 1].Reads;
    const lastDayWrites = dbOpsData[dbOpsData.length - 1].Writes;

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Platform Status & Health"
                description="Real-time analysis of school connectivity and platform service metrics."
            />
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Connected Schools</CardTitle>
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{connectedSchools} / {totalSchools}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Uptime</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{apiUptime}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Latency</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgResponseTime}ms</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Database Size</CardTitle>
                        <DatabaseZap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dbSize} <span className="text-sm text-muted-foreground">MB</span></div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDocuments.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">DB Ops (24h)</CardTitle>
                        <div className="flex gap-1">
                          <ArrowUp className="h-4 w-4 text-green-500" />
                          <ArrowDown className="h-4 w-4 text-destructive" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">
                          <span className="text-green-500">{lastDayReads.toLocaleString()} R</span> / <span className="text-destructive">{lastDayWrites.toLocaleString()} W</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>School Latency Analysis</CardTitle>
                        <CardDescription>Response time in milliseconds (ms) for each connected school.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <RechartsBarChart data={latencyChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: any) => `${value}ms`}
                                        cursor={{fill: 'hsla(var(--muted), 0.5)'}}
                                    />
                                    <Bar dataKey="latency" name="Latency (ms)" >
                                        {latencyChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getLatencyColor(entry.latency)} />
                                        ))}
                                    </Bar>
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Database Operations (Last 7 Days)</CardTitle>
                        <CardDescription>Simulated daily read, write, and delete operations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <RechartsLineChart data={dbOpsData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="Reads" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                                    <Line type="monotone" dataKey="Writes" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                                    <Line type="monotone" dataKey="Deletes" stroke="hsl(var(--destructive))" strokeWidth={2} />
                                </RechartsLineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detailed Connectivity Report</CardTitle>
                    <CardDescription>Live status and data I/O for each school.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>School ID</TableHead>
                                        <TableHead>School Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Latency (ms)</TableHead>
                                        <TableHead className="text-right">Data In (KB)</TableHead>
                                        <TableHead className="text-right">Data Out (KB)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {schoolStatuses.map((school) => (
                                        <TableRow key={school.id}>
                                            <TableCell className="font-mono">{school.id}</TableCell>
                                            <TableCell className="font-medium">{school.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={school.status === 'Connected' ? 'default' : 'destructive'} className={cn(school.status === 'Connected' && 'bg-green-600')}>
                                                     {school.status === 'Connected' && <CheckCircle className="mr-1 h-3 w-3" />}
                                                     {school.status !== 'Connected' && <AlertCircle className="mr-1 h-3 w-3" />}
                                                    {school.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold" style={{color: getLatencyColor(school.latency)}}>
                                                {school.latency > 0 ? `${school.latency}ms` : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">{school.dataInput.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{school.dataOutput.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
