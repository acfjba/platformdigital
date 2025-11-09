"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, History as HistoryIconLucide, AlertCircle } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';

interface RatingHistoryItem {
  id: string;
  teacherName: string;
  rating: number;
  date: string;
  comment?: string;
}

// This function would ideally fetch data from your Firestore 'ratings' collection,
// filtered by the current logged-in user's ID.
async function fetchRatingHistoryFromBackend(): Promise<RatingHistoryItem[]> {
  console.log("Simulating fetch rating history from backend...");
  await new Promise(resolve => setTimeout(resolve, 1000)); 

  // Example of returning minimal mock data if needed for dev when backend is not ready:
  return [
    { id: "r_temp1", teacherName: "NILESH SHARMA", rating: 5, date: "2024-07-10", comment: "Excellent leadership and support!" },
    { id: "r_temp2", teacherName: "SENIROSI LEDUA", rating: 4, date: "2024-07-05", comment: "Very helpful and clear explanations in Math." },
  ];
}


const DisplayStars = ({ count, starSize = "h-5 w-5" }: { count: number; starSize?: string }) => (
  <div className="flex" aria-label={`${count} out of 5 stars`}>
    {[...Array(5)].map((_, i) => (
      <Star key={i} className={`${starSize} ${i < count ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
    ))}
  </div>
);

export default function RatingHistoryPage() {
  const [ratingHistory, setRatingHistory] = useState<RatingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedHistory = await fetchRatingHistoryFromBackend();
        setRatingHistory(fetchedHistory);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred while fetching rating history.");
        console.error("Failed to load rating history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  return (
      <div className="p-8 space-y-8">
        <PageHeader 
            title="My Rating History"
            description="Review the ratings you have submitted for teachers."
        />

        {isLoading && (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="shadow-lg rounded-lg">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <Skeleton className="h-6 w-48 mb-1" />
                    </div>
                    <Skeleton className="h-6 w-24 mt-2 sm:mt-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && error && (
           <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
              <CardTitle className="font-headline text-destructive flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" /> Error Loading History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-destructive">{error}</p>
              <p className="font-body text-destructive-foreground/80 mt-2">Please try refreshing the page or contact support.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && ratingHistory.length === 0 && (
          <Card className="shadow-md rounded-lg">
            <CardContent className="p-6 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-body text-muted-foreground text-lg">You haven't submitted any ratings yet.</p>
              <p className="font-body text-sm text-muted-foreground mt-1">Once you rate teachers, your history will appear here.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && ratingHistory.length > 0 && (
          <div className="space-y-6">
            {ratingHistory.map((item) => (
              <Card key={item.id} className="shadow-lg hover:shadow-xl transition-shadow rounded-lg">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <CardTitle className="font-headline text-xl text-primary">{item.teacherName}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="font-body mt-2 sm:mt-0">{item.date}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-body font-semibold text-foreground">Your Rating:</span>
                    <DisplayStars count={item.rating} />
                  </div>
                  {item.comment && (
                    <div>
                      <h4 className="font-body font-semibold text-foreground">Your Comment:</h4>
                      <blockquote className="font-body text-foreground bg-muted/30 p-3 rounded-md border-l-4 border-primary italic">
                        {item.comment}
                      </blockquote>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
