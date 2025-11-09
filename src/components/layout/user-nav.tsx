// src/components/layout/user-nav.tsx
'use client';

import { LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';

export function UserNav() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [initials, setInitials] = useState('U');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem('userName');
      const email = localStorage.getItem('userEmail');
      setUserName(name || 'User');
      setUserEmail(email || 'user@example.com');

      if (name) {
        const nameParts = name.split(' ');
        const firstInitial = nameParts[0] ? nameParts[0][0] : '';
        const lastInitial = nameParts.length > 1 && nameParts[nameParts.length - 1] ? nameParts[nameParts.length - 1][0] : '';
        setInitials(`${firstInitial}${lastInitial}`.toUpperCase());
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('schoolId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
           <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              {initials}
           </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
