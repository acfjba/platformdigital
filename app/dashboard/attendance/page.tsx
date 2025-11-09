// src/app/dashboard/attendance/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, AlertTriangle, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, subDays } from 'date-fns';
import { type StaffMember } from '@/lib/schemas/staff';
import { type StaffAttendanceRecord, type StaffAttendanceFormData, attendanceStatuses } from '@/lib/schemas/attendance';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

interface EditableAttendanceRecord extends StaffAttendanceFormData {
  staffName: string;
}

interface School {
    id: string;
    name: string;
}

async function fetchSchools(): Promise<School[]> {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, 'schools'));
    return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
}

async function fetchStaff(schoolId: string): Promise<StaffMember[]> {
    if (!db) throw new Error("Firestore is not configured.");
    
    const staffCollection = collection(db, 'staff');
    const q = query(staffCollection, where("schoolId", "==", schoolId), where("status", "==", "Active"));
    const snapshot = await getDocs(q);
    
    const staffList = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember));
    
    // Filter by relevant roles in-memory
    const relevantRoles = ['teacher', 'head-teacher', 'assistant-head-teacher', 'librarian', 'kindergarten', 'primary-admin'];
    return staffList.filter(staff => staff.role && relevantRoles.includes(staff.role));
}

async function fetchAttendanceRecords(schoolId: string, date: string): Promise<StaffAttendanceRecord[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const recordsCollection = collection(db, 'staffAttendance');
  const q = query(recordsCollection, where('schoolId', '==', schoolId), where('date', '==', date));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as StaffAttendanceRecord));
}

async function saveAttendanceRecords(records: EditableAttendanceRecord[], schoolId: string, userId: string): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    const batch = writeBatch(db);
    const recordsCollection = collection(db, 'staffAttendance');

    records.forEach(record => {
        const recordId = `${record.date}_${record.staffId}`;
        const docRef = doc(recordsCollection, recordId);
        const dataToSave = {
            ...record,
            schoolId,
            recordedBy: userId,
            updatedAt: new Date(),
        };
        batch.set(docRef, dataToSave, { merge: true });
    });

    await batch.commit();
}


export default function StaffAttendancePage() {
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [attendance, setAttendance] = useState<Map<string, EditableAttendanceRecord>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string|null>(null);
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

    const canManage = userRole === 'system-admin' || userRole === 'head-teacher' || userRole === 'primary-admin' || userRole === 'assistant-head-teacher';

    const loadData = useCallback(async (schoolId: string, date: Date) => {
        setIsLoading(true);
        try {
            const dateString = format(date, 'yyyy-MM-dd');
            const [staff, records] = await Promise.all([
                fetchStaff(schoolId),
                fetchAttendanceRecords(schoolId, dateString)
            ]);

            setStaffList(staff);
            
            const newAttendanceMap = new Map<string, EditableAttendanceRecord>();
            staff.forEach(s => {
                const existingRecord = records.find(r => r.staffId === s.id);
                newAttendanceMap.set(s.id, {
                    staffId: s.id,
                    staffName: s.name,
                    date: dateString,
                    status: existingRecord?.status || 'Present',
                    checkIn: existingRecord?.checkIn || '',
                    checkOut: existingRecord?.checkOut || '',
                    notes: existingRecord?.notes || '',
                });
            });
            setAttendance(newAttendanceMap);

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load attendance data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const sId = localStorage.getItem('schoolId');
        const uId = localStorage.getItem('userId');
        setUserRole(role);
        setUserId(uId);

        if (role === 'system-admin') {
            fetchSchools().then(fetchedSchools => {
                setSchools(fetchedSchools);
                if (fetchedSchools.length > 0) {
                    setSelectedSchoolId(fetchedSchools[0].id);
                } else {
                    setIsLoading(false);
                }
            });
        } else if (sId) {
            setSelectedSchoolId(sId);
        } else {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedSchoolId) {
            loadData(selectedSchoolId, selectedDate);
        }
    }, [selectedSchoolId, selectedDate, loadData]);

    const handleAttendanceChange = (staffId: string, field: keyof Omit<EditableAttendanceRecord, 'staffId' | 'staffName' | 'date'>, value: string) => {
        setAttendance(prev => {
            const newMap = new Map(prev);
            const record = newMap.get(staffId);
            if (record) {
                newMap.set(staffId, { ...record, [field]: value });
            }
            return newMap;
        });
    };

    const handleSave = async () => {
        if (!canManage || !userId || !selectedSchoolId) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to save records.' });
            return;
        }
        setIsSaving(true);
        try {
            await saveAttendanceRecords(Array.from(attendance.values()), selectedSchoolId, userId);
            toast({ title: 'Success', description: `Attendance for ${format(selectedDate, 'PPP')} has been saved.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save attendance data.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <PageHeader title="Staff Attendance Register" description="Record daily attendance, check-in/out times, and leave for all active staff." />

            <Card>
                <CardHeader className="flex flex-col md:flex-row md:justify-between md:items-center">
                    <div>
                        <CardTitle>Attendance for: {format(selectedDate, 'eeee, dd MMMM yyyy')}</CardTitle>
                        <CardDescription>
                            School: {schools.find(s => s.id === selectedSchoolId)?.name || selectedSchoolId || "Not selected"}
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2 mt-4 md:mt-0">
                        <Button variant="outline" onClick={() => setSelectedDate(subDays(selectedDate, 1))}><ChevronLeft className="h-4 w-4"/> Prev Day</Button>
                        <Button variant="outline" onClick={() => setSelectedDate(new Date())}>Today</Button>
                        <Button variant="outline" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>Next Day <ChevronRight className="h-4 w-4 ml-2"/></Button>
                        {canManage && <Button onClick={handleSave} disabled={isSaving || !selectedSchoolId}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save All Records</Button>}
                    </div>
                </CardHeader>
                <CardContent>
                    {userRole === 'system-admin' && (
                        <div className="max-w-xs mb-6">
                            <Label htmlFor="school-select">Select School</Label>
                            <Select value={selectedSchoolId || ''} onValueChange={setSelectedSchoolId}>
                                <SelectTrigger id="school-select">
                                    <SelectValue placeholder="Select a school..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {isLoading ? (
                         <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : staffList.length === 0 ? (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>No Staff Found For This School</AlertTitle>
                            <AlertDescription>
                                No staff members were found for this school. This could be because no staff are registered with an "Active" status.
                                {canManage && (
                                    <> You can add staff members from the <Link href="/dashboard/staff-records" className="font-bold underline">Staff Records</Link> page.</>
                                )}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Staff Name</TableHead>
                                        <TableHead className="w-[150px]">Status</TableHead>
                                        <TableHead className="w-[130px]">Check-in</TableHead>
                                        <TableHead className="w-[130px]">Check-out</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staffList.map(staff => {
                                        const record = attendance.get(staff.id);
                                        if (!record) return null;
                                        return (
                                            <TableRow key={staff.id}>
                                                <TableCell className="font-medium">{staff.name}</TableCell>
                                                <TableCell>
                                                    <Select value={record.status} onValueChange={(value) => handleAttendanceChange(staff.id, 'status', value)} disabled={!canManage}>
                                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            {attendanceStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="time" value={record.checkIn} onChange={(e) => handleAttendanceChange(staff.id, 'checkIn', e.target.value)} disabled={!canManage} />
                                                </TableCell>
                                                 <TableCell>
                                                    <Input type="time" value={record.checkOut} onChange={(e) => handleAttendanceChange(staff.id, 'checkOut', e.target.value)} disabled={!canManage} />
                                                </TableCell>
                                                 <TableCell>
                                                    <Input placeholder="Add notes..." value={record.notes} onChange={(e) => handleAttendanceChange(staff.id, 'notes', e.target.value)} disabled={!canManage} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
