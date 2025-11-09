// src/app/dashboard/library/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Library,
  PlusCircle,
  AlertCircle,
  Edit,
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
  Loader2,
  BarChart3,
  FileUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BookFormSchema,
  LibraryTransactionFormSchema,
  type Book,
  type BookFormData,
  type LibraryTransaction,
  type LibraryTransactionFormData,
} from "@/lib/schemas/library";
import {
  useForm,
  type SubmitHandler,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { db, isFirebaseConfigured } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  query,
  where,
  runTransaction,
} from "firebase/firestore";

/* ------------------------------------------------------------------ */
/*                             Firestore                              */
/* ------------------------------------------------------------------ */

async function fetchBooksFromFirestore(
  schoolId: string,
): Promise<Book[]> {
  if (!db) throw new Error("Firestore is not configured.");

  const booksCollection = collection(db, "books");
  const q = query(booksCollection, where("schoolId", "==", schoolId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
      updatedAt:
        data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt,
    } as Book;
  });
}

async function fetchTransactionsFromFirestore(
  schoolId: string,
): Promise<LibraryTransaction[]> {
  if (!db) throw new Error("Firestore is not configured.");

  const txCollection = collection(db, "libraryTransactions");
  const q = query(txCollection, where("schoolId", "==", schoolId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      issuedAt:
        data.issuedAt instanceof Timestamp
          ? data.issuedAt.toDate().toISOString()
          : data.issuedAt,
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
      updatedAt:
        data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt,
    } as LibraryTransaction;
  });
}

async function addBookToFirestore(
  data: BookFormData,
  schoolId: string,
): Promise<Book> {
  if (!db) throw new Error("Firestore is not configured.");

  const newBookData = {
    ...data,
    availableCopies: data.totalCopies,
    schoolId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "books"), newBookData);

  return {
    ...newBookData,
    id: docRef.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function updateBookInFirestore(id: string, data: BookFormData): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    const bookRef = doc(db, 'books', id);
    // You may need to fetch the existing doc to recalculate available copies if totalCopies changes.
    // This is a simplified update.
    await updateDoc(bookRef, { ...data, updatedAt: serverTimestamp()});
}

async function deleteBookFromFirestore(bookId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  await deleteDoc(doc(db, "books", bookId));
}

async function issueBookTransaction(
  data: LibraryTransactionFormData,
  bookTitle: string,
  schoolId: string,
  userId: string,
): Promise<LibraryTransaction> {
  if (!db) throw new Error("Firestore is not configured.");

  const bookRef = doc(db, "books", data.bookId);
  const transactionRef = doc(collection(db, "libraryTransactions"));

  await runTransaction(db, async (transaction) => {
    const bookDoc = await transaction.get(bookRef);
    if (!bookDoc.exists() || bookDoc.data().availableCopies <= 0) {
      throw new Error("Book is not available for loan.");
    }

    transaction.update(bookRef, {
      availableCopies: bookDoc.data().availableCopies - 1,
    });

    const newTransactionData = {
      ...data,
      bookTitle,
      schoolId,
      issuedBy: userId,
      issuedAt: new Date(),
      status: "issued",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    transaction.set(transactionRef, newTransactionData);
  });

  return {
    ...data,
    id: transactionRef.id,
    bookTitle,
    schoolId,
    issuedBy: userId,
    issuedAt: new Date().toISOString(),
    status: 'issued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function returnBookTransaction(
  transactionId: string,
  bookId: string,
): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");

  const bookRef = doc(db, "books", bookId);
  const transactionRef = doc(db, "libraryTransactions", transactionId);

  await runTransaction(db, async (transaction) => {
    const bookDoc = await transaction.get(bookRef);
    if (bookDoc.exists()) {
      transaction.update(bookRef, {
        availableCopies: (bookDoc.data().availableCopies || 0) + 1,
      });
    }
    transaction.delete(transactionRef);
  });
}

/* ------------------------------------------------------------------ */
/*                              Component                             */
/* ------------------------------------------------------------------ */

export default function LibraryServicePage() {
  const { toast } = useToast();

  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const addBookForm = useForm<BookFormData>({
    resolver: zodResolver(BookFormSchema),
  });
  const transactionForm = useForm<LibraryTransactionFormData>({
    resolver: zodResolver(LibraryTransactionFormSchema),
  });

  useEffect(() => {
    setSchoolId(localStorage.getItem("schoolId"));
    setUserId(localStorage.getItem("userId"));
  }, []);

  const loadData = useCallback(
    async (currentSchoolId: string) => {
      setIsLoading(true);
      setFetchError(null);

      try {
        const [fetchedBooks, fetchedTransactions] = await Promise.all([
          fetchBooksFromFirestore(currentSchoolId),
          fetchTransactionsFromFirestore(currentSchoolId),
        ]);
        setBooks(fetchedBooks);
        setTransactions(fetchedTransactions);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "An unknown error occurred.";
        setFetchError(msg);
        toast({
          variant: "destructive",
          title: "Error",
          description: msg,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (schoolId) {
      if(isFirebaseConfigured) {
        loadData(schoolId);
      } else {
        setFetchError("Firebase not configured. Cannot load library data.");
        setIsLoading(false);
      }
    }
    else {
      setFetchError("School ID not set. Cannot load library data.");
      setIsLoading(false);
    }
  }, [schoolId, loadData]);

  const handleBookFormSubmit: SubmitHandler<BookFormData> = async (data) => {
    if (!schoolId) {
        toast({variant: 'destructive', title: 'Error', description: 'School ID not found.'});
        return;
    }
    try {
        if (editingBook) {
            await updateBookInFirestore(editingBook.id, data);
            toast({title: 'Success', description: 'Book updated successfully.'});
        } else {
            await addBookToFirestore(data, schoolId);
            toast({title: 'Success', description: 'Book added successfully.'});
        }
        loadData(schoolId);
        setIsAddBookModalOpen(false);
    } catch (err) {
        toast({variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Could not save book.'});
    }
  }

  const handleTransactionFormSubmit: SubmitHandler<LibraryTransactionFormData> = async (data) => {
    if (!schoolId || !userId) {
        toast({variant: 'destructive', title: 'Error', description: 'School ID or User ID not found.'});
        return;
    }
    const bookToIssue = books.find(b => b.id === data.bookId);
    if (!bookToIssue) {
        toast({variant: 'destructive', title: 'Error', description: 'Selected book not found.'});
        return;
    }
    try {
        await issueBookTransaction(data, bookToIssue.title, schoolId, userId);
        toast({title: 'Success', description: 'Book issued successfully.'});
        loadData(schoolId);
        setIsTransactionModalOpen(false);
    } catch (err) {
        toast({variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Could not issue book.'});
    }
  }

  const handleDeleteBook = async (book: Book) => {
      if (!schoolId) return;
      if (book.totalCopies !== book.availableCopies) {
          toast({variant: 'destructive', title: 'Cannot Delete', description: 'All copies must be returned before deleting.'});
          return;
      }
      if (!confirm(`Are you sure you want to delete "${book.title}"?`)) return;
      try {
          await deleteBookFromFirestore(book.id);
          toast({title: 'Success', description: 'Book deleted.'});
          loadData(schoolId);
      } catch (err) {
          toast({variant: 'destructive', title: 'Error', description: 'Could not delete book.'});
      }
  }

  const handleReturnBook = async (transaction: LibraryTransaction) => {
      if (!schoolId) return;
      try {
          await returnBookTransaction(transaction.id, transaction.bookId);
          toast({title: 'Success', description: 'Book returned.'});
          loadData(schoolId);
      } catch(err) {
          toast({variant: 'destructive', title: 'Error', description: 'Could not return book.'});
      }
  }

  const openAddBookModal = () => {
      addBookForm.reset({title: '', author: '', isbn: '', totalCopies: 1});
      setEditingBook(null);
      setIsAddBookModalOpen(true);
  }

  const openEditBookModal = (book: Book) => {
      setEditingBook(book);
      addBookForm.reset(book);
      setIsAddBookModalOpen(true);
  }

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Library Service"
        description="Manage book inventory and track issued items."
      >
        <Link href="/dashboard/library/summary">
          <Button variant="outline"><BarChart3 className="mr-2 h-4 w-4"/> View Summary & Reports</Button>
        </Link>
      </PageHeader>
      
      <Alert>
        <FileUp className="h-4 w-4" />
        <AlertTitle>Bulk Book Upload</AlertTitle>
        <AlertDescription>
          To add your entire library catalogue at once, go to the{' '}
          <Link href="/dashboard/operations/infodatafeed" className="font-bold underline">
            Info Data Feed
          </Link>
          {' '}page. Download the "Library Book Catalogue" template, fill it with your book details, and upload the file.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Book Inventory */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Book Inventory</CardTitle>
                <CardDescription>All books available in the library.</CardDescription>
              </div>
              <Button onClick={openAddBookModal}><PlusCircle className="mr-2 h-4 w-4"/> Add Book</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)
                  ) : fetchError ? (
                     <TableRow><TableCell colSpan={4} className="text-center text-destructive">{fetchError}</TableCell></TableRow>
                  ) : books.length > 0 ? (
                    books.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>{book.availableCopies} / {book.totalCopies}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditBookModal(book)}><Edit className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteBook(book)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">No books in inventory.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Active Issues */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Issues</CardTitle>
                <CardDescription>Books currently issued to students.</CardDescription>
              </div>
               <Button onClick={() => setIsTransactionModalOpen(true)}><ArrowRightLeft className="mr-2 h-4 w-4"/> Issue Book</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full"/></TableCell></TableRow>
                  ) : fetchError ? (
                     <TableRow><TableCell colSpan={3} className="text-center text-destructive">{fetchError}</TableCell></TableRow>
                  ) : transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.bookTitle}</TableCell>
                        <TableCell>{tx.studentName}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleReturnBook(tx)}>Return</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">No active issues.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      
       {/* Add/Edit Book Modal */}
        <Dialog open={isAddBookModalOpen} onOpenChange={setIsAddBookModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingBook ? "Edit Book" : "Add New Book"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={addBookForm.handleSubmit(handleBookFormSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" {...addBookForm.register("title")} />
                        {addBookForm.formState.errors.title && <p className="text-sm text-destructive">{addBookForm.formState.errors.title.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="author">Author</Label>
                        <Input id="author" {...addBookForm.register("author")} />
                        {addBookForm.formState.errors.author && <p className="text-sm text-destructive">{addBookForm.formState.errors.author.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="isbn">ISBN (Optional)</Label>
                        <Input id="isbn" {...addBookForm.register("isbn")} />
                    </div>
                    <div>
                        <Label htmlFor="totalCopies">Total Copies</Label>
                        <Input id="totalCopies" type="number" {...addBookForm.register("totalCopies")} />
                         {addBookForm.formState.errors.totalCopies && <p className="text-sm text-destructive">{addBookForm.formState.errors.totalCopies.message}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={addBookForm.formState.isSubmitting}>
                          {addBookForm.formState.isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                          {editingBook ? "Save Changes" : "Add Book"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        
        {/* Issue Book Modal */}
        <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Issue New Book</DialogTitle>
                </DialogHeader>
                <form onSubmit={transactionForm.handleSubmit(handleTransactionFormSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="bookId">Book</Label>
                        <Controller name="bookId" control={transactionForm.control} render={({field}) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select a book"/></SelectTrigger>
                                <SelectContent>
                                    {books.filter(b => b.availableCopies > 0).map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.title} ({b.availableCopies} available)</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )} />
                        {transactionForm.formState.errors.bookId && <p className="text-sm text-destructive">{transactionForm.formState.errors.bookId.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="studentId">Student ID</Label>
                        <Input id="studentId" {...transactionForm.register("studentId")} />
                         {transactionForm.formState.errors.studentId && <p className="text-sm text-destructive">{transactionForm.formState.errors.studentId.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="studentName">Student Name</Label>
                        <Input id="studentName" {...transactionForm.register("studentName")} />
                         {transactionForm.formState.errors.studentName && <p className="text-sm text-destructive">{transactionForm.formState.errors.studentName.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input id="dueDate" type="date" {...transactionForm.register("dueDate")} />
                         {transactionForm.formState.errors.dueDate && <p className="text-sm text-destructive">{transactionForm.formState.errors.dueDate.message}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={transactionForm.formState.isSubmitting}>
                          {transactionForm.formState.isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                          Issue Book
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

    </div>
  );
}
