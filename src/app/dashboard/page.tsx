// src/app/dashboard/page.tsx
import React from 'react';
import Image from 'next/image';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Welcome to the Digital Platform"
        description="Your central hub for school management. Select a destination from the navigation."
      />

      <div className="relative w-full h-[400px] rounded-lg overflow-hidden shadow-2xl">
        <Image
          src="/school-platform-banner.png"
          alt="Primary School Digital Platform"
          layout="fill"
          objectFit="cover"
          className="z-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
        <div className="absolute bottom-0 left-0 p-8 z-20">
          <h2 className="text-4xl font-bold text-white mb-2 [text-shadow:1px_1px_4px_rgba(0,0,0,0.7)]">Empowering Education</h2>
          <p className="text-lg text-white/90 max-w-2xl [text-shadow:1px_1px_2px_rgba(0,0,0,0.7)]">
            This platform provides the tools you need to manage academics, student services, and school operations efficiently.
          </p>
           <Link href="/dashboard/instructions" passHref>
              <Button size="lg" className="mt-6">
                Read the Application Guide <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
        </div>
      </div>
    </div>
  );
}
