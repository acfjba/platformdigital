
// src/app/dashboard/school-info/about/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { School, Save, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface SchoolInfo {
    name: string;
    address: string;
    type: string;
    history: string;
}

const initialSchoolInfo: SchoolInfo = {
    name: 'Navolau District School',
    address: 'Navolau, Rakiraki',
    type: 'Primary School',
    history: 'Navolau District School is located in Navolau, Rakiraki.'
};

export default function AboutSchoolPage() {
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const { toast } = useToast();

    const canEdit = userRole === 'system-admin' || userRole === 'head-teacher' || userRole === 'primary-admin' || userRole === 'assistant-head-teacher' || userRole === 'librarian';

    const fetchSchoolInfo = useCallback(async (id: string) => {
        setIsLoading(true);
        if (!isFirebaseConfigured || !db) {
            setSchoolInfo(initialSchoolInfo);
            setIsLoading(false);
            if(isFirebaseConfigured){
                 toast({ variant: 'destructive', title: 'Error', description: 'Database not available.' });
            }
            return;
        }

        const docRef = doc(db, "schools", id);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSchoolInfo({
                    name: data.name || '',
                    address: data.address || '',
                    type: data.type || '',
                    history: data.history || 'No history provided.',
                });
            } else {
                setSchoolInfo(initialSchoolInfo);
            }
        } catch(e) {
            console.error("Failed to fetch school info:", e);
            setSchoolInfo(initialSchoolInfo);
        } finally {
            setIsLoading(false);
        }
    }, [toast]);


    useEffect(() => {
        const id = localStorage.getItem('schoolId');
        const role = localStorage.getItem('userRole');
        setSchoolId(id);
        setUserRole(role);
        if (id) {
            fetchSchoolInfo(id);
        } else {
            setSchoolInfo(initialSchoolInfo); // Show sample data if no ID
            setIsLoading(false);
        }
    }, [fetchSchoolInfo]);
    
    const handleInputChange = (field: keyof SchoolInfo, value: string) => {
        setSchoolInfo(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSaveChanges = async () => {
        if (!schoolId || !schoolInfo) {
            toast({ variant: 'destructive', title: 'Error', description: 'No school data to save.' });
            return;
        }
        if (!db) {
            toast({ variant: 'destructive', title: 'Error', description: 'Database connection not available.' });
            return;
        }
        setIsSaving(true);
        try {
            const docRef = doc(db, "schools", schoolId);
            const dataToUpdate = {
                name: schoolInfo.name,
                address: schoolInfo.address,
                type: schoolInfo.type,
                history: schoolInfo.history,
            };
            await updateDoc(docRef, dataToUpdate);
            toast({ title: 'Success', description: 'School information has been updated.' });
        } catch (error) {
            console.error("Error saving info:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save school information.' });
        } finally {
            setIsSaving(false);
        }
    };

    const mapSrc = schoolInfo ? `https://www.google.com/maps?q=${encodeURIComponent(schoolInfo.address)}&output=embed` : '';

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="About The School"
                description="View and edit general information about your school."
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <School/> 
                                {isLoading ? <Skeleton className="h-8 w-1/2" /> : schoolInfo?.name || 'School Information'}
                            </CardTitle>
                            {canEdit && (
                                <Button onClick={handleSaveChanges} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                    Save Changes
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : schoolInfo ? (
                            <div className="space-y-4">
                                {!canEdit && (
                                    <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Read-Only</AlertTitle>
                                        <AlertDescription>You do not have permission to edit this information.</AlertDescription>
                                    </Alert>
                                )}
                                <div>
                                    <Label htmlFor="schoolName">School Name</Label>
                                    <Input id="schoolName" value={schoolInfo.name} onChange={e => handleInputChange('name', e.target.value)} disabled={!canEdit} />
                                </div>
                                <div>
                                    <Label htmlFor="schoolAddress">Address</Label>
                                    <Input id="schoolAddress" value={schoolInfo.address} onChange={e => handleInputChange('address', e.target.value)} disabled={!canEdit} />
                                </div>
                                <div>
                                    <Label htmlFor="schoolType">School Type</Label>
                                    <Input id="schoolType" value={schoolInfo.type} onChange={e => handleInputChange('type', e.target.value)} disabled={!canEdit} />
                                </div>
                                <div>
                                    <Label htmlFor="schoolHistory">History & Mission</Label>
                                    <Textarea id="schoolHistory" value={schoolInfo.history} onChange={e => handleInputChange('history', e.target.value)} rows={5} disabled={!canEdit} />
                                </div>
                            </div>
                        ) : (
                            <p>No information available for this school.</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <MapPin /> School Location
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="w-full h-80" />
                        ) : schoolInfo && mapSrc ? (
                            <div className="aspect-video w-full border rounded-md overflow-hidden">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={mapSrc}>
                                </iframe>
                            </div>
                        ) : (
                            <p>Map could not be loaded.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
