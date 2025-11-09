// src/components/layout/page-header.tsx
import React from 'react';

interface PageHeaderProps {
    title: string;
    description: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                <p className="text-lg text-muted-foreground">{description}</p>
            </div>
            {children && <div className="flex-shrink-0">{children}</div>}
        </div>
    );
}
