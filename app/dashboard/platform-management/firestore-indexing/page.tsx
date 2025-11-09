// src/app/dashboard/platform-management/firestore-indexing/page.tsx
"use client";

import React from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownUp, AlertTriangle, ExternalLink, Copy } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface IndexDefinition {
  collection: string;
  fields: { name: string; type: 'Ascending' | 'Descending' | 'Array Contains' }[];
  queryScope: 'Collection' | 'Collection Group';
}

const requiredIndexes: IndexDefinition[] = [
    {
        collection: 'staff',
        fields: [
            { name: 'schoolId', type: 'Ascending' },
            { name: 'status', type: 'Ascending' },
            { name: 'role', type: 'Ascending' },
        ],
        queryScope: 'Collection',
    },
    {
        collection: 'staffAttendance',
        fields: [
            { name: 'schoolId', type: 'Ascending' },
            { name: 'date', type: 'Descending' },
        ],
        queryScope: 'Collection',
    },
    {
        collection: 'workbookPlans',
        fields: [
            { name: 'schoolId', type: 'Ascending' },
            { name: 'status', type: 'Ascending' },
        ],
        queryScope: 'Collection',
    },
     {
        collection: 'subjects',
        fields: [
            { name: 'schoolId', type: 'Ascending' },
            { name: 'yearLevel', type: 'Ascending' },
        ],
        queryScope: 'Collection',
    },
];

export default function FirestoreIndexingPage() {
    const { toast } = useToast();

    const handleCopyJson = () => {
        const jsonString = JSON.stringify(requiredIndexes, null, 2);
        navigator.clipboard.writeText(jsonString);
        toast({ title: "Copied!", description: "Index definitions copied to clipboard." });
    };

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Firestore Indexing"
                description="Manage and create the required database indexes for optimal query performance."
            />
            
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                    Firestore queries require indexes to function. Without the indexes defined below, parts of the application will fail to load data. These must be created manually in the Firebase Console.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowDownUp /> Required Composite Indexes
                    </CardTitle>
                    <CardDescription>
                        The following composite indexes are required for the application's queries.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Collection</TableHead>
                                    <TableHead>Fields</TableHead>
                                    <TableHead>Query Scope</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requiredIndexes.map((index, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-mono font-semibold">{index.collection}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {index.fields.map(field => (
                                                    <span key={field.name} className="font-mono text-xs p-1 bg-muted rounded-sm">
                                                        {field.name} ({field.type})
                                                    </span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>{index.queryScope}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                     <div className="mt-6 flex flex-col sm:flex-row gap-4">
                        <a href="https://console.firebase.google.com/project/_/firestore/indexes" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                            <Button className="w-full">
                                <ExternalLink className="mr-2 h-4 w-4" /> Go to Firebase Indexing Console
                            </Button>
                        </a>
                        <Button onClick={handleCopyJson} variant="outline" className="w-full sm:w-auto">
                           <Copy className="mr-2 h-4 w-4" /> Copy as JSON
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
