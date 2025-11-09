// src/app/dashboard/teachers/[teacherId]/rate/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { Star, Send, AlertCircle, UserSquare2, ArrowLeft } from "lucide-react";
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from '@/components/layout/page-header';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';


interface TeacherDetails {
  id: string;
  name: string;
  position: string; 
  avatar: string; 
  dataAiHint: string;
  schoolId: string | null; 
  email?: string;
}

// Fetch teacher details from the 'staff' collection
async function fetchTeacherDetailsFromBackend(teacherId: string): Promise<TeacherDetails | null> {
    if (!db) throw new Error("Firestore is not configured.");
    const staffDocRef = doc(db, 'staff', teacherId);
    const staffDocSnap = await getDoc(staffDocRef);

    if (staffDocSnap.exists()) {
        const staffData = staffDocSnap.data();
        const rateableRoles = ["teacher", "head-teacher", "assistant-head-teacher"];
        if (rateableRoles.includes(staffData.role?.toLowerCase())) {
            return {
                id: staffDocSnap.id,
                name: staffData.name,
                position: staffData.position,
                avatar: `https://placehold.co/120x120.png`,
                dataAiHint: "teacher portrait",
                schoolId: staffData.schoolId,
                email: staffData.email,
            };
        }
    }
    return null;
}


const StarRatingInput = ({ rating, setRating }: { rating: number; setRating: (rating: number) => void }) => {
  const [hoverRating, setHoverRating] = useState(0);
  return (
    <div className="flex space-x-1" role="radiogroup" aria-label="Star rating">
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            type="button"
            key={starValue}
            role="radio"
            aria-checked={rating === starValue}
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
            className="p-1 focus:outline-none rounded-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            onClick={() => setRating(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setRating(starValue);
              }
            }}
          >
            <Star
              className={`h-8 w-8 sm:h-10 sm:w-10 transition-colors 
                ${(hoverRating || rating) >= starValue ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default function RateTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const teacherId = (params?.teacherId || '') as string;
  
  const [teacher, setTeacher] = useState<TeacherDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedInSchoolId, setLoggedInSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedSchoolId = localStorage.getItem('schoolId');
        const storedUserRole = localStorage.getItem('userRole');
        setLoggedInSchoolId(storedSchoolId);
        setUserRole(storedUserRole);
    }

    if (!teacherId) {
      setIsLoading(false);
      setFetchError("Teacher ID is missing from URL.");
      return;
    }

    const loadTeacherDetails = async () => {
      setIsLoading(true);
      setFetchError(null);
      if (!isFirebaseConfigured) {
          setFetchError("Firebase is not configured. Cannot load teacher details.");
          setIsLoading(false);
          return;
      }
      try {
        const fetchedTeacher = await fetchTeacherDetailsFromBackend(teacherId);
        if (fetchedTeacher) {
          setTeacher(fetchedTeacher);
        } else {
          setFetchError("Teacher not found or not eligible for rating.");
        }
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "An unknown error occurred while fetching teacher details.");
      } finally {
        setIsLoading(false);
      }
    };
    loadTeacherDetails();
  }, [teacherId]);

  const handleSubmitRating = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rating === 0) {
      setFormError('Please select a star rating.');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    
    const isSystemAdmin = userRole === 'system-admin';

    if (!isSystemAdmin && !loggedInSchoolId) {
        toast({
            variant: "destructive",
            title: "Submission Error",
            description: "Your School ID is not set. Please log in again.",
        });
        setIsSubmitting(false);
        return;
    }
    
    if (!isSystemAdmin && teacher?.schoolId !== loggedInSchoolId) {
       toast({
            variant: "destructive",
            title: "Submission Error",
            description: `You can only rate teachers from your own school.`,
        });
        setIsSubmitting(false);
        return;
    }

    const ratingData = {
        teacherId: teacher?.id,
        teacherName: teacher?.name, 
        rating,
        comment,
        userId: 'currentUserPlaceholderId', 
        schoolId: teacher?.schoolId, 
        date: new Date().toISOString().split('T')[0], 
    };

    console.log("Submitting rating:", ratingData);
    // In a real app, you would send this to your backend (e.g., Firestore)
    await new Promise(resolve => setTimeout(resolve, 1200)); 
    
    setIsSubmitting(false);
    toast({
      title: "Rating Submitted",
      description: `Your rating for ${teacher?.name} has been recorded.`,
    });
    router.push('/dashboard/teachers'); 
  };

  const pageTitle = isLoading ? "Loading..." : teacher ? `Rate ${teacher.name}` : "Rate Teacher";

  return (
    <div className="p-8 space-y-8">
        <PageHeader 
            title={pageTitle} 
            description={isLoading ? 'Fetching teacher details...' : teacher ? `Submit your rating for ${teacher.position}` : 'Could not load teacher information.'}
        >
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </PageHeader>
      {isLoading && (
        <div className="max-w-2xl mx-auto w-full">
          <Card className="shadow-xl rounded-lg">
            <CardHeader className="text-center border-b border-border pb-6">
              <div className="flex flex-col items-center">
                <Skeleton className="h-[120px] w-[120px] rounded-full mb-4" />
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <Skeleton className="h-10 w-1/2 mx-auto sm:mx-0" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && fetchError && (
        <div className="text-center py-10 max-w-md mx-auto">
          <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
              <CardTitle className="font-headline text-destructive flex items-center justify-center">
                <AlertCircle className="mr-2 h-6 w-6" /> Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-destructive mb-6">{fetchError}</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {!isLoading && !teacher && !fetchError && (
        <div className="text-center py-10 max-w-md mx-auto">
           <Card className="bg-muted/30">
             <CardHeader>
                <CardTitle className="font-headline text-base text-primary flex items-center justify-center">
                    <AlertCircle className="mr-2 h-6 w-6" /> Teacher Not Found
                </CardTitle>
             </CardHeader>
             <CardContent>
                <p className="font-body text-foreground mb-6">The teacher you are trying to rate could not be found or is not eligible for rating.</p>
             </CardContent>
           </Card>
        </div>
      )}

      {!isLoading && teacher && (
        <div className="max-w-2xl mx-auto w-full">
            <Card className="shadow-xl rounded-lg">
            <CardHeader className="text-center border-b border-border pb-6">
                <div className="flex flex-col items-center">
                {teacher.avatar.startsWith('https://placehold.co') ? (
                    <Image
                    src={teacher.avatar}
                    alt={`Photo of ${teacher.name}`}
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-primary mb-4 object-cover bg-muted"
                    data-ai-hint={teacher.dataAiHint}
                    priority
                    />
                ) : (
                    <UserSquare2 className="h-28 w-28 text-primary mb-4 p-2 border-4 border-primary rounded-full bg-muted" />
                )}
                <CardTitle className="text-3xl font-headline text-primary">{teacher.name}</CardTitle>
                <CardDescription className="text-lg font-body text-muted-foreground">{teacher.position}</CardDescription>
                <CardDescription className="text-sm font-body text-muted-foreground">School ID: {teacher.schoolId}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmitRating} className="space-y-8">
                <div className="space-y-2">
                    <Label htmlFor="rating-input" className="block text-lg font-headline font-medium text-foreground text-center sm:text-left">
                    Your Rating for {teacher.name}
                    </Label>
                    <div id="rating-input" className="flex justify-center sm:justify-start">
                    <StarRatingInput rating={rating} setRating={setRating} />
                    </div>
                    {formError && <p className="text-sm text-destructive mt-1 text-center sm:text-left">{formError}</p>}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="comment" className="block text-lg font-headline font-medium text-foreground">
                    Add a Comment (Optional)
                    </Label>
                    <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={`Share your thoughts on ${teacher.name}'s teaching, conduct, etc.`}
                    className="min-h-[120px] font-body text-base"
                    rows={5}
                    />
                </div>
                
                <Button 
                    type="submit" 
                    className="w-full text-lg py-3 transition-opacity duration-150 ease-in-out" 
                    disabled={isSubmitting}
                    aria-live="polite"
                >
                    {isSubmitting ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                    </>
                    ) : (
                    <>
                        <Send className="mr-2 h-5 w-5" /> Submit Rating
                    </>
                    )}
                </Button>
                </form>
            </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
