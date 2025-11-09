
// src/components/dashboard/admin-link-card.tsx
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface AdminLink {
    href: string;
    icon: React.ElementType;
    title: string;
    description: string;
}

interface AdminLinkCardProps {
  link: AdminLink;
}

export const AdminLinkCard: React.FC<AdminLinkCardProps> = ({ link }) => {
  const Icon = link.icon;

  // If for any reason the icon is not a valid component, don't render the card.
  // This prevents the entire page from crashing due to a single misconfigured link.
  if (!Icon) {
    return null;
  }

  return (
    <Card className="flex flex-col">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
                <Icon className="h-6 w-6 text-primary flex-shrink-0" />
                {link.title}
            </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">{link.description}</p>
        </CardContent>
        <CardFooter>
            <Link href={link.href} passHref legacyBehavior>
              <a className="w-full">
                <Button className="w-full">
                    Go to {link.title}
                </Button>
              </a>
            </Link>
        </CardFooter>
    </Card>
  );
};
