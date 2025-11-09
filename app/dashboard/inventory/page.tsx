"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, AlertCircle, Loader2, Printer, Download, BarChart3, PlusCircle, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import type { EditablePrimaryInventoryItem } from '@/lib/schemas/primaryInventory';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/layout/page-header';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';


async function fetchPrimaryInventoryFromBackend(schoolId: string): Promise<EditablePrimaryInventoryItem[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const inventoryCollection = collection(db, 'schools', schoolId, 'primaryInventory');
  const snapshot = await getDocs(inventoryCollection);
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          itemName: data.itemName,
          quantity: String(data.quantity || ''),
          value: String(data.value || ''),
          remarks: data.remarks || '',
      }
  });
}

async function savePrimaryInventoryToBackend(items: EditablePrimaryInventoryItem[], schoolId: string, userId: string): Promise<{ success: boolean }> {
  if (!db) throw new Error("Firestore is not configured.");
  
  for (const item of items) {
    const docRef = doc(db, 'schools', schoolId, 'primaryInventory', item.id);
    const payload = {
        itemName: item.itemName,
        quantity: Number(item.quantity) || 0,
        value: Number(item.value) || 0,
        remarks: item.remarks,
        lastUpdatedBy: userId,
        updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: true });
  }
  return { success: true };
}

async function addPrimaryInventoryItem(item: Omit<EditablePrimaryInventoryItem, 'id'>, schoolId: string, userId: string) {
    if (!db) throw new Error("Firestore is not configured.");
    const collectionRef = collection(db, 'schools', schoolId, 'primaryInventory');
    const payload = {
        itemName: item.itemName,
        quantity: Number(item.quantity) || 0,
        value: Number(item.value) || 0,
        remarks: item.remarks,
        lastUpdatedBy: userId,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
    };
    return await addDoc(collectionRef, payload);
}

async function deletePrimaryInventoryItem(itemId: string, schoolId: string) {
    if (!db) throw new Error("Firestore is not configured.");
    await deleteDoc(doc(db, 'schools', schoolId, 'primaryInventory', itemId));
}


export default function PrimarySchoolInventoryPage() {
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<EditablePrimaryInventoryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const canEdit = useMemo(() => {
      if (!userRole) return false;
      if (userRole === 'system-admin') return true;
      const editableRoles = ['head-teacher', 'assistant-head-teacher', 'primary-admin'];
      return editableRoles.includes(userRole);
  }, [userRole]);
  
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const id = localStorage.getItem('schoolId');
    const uId = localStorage.getItem('userId');
    setUserRole(role);
    setSchoolId(id);
    setUserId(uId);
    if(!id) setIsLoading(false);
  }, []);

  const loadInventory = useCallback(async () => {
    if (!schoolId) {
        if(isFirebaseConfigured) setFetchError("School ID not found.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await fetchPrimaryInventoryFromBackend(schoolId);
      setInventoryItems(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load inventory data.");
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);
  
  const handleInputChange = (itemId: string, field: keyof EditablePrimaryInventoryItem, value: string) => {
    setInventoryItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          if (field === 'quantity' || field === 'value') {
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
              return { ...item, [field]: value };
            }
            return item;
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };
  
  const handleSaveInventory = async () => {
    if (!inventoryItems || !schoolId || !userId) {
      toast({ variant: "destructive", title: "No Data", description: "No inventory data, school ID, or user ID to save."});
      return;
    }
    if (!canEdit) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to save changes."});
      return;
    }
    setIsSaving(true);
    try {
      await savePrimaryInventoryToBackend(inventoryItems, schoolId, userId);
      toast({ title: "Primary Inventory Saved", description: `Primary school inventory has been saved successfully.`});
      await loadInventory();
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save inventory data."});
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    toast({ title: "Printing...", description: "Use your browser's print dialog to save as PDF or print." });
    window.print();
  };
  
  const handleAddItem = async () => {
    if (!newItemName.trim() || !schoolId || !userId) {
      toast({ variant: "destructive", title: "Cannot Add Item", description: "Item name, school ID, and user ID are required." });
      return;
    }
    const newItem: Omit<EditablePrimaryInventoryItem, 'id'> = {
      itemName: newItemName.trim(),
      quantity: '',
      value: '',
      remarks: '',
    };
    try {
      await addPrimaryInventoryItem(newItem, schoolId, userId);
      setNewItemName('');
      toast({ title: "Item Added", description: `"${newItem.itemName}" has been added to the list.`});
      await loadInventory();
    } catch(err) {
      toast({ variant: 'destructive', title: "Error", description: "Could not add the item." });
    }
  };

  const handleRemoveItem = async (itemIdToRemove: string) => {
    if (!schoolId) return;
    try {
      await deletePrimaryInventoryItem(itemIdToRemove, schoolId);
      toast({ title: "Item Removed", description: "The item has been removed from your inventory list." });
      await loadInventory();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not remove the item." });
    }
  };
  
  const calculateTotalValue = (item: EditablePrimaryInventoryItem) => {
      return (Number(item.quantity) || 0) * (Number(item.value) || 0);
  };

  return (
    <div className="p-8 space-y-8 printable-area">
        <PageHeader 
            title="Primary School Inventory"
            description="Manage fixed assets and major supplies for the entire primary school."
        />
        
        <Card className="shadow-xl rounded-lg w-full">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
              <div>
                <Link href="/dashboard/inventory/summary" passHref>
                    <Button variant="outline">
                        <BarChart3 className="mr-2 h-4 w-4" /> View Inventory Summary
                    </Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePrint} variant="outline" disabled={isLoading || isSaving}>
                    <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isSaving || isLoading || !canEdit}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                       {isSaving ? "Saving..." : "Save Inventory"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Inventory Update</AlertDialogTitle><AlertDialogDescription>You are about to save changes to the primary school inventory. Please ensure all records are correct.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleSaveInventory} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continue & Save"}</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {!canEdit && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Read-Only Mode</AlertTitle>
                    <AlertDescription>You do not have permission to edit this inventory. Changes cannot be saved.</AlertDescription>
                </Alert>
            )}

            {isLoading && <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>}
            {fetchError && <Card className="bg-destructive/10 border-destructive print:hidden"><CardHeader><CardTitle className="text-base text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error Loading Inventory</CardTitle></CardHeader><CardContent><p className="text-sm text-destructive">{fetchError}</p></CardContent></Card>}

            {!isLoading && !fetchError && (
              <div className="overflow-x-auto border rounded-lg">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow><TableHead className="font-bold w-[30%]">Item Name</TableHead><TableHead className="font-bold text-center">Quantity</TableHead><TableHead className="font-bold text-center">Value (per item)</TableHead><TableHead className="font-bold text-center">Total Value</TableHead><TableHead className="font-bold w-[25%]">Remarks</TableHead><TableHead className="font-bold text-center print:hidden">Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell><Input value={item.itemName} onChange={(e) => handleInputChange(item.id, 'itemName', e.target.value)} disabled={!canEdit} className="font-medium" /></TableCell>
                        <TableCell><Input type="text" className="text-center" value={item.quantity} onChange={(e) => handleInputChange(item.id, 'quantity', e.target.value)} disabled={!canEdit} /></TableCell>
                        <TableCell><Input type="text" className="text-center" value={item.value} onChange={(e) => handleInputChange(item.id, 'value', e.target.value)} disabled={!canEdit} /></TableCell>
                        <TableCell className="text-center align-middle font-bold">${calculateTotalValue(item).toFixed(2)}</TableCell>
                        <TableCell><Input value={item.remarks || ''} onChange={(e) => handleInputChange(item.id, 'remarks', e.target.value)} disabled={!canEdit} /></TableCell>
                        <TableCell className="text-center print:hidden">
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" disabled={!canEdit} title="Remove Item"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the item "{item.itemName}" from the inventory list.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveItem(item.id)} className="bg-destructive hover:bg-destructive/90">Yes, Remove Item</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {canEdit && (
                <Card className="mt-8 p-4 bg-muted/50 print:hidden">
                    <CardHeader className="p-2"><CardTitle className="text-lg">Add Custom Item</CardTitle></CardHeader>
                    <CardContent className="p-2 flex flex-col sm:flex-row items-center gap-4">
                        <Label htmlFor="new-item-name" className="sr-only">New Item Name</Label>
                        <Input id="new-item-name" placeholder="Enter new item name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="flex-grow" />
                        <Button onClick={handleAddItem} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add Item to List</Button>
                    </CardContent>
                </Card>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
