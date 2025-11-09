
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Save, Settings, AlertCircle, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ModulePermissionsSchema, type ModulePermissions } from '@/lib/schemas/school';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

const EditSchoolSchema = z.object({
  name: z.string().min(3, 'School Name is required.'),
  address: z.string().min(5, 'Address is required.'),
  type: z.string().min(3, 'School type is required (e.g., Primary, Secondary).'),
  enabledModules: ModulePermissionsSchema.optional(),
});

type EditSchoolFormData = z.infer<typeof EditSchoolSchema>;

async function fetchSchoolFromBackend(id: string): Promise<EditSchoolFormData | null> {
    if (!db || !isFirebaseConfigured) throw new Error("Firebase is not configured.");
    const schoolRef = doc(db, 'schools', id);
    const docSnap = await getDoc(schoolRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure enabledModules is populated with defaults if it's missing
        const validatedData = {
            name: data.name || '',
            address: data.address || '',
            type: data.type || '',
            enabledModules: {
                ...ModulePermissionsSchema.parse({}), // default values
                ...(data.enabledModules || {}),
            },
        };
        return validatedData as EditSchoolFormData;
    }
    return null;
}

async function updateSchoolInBackend(id: string, data: EditSchoolFormData): Promise<{ success: boolean }> {
    if (!db || !isFirebaseConfigured) throw new Error("Firebase is not configured.");
    const schoolRef = doc(db, 'schools', id);
    await updateDoc(schoolRef, data);
    return { success: true };
}


const moduleLabels: { [key in keyof ModulePermissions]: string } = {
    teacherDashboard: 'Teacher Dashboard',
    headTeacherDashboard: 'Head Teacher Dashboard',
    primaryAdminDashboard: 'Primary Admin Dashboard',
    academics: 'Academics Menu',
    lessonPlanner: 'Lesson Planner & AI Workbook',
    examResults: 'Exam Results & Summary',
    studentServices: 'Student Services (Counselling & Disciplinary)',
    operations: 'Operations Menu',
};

export default function EditSchoolPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const schoolId = (params?.id || '') as string;
    const [isLoading, setIsLoading] = useState(true);

    const { 
        register, 
        handleSubmit, 
        reset,
        control,
        formState: { errors, isSubmitting, isDirty } 
    } = useForm<EditSchoolFormData>({
        resolver: zodResolver(EditSchoolSchema),
        defaultValues: {
            name: '',
            address: '',
            type: '',
            enabledModules: ModulePermissionsSchema.parse({}), // Initialize with default values
        }
    });

    useEffect(() => {
        const loadSchoolData = async () => {
            if (!schoolId) return;
            setIsLoading(true);
            try {
                const schoolData = await fetchSchoolFromBackend(schoolId);
                if (schoolData) {
                    reset(schoolData);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'School not found.'});
                    router.push('/dashboard/platform-management/school-management');
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : "Failed to load school data.";
                toast({ variant: 'destructive', title: 'Error', description: msg });
            } finally {
                setIsLoading(false);
            }
        };

        loadSchoolData();
    }, [schoolId, reset, router, toast]);

    const onSubmit: SubmitHandler<EditSchoolFormData> = async (data) => {
        try {
            await updateSchoolInBackend(schoolId, data);
            toast({
                title: "School Updated",
                description: `School "${data.name}" has been successfully updated.`,
            });
            router.push('/dashboard/platform-management/school-management');
        } catch (error) {
            const msg = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: msg,
            });
        }
    };

    if (!schoolId) {
        return <p>Loading...</p>;
    }

    if (isLoading) {
        return (
             <div className="p-8 space-y-8">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            <PageHeader 
                title="Edit School"
                description={`Modify the details for school ID: ${schoolId}`}
            >
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </PageHeader>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>School Details</CardTitle>
                        <CardDescription>The School ID cannot be changed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="id">School ID</Label>
                            <Input id="id" value={schoolId} readOnly disabled />
                        </div>
                         <div>
                            <Label htmlFor="name">School Name</Label>
                            <Input id="name" {...register('name')} placeholder="e.g., Vuda District School" />
                            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                        </div>
                         <div>
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" {...register('address')} placeholder="e.g., 123 Main Street, Lautoka" />
                            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
                        </div>
                         <div>
                            <Label htmlFor="type">School Type</Label>
                            <Input id="type" {...register('type')} placeholder="e.g., Primary School" />
                            {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
                        </div>
                        <Separator className="my-6" />
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><LayoutDashboard className="h-5 w-5"/> Dashboard Access Control</h3>
                            <div className="space-y-4 mt-4">
                                {Object.keys(moduleLabels).filter(key => key.includes('Dashboard')).map((key) => {
                                    const moduleKey = key as keyof ModulePermissions;
                                    return (
                                        <div key={moduleKey} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                            <Label htmlFor={`module-${moduleKey}`} className="flex-grow">{moduleLabels[moduleKey]}</Label>
                                            <Controller
                                                name={`enabledModules.${moduleKey}`}
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id={`module-${moduleKey}`}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <Separator className="my-6" />
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Settings className="h-5 w-5"/> Module Access Control</h3>
                            <div className="space-y-4 mt-4">
                                {Object.keys(moduleLabels).filter(key => !key.includes('Dashboard')).map((key) => {
                                    const moduleKey = key as keyof ModulePermissions;
                                    return (
                                        <div key={moduleKey} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                            <Label htmlFor={`module-${moduleKey}`} className="flex-grow">{moduleLabels[moduleKey]}</Label>
                                            <Controller
                                                name={`enabledModules.${moduleKey}`}
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id={`module-${moduleKey}`}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" type="button" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to List
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
