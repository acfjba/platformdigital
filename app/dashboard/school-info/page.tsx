// src/app/dashboard/school-info/page.tsx
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Newspaper, School, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SchoolInfoHubPage() {
  const links = [
    { 
      href: "/dashboard/school-info/program", 
      icon: Calendar, 
      title: "Daily & Weekly Program", 
      description: "View the school's official timetable, event schedules, and weekly programs." 
    },
    { 
      href: "/dashboard/school-info/news", 
      icon: Newspaper, 
      title: "Urgent News & Announcements", 
      description: "Check for important updates, urgent notices, and school-wide announcements." 
    },
    { 
      href: "/dashboard/school-info/about", 
      icon: School, 
      title: "About The School", 
      description: "Learn about the school's history, mission, and view contact information." 
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="School Information Hub"
        description="Your central place for school-wide announcements, schedules, and information."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {links.map(link => (
          <Card key={link.href} className="shadow-lg hover:shadow-xl transition-shadow rounded-lg flex flex-col">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary flex items-center">
                <link.icon className="mr-3 h-6 w-6" />
                {link.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              <p className="text-muted-foreground mb-4 flex-grow">{link.description}</p>
              <Link href={link.href} passHref>
                <Button className="w-full mt-auto">
                  View {link.title} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}