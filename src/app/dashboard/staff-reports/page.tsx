
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download, AlertCircle, Filter, AlertTriangle } from "lucide-react";
import type { StaffMember } from '@/lib/schemas/staff';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';


// Simulate fetching data for the report
async function fetchStaffReportData(schoolId?: string): Promise<StaffMember[]> {
    if (!db) throw new Error("Firestore is not configured.");
    
    let staffQuery;
    if (schoolId) {
        staffQuery = query(collection(db, 'staff'), where('schoolId', '==', schoolId));
    } else {
        staffQuery = query(collection(db, 'staff'));
    }

    const snapshot = await getDocs(staffQuery);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            staffId: data.staffId,
            name: data.name,
            role: data.role,
            position: data.position,
            department: data.department,
            status: data.status || 'Active', // Default status
            email: data.email,
            phone: data.phone,
            schoolId: data.schoolId,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        }
    });
}


export default function StaffReportsPage() {
    const { toast } = useToast();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string|null>(null);

    // Filter states
    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [userRole, setUserRole] = useState<string|null>(null);
    const [userSchoolId, setUserSchoolId] = useState<string|null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        if (!isFirebaseConfigured || !userRole) {
          setIsLoading(false);
          return;
        }

        const schoolIdToFetch = userRole === 'system-admin' ? undefined : userSchoolId;
        if (userRole !== 'system-admin' && !schoolIdToFetch) {
            setFetchError("School ID not found.");
            setIsLoading(false);
            return;
        }
        
        try {
            const data = await fetchStaffReportData(schoolIdToFetch ?? undefined);
            setStaffList(data);
        } catch (error) {
            setFetchError(error instanceof Error ? error.message : "Could not load staff data.");
        } finally {
            setIsLoading(false);
        }
    }, [userRole, userSchoolId]);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const schoolId = localStorage.getItem('schoolId');
        setUserRole(role);
        setUserSchoolId(schoolId);
    }, []);

    useEffect(() => {
        if (userRole) { // Ensure userRole is set before loading data
            loadData();
        }
    }, [loadData, userRole]);
    
    const uniqueSchools = useMemo(() => ['all', ...Array.from(new Set(staffList.map(s => s.schoolId)))], [staffList]);
    const uniqueRoles = useMemo(() => ['all', ...Array.from(new Set(staffList.map(s => s.role)))], [staffList]);
    const uniqueStatuses = useMemo(() => ['all', ...Array.from(new Set(staffList.map(s => s.status)))], [staffList]);

    const filteredStaff = useMemo(() => {
        return staffList.filter(staff => 
            (schoolFilter === 'all' || staff.schoolId === schoolFilter) &&
            (roleFilter === 'all' || staff.role === roleFilter) &&
            (statusFilter === 'all' || staff.status === statusFilter)
        );
    }, [staffList, schoolFilter, roleFilter, statusFilter]);
    
    const statusVariants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
        'Active': 'default',
        'On Leave': 'secondary',
        'Terminated': 'destructive',
    };

    const handlePrint = () => {
        toast({ title: "Printing...", description: "Use your browser's print dialog to save as PDF or print." });
        window.print();
    };

    const handleExportCsv = () => {
        if (filteredStaff.length === 0) {
            toast({ variant: "destructive", title: "No Data", description: "There is no data to export." });
            return;
        }
        const headers = ["Staff ID", "Name", "Role", "Position", "Email", "Phone", "School ID", "Status"];
        const rows = filteredStaff.map(staff => [
            staff.staffId,
            `"${staff.name.replace(/"/g, '""')}"`,
            staff.role,
            staff.position,
            staff.email,
            staff.phone,
            staff.schoolId,
            staff.status
        ].join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `staff_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Successful", description: "Staff report has been downloaded as a CSV file." });
    };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Staff Reports"
        description="Create reports on staff attendance, roles, and performance metrics."
      />
       {!isFirebaseConfigured && (
        <Card className="bg-amber-50 border-amber-300"><CardHeader><CardTitle className="font-headline text-amber-800 flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Simulation Mode Active</CardTitle></CardHeader><CardContent><p className="text-amber-700">Firebase is not configured. This page is in read-only mode and cannot load live data.</p></CardContent></Card>
      )}
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline">Staff Report Generator</CardTitle>
          <CardDescription>Use the filters below to generate a specific report, then print or export the results.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="p-4 border rounded-lg mb-6 bg-muted/50 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="font-semibold text-lg flex items-center col-span-full md:col-span-1"><Filter className="mr-2 h-5 w-5" /> Filters</div>
                    {userRole === 'system-admin' && (
                        <div>
                            <Label htmlFor="school-filter">School ID</Label>
                            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                                <SelectTrigger id="school-filter"><SelectValue /></SelectTrigger>
                                <SelectContent>{uniqueSchools.map(school => <SelectItem key={school} value={school}>{school === 'all' ? 'All Schools' : school}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                     <div>
                        <Label htmlFor="role-filter">Role</Label>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger id="role-filter"><SelectValue /></SelectTrigger>
                            <SelectContent>{uniqueRoles.map(role => <SelectItem key={role} value={role}>{role === 'all' ? 'All Roles' : role}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label htmlFor="status-filter">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger id="status-filter"><SelectValue /></SelectTrigger>
                            <SelectContent>{uniqueStatuses.map(status => <SelectItem key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="printable-area">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Generated Report</h3>
                    <div className="flex gap-2 print:hidden">
                        <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
                        <Button onClick={handleExportCsv}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                    </div>
                </div>

                {isLoading ? <Skeleton className="h-64 w-full" /> 
                : fetchError ? <Card className="bg-destructive/10 border-destructive"><CardHeader><CardTitle className="text-base text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error</CardTitle></CardHeader><CardContent><p className="text-sm text-destructive">{fetchError}</p></CardContent></Card>
                : filteredStaff.length === 0 ? (
                    <Card className="mt-6 bg-muted/30">
                      <CardHeader><CardTitle className="font-headline text-base flex items-center"><AlertCircle className="mr-2 h-5 w-5" />No Staff Found</CardTitle></CardHeader>
                      <CardContent><p className="text-sm text-foreground">No staff members match your current filter criteria.</p></CardContent>
                    </Card>
                ) : (
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>School ID</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredStaff.map(staff => (
                                    <TableRow key={staff.id}><TableCell className="font-medium">{staff.name}</TableCell><TableCell>{staff.role}</TableCell><TableCell>{staff.schoolId || 'N/A'}</TableCell><TableCell>{staff.email}</TableCell><TableCell><Badge variant={statusVariants[staff.status]} className={cn(statusVariants[staff.status] === 'default' && 'bg-green-600')}>{staff.status}</Badge></TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
