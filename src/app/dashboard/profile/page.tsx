
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CircleUserRound, Briefcase, Building, Mail, KeyRound, Loader2, Eye, EyeOff, Fingerprint } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/page-header';


interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  schoolId?: string | null;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('userRole');
      const storedSchoolId = localStorage.getItem('schoolId');
      const storedUserId = localStorage.getItem('userId');
      
      let name = "Valued User";
      let email = "user@example.com";

      // This logic provides placeholder data for the demo.
      // In a real application, this would be fetched from a user context or API.
      if (storedRole) {
        switch (storedRole) {
          case 'teacher':
            name = "Logged-in Teacher";
            email = "teacher@example.com";
            break;
          case 'head-teacher':
            name = "Logged-in Head Teacher";
            email = "headteacher@example.com";
            break;
          case 'assistant-head-teacher':
            name = "Logged-in Assistant Head Teacher";
            email = "asst.head@example.com";
            break;
          case 'primary-admin':
            name = "Logged-in Primary Admin";
            email = "primaryadmin@example.com";
            break;
          case 'system-admin':
            name = "System Admin";
            email = "systemadmin@system.com";
            break;
          case 'librarian':
            name = "Logged-in Librarian";
            email = "librarian@example.com";
            break;
          default:
            // Use default name and email if role is unknown or not set
            break;
        }
      }

      setUserProfile({
        uid: storedUserId || 'N/A',
        name,
        email,
        role: storedRole || "N/A",
        schoolId: storedSchoolId,
      });
      setIsLoading(false);
    }
  }, []);

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({ variant: "destructive", title: "Error", description: "Please fill all password fields." });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "New password must be at least 6 characters long." });
      return;
    }
    
    if (newPassword === currentPassword) {
      toast({ variant: "destructive", title: "Error", description: "New password cannot be the same as the current password." });
      return;
    }

    setIsChangingPassword(true);
    // In a real app, you would call your backend to change the password
    console.log("Changing password for user:", userProfile?.email);
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({ title: "Success", description: "Your password has been changed successfully." });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setIsChangingPassword(false);
  };

  return (
    <div className="p-8 space-y-8">
        <PageHeader title="My Profile" description="Manage your account details and security settings." />
        <div className="grid gap-8 md:grid-cols-2">
            <Card className="shadow-xl rounded-lg">
                <CardHeader className="border-b">
                    <div className="flex flex-col items-center text-center">
                    <CircleUserRound className="h-20 w-20 text-primary mb-3" />
                    <CardTitle className="font-headline text-3xl text-primary">
                        {isLoading ? "Loading Profile..." : userProfile?.name || "My Profile"}
                    </CardTitle>
                    <CardDescription className="font-body text-muted-foreground">
                        Your account details and preferences.
                    </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                    {isLoading ? (
                    <div className="space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
                    </div>
                    ) : userProfile ? (
                    <>
                        <div className="flex items-center space-x-3 font-body">
                        <Fingerprint className="h-5 w-5 text-accent" />
                        <div>
                            <p className="text-xs text-muted-foreground">Authentication UID</p>
                            <p className="text-foreground font-medium">{userProfile.uid}</p>
                        </div>
                        </div>
                        <div className="flex items-center space-x-3 font-body">
                        <Mail className="h-5 w-5 text-accent" />
                        <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-foreground font-medium">{userProfile.email}</p>
                        </div>
                        </div>
                        <div className="flex items-center space-x-3 font-body">
                        <Briefcase className="h-5 w-5 text-accent" />
                        <div>
                            <p className="text-xs text-muted-foreground">Role</p>
                            <p className="text-foreground font-medium capitalize">{userProfile.role.replace('-', ' ')}</p>
                        </div>
                        </div>
                        {userProfile.schoolId && (
                        <div className="flex items-center space-x-3 font-body">
                            <Building className="h-5 w-5 text-accent" />
                            <div>
                            <p className="text-xs text-muted-foreground">School ID</p>
                            <p className="text-foreground font-medium">{userProfile.schoolId}</p>
                            </div>
                        </div>
                        )}
                        {!userProfile.schoolId && userProfile.role !== 'system-admin' && userProfile.role !== 'N/A' && (
                        <div className="flex items-center space-x-3 font-body">
                            <Building className="h-5 w-5 text-accent" />
                            <div>
                            <p className="text-xs text-muted-foreground">School ID</p>
                            <p className="text-foreground font-medium">N/A</p>
                            </div>
                        </div>
                        )}
                    </>
                    ) : (
                    <p className="font-body text-muted-foreground text-center">Could not load profile information.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-xl rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary flex items-center">
                        <KeyRound className="mr-2 h-6 w-6" />
                        Change Password
                    </CardTitle>
                    <CardDescription>
                        For security, use a strong, unique password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4 font-body">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                                <Input 
                                    id="currentPassword" 
                                    type={showCurrentPassword ? "text" : "password"} 
                                    value={currentPassword} 
                                    onChange={(e) => setCurrentPassword(e.target.value)} 
                                    placeholder="••••••••"
                                    required
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                                >
                                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input 
                                    id="newPassword" 
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                                    onClick={() => setShowNewPassword((prev) => !prev)}
                                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                                >
                                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input 
                                    id="confirmNewPassword" 
                                    type={showConfirmNewPassword ? "text" : "password"}
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                                    onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                                    aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </Button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isChangingPassword}>
                            {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isChangingPassword ? 'Changing...' : 'Change Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
