
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import type { PrimaryInventory } from '@/lib/schemas/primaryInventory';
import { PageHeader } from '@/components/layout/page-header';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, getDocs, query, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';


async function fetchPrimaryInventorySummaryFromBackend(schoolId: string): Promise<PrimaryInventory[]> {
    if (!db) throw new Error("Firestore is not configured.");
    const inventoryCollection = collection(db, 'schools', schoolId, 'primaryInventory');
    const snapshot = await getDocs(inventoryCollection);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          itemName: data.itemName || 'Unnamed Item',
          quantity: data.quantity || 0,
          value: data.value || 0,
          remarks: data.remarks || '',
          lastUpdatedBy: data.lastUpdatedBy || 'N/A',
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      };
    });
}


export default function PrimaryInventorySummaryPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [summaryData, setSummaryData] = useState<PrimaryInventory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        setLastUpdated(new Date().toLocaleString());
        if (!isFirebaseConfigured || !db) {
          setIsLoading(false);
          setFetchError("Firebase is not configured.");
          return;
        }
         if (!schoolId) {
            setFetchError("School ID not found.");
            setIsLoading(false);
            return;
        }
        if (userRole !== 'head-teacher' && userRole !== 'primary-admin' && userRole !== 'system-admin') {
            setFetchError("You do not have permission to view this page.");
            setIsLoading(false);
            return;
        }
        try {
            const summary = await fetchPrimaryInventorySummaryFromBackend(schoolId);
            setSummaryData(summary);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to load summary data.";
            setFetchError(msg);
            toast({ variant: "destructive", title: "Error Loading Data", description: msg });
        } finally {
            setIsLoading(false);
        }
    }, [toast, schoolId, userRole]);

    useEffect(() => {
        const school = localStorage.getItem('schoolId');
        const role = localStorage.getItem('userRole');
        setSchoolId(school);
        setUserRole(role);
    }, []);

    useEffect(() => {
       if (schoolId && userRole) {
         loadData();
       } else {
         setIsLoading(false);
       }
    }, [schoolId, userRole, loadData]);


    const chartData = useMemo(() => {
        return summaryData.map(item => ({
            name: item.itemName,
            'Total Value': (Number(item.quantity) || 0) * (Number(item.value) || 0),
        })).filter(item => item['Total Value'] > 0);
    }, [summaryData]);
    
    const totalInventoryValue = useMemo(() => {
        return summaryData.reduce((acc, item) => {
            return acc + (Number(item.quantity) || 0) * (Number(item.value) || 0);
        }, 0);
    }, [summaryData]);

    return (
        <div className="p-8 space-y-8">
            <PageHeader 
                title="Primary School Inventory Summary"
                description={`An aggregated view of all primary school assets and their total value.${schoolId ? ` (School ID: ${schoolId})` : ''}`}
            >
                <Button variant="outline" onClick={() => router.push('/dashboard/inventory')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Inventory Entry
                </Button>
            </PageHeader>
            
            <Card className="shadow-xl rounded-lg w-full max-w-6xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Inventory Overview</CardTitle>
                    <CardDescription className="font-body text-xs text-muted-foreground pt-1">Last Updated: {lastUpdated}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {isLoading && <div className="space-y-4"><Skeleton className="h-20 w-1/3" /><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>}
                    {fetchError && <Card className="bg-destructive/10 border-destructive"><CardHeader><CardTitle className="font-headline text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error</CardTitle></CardHeader><CardContent><p className="font-body text-destructive">{fetchError}</p></CardContent></Card>}
                    
                    {!isLoading && !fetchError && (
                        <>
                             <Card className="bg-muted/50">
                                <CardHeader><CardTitle>Total Estimated Inventory Value</CardTitle></CardHeader>
                                <CardContent><p className="text-4xl font-bold text-primary">${totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent>
                            </Card>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card>
                                    <CardHeader><CardTitle>Inventory Value by Item</CardTitle><CardDescription>Visual representation of total value per item type.</CardDescription></CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} /><Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} /><Legend /><Bar dataKey="Total Value" fill="hsl(var(--primary))" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>Detailed Inventory Breakdown</CardTitle></CardHeader>
                                    <CardContent className="max-h-[450px] overflow-y-auto">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Item Name</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Value (each)</TableHead><TableHead className="text-right font-bold">Total Value</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {summaryData.map(item => (
                                                    <TableRow key={item.id}><TableCell className="font-medium">{item.itemName}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell className="text-right">${Number(item.value).toFixed(2)}</TableCell><TableCell className="text-right font-bold">${((Number(item.quantity) || 0) * (Number(item.value) || 0)).toFixed(2)}</TableCell></TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
