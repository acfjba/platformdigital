// src/components/dashboard/platform-management-client.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    UserCog, Building, DatabaseZap, Settings, Wifi,
    GraduationCap,
    ShieldCheck,
    Database,
    KeyRound,
    Users,
    Share2,
    Wrench
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


interface AdminLink {
    href: string;
    icon: React.ElementType;
    title: string;
    description: string;
}

const platformAdminLinks: AdminLink[] = [
    { href: "/dashboard/platform-management/school-management", icon: Building, title: "School Management", description: "View, create, and manage all schools." },
    { href: "/dashboard/user-management", icon: UserCog, title: "User & Invite Management", description: "Invite users and manage roles across all schools." },
    { href: "/dashboard/platform-management/permissions", icon: ShieldCheck, title: "Permissions", description: "Define roles and control access." },
    { href: "/dashboard/platform-management/data-schema", icon: Share2, title: "Data Schema", description: "Visualize data structure and relationships." },
    { href: "/dashboard/platform-management/firebase-config", icon: DatabaseZap, title: "Firebase Status", description: "View Firebase status and seed data." },
    { href: "/dashboard/platform-management", icon: Database, title: "Master Data", description: "Visualize data structure and manage snapshots." },
    { href: "/dashboard/platform-management/platform-status", icon: Wifi, title: "Platform Status", description: "Monitor school connectivity." },
    { href: "/dashboard/platform-management/maintenance", icon: Wrench, title: "App Maintenance", description: "Control platform-wide maintenance notices." },
    { href: "/dashboard/platform-management/app-settings", icon: Settings, title: "App Settings", description: "Configure system-wide settings." },
    { href: "/dashboard/platform-management/user-data-export", icon: Database, title: "User Data Export", description: "Fetch and view combined user data." },
    { href: "/dashboard/platform-management/software-licenses", icon: KeyRound, title: "Software Licenses", description: "Manage yearly licenses for software." },
];

const otherLinks: AdminLink[] = [
    { href: "/dashboard/primary-admin", icon: UserCog, title: "Primary Admin Dashboard", description: "Switch to the Primary Admin view." },
    { href: "/dashboard/head-teacher", icon: GraduationCap, title: "Head Teacher Dashboard", description: "Switch to the Head Teacher view." },
    { href: "/dashboard/teacher-dashboard", icon: Users, title: "Teacher Dashboard", description: "Switch to the Teacher view." },
];


const AdminLinkCard = ({ link }: { link: AdminLink }) => {
  const Icon = link.icon;
  return (
    <Card className="flex flex-col">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
                <Icon className="h-6 w-6 text-primary flex-shrink-0" />
                {link.title}
            </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">{link.description}</p>
        </CardContent>
        <CardFooter>
            <Link href={link.href} passHref legacyBehavior>
                <Button asChild className="w-full">
                    <a>Go to {link.title}</a>
                </Button>
            </Link>
        </CardFooter>
    </Card>
  );
};

const Section = ({ title, links }: { title: string, links: AdminLink[] }) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-headline font-bold text-primary">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {links.map(link => (
                <AdminLinkCard key={link.href} link={link} />
            ))}
        </div>
    </div>
);


export function PlatformManagementClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = () => {
      const role = localStorage.getItem('userRole');
      
      if (role === null && hasAccess === null) {
        const timeoutId = setTimeout(checkAccess, 100);
        return () => clearTimeout(timeoutId);
      }

      if (role === 'system-admin') {
        setHasAccess(true);
      } else {
        setHasAccess(false);
        if (role) {
            toast({
              variant: 'destructive',
              title: 'Access Denied',
              description: 'You do not have permission to view this page.'
            });
            router.push('/dashboard');
        }
      }
    };
    
    checkAccess();

  }, [router, toast, hasAccess]);
  
  if (hasAccess === null) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
      return (
        <div className="flex justify-center items-center min-h-[50vh]">
          <p>Redirecting...</p>
        </div>
      );
  }

  return (
    <div className="space-y-8">
        <PageHeader 
            title="Platform Management"
            description="The central hub for system administrators to manage all aspects of the application."
        />
        <div className="space-y-12">
            <Section title="Global Administration Tools" links={platformAdminLinks} />
            <Separator />
            <Section title="View Other Dashboards" links={otherLinks} />
        </div>
    </div>
  );
}
