
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2, Gem, UserCircle, Eye, AlertTriangle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/schemas/user';
import Link from 'next/link';
import { signInWithEmailAndPassword, getAuth, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { School } from '@/lib/schemas/school';
import type { MaintenanceSettings } from '@/lib/schemas/maintenance';


const MOCK_USERS: { [key in Role | 'default']: { email: string, password?: string, name?:string } } = {
    'system-admin': { email: 'systemadmin@system.com', password: 'admin12345' },
    'primary-admin': { email: 'navolaudistrictschool@yahoo.com', password: '2009@nav' },
    'head-teacher': { email: 'rosabatina3@gmail.com', password: '65486@nav' },
    'assistant-head-teacher': { email: 'asst.head@example.com', password: 'password123' },
    'teacher': { email: 'lureqeleticia@gmail.com', password: '82739@nav' },
    'kindergarten': { email: 'kinder.teacher@example.com', password: 'password123' },
    'librarian': { email: 'librarian@example.com', password: 'password123' },
    'default': { email: '' },
};


export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role>('system-admin');
    const [email, setEmail] = useState(MOCK_USERS['system-admin'].email);
    const [password, setPassword] = useState(MOCK_USERS['system-admin'].password || '');
    const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings | null>(null);

    useEffect(() => {
        async function checkMaintenanceMode() {
            if (!isFirebaseConfigured || !db) return;
            try {
                const settingsDoc = await getDoc(doc(db, 'platformSettings', 'maintenance'));
                if (settingsDoc.exists()) {
                    setMaintenanceSettings(settingsDoc.data() as MaintenanceSettings);
                }
            } catch (error) {
                console.error("Could not fetch maintenance settings:", error);
            }
        }
        checkMaintenanceMode();
    }, []);

    const handleRoleChange = (role: Role) => {
        setSelectedRole(role);
        setEmail(MOCK_USERS[role]?.email || '');
        setPassword(MOCK_USERS[role]?.password || '');
    };
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!isFirebaseConfigured || !db) {
            toast({
                variant: 'destructive',
                title: 'Configuration Error',
                description: 'Firebase is not configured. Cannot log in.',
            });
            setIsLoading(false);
            return;
        }

        try {
            const auth = getAuth();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const idTokenResult = await user.getIdTokenResult(true); 
            
            const userRole = idTokenResult.claims.role as Role;
            const schoolId = idTokenResult.claims.schoolId as string;
            
            if (!userRole) {
                throw new Error("User role not found in authentication token. Please ensure the user has been set up correctly by an administrator.");
            }
            
            // Allow system-admin to bypass maintenance mode
            if (maintenanceSettings?.isEnabled && userRole !== 'system-admin') {
                toast({
                    variant: 'destructive',
                    title: 'Login Disabled',
                    description: 'The platform is currently in maintenance mode.',
                    duration: 5000,
                });
                setIsLoading(false);
                return;
            }

            const userName = user.displayName || 'User';

            let schoolSettings: Partial<School> = {};
            if (schoolId && schoolId !== 'global') {
                const schoolDocRef = doc(db, 'schools', schoolId);
                const schoolDocSnap = await getDoc(schoolDocRef);
                if (schoolDocSnap.exists()) {
                    schoolSettings = schoolDocSnap.data();
                }
            }

            localStorage.setItem('userRole', userRole);
            localStorage.setItem('schoolId', schoolId);
            localStorage.setItem('userName', userName);
            localStorage.setItem('userEmail', user.email || '');
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('schoolEnabledModules', JSON.stringify(schoolSettings.enabledModules || {}));

            toast({
                title: "Login Successful",
                description: `Logged in as ${userName}. Redirecting...`,
            });

            switch (userRole) {
                case 'system-admin':
                    router.push('/dashboard/platform-management');
                    break;
                case 'primary-admin':
                    router.push('/dashboard/primary-admin');
                    break;
                case 'head-teacher':
                case 'assistant-head-teacher':
                    router.push('/dashboard/head-teacher');
                    break;
                case 'teacher':
                case 'kindergarten':
                case 'librarian':
                    router.push('/dashboard/teacher-dashboard');
                    break;
                default:
                    router.push('/dashboard');
            }
        } catch (error) {
            console.error("Login failed:", error);
            const errorMessage = error instanceof Error ? error.message : 'Invalid email or password. Please try again.';
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: errorMessage,
            });
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-muted/40 min-h-screen flex flex-col">
             <header className="sticky top-0 z-40 w-full border-b bg-background">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Gem className="h-6 w-6 text-primary"/>
                        <h1 className="text-xl font-bold text-foreground">Digital Platform</h1>
                    </div>
                     <Link href="/presentation">
                        <Button variant="outline">
                           View Presentation
                        </Button>
                    </Link>
                </div>
            </header>
            
            <main className="flex flex-col items-center justify-center flex-1 w-full p-4">
                {maintenanceSettings?.isEnabled ? (
                    <Card className="w-full max-w-lg bg-card shadow-lg text-center">
                         <CardHeader>
                            <div className="flex justify-center mb-4">
                                <Wrench className="h-12 w-12 text-destructive" />
                            </div>
                            <CardTitle className="text-2xl text-destructive">{maintenanceSettings.title || "Under Maintenance"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{maintenanceSettings.message || "The platform is currently unavailable. Please check back soon."}</p>
                        </CardContent>
                         <CardFooter>
                            <p className="text-xs text-muted-foreground w-full text-center">
                                System administrators can still log in.
                            </p>
                        </CardFooter>
                    </Card>
                ) : (
                    <Card className="w-full max-w-md bg-card shadow-lg">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Welcome Back</CardTitle>
                            <CardDescription>Select your user role to continue.</CardDescription>
                        </CardHeader>
                        {!isFirebaseConfigured && (
                            <div className="px-6 pb-4">
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Firebase Not Connected</AlertTitle>
                                    <AlertDescription>
                                        The application cannot connect to Firebase. Login is disabled. Please configure your environment variables.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                        <form onSubmit={handleLogin}>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="role-select">Select User Role</Label>
                                    <Select value={selectedRole} onValueChange={(value) => handleRoleChange(value as Role)}>
                                        <SelectTrigger id="role-select" className="w-full">
                                            <div className="flex items-center gap-2">
                                                <UserCircle className="h-4 w-4 text-muted-foreground" />
                                                <SelectValue placeholder="Select a user role" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(MOCK_USERS).filter(r => r !== 'default').map(role => (
                                                <SelectItem key={role} value={role}>
                                                    {role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="systemadmin@system.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full" disabled={isLoading || !isFirebaseConfigured}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                                    {isLoading ? "Logging in..." : "Login"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}
            </main>
        </div>
    );
}
