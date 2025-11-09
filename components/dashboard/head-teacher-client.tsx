// src/components/dashboard/head-teacher-client.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  UsersRound,
  FileText,
  BarChart2,
  Gavel,
  HeartHandshake,
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  Loader2,
  Star,
  CalendarCheck,
  Warehouse,
  School
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { getWeek } from 'date-fns';
import type { Role } from '@/lib/schemas/user';

type PermissionKey = 
  | 'lesson-plans:review' 
  | 'teachers:rate'
  | 'staff:view'
  | 'reports:school:view'
  | 'disciplinary:view'
  | 'counselling:view'
  | 'health-safety:view'
  | 'attendance:view'
  | 'inventory:primary:view'
  | 'school-info:edit';


interface HeadTeacherLinkItem {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  permission: PermissionKey;
}

interface StaffMember {
    id: string;
    name: string;
}

interface WorkbookPlan {
    id: string;
    teacherId: string;
    week: string;
}

const allHeadTeacherLinks: HeadTeacherLinkItem[] = [
  { label: "Staff Attendance", href: "/dashboard/attendance", icon: CalendarCheck, description: "Record and manage daily staff attendance.", permission: 'attendance:view' },
  { label: "Review Submissions", href: "/dashboard/head-teacher/review-submissions", icon: ClipboardList, description: "Review and approve submitted teacher workbook plans.", permission: 'lesson-plans:review' },
  { label: "Primary Inventory", href: "/dashboard/inventory", icon: Warehouse, description: "Track and manage all fixed school assets.", permission: 'inventory:primary:view' },
  { label: "School Information", href: "/dashboard/school-info", icon: School, description: "View & edit school news, programs, and general info.", permission: 'school-info:edit' },
  { label: "Rate Teachers", href: "/dashboard/teachers", icon: Star, description: "View and provide constructive feedback on teachers.", permission: 'teachers:rate' },
  { label: "Review Lesson Plans", href: "/dashboard/lesson-planner", icon: FileText, description: "View and provide feedback on detailed lesson plans.", permission: 'lesson-plans:review' },
  { label: "Staff Records", href: "/dashboard/staff-records", icon: UsersRound, description: "Manage staff information and view their records.", permission: 'staff:view' },
  { label: "Academic Reports", href: "/dashboard/academics/exam-summary", icon: BarChart2, description: "Analyze school-wide academic performance.", permission: 'reports:school:view' },
  { label: "Disciplinary Records", href: "/dashboard/disciplinary", icon: Gavel, description: "Oversee and manage student disciplinary actions.", permission: 'disciplinary:view' },
  { label: "Counselling Records", href: "/dashboard/counselling", icon: HeartHandshake, description: "Access and review student counselling session logs.", permission: 'counselling:view' },
  { label: "OHS Incidents", href: "/dashboard/health-and-safety", icon: ShieldCheck, description: "Monitor and manage health and safety incident reports.", permission: 'health-safety:view' },
];

async function fetchSchoolTeachers(schoolId: string): Promise<StaffMember[]> {
    if (!db) throw new Error("Firestore is not configured.");
    const staffCollection = collection(db, 'staff');
    const q = query(staffCollection, where("schoolId", "==", schoolId), where("role", "==", "teacher"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
}

async function fetchSubmittedPlansForWeek(schoolId: string, weekNumber: number): Promise<WorkbookPlan[]> {
    if (!db) throw new Error("Firestore is not configured.");
    const plansCollection = collection(db, 'workbookPlans');
    const q = query(
        plansCollection, 
        where("schoolId", "==", schoolId), 
        where("week", "==", weekNumber.toString())
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        teacherId: doc.data().teacherId,
        week: doc.data().week,
    }));
}

async function fetchRolePermissions(role: Role): Promise<string[]> {
    if (!db) return [];
    try {
        const q = query(collection(db, 'permissionGroups'), where('name', '==', role));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const group = snapshot.docs[0].data();
            return group.permissions || [];
        }
    } catch (e) {
        console.error("Failed to fetch permissions for role:", role, e);
    }
    return [];
}


export function HeadTeacherClient() {
  const [missingSubmissions, setMissingSubmissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string|null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);

  const checkSubmissions = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
        const currentWeek = getWeek(new Date(), { weekStartsOn: 1 }); // Get current week number
        const [teachers, submittedPlans] = await Promise.all([
            fetchSchoolTeachers(id),
            fetchSubmittedPlansForWeek(id, currentWeek)
        ]);
        
        const submittedTeacherIds = new Set(submittedPlans.map(p => p.teacherId));
        const missing = teachers
            .filter(teacher => !submittedTeacherIds.has(teacher.id))
            .map(teacher => teacher.name);
            
        setMissingSubmissions(missing);
    } catch (error) {
        console.error("Failed to check submissions:", error);
        setMissingSubmissions([]); // Clear on error
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('schoolId');
    const role = localStorage.getItem('userRole') as Role | null;
    setUserRole(role);
    if (id) {
        setSchoolId(id);
        if (isFirebaseConfigured) {
          checkSubmissions(id);
        } else {
          setIsLoading(false);
        }
    } else {
        setIsLoading(false);
    }

    if(role) {
        fetchRolePermissions(role).then(setUserPermissions);
    }
  }, [checkSubmissions]);

  const visibleLinks = allHeadTeacherLinks.filter(link => 
    userRole === 'system-admin' || userPermissions.includes(link.permission)
  );

  return (
    <div className="p-8 space-y-8">
      <PageHeader 
        title="Head Teacher Dashboard"
        description="Your central hub for overseeing academic progress, staff management, and school operations."
      />
      
      <Card className="bg-amber-50 border-amber-300">
        <CardHeader>
            <CardTitle className="font-headline text-amber-800 flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Submission Status (Current Week)</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Checking for submissions...
                </div>
            ) : missingSubmissions.length > 0 ? (
                <div>
                    <p className="font-semibold text-destructive mb-2">The following teachers have not submitted their workbook plan for this week:</p>
                    <ul className="list-disc list-inside space-y-1">
                       {missingSubmissions.map(name => <li key={name}>{name}</li>)}
                    </ul>
                </div>
            ) : (
                 <p className="text-green-700 font-semibold">All teachers have submitted their workbook plans for the current week. Well done!</p>
            )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleLinks.map(item => {
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
  );
}
