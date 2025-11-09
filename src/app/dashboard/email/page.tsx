// src/app/dashboard/email/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const EmailSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters.'),
  body: z.string().min(20, 'Message body must be at least 20 characters.'),
});

type EmailFormData = z.infer<typeof EmailSchema>;

export default function BulkEmailPage() {
    const { toast } = useToast();
    const { 
        register, 
        handleSubmit, 
        reset,
        formState: { errors, isSubmitting } 
    } = useForm<EmailFormData>({
        resolver: zodResolver(EmailSchema)
    });

    const onSubmit: SubmitHandler<EmailFormData> = async (data) => {
        // Simulate sending a bulk email
        toast({
            title: "Sending Email...",
            description: "Your message is being sent to all users.",
        });

        console.log("Simulating bulk email send with data:", data);
        await new Promise(resolve => setTimeout(resolve, 2000));

        toast({
            title: "Email Sent Successfully",
            description: "Your message has been queued for delivery to all users.",
        });
        reset();
    };

    return (
        <div className="p-8 space-y-8">
            <PageHeader 
                title="Bulk Email All Users"
                description="Compose and send an email to every registered user on the platform."
            />
            
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Use With Caution</AlertTitle>
                <AlertDescription>
                    This tool will send an email to every single user. Please double-check your message before sending. This action cannot be undone.
                </AlertDescription>
            </Alert>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>Email Composer</CardTitle>
                        <CardDescription>The message will be sent from the default system email address.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" {...register('subject')} placeholder="e.g., Important Platform Update" />
                            {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="body">Message Body</Label>
                            <Textarea 
                                id="body" 
                                {...register('body')} 
                                placeholder="Write your message here. Basic markdown is not supported, please use plain text." 
                                rows={12}
                            />
                             {errors.body && <p className="text-sm text-destructive mt-1">{errors.body.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Mail className="mr-2 h-4 w-4"/>}
                            {isSubmitting ? 'Sending...' : 'Send Email to All Users'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
