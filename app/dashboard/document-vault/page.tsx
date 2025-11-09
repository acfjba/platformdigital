
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Eye, Trash2, FolderArchive, AlertTriangle, FileDown, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface SavedDocument {
    id: string;
    name: string;
    type: string;
    dateSaved: string; // ISO String
    path: string; // e.g., "/disciplinary" or "/counselling"
    userId: string;
    schoolId: string;
    year?: string;
}

// SIMULATED BACKEND/LOCAL STORAGE FETCH
async function fetchSavedDocuments(): Promise<SavedDocument[]> {
    console.log(`Simulating fetch of all documents`);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Demo data for different users and schools
    const allDocuments: SavedDocument[] = [
        { id: 'doc1', name: 'Disciplinary Report - John Doe', type: 'Disciplinary Form', dateSaved: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), path: '/disciplinary', userId: 'teacher_placeholder_id', schoolId: '2009', year: '2024' },
        { id: 'doc2', name: 'Counselling Notes - Jane Smith', type: 'Counselling Record', dateSaved: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), path: '/counselling', userId: 'teacher_placeholder_id', schoolId: '2009', year: '2024' },
        { id: 'doc3', name: 'Classroom Inventory - Year 5', type: 'Inventory Report', dateSaved: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), path: '/academics/classroom-inventory', userId: 'headteacher_placeholder_id', schoolId: 'VDS-01', year: '2024' },
        { id: 'doc4', name: 'OHS Incident Report - Wet Floor', type: 'OHS Form', dateSaved: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), path: '/health-safety', userId: 'teacher_placeholder_id', schoolId: '2009', year: '2023' },
        { id: 'doc5', name: 'Full School Staff List', type: 'Staff Report', dateSaved: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), path: '/reporting', userId: 'primary_admin_placeholder_id', schoolId: 'VDS-01' },
    ];
    
    return allDocuments;
}

export default function DocumentVaultPage() {
    const { toast } = useToast();
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [schoolFilter, setSchoolFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState('all');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userSchoolId, setUserSchoolId] = useState<string | null>(null);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const schoolId = localStorage.getItem('schoolId');
        setUserRole(role);
        setUserSchoolId(schoolId);
    }, []);

    const loadDocs = useCallback(async () => {
        setIsLoading(true);
        try {
            const docs = await fetchSavedDocuments();
            setDocuments(docs);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not load saved documents." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadDocs();
    }, [loadDocs]);

    const { filteredDocuments, filterOptions } = useMemo(() => {
        let filtered = documents;

        // For non-system admins, always filter by their school
        if (userRole !== 'system-admin' && userSchoolId) {
            filtered = filtered.filter(doc => doc.schoolId === userSchoolId);
        } else if (userRole === 'system-admin' && schoolFilter !== 'all') {
            filtered = filtered.filter(doc => doc.schoolId === schoolFilter);
        }
        
        if (typeFilter !== 'all') {
            filtered = filtered.filter(doc => doc.type === typeFilter);
        }

        if (yearFilter !== 'all') {
            filtered = filtered.filter(doc => doc.year === yearFilter);
        }
        
        if (searchTerm) {
            filtered = filtered.filter(doc =>
                doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.type.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        const uniqueSchools = ['all', ...Array.from(new Set(documents.map(d => d.schoolId)))];
        const uniqueTypes = ['all', ...Array.from(new Set(documents.map(d => d.type)))];
        const uniqueYears = ['all', ...Array.from(new Set(documents.map(d => d.year).filter(Boolean) as string[]))].sort((a,b) => b.localeCompare(a));


        return {
            filteredDocuments: filtered,
            filterOptions: { schools: uniqueSchools, types: uniqueTypes, years: uniqueYears }
        };
    }, [documents, searchTerm, typeFilter, schoolFilter, yearFilter, userRole, userSchoolId]);


    const handleAction = (action: string, docName: string) => {
        toast({
            title: `Action Simulated: ${action}`,
            description: `This would ${action.toLowerCase()} the document: "${docName}"`,
        });
    };
    
    const handleDelete = (docId: string) => {
        if (window.confirm("Are you sure you want to delete this document record?")) {
            setDocuments(docs => docs.filter(d => d.id !== docId));
            toast({ title: "Document record deleted." });
        }
    };
    
    const handleDownloadIndex = () => {
        const dataToExport = filteredDocuments.length > 0 ? filteredDocuments : documents;
        if (dataToExport.length === 0) {
            toast({ variant: "destructive", title: "No documents to export." });
            return;
        }

        const headers = ["ID", "Name", "Type", "Date Saved", "School ID", "Year", "Original Path"];
        const rows = dataToExport.map(doc => [
            doc.id, `"${doc.name.replace(/"/g, '""')}"`, `"${doc.type.replace(/"/g, '""')}"`,
            new Date(doc.dateSaved).toLocaleString(), doc.schoolId, doc.year || 'N/A', doc.path,
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "document_vault_index.csv");
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
            title: "Download Started",
            description: "Your document vault index (CSV) is being downloaded."
        });
    };

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Document Vault"
                description="Access saved reports and forms. Use the filters to narrow down your search."
            />
            <Card>
                <CardHeader>
                     <div className="p-4 border rounded-lg bg-muted/50 print:hidden">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                             <div className="font-semibold text-lg flex items-center col-span-full md:col-span-1"><Filter className="mr-2 h-5 w-5" /> Filters</div>
                             <div className="col-span-full md:col-span-4">
                                <Label htmlFor="search-input">Search by Name</Label>
                                <Input id="search-input" placeholder="Search by name or type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                             </div>
                            {userRole === 'system-admin' && (
                                <div>
                                    <Label htmlFor="school-filter">School</Label>
                                    <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                                        <SelectTrigger id="school-filter"><SelectValue /></SelectTrigger>
                                        <SelectContent>{filterOptions.schools.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All Schools' : opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                             <div>
                                <Label htmlFor="type-filter">Type</Label>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger id="type-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>{filterOptions.types.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All Types' : opt}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                             <div>
                                <Label htmlFor="year-filter">Year</Label>
                                <Select value={yearFilter} onValueChange={setYearFilter}>
                                    <SelectTrigger id="year-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>{filterOptions.years.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All Years' : opt}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="col-start-1 md:col-start-auto">
                                <Button onClick={handleDownloadIndex} disabled={isLoading || documents.length === 0} className="w-full">
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Download Results (CSV)
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>School ID</TableHead>
                                        <TableHead>Year</TableHead>
                                        <TableHead>Date Saved</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDocuments.length > 0 ? (
                                        filteredDocuments.map(doc => (
                                            <TableRow key={doc.id}>
                                                <TableCell className="font-medium">{doc.name}</TableCell>
                                                <TableCell>{doc.type}</TableCell>
                                                <TableCell>{doc.schoolId}</TableCell>
                                                <TableCell>{doc.year || 'N/A'}</TableCell>
                                                <TableCell>{new Date(doc.dateSaved).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-center space-x-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleAction('View', doc.name)} title="View Original">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleAction('Download', doc.name)} title="Download Again">
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                     <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} title="Delete Record">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No documents found matching your criteria.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
