
// src/app/dashboard/operations/email-settings/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Mail, CheckCircle, XCircle, Trash2, Save, AlertTriangle, KeyRound, Server, TestTube2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, getDocs, doc, setDoc, Timestamp, orderBy, query, limit, deleteDoc, getDoc } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/schemas/user';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface SentEmailRecord {
    id: string;
    sentAt: string;
    recipient: string;
    subject: string;
    status: 'Success' | 'Failed';
    error?: string;
}

interface School {
    id: string;
    name: string;
}

interface EmailSettings {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
}

const COMMON_PROVIDERS: { [key: string]: Omit<EmailSettings, 'user' | 'pass'> } = {
    'gmail.com': { host: 'smtp.gmail.com', port: 465, secure: true },
    'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
    'outlook.com': { host: 'smtp-mail.outlook.com', port: 587, secure: false }, // STARTTLS
    'hotmail.com': { host: 'smtp-mail.outlook.com', port: 587, secure: false }, // STARTTLS
};

async function fetchSchools(): Promise<School[]> {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, 'schools'));
    return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
}

async function fetchEmailHistory(schoolId: string): Promise<SentEmailRecord[]> {
    if (!db) return [];
    const q = query(collection(db, `schools/${schoolId}/emailHistory`), orderBy('sentAt', 'desc'), limit(10));
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

async function fetchSchoolEmailSettings(schoolId: string): Promise<EmailSettings | null> {
    if (!db) throw new Error("Firestore not configured");
    const docRef = doc(db, 'schoolSettings', schoolId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            host: data.host || '',
            port: data.port || 587,
            secure: data.secure === true, // Default to false if not set
            user: data.user || '',
            pass: data.pass || '',
        };
    }
    return null;
}

export default function SchoolEmailSettingsPage() {
    const { toast } = useToast();
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<string>('');
    const [settings, setSettings] = useState<Partial<EmailSettings>>({ secure: false });
    const [emailHistory, setEmailHistory] = useState<SentEmailRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [userRole, setUserRole] = useState<Role | null>(null);

    const loadPageData = useCallback(async (schoolIdToLoad: string) => {
        if (!isFirebaseConfigured || !schoolIdToLoad) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedSchools, fetchedEmails, schoolSettings] = await Promise.all([
                fetchSchools(), 
                fetchEmailHistory(schoolIdToLoad),
                fetchSchoolEmailSettings(schoolIdToLoad)
            ]);

            setSchools(fetchedSchools);
            setEmailHistory(fetchedEmails);
            setSettings(schoolSettings || { host: '', port: 587, secure: false, user: '', pass: '' });
            
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load page data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const role = localStorage.getItem('userRole') as Role | null;
        const sId = localStorage.getItem('schoolId');
        setUserRole(role);
        
        if (role === 'system-admin') {
           fetchSchools().then(fetchedSchools => {
                setSchools(fetchedSchools);
                if (fetchedSchools.length > 0) {
                    setSelectedSchool(fetchedSchools[0].id);
                }
           });
        } else {
            setSelectedSchool(sId || '');
        }
    }, []);

    useEffect(() => {
        if (selectedSchool) {
            loadPageData(selectedSchool);
        } else if (userRole && userRole !== 'system-admin') {
            setIsLoading(false); // If not a sys-admin and no schoolId, stop loading
        }
    }, [selectedSchool, loadPageData, userRole]);


    const handleSaveSettings = async () => {
        if (!selectedSchool || !settings.host || !settings.port || !settings.user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields.' });
            return;
        }
        setIsSaving(true);
        try {
            if (!db) throw new Error("Firestore not configured");
            await setDoc(doc(db, 'schoolSettings', selectedSchool), settings, { merge: true });
            toast({ title: 'Settings Saved', description: 'Email settings have been updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save settings.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSendTestEmail = async () => {
        if (!settings.user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a recipient email.' });
            return;
        }
        setIsTesting(true);
        toast({ title: 'Sending Test Email...', description: `Sending a test email to ${settings.user}`});
        try {
             const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    to: settings.user, 
                    subject: 'Platform Test Email', 
                    body: 'This is a test email to confirm your SMTP settings are correct.',
                    schoolId: selectedSchool 
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            toast({ title: 'Success', description: 'Test email sent successfully!'});
            if(selectedSchool) loadPageData(selectedSchool);
        } catch(error) {
            toast({ variant: 'destructive', title: 'Failed to Send', description: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        const domain = email.split('@')[1];
        
        setSettings(prev => ({ ...prev, user: email }));

        if (domain && COMMON_PROVIDERS[domain]) {
            const providerSettings = COMMON_PROVIDERS[domain];
            setSettings(prev => ({
                ...prev,
                host: providerSettings.host,
                port: providerSettings.port,
                secure: providerSettings.secure,
            }));
            toast({ title: "Auto-detection", description: `Settings for ${domain} have been applied.` });
        }
    };

    return (
        <TooltipProvider>
        <div className="p-8 space-y-8">
            <PageHeader title="School Email Configuration" description="Manage your school's SMTP settings and monitor recent email history." />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>School SMTP Settings</CardTitle>
                             <CardDescription>
                                Configure your school's outgoing email server. This allows the platform to send emails (like invites and reports) on behalf of your school.
                             </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {userRole === 'system-admin' && (
                                <div className="space-y-2">
                                    <Label htmlFor="school-select">Select School to Configure</Label>
                                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                                        <SelectTrigger id="school-select"><SelectValue placeholder="Select a school..."/></SelectTrigger>
                                        <SelectContent>
                                            {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                             <div className="space-y-2">
                                <Label htmlFor="smtp-user"><Mail className="inline-block mr-2 h-4 w-4"/>Username / Email</Label>
                                <Input id="smtp-user" value={settings.user || ''} onChange={handleEmailChange} placeholder="your-email@school.com" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="smtp-host"><Server className="inline-block mr-2 h-4 w-4"/>SMTP Host</Label>
                                    <Input id="smtp-host" value={settings.host || ''} onChange={e => setSettings({...settings, host: e.target.value})} placeholder="e.g., smtp.gmail.com" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="smtp-port">Port</Label>
                                        <Input id="smtp-port" type="number" value={settings.port || ''} onChange={e => setSettings({...settings, port: parseInt(e.target.value, 10)})} placeholder="e.g., 587" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="smtp-secure">Security</Label>
                                         <Select value={settings.secure ? 'SSL/TLS' : 'STARTTLS'} onValueChange={(value) => setSettings({ ...settings, secure: value === 'SSL/TLS' })}>
                                            <SelectTrigger id="smtp-secure"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                                                <SelectItem value="SSL/TLS">SSL/TLS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                             <div className="space-y-2">
                                    <Label htmlFor="smtp-pass" className="flex items-center">
                                        <KeyRound className="inline-block mr-2 h-4 w-4"/>App Password
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground"/>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">For services like Gmail or Outlook, you must generate an "App Password" from your account's security settings instead of using your main password.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </Label>
                                    <Input id="smtp-pass" type="password" value={settings.pass || ''} onChange={e => setSettings({...settings, pass: e.target.value})} placeholder="Use an app-specific password" />
                                </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button onClick={handleSendTestEmail} variant="outline" disabled={isTesting || !selectedSchool}>
                                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <TestTube2 className="mr-2 h-4 w-4"/>}
                                Send Test Email
                            </Button>
                             <Button onClick={handleSaveSettings} disabled={isSaving || !selectedSchool}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                Save Settings
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Email Sending History</CardTitle>
                        <CardDescription>Recent outbound emails sent by the system for this school.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="overflow-x-auto rounded-md border max-h-96">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-20 w-full"/></TableCell></TableRow> : emailHistory.length > 0 ? emailHistory.map(email => (
                                        <TableRow key={email.id}>
                                            <TableCell className="text-xs">{email.sentAt}</TableCell>
                                            <TableCell>{email.recipient}</TableCell>
                                            <TableCell>
                                                <Badge variant={email.status === 'Success' ? 'default' : 'destructive'} className={cn(email.status === 'Success' && 'bg-green-600')}>
                                                    {email.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No email history found for this school.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </TooltipProvider>
    );
}
    