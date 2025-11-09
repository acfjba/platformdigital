
"use client";

import React from 'react';
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { LessonPlanFormData, LessonPlan } from "@/lib/schemas/lesson-planner";
import { LessonPlanSchema } from "@/lib/schemas/lesson-planner";
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Printer, Download, Mail, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useState, useEffect, useCallback } from 'react';
import type { Subject } from '@/lib/schemas/subjects';
import type { StaffMember } from '@/lib/schemas/staff';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


const terms = ["1", "2", "3", "4"];
const weeks = Array.from({ length: 14 }, (_, i) => (i + 1).toString());
const yearLevels = ['Kindergarten', ...Array.from({ length: 8 }, (_, i) => `Year ${i+1}`)];


async function saveLessonPlanToFirestore(data: LessonPlanFormData): Promise<LessonPlan> {
    if (!db) throw new Error("Firestore not configured.");
    const collectionRef = collection(db, 'lessonPlans');
    const dataToAdd = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const docRef = await addDoc(collectionRef, dataToAdd);
    return { ...data, id: docRef.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

async function fetchTeacherAndSubjects(userId: string, schoolId: string): Promise<{ teacher: StaffMember | null, subjects: Subject[] }> {
    if (!db) throw new Error("Firestore is not configured.");

    const staffDocRef = doc(db, 'staff', userId);
    const staffDocSnap = await getDoc(staffDocRef);
    const teacher = staffDocSnap.exists() ? staffDocSnap.data() as StaffMember : null;

    let subjects: Subject[] = [];
    const subjectsCollection = collection(db, 'subjects');
    let q;

    if (teacher?.yearLevel && teacher.yearLevel !== 'N/A') {
        // If teacher has a specific year level, fetch subjects for that year.
        q = query(subjectsCollection, where("schoolId", "==", schoolId), where("yearLevel", "==", teacher.yearLevel));
    } else {
        // Otherwise, fetch all subjects for the school as a fallback.
        q = query(subjectsCollection, where("schoolId", "==", schoolId));
    }

    const snapshot = await getDocs(q);
    subjects = snapshot.docs.map(d => ({...d.data(), id: d.id}) as Subject);
    
    return { teacher, subjects };
}


export default function LessonPlannerPage() {
    const { toast } = useToast();
    const [schoolId, setSchoolId] = useState<string|null>(null);
    const [userId, setUserId] = useState<string|null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teacher, setTeacher] = useState<StaffMember | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const sId = localStorage.getItem('schoolId');
        const uId = localStorage.getItem('userId');
        setSchoolId(sId);
        setUserId(uId);

        if(sId && uId && isFirebaseConfigured) {
            setIsLoading(true);
            fetchTeacherAndSubjects(uId, sId)
                .then(({ teacher, subjects }) => {
                    setTeacher(teacher);
                    setSubjects(subjects);
                })
                .catch(err => toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch initial data.' }))
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [toast]);

    const { 
        register, 
        handleSubmit, 
        control, 
        getValues,
        formState: { errors, isSubmitting } 
    } = useForm<LessonPlanFormData>({
        resolver: zodResolver(LessonPlanSchema),
        defaultValues: {
            yearLevel: "",
            subject: "",
            topic: "",
            term: "",
            week: "",
            objectives: "",
            activities: "",
            resources: "",
            assessment: ""
        }
    });

    const onSubmitHandler: SubmitHandler<LessonPlanFormData> = async (data) => {
        if (!isFirebaseConfigured) {
            toast({ variant: "destructive", title: "Action Disabled", description: "Cannot save because Firebase is not configured." });
            return;
        }

        const dataWithIds: LessonPlanFormData = {
            ...data,
            schoolId: schoolId || undefined,
            teacherId: userId || undefined,
        };
        
        try {
            await saveLessonPlanToFirestore(dataWithIds);
            toast({
                title: "Lesson Plan Saved",
                description: `Your lesson plan for ${data.subject} - Week ${data.week} has been saved to the database.`,
            });
        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save lesson plan."})
        }
    };

    const handleEmailPlan = () => {
        toast({
            title: "Emailing Plan (Simulated)",
            description: "An email would be sent from your address to the Head Teacher for review.",
        });
    };

    const handlePrint = () => {
        toast({ title: "Printing Plan...", description: "Use your browser's print dialog to save as PDF or print." });
        window.print();
    };

    const handleExportCsv = () => {
        const data = getValues();
        const headers = ["Year Level", "Subject", "Topic", "Term", "Week", "Objectives", "Activities", "Resources", "Assessment"];
        const row = [
            `"${(data.yearLevel || "").replace(/"/g, '""')}"`,
            `"${(data.subject || "").replace(/"/g, '""')}"`,
            `"${(data.topic || "").replace(/"/g, '""')}"`,
            `"${data.term}"`,
            `"${data.week}"`,
            `"${(data.objectives || "").replace(/"/g, '""')}"`,
            `"${(data.activities || "").replace(/"/g, '""')}"`,
            `"${(data.resources || "").replace(/"/g, '""')}"`,
            `"${(data.assessment || "").replace(/"/g, '""')}"`
        ];
        
        const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(',') + '\n' + row.join(',');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `lesson_plan_${data.subject || 'untitled'}_week_${data.week || 'na'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Exported to CSV", description: "The lesson plan data has been downloaded." });
    };

    return (
        <div className="p-8 space-y-8 printable-area">
            <PageHeader
                title="Lesson Planner"
                description="Create a detailed lesson plan for a specific subject and week."
            />

            <Card className="shadow-xl rounded-lg w-full max-w-4xl mx-auto">
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="yearLevel">Year Level</Label>
                                <Controller
                                    name="yearLevel"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger id="yearLevel-select"><SelectValue placeholder="Select Year Level" /></SelectTrigger>
                                            <SelectContent>
                                                {yearLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.yearLevel && <p className="text-destructive text-xs mt-1">{errors.yearLevel.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="subject">Subject</Label>
                                <Controller
                                    name="subject"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger id="subject-select"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                            <SelectContent>
                                                {isLoading ? (
                                                     <div className="p-2 text-sm text-muted-foreground">Loading subjects...</div>
                                                ) : subjects.length > 0 ? (
                                                    subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name} ({s.yearLevel})</SelectItem>)
                                                ) : (
                                                    <div className="p-2 text-sm text-muted-foreground">No subjects found.</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.subject && <p className="text-destructive text-xs mt-1">{errors.subject.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="topic">Topic</Label>
                                <Input id="topic" {...register("topic")} placeholder="e.g., Introduction to Algebra" />
                                {errors.topic && <p className="text-destructive text-xs mt-1">{errors.topic.message}</p>}
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="term">Term</Label>
                                    <Controller
                                        name="term"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                                                <SelectContent>
                                                    {terms.map(t => <SelectItem key={t} value={t}>Term {t}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.term && <p className="text-destructive text-xs mt-1">{errors.term.message}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="week">Week</Label>
                                    <Controller
                                        name="week"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger><SelectValue placeholder="Select Week" /></SelectTrigger>
                                                <SelectContent>
                                                    {weeks.map(w => <SelectItem key={w} value={w}>Week {w}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.week && <p className="text-destructive text-xs mt-1">{errors.week.message}</p>}
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="objectives">Learning Objectives</Label>
                            <Textarea id="objectives" {...register("objectives")} rows={3} placeholder="List what students will be able to do by the end of the lesson..." />
                            {errors.objectives && <p className="text-destructive text-xs mt-1">{errors.objectives.message}</p>}
                        </div>
                        
                        <div>
                            <Label htmlFor="activities">Learning Activities</Label>
                            <Textarea id="activities" {...register("activities")} rows={5} placeholder="Describe the sequence of activities (e.g., Monday: Introduction, Tuesday: Group work...)" />
                            {errors.activities && <p className="text-destructive text-xs mt-1">{errors.activities.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="resources">Resources</Label>
                            <Textarea id="resources" {...register("resources")} rows={3} placeholder="List all materials, textbooks, digital tools, etc., needed for the lesson." />
                            {errors.resources && <p className="text-destructive text-xs mt-1">{errors.resources.message}</p>}
                        </div>
                        
                        <div>
                            <Label htmlFor="assessment">Assessment Methods</Label>
                            <Textarea id="assessment" {...register("assessment")} rows={3} placeholder="How will you measure student understanding? (e.g., Quiz, Observation, Exit ticket...)" />
                            {errors.assessment && <p className="text-destructive text-xs mt-1">{errors.assessment.message}</p>}
                        </div>

                        <div className="flex flex-wrap justify-end gap-4 pt-4 print:hidden">
                            <Button variant="outline" type="button" onClick={handleExportCsv} disabled={isSubmitting}>
                                <Download className="mr-2 h-4 w-4" /> Export as CSV
                            </Button>
                            <Button variant="outline" type="button" onClick={handlePrint} disabled={isSubmitting}>
                                <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
                            </Button>
                            <Button variant="outline" type="button" onClick={handleEmailPlan} disabled={isSubmitting}>
                                <Mail className="mr-2 h-4 w-4" /> Email Plan
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !isFirebaseConfigured}>
                               {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                {isSubmitting ? "Saving..." : "Save Lesson Plan"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
