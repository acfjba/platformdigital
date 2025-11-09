// src/app/dashboard/staff-records/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Trash2, Edit, AlertCircle, AlertTriangle, Mail, Loader2, Building, Download, FileUp } from "lucide-react";
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import {
  StaffMemberSchema,
  type StaffMember,
  StaffMemberFormDataSchema,
  type StaffMemberFormData,
} from "@/lib/schemas/staff";
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { userRoles, type Role } from '@/lib/schemas/user';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// --- Firestore Actions ---

async function getStaffListFromFirestore(schoolId?: string): Promise<StaffMember[]> {
    if (!db) throw new Error("Firestore is not configured.");

    const staffCollectionRef = collection(db, 'staff');
    const q = schoolId ? query(staffCollectionRef, where("schoolId", "==", schoolId)) : query(staffCollectionRef);
    
    const staffSnapshot = await getDocs(q);
    const staffList = staffSnapshot.docs.map(doc => {
        const data = doc.data();
        const staffMember = {
            id: doc.id,
            staffId: data.staffId,
            tpfNumber: data.tpfNumber,
            name: data.name,
            role: data.role,
            yearLevel: data.yearLevel,
            position: data.position,
            department: data.department,
            status: data.status,
            email: data.email,
            phone: data.phone,
            schoolId: data.schoolId,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
        };
        return staffMember as StaffMember;
    });
    return staffList;
}

async function addStaffToFirestore(
  staffData: StaffMemberFormData,
): Promise<string> {
    if (!db) throw new Error("Firestore is not configured.");
    const staffCollectionRef = collection(db, 'staff');
    const fullStaffData = {
        ...staffData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(staffCollectionRef, fullStaffData);
    return docRef.id;
}

async function updateStaffInFirestore(
  id: string,
  staffData: StaffMemberFormData,
): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    const staffDocRef = doc(db, 'staff', id);
    const dataToUpdate: any = { ...staffData, updatedAt: serverTimestamp() };
    await updateDoc(staffDocRef, dataToUpdate);
}

async function deleteStaffFromFirestore(staffId: string): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    await deleteDoc(doc(db, 'staff', staffId));
}

const yearLevelOptions = ['Kindergarten', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'N/A'];

// --- Reusable Staff Form ---
interface StaffFormProps {
    form: ReturnType<typeof useForm<StaffMemberFormData>>;
    onSubmit: SubmitHandler<StaffMemberFormData>;
    isLoading: boolean;
    isEditing: boolean;
    submitButtonText: string;
    currentUserRole: Role | null;
    schools: { id: string; name: string; }[];
}

const StaffForm: React.FC<StaffFormProps> = ({ form, onSubmit, isLoading, isEditing, submitButtonText, currentUserRole, schools }) => {
    const { register, handleSubmit, control, formState: { errors } } = form;
    
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="staffId">Staff ID</Label>
                <Input id="staffId" {...register("staffId")} disabled={isEditing} />
                {errors.staffId && <p className="text-destructive text-xs">{errors.staffId.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="tpfNumber">TPF Number</Label>
                <Input id="tpfNumber" {...register("tpfNumber")} />
                {errors.tpfNumber && <p className="text-destructive text-xs">{errors.tpfNumber.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...register("phone")} />
                {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                            <SelectContent>
                                {userRoles.map(role => <SelectItem key={role} value={role}>{role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.role && <p className="text-destructive text-xs">{errors.role.message}</p>}
            </div>
            {currentUserRole === 'system-admin' && (
                <div className="space-y-2">
                    <Label htmlFor="schoolId">School</Label>
                    <Controller
                        name="schoolId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select a school" /></SelectTrigger>
                                <SelectContent>
                                    {schools.map(school => <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.schoolId && <p className="text-destructive text-xs">{errors.schoolId.message}</p>}
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="position">Position / Title</Label>
                <Input id="position" {...register("position")} />
                {errors.position && <p className="text-destructive text-xs">{errors.position.message}</p>}
            </div>
            <div className="space-y-2">
                 <Label htmlFor="yearLevel">Year Level</Label>
                <Controller
                    name="yearLevel"
                    control={control}
                    render={({ field }) => (
                         <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Assign a year level" /></SelectTrigger>
                            <SelectContent>
                                {yearLevelOptions.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.yearLevel && <p className="text-destructive text-xs">{errors.yearLevel.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" {...register("department")} />
                {errors.department && <p className="text-destructive text-xs">{errors.department.message}</p>}
            </div>
            <div className="space-y-2">
                 <Label htmlFor="status">Status</Label>
                <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="On-Leave">On-Leave</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.status && <p className="text-destructive text-xs">{errors.status.message}</p>}
            </div>
            <DialogFooter className="col-span-2">
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                    {submitButtonText}
                </Button>
            </DialogFooter>
        </form>
    );
};

async function fetchSchools(): Promise<{ id: string; name: string }[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const snapshot = await getDocs(collection(db, "schools"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
  }));
}


export default function StaffRecordsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const canManage = useMemo(() => userRole === 'system-admin' || userRole === 'primary-admin' || userRole === 'head-teacher', [userRole]);
  const canView = useMemo(() => canManage || userRole === 'teacher' || userRole === 'assistant-head-teacher', [canManage, userRole]);


  const form = useForm<StaffMemberFormData>({ resolver: zodResolver(StaffMemberFormDataSchema) });

  useEffect(() => {
    const id = localStorage.getItem('schoolId');
    const role = localStorage.getItem('userRole') as Role;
    setSchoolId(id);
    setUserRole(role);
  }, []);

  const fetchStaffList = useCallback(async () => {
    if (!canView) {
        setIsLoading(false);
        return;
    }
    
    // This condition ensures we don't proceed if the role isn't system-admin and there's no schoolId
    if (userRole !== 'system-admin' && !schoolId) {
        setIsLoading(false);
        // Optionally show a message that school context is missing
        if (userRole) { // only show toast if role is known but schoolId is missing
             toast({ variant: "destructive", title: "Information Missing", description: "Your school ID is not set. Cannot load staff." });
        }
        return;
    }
    
    setIsLoading(true);
    try {
      if (isFirebaseConfigured) {
        const idToFetch = userRole === 'system-admin' ? undefined : (schoolId || undefined);
        const staffResult = await getStaffListFromFirestore(idToFetch);
        setStaffList(staffResult);
        
        if (userRole === 'system-admin') {
            const schoolsResult = await fetchSchools();
            setSchools(schoolsResult);
        }

      } else {
        toast({ variant: "destructive", title: "Offline Mode", description: "Firebase not configured. Cannot load data." });
        setStaffList([]);
      }
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error Fetching Staff", description: err instanceof Error ? err.message : "Could not load data." });
      setStaffList([]);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, toast, canView, userRole]);

  useEffect(() => {
    if (userRole !== null) { 
        fetchStaffList();
    }
  }, [fetchStaffList, userRole]);

  const filteredStaff = useMemo(() => staffList.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [staffList, searchTerm]);

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    const { id, createdAt, updatedAt, ...formValues } = staff;
    form.reset(formValues);
    setIsModalOpen(true);
  }

  const openAddModal = () => {
    setEditingStaff(null);
    form.reset({
        staffId: '',
        tpfNumber: '',
        name: '',
        role: undefined,
        position: '',
        yearLevel: 'N/A',
        department: '',
        status: 'Active',
        email: '',
        phone: '',
        schoolId: userRole !== 'system-admin' ? schoolId || '' : '',
    });
    setIsModalOpen(true);
  }

  const handleFormSubmit: SubmitHandler<StaffMemberFormData> = async data => {
    if (!isFirebaseConfigured) {
        toast({ variant: "destructive", title: "Offline", description: "Cannot save data." });
        return;
    }
    
    const schoolForRecord = userRole === 'system-admin' ? data.schoolId : schoolId;

    if (!schoolForRecord) {
        toast({ variant: "destructive", title: "Save Error", description: "School ID is required to save a staff member." });
        return;
    }
    
    try {
        const dataToSave = { ...data, schoolId: schoolForRecord };
        if (editingStaff) {
            await updateStaffInFirestore(editingStaff.id, dataToSave);
            toast({ title: "Staff Updated", description: `${data.name}'s record has been updated.` });
        } else {
            await addStaffToFirestore(dataToSave);
            toast({ title: "Staff Added", description: `${data.name} has been added.` });
        }
        await fetchStaffList();
        setIsModalOpen(false);
    } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Save Error", description: err instanceof Error ? err.message : "Could not save staff member." });
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!isFirebaseConfigured) {
      toast({ variant: "destructive", title: "Offline", description: "Cannot delete data." });
      return;
    }
    try {
      await deleteStaffFromFirestore(staff.id);
      await fetchStaffList();
      toast({ title: "Staff Deleted", description: "The staff member has been removed." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error Deleting", description: err instanceof Error ? err.message : "Could not delete staff member."});
    }
  };

   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!file) {
      toast({ variant: "destructive", title: "No file selected" });
      return;
    }
    toast({ title: "Simulating Import", description: `File "${file.name}" would be processed on the server.` });
  };
  
  const handleDownloadTemplate = () => {
    const sampleContent = "staffId,tpfNumber,name,role,position,department,status,email,phone,schoolId\nT-001,TPF-1111,Lureqe Leticia,teacher,Class Teacher - Year 1,Academics,Active,lureqeleticia@gmail.com,555-0101,2009";
    
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${sampleContent}`);
    const link = document.createElement('a');
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_staff_import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Sample Downloaded",
      description: "A sample CSV for staff import has been downloaded.",
    });
  };

  if (isLoading) {
      return (
          <div className="p-8 space-y-8">
              <PageHeader title="Staff Records" description="Manage all staff information for your school." />
              <Card>
                  <CardHeader>
                      <Skeleton className="h-10 w-1/4" />
                      <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                      <Skeleton className="h-40 w-full" />
                  </CardContent>
              </Card>
          </div>
      )
  }

  if (!canView) {
      return (
          <div className="p-8 space-y-8">
              <PageHeader title="Access Denied" description="You do not have permission to view this page." />
               <Card className="bg-destructive/10 border-destructive">
                <CardHeader className="flex flex-row items-center gap-4">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <CardTitle className="text-destructive">Permission Required</CardTitle>
                </CardHeader>
                <CardContent className="text-destructive/80">
                  You do not have the required role to view staff records.
                </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="p-8 space-y-8">
        <PageHeader 
            title="Staff Records" 
            description={userRole === 'system-admin' ? "Manage all staff across all schools." : "Manage all staff information for your school."}
        />
        {canManage && (
            <Alert>
                <FileUp className="h-4 w-4" />
                <AlertTitle>Bulk Staff Upload</AlertTitle>
                <AlertDescription>
                    To quickly add multiple staff members, navigate to the <Link href="/dashboard/operations/infodatafeed" className="font-bold underline">Info Data Feed</Link> page. Select "Staff Records", download the CSV template, fill it in, and upload it.
                </AlertDescription>
            </Alert>
        )}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update the details for this staff member." : "Fill in the details for the new staff member."}
            </DialogDescription>
          </DialogHeader>
           <StaffForm 
            form={form}
            onSubmit={handleFormSubmit}
            isLoading={form.formState.isSubmitting}
            isEditing={!!editingStaff}
            submitButtonText={editingStaff ? "Save Changes" : "Add Staff Member"}
            currentUserRole={userRole}
            schools={schools}
          />
        </DialogContent>
      </Dialog>


      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Staff Directory</CardTitle>
            <div className="flex w-full sm:w-auto sm:max-w-xs items-center gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter by details..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
                 {canManage && (
                    <Button onClick={openAddModal}><PlusCircle className="mr-2 h-4 w-4"/> Add Staff</Button>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>TPF Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Year Level</TableHead>
                      {userRole === 'system-admin' && <TableHead>School ID</TableHead>}
                      <TableHead>Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredStaff.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={canManage ? 9 : 8} className="text-center h-24">
                                <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                No staff members found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredStaff.map(staff => (
                        <TableRow key={staff.id}>
                            <TableCell className="font-medium">{staff.staffId}</TableCell>
                            <TableCell>{staff.tpfNumber || 'N/A'}</TableCell>
                            <TableCell>{staff.name}</TableCell>
                            <TableCell>{staff.yearLevel || 'N/A'}</TableCell>
                            {userRole === 'system-admin' && <TableCell>{staff.schoolId}</TableCell>}
                            <TableCell>{staff.position}</TableCell>
                            <TableCell>{staff.email}</TableCell>
                            <TableCell>{staff.status}</TableCell>
                            {canManage && (
                              <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => openEditModal(staff)}><Edit className="h-4 w-4"/></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" title="Delete Staff Member">
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete {staff.name}'s record. This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteStaff(staff)} className="bg-destructive hover:bg-destructive/90">Yes, Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                              </TableCell>
                            )}
                        </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
