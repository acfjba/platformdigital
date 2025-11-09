// src/app/dashboard/platform-management/page.tsx
"use client";

import React from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { 
    Building, UserCog, ShieldCheck, Share2, DatabaseZap, Database, 
    Wifi, Wrench, KeyRound, ArrowDownUp, SlidersHorizontal
} from "lucide-react";
import { AdminLinkCard, type AdminLink } from '@/components/dashboard/admin-link-card';

const platformAdminLinks: AdminLink[] = [
    { href: "/dashboard/platform-management/school-management", icon: Building, title: "School Management", description: "View, create, and manage all schools on the platform." },
    { href: "/dashboard/user-management", icon: UserCog, title: "User & Invite Management", description: "Invite users and manage roles across all schools." },
    { href: "/dashboard/platform-management/permissions", icon: ShieldCheck, title: "Permissions", description: "Define roles and control user access to modules." },
    { href: "/dashboard/platform-management/module-control", icon: SlidersHorizontal, title: "Module Control", description: "Centrally enable or disable modules for all schools." },
    { href: "/dashboard/platform-management/data-schema", icon: Share2, title: "Data Schema", description: "Visualize the database structure and relationships." },
    { href: "/dashboard/platform-management/firestore-indexing", icon: ArrowDownUp, title: "Firestore Indexing", description: "View and manage required database indexes." },
    { href: "/dashboard/platform-management/firebase-config", icon: DatabaseZap, title: "Firebase & Seeding", description: "View Firebase connection status and seed sample data." },
    { href: "/dashboard/platform-management/platform-status", icon: Wifi, title: "Platform Status", description: "Monitor school connectivity and service health." },
    { href: "/dashboard/platform-management/software-licenses", icon: KeyRound, title: "Software Licenses", description: "Generate and manage software licenses for schools." },
    { href: "/dashboard/platform-management/user-data-export", icon: Database, title: "User Data Export", description: "Fetch and view combined user data from Auth and Firestore." },
    { href: "/dashboard/platform-management/maintenance", icon: Wrench, title: "App Maintenance", description: "Control platform-wide maintenance mode and notifications." },
];

export default function MasterDataPage() {
    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Master Data Management"
                description="Oversee the structure, relationships, and integrity of all platform data."
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {platformAdminLinks.map(link => (
                    <AdminLinkCard key={link.href} link={link} />
                ))}
            </div>
        </div>
    );
}
