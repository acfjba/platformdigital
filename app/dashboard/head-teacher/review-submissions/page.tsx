// src/app/dashboard/head-teacher/review-submissions/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, CheckCircle, XCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from '@/components/layout/page-header';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, serverTimestamp, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Assuming a structure for the plan stored in Firestore
interface WorkbookPlan {
    id: string;
    teacherName: string;
    teacherId: string;
    yearOfStudy: string;
    term: string;
    week: string;
    status: 'Submitted' | 'Approved' | 'Rejected';
    submittedAt: string;
    [key: string]: any; // To allow for other fields
}

async function fetchSubmissions(schoolId: string): Promise<WorkbookPlan[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const plansCollection = collection(db, 'workbookPlans');
  const q = query(
    plansCollection,
    where("schoolId", "==", schoolId),
    where("status", "in", ["Submitted", "Approved", "Rejected"])
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      teacherName: data.teacherName,
      teacherId: data.teacherId,
      yearOfStudy: data.yearOfStudy,
      term: data.term,
      week: data.week,
      status: data.status,
      submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate().toLocaleString() : 'N/A',
      ...data // include all other plan data
    } as WorkbookPlan;
  });
}

async function updateSubmissionStatus(planId: string, status: 'Approved' | 'Rejected', feedback: string): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  const planRef = doc(db, 'workbookPlans', planId);
  await updateDoc(planRef, {
    status: status,
    headTeacherFeedback: feedback,
    reviewedAt: serverTimestamp()
  });
}

export default function ReviewSubmissionsPage() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<WorkbookPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<WorkbookPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = useCallback(async (id: string) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await fetchSubmissions(id);
      setSubmissions(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load submissions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('schoolId');
    if (id) {
      setSchoolId(id);
      loadData(id);
    } else {
      setIsLoading(false);
      setFetchError("School ID not found. Cannot load submissions.");
    }
  }, [loadData]);

  const openReviewModal = (plan: WorkbookPlan) => {
    setSelectedPlan(plan);
    setFeedback(plan.headTeacherFeedback || '');
    setIsModalOpen(true);
  };
  
  const handleUpdateStatus = async (status: 'Approved' | 'Rejected') => {
    if (!selectedPlan) return;
    setIsUpdating(true);
    try {
        await updateSubmissionStatus(selectedPlan.id, status, feedback);
        toast({ title: 'Success', description: `Plan has been ${status.toLowerCase()}.` });
        setIsModalOpen(false);
        if (schoolId) loadData(schoolId);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update plan status.' });
    } finally {
        setIsUpdating(false);
    }
  };
  
  const statusVariant = (status: WorkbookPlan['status']) => {
      switch (status) {
          case 'Approved': return 'default';
          case 'Rejected': return 'destructive';
          case 'Submitted': return 'secondary';
          default: return 'outline';
      }
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Review Workbook Plan Submissions"
        description="Review, approve, or reject workbook plans submitted by teachers."
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Submission Queue</CardTitle>
          <CardDescription>All submitted workbook plans for your school.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-48 w-full" />}
          {fetchError && <p className="text-destructive">{fetchError}</p>}
          {!isLoading && !fetchError && (
            <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date Submitted</TableHead>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Year/Term/Week</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    No submissions found.
                                </TableCell>
                            </TableRow>
                        ) : submissions.map(plan => (
                             <TableRow key={plan.id}>
                                <TableCell>{plan.submittedAt}</TableCell>
                                <TableCell>{plan.teacherName}</TableCell>
                                <TableCell>{`Y${plan.yearOfStudy} / T${plan.term} / W${plan.week}`}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant(plan.status)}>{plan.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => openReviewModal(plan)}>
                                        <Eye className="mr-2 h-4 w-4" /> Review
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>

       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Review Plan for: {selectedPlan?.teacherName}</DialogTitle>
                <DialogDescription>
                    {`Year ${selectedPlan?.yearOfStudy} / Term ${selectedPlan?.term} / Week ${selectedPlan?.week}`}
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-4 border rounded-md my-4 space-y-4">
                 <h3 className="font-bold">Weekly Remarks:</h3>
                 <p className="text-sm whitespace-pre-wrap bg-muted p-2 rounded-md">{selectedPlan?.weeklyRemarks}</p>

                 {selectedPlan?.dailyPlans?.map((dayPlan: any) => (
                    <div key={dayPlan.day}>
                        <h4 className="font-bold text-primary">{dayPlan.day} ({dayPlan.date})</h4>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Activity</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {dayPlan.activities?.map((activity: any) => (
                                <TableRow key={activity.id}>
                                    <TableCell className="font-medium w-1/3">{activity.label}</TableCell>
                                    <TableCell className="whitespace-pre-wrap w-2/3">{activity.curriculumDetails}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                         </Table>
                    </div>
                 ))}
            </div>
            <div className="space-y-2">
                <Label htmlFor="feedback">Feedback / Comments</Label>
                <Textarea 
                    id="feedback"
                    placeholder="Provide feedback for the teacher..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="button" variant="destructive" onClick={() => handleUpdateStatus('Rejected')} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>}
                    Reject
                </Button>
                <Button type="button" onClick={() => handleUpdateStatus('Approved')} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                    Approve
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
