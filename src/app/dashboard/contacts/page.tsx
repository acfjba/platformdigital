"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Building, AlertCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  schoolId: string;
}

async function fetchAllContacts(): Promise<Contact[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const staffSnapshot = await getDocs(collection(db, 'staff'));
  return staffSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone,
      schoolId: data.schoolId,
    };
  });
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string|null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    if (!isFirebaseConfigured) {
      setFetchError("Firebase is not configured.");
      setIsLoading(false);
      return;
    }
    try {
      const data = await fetchAllContacts();
      setContacts(data);
    } catch(err) {
      setFetchError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    const lowercasedFilter = searchTerm.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(lowercasedFilter) ||
      contact.role.toLowerCase().includes(lowercasedFilter) ||
      contact.email.toLowerCase().includes(lowercasedFilter) ||
      contact.schoolId.toLowerCase().includes(lowercasedFilter)
    );
  }, [contacts, searchTerm]);

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="School Contacts Directory"
        description="A directory of all staff members across all schools."
      />
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>All Contacts</CardTitle>
                 <div className="relative w-full sm:w-auto max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name, role, school..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="pl-8"
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent>
          {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
          ) : fetchError ? (
            <Card className="bg-destructive/10 border-destructive"><CardHeader><CardTitle className="text-base text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error Loading Data</CardTitle></CardHeader><CardContent><p className="text-sm text-destructive">{fetchError}</p></CardContent></Card>
          ) : (
              <div className="overflow-x-auto rounded-md border">
              <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>School ID</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead></TableRow></TableHeader>
                  <TableBody>
                  {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.role}</TableCell>
                        <TableCell><div className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground" /><span>{contact.schoolId}</span></div></TableCell>
                        <TableCell><a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a></TableCell>
                        <TableCell><a href={`tel:${contact.phone}`} className="text-primary hover:underline">{contact.phone}</a></TableCell>
                      </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No contacts found matching your search.</TableCell></TableRow>
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
