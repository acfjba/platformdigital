
// src/app/dashboard/disciplinary/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gavel, Printer, Edit3, Trash2, PlusCircle, Mail, AlertTriangle, Loader2, Save, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DisciplinaryRecordFormDataSchema, issueTypes, type DisciplinaryRecord, type DisciplinaryRecordFormData } from "@/lib/schemas/disciplinary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
import { ClusterYearSelect } from '@/components/shared/cluster-year-select';
import Link from 'next/link';


// --- Firestore Actions ---
async function fetchDisciplinaryRecordsFromFirestore(schoolId: string): Promise<DisciplinaryRecord[]> {
    if (!db) throw new Error("Firestore is not configured.");
    let q = query(collection(db, 'disciplinary'), where("schoolId", "==", schoolId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            incidentDate: data.incidentDate,
            studentDob: data.studentDob,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt).toISOString(),
        } as DisciplinaryRecord;
    });
}

async function saveDisciplinaryRecordToFirestore(record: Omit<DisciplinaryRecord, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<DisciplinaryRecord> {
    if (!db) throw new Error("Firestore is not configured.");
    if (id) {
        const docRef = doc(db, 'disciplinary', id);
        const dataToUpdate = { ...record, updatedAt: serverTimestamp() };
        await updateDoc(docRef, dataToUpdate);
        return { ...record, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    } else {
        const dataToAdd = { ...record, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, 'disciplinary'), dataToAdd);
        return { ...record, id: docRef.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    }
}

async function deleteDisciplinaryRecordFromFirestore(id: string): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    await deleteDoc(doc(db, 'disciplinary', id));
}


export default function DisciplinaryPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<DisciplinaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('schoolId');
    const uId = localStorage.getItem('userId');
    if (id) {
      setSchoolId(id);
    }
    if (uId) {
      setUserId(uId);
    }
    if (!id || !uId) {
      setIsLoading(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    if (!schoolId) {
        if(isFirebaseConfigured) setFetchError("Your school ID is not set. Cannot load data.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const fetchedRecords = await fetchDisciplinaryRecordsFromFirestore(schoolId);
      setRecords(fetchedRecords);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "An unknown error occurred.");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if(schoolId) {
      loadRecords();
    }
  }, [loadRecords, schoolId]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    getValues,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<DisciplinaryRecordFormData>({
    resolver: zodResolver(DisciplinaryRecordFormDataSchema),
    defaultValues: {
      incidentDate: '',
      studentName: '',
      studentId: '',
      studentDob: '',
      studentYear: '',
      issues: [],
      drugType: '',
      otherIssue: '',
      comments: '',
      raisedBy: '',
      parentsInformed: undefined,
      actionComments: '',
    },
  });

  const watchedIssues = watch("issues");
  const showDrugType = watchedIssues.includes('Drug');
  const showOtherIssue = watchedIssues.includes('Other');
  
  useEffect(() => {
    if (editingRecordId && isFormModalOpen) {
      const recordToEdit = records.find(r => r.id === editingRecordId);
      if (recordToEdit) {
        const { id, userId, createdAt, updatedAt, schoolId, ...formData } = recordToEdit;
        reset(formData); 
      }
    }
  }, [editingRecordId, isFormModalOpen, reset, records]);


  const handleFormSubmitHandler: SubmitHandler<DisciplinaryRecordFormData> = async (data) => {
    if (!isFirebaseConfigured) {
        toast({ variant: "destructive", title: "Action Disabled", description: "Cannot save because Firebase is not configured." });
        return;
    }
    if (!schoolId || !userId) {
        toast({ variant: "destructive", title: "Save Failed", description: "School ID or User ID not found." });
        return;
    }
    const recordToSave: Omit<DisciplinaryRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        schoolId,
        userId
    };

    try {
        await saveDisciplinaryRecordToFirestore(recordToSave, editingRecordId ?? undefined);
        await loadRecords(); // Reload from firestore

        toast({ title: editingRecordId ? "Record Updated" : "Record Saved", description: `Disciplinary record for ${data.studentName} has been processed.` });
        setIsFormModalOpen(false);
        reset();
    } catch (error) {
        console.error("Error saving record to Firestore:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save disciplinary record." });
    }
  };
  
  const openAddModal = () => {
    setEditingRecordId(null);
    reset(); 
    setIsFormModalOpen(true);
  };

  const openEditModal = (recordId: string) => {
    setEditingRecordId(recordId);
    setIsFormModalOpen(true); 
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm("Are you sure you want to delete this disciplinary record?")) return;
    
    if (!isFirebaseConfigured) {
        toast({ variant: "destructive", title: "Action Disabled", description: "Cannot delete because Firebase is not configured." });
        return;
    }
    
    try {
        await deleteDisciplinaryRecordFromFirestore(recordId);
        await loadRecords();
        toast({ title: "Record Deleted", description: "The disciplinary record has been deleted." });
    } catch (error) {
        console.error("Error deleting record from Firestore:", error);
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete record."});
    }
  };
  
  const handlePrint = () => {
    toast({
      title: "Printing...",
      description: "Use your browser's print dialog to save as PDF or print.",
    });
    window.print();
  };
  
  const handleSaveDraft = () => {
    const formData = getValues();
    console.log("Saving draft (simulated):", formData);
    toast({
      title: "Draft Saved",
      description: "Your disciplinary record draft has been saved (simulated).",
    });
  };

  const handleEmailForm = () => {
    toast({
      title: "Emailing Record (Simulated)",
      description: "An email would be sent to the relevant parties.",
    });
  };

  return (
    <div className="p-8 space-y-8">
        <PageHeader 
            title="Disciplinary Records"
            description="Manage student disciplinary records and actions taken."
        >
            <Button onClick={openAddModal}>
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Record
            </Button>
        </PageHeader>
        
        <Alert>
            <FileUp className="h-4 w-4" />
            <AlertTitle>Bulk Data Upload</AlertTitle>
            <AlertDescription>
                To enter multiple disciplinary records at once, go to the{' '}
                <Link href="/dashboard/operations/infodatafeed" className="font-bold underline">
                Info Data Feed
                </Link>
                {' '}page, download the "Disciplinary Records" template, fill it out, and upload it.
            </AlertDescription>
        </Alert>
        
        <Dialog open={isFormModalOpen} onOpenChange={(isOpen) => {
          setIsFormModalOpen(isOpen);
          if (!isOpen) { 
              setEditingRecordId(null);
              reset();
          }
        }}>
          <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-headline">{editingRecordId ? 'Edit Disciplinary Record' : 'New Record Entry'}</DialogTitle>
            </DialogHeader>
            <div className="printable-area">
              <form id="disciplinary-form" onSubmit={handleSubmit(handleFormSubmitHandler)} className="space-y-3 font-body max-h-[70vh] overflow-y-auto p-1 pr-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="incident-date">Date of Incident</Label>
                    <Input type="date" id="incident-date" {...register("incidentDate")} />
                    {errors.incidentDate && <p className="text-destructive text-xs mt-1">{errors.incidentDate.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="student-name">Student Name</Label>
                    <Input type="text" id="student-name" {...register("studentName")} placeholder="Full Name" />
                    {errors.studentName && <p className="text-destructive text-xs mt-1">{errors.studentName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="student-id">Student ID</Label>
                    <Input type="text" id="student-id" {...register("studentId")} placeholder="e.g., S12345" />
                    {errors.studentId && <p className="text-destructive text-xs mt-1">{errors.studentId.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="student-dob">Date of Birth</Label>
                    <Input type="date" id="student-dob" {...register("studentDob")} />
                    {errors.studentDob && <p className="text-destructive text-xs mt-1">{errors.studentDob.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="student-year">Year Level</Label>
                    <Controller
                        name="studentYear"
                        control={control}
                        render={({ field }) => (
                           <ClusterYearSelect id="student-year-select" value={field.value} onValueChange={field.onChange} />
                        )}
                    />
                    {errors.studentYear && <p className="text-destructive text-xs mt-1">{errors.studentYear.message}</p>}
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block">Issues</Label>
                  <Controller
                    name="issues"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
                        {issueTypes.map(issue => (
                          <div key={issue} className="flex items-center space-x-2">
                            <Checkbox
                              id={`issue-${issue.toLowerCase()}`}
                              checked={field.value?.includes(issue)}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), issue]
                                  : (field.value || []).filter(i => i !== issue);
                                field.onChange(newValue);
                              }}
                            />
                            <Label htmlFor={`issue-${issue.toLowerCase()}`} className="font-normal">{issue}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  {errors.issues && <p className="text-destructive text-xs mt-1">{errors.issues.message}</p>}
                </div>

                {showDrugType && (
                  <div>
                    <Label htmlFor="drug-type">Type of Drugs (if applicable)</Label>
                    <Input type="text" id="drug-type" {...register("drugType")} placeholder="e.g., Cannabis, Vape" />
                    {errors.drugType && <p className="text-destructive text-xs mt-1">{errors.drugType.message}</p>}
                  </div>
                )}
                {showOtherIssue && (
                  <div>
                    <Label htmlFor="other-issue">Other Issue Description</Label>
                    <Textarea id="other-issue" {...register("otherIssue")} placeholder="Describe the other issue in detail" />
                    {errors.otherIssue && <p className="text-destructive text-xs mt-1">{errors.otherIssue.message}</p>}
                  </div>
                )}

                <div>
                  <Label htmlFor="comments">Comments / Incident Details</Label>
                  <Textarea id="comments" {...register("comments")} placeholder="Detailed description of the incident..." rows={2} />
                  {errors.comments && <p className="text-destructive text-xs mt-1">{errors.comments.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="raised-by">Issue Raised By</Label>
                    <Input type="text" id="raised-by" {...register("raisedBy")} placeholder="Name of reporter" />
                    {errors.raisedBy && <p className="text-destructive text-xs mt-1">{errors.raisedBy.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="parents-informed">Parents Informed</Label>
                    <Controller
                        name="parentsInformed"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="parents-informed"><SelectValue placeholder="Select status" /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="Attempted">Attempted, No Response</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.parentsInformed && <p className="text-destructive text-xs mt-1">{errors.parentsInformed.message}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="action-comments">Action Taken / Next Steps</Label>
                  <Textarea id="action-comments" {...register("actionComments")} placeholder="Describe actions taken..." rows={2} />
                  {errors.actionComments && <p className="text-destructive text-xs mt-1">{errors.actionComments.message}</p>}
                </div>
              </form>
            </div>
            <DialogFooter className="pt-3 print:hidden flex-wrap justify-center sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Print Form
              </Button>
              <Button type="button" variant="outline" onClick={handleEmailForm}>
                  <Mail className="mr-2 h-4 w-4" /> Email Form
              </Button>
               <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={isFormSubmitting}>
                  <Save className="mr-2 h-4 w-4" /> Save Draft
              </Button>
              <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" form="disciplinary-form" disabled={isFormSubmitting}>
                {isFormSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingRecordId ? 'Update Record' : 'Save Record'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="printable-area">
          {!isLoading && !fetchError && records.length > 0 && (
              <Card id="preview-section" className="p-4 mt-8">
              <CardHeader>
                  <CardTitle className="text-2xl font-headline">All Disciplinary Records ({records.length})</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="overflow-x-auto">
                      <Table>
                      <TableHeader>
                          <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>Issues</TableHead>
                          <TableHead className="print:hidden">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {records.map(record => (
                          <TableRow key={record.id}>
                              <TableCell>{record.incidentDate}</TableCell>
                              <TableCell>{record.studentName}</TableCell>
                              <TableCell>{record.studentId}</TableCell>
                              <TableCell>{record.studentYear}</TableCell>
                              <TableCell>
                                {record.issues.join(', ')}
                                {record.issues.includes('Drug') && record.drugType && ` (${record.drugType})`}
                                {record.issues.includes('Other') && record.otherIssue && ` (${record.otherIssue})`}
                              </TableCell>
                              <TableCell className="space-x-1 print:hidden">
                              <Button variant="ghost" size="icon" onClick={() => record.id && openEditModal(record.id)} title="Edit Record">
                                  <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => record.id && handleDeleteRecord(record.id)} title="Delete Record">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                              </TableCell>
                          </TableRow>
                          ))}
                      </TableBody>
                      </Table>
                  </div>
                  <Button onClick={handlePrint} className="w-full sm:w-auto mt-6 print:hidden">
                      <Printer className="mr-2 h-5 w-5" /> Print Records
                  </Button>
              </CardContent>
              </Card>
          )}
          {!isLoading && !fetchError && records.length === 0 && (
            <Card className="mt-6 bg-muted/30 print:hidden">
              <CardHeader><CardTitle className="text-base flex items-center">No Disciplinary Records</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-foreground">No disciplinary records found for this school. Add one to get started.</p></CardContent>
            </Card>
          )}
          { isLoading && <div className="space-y-2"><Skeleton className="h-40 w-full" /></div> }
          { fetchError && <Card className="bg-destructive/10 text-destructive p-4">{fetchError}</Card>}
          </div>
    </div>
  );
}
