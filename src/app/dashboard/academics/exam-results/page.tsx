
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExamResultFormInputSchema, examTypes, type ExamResult, type ExamResultFormData } from "@/lib/schemas/exam-results";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Search, Edit3, Trash2, ClipboardCheck, AlertCircle, Printer, Download, AlertTriangle, FileUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';


// --- Firestore Actions ---
async function fetchExamResultsFromBackend(schoolId: string): Promise<ExamResult[]> {
  if (!db) throw new Error("Firestore is not configured.");
  
  const recordsCollectionRef = collection(db, 'examResults');
  
  // This query is now always filtered by schoolId
  const q = query(recordsCollectionRef, where("schoolId", "==", schoolId));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as ExamResult;
  });
}

async function fetchAllExamResultsForSystemAdmin(): Promise<ExamResult[]> {
    if (!db) throw new Error("Firestore is not configured.");
    const recordsCollectionRef = collection(db, 'examResults');
    const snapshot = await getDocs(recordsCollectionRef);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as ExamResult;
    });
}


async function saveExamResultToBackend(data: Omit<ExamResult, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<ExamResult> {
  if (!db) throw new Error("Firestore is not configured.");
  if (id) {
      const docRef = doc(db, 'examResults', id);
      const dataToUpdate = { ...data, updatedAt: serverTimestamp() };
      await updateDoc(docRef, dataToUpdate);
      return { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  } else {
      const collectionRef = collection(db, 'examResults');
      const dataToAdd = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      const docRef = await addDoc(collectionRef, dataToAdd);
      return { ...data, id: docRef.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
}

async function deleteExamResultFromBackend(id: string): Promise<{ success: boolean }> {
  if (!db) throw new Error("Firestore is not configured.");
  await deleteDoc(doc(db, 'examResults', id));
  return { success: true };
}

const generateYearOptions = () => {
    const options = [{ value: "Kindergarten", label: "Kindergarten" }];
    for (let year = 1; year <= 8; year++) {
        const yearStr = `Year ${year}`;
        options.push({ value: yearStr, label: yearStr });
    }
    return options;
};

export default function ExamResultsManagementPage() {
  const { toast } = useToast();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadResults = useCallback(async (role: string, school: string | null) => {
    setIsLoading(true);
    setFetchError(null);
    try {
        if (!isFirebaseConfigured) {
          throw new Error("Firebase is not configured. Cannot load data.");
        }
        
        let fetchedResults;
        if (role === 'system-admin') {
            fetchedResults = await fetchAllExamResultsForSystemAdmin();
        } else {
            if (!school) {
                setFetchError("Your school ID is not set. Cannot load data.");
                setIsLoading(false);
                return;
            }
            fetchedResults = await fetchExamResultsFromBackend(school);
        }
        setResults(fetchedResults);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedSchoolId = localStorage.getItem('schoolId');
    const storedUserRole = localStorage.getItem('userRole');
    const storedUserId = localStorage.getItem('userId');
    setSchoolId(storedSchoolId);
    setUserRole(storedUserRole);
    setUserId(storedUserId);
    
    if (storedUserRole) {
        loadResults(storedUserRole, storedSchoolId);
    } else {
        // This case should be handled by the DashboardLayout's auth check
        setIsLoading(false);
    }
  }, [loadResults]);

  const canManage = useMemo(() => {
      if (!userRole) return false;
      if (userRole === 'system-admin') return true;
      const editableRoles = ['teacher', 'head-teacher', 'primary-admin', 'kindergarten'];
      return editableRoles.includes(userRole);
  }, [userRole]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<ExamResultFormData>({
    resolver: zodResolver(ExamResultFormInputSchema),
    defaultValues: {
      studentId: '',
      studentName: '',
      studentYear: '',
      examType: undefined,
      otherExamTypeName: '',
      subject: '',
      score: undefined, 
      grade: '',
      examDate: '',
      term: '',
      year: '',
      comments: '',
    },
  });

  const watchedExamType = watch("examType");


  useEffect(() => {
    if (editingResultId && isFormModalOpen) {
        const resultToEdit = results.find(r => r.id === editingResultId);
        if (resultToEdit) {
            reset({
              studentId: resultToEdit.studentId,
              studentName: resultToEdit.studentName,
              studentYear: resultToEdit.studentYear,
              examType: resultToEdit.examType,
              otherExamTypeName: resultToEdit.otherExamTypeName || '',
              subject: resultToEdit.subject,
              score: resultToEdit.score,
              grade: resultToEdit.grade || '',
              examDate: resultToEdit.examDate,
              term: resultToEdit.term,
              year: resultToEdit.year,
              comments: resultToEdit.comments || '',
            });
        }
    }
  }, [editingResultId, isFormModalOpen, reset, results]);


  const handleFormSubmitHandler: SubmitHandler<ExamResultFormData> = async (data) => {
    if (!isFirebaseConfigured || !userId) {
        toast({ variant: "destructive", title: "Action Disabled", description: "Cannot save because Firebase is not configured or user is not logged in."});
        return;
    }
    
    const resultToSave: Omit<ExamResult, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        score: data.score === undefined || isNaN(data.score) ? undefined : data.score,
        recordedByUserId: userId,
        schoolId: schoolId || 'UNKNOWN_SCHOOL_ID', 
    };

    try {
      if (editingResultId) {
        await saveExamResultToBackend({
            ...resultToSave,
        }, editingResultId);
        toast({ title: "Exam Result Updated", description: `Result for ${data.studentName} updated.` });
      } else {
        await saveExamResultToBackend(resultToSave);
        toast({ title: "Exam Result Recorded", description: `New result for ${data.studentName} added.` });
      }
      
      if (userRole) {
        await loadResults(userRole, schoolId);
      }
      
      setIsFormModalOpen(false);
      setEditingResultId(null);
      reset();
    } catch (error) {
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save exam result." });
    }
  };

  const openAddModal = () => { setEditingResultId(null); setIsFormModalOpen(true); reset(); };
  const openEditModal = (resultId: string) => { setEditingResultId(resultId); setIsFormModalOpen(true); };
  
  const handleDeleteResult = async (resultId: string) => {
    if (!window.confirm("Are you sure you want to delete this exam result?")) return;
    if (!isFirebaseConfigured) {
      toast({ variant: "destructive", title: "Action Disabled", description: "Cannot delete because Firebase is not configured."});
      return;
    }
    try {
      await deleteExamResultFromBackend(resultId);
      if (userRole) {
        await loadResults(userRole, schoolId);
      }
      toast({ title: "Result Deleted", description: "Exam result has been deleted." });
    } catch (error) {
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete exam result." });
    }
  };

  const handlePrint = () => {
    toast({
        title: "Printing...",
        description: "Use your browser's print dialog to save as PDF. This file can then be opened in Word if needed.",
    });
    window.print();
  };

  const handleExportCsv = () => {
    if (filteredResults.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "There is no data to export." });
      return;
    }
    const headers = ["Student Name", "Student Year", "Exam Type", "Subject", "Score", "Grade", "Exam Date", "Term", "Academic Year", "Comments"];
    const rows = filteredResults.map(result => [
        `"${result.studentName.replace(/"/g, '""')}"`,
        result.studentYear,
        result.examType === "Other" ? `"${(result.otherExamTypeName || 'Other').replace(/"/g, '""')}"` : result.examType,
        `"${result.subject.replace(/"/g, '""')}"`,
        result.score ?? '',
        result.grade ?? '',
        result.examDate,
        result.term,
        result.year,
        `"${(result.comments || '').replace(/"/g, '""')}"`
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `exam_results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful", description: "Exam results have been downloaded as a CSV file for Excel." });
  };

  const studentYearOptions = useMemo(() => generateYearOptions(), []);

  const filteredResults = useMemo(() => {
    return results.filter(result =>
      (yearFilter === 'All' || result.studentYear === yearFilter) &&
      (searchTerm.trim() === '' ||
      result.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (result.subject && result.subject.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [results, searchTerm, yearFilter]);
  
  const currentAcademicYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => (currentAcademicYear - 5 + i).toString());
  const termOptions = ["1", "2", "3", "4"]; 
  
  return (
    <div className="p-8 space-y-8 printable-area">
      <PageHeader
        title="Exam Results Management"
        description="Record and manage student exam results for all year levels."
      >
        {canManage && (
          <Button onClick={openAddModal}>
            <PlusCircle className="mr-2 h-5 w-5" /> Record New Result
          </Button>
        )}
      </PageHeader>
      
      {canManage && (
        <Alert>
          <FileUp className="h-4 w-4" />
          <AlertTitle>Bulk Data Upload</AlertTitle>
          <AlertDescription>
            To enter results for an entire class at once, go to the{' '}
            <Link href="/dashboard/operations/infodatafeed" className="font-bold underline">
              Info Data Feed
            </Link>
            {' '}page, download the "Exam Results" template, fill it out, and upload it.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6 print:hidden">
            <div className="flex-grow relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filter by name, ID, or subject..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-8 w-full sm:w-[300px]"
                />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="year-filter" className="font-semibold whitespace-nowrap">Filter by Year:</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger id="year-filter" className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Years</SelectItem>
                    {studentYearOptions.map(year => <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading && <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>}
          {!isLoading && fetchError && <Card className="mt-6 bg-destructive/10 border-destructive"><CardHeader><CardTitle className="text-base text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error Loading Data</CardTitle></CardHeader><CardContent><p className="text-sm text-destructive">{fetchError}</p></CardContent></Card>}
          {!isLoading && !fetchError && filteredResults.length === 0 && <Card className="mt-6 bg-muted/30"><CardHeader><CardTitle className="text-base flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> No Exam Results Found</CardTitle></CardHeader><CardContent><p className="text-sm text-foreground">{searchTerm || yearFilter !== 'All' ? `No results matched your search/filter criteria.` : "No exam results have been recorded yet."}</p></CardContent></Card>}

          {!isLoading && !fetchError && filteredResults.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Student Name</TableHead><TableHead>Year</TableHead><TableHead>Exam Type</TableHead><TableHead>Subject</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead><TableHead>Date</TableHead>{canManage && <TableHead className="text-center print:hidden">Actions</TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {filteredResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.studentName}</TableCell>
                      <TableCell>{result.studentYear}</TableCell>
                      <TableCell>{result.examType === "Other" ? result.otherExamTypeName : result.examType}</TableCell>
                      <TableCell>{result.subject}</TableCell>
                      <TableCell>{result.score !== undefined ? result.score : '-'}</TableCell>
                      <TableCell>{result.grade || '-'}</TableCell>
                      <TableCell>{result.examDate}</TableCell>
                      {canManage && (<TableCell className="text-center space-x-1 print:hidden"><Button variant="ghost" size="icon" onClick={() => result.id && openEditModal(result.id)} title="Edit Result"><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => result.id && handleDeleteResult(result.id)} title="Delete Result"><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!isLoading && !fetchError && filteredResults.length > 0 && (
              <div className="flex justify-start gap-2 mt-4 print:hidden">
                  <Button variant="outline" onClick={handlePrint}>
                      <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
                  </Button>
                  <Button variant="outline" onClick={handleExportCsv}>
                      <Download className="mr-2 h-4 w-4" /> Export as CSV (Excel)
                  </Button>
              </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormModalOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingResultId(null); setIsFormModalOpen(isOpen); }}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
          <DialogHeader><DialogTitle className="font-headline">{editingResultId ? 'Edit Exam Result' : 'Record New Exam Result'}</DialogTitle><DialogDescription>Fill in the details for the student's exam result.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmitHandler)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="studentNameForm">Student Name</Label><Input id="studentNameForm" {...register("studentName")} />{errors.studentName && <p className="text-destructive text-xs mt-1">{errors.studentName.message}</p>}</div>
              <div><Label htmlFor="studentIdForm">Student ID</Label><Input id="studentIdForm" {...register("studentId")} />{errors.studentId && <p className="text-destructive text-xs mt-1">{errors.studentId.message}</p>}</div>
              <div><Label htmlFor="studentYearForm">Student Year</Label>
                  <Controller name="studentYear" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="studentYearForm"><SelectValue placeholder="Select Year" /></SelectTrigger>
                          <SelectContent>{studentYearOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                      </Select>
                  )} />
                  {errors.studentYear && <p className="text-destructive text-xs mt-1">{errors.studentYear.message}</p>}
              </div>
            </div>
            <div><Label htmlFor="examTypeForm">Exam Type</Label>
              <Controller name="examType" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="examTypeForm"><SelectValue placeholder="Select exam type" /></SelectTrigger>
                      <SelectContent>{examTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                  </Select>
              )} />{errors.examType && <p className="text-destructive text-xs mt-1">{errors.examType.message}</p>}</div>
            {watchedExamType === "Other" && (<div><Label htmlFor="otherExamTypeNameForm">Specify Other Exam Type</Label><Input id="otherExamTypeNameForm" {...register("otherExamTypeName")} placeholder="e.g., Mid-Term Assessment" />{errors.otherExamTypeName && <p className="text-destructive text-xs mt-1">{errors.otherExamTypeName.message}</p>}</div>)}
            <div><Label htmlFor="subjectForm">Subject</Label><Input id="subjectForm" {...register("subject")} />{errors.subject && <p className="text-destructive text-xs mt-1">{errors.subject.message}</p>}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="scoreForm">Score</Label><Input id="scoreForm" type="number" {...register("score")} placeholder="e.g., 75 or leave blank" />{errors.score && <p className="text-destructive text-xs mt-1">{errors.score.message}</p>}</div>
              <div><Label htmlFor="gradeForm">Grade</Label><Input id="gradeForm" {...register("grade")} placeholder="e.g., A, Pass or leave blank" />{errors.grade && <p className="text-destructive text-xs mt-1">{errors.grade.message}</p>}</div>
            </div>
             {(errors as any).root?.message && <p className="text-destructive text-xs mt-1 col-span-full">{(errors as any).root.message}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label htmlFor="examDateForm">Exam Date</Label><Input id="examDateForm" type="date" {...register("examDate")} />{errors.examDate && <p className="text-destructive text-xs mt-1">{errors.examDate.message}</p>}</div>
              <div><Label htmlFor="termForm">Term</Label><Controller name="term" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="termForm"><SelectValue placeholder="Select Term" /></SelectTrigger><SelectContent>{termOptions.map(opt => <SelectItem key={opt} value={opt}>Term {opt}</SelectItem>)}</SelectContent></Select>
                      )} />{errors.term && <p className="text-destructive text-xs mt-1">{errors.term.message}</p>}</div>
              <div><Label htmlFor="yearForm">Academic Year</Label><Controller name="year" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="yearForm"><SelectValue placeholder="Select Year" /></SelectTrigger><SelectContent>{yearOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent></Select>
                      )} />{errors.year && <p className="text-destructive text-xs mt-1">{errors.year.message}</p>}</div>
            </div>
            <div><Label htmlFor="commentsForm">Comments (Optional)</Label><Textarea id="commentsForm" {...register("comments")} rows={3} />{errors.comments && <p className="text-destructive text-xs mt-1">{errors.comments.message}</p>}</div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isFormSubmitting}>
                {isFormSubmitting ? (editingResultId ? "Updating..." : "Recording...") : (editingResultId ? "Update Result" : "Record Result")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
