// src/components/primary-admin-client.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  UsersRound,
  BarChart2,
  Warehouse,
  ShieldCheck,
  Gavel,
  HeartHandshake,
  LineChart,
  Boxes
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

interface AdminLinkItem {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const adminLinks: AdminLinkItem[] = [
  { label: "Staff Records", href: "/dashboard/staff-records", icon: UsersRound, description: "Manage all staff members, roles, and permissions." },
  { label: "Academic Reports", href: "/dashboard/academics/exam-summary", icon: LineChart, description: "View aggregated student exam performance." },
  { label: "Student Disciplinary", href: "/dashboard/disciplinary", icon: Gavel, description: "Log and track all student disciplinary incidents." },
  { label: "Student Counselling", href: "/dashboard/counselling", icon: HeartHandshake, description: "Access confidential student counselling records." },
  { label: "Primary Inventory", href: "/dashboard/inventory", icon: Warehouse, description: "Track and manage all fixed school assets." },
  { label: "Classroom Inventory", href: "/dashboard/academics/classroom-inventory", icon: Boxes, description: "Oversee and manage classroom-level supplies." },
  { label: "Custom Reporting", href: "/dashboard/reporting", icon: BarChart2, description: "Build and export custom reports for the school." },
  { label: "Health & Safety", href: "/dashboard/health-and-safety", icon: ShieldCheck, description: "Manage school safety protocols and OHS incidents." },
];

export function PrimaryAdminClient() {
  return (
    <div className="p-8 space-y-8">
      <PageHeader 
        title="Primary Admin Dashboard"
        description="Your central hub for managing all school operations and administrative tasks."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminLinks.map(item => {
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
