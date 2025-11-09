
// src/app/dashboard/platform-management/user-data-export/page.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Database, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { saveAs } from 'file-saver';


interface UserExportData {
  uid: string;
  email?: string;
  firestoreData: any;
}

export default function UserDataExportPage() {
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserExportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setUserData([]);
    try {
      const response = await fetch('/api/fetch-user-info');
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to fetch data.');
      }
      const data = await response.json();
      setUserData(data.users);
      toast({ title: 'Success', description: `Fetched data for ${data.users.length} users.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(msg);
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleExportJson = () => {
    if (userData.length === 0) {
        toast({ variant: "destructive", title: "No data to export."});
        return;
    }
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json;charset=utf-8' });
    saveAs(blob, 'user-details-export.json');
    toast({ title: "Exported to JSON"});
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="User Data Export"
        description="Fetch and view combined data from Firebase Authentication and Firestore."
      >
        <Button onClick={handleFetchData} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          Fetch User Data
        </Button>
      </PageHeader>
      
      <Card>
        <CardHeader>
          <CardTitle>Fetched Data</CardTitle>
          <CardDescription>
            The table below shows user data from Firebase Auth combined with their corresponding record in the 'users' Firestore collection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <Card className="bg-destructive/10 border-destructive">
              <CardHeader><CardTitle className="text-base text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-destructive">{error}</p></CardContent>
            </Card>
          ) : (
            <>
                {userData.length > 0 && (
                    <div className="flex justify-end mb-4">
                        <Button onClick={handleExportJson} variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Export as JSON
                        </Button>
                    </div>
                )}
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>UID (From Auth)</TableHead>
                        <TableHead>Email (From Auth)</TableHead>
                        <TableHead>Role (From Firestore)</TableHead>
                        <TableHead>School ID (From Firestore)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {userData.length > 0 ? (
                        userData.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-mono text-xs">{user.uid}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.firestoreData?.role ? 
                                        <Badge>{user.firestoreData.role}</Badge> 
                                        : <Badge variant="destructive">Not Set</Badge>}
                                </TableCell>
                                 <TableCell>{user.firestoreData?.schoolId || 'N/A'}</TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                            No data fetched yet. Click the "Fetch User Data" button to begin.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
