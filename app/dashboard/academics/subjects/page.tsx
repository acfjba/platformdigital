// src/app/dashboard/academics/subjects/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, BookCopy, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where, writeBatch } from 'firebase/firestore';
import type { Subject, SubjectFormData } from '@/lib/schemas/subjects';
import { SubjectFormDataSchema } from '@/lib/schemas/subjects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const defaultSubjects: Omit<Subject, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>[] = [
    // Kindergarten
    { name: 'Language, Literacy & Communication', yearLevel: 'Kindergarten', description: 'Early reading and writing skills.' },
    { name: 'Numeracy', yearLevel: 'Kindergarten', description: 'Basic counting and number recognition.' },
    { name: 'Creative Arts', yearLevel: 'Kindergarten', description: 'Exploring creativity through art and music.' },
    { name: 'Physical, Social & Emotional Development', yearLevel: 'Kindergarten', description: 'Developing motor and social skills.' },

    // Year 1-2
    ...['Year 1', 'Year 2'].flatMap(year => [
        { name: 'English', yearLevel: year, description: 'Core literacy skills.' },
        { name: 'Mathematics', yearLevel: year, description: 'Foundational math concepts.' },
        { name: 'Healthy Living', yearLevel: year, description: 'Physical education and health.' },
        { name: 'Environmental Science', yearLevel: year, description: 'Introduction to the natural world.' },
        { name: 'Art & Craft', yearLevel: year, description: 'Creative expression.' },
        { name: 'Music', yearLevel: year, description: 'Introduction to music and rhythm.' },
    ]),

    // Year 3-8
    ...['Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8'].flatMap(year => [
        { name: 'English', yearLevel: year, description: 'Reading, writing, and comprehension.' },
        { name: 'Mathematics', yearLevel: year, description: 'Core mathematical principles.' },
        { name: 'Elementary Science', yearLevel: year, description: 'General science concepts.' },
        { name: 'Social Science', yearLevel: year, description: 'History, geography, and civics.' },
        { name: 'Healthy Living', yearLevel: year, description: 'Physical education and health education.' },
        { name: 'Vosa Vaka-Viti', yearLevel: year, description: 'Fijian language studies.' },
        { name: 'Hindi', yearLevel: year, description: 'Hindi language studies.' },
        { name: 'Music', yearLevel: year, description: 'Musical theory and practice.' },
        { name: 'Art & Craft', yearLevel: year, description: 'Visual arts and crafts.' },
    ]),
];

// --- Firestore Actions ---

async function seedDefaultSubjects(schoolId: string): Promise<Subject[]> {
    if (!db) throw new Error("Firestore is not configured.");
    const batch = writeBatch(db);
    const subjectsCollection = collection(db, 'subjects');
    const seededSubjects: Subject[] = [];

    defaultSubjects.forEach(subjectData => {
        const newDocRef = doc(subjectsCollection);
        const subjectWithMetadata = {
            ...subjectData,
            schoolId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        batch.set(newDocRef, subjectWithMetadata);
        seededSubjects.push({
            ...subjectData,
            id: newDocRef.id,
            schoolId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    });

    await batch.commit();
    return seededSubjects;
}

async function fetchSubjects(schoolId: string): Promise<Subject[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const subjectsCollection = collection(db, 'subjects');
  const q = query(subjectsCollection, where("schoolId", "==", schoolId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
      // If no subjects found, automatically seed the default subjects for this school
      return await seedDefaultSubjects(schoolId);
  }

  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as Subject;
  });
}

async function saveSubject(data: SubjectFormData, schoolId: string, id?: string): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  if (id && id.startsWith('default-')) { // This is a default subject being saved for the first time
    await addDoc(collection(db, 'subjects'), { ...data, schoolId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } else if (id) { // This is a normal update
    await updateDoc(doc(db, 'subjects', id), { ...data, updatedAt: serverTimestamp() });
  } else { // This is a completely new subject
    await addDoc(collection(db, 'subjects'), { ...data, schoolId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

async function deleteSubject(id: string): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  if (id.startsWith('default-')) {
    // This is a default, unsaved subject. We just remove it from the local state.
    // The calling function should handle the state update.
    return;
  }
  await deleteDoc(doc(db, 'subjects', id));
}

const generateYearOptions = () => {
    const options = [{ value: "Kindergarten", label: "Kindergarten" }];
    for (let year = 1; year <= 8; year++) {
        const yearStr = `Year ${year}`;
        options.push({ value: yearStr, label: yearStr });
    }
    return options;
};

export default function SubjectManagementPage() {
    const { toast } = useToast();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [yearFilter, setYearFilter] = useState('All');
    
    const form = useForm<SubjectFormData>({
        resolver: zodResolver(SubjectFormDataSchema),
    });

    const yearOptions = useMemo(() => generateYearOptions(), []);

    const loadData = useCallback(async (currentSchoolId: string) => {
        setIsLoading(true);
        try {
            const data = await fetchSubjects(currentSchoolId);
            setSubjects(data);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch subjects.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const id = localStorage.getItem('schoolId');
        if (id) {
            setSchoolId(id);
            if (isFirebaseConfigured) {
                loadData(id);
            } else {
                 setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, [loadData]);

    const openModal = (subject: Subject | null = null, yearLevel?: string) => {
        setEditingSubject(subject);
        const defaultValues = {
            name: '',
            yearLevel: yearLevel || '',
            description: ''
        };
        form.reset(subject ? { name: subject.name, yearLevel: subject.yearLevel, description: subject.description } : defaultValues);
        setIsModalOpen(true);
    };

    const onSubmit: SubmitHandler<SubjectFormData> = async (data) => {
        if (!schoolId) return;
        try {
            await saveSubject(data, schoolId, editingSubject?.id);
            toast({ title: 'Success', description: `Subject has been ${editingSubject ? 'updated' : 'added'}.` });
            if (isFirebaseConfigured) loadData(schoolId);
            setIsModalOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save subject.' });
        }
    };

    const handleDelete = async (subject: Subject) => {
        if (!schoolId || !confirm('Are you sure you want to delete this subject?')) return;
        try {
            await deleteSubject(subject.id);
            // If it was a default subject, we also need to remove it from local state
            if (subject.id.startsWith('default-')) {
                setSubjects(prev => prev.filter(s => s.id !== subject.id));
            }
            toast({ title: 'Success', description: 'Subject deleted.' });
            if (isFirebaseConfigured && !subject.id.startsWith('default-')) {
                loadData(schoolId);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete subject.' });
        }
    };
    
    const groupedAndFilteredSubjects = useMemo(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        
        const filtered = subjects.filter(subject => {
            const searchMatch = searchTerm ? 
                subject.name.toLowerCase().includes(lowercasedSearchTerm) ||
                subject.description?.toLowerCase().includes(lowercasedSearchTerm) : true;
            
            const yearMatch = yearFilter === 'All' || subject.yearLevel === yearFilter;

            return searchMatch && yearMatch;
        });

        const yearOrder = ['Kindergarten', ...Array.from({length: 8}, (_, i) => `Year ${i+1}`)];
        const grouped = filtered.reduce((acc, subject) => {
            const { yearLevel } = subject;
            if (!acc[yearLevel]) {
                acc[yearLevel] = [];
            }
            acc[yearLevel].push(subject);
            return acc;
        }, {} as Record<string, Subject[]>);

        return Object.entries(grouped).sort(([a], [b]) => {
            const indexA = yearOrder.indexOf(a);
            const indexB = yearOrder.indexOf(b);
            if(indexA === -1) return 1;
            if(indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [subjects, searchTerm, yearFilter]);

    return (
        <div className="p-8 space-y-8">
            <PageHeader title="Subject Management" description="Define and manage subjects for each year level." />
            
            {!isFirebaseConfigured && (
                <AlertTriangle className="text-destructive"> Firebase is not configured. Data cannot be saved.</AlertTriangle>
            )}

            <Card>
                <CardHeader className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filter subjects by name..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-8"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="year-filter">Year Level</Label>
                        <Select value={yearFilter} onValueChange={setYearFilter}>
                            <SelectTrigger id="year-filter" className="w-[180px]">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Years</SelectItem>
                                {yearOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-64 w-full"/> : groupedAndFilteredSubjects.length === 0 ? (
                        <Card className="text-center p-8"><p>No subjects found for the current filter.</p></Card>
                    ) : (
                        <div className="space-y-6">
                        {groupedAndFilteredSubjects.map(([yearLevel, subjectList]) => (
                            <Card key={yearLevel}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="space-y-1.5">
                                        <CardTitle className="flex items-center gap-2"><BookCopy className="h-5 w-5 text-primary"/>{yearLevel}</CardTitle>
                                        <CardDescription>
                                            {subjectList.length} {subjectList.length === 1 ? 'subject' : 'subjects'} defined.
                                        </CardDescription>
                                    </div>
                                    <Button variant="outline" onClick={() => openModal(null, yearLevel)}>
                                        <PlusCircle className="mr-2 h-4 w-4"/> Add Subject
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[30%]">Subject Name</TableHead>
                                                    <TableHead className="w-[50%]">Description</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {subjectList.map(subject => (
                                                    <TableRow key={subject.id}>
                                                        <TableCell className="font-medium">{subject.name}</TableCell>
                                                        <TableCell>{subject.description}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => openModal(subject)}><Edit className="h-4 w-4"/></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(subject)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSubject ? 'Edit' : 'Add New'} Subject</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <Label htmlFor="yearLevel">Year Level</Label>
                            <Controller
                                name="yearLevel"
                                control={form.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="yearLevel"><SelectValue placeholder="Select Year"/></SelectTrigger>
                                        <SelectContent>
                                            {yearOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.yearLevel && <p className="text-sm text-destructive">{form.formState.errors.yearLevel.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="name">Subject Name</Label>
                            <Input id="name" {...form.register("name")} placeholder="e.g., Mathematics"/>
                            {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input id="description" {...form.register("description")} placeholder="e.g., Core subject focusing on algebra and geometry"/>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {editingSubject ? 'Save Changes' : 'Add Subject'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
