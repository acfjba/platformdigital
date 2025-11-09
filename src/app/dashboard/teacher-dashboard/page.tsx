
// src/app/dashboard/teacher-dashboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, ArrowRight, Loader2, ClipboardList, ClipboardEdit, BookOpen, Gavel, HeartHandshake, ShieldAlert, Boxes, Star, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  href: string;
  isComplete: boolean;
}

interface DashboardLink {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const teacherLinks: DashboardLink[] = [
  { label: "Teacher Workbook Plan", href: "/dashboard/workbook-plan", icon: ClipboardList, description: "Generate and submit your weekly workbook plans." },
  { label: "Individual Work Plan (IWP)", href: "/dashboard/iwp", icon: ClipboardEdit, description: "Set and track your professional development goals." },
  { label: "Lesson Planner", href: "/dashboard/lesson-planner", icon: BookOpen, description: "Create detailed lesson plans for your subjects." },
  { label: "Disciplinary Records", href: "/dashboard/disciplinary", icon: Gavel, description: "Log and track student disciplinary incidents." },
  { label: "Counselling Records", href: "/dashboard/counselling", icon: HeartHandshake, description: "Maintain confidential counselling session records." },
  { label: "OHS Incident Reporting", href: "/dashboard/health-and-safety", icon: ShieldAlert, description: "Log OHS incidents for your class." },
  { label: "Exam Results", href: "/dashboard/academics/exam-results", icon: ClipboardCheck, description: "Record and manage student exam results." },
  { label: "Classroom Inventory", href: "/dashboard/academics/classroom-inventory", icon: Boxes, description: "Manage stock levels of classroom supplies." },
];


// SIMULATED DATA FETCHING
// In a real app, this would involve multiple Firestore queries
async function fetchTeacherTaskStatus(userId: string, schoolId: string): Promise<Task[]> {
  console.log(`Simulating task status fetch for user ${userId} in school ${schoolId}`);
  await new Promise(resolve => setTimeout(resolve, 1000));

  // This is a simulation. In a real app, you would query your database
  // to check if these tasks have been completed for the current week/term.
  return [
    {
      id: 'workbook-plan',
      title: 'Submit Weekly Workbook Plan',
      description: 'Generate and submit your workbook plan for the current week.',
      href: '/dashboard/workbook-plan',
      isComplete: Math.random() > 0.5, // 50% chance of being complete for demo
    },
    {
      id: 'classroom-inventory',
      title: 'Update Classroom Inventory',
      description: 'Ensure your classroom supply levels are accurate for this term.',
      href: '/dashboard/academics/classroom-inventory',
      isComplete: Math.random() > 0.7, // 70% chance of being complete
    },
    {
      id: 'iwp',
      title: 'Review Individual Work Plan (IWP)',
      description: 'Update your professional development goals and reflections for the year.',
      href: '/dashboard/iwp',
      isComplete: Math.random() > 0.8, // 80% chance of being complete
    },
  ];
}

export default function TeacherDashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [userName, setUserName] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    const userId = localStorage.getItem('userId');
    const schoolId = localStorage.getItem('schoolId');

    if (!userId || !schoolId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not identify user or school. Please log in again.'
      });
      setIsLoading(false);
      return;
    }

    try {
      const taskStatus = await fetchTeacherTaskStatus(userId, schoolId);
      setTasks(taskStatus);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Loading Tasks',
        description: 'Could not fetch your task status.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    // A function to set user name from local storage and add a listener
    const updateUserName = () => {
      const name = localStorage.getItem('userName');
      setUserName(name);
    };

    // Call it once to set the initial name
    updateUserName();
    loadTasks();
    
    // Add event listener to respond to changes from other tabs
    window.addEventListener('storage', updateUserName);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('storage', updateUserName);
    };
  }, [loadTasks]);

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title={`Welcome, ${userName || 'Teacher'}`}
        description="This is your personal dashboard. Here are your priority tasks and quick access to your modules."
      />
      
      <Card>
        <CardHeader>
          <CardTitle>My Tasks Checklist</CardTitle>
          <CardDescription>
            This checklist shows your most important tasks. Complete any items marked with "Action Required".
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={cn(
                    "p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4",
                    task.isComplete ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-300"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {task.isComplete ? (
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {task.isComplete ? (
                       <div className="font-bold text-green-700 text-center md:text-right flex items-center gap-1">
                        <CheckCircle className="h-5 w-5" /> Completed
                       </div>
                    ) : (
                      <Link href={task.href} passHref>
                        <Button>
                          Action Required <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="pt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teacherLinks.map(item => {
            const ItemIcon = item.icon;
            return (
              <Card key={item.href} className="shadow-lg hover:shadow-xl transition-shadow rounded-lg flex flex-col">
                <CardHeader>
                  <CardTitle className="font-headline text-xl text-primary flex items-center">
                    <ItemIcon className="mr-3 h-6 w-6" />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow">
                  <p className="text-sm text-muted-foreground mb-4 flex-grow">{item.description}</p>
                  <Link href={item.href} className="mt-auto">
                    <Button className="w-full">
                      Go to {item.label}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
