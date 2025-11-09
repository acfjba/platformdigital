// src/components/health-safety/health-safety-client.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Loader2, AlertCircle, AlertTriangle, Printer, Download, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { OhsRecordFormDataSchema, type OhsRecord, type OhsRecordFormData } from "@/lib/schemas/ohs";
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';

// --- Firestore Actions ---

async function fetchOhsRecords(schoolId: string): Promise<OhsRecord[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const recordsCollection = collection(db, 'ohsRecords');
  const q = query(recordsCollection, where("schoolId", "==", schoolId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      incidentDate: data.incidentDate,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as OhsRecord;
  });
}

async function saveOhsRecord(data: OhsRecordFormData, schoolId: string, id?: string): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  if (id) {
    const docRef = doc(db, 'ohsRecords', id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  } else {
    await addDoc(collection(db, 'ohsRecords'), { ...data, schoolId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

async function deleteOhsRecord(id: string): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  await deleteDoc(doc(db, 'ohsRecords', id));
}

export function HealthInspectionClient() {
  const { toast } = useToast();
  const [records, setRecords] = useState<OhsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OhsRecord | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const form = useForm<OhsRecordFormData>({
    resolver: zodResolver(OhsRecordFormDataSchema),
  });

  const loadData = useCallback(async () => {
    if (!isFirebaseConfigured) {
        setIsLoading(false);
        return;
    }
    if (!schoolId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const data = await fetchOhsRecords(schoolId);
      setRecords(data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch OHS records.' });
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    const id = localStorage.getItem('schoolId');
    if (id) {
        setSchoolId(id);
    } else {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if(schoolId) {
      loadData();
    }
  }, [loadData, schoolId]);
  
  const openModal = (record: OhsRecord | null = null) => {
    setEditingRecord(record);
    if (record) {
      form.reset(record);
    } else {
      form.reset({
        incidentType: 'Injury',
        location: '',
        incidentDate: new Date().toISOString().split('T')[0],
        description: '',
        actionTaken: '',
        reportedBy: '',
      });
    }
    setIsModalOpen(true);
  };
  
  const onSubmit: SubmitHandler<OhsRecordFormData> = async (data) => {
    if (!schoolId) {
        toast({ variant: 'destructive', title: 'Error', description: 'School ID not set.' });
        return;
    }
    try {
        await saveOhsRecord(data, schoolId, editingRecord?.id);
        toast({ title: 'Success', description: `Incident record has been ${editingRecord ? 'updated' : 'saved'}.`});
        loadData();
        setIsModalOpen(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save the record.' });
    }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this incident report?')) return;
      try {
          await deleteOhsRecord(id);
          toast({ title: 'Success', description: 'Record deleted.' });
          loadData();
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not delete record.' });
      }
  };

  const handlePrint = (singleRecord?: OhsRecordFormData) => {
    toast({ title: "Printing...", description: "Use your browser's print dialog to save as PDF or print." });
    // In a real app, you might have a dedicated printable view.
    // For now, this just uses the browser's print functionality on the whole page.
    // A more advanced implementation would format `singleRecord` into a printable component.
    window.print();
  };

  const handleExportCsv = (singleRecord?: OhsRecordFormData) => {
      const dataToExport = singleRecord ? [singleRecord] : records;
      if (dataToExport.length === 0) {
          toast({ variant: "destructive", title: "No Data", description: "There is no data to export." });
          return;
      }
      const headers = ["Incident Date", "Incident Type", "Location", "Description", "Action Taken", "Reported By"];
      const rows = dataToExport.map(record => [
        `"${record.incidentDate}"`,
        `"${record.incidentType}"`,
        `"${record.location.replace(/"/g, '""')}"`,
        `"${record.description.replace(/"/g, '""')}"`,
        `"${record.actionTaken.replace(/"/g, '""')}"`,
        `"${record.reportedBy.replace(/"/g, '""')}"`,
      ].join(','));
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `ohs_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Export Successful", description: "OHS report has been downloaded as a CSV file." });
  };
  
  const handleEmailForm = (record: OhsRecordFormData) => {
      toast({ title: 'Simulating Email...', description: `An email for the incident on ${record.incidentDate} would be sent.` });
      console.log("Emailing incident report:", record);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>OHS Incident Log</CardTitle>
                <CardDescription>A record of all reported health and safety incidents.</CardDescription>
            </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExportCsv()} variant="outline" disabled={isLoading || records.length === 0}><Download className="mr-2 h-4 w-4"/> Export All</Button>
            <Button onClick={() => handlePrint()} variant="outline" disabled={isLoading}><Printer className="mr-2 h-4 w-4"/> Print Report</Button>
            <Button onClick={() => openModal()}><PlusCircle className="mr-2 h-4 w-4"/> Log New Incident</Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isFirebaseConfigured && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Firebase Not Configured</AlertTitle>
              <AlertDescription>Cannot load or save data. Please configure your Firebase connection.</AlertDescription>
            </Alert>
          )}
          {!schoolId && isFirebaseConfigured && (
             <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>School ID Not Found</AlertTitle>
              <AlertDescription>Cannot load records because your school ID is not set. Please log in again.</AlertDescription>
            </Alert>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5}><Skeleton className="h-8"/></TableCell></TableRow>
                ) : records.length > 0 ? (
                    records.map((record) => (
                    <TableRow key={record.id}>
                        <TableCell>{new Date(record.incidentDate).toLocaleDateString()}</TableCell>
                        <TableCell>{record.incidentType}</TableCell>
                        <TableCell>{record.location}</TableCell>
                        <TableCell>{record.reportedBy}</TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openModal(record)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No incidents logged yet.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
           </div>
        </CardContent>
      </Card>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit' : 'Log New'} OHS Incident</DialogTitle>
                <DialogDescription>Fill in the details of the incident below.</DialogDescription>
            </DialogHeader>
            <div className="printable-area">
                <form id="ohs-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="incidentDate">Date of Incident</Label>
                            <Input id="incidentDate" type="date" {...form.register('incidentDate')} />
                            {form.formState.errors.incidentDate && <p className="text-destructive text-sm">{form.formState.errors.incidentDate.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="incidentType">Incident Type</Label>
                            <Controller name="incidentType" control={form.control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Injury">Injury</SelectItem>
                                        <SelectItem value="Near Miss">Near Miss</SelectItem>
                                        <SelectItem value="Hazard">Hazard</SelectItem>
                                        <SelectItem value="Property Damage">Property Damage</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}/>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="location">Location of Incident</Label>
                        <Input id="location" {...form.register('location')} placeholder="e.g., Year 2 Classroom, Playground" />
                        {form.formState.errors.location && <p className="text-destructive text-sm">{form.formState.errors.location.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...form.register('description')} placeholder="Provide a detailed account of what happened."/>
                        {form.formState.errors.description && <p className="text-destructive text-sm">{form.formState.errors.description.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="actionTaken">Action Taken</Label>
                        <Textarea id="actionTaken" {...form.register('actionTaken')} placeholder="Describe immediate actions taken (e.g., First aid administered, area cordoned off)." />
                        {form.formState.errors.actionTaken && <p className="text-destructive text-sm">{form.formState.errors.actionTaken.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="reportedBy">Reported By</Label>
                        <Input id="reportedBy" {...form.register('reportedBy')} placeholder="Name of person reporting the incident" />
                        {form.formState.errors.reportedBy && <p className="text-destructive text-sm">{form.formState.errors.reportedBy.message}</p>}
                    </div>
                </form>
            </div>
            <DialogFooter className="flex-wrap justify-between pt-4">
                 <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => handlePrint(form.getValues())}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                    <Button type="button" variant="outline" onClick={() => handleExportCsv(form.getValues())}><Download className="mr-2 h-4 w-4"/> Export</Button>
                    <Button type="button" variant="outline" onClick={() => handleEmailForm(form.getValues())}><Mail className="mr-2 h-4 w-4"/> Email</Button>
                </div>
                <div className="flex gap-2">
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" form="ohs-form" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        {editingRecord ? 'Save Changes' : 'Save Report'}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
