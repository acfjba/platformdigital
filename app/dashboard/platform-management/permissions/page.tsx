// src/app/dashboard/platform-management/permissions/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2, Users, KeyRound, AlertCircle, Shield, Check, UserCog, GraduationCap, BookUser, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PermissionGroup } from '@/lib/schemas/permissions';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { fetchPermissionGroups, createPermissionGroup, updatePermissionGroup, deletePermissionGroup } from '@/lib/firebase/permissions';
import { Separator } from '@/components/ui/separator';


const ALL_PERMISSIONS = {
    "Dashboard Access": [
        { id: 'dashboard:primary-admin:view', label: 'Access Primary Admin Dashboard' },
        { id: 'dashboard:head-teacher:view', label: 'Access Head Teacher Dashboard' },
        { id: 'dashboard:teacher:view', label: 'Access Teacher Panel' },
    ],
    "User Management": [
        { id: 'users:view', label: 'View Users List' },
        { id: 'users:create', label: 'Create/Invite New Users' },
        { id: 'users:edit', label: 'Edit User Details' },
        { id: 'users:delete', label: 'Delete Users' },
    ],
    "Role & Permission Management": [
        { id: 'roles:assign', label: 'Assign Roles to Users' },
        { id: 'permissions:manage', label: 'Manage Permission Groups' },
    ],
    "Content Management": [
        { id: 'school-info:edit', label: 'Edit School Info (News, Program, About)' },
    ],
    "Staff Records": [
        { id: 'staff:view', label: 'View Staff Records' },
        { id: 'staff:add', label: 'Add Staff Records' },
        { id: 'staff:edit', label: 'Edit Staff Records' },
        { id: 'staff:delete', label: 'Delete Staff Records' },
    ],
    "Academics": [
        { id: 'lesson-plans:submit', label: 'Create/Submit Lesson Plans' },
        { id: 'lesson-plans:review', label: 'Review/Approve Lesson Plans' },
        { id: 'exam-results:view', label: 'View Exam Results' },
        { id: 'exam-results:add', label: 'Add/Edit Exam Results' },
        { id: 'exam-results:delete', label: 'Delete Exam Results' },
    ],
    "Student Services": [
        { id: 'disciplinary:view', label: 'View Disciplinary Records' },
        { id: 'disciplinary:add', label: 'Add/Edit Disciplinary Records' },
        { id: 'disciplinary:delete', label: 'Delete Disciplinary Records' },
        { id: 'counselling:view', label: 'View Counselling Records' },
        { id: 'counselling:add', label: 'Add/Edit Counselling Records' },
        { id: 'counselling:delete', label: 'Delete Counselling Records' },
    ],
    "Inventory & Operations": [
        { id: 'inventory:primary:view', label: 'View Primary Inventory' },
        { id: 'inventory:primary:edit', label: 'Edit Primary Inventory' },
        { id: 'inventory:classroom:view', label: 'View Classroom Inventory' },
        { id: 'inventory:classroom:edit', label: 'Edit Classroom Inventory' },
        { id: 'library:view', label: 'View Library Catalogue' },
        { id: 'library:edit', label: 'Edit Library Catalogue' },
        { id: 'library:transact', label: 'Issue/Return Books' },
        { id: 'operations:master-data:upload', label: 'Upload Master Data' },
        { id: 'operations:email-settings:manage', label: 'Manage School Email Settings' },
    ],
     "Reporting": [
        { id: 'reports:school:view', label: 'View School-wide Reports' },
    ]
};


export default function PermissionsPage() {
    const { toast } = useToast();
    const [groups, setGroups] = useState<PermissionGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State for the form inside the dialog
    const [groupName, setGroupName] = useState('');
    const [groupPermissions, setGroupPermissions] = useState<string[]>([]);

    const loadGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!isFirebaseConfigured) throw new Error("Firebase not configured.");
            const fetchedGroups = await fetchPermissionGroups();
            setGroups(fetchedGroups);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch permission groups.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    const handleOpenModal = (group: PermissionGroup | null) => {
        setEditingGroup(group);
        setGroupName(group?.name || '');
        setGroupPermissions(group?.permissions || []);
        setIsModalOpen(true);
    };

    const handlePermissionToggle = (permissionId: string) => {
        setGroupPermissions(prev =>
            prev.includes(permissionId)
                ? prev.filter(p => p !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSubmit = async () => {
        if (!groupName) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Group name cannot be empty.' });
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingGroup) {
                await updatePermissionGroup(editingGroup.id, { permissions: groupPermissions });
                toast({ title: 'Group Updated', description: `Permissions for ${groupName} have been updated.` });
            } else {
                await createPermissionGroup(groupName, groupPermissions);
                toast({ title: 'Group Created', description: `New group "${groupName}" has been created with ${groupPermissions.length} permissions.` });
            }
            await loadGroups();
            setIsModalOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save permission group.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (groupId: string) => {
        if (!window.confirm("Are you sure you want to delete this permission group? This action cannot be undone.")) return;
        
        try {
            await deletePermissionGroup(groupId);
            toast({ title: 'Group Deleted' });
            await loadGroups();
        } catch(err) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete group.' });
        }
    }
    
    const filteredGroups = useMemo(() => {
        return groups.filter(group => 
            group.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [groups, searchTerm]);
    
    const getIconForRole = (roleName: string) => {
        const lowerCaseRole = roleName.toLowerCase();
        if (lowerCaseRole.includes('admin')) return UserCog;
        if (lowerCaseRole.includes('head')) return GraduationCap;
        if (lowerCaseRole.includes('librarian')) return BookUser;
        if (lowerCaseRole.includes('teacher')) return Users;
        return Shield;
    };

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Permissions Management"
                description="Create and manage permission groups to control user access."
            >
                <Button onClick={() => handleOpenModal(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
                </Button>
            </PageHeader>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Permission Groups</CardTitle>
                            <CardDescription>A list of all permission groups in the system.</CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Filter by group name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                         </div>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Group Name</TableHead>
                                        <TableHead>Assigned Users</TableHead>
                                        <TableHead>Permissions Count</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredGroups.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                No permission groups found.
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredGroups.map(group => {
                                        const Icon = getIconForRole(group.name);
                                        return (
                                            <TableRow key={group.id}>
                                                <TableCell className="font-semibold flex items-center gap-2">
                                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                                    {group.name}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{group.users.length} user(s)</span>
                                                        <span className="text-xs text-muted-foreground truncate max-w-xs">{group.users.join(', ') || 'No users assigned'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{group.permissions.length} permissions</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(group)}><Edit className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingGroup ? `Edit "${editingGroup.name}"` : 'Create New Permission Group'}</DialogTitle>
                        <DialogDescription>
                            Define a group name and assign the permissions it should have. User assignment is managed separately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="space-y-2">
                            <Label htmlFor="groupName">Group Name</Label>
                            <Input 
                                id="groupName" 
                                placeholder="e.g., Head of Department" 
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                disabled={!!editingGroup} // Don't allow name changes for simplicity
                            />
                        </div>

                        <Separator />
                        
                        {Object.entries(ALL_PERMISSIONS).map(([category, perms]) => (
                            <div key={category} className="space-y-3">
                                <h4 className="font-semibold text-md text-primary">{category}</h4>
                                <div className="border rounded-md p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {perms.map(permission => (
                                    <div key={permission.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={permission.id}
                                            checked={groupPermissions.includes(permission.id)}
                                            onChange={() => handlePermissionToggle(permission.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <Label htmlFor={permission.id} className="font-normal">{permission.label}</Label>
                                    </div>
                                ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {editingGroup ? 'Save Changes' : 'Create Group'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
