// src/app/dashboard/academics/exam-summary/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BookCopy, FileCheck2, ListOrdered, AlertCircle, AlertTriangle } from "lucide-react";
import type { ExamResult } from '@/lib/schemas/exam-results';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

async function fetchAllExamResultsForSchool(schoolId: string): Promise<ExamResult[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const q = query(collection(db, 'examResults'), where('schoolId', '==', schoolId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as ExamResult;
  });
}

interface AggregatedClassResult {
    yearLevel: string;
    resultCount: number;
    averageScore: string;
    passRate: string;
    highestScore: number;
    lowestScore: number;
}

export default function ExamSummaryPage() {
    const [detailedResults, setDetailedResults] = useState<ExamResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string|null>(null);
    const [termFilter, setTermFilter] = useState('All');
    const [academicYearFilter, setAcademicYearFilter] = useState('All');
    const [userRole, setUserRole] = useState<string|null>(null);
    const [schoolId, setSchoolId] = useState<string|null>(null);

    const loadData = useCallback(async () => {
      if (!schoolId) {
          setFetchError("School ID not found.");
          setIsLoading(false);
          return;
      }
      if (userRole !== 'head-teacher' && userRole !== 'primary-admin' && userRole !== 'system-admin') {
          setFetchError("You do not have permission to view this page.");
          setIsLoading(false);
          return;
      }
      setIsLoading(true);
      setFetchError(null);
      try {
        if (!isFirebaseConfigured) {
          throw new Error("Firebase is not configured. Cannot load summary.");
        }
        const results = await fetchAllExamResultsForSchool(schoolId);
        setDetailedResults(results);
        if (results.length > 0) {
            const latestYear = Math.max(...results.map(r => parseInt(r.year, 10))).toString();
            setAcademicYearFilter(latestYear);
        }
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    }, [schoolId, userRole]);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const sId = localStorage.getItem('schoolId');
        setUserRole(role);
        setSchoolId(sId);
    }, []);

    useEffect(() => {
        if(schoolId && userRole) {
            loadData();
        }
    }, [schoolId, userRole, loadData]);


    const { uniqueTerms, uniqueAcademicYears, aggregatedClassData, performanceBySubject, performanceByTerm } = useMemo(() => {
        const allTerms = new Set(detailedResults.map(r => r.term));
        const allYears = new Set(detailedResults.map(r => r.year));
        const uniqueTerms = ['All', ...Array.from(allTerms)].sort();
        const uniqueAcademicYears = ['All', ...Array.from(allYears)].sort().reverse();
        
        const filteredByTermAndYear = detailedResults.filter(result => {
            const termMatch = termFilter === 'All' || result.term === termFilter;
            const academicYearMatch = academicYearFilter === 'All' || result.year === academicYearFilter;
            return termMatch && academicYearMatch;
        });

        // --- Aggregated Data for Table ---
        const studentYears = Array.from(new Set(filteredByTermAndYear.map(r => r.studentYear))).sort((a,b) => parseInt(a, 10) - parseInt(b, 10));
        const aggregatedData: AggregatedClassResult[] = studentYears.map(year => {
            const yearResults = filteredByTermAndYear.filter(r => r.studentYear === year);
            const scores = yearResults.map(r => Number(r.score)).filter(s => !isNaN(s));
            if (scores.length === 0) return null;
            const averageScore = scores.reduce((acc, s) => acc + s, 0) / scores.length;
            const highestScore = Math.max(...scores);
            const lowestScore = Math.min(...scores);
            const PASS_MARK = 50;
            const passedCount = scores.filter(s => s >= PASS_MARK).length;
            const passRate = (passedCount / scores.length) * 100;

            return {
                yearLevel: `Year ${year}`,
                resultCount: scores.length,
                averageScore: averageScore.toFixed(1),
                passRate: passRate.toFixed(1) + '%',
                highestScore,
                lowestScore,
            };
        }).filter((item): item is AggregatedClassResult => item !== null);

        // --- Data for Performance by Subject Chart ---
        const subjectMap = new Map<string, number[]>();
        filteredByTermAndYear.forEach(r => {
            if (typeof r.score === 'number') {
                if (!subjectMap.has(r.subject)) subjectMap.set(r.subject, []);
                subjectMap.get(r.subject)!.push(r.score);
            }
        });
        const performanceBySubject = Array.from(subjectMap.entries()).map(([subject, scores]) => ({
            name: subject,
            'Average Score': scores.reduce((a,b) => a + b, 0) / scores.length,
        }));

        // --- Data for Performance by Term ---
        const termMap = new Map<string, number[]>();
        detailedResults.filter(r => academicYearFilter === 'All' || r.year === academicYearFilter).forEach(r => {
             if (typeof r.score === 'number') {
                const termKey = `Term ${r.term}`;
                if (!termMap.has(termKey)) termMap.set(termKey, []);
                termMap.get(termKey)!.push(r.score);
            }
        });
        const performanceByTerm = Array.from(termMap.entries()).map(([term, scores]) => ({
            name: term,
            'Average Score': scores.reduce((a,b) => a+b, 0) / scores.length
        })).sort((a, b) => a.name.localeCompare(b.name));

        return { uniqueTerms, uniqueAcademicYears, aggregatedClassData: aggregatedData, performanceBySubject, performanceByTerm };
    }, [detailedResults, termFilter, academicYearFilter]);

  return (
      <div className="p-8 flex flex-col gap-8">
        <PageHeader 
            title="Exam Results Summary & Reflections"
            description="An overview of school-wide academic performance based on recorded exam data."
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary flex items-center"><TrendingUp className="mr-2 h-6 w-6" />Term-over-Term Performance</CardTitle>
                    <CardDescription>Average scores across all subjects for the selected academic year.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {isLoading ? <Skeleton className="h-full w-full" /> : 
                     performanceByTerm.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={performanceByTerm}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[50, 100]} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="Average Score" stroke="hsl(var(--primary))" strokeWidth={2} />
                            </RechartsLineChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground">No data to display.</p>}
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary flex items-center"><FileCheck2 className="mr-2 h-6 w-6" />Performance by Subject</CardTitle>
                    <CardDescription>Average scores for each subject based on current filters.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                   {isLoading ? <Skeleton className="h-full w-full" /> :
                    performanceBySubject.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceBySubject}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Average Score" fill="hsl(var(--chart-1))" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground">No data to display.</p>}
                </CardContent>
            </Card>
        </div>

        <Card className="shadow-lg rounded-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><ListOrdered className="mr-2 h-6 w-6" />School Final Results Board</CardTitle>
                <CardDescription>Aggregated performance for each year level based on live data. Pass Rate is based on a score of 50% or higher.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div>
                        <Label htmlFor="term-filter" className="text-sm font-medium">Term</Label>
                        <Select value={termFilter} onValueChange={setTermFilter} disabled={isLoading}><SelectTrigger id="term-filter" className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Term" /></SelectTrigger><SelectContent>{uniqueTerms.map(term => <SelectItem key={term} value={term}>{term}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label htmlFor="academic-year-filter" className="text-sm font-medium">Academic Year</Label>
                        <Select value={academicYearFilter} onValueChange={setAcademicYearFilter} disabled={isLoading}><SelectTrigger id="academic-year-filter" className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Year" /></SelectTrigger><SelectContent>{uniqueAcademicYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select>
                    </div>
                </div>

                {isLoading ? <Skeleton className="h-64 w-full" /> 
                  : fetchError ? <Card className="mt-6 bg-destructive/10"><CardHeader><CardTitle className="text-base text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" />Error</CardTitle></CardHeader><CardContent><p className="text-sm text-destructive">{fetchError}</p></CardContent></Card>
                  : aggregatedClassData.length === 0 ? (
                    <Card className="mt-6 bg-muted/30"><CardHeader><CardTitle className="font-headline text-base text-primary flex items-center"><AlertCircle className="mr-2 h-5 w-5" />No Results Found</CardTitle></CardHeader><CardContent><p className="font-body text-sm text-foreground">No exam results match your current filter criteria.</p></CardContent></Card>
                ) : (
                    <div className="overflow-x-auto rounded-md border max-h-[500px]">
                        <Table><TableHeader className="sticky top-0 bg-muted/95"><TableRow><TableHead>Year Level</TableHead><TableHead className="text-center">No. of Results</TableHead><TableHead className="text-center">Average Score</TableHead><TableHead className="text-center">Pass Rate</TableHead><TableHead className="text-center">Highest Score</TableHead><TableHead className="text-center">Lowest Score</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {aggregatedClassData.map(result => (
                                    <TableRow key={result.yearLevel}>
                                        <TableCell className="font-medium">{result.yearLevel}</TableCell><TableCell className="text-center">{result.resultCount}</TableCell><TableCell className="text-center font-semibold">{result.averageScore}</TableCell>
                                        <TableCell className="text-center"><Badge variant={parseFloat(result.passRate) >= 80 ? "default" : parseFloat(result.passRate) < 50 ? "destructive" : "secondary"} className={cn(parseFloat(result.passRate) >= 80 && 'bg-green-600 hover:bg-green-700')}>{result.passRate}</Badge></TableCell>
                                        <TableCell className="text-center text-green-700 font-bold">{result.highestScore}</TableCell><TableCell className="text-center text-destructive font-bold">{result.lowestScore}</TableCell>
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
