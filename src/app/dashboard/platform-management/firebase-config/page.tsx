
// src/app/dashboard/platform-management/firebase-config/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    CheckCircle, AlertTriangle, ExternalLink, Database, KeyRound, 
    Loader2, Server, Code, DatabaseZap, Copy, TestTube2, Play, Terminal
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from 'next/link';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, doc, setDoc } from 'firebase/firestore';


export default function FirebaseConfigPage() {
    const [isSeeding, setIsSeeding] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [seedReport, setSeedReport] = useState<string[]>([]);
    const [seedError, setSeedError] = useState<string | null>(null);
    const { toast } = useToast();

    const [connectionKeys, setConnectionKeys] = useState({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
        databaseId: '',
        geminiApiKey: ''
    });

    useEffect(() => {
        setConnectionKeys({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'Not Set',
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Not Set',
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not Set',
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'Not Set',
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'Not Set',
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'Not Set',
            databaseId: '(default)',
            geminiApiKey: 'Set on Server (Hidden)',
        });
    }, []);

    const handleTestConnection = async () => {
        if (!isFirebaseConfigured || !db) {
            toast({
                variant: "destructive",
                title: "Firebase Not Configured",
                description: "Cannot test connection. Please configure your .env file.",
            });
            return;
        }

        setIsTestingConnection(true);

        toast({ title: 'Testing Connection...', description: "Attempting to write to Firestore..." });

        try {
            const testDocRef = doc(collection(db, 'test_connection'));
            await setDoc(testDocRef, {
                message: "Connection successful!",
                timestamp: new Date().toISOString(),
            });
            toast({
                title: "Connection Successful!",
                description: `Successfully wrote a document to the 'test_connection' collection in Firestore.`,
            });
        } catch (error) {
            console.error("Firestore connection test failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({
                variant: "destructive",
                title: "Connection Test Failed",
                description: `Could not write to Firestore. Check your security rules and configuration. Error: ${errorMessage}`,
            });
        } finally {
            setIsTestingConnection(false);
        }
    };
    
    const handleSeedDatabase = async () => {
        setIsSeeding(true);
        setSeedReport([]);
        setSeedError(null);
        
        try {
            const response = await fetch('/api/seed', { method: 'POST' });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.details || 'Failed to seed database.');
            }
            
            const fullReport = Object.entries(result.report).flatMap(([key, value]) => {
                if (Array.isArray(value) && value.length > 0) {
                    return [`[${key.toUpperCase()}]`, ...value.map(v => `  - ${v}`), ''];
                }
                return [];
            });
            
            setSeedReport(fullReport);

            if (result.report.errors.length > 0) {
                 setSeedError(`${result.report.errors.length} errors occurred. Check server logs for details.`);
                 toast({ variant: 'destructive', title: 'Seeding Completed with Errors' });
            } else {
                toast({
                    title: 'Database Seeded Successfully!',
                    description: 'The sample data has been loaded into Firestore.',
                });
            }

        } catch (error) {
            console.error("Seeding failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
            setSeedError(errorMessage);
            toast({
                variant: "destructive",
                title: "Database Seeding Failed",
                description: errorMessage,
            });
        } finally {
            setIsSeeding(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({ title: 'Copied to clipboard!' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Failed to copy' });
        }
    };

    const firestoreUrl = connectionKeys.projectId ? `https://console.firebase.google.com/project/${connectionKeys.projectId}/firestore/databases` : '#';

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Firebase Dashboard"
                description="Monitor your Firebase connection, manage data, and access your project console."
            />

            <Tabs defaultValue="status">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="status">Status & Actions</TabsTrigger>
                    <TabsTrigger value="keys">Connection Keys</TabsTrigger>
                </TabsList>
                
                <TabsContent value="status" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Connection Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isFirebaseConfigured ? (
                                <Alert variant="default" className="bg-green-50 border-green-200">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-800 font-bold">Successfully Connected to Firebase</AlertTitle>
                                    <AlertDescription className="text-green-700">
                                        This web application is configured to connect to your Firebase project: <strong className="font-mono">{connectionKeys.projectId || "Loading..."}</strong>.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Firebase Not Configured</AlertTitle>
                                    <AlertDescription>
                                        The application cannot connect to Firebase. Please ensure your project credentials are correctly set in the <code className="font-mono">.env</code> file.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter className="flex-wrap gap-2">
                            <Button onClick={handleTestConnection} disabled={isTestingConnection || !isFirebaseConfigured} variant="outline">
                                {isTestingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                                {isTestingConnection ? "Testing..." : "Test Firestore Connection"}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-headline">
                                <DatabaseZap className="w-5 w-5 text-primary" /> Database Management
                            </CardTitle>
                             <CardDescription>
                                Run the seed command to automatically populate your database with the initial sample data set. This action is idempotent and can be run multiple times.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                             <div className="bg-black text-white font-mono rounded-lg p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="h-5 w-5 text-green-400"/>
                                        <span className="text-green-400">$</span>
                                        <span>./seed-database.sh</span>
                                    </div>
                                    <Button onClick={handleSeedDatabase} disabled={isSeeding || !isFirebaseConfigured} size="sm">
                                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                        {isSeeding ? 'Running...' : 'Run'}
                                    </Button>
                                </div>
                                {(isSeeding || seedReport.length > 0 || seedError) && (
                                     <div className="border-t border-gray-700 mt-2 pt-2 text-xs h-64 overflow-y-auto">
                                        {isSeeding && <p className="text-yellow-400">Initiating database seed...</p>}
                                        {seedReport.map((line, index) => (
                                            <p key={index} className="text-gray-300 whitespace-pre-wrap">{line}</p>
                                        ))}
                                        {seedError && <p className="text-red-500 font-bold mt-2">{seedError}</p>}
                                        {!isSeeding && (seedReport.length > 0 || seedError) && <p className="text-green-400 mt-2">Execution finished.</p>}
                                     </div>
                                )}
                             </div>
                         </CardContent>
                    </Card>
                    
                    <Alert variant="destructive">
                        <AlertTitle>Important: One-Time Setup Required</AlertTitle>
                        <AlertDescription>
                            Before you can seed data, you must create a Firestore database in your Firebase project. This is a one-time setup step.
                            <br />
                            1. <a href={firestoreUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">Click here to go to the Firestore Database page.</a>
                            <br />
                            2. Click "Create database".
                            <br />
                            3. Select **Production mode** (this is important for security rules).
                            <br />
                            4. Choose a location (e.g., us-central1) and click "Enable".
                            <br />
                            After the database is created, you can use the "Seed Database" command.
                        </AlertDescription>
                    </Alert>
                </TabsContent>
                
                <TabsContent value="keys" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Connection Keys</CardTitle>
                            <CardDescription>
                                These are the keys used to connect to Firebase and other services. They are read from your environment variables.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(connectionKeys).map(([key, value]) => (
                                <div key={key} className="space-y-1">
                                    <Label htmlFor={key} className="text-xs uppercase text-muted-foreground font-bold">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id={key} readOnly value={value || ''} className="font-mono bg-muted/50" />
                                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(value || '')} disabled={!value || value === 'Not Set' || value.includes('Hidden')}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
