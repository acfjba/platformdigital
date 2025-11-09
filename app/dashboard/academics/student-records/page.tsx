// src/app/dashboard/academics/student-records/page.tsx
import { PageHeader } from '@/components/layout/page-header';
import React from 'react';

export default function StudentRecordsPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="Student Records"
        description="Access and manage individual student records."
      />
      {/* Content for Student Records goes here */}
    </div>
  );
}
