// src/app/dashboard/user-management/page.tsx
import React, { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { UserManagementClient } from '@/components/dashboard/user-management-client';
import { Skeleton } from '@/components/ui/skeleton';

function UserManagementFallback() {
    return (
        <div className="space-y-8">
            <PageHeader title="Invite & Manage Users" description="Add new users, manage existing user roles and details." />
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
}

export default function UserManagementPage() {
    return (
        <div className="p-8 space-y-8">
            <Suspense fallback={<UserManagementFallback />}>
                <UserManagementClient />
            </Suspense>
        </div>
    );
}
