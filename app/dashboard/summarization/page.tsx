// src/app/dashboard/summarization/page.tsx
import { PageHeader } from '@/components/layout/page-header';
import React from 'react';

export default function AiSummarizationPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="AI Summarization"
        description="Use AI to summarize documents."
      />
      {/* Content for AI Summarization goes here */}
    </div>
  );
}
