"use client";

import React from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { HealthInspectionClient } from "@/components/health-safety/health-safety-client";

export default function HealthSafetyPage() {
  return (
    <div className="p-8 space-y-8">
       <PageHeader
        title="OHS Incident Reporting"
        description="Create and search for Occupational Health & Safety incident records."
      />
      <HealthInspectionClient />
    </div>
  );
}
    