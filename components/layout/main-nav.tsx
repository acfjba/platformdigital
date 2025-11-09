
// src/components/layout/main-nav.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { 
    GraduationCap, UserCog, BookOpen, ClipboardCheck, LineChart, HeartHandshake, Gavel, 
    Warehouse, Library, ShieldCheck, UsersRound, CalendarCheck, Settings, Home, HelpCircle, 
    Database, Mail, Building, Wifi, DatabaseZap, KeyRound, LayoutDashboard, Upload, FolderArchive, Share2, Wrench, SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/schemas/user';
import type { ModulePermissions } from '@/lib/schemas/school';

const dashboardLinks = [
  { id: 'teacherDashboard', href: "/dashboard/teacher-dashboard", icon: LayoutDashboard, title: "Teacher Dashboard", description: "Your personalized checklist and hub." },
  { id: 'primaryAdminDashboard', href: "/dashboard/primary-admin", icon: UserCog, title: "Primary Admin", description: "Manage all school operations." },
  { id: 'headTeacherDashboard', href: "/dashboard/head-teacher", icon: GraduationCap, title: "Head Teacher", description: "Oversee teacher submissions and reports." },
];

const academicsLinks = [
  { id: 'academics', href: "/dashboard/academics", icon: GraduationCap, title: "Academics Hub", description: "Manage lesson plans & inventory." },
  { id: 'lessonPlanner', href: "/dashboard/workbook-plan", icon: BookOpen, title: "Teacher Workbook Plan", description: "Create and submit your weekly workbook plans." },
  { id: 'lessonPlannerManual', href: "/dashboard/lesson-planner", icon: BookOpen, title: "Lesson Planner", description: "Manually create detailed lesson plans." },
  { id: 'examResults', href: "/dashboard/academics/exam-results", icon: ClipboardCheck, title: "Exam Results", description: "Record and manage student exam results." },
  { id: 'examSummary', href: "/dashboard/academics/exam-summary", icon: LineChart, title: "Exam Summary", description: "View aggregated exam performance." },
];

const studentServicesLinks = [
  { id: 'counselling', href: "/dashboard/counselling", icon: HeartHandshake, title: "Counselling Records", description: "Log and track student counselling sessions." },
  { id: 'disciplinary', href: "/dashboard/disciplinary", icon: Gavel, title: "Disciplinary Records", description: "Maintain a log of all student disciplinary incidents." },
];

const operationsLinks = [
    { id: 'staffRecords', href: "/dashboard/user-management", icon: UsersRound, title: "Staff & User Management", description: "Manage all staff and invite new users." },
    { id: 'inventory', href: "/dashboard/inventory", icon: Warehouse, title: "Primary Inventory", description: "Track and forecast school assets." },
    { id: 'library', href: "/dashboard/library", icon: Library, title: "Library Service", description: "Manage book inventory and issued items." },
    { id: 'healthSafety', href: "/dashboard/health-and-safety", icon: ShieldCheck, title: "Health & Safety", description: "Manage OHS protocols and incidents." },
    { id: 'schoolEmailSettings', href: "/dashboard/operations/email-settings", icon: Mail, title: "School Email Settings", description: "Configure the email server for your school." },
    { id: 'infodatafeed', href: "/dashboard/operations/infodatafeed", icon: Upload, title: "Info Data Feed", description: "Bulk upload data from Excel/CSV files." },
    { id: 'documentVault', href: "/dashboard/document-vault", icon: FolderArchive, title: "My Document Vault", description: "Access your saved forms and reports." },
];

const masterDataLinks = [
    { href: "/dashboard/platform-management/school-management", icon: Building, title: "School Management", description: "View, create, and manage all schools." },
    { href: "/dashboard/user-management", icon: UserCog, title: "User & Invite Management", description: "Invite users and manage roles across all schools." },
    { href: "/dashboard/platform-management/permissions", icon: ShieldCheck, title: "Permissions", description: "Manage user permission groups." },
    { href: "/dashboard/platform-management/module-control", icon: SlidersHorizontal, title: "Module Control", description: "Centrally enable or disable modules for all schools." },
    { href: "/dashboard/platform-management/data-schema", icon: Share2, title: "Data Schema", description: "Visualize data structure and relationships." },
    { href: "/dashboard/platform-management/firebase-config", icon: DatabaseZap, title: "Firebase Status", description: "View Firebase status and seed data." },
    { href: "/dashboard/platform-management/platform-status", icon: Wifi, title: "Platform Status", description: "Monitor school connectivity." },
    { href: "/dashboard/platform-management/maintenance", icon: Wrench, title: "App Maintenance", description: "Control platform-wide maintenance notices." },
    { href: "/dashboard/platform-management/user-data-export", icon: Database, title: "User Data Export", description: "Fetch and view combined user data." },
    { href: "/dashboard/platform-management/software-licenses", icon: KeyRound, title: "Software Licenses", description: "Manage yearly licenses for software." },
];


export function MainNav() {
  const router = useRouter();
  const [userRole, setUserRole] = React.useState<Role | null>(null);
  const [enabledModules, setEnabledModules] = React.useState<Partial<ModulePermissions>>({});

  React.useEffect(() => {
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);
    const modules = JSON.parse(localStorage.getItem('schoolEnabledModules') || '{}');
    setEnabledModules(modules);
  }, []);

  const isModuleEnabled = (moduleId: keyof ModulePermissions) => {
      if (userRole === 'system-admin') return true;
      return enabledModules[moduleId] !== false;
  };
  
  const visibleDashboardLinks = dashboardLinks.filter(link => isModuleEnabled(link.id as keyof ModulePermissions));
  
  return (
    <div className="mr-4 hidden md:flex">
      <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
        <GraduationCap className="h-6 w-6" />
        <span className="hidden font-bold sm:inline-block">Digital Platform</span>
      </Link>
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link href="/dashboard" legacyBehavior passHref>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "flex items-center")}>
                <Home className="mr-2 h-4 w-4" />
                Home
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          {visibleDashboardLinks.length > 0 && (
            <NavigationMenuItem>
                <NavigationMenuTrigger>Dashboards</NavigationMenuTrigger>
                <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {visibleDashboardLinks.map((link) => (
                    <ListItem key={link.title} href={link.href} title={link.title} icon={link.icon}>
                        {link.description}
                    </ListItem>
                    ))}
                </ul>
                </NavigationMenuContent>
            </NavigationMenuItem>
          )}

          {isModuleEnabled('academics') && (
            <NavigationMenuItem>
                <NavigationMenuTrigger>Academics</NavigationMenuTrigger>
                <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {academicsLinks.filter(link => {
                        if (link.id === 'lessonPlanner' || link.id === 'lessonPlannerManual') return isModuleEnabled('lessonPlanner');
                        if (link.id === 'examResults' || link.id === 'examSummary') return isModuleEnabled('examResults');
                        return true;
                    }).map((link) => (
                    <ListItem key={link.title} href={link.href} title={link.title} icon={link.icon}>
                        {link.description}
                    </ListItem>
                    ))}
                </ul>
                </NavigationMenuContent>
            </NavigationMenuItem>
          )}

          {isModuleEnabled('studentServices') && (
            <NavigationMenuItem>
                <NavigationMenuTrigger>Student Services</NavigationMenuTrigger>
                <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {studentServicesLinks.map((link) => (
                    <ListItem key={link.title} href={link.href} title={link.title} icon={link.icon}>
                        {link.description}
                    </ListItem>
                    ))}
                </ul>
                </NavigationMenuContent>
            </NavigationMenuItem>
          )}

          {isModuleEnabled('operations') && (
            <NavigationMenuItem>
                <NavigationMenuTrigger>Operations</NavigationMenuTrigger>
                <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {operationsLinks.map((link) => (
                    <ListItem key={link.title} href={link.href} title={link.title} icon={link.icon}>
                        {link.description}
                    </ListItem>
                    ))}
                </ul>
                </NavigationMenuContent>
            </NavigationMenuItem>
          )}

           {userRole === 'system-admin' && (
             <NavigationMenuItem>
                <NavigationMenuTrigger>Master Data</NavigationMenuTrigger>
                <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {masterDataLinks.map((link) => (
                        <ListItem key={link.title} href={link.href} title={link.title} icon={link.icon}>
                            {link.description}
                        </ListItem>
                        ))}
                    </ul>
                </NavigationMenuContent>
            </NavigationMenuItem>
           )}
           <NavigationMenuItem>
              <Link href="/dashboard/school-info" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  School Info
                </NavigationMenuLink>
              </Link>
          </NavigationMenuItem>
           <NavigationMenuItem>
              <Link href="/dashboard/instructions" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Instructions
                </NavigationMenuLink>
              </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'> & { icon: React.ElementType }
>(({ className, title, children, icon: Icon, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-x-2">
            <Icon className="h-5 w-5 text-primary" />
            <div className="text-sm font-medium leading-none">{title}</div>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';
