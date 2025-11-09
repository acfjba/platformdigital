
// src/app/dashboard/teachers/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search, AlertCircle, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/layout/page-header';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';


interface Teacher {
  id: string;
  name: string;
  position: string;
  avatar: string;
  dataAiHint: string;
  schoolId: string | null;
  role: string;
}

// Fetch teachers from the 'staff' collection
async function fetchTeachersFromBackend(schoolId: string): Promise<Teacher[]> {
    if (!db) throw new Error("Firestore is not configured.");
    const staffCollection = collection(db, 'staff');
    const q = query(staffCollection, where("schoolId", "==", schoolId), where("role", "in", ["teacher", "head-teacher", "assistant-head-teacher"]));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const staff = doc.data();
      return {
            id: doc.id, // Using the document ID from staff collection
            name: staff.name,
            position: staff.position,
            avatar: `https://placehold.co/80x80.png`,
            dataAiHint: "teacher portrait",
            schoolId: staff.schoolId,
            role: staff.role
      };
    });
}

// Overloaded function for system admin to fetch all teachers
async function fetchAllTeachersForAdmin(): Promise<Teacher[]> {
    if (!db) throw new Error("Firestore is not configured.");
    const staffCollection = collection(db, 'staff');
    const q = query(staffCollection, where("role", "in", ["teacher", "head-teacher", "assistant-head-teacher"]));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const staff = doc.data();
      return {
            id: doc.id,
            name: staff.name,
            position: staff.position,
            avatar: `https://placehold.co/80x80.png`,
            dataAiHint: "teacher portrait",
            schoolId: staff.schoolId,
            role: staff.role
      };
    });
}


export default function TeachersListPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const loadInitialData = useCallback(async (role: string | null, id: string | null) => {
    setIsLoading(true);
    setFetchError(null);
    if (!isFirebaseConfigured) {
        setIsLoading(false);
        setFetchError("Firebase is not configured.");
        return;
    }

    try {
        let fetchedTeachers: Teacher[];
        if (role === 'system-admin') {
            fetchedTeachers = await fetchAllTeachersForAdmin();
        } else if (id) {
            fetchedTeachers = await fetchTeachersFromBackend(id);
        } else {
            fetchedTeachers = [];
            setFetchError("Cannot load teacher data. School ID is not available.");
        }
        setTeachers(fetchedTeachers);
    } catch (err) {
        setFetchError(err instanceof Error ? err.message : "An unknown error occurred.");
        toast({ variant: "destructive", title: "Error", description: "Could not load teacher data." });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedSchoolId = localStorage.getItem('schoolId');
        const storedUserRole = localStorage.getItem('userRole');
        setSchoolId(storedSchoolId);
        setUserRole(storedUserRole);
        
        loadInitialData(storedUserRole, storedSchoolId);
    }
  }, [loadInitialData]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher =>
      (teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       teacher.position.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [teachers, searchTerm]);
  
  const isSystemAdmin = userRole === 'system-admin';

  return (
    <TooltipProvider>
      <div className="p-8 space-y-8">
        <PageHeader 
            title="View & Rate Teachers"
            description="Browse the list of teachers. You can only rate teachers from your own school."
        />
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <Input
                    id="search-teachers"
                    placeholder="Search by name or position..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
                />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="flex flex-col items-center p-4">
                    <Skeleton className="h-20 w-20 rounded-full mb-3" />
                    <Skeleton className="h-6 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-1/2" />
                  </Card>
                ))}
              </div>
            )}
            {!isLoading && fetchError && (
              <div className="text-center py-10">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <p className="mt-4 text-destructive">{fetchError}</p>
              </div>
            )}
            {!isLoading && !fetchError && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeachers.map((teacher) => (
                  <Card key={teacher.id} className="p-4 flex flex-col items-center text-center space-y-3">
                    <Image
                      src={teacher.avatar}
                      alt={`Photo of ${teacher.name}`}
                      width={80}
                      height={80}
                      className="rounded-full border-2 border-primary object-cover"
                      data-ai-hint={teacher.dataAiHint}
                    />
                    <div className="space-y-1">
                      <h3 className="font-headline text-lg font-semibold text-primary">{teacher.name}</h3>
                      <p className="text-sm text-muted-foreground">{teacher.position}</p>
                       {isSystemAdmin && (
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                <Building className="h-3 w-3" /> School ID: {teacher.schoolId}
                            </p>
                       )}
                    </div>
                    <Link href={`/dashboard/teachers/${teacher.id}/rate`} passHref className="w-full">
                        <Button className="w-full">
                          <Star className="mr-2 h-4 w-4" /> Rate Teacher
                        </Button>
                    </Link>
                  </Card>
                ))}
                 {filteredTeachers.length === 0 && (
                  <Card className="col-span-full bg-muted/30">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-lg text-foreground">No Teachers Found</p>
                        <p className="text-muted-foreground">No rateable teachers match your current search criteria.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
