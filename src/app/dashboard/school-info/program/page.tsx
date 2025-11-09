
// src/app/dashboard/school-info/program/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Save, Loader2, PlusCircle, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ProgramEvent {
    id: string;
    time: string;
    event: string;
    location: string;
}

interface DailyProgram {
    day: string;
    events: ProgramEvent[];
}

interface SchoolProgram {
    weeklyTheme: string;
    program: DailyProgram[];
}

const PROGRAM_DOC_ID = 'program'; // Single document for the program

const initialProgram: SchoolProgram = {
    weeklyTheme: 'Health and Wellness Week',
    program: [
        { day: 'Monday', events: [{ id: 'evt1', time: '09:00 AM', event: 'School Assembly', location: 'Main Hall' }] },
        { day: 'Tuesday', events: [] },
        { day: 'Wednesday', events: [] },
        { day: 'Thursday', events: [] },
        { day: 'Friday', events: [{ id: 'evt2', time: '02:00 PM', event: 'Sports Day', location: 'School Field' }] },
    ]
};

export default function ProgramPage() {
    const [programData, setProgramData] = useState<SchoolProgram>(initialProgram);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const { toast } = useToast();

    const canEdit = userRole === 'system-admin' || userRole === 'head-teacher' || userRole === 'primary-admin' || userRole === 'assistant-head-teacher' || userRole === 'librarian';

    const fetchProgram = useCallback(async (id: string) => {
        setIsLoading(true);
        if (!isFirebaseConfigured || !db) {
            setProgramData(initialProgram);
            setIsLoading(false);
            return;
        }
        const docRef = doc(db, `schools/${id}/schoolInfo`, PROGRAM_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setProgramData(docSnap.data() as SchoolProgram);
        } else {
            setProgramData(initialProgram);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const id = localStorage.getItem('schoolId');
        const role = localStorage.getItem('userRole');
        setSchoolId(id);
        setUserRole(role);
        if (id) {
            fetchProgram(id);
        } else {
            setIsLoading(false);
        }
    }, [fetchProgram]);

    const handleThemeChange = (value: string) => {
        setProgramData(prev => ({ ...prev, weeklyTheme: value }));
    };

    const handleEventChange = (dayIndex: number, eventIndex: number, field: keyof Omit<ProgramEvent, 'id'>, value: string) => {
        const newProgram = { ...programData };
        newProgram.program[dayIndex].events[eventIndex] = { ...newProgram.program[dayIndex].events[eventIndex], [field]: value };
        setProgramData(newProgram);
    };

    const handleAddEvent = (dayIndex: number) => {
        const newEvent: ProgramEvent = { id: `evt_${Date.now()}`, time: '', event: '', location: '' };
        const newProgram = { ...programData };
        newProgram.program[dayIndex].events.push(newEvent);
        setProgramData(newProgram);
    };

    const handleRemoveEvent = (dayIndex: number, eventId: string) => {
        const newProgram = { ...programData };
        newProgram.program[dayIndex].events = newProgram.program[dayIndex].events.filter(e => e.id !== eventId);
        setProgramData(newProgram);
    };

    const handleSaveChanges = async () => {
        if (!schoolId || !db) {
             toast({ variant: 'destructive', title: 'Error', description: 'Cannot save. School ID or database connection is missing.' });
             return;
        }
        setIsSaving(true);
        try {
            const docRef = doc(db, `schools/${schoolId}/schoolInfo`, PROGRAM_DOC_ID);
            await setDoc(docRef, programData);
            toast({ title: 'Success', description: 'School program has been updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the program.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEmailProgram = () => {
        if (!schoolId) {
            toast({ variant: 'destructive', title: 'Error', description: 'School ID not found.' });
            return;
        }
        toast({
            title: "Simulating Email Send",
            description: `An email with the program would be sent to all users of school ID: ${schoolId}.`,
        });
        console.log("Simulating email send for school:", schoolId, "with data:", programData);
    };


  return (
    <div className="p-8 space-y-8">
        <PageHeader
            title="School Program & Schedule"
            description="Manage the official daily and weekly timetables and event schedules."
        />
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2"><Calendar/> Weekly Program</CardTitle>
                    <CardDescription>Use this panel to update the school's weekly theme and daily events.</CardDescription>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        <Button onClick={handleEmailProgram} variant="outline" disabled={isSaving}>
                            <Mail className="mr-2 h-4 w-4"/> Email to School
                        </Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Save Program
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? <p>Loading program...</p> : (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="weeklyTheme" className="text-lg font-semibold">Weekly Theme</Label>
                            <Input id="weeklyTheme" value={programData.weeklyTheme} onChange={e => handleThemeChange(e.target.value)} disabled={!canEdit} />
                        </div>

                        <div className="space-y-4">
                            {programData.program.map((daily, dayIndex) => (
                                <Card key={daily.day} className="bg-muted/30">
                                    <CardHeader>
                                        <CardTitle className="text-xl">{daily.day}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[20%]">Time</TableHead>
                                                    <TableHead className="w-[40%]">Event/Activity</TableHead>
                                                    <TableHead className="w-[30%]">Location</TableHead>
                                                    {canEdit && <TableHead className="w-[10%] text-right">Action</TableHead>}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {daily.events.map((event, eventIndex) => (
                                                    <TableRow key={event.id}>
                                                        <TableCell><Input value={event.time} onChange={e => handleEventChange(dayIndex, eventIndex, 'time', e.target.value)} disabled={!canEdit} /></TableCell>
                                                        <TableCell><Input value={event.event} onChange={e => handleEventChange(dayIndex, eventIndex, 'event', e.target.value)} disabled={!canEdit} /></TableCell>
                                                        <TableCell><Input value={event.location} onChange={e => handleEventChange(dayIndex, eventIndex, 'location', e.target.value)} disabled={!canEdit} /></TableCell>
                                                        {canEdit && (
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveEvent(dayIndex, event.id)}>
                                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                                </Button>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {canEdit && (
                                            <Button variant="outline" size="sm" className="mt-4" onClick={() => handleAddEvent(dayIndex)}>
                                                <PlusCircle className="mr-2 h-4 w-4"/> Add Event for {daily.day}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
