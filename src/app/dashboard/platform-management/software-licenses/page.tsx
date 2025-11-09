
// src/app/dashboard/platform-management/software-licenses/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Loader2, KeyRound, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
    SoftwareLicenseFormDataSchema, 
    type SoftwareLicense, 
    type SoftwareLicenseFormData,
    licenseStatuses,
    userLimitTypes
} from '@/lib/schemas/software-license';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { addYears, format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from 'uuid';

interface School {
    id: string;
    name: string;
}

// --- Firestore Actions ---

async function fetchSchools(): Promise<School[]> {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, 'schools'));
    return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
}

async function fetchLicenses(): Promise<SoftwareLicense[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const q = query(collection(db, 'softwareLicenses'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      expiryDate: data.expiryDate,
      startDate: data.startDate,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as SoftwareLicense;
  });
}

async function setSchoolModuleStatus(schoolId: string, status: boolean): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    const schoolRef = doc(db, 'schools', schoolId);
    // This will disable all modules controlled by the license.
    // Note: Individual dashboard visibility is controlled separately if needed.
    await updateDoc(schoolRef, {
        "enabledModules.academics": status,
        "enabledModules.lessonPlanner": status,
        "enabledModules.examResults": status,
        "enabledModules.studentServices": status,
        "enabledModules.operations": status,
        // Add other licensed modules here
    });
}

async function saveLicense(data: SoftwareLicenseFormData, schoolName: string, id?: string): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  if (id) {
    await updateDoc(doc(db, 'softwareLicenses', id), { ...data, schoolName, updatedAt: serverTimestamp() });
  } else {
    const licenseKey = `DSP-${uuidv4().toUpperCase()}`;
    await addDoc(collection(db, 'softwareLicenses'), { 
        ...data, 
        schoolName,
        licenseKey,
        status: 'Active',
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
    });
    // When a new license is created, ensure modules are enabled.
    await setSchoolModuleStatus(data.schoolId, true);
  }
}

async function updateLicenseStatus(id: string, schoolId: string, status: 'Active' | 'Cancelled' | 'Expired'): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    await updateDoc(doc(db, 'softwareLicenses', id), { status, updatedAt: serverTimestamp() });
    
    const enableModules = status === 'Active';
    await setSchoolModuleStatus(schoolId, enableModules);
}

async function deleteLicense(id: string): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  await deleteDoc(doc(db, 'softwareLicenses', id));
}

export default function SoftwareLicensesPage() {
    const { toast } = useToast();
    const [licenses, setLicenses] = useState<SoftwareLicense[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLicense, setEditingLicense] = useState<SoftwareLicense | null>(null);

    const form = useForm<SoftwareLicenseFormData>({
        resolver: zodResolver(SoftwareLicenseFormDataSchema),
        defaultValues: {
            name: "Digital Schools' Platform",
        }
    });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        if (!isFirebaseConfigured) {
            setIsLoading(false);
            return;
        }
        try {
            const [licenseData, schoolData] = await Promise.all([fetchLicenses(), fetchSchools()]);
            setLicenses(licenseData);
            setSchools(schoolData);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const openModal = (license: SoftwareLicense | null = null) => {
        setEditingLicense(license);
        if (license) {
            form.reset(license);
        } else {
            form.reset({
                name: "Digital Schools' Platform",
                schoolId: '',
                startDate: format(new Date(), 'yyyy-MM-dd'),
                expiryDate: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
                userLimit: 'Multi-User (5)',
                cost: 0,
                autoRenew: false,
                notes: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const startDate = e.target.value;
        form.setValue('startDate', startDate);
        if (startDate) {
            const expiry = addYears(parseISO(startDate), 1);
            form.setValue('expiryDate', format(expiry, 'yyyy-MM-dd'));
        }
    };

    const onSubmit: SubmitHandler<SoftwareLicenseFormData> = async (data) => {
        const schoolName = schools.find(s => s.id === data.schoolId)?.name;
        if (!schoolName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selected school not found.' });
            return;
        }
        try {
            await saveLicense(data, schoolName, editingLicense?.id);
            toast({ title: 'Success', description: `License has been ${editingLicense ? 'updated' : 'generated'}.`});
            loadData();
            setIsModalOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save license.' });
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this license record?')) return;
        try {
            await deleteLicense(id);
            toast({ title: 'Success', description: 'License deleted.' });
            loadData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete license.' });
        }
    };
    
    const handleCancelLicense = async () => {
        if (!editingLicense) return;
        try {
            await updateLicenseStatus(editingLicense.id, editingLicense.schoolId, 'Cancelled');
            toast({ title: 'License Cancelled', description: 'The license has been marked as cancelled and modules disabled.' });
            loadData();
            setIsModalOpen(false);
        } catch(error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel license.' });
        }
    };

    const getStatusVariant = (status: SoftwareLicense['status']) => {
        switch (status) {
            case 'Active': return 'default';
            case 'Expired': return 'destructive';
            case 'Cancelled': return 'secondary';
            default: return 'outline';
        }
    };
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied to clipboard!' });
    };

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Software License Management"
                description="Generate, track, and manage all software licenses for schools."
            />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Licenses</CardTitle>
                        <CardDescription>A list of all generated software licenses.</CardDescription>
                    </div>
                    <Button onClick={() => openModal()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Generate New License
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>School</TableHead>
                                    <TableHead>License Key</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>User Limit</TableHead>
                                    <TableHead>Expiry Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8" /></TableCell></TableRow>)
                                ) : licenses.length > 0 ? (
                                    licenses.map((license) => (
                                        <TableRow key={license.id}>
                                            <TableCell className="font-medium">{license.schoolName}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 font-mono text-xs">
                                                    <span>{license.licenseKey}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(license.licenseKey)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant={getStatusVariant(license.status)}>{license.status}</Badge></TableCell>
                                            <TableCell>{license.userLimit}</TableCell>
                                            <TableCell>{new Date(license.expiryDate).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openModal(license)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(license.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">No licenses found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>{editingLicense ? 'Edit' : 'Generate New'} License</DialogTitle>
                        <DialogDescription>Fill in the details to generate a new license for a school.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="name">Software Name</Label>
                            <Input id="name" {...form.register('name')} readOnly disabled />
                        </div>

                         <div className="space-y-1">
                            <Label htmlFor="schoolId">School</Label>
                             <Controller name="schoolId" control={form.control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value} disabled={!!editingLicense}>
                                    <SelectTrigger><SelectValue placeholder="Select a school..."/></SelectTrigger>
                                    <SelectContent>
                                        {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )} />
                            {form.formState.errors.schoolId && <p className="text-destructive text-sm">{form.formState.errors.schoolId.message}</p>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input id="startDate" type="date" {...form.register('startDate')} onChange={handleStartDateChange} />
                                {form.formState.errors.startDate && <p className="text-destructive text-sm">{form.formState.errors.startDate.message}</p>}
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="expiryDate">Expiry Date</Label>
                                <Input id="expiryDate" type="date" {...form.register('expiryDate')} readOnly disabled />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <Label htmlFor="userLimit">User Limit</Label>
                                <Controller name="userLimit" control={form.control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {userLimitTypes.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}/>
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="cost">Cost ($)</Label>
                                <Input id="cost" type="number" step="0.01" {...form.register('cost', { valueAsNumber: true })} />
                                {form.formState.errors.cost && <p className="text-destructive text-sm">{form.formState.errors.cost.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" {...form.register('notes')} />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                             <Controller name="autoRenew" control={form.control} render={({ field }) => (
                                <Switch id="autoRenew" checked={field.value} onCheckedChange={field.onChange} />
                             )}/>
                             <Label htmlFor="autoRenew">Enable Auto-Renewal</Label>
                        </div>
                        
                        <DialogFooter className="flex-col sm:flex-row sm:justify-between pt-4">
                             <div>
                                {editingLicense && editingLicense.status === 'Active' && (
                                    <Button type="button" variant="destructive" onClick={handleCancelLicense} disabled={form.formState.isSubmitting}>
                                        Cancel This License
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingLicense ? 'Save Changes' : 'Generate License'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
