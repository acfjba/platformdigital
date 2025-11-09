// src/app/dashboard/library/summary/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Printer, Download, Mail, ArrowLeft, Book as BookIcon, Library, Users, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import type { Book, LibraryTransaction } from '@/lib/schemas/library';
import { Badge } from '@/components/ui/badge';
import { saveAs } from 'file-saver';


async function fetchLibraryData(schoolId: string): Promise<{ books: Book[], transactions: LibraryTransaction[] }> {
    if (!db) throw new Error("Firestore is not configured.");
    const [booksSnapshot, transactionsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'books'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'libraryTransactions'), where('schoolId', '==', schoolId))),
    ]);
    const books = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Book));
    const transactions = transactionsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LibraryTransaction));
    return { books, transactions };
}


export default function LibrarySummaryPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [books, setBooks] = useState<Book[]>([]);
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [schoolId, setSchoolId] = useState<string|null>(null);

    const loadData = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const { books: fetchedBooks, transactions: fetchedTransactions } = await fetchLibraryData(id);
            setBooks(fetchedBooks);
            setTransactions(fetchedTransactions);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load library data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const id = localStorage.getItem('schoolId');
        setSchoolId(id);
        if (id) {
            loadData(id);
        } else {
            setIsLoading(false);
        }
    }, [loadData]);
    
    const summaryStats = useMemo(() => {
        const totalBooks = books.reduce((acc, book) => acc + book.totalCopies, 0);
        const uniqueTitles = books.length;
        const totalValue = books.reduce((acc, book) => acc + (book.totalCopies * (book.value || 0)), 0);
        const issuedCount = transactions.length;

        return { totalBooks, uniqueTitles, totalValue, issuedCount };
    }, [books, transactions]);
    
    const chartData = useMemo(() => {
        const dataMap = new Map<string, number>();
        books.forEach(book => {
             dataMap.set(book.author, (dataMap.get(book.author) || 0) + book.totalCopies);
        });
        return Array.from(dataMap.entries())
            .map(([author, count]) => ({ name: author, books: count }))
            .sort((a, b) => b.books - a.books)
            .slice(0, 10);
    }, [books]);
    
    const handlePrint = () => {
        toast({ title: 'Printing...', description: 'Use your browser\'s print dialog to save as PDF.' });
        window.print();
    };

    const handleExport = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        csvContent += "Inventory Summary\n";
        csvContent += "Title,Author,ISBN,Total Copies,Available,Value\n";
        books.forEach(book => {
            csvContent += `"${book.title}","${book.author}","${book.isbn || ''}",${book.totalCopies},${book.availableCopies},${book.value || 0}\n`;
        });
        
        csvContent += "\nIssued Books\n";
        csvContent += "Book Title,Student Name,Student ID,Due Date\n";
        transactions.forEach(tx => {
            csvContent += `"${tx.bookTitle}","${tx.studentName}","${tx.studentId}","${tx.dueDate}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, "library_report.csv");
        toast({ title: 'Exported', description: 'Library report has been downloaded as a CSV file.' });
    };

    const handleEmail = () => {
        toast({ title: 'Simulating Email', description: 'An email with the library report would be sent.' });
    };

    return (
        <div className="p-8 space-y-8 printable-area">
            <PageHeader title="Library Summary & Reports" description="An overview of your library's inventory and activities.">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Library
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Unique Titles</CardTitle><BookIcon className="h-5 w-5 text-muted-foreground"/></CardHeader><CardContent className="text-2xl font-bold">{summaryStats.uniqueTitles}</CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Total Books</CardTitle><Library className="h-5 w-5 text-muted-foreground"/></CardHeader><CardContent className="text-2xl font-bold">{summaryStats.totalBooks}</CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Books on Loan</CardTitle><ArrowRightLeft className="h-5 w-5 text-muted-foreground"/></CardHeader><CardContent className="text-2xl font-bold">{summaryStats.issuedCount}</CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Total Value</CardTitle><Users className="h-5 w-5 text-muted-foreground"/></CardHeader><CardContent className="text-2xl font-bold">${summaryStats.totalValue.toFixed(2)}</CardContent></Card>
            </div>
            
             <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Library Reports</CardTitle>
                            <CardDescription>Detailed reports on inventory and issued books.</CardDescription>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                            <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4"/> Export CSV</Button>
                            <Button variant="outline" onClick={handleEmail}><Mail className="mr-2 h-4 w-4"/> Email Report</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                     <div>
                        <h3 className="text-lg font-semibold mb-2">Books on Loan</h3>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader><TableRow><TableHead>Book Title</TableHead><TableHead>Student Name</TableHead><TableHead>Student ID</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {isLoading ? <TableRow><TableCell colSpan={4}><Skeleton className="h-8"/></TableCell></TableRow> : transactions.length > 0 ? transactions.map(tx => (
                                        <TableRow key={tx.id}><TableCell>{tx.bookTitle}</TableCell><TableCell>{tx.studentName}</TableCell><TableCell>{tx.studentId}</TableCell><TableCell>{new Date(tx.dueDate).toLocaleDateString()}</TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No books are currently on loan.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Full Inventory</h3>
                        <div className="overflow-x-auto rounded-md border max-h-96">
                             <Table>
                                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>ISBN</TableHead><TableHead>Available</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-8"/></TableCell></TableRow> : books.length > 0 ? books.map(book => (
                                        <TableRow key={book.id}><TableCell className="font-medium">{book.title}</TableCell><TableCell>{book.author}</TableCell><TableCell>{book.isbn || 'N/A'}</TableCell><TableCell><Badge>{book.availableCopies}</Badge></TableCell><TableCell>{book.totalCopies}</TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No books in inventory.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
