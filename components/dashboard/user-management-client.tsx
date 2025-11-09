
// src/components/dashboard/user-management-client.tsx
"use client";

import React, { useState, type ChangeEvent, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, AlertTriangle, Loader2, FileUp, Mail, ExternalLink, ShieldCheck, CheckCircle, XCircle, Trash2, Edit, View } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userRoles, SingleUserFormSchema, type UserFormData, type User, type Role } from "@/lib/schemas/user";
import { StaffMemberFormDataSchema, type StaffMember, type StaffMemberFormData } from '@/lib/schemas/staff';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from '@/components/layout/page-header';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, getDocs, setDoc, doc, Timestamp, query, orderBy, limit, deleteDoc, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';


// --- Backend Functions ---

async function sendInviteEmail(userData: UserFormData, appUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: userData.email,
                subject: 'You have been invited to the School Digital Platform',
                body: `
Hello ${userData.name},

You have been invited to join the School Digital Platform with the following details:

Role: ${userData.role}
School ID: ${userData.schoolId || 'N/A'}
Temporary Password: ${userData.password}

Please log in at the following URL and change your password upon your first login:
${appUrl}

Thank you,
Platform Administrator
                `.trim(),
            }),
        });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Failed to send email");
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown email error" };
    }
}


async function addSingleUserToBackend(userData: UserFormData, appUrl: string): Promise<{ success: boolean; message: string }> {
    if (!db) throw new Error("Firestore not configured.");

    const inviteRef = doc(collection(db, 'invites'));
    await setDoc(inviteRef, {
        email: userData.email,
        role: userData.role,
        schoolId: userData.schoolId || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
    });
    
    const emailResult = await sendInviteEmail(userData, appUrl);
    if (!emailResult.success) {
        return { success: true, message: `Invite for ${userData.email} created, but failed to send email: ${emailResult.error}` };
    }

    return { success: true, message: `Invite sent to ${userData.email}.` };
}

async function addMultipleUsersToBackend(users: UserFormData[], appUrl: string): Promise<{ success: boolean; message: string; report: { success: UserFormData[]; failed: { data: string; reason: string }[] } }> {
    if (!db) throw new Error("Firestore not configured.");

    const successfulInvites: UserFormData[] = [];
    const failedEntries: { data: string; reason: string }[] = [];

    for (const user of users) {
        try {
            const inviteRef = doc(collection(db, 'invites'));
            await setDoc(inviteRef, {
                email: user.email,
                role: user.role,
                schoolId: user.schoolId || null,
                status: 'pending',
                createdAt: new Date().toISOString(),
            });
            
            const emailResult = await sendInviteEmail(user, appUrl);
            if(emailResult.success) {
                successfulInvites.push(user);
            } else {
                 failedEntries.push({ data: user.email, reason: `Invite created but email failed: ${emailResult.error}` });
            }

        } catch (error) {
            failedEntries.push({ data: user.email, reason: "Firestore write failed" });
        }
    }
    
    return { 
        success: true, 
        message: `Processed ${users.length} users.`,
        report: { success: successfulInvites, failed: failedEntries }
    };
}

async function fetchSchools(): Promise<{id: string, name: string}[]> {
    if (!db || !isFirebaseConfigured) return [];
    const schoolsSnapshot = await getDocs(collection(db, "schools"));
    return schoolsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
}

interface SentEmailRecord {
    id: string;
    sentAt: string;
    recipient: string;
    subject: string;
    status: 'Success' | 'Failed';
    error?: string;
}

async function fetchEmailHistory(): Promise<SentEmailRecord[]> {
    if (!db || !isFirebaseConfigured) return [];
    const q = query(collection(db, 'emailHistory'), orderBy('sentAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            recipient: data.recipient,
            subject: data.subject,
            status: data.status,
            error: data.error,
            sentAt: data.sentAt instanceof Timestamp ? data.sentAt.toDate().toLocaleString() : new Date().toLocaleString(),
        };
    });
}

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

async function updateUserInBackend(id: string, data: StaffMemberFormData): Promise<void> {
    if (!db) throw new Error("Firestore not configured.");
    const userRef = doc(db, 'staff', id);
    await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
}

async function deleteUserFromBackend(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not configured.");
    await deleteDoc(doc(db, 'staff', id));
}


// ---

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function UserManagementClient() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [file, setFile] = useState<File | null>(null);
    const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
    const [currentUserSchoolId, setCurrentUserSchoolId] = useState<string | null>(null);
    const [schools, setSchools] = useState<{id: string, name: string}[]>([]);
    const [testEmail, setTestEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [emailHistory, setEmailHistory] = useState<SentEmailRecord[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
    const [isLoading, setIsLoading] = useState(true);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const filteredSchoolId = searchParams ? searchParams.get('schoolId') : null;

    const singleUserForm = useForm<UserFormData>({
        resolver: zodResolver(SingleUserFormSchema),
        defaultValues: {
            name: '', email: '', phone: '', role: 'teacher', schoolId: 'none', password: '',
        }
    });

    const editStaffForm = useForm<StaffMemberFormData>({
        resolver: zodResolver(StaffMemberFormDataSchema)
    });

    const [multipleUsersData, setMultipleUsersData] = useState('');

    const loadInitialData = useCallback(async () => {
        const role = localStorage.getItem('userRole') as Role;
        const schoolId = localStorage.getItem('schoolId');

        if (!role) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const idToFetch = role === 'system-admin' ? undefined : schoolId!;
            const [fetchedSchools, fetchedEmails, fetchedStaff] = await Promise.all([
                fetchSchools(),
                fetchEmailHistory(),
                getStaffListFromFirestore(idToFetch),
            ]);
            setSchools(fetchedSchools);
            setEmailHistory(fetchedEmails);
            setAllStaff(fetchedStaff);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load initial page data from Firestore.'
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);


    useEffect(() => {
        const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') as Role : null;
        const schoolId = typeof window !== 'undefined' ? localStorage.getItem('schoolId') : null;
        setCurrentUserRole(role);
        setCurrentUserSchoolId(schoolId);

        if (role !== 'system-admin' && role !== 'primary-admin' && role !== 'head-teacher') {
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'You do not have permission to view this page.',
            });
            router.push('/dashboard/profile');
            setHasAccess(false);
        } else {
            setHasAccess(true);
            loadInitialData();
        }
    }, [router, toast, loadInitialData]);

    const displayedUsers = useMemo(() => {
        if (currentUserRole === 'system-admin') {
            if (filteredSchoolId) {
                return allStaff.filter(u => u.schoolId === filteredSchoolId);
            }
            // For sys-admin with no filter, show all users
            return allStaff;
        }
        // For non-sys-admin, always filter by their own schoolId
        return allStaff.filter(u => u.schoolId === currentUserSchoolId);
    }, [allStaff, currentUserRole, currentUserSchoolId, filteredSchoolId]);

    const availableRoles = React.useMemo(() => {
        // No one should be able to create a new system-admin from the UI.
        return userRoles.filter(r => r !== 'system-admin');
    }, []);

    const handleSingleUserSubmit: SubmitHandler<UserFormData> = async (data) => {
        const userSchoolId = currentUserRole === 'system-admin' ? data.schoolId : currentUserSchoolId;
        if (!userSchoolId || userSchoolId === 'none') {
            toast({ variant: "destructive", title: "Error", description: "A school must be selected." });
            return;
        }

        const appUrl = window.location.origin;
        const result = await addSingleUserToBackend({ ...data, schoolId: userSchoolId }, appUrl);
        if (result.success) {
            toast({ title: "Success", description: result.message });
            loadInitialData(); 
            singleUserForm.reset();
        } else {
            toast({ variant: "destructive", title: "Error", description: result.message });
        }
    };
    
    const handleMultipleUsersSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (file) {
            toast({ title: "File Upload Not Implemented", description: `This is a placeholder for server-side file processing.` });
            return;
        }

        const lines = multipleUsersData.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
            toast({ variant: "destructive", title: "Input Required", description: "Please provide user data." });
            return;
        }
        
        const usersToCreate: UserFormData[] = [];
        const failedEntries: { data: string; reason: string }[] = [];

        lines.forEach(line => {
            const [name, email, phone, role, schoolId, password] = line.split(',').map(s => s.trim());
            const finalSchoolId = currentUserRole === 'system-admin' ? schoolId : currentUserSchoolId;
            const finalRole = (availableRoles as readonly string[]).includes(role) ? role as Role : undefined;

            const validationResult = SingleUserFormSchema.safeParse({ name, email, phone, role: finalRole, schoolId: finalSchoolId, password });

            if (validationResult.success) { usersToCreate.push(validationResult.data); } 
            else { failedEntries.push({ data: line, reason: validationResult.error.errors.map(e => e.message).join(', ') }); }
        });
        
        if (usersToCreate.length === 0 && failedEntries.length > 0) {
            toast({ variant: "destructive", title: "Validation Failed", description: `No valid user entries found. Error: ${failedEntries[0].reason}` });
            return;
        }

        const appUrl = window.location.origin;
        const result = await addMultipleUsersToBackend(usersToCreate, appUrl);
        if (result.success) {
            loadInitialData();
            toast({ title: "Batch Processed", description: `Invited ${result.report.success.length} users. Failed: ${failedEntries.length + result.report.failed.length}.` });
            setMultipleUsersData('');
        } else {
            toast({ variant: "destructive", title: "Batch Error", description: result.message });
        }
    };

    const handleEditUserSubmit: SubmitHandler<StaffMemberFormData> = async (data) => {
        if (!editingStaff) return;
        try {
            await updateUserInBackend(editingStaff.id, data);
            toast({ title: 'Staff Member Updated', description: `${data.name}'s details have been saved.` });
            loadInitialData();
            setIsEditModalOpen(false);
        } catch (error) {
            toast({ variant: "destructive", title: "Update Error", description: "Could not update staff record." });
        }
    };
    
    const handleDeleteUser = async (user: StaffMember) => {
        try {
            await deleteUserFromBackend(user.id);
            toast({ title: 'User Deleted', description: `${user.name}'s record has been deleted.` });
            loadInitialData();
        } catch (error) {
            toast({ variant: "destructive", title: "Delete Error", description: "Could not delete user record." });
        }
    };
    
    const openEditModal = (staff: StaffMember) => {
        setEditingStaff(staff);
        const { id, createdAt, updatedAt, ...formValues } = staff;
        editStaffForm.reset(formValues);
        setIsEditModalOpen(true);
    }
    
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
            setMultipleUsersData("");
        }
    };
    
    const handleSendTestEmail = async () => {
        const subject = 'Test Email from Digital Platform';
        if (!testEmail || !/^\S+@\S+\.\S+$/.test(testEmail)) {
            toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please enter a valid email address.'});
            return;
        }
        setIsSendingTest(true);
        toast({ title: 'Sending Test Email...', description: `Sending to ${testEmail}.` });

        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: testEmail, subject: subject, body: 'This is a test to confirm the email connection is working.' }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'API request failed');
            toast({ title: 'Email Sent Successfully!', description: 'Email sent via configured SMTP service.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Connection Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
        } finally {
            await loadInitialData();
            setIsSendingTest(false);
        }
    };
    
    const handleGoogleConnect = () => {
        setConnectionStatus('connecting');
        toast({ title: 'Connecting to Google...', description: 'Please wait. This is a simulation.' });
        setTimeout(() => {
            const success = Math.random() > 0.3;
            setConnectionStatus(success ? 'connected' : 'error');
            toast({ title: success ? 'Connection Successful!' : 'Connection Failed', description: success ? 'Your Google account is connected.' : 'Could not connect. Please try again.', variant: success ? 'default' : 'destructive' });
        }, 2000);
    };

    const handleGoogleDisconnect = () => {
        setConnectionStatus('idle');
        toast({ title: 'Disconnected', description: 'Your Google account has been disconnected.' });
    };

    const handleDeleteEmail = async (emailId: string) => {
        try {
            const response = await fetch('/api/emails/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: emailId }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete log.');
            toast({ title: "Log Deleted", description: "Email history entry removed." });
            loadInitialData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error instanceof Error ? error.message : "Could not delete log." });
        }
    };


    if (hasAccess === null || isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
  
    if (!hasAccess) {
        return null; // Render nothing while redirecting
    }

    return (
        <>
            <PageHeader title="Invite & Manage Users" description="Add new users, manage existing user roles and details." />
            
            <Tabs defaultValue="manage" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="manage">Manage Staff</TabsTrigger>
                    <TabsTrigger value="invite">Invite Users</TabsTrigger>
                    <TabsTrigger value="email">Email Settings</TabsTrigger>
                </TabsList>
                
                {/* Manage Users Tab */}
                <TabsContent value="manage" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Staff Directory</CardTitle>
                            <CardDescription>View and manage all registered staff in the system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>TPF Number</TableHead>
                                            <TableHead>Role</TableHead>
                                            {currentUserRole === 'system-admin' && <TableHead>School ID</TableHead>}
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayedUsers.length > 0 ? displayedUsers.map(user => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">{user.name}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>{user.phone}</TableCell>
                                                <TableCell>{user.tpfNumber}</TableCell>
                                                <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                                {currentUserRole === 'system-admin' && <TableCell>{user.schoolId || 'N/A'}</TableCell>}
                                                <TableCell className="text-right space-x-1">
                                                     <Button variant="ghost" size="icon" title="View Details" onClick={() => toast({ title: 'Feature Pending', description: 'This will show a detailed user view.'})}><View className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" title="Edit User" onClick={() => openEditModal(user)}><Edit className="h-4 w-4"/></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="Delete User"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will delete {user.name}'s record from the staff list. It will NOT delete their authentication record. This action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteUser(user)} className="bg-destructive hover:bg-destructive/90">Yes, Delete Record</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={currentUserRole === 'system-admin' ? 7 : 6} className="text-center h-24">No users found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Invite Users Tab */}
                <TabsContent value="invite" className="mt-6">
                    <Card className="shadow-xl rounded-lg">
                        <CardContent className="pt-6">
                            <Tabs defaultValue="single" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="single">Invite Single User</TabsTrigger>
                                    <TabsTrigger value="multiple">Invite Multiple Users</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="single" className="mt-6">
                                    <form onSubmit={singleUserForm.handleSubmit(handleSingleUserSubmit)} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label htmlFor="name">Full Name</Label>
                                                <Input id="name" {...singleUserForm.register("name")} />
                                                {singleUserForm.formState.errors.name && <p className="text-destructive text-xs mt-1">{singleUserForm.formState.errors.name.message}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="email">Email Address</Label>
                                                <Input id="email" type="email" {...singleUserForm.register("email")} />
                                                {singleUserForm.formState.errors.email && <p className="text-destructive text-xs mt-1">{singleUserForm.formState.errors.email.message}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="phone">Phone Number (Optional)</Label>
                                                <Input id="phone" type="tel" {...singleUserForm.register("phone")} />
                                                {singleUserForm.formState.errors.phone && <p className="text-destructive text-xs mt-1">{singleUserForm.formState.errors.phone.message}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="role">Role</Label>
                                                <Controller name="role" control={singleUserForm.control} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                                                        <SelectContent>{availableRoles.map(role => <SelectItem key={role} value={role}>{role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                )} />
                                                {singleUserForm.formState.errors.role && <p className="text-destructive text-xs mt-1">{singleUserForm.formState.errors.role.message}</p>}
                                            </div>
                                            {currentUserRole === 'system-admin' && (
                                                <div>
                                                    <Label htmlFor="schoolId">School</Label>
                                                    <Controller name="schoolId" control={singleUserForm.control} render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="schoolId"><SelectValue placeholder="Select a school" /></SelectTrigger>
                                                            <SelectContent>
                                                              <SelectItem value="none">N/A (for System Admin)</SelectItem>
                                                              {schools.length > 0 ? (
                                                                schools.map(school => <SelectItem key={school.id} value={school.id}>{school.name} ({school.id})</SelectItem>)
                                                              ) : (
                                                                <div className="p-2 text-sm text-muted-foreground">No schools found.</div>
                                                              )}
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                                    {singleUserForm.formState.errors.schoolId && <p className="text-destructive text-xs mt-1">{singleUserForm.formState.errors.schoolId.message}</p>}
                                                </div>
                                            )}
                                            <div>
                                                <Label htmlFor="password">Temporary Password</Label>
                                                <Input id="password" type="password" {...singleUserForm.register("password")} placeholder="User will be prompted to change"/>
                                                {singleUserForm.formState.errors.password && <p className="text-destructive text-xs mt-1">{singleUserForm.formState.errors.password.message}</p>}
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full" disabled={singleUserForm.formState.isSubmitting}>
                                            {singleUserForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                                            {singleUserForm.formState.isSubmitting ? 'Sending Invite...' : 'Send Invite'}
                                        </Button>
                                    </form>
                                </TabsContent>
                                
                                <TabsContent value="multiple" className="mt-6">
                                     <form onSubmit={handleMultipleUsersSubmit} className="space-y-6">
                                        <Card className="bg-amber-50 border-amber-300">
                                            <CardHeader><CardTitle className="font-headline text-base text-amber-800 flex items-center"><AlertTriangle className="mr-2 h-5 w-5" />Method 1: Paste CSV Data</CardTitle></CardHeader>
                                            <CardContent>
                                                <p className="font-body text-sm text-amber-700">Enter one user per line: <code className="font-mono bg-amber-200/50 px-1 py-0.5 rounded">FullName,email@example.com,phone,role,schoolId,password</code></p>
                                                <p className="font-body text-xs text-amber-600 mt-2">Example: <code className="font-mono bg-amber-200/50 px-1 py-0.5 rounded">John Doe,j.d@school.com,555-1234,teacher,SCH-001,pass123</code></p>
                                                 {currentUserRole !== 'system-admin' && <p className="font-body text-sm text-amber-700 mt-2"><strong>Note:</strong> The `schoolId` column will be ignored. All users will be assigned to your school: <strong>{currentUserSchoolId}</strong>.</p>}
                                            </CardContent>
                                        </Card>
                                        <div>
                                            <Label htmlFor="usersData">Users Data (CSV Format)</Label>
                                            <Textarea id="usersData" value={multipleUsersData} onChange={(e) => setMultipleUsersData(e.target.value)} rows={8} placeholder="Jane Doe,jane.d@school.com,555-5678,teacher,SCH-001,newpass..." disabled={!!file} />
                                        </div>
                                        <div className="relative"><Separator /><span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-sm text-muted-foreground">OR</span></div>
                                        <Card className="bg-blue-50 border-blue-200">
                                            <CardHeader><CardTitle className="font-headline text-base text-blue-800 flex items-center"><FileUp className="mr-2 h-5 w-5" />Method 2: Upload a File</CardTitle></CardHeader>
                                            <CardContent>
                                                <Label htmlFor="file-upload">Upload Excel, Word, or PDF</Label>
                                                <Input id="file-upload" type="file" accept=".xlsx,.xls,.doc,.docx,.pdf" onChange={handleFileChange} disabled={!!multipleUsersData} />
                                                <p className="font-body text-xs text-blue-600 mt-2">The file would be processed on the server to create users.</p>
                                                {file && <p className="font-body text-sm mt-2 text-blue-800">Selected: {file.name}</p>}
                                            </CardContent>
                                        </Card>
                                        <Button type="submit" className="w-full" disabled={singleUserForm.formState.isSubmitting}>
                                            {singleUserForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-5 w-5" />}
                                            {singleUserForm.formState.isSubmitting ? 'Processing...' : 'Process & Invite Users'}
                                        </Button>
                                    </form>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>

                 {/* Email Settings Tab */}
                <TabsContent value="email" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Settings & Status</CardTitle>
                            <CardDescription>Configure and test your email sending service.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Card className="border-blue-200">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                         <img src="https://www.gstatic.com/images/branding/product/1x/google_g_standard_color_32dp.png" alt="Google logo" className="h-5 w-5" />
                                         Connect with Google (Simulation)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">Connect your Google account to enable seamless integration. This is a simulation and does not create a real connection.</p>
                                    {connectionStatus === 'idle' && <Button onClick={handleGoogleConnect}>Connect with Google</Button>}
                                    {connectionStatus === 'connecting' && <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</Button>}
                                    {connectionStatus === 'connected' && <div className="flex items-center gap-4"><Button variant="destructive" onClick={handleGoogleDisconnect}>Disconnect</Button><div className="flex items-center gap-2 text-green-600"><CheckCircle className="h-4 w-4"/><span>Connected</span></div></div>}
                                    {connectionStatus === 'error' && <div className="flex items-center gap-4"><Button onClick={handleGoogleConnect}>Try Again</Button><div className="flex items-center gap-2 text-destructive"><XCircle className="h-4 w-4"/><span>Connection Failed</span></div></div>}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle className="text-base">Test Email Connection</CardTitle></CardHeader>
                                <CardContent className="flex items-end gap-2">
                                    <div className="flex-grow">
                                        <Label htmlFor="test-email">Recipient Email</Label>
                                        <Input id="test-email" type="email" placeholder="test@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                                    </div>
                                    <Button onClick={handleSendTestEmail} disabled={isSendingTest}>
                                        {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                        Send Test
                                    </Button>
                                </CardContent>
                            </Card>

                             <Card>
                                <CardHeader><CardTitle className="text-base">Email Sending History (Last 10)</CardTitle></CardHeader>
                                <CardContent>
                                     <div className="overflow-x-auto rounded-md border">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Recipient</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {emailHistory.length > 0 ? emailHistory.map(email => (
                                                    <TableRow key={email.id}>
                                                        <TableCell>{email.sentAt}</TableCell>
                                                        <TableCell>{email.recipient}</TableCell>
                                                        <TableCell>{email.subject}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={email.status === 'Success' ? 'default' : 'destructive'} className={cn(email.status === 'Success' && 'bg-green-600')}>{email.status}</Badge>
                                                            {email.status === 'Failed' && email.error && <p className="text-xs text-destructive mt-1">{email.error}</p>}
                                                        </TableCell>
                                                         <TableCell className="text-right">
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" title="Delete Log"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                        <AlertDialogDescription>This will permanently delete this email log. This cannot be undone.</AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteEmail(email.id)} className="bg-destructive hover:bg-destructive/90">Yes, Delete Log</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </TableCell>
                                                    </TableRow>
                                                )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No email history found.</TableCell></TableRow>}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Staff Member: {editingStaff?.name}</DialogTitle>
                        <DialogDescription>Modify the user's details below. Password cannot be changed from this screen.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={editStaffForm.handleSubmit(handleEditUserSubmit)} className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-name">Full Name</Label>
                                <Input id="edit-name" {...editStaffForm.register("name")} />
                            </div>
                            <div>
                                <Label htmlFor="edit-email">Email</Label>
                                <Input id="edit-email" {...editStaffForm.register("email")} />
                            </div>
                             <div>
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input id="edit-phone" {...editStaffForm.register("phone")} />
                            </div>
                              <div>
                                <Label htmlFor="edit-tpfNumber">TPF Number</Label>
                                <Input id="edit-tpfNumber" {...editStaffForm.register("tpfNumber")} />
                            </div>
                             <div>
                                <Label htmlFor="edit-position">Position</Label>
                                <Input id="edit-position" {...editStaffForm.register("position")} />
                            </div>
                            <div>
                                <Label htmlFor="edit-role">Role</Label>
                                <Controller name="role" control={editStaffForm.control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="edit-role"><SelectValue/></SelectTrigger>
                                        <SelectContent>{availableRoles.map(role => <SelectItem key={role} value={role}>{role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                                    </Select>
                                )} />
                            </div>
                            {currentUserRole === 'system-admin' && (
                                <div>
                                    <Label htmlFor="edit-schoolId">School</Label>
                                    <Controller name="schoolId" control={editStaffForm.control} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="edit-schoolId"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">N/A (for System Admin)</SelectItem>
                                                {schools.map(school => <SelectItem key={school.id} value={school.id}>{school.name} ({school.id})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )} />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={editStaffForm.formState.isSubmitting}>
                                {editStaffForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
