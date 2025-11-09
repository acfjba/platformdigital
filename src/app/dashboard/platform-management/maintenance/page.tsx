// src/app/dashboard/platform-management/maintenance/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { MaintenanceSettings } from '@/lib/schemas/maintenance';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const SETTINGS_DOC_ID = 'maintenance';

// --- Firestore Functions ---
async function fetchMaintenanceSettings(): Promise<MaintenanceSettings> {
    if (!db) throw new Error("Firestore is not configured.");
    const docRef = doc(db, 'platformSettings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as MaintenanceSettings;
    }
    return { isEnabled: false, title: 'System Maintenance', message: 'The platform is currently undergoing scheduled maintenance. Please check back later.' };
}

async function saveMaintenanceSettings(settings: MaintenanceSettings): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    const docRef = doc(db, 'platformSettings', SETTINGS_DOC_ID);
    await setDoc(docRef, settings);
}

export default function MaintenancePage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        if (!isFirebaseConfigured) {
            setIsLoading(false);
            return;
        }
        try {
            const data = await fetchMaintenanceSettings();
            setSettings(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load maintenance settings.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await saveMaintenanceSettings(settings);
            toast({ title: 'Success', description: 'Maintenance settings have been updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-8">
                <PageHeader title="App Maintenance Mode" description="Control platform-wide maintenance notifications." />
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-24" />
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            <PageHeader title="App Maintenance Mode" description="Control platform-wide maintenance notifications." />

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Maintenance Controls</CardTitle>
                    <CardDescription>
                        When enabled, all users will see the maintenance notice instead of the login page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>This is a global setting!</AlertTitle>
                        <AlertDescription>
                            Enabling maintenance mode will make the application inaccessible to all users except system administrators.
                        </AlertDescription>
                    </Alert>

                    {settings && (
                        <>
                            <div className="flex items-center space-x-4 rounded-md border p-4">
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        Maintenance Mode
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {settings.isEnabled ? "Enabled" : "Disabled"}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.isEnabled}
                                    onCheckedChange={(checked) => setSettings({ ...settings, isEnabled: checked })}
                                    aria-label="Toggle maintenance mode"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maintenance-title">Notice Title</Label>
                                <Input
                                    id="maintenance-title"
                                    value={settings.title || ''}
                                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                                    placeholder="e.g., System Upgrade in Progress"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maintenance-message">Notice Message</Label>
                                <Textarea
                                    id="maintenance-message"
                                    value={settings.message || ''}
                                    onChange={(e) => setSettings({ ...settings, message: e.target.value })}
                                    placeholder="e.g., We'll be back online shortly. We apologize for the inconvenience."
                                    rows={5}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving || !settings}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Settings
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
