"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, PlusCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const CreateSchoolSchema = z.object({
  id: z.string().min(3, 'School ID must be at least 3 characters.'),
  name: z.string().min(3, 'School Name is required.'),
  address: z.string().min(5, 'Address is required.'),
  type: z.string().min(3, 'School type is required (e.g., Primary, Secondary).'),
});

type CreateSchoolFormData = z.infer<typeof CreateSchoolSchema>;

async function createSchoolInBackend(data: CreateSchoolFormData): Promise<{ success: boolean }> {
    if (!db) { // This check is redundant now but good for safety
        throw new Error("Firebase is not configured.");
    }
    const schoolRef = doc(db, 'schools', data.id);
    await setDoc(schoolRef, {
        // Only set the fields from the form, not the ID again in the object
        name: data.name,
        address: data.address,
        type: data.type,
    });
    return { success: true };
}


export default function CreateSchoolPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { 
        register, 
        handleSubmit, 
        formState: { errors, isSubmitting } 
    } = useForm<CreateSchoolFormData>({
        resolver: zodResolver(CreateSchoolSchema)
    });

    const onSubmit: SubmitHandler<CreateSchoolFormData> = async (data) => {
        if (!isFirebaseConfigured) {
            toast({
                variant: 'destructive',
                title: 'Creation Failed',
                description: 'Firebase is not configured. Please check your .env file.',
            });
            return;
        }

        try {
            await createSchoolInBackend(data);
            toast({
                title: "School Created",
                description: `School "${data.name}" with ID "${data.id}" has been successfully created.`,
            });
            router.push('/dashboard/platform-management/school-management');
        } catch (error) {
            const msg = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({
                variant: 'destructive',
                title: 'Creation Failed',
                description: msg,
            });
        }
    };

    return (
        <div className="p-8 space-y-8">
            <PageHeader 
                title="Create New School"
                description="Add a new school to the platform by providing its details below."
            >
                 <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </PageHeader>

            {!isFirebaseConfigured && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Firebase Not Configured</AlertTitle>
                    <AlertDescription>
                        The application cannot connect to Firebase. The form is in read-only mode and new schools cannot be created.
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>School Details</CardTitle>
                        <CardDescription>The School ID will be used to link users and data to this school. It cannot be changed later.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="id">School ID</Label>
                            <Input id="id" {...register('id')} placeholder="e.g., SCH-001 or 2009" />
                            {errors.id && <p className="text-sm text-destructive mt-1">{errors.id.message}</p>}
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
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" type="button" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to List
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !isFirebaseConfigured}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                            {isSubmitting ? 'Creating...' : 'Create School'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
