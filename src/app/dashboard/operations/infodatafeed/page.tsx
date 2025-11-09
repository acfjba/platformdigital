
// src/app/dashboard/operations/infodatafeed/page.tsx
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileUp, Loader2, AlertCircle, FileCheck2, FileX2, History, ArrowRight, Eye, CheckCircle, XCircle, Filter, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const DATA_TYPES = [
    { value: 'staff', label: 'Staff Records' },
    { value: 'users', label: 'User Accounts' },
    { value: 'examResults', label: 'Exam Results' },
    { value: 'primaryInventory', label: 'Primary (School) Inventory' },
    { value: 'classroomInventory', label: 'Classroom Inventory' },
    { value: 'libraryBooks', label: 'Library Book Catalogue' },
    { value: 'counsellingRecords', label: 'Counselling Records' },
    { value: 'disciplinaryRecords', label: 'Disciplinary Records' },
    { value: 'ohsIncidents', label: 'OHS Incident Records' },
    { value: 'staffAttendance', label: 'Staff Attendance' },
    { value: 'other', label: 'Other' },
];

interface UploadLog {
    id: string;
    timestamp: string;
    user: string;
    school: string;
    dataType: string;
    fileName: string;
    status: 'Success' | 'Failed';
    recordsProcessed: number;
}

type PreviewData = { headers: string[], rows: (string|number)[][] };
type CompletionStatus = { success: boolean; message: string; recordsProcessed: number; } | null;

// --- MOCK API FUNCTIONS ---
async function simulateUpload(file: File, dataType: string): Promise<{ success: boolean; preview?: PreviewData; error?: string }> {
    console.log(`Simulating upload for ${file.name} of type ${dataType}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (Math.random() < 0.1) {
        return { success: false, error: 'Simulated file parsing error. The file format is invalid or corrupted.' };
    }

    let preview: PreviewData;
    if (dataType === 'staff') {
        preview = {
            headers: ['staffId', 'name', 'role', 'email'],
            rows: [
                ['T-101', 'John Doe', 'teacher', 'john.d@example.com'],
                ['T-102', 'Jane Smith', 'teacher', 'jane.s@example.com'],
            ]
        };
    } else if (dataType === 'libraryBooks') {
        preview = {
            headers: ['title', 'author', 'isbn', 'totalCopies'],
            rows: [
                ['The Hobbit', 'J.R.R. Tolkien', '978-0-345-33968-3', 5],
                ['Dune', 'Frank Herbert', '978-0-441-01359-3', 3],
            ]
        };
    } else {
        preview = {
            headers: ['ID', 'Name', 'Value 1', 'Value 2'],
            rows: [
                ['SKU-001', 'Sample Item 1', 100, 25.5],
                ['SKU-002', 'Sample Item 2', 150, 30.0],
            ]
        };
    }
    
    return { success: true, preview };
}

async function simulateFeedData(fileName: string, recordsCount: number): Promise<{ success: boolean; error?: string }> {
    console.log(`Simulating feeding ${recordsCount} records from ${fileName} into the database.`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (Math.random() > 0.2) {
        return { success: true };
    } else {
        return { success: false, error: 'Simulated database conflict. Duplicate IDs found or invalid data format.' };
    }
}

async function fetchUploadHistory(): Promise<UploadLog[]> {
    console.log('Simulating fetch of upload history...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return [
        { id: 'up_1', timestamp: new Date(Date.now() - 86400000).toISOString(), user: 'Rosa Batina', school: 'Navolau District School', dataType: 'Staff Records', fileName: 'new_staff_q2.xlsx', status: 'Success', recordsProcessed: 12 },
        { id: 'up_2', timestamp: new Date(Date.now() - 172800000).toISOString(), user: 'System Admin', school: 'Global', dataType: 'Exam Results', fileName: 'term_1_exams.csv', status: 'Failed', recordsProcessed: 0 },
        { id: 'up_3', timestamp: new Date(Date.now() - 259200000).toISOString(), user: 'Rosa Batina', school: 'Navolau District School', dataType: 'Primary (School) Inventory', fileName: 'asset_update.csv', status: 'Success', recordsProcessed: 55 },
        { id: 'up_4', timestamp: new Date(Date.now() - 345600000).toISOString(), user: 'System Admin', school: 'Vuda District School', dataType: 'User Accounts', fileName: 'new_users_2024.xlsx', status: 'Success', recordsProcessed: 8 },
    ];
}

const TEMPLATE_DATA: Record<string, string> = {
    staff: "staffId,tpfNumber,name,role,position,department,status,email,phone,schoolId\nT-001,TPF-12345,John Doe,teacher,Class Teacher,Academics,Active,j.doe@school.com,555-1234,SCHOOL_ID_HERE",
    users: "name,email,phone,role,schoolId,password\nJane Smith,j.smith@school.com,555-5678,teacher,SCHOOL_ID_HERE,TempPass123!",
    examResults: "studentId,studentName,studentYear,examType,subject,score,grade,examDate,term,year,comments\nS001,John Doe,Year 8,Mid-Term,Mathematics,85,A,2024-06-15,2,2024,Excellent work",
    primaryInventory: "itemName,quantity,value,remarks\nStudent Desk,150,75.50,Good condition",
    counsellingRecords: "sessionDate,studentName,studentId,studentDob,studentYear,counsellingType,otherCounsellingType,sessionDetails,actionPlan,parentsContacted,counsellorName\n2024-08-01,John Doe,S123,2015-01-01,Year 3,Academic,,Struggling with math homework,Extra tutoring sessions,Yes,Jane Smith",
    disciplinaryRecords: "incidentDate,studentName,studentId,studentDob,studentYear,issues,drugType,otherIssue,comments,raisedBy,parentsInformed,actionComments\n2024-08-01,Jane Doe,S456,2014-02-02,Year 4,\"Bullying,Disrespect\",,,\"Refused to follow instructions\",Teacher Jane,Yes,\"Detention and parent meeting\"",
    libraryBooks: "title,author,isbn,totalCopies\nThe Hobbit,J.R.R. Tolkien,978-0-345-33968-3,5",
};


export default function InfoDataFeedPage() {
    const { toast } = useToast();
    const [selectedDataType, setSelectedDataType] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadHistory, setUploadHistory] = useState<UploadLog[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    
    const [userName, setUserName] = useState<string>('Current User');
    const [schoolName, setSchoolName] = useState<string>('Current School');

    const [uploadStage, setUploadStage] = useState<'select' | 'complete'>('select');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [completionStatus, setCompletionStatus] = useState<CompletionStatus>(null);
    
    const [dataTypeFilter, setDataTypeFilter] = useState('all');
    const [schoolFilter, setSchoolFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const history = await fetchUploadHistory();
            setUploadHistory(history);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load upload history.' });
        } finally {
            setIsLoadingHistory(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const uName = localStorage.getItem('userName') || 'Current User';
        const sName = localStorage.getItem('schoolId') === 'global' ? 'Global' : localStorage.getItem('schoolId') || 'Current School';
        setUserName(uName);
        setSchoolName(sName);
        loadHistory();
    }, [loadHistory]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleUploadAndPreview = async () => {
        if (!selectedFile || !selectedDataType) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select a data type and a file to upload." });
            return;
        }

        setIsProcessing(true);
        toast({ title: "Processing File...", description: `Analyzing ${selectedFile.name}...` });

        const result = await simulateUpload(selectedFile, selectedDataType);

        if (result.success && result.preview) {
            setPreviewData(result.preview);
            setIsPreviewModalOpen(true);
        } else {
            toast({ variant: "destructive", title: "File Read Failed", description: result.error || "An unknown error occurred while parsing the file." });
        }

        setIsProcessing(false);
    };
    
    const handleConfirmFeed = async () => {
        if (!previewData || !selectedFile) return;

        setIsProcessing(true);
        setIsPreviewModalOpen(false);
        toast({ title: "Importing Data...", description: "Feeding records into the database. Please wait." });

        const result = await simulateFeedData(selectedFile.name, previewData.rows.length);

        if (result.success) {
            setCompletionStatus({ success: true, message: `Successfully fed ${previewData.rows.length} records into the application.`, recordsProcessed: previewData.rows.length });
        } else {
            setCompletionStatus({ success: false, message: result.error || "An unknown database error occurred.", recordsProcessed: 0 });
        }
        
        const newLogEntry: UploadLog = {
            id: `up_${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: userName,
            school: schoolName,
            dataType: DATA_TYPES.find(d => d.value === selectedDataType)?.label || 'Unknown',
            fileName: selectedFile.name,
            status: result.success ? 'Success' : 'Failed',
            recordsProcessed: result.success ? previewData.rows.length : 0,
        };
        setUploadHistory(prev => [newLogEntry, ...prev]);

        setUploadStage('complete');
        setIsProcessing(false);
    };

    const resetUploadState = () => {
        setUploadStage('select');
        setSelectedFile(null);
        setSelectedDataType('');
        setPreviewData(null);
        setCompletionStatus(null);
        setIsPreviewModalOpen(false);
    };
    
    const handleDownloadTemplate = () => {
        const templateContent = TEMPLATE_DATA[selectedDataType];
        if (!templateContent) {
            toast({ variant: "destructive", title: "Template Not Available", description: "A sample template for this data type is not yet available." });
            return;
        }

        const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedDataType}_template.csv`);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
            title: "Template Downloaded",
            description: `A sample CSV for ${DATA_TYPES.find(d => d.value === selectedDataType)?.label} has been downloaded.`
        });
    };

    const { filteredHistory, filterOptions } = useMemo(() => {
        const schools = ['all', ...Array.from(new Set(uploadHistory.map(log => log.school)))];
        const users = ['all', ...Array.from(new Set(uploadHistory.map(log => log.user)))];
        const dataTypes = ['all', ...Array.from(new Set(uploadHistory.map(log => log.dataType)))];
        const statuses = ['all', 'Success', 'Failed'];

        const filtered = uploadHistory.filter(log => 
            (dataTypeFilter === 'all' || log.dataType === dataTypeFilter) &&
            (schoolFilter === 'all' || log.school === schoolFilter) &&
            (userFilter === 'all' || log.user === userFilter) &&
            (statusFilter === 'all' || log.status === statusFilter)
        );

        return {
            filteredHistory: filtered,
            filterOptions: { schools, users, dataTypes, statuses }
        };
    }, [uploadHistory, dataTypeFilter, schoolFilter, userFilter, statusFilter]);

    const handleDeleteHistory = (logId: string) => {
        setUploadHistory(prev => prev.filter(log => log.id !== logId));
        toast({
            title: "Log Entry Removed",
            description: "The selected log entry has been removed from the history."
        });
    };

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Info Data Feed"
                description="Bulk upload data using Excel or CSV files to populate application forms."
            />
            
            {uploadStage === 'select' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Upload /> New Data Upload</CardTitle>
                        <CardDescription>Select the type of data, choose your file, and start the import process.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border rounded-lg bg-muted/50 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="data-type" className="font-semibold">Step 1: Select Data Type</Label>
                                <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                                    <SelectTrigger id="data-type"><SelectValue placeholder="e.g., Staff Records" /></SelectTrigger>
                                    <SelectContent>
                                        {DATA_TYPES.map(type => (
                                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="file-upload" className="font-semibold">Step 2: Choose File</Label>
                                <div className="flex gap-2">
                                    <Input id="file-upload" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                                    <Button variant="outline" size="icon" onClick={handleDownloadTemplate} disabled={!selectedDataType} title="Download Template">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Button onClick={handleUploadAndPreview} disabled={isProcessing || !selectedFile || !selectedDataType} className="w-full">
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : 'Upload & Preview'}
                                </Button>
                            </div>
                        </div>
                         <Alert className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>How it works</AlertTitle>
                            <AlertDescription>
                                1. Select the type of data you want to upload.
                                2. Click the download icon to get a CSV template with the correct columns.
                                3. Fill in your data in the template file and save it.
                                4. Choose your saved file and click "Upload & Preview" to begin.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}

            <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Eye /> Preview Data</DialogTitle>
                  <DialogDescription>Review the records found in your file. If correct, confirm to feed this data into the application.</DialogDescription>
                </DialogHeader>
                {previewData && (
                  <div className="space-y-4 my-4">
                    <Alert>
                        <AlertTitle className="font-bold">File: {selectedFile?.name}</AlertTitle>
                        <AlertDescription>
                            Found <strong>{previewData.rows.length}</strong> records for import as <strong>{DATA_TYPES.find(d => d.value === selectedDataType)?.label}</strong>.
                        </AlertDescription>
                    </Alert>
                     <div className="overflow-y-auto rounded-md border max-h-96">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted">
                                <TableRow>
                                    {previewData.headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previewData.rows.map((row, index) => (
                                    <TableRow key={index}>
                                        {row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                  </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={resetUploadState} disabled={isProcessing}>
                        <XCircle className="mr-2 h-4 w-4"/> Cancel
                    </Button>
                     <Button onClick={handleConfirmFeed} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                        {isProcessing ? 'Feeding...' : 'Confirm & Feed Data'}
                    </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {uploadStage === 'complete' && completionStatus && (
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">Import Complete</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {completionStatus.success ? (
                            <Alert variant="default" className="bg-green-100 border-green-300">
                                <CheckCircle className="h-5 w-5 text-green-700" />
                                <AlertTitle className="font-bold text-green-800">Upload Successful</AlertTitle>
                                <AlertDescription className="text-green-700">
                                    {completionStatus.message}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive" className="animate-pulse">
                                <XCircle className="h-5 w-5" />
                                <AlertTitle className="font-bold">Upload Failed</AlertTitle>
                                <AlertDescription>
                                    {completionStatus.message}
                                </AlertDescription>
                            </Alert>
                        )}
                        <Button onClick={resetUploadState} className="mt-6">
                           <Upload className="mr-2 h-4 w-4" /> Start New Upload
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History /> Recent Uploads</CardTitle>
                    <CardDescription>A log of the most recent data import activities.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 border rounded-lg mb-6 bg-muted/50 print:hidden">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                             <div className="font-semibold text-lg flex items-center col-span-full md:col-span-1"><Filter className="mr-2 h-5 w-5" /> Filters</div>
                            <div>
                                <Label htmlFor="data-type-filter">Data Type</Label>
                                <Select value={dataTypeFilter} onValueChange={setDataTypeFilter}>
                                    <SelectTrigger id="data-type-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>{filterOptions.dataTypes.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All Data Types' : opt}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="school-filter">School</Label>
                                <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                                    <SelectTrigger id="school-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>{filterOptions.schools.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All Schools' : opt}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="user-filter">User</Label>
                                <Select value={userFilter} onValueChange={setUserFilter}>
                                    <SelectTrigger id="user-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>{filterOptions.users.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All Users' : opt}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                             <div>
                                <Label htmlFor="status-filter">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger id="status-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>{filterOptions.statuses.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All Statuses' : opt}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    {isLoadingHistory ? (
                        <Skeleton className="h-48 w-full"/>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>School</TableHead>
                                        <TableHead>Data Type</TableHead>
                                        <TableHead>Filename</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Records</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
                                                No upload history found for the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredHistory.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(new Date(log.timestamp), "dd MMM yyyy, hh:mm a")}</TableCell>
                                            <TableCell>{log.user}</TableCell>
                                            <TableCell>{log.school}</TableCell>
                                            <TableCell>{log.dataType}</TableCell>
                                            <TableCell>{log.fileName}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {log.status === 'Success' ? 
                                                        <FileCheck2 className="h-5 w-5 text-green-600"/> : 
                                                        <FileX2 className="h-5 w-5 text-destructive"/>
                                                    }
                                                    <span className={log.status === 'Success' ? 'text-green-700' : 'text-destructive'}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{log.recordsProcessed}</TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" title="Delete Log">
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently delete the log for "{log.fileName}". This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteHistory(log.id)} className="bg-destructive hover:bg-destructive/90">
                                                                Yes, Delete Log
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
