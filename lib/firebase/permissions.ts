// src/lib/firebase/permissions.ts
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { PermissionGroup } from '@/lib/schemas/permissions';


export async function fetchPermissionGroups(): Promise<PermissionGroup[]> {
    if (!db) throw new Error("Firestore is not configured.");
    const permissionGroupsCollection = collection(db, 'permissionGroups');
    const snapshot = await getDocs(permissionGroupsCollection);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            users: data.users || [],
            permissions: data.permissions || [],
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as PermissionGroup;
    });
}

export async function createPermissionGroup(name: string, permissions: string[]): Promise<string> {
    if (!db) throw new Error("Firestore is not configured.");
    const newGroupRef = doc(db, 'permissionGroups', name.toLowerCase().replace(/\s+/g, '-'));
    await setDoc(newGroupRef, {
        name,
        users: [],
        permissions, // Use the provided permissions
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return newGroupRef.id;
}

export async function updatePermissionGroup(id: string, data: Partial<Omit<PermissionGroup, 'id' | 'name' | 'createdAt'>>): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    const groupRef = doc(db, 'permissionGroups', id);
    const dataToUpdate: any = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(groupRef, dataToUpdate);
}

export async function deletePermissionGroup(id: string): Promise<void> {
    if (!db) throw new Error("Firestore is not configured.");
    const groupRef = doc(db, 'permissionGroups', id);
    await deleteDoc(groupRef);
}
