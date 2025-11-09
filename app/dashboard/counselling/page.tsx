// src/app/dashboard/counselling/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeartHandshake, Printer, Edit3, Trash2, PlusCircle, Save, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CounsellingRecordFormInputSchema, counsellingTypes, type CounsellingRecord, type CounsellingRecordFormData } from "@/lib/schemas/counselling";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
import { ClusterYearSelect } from '@/components/shared/cluster-year-select';


// --- Firestore Actions ---
async function fetchCounsellingRecordsFromFirestore(schoolId: string): Promise<CounsellingRecord[]> {
    if (!db) throw new Error("Firestore is not configured.");
    const recordsCollectionRef = collection(db, 'counselling');
    
    const q = query(recordsCollectionRef, where("schoolId", "==", schoolId));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            sessionDate: data.sessionDate,
            studentDob: data.studentDob,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as CounsellingRecord;
    });
}

async function saveCounsellingRecordToFirestore(record: Omit<CounsellingRecord, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<CounsellingRecord> {
    if (!db) throw new Error("Firestore is not configured.");

    if (id) {
        const docRef = doc(db, 'counselling', id);
        const dataToUpdate = { ...record, updatedAt: serverTimestamp() };
        await updateDoc(docRef, dataToUpdate);
        return { ...record, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    } else {
        const collectionRef = collection(db, 'counselling');
        const dataToAdd = { ...record, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        const docRef = await addDoc(collectionRef, dataToAdd);
        return { ...record, id: docRef.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    }
}

async function deleteCounsellingRecordFromFirestore(id: string): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    const docRef = doc(db, 'counselling', id);
    await deleteDoc(docRef);
}


export default function CounsellingPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<CounsellingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayRecordId, setDisplayRecordId] = useState('');

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
      const fetchedRecords = await fetchCounsellingRecordsFromFirestore(schoolId);
      setRecords(fetchedRecords);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unknown error occurred.";
      setFetchError(msg);
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
  } = useForm<CounsellingRecordFormData>({
    resolver: zodResolver(CounsellingRecordFormInputSchema),
    defaultValues: {
      sessionDate: '',
      studentName: '',
      studentId: '',
      studentDob: '',
      studentYear: '',
      counsellingType: undefined,
      otherCounsellingType: '',
      sessionDetails: '',
      actionPlan: '',
      parentsContacted: undefined,
      counsellorName: '',
    },
  });

  const watchedCounsellingType = watch("counsellingType");
  const showOtherCounsellingType = watchedCounsellingType === 'Other';
  
  useEffect(() => {
    if (editingRecordId && isFormModalOpen) {
      const recordToEdit = records.find(r => r.id === editingRecordId);
      if (recordToEdit) {
        const { id, userId, createdAt, updatedAt, schoolId, ...formData } = recordToEdit;
        reset(formData); 
        if (id) setDisplayRecordId(id);
      }
    }
  }, [editingRecordId, isFormModalOpen, reset, records]);


  const handleFormSubmitHandler: SubmitHandler<CounsellingRecordFormData> = async (data) => {
    if (!isFirebaseConfigured) {
        toast({ variant: "destructive", title: "Action Disabled", description: "Cannot save record because Firebase is not configured." });
        return;
    }
    
    if (!schoolId || !userId) {
        toast({ variant: "destructive", title: "Save Failed", description: "School ID or User ID not found. Cannot save record." });
        return;
    }

    const recordToSave: Omit<CounsellingRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        schoolId: schoolId,
        userId: userId,
    };

    try {
        await saveCounsellingRecordToFirestore(recordToSave, editingRecordId ?? undefined);
        await loadRecords(); // Reload all records from Firestore
        
        toast({ title: editingRecordId ? "Record Updated" : "Record Saved", description: `Counselling record for ${data.studentName} has been processed.` });
        
        setIsFormModalOpen(false);
        reset();
    } catch (error) {
        console.error("Error saving record to Firestore:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save counselling record." });
    }
  };
  
  const openAddModal = () => {
    setEditingRecordId(null);
    const tempId = `NEW-${Date.now()}`;
    setDisplayRecordId(tempId);
    reset(); 
    setIsFormModalOpen(true);
  };

  const openEditModal = (recordId: string) => {
    setEditingRecordId(recordId);
    setIsFormModalOpen(true); 
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm("Are you sure you want to delete this counselling record?")) return;
    
    if (!isFirebaseConfigured) {
        toast({ variant: "destructive", title: "Action Disabled", description: "Cannot delete record because Firebase is not configured." });
        return;
    }

    try {
        await deleteCounsellingRecordFromFirestore(recordId);
        await loadRecords(); // Reload to reflect deletion
        toast({ title: "Record Deleted", description: "The counselling record has been deleted." });
    } catch (error) {
        console.error("Error deleting record from Firestore:", error);
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete record."});
    }
  };
  
  const handlePrint = () => {
    toast({ title: "Printing...", description: "Use your browser's print dialog to save as PDF or print." });
    window.print();
  };

  const handleSaveDraft = () => {
    const formData = getValues();
    console.log("Saving draft (simulated):", { id: displayRecordId, ...formData });
    toast({
      title: "Draft Saved",
      description: "Your counselling record draft has been saved (simulated).",
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
            title="Counselling Records"
            description="Manage confidential student counselling records."
        >
            <Button onClick={openAddModal}>
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Record
            </Button>
        </PageHeader>
        
        <Dialog open={isFormModalOpen} onOpenChange={(isOpen) => {
            setIsFormModalOpen(isOpen);
            if (!isOpen) { 
                setEditingRecordId(null);
                reset();
                setDisplayRecordId('');
            }
          }}>
            <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-headline">{editingRecordId ? 'Edit Counselling Record' : 'New Record Entry'}</DialogTitle>
              </DialogHeader>
              <div className="printable-area">
                <form id="counselling-form" onSubmit={handleSubmit(handleFormSubmitHandler)} className="space-y-3 font-body max-h-[70vh] overflow-y-auto p-1 pr-3">
                  <div>
                    <Label htmlFor="record-id">Record ID</Label>
                    <Input id="record-id" value={displayRecordId} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="session-date">Date of Session</Label>
                      <Input type="date" id="session-date" {...register("sessionDate")} />
                      {errors.sessionDate && <p className="text-destructive text-xs mt-1">{errors.sessionDate.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="counsellor-name">Counsellor Name</Label>
                      <Input type="text" id="counsellor-name" {...register("counsellorName")} placeholder="Full Name" />
                      {errors.counsellorName && <p className="text-destructive text-xs mt-1">{errors.counsellorName.message}</p>}
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
                            <ClusterYearSelect
                              id="student-year-select"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          )}
                      />
                      {errors.studentYear && <p className="text-destructive text-xs mt-1">{errors.studentYear.message}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="counselling-type">Type of Counselling</Label>
                    <Controller
                        name="counsellingType"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="counselling-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    {counsellingTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.counsellingType && <p className="text-destructive text-xs mt-1">{errors.counsellingType.message}</p>}
                  </div>

                  {showOtherCounsellingType && (
                    <div>
                      <Label htmlFor="other-counselling-type">Other Counselling Type</Label>
                      <Input type="text" id="other-counselling-type" {...register("otherCounsellingType")} placeholder="Describe other type" />
                      {errors.otherCounsellingType && <p className="text-destructive text-xs mt-1">{errors.otherCounsellingType.message}</p>}
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="session-details">Session Details</Label>
                    <Textarea id="session-details" {...register("sessionDetails")} placeholder="Detailed description of the session..." rows={3} />
                    {errors.sessionDetails && <p className="text-destructive text-xs mt-1">{errors.sessionDetails.message}</p>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="parents-contacted">Parents Contacted</Label>
                      <Controller
                          name="parentsContacted"
                          control={control}
                          render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger id="parents-contacted"><SelectValue placeholder="Select status" /></SelectTrigger>
                                  <SelectContent>
                                  <SelectItem value="Yes">Yes</SelectItem>
                                  <SelectItem value="No">No</SelectItem>
                                  <SelectItem value="Attempted">Attempted, No Response</SelectItem>
                                  <SelectItem value="Not Required">Not Required</SelectItem>
                                  </SelectContent>
                              </Select>
                          )}
                      />
                      {errors.parentsContacted && <p className="text-destructive text-xs mt-1">{errors.parentsContacted.message}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="action-plan">Action Plan / Follow-up</Label>
                    <Textarea id="action-plan" {...register("actionPlan")} placeholder="Describe action plan and next steps..." rows={3} />
                    {errors.actionPlan && <p className="text-destructive text-xs mt-1">{errors.actionPlan.message}</p>}
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
                <Button type="submit" form="counselling-form" disabled={isFormSubmitting}>
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
                    <CardTitle className="text-2xl font-headline">{`All Counselling Records (${records.length})`}</CardTitle>
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
                            <TableHead>Type</TableHead>
                            <TableHead className="print:hidden">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map(record => (
                            <TableRow key={record.id}>
                                <TableCell>{record.sessionDate}</TableCell>
                                <TableCell>{record.studentName}</TableCell>
                                <TableCell>{record.studentId}</TableCell>
                                <TableCell>{record.studentYear}</TableCell>
                                <TableCell>{record.counsellingType === 'Other' ? record.otherCounsellingType : record.counsellingType}</TableCell>
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
                 <CardHeader>
                    <CardTitle className="text-base flex items-center">
                       No Counselling Records
                    </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <p className="text-sm text-foreground">No counselling records found for this school. Add a new record to get started.</p>
                 </CardContent>
              </Card>
           )}
           {fetchError && (
              <Card className="mt-6 bg-destructive/10 text-destructive p-4">
                  {fetchError}
              </Card>
           )}
           {isLoading && <div className="space-y-2"><Skeleton className="h-40 w-full" /></div> }
          </div>
      </div>
  );
}
