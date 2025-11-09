
// src/app/dashboard/platform-management/data-schema/page.tsx
"use client";

import React from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Share2, Layers } from "lucide-react";

const entityRelations = [
    { from: 'School', to: 'Users', relation: 'One-to-Many' },
    { from: 'School', to: 'Staff', relation: 'One-to-Many' },
    { from: 'School', to: 'Primary Inventory', relation: 'One-to-Many (Subcollection)' },
    { from: 'User (Teacher)', to: 'Workbook Plan', relation: 'One-to-Many' },
    { from: 'User (Student)', to: 'Exam Result', relation: 'One-to-Many' },
    { from: 'User (Student)', to: 'Disciplinary Record', relation: 'One-to-Many' },
];

const collectionDescriptions = [
    { name: 'schools', description: 'Stores the master record for each school, including name, address, and enabled modules.' },
    { name: 'users', description: 'Stores authentication details and roles for all platform users. Custom claims on Auth objects control access.' },
    { name: 'staff', description: 'Contains detailed records for all staff members (teachers, admins, etc.), linked to a specific school.' },
    { name: 'permissionGroups', description: 'Defines roles (e.g., "head-teacher") and the specific permissions associated with them.' },
    { name: 'softwareLicenses', description: 'Manages license keys, expiry dates, and status for each school.' },
    { name: 'examResults', description: 'Holds all student exam results, linked to a student and school.' },
    { name: 'disciplinary', description: 'Contains all student disciplinary incident records.' },
    { name: 'counselling', description: 'Confidential student counselling session notes.' },
    { name: 'snapshots', description: 'Stores complete backups (snapshots) of the entire database state.' },
];

export default function DataSchemaPage() {
    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Data Schema & Relationships"
                description="An overview of how data is structured and connected within the platform."
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Share2 /> Data Relationships</CardTitle>
                        <CardDescription>Visualizing how the core data entities are connected.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {entityRelations.map(rel => (
                                <div key={`${rel.from}-${rel.to}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                                    <Badge variant="secondary">{rel.from}</Badge>
                                    <div className="flex-grow border-b border-dashed mx-4"></div>
                                    <span className="text-xs text-muted-foreground">{rel.relation}</span>
                                    <div className="flex-grow border-b border-dashed mx-4"></div>
                                    <Badge variant="secondary">{rel.to}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Layers /> Main Database Collections</CardTitle>
                        <CardDescription>An outline of the main collections in the Firestore database.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Collection Name</TableHead>
                                        <TableHead>Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {collectionDescriptions.map(col => (
                                        <TableRow key={col.name}>
                                            <TableCell className="font-mono font-semibold">{col.name}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{col.description}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
