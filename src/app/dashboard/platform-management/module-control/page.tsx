
// src/app/dashboard/platform-management/module-control/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle, SlidersHorizontal, AlertTriangle, PowerOff, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { School, ModulePermissions } from '@/lib/schemas/school';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SchoolWithModules = School;

async function fetchSchoolsWithModules(): Promise<SchoolWithModules[]> {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase is not configured.");
    const schoolsSnapshot = await getDocs(collection(db, "schools"));
    return schoolsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as SchoolWithModules));
}

async function disableAllDashboardsForAllSchools(schools: SchoolWithModules[]): Promise<void> {
    if (!db) {
        throw new Error("Firestore is not configured. Cannot perform this action.");
    }
    // This explicit assignment ensures TypeScript knows `db` is not undefined inside the loop.
    const firestoreDb = db; 
    const batch = writeBatch(firestoreDb);
    schools.forEach(school => {
        const schoolRef = doc(firestoreDb, 'schools', school.id);
        batch.update(schoolRef, {
            'enabledModules.teacherDashboard': false,
            'enabledModules.headTeacherDashboard': false,
            'enabledModules.primaryAdminDashboard': false,
        });
    });
    await batch.commit();
}


export default function ModuleControlPage() {
    const { toast } = useToast();
    const [schools, setSchools] = useState<SchoolWithModules[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchSchoolsWithModules();
            setSchools(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load school module data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleDisableAllDashboards = async () => {
        setIsUpdating(true);
        try {
            await disableAllDashboardsForAllSchools(schools);
            toast({ title: 'Success', description: 'All dashboards have been disabled for all schools.' });
            loadData(); // Refresh data
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update school settings.' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const StatusIndicator = ({ enabled }: { enabled: boolean | undefined }) => (
        enabled === false
            ? <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3"/> Disabled</Badge>
            : <Badge variant="default" className="flex items-center gap-1 bg-green-600"><CheckCircle className="h-3 w-3"/> Enabled</Badge>
    );

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Global Module Control"
                description="Centrally manage module and dashboard access for all schools."
            />
            
            <Card className="border-destructive bg-destructive/5">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle/> Global Actions</CardTitle>
                        <CardDescription className="text-destructive/80">These actions will affect all schools on the platform.</CardDescription>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PowerOff className="mr-2 h-4 w-4"/>}
                                Turn Off All Dashboards
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will disable the Teacher, Head Teacher, and Primary Admin dashboards for ALL schools. Users will not be able to access their main landing pages. This action can be reversed by editing each school individually.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDisableAllDashboards} className="bg-destructive hover:bg-destructive/90">Yes, Disable All</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Module Status by School</CardTitle>
                    <CardDescription>An overview of enabled/disabled modules for each school. Use the Edit button to make specific changes.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isLoading ? <Skeleton className="h-64 w-full"/> : (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>School</TableHead>
                                        <TableHead>Teacher D/B</TableHead>
                                        <TableHead>HT D/B</TableHead>
                                        <TableHead>Admin D/B</TableHead>
                                        <TableHead>Academics</TableHead>
                                        <TableHead>Student Services</TableHead>
                                        <TableHead>Operations</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {schools.map(school => (
                                        <TableRow key={school.id}>
                                            <TableCell className="font-medium">{school.name}</TableCell>
                                            <TableCell><StatusIndicator enabled={school.enabledModules?.teacherDashboard} /></TableCell>
                                            <TableCell><StatusIndicator enabled={school.enabledModules?.headTeacherDashboard} /></TableCell>
                                            <TableCell><StatusIndicator enabled={school.enabledModules?.primaryAdminDashboard} /></TableCell>
                                            <TableCell><StatusIndicator enabled={school.enabledModules?.academics} /></TableCell>
                                            <TableCell><StatusIndicator enabled={school.enabledModules?.studentServices} /></TableCell>
                                            <TableCell><StatusIndicator enabled={school.enabledModules?.operations} /></TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/dashboard/platform-management/school-management/edit/${school.id}`} passHref>
                                                    <Button variant="outline" size="sm">
                                                        <Edit className="mr-2 h-3 w-3"/> Edit Modules
                                                    </Button>
                                                </Link>
                                            </TableCell>
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
