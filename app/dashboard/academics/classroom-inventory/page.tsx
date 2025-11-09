
// src/app/dashboard/academics/classroom-inventory/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Boxes, Save, AlertCircle, Loader2, Printer, Download, BarChart3, PlusCircle, Trash2, AlertTriangle, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/layout/page-header';
import type { ClassroomInventory, EditableInventoryItem } from '@/lib/schemas/classroom-inventory';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';


const DEFAULT_INVENTORY_ITEMS = [
    { id: "item-1", itemName: "Textbooks", quantityStart: 0, quantityAdded: 0, quantityLost: 0, remarks: "" },
    { id: "item-2", itemName: "Exercise Books", quantityStart: 0, quantityAdded: 0, quantityLost: 0, remarks: "" },
    { id: "item-3", itemName: "Pens", quantityStart: 0, quantityAdded: 0, quantityLost: 0, remarks: "" },
    { id: "item-4", itemName: "Pencils", quantityStart: 0, quantityAdded: 0, quantityLost: 0, remarks: "" },
    { id: "item-5", itemName: "Rulers", quantityStart: 0, quantityAdded: 0, quantityLost: 0, remarks: "" },
];

async function seedDefaultInventory(yearLevel: string, schoolId: string, userId: string): Promise<EditableInventoryItem[]> {
    if (!db) throw new Error("Firestore is not configured.");
    
    const defaultPayload: ClassroomInventory = {
        yearLevel,
        term: "1", // Default to term 1
        items: DEFAULT_INVENTORY_ITEMS,
        lastUpdatedBy: userId,
        updatedAt: new Date().toISOString(),
    };
    
    const docRef = doc(db, `schools/${schoolId}/classroomInventory`, yearLevel);
    await setDoc(docRef, defaultPayload);

    // Return in editable format
    return DEFAULT_INVENTORY_ITEMS.map(item => ({
      ...item,
      quantityStart: String(item.quantityStart),
      quantityAdded: String(item.quantityAdded),
      quantityLost: String(item.quantityLost),
    }));
}


async function fetchInventoryFromBackend(yearLevel: string, schoolId: string, userId: string): Promise<EditableInventoryItem[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const docRef = doc(db, `schools/${schoolId}/classroomInventory`, yearLevel);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as ClassroomInventory;
    // Ensure quantities are strings for the editable form state
    return data.items.map(item => ({
      ...item,
      quantityStart: String(item.quantityStart || ''),
      quantityAdded: String(item.quantityAdded || ''),
      quantityLost: String(item.quantityLost || ''),
    }));
  } else {
    // If no inventory exists, seed the default items and return them.
    return await seedDefaultInventory(yearLevel, schoolId, userId);
  }
}

async function saveInventoryToBackend(inventory: ClassroomInventory, schoolId: string): Promise<{ success: boolean }> {
  if (!db) throw new Error("Firestore is not configured.");
  const docRef = doc(db, `schools/${schoolId}/classroomInventory`, String(inventory.yearLevel));
  // Use setDoc with merge:true to avoid overwriting other fields if they exist
  await setDoc(docRef, inventory, { merge: true });
  return { success: true };
}

// Function to add a single item to the inventory document
async function addInventoryItem(yearLevel: string, schoolId: string, newItem: any) {
  if (!db) throw new Error("Firestore is not configured.");
  const docRef = doc(db, `schools/${schoolId}/classroomInventory`, yearLevel);
  await updateDoc(docRef, {
      items: arrayUnion(newItem)
  });
}

// Function to delete a single item from the inventory document
async function deleteInventoryItem(yearLevel: string, schoolId: string, itemToRemove: any) {
    if (!db) throw new Error("Firestore is not configured.");
    const docRef = doc(db, `schools/${schoolId}/classroomInventory`, yearLevel);

    // To remove an item from an array, we need the full object to match
    await updateDoc(docRef, {
        items: arrayRemove(itemToRemove)
    });
}

const generateYearOptions = () => {
    const options = [{ value: "Kindergarten", label: "Kindergarten" }];
    for (let year = 1; year <= 8; year++) {
        options.push({ value: `Year ${year}`, label: `Year ${year}` });
    }
    return options;
};

export default function ClassroomInventoryPage() {
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("Year 1");
  const [inventoryItems, setInventoryItems] = useState<EditableInventoryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const canEdit = useMemo(() => {
    if (!userRole) return false;
    if (userRole === 'system-admin') return true;
    const editableRoles = ['teacher', 'head-teacher', 'assistant-head-teacher', 'primary-admin', 'kindergarten'];
    return editableRoles.includes(userRole);
  }, [userRole]);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const id = localStorage.getItem('schoolId');
    const uId = localStorage.getItem('userId');
    setUserRole(role);
    setSchoolId(id);
    setUserId(uId);
    if (!id || !uId) {
        setIsLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async (year: string) => {
    if (!schoolId || !userId) {
        setFetchError("School ID or User ID not found. Cannot load inventory.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await fetchInventoryFromBackend(year, schoolId, userId);
      setInventoryItems(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load inventory data.");
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, userId]);

  useEffect(() => {
    if (schoolId && userId) {
        loadInventory(selectedYear);
    }
  }, [selectedYear, loadInventory, schoolId, userId]);

  const handleInputChange = (itemId: string, field: keyof EditableInventoryItem, value: string) => {
    setInventoryItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          if (field === 'quantityStart' || field === 'quantityAdded' || field === 'quantityLost') {
            if (value === '' || /^\d*$/.test(value)) {
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
        toast({ variant: "destructive", title: "Cannot Save", description: "No inventory data, school ID, or user ID available."});
        return;
    }
    if (!canEdit) {
        toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to save changes."});
        return;
    }
    setIsSaving(true);
    try {
        const payload: ClassroomInventory = {
            yearLevel: selectedYear,
            term: "2", // This would be dynamic in a real app
            items: inventoryItems.map(item => ({
                ...item,
                quantityStart: Number(item.quantityStart) || 0,
                quantityAdded: Number(item.quantityAdded) || 0,
                quantityLost: Number(item.quantityLost) || 0,
            })),
            lastUpdatedBy: userId,
            updatedAt: new Date().toISOString(),
        };
        await saveInventoryToBackend(payload, schoolId);
        toast({ title: "Inventory Saved", description: `Stock inventory for ${selectedYear} has been saved successfully.`});
    } catch (error) {
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save inventory data."});
    } finally {
        setIsSaving(false);
    }
  };

  const calculateCurrentStock = (item: EditableInventoryItem) => {
    const start = Number(item.quantityStart) || 0;
    const added = Number(item.quantityAdded) || 0;
    const lost = Number(item.quantityLost) || 0;
    return start + added - lost;
  };

  const handlePrint = () => {
    toast({ title: "Printing...", description: "Use your browser's print dialog to save as PDF or print." });
    window.print();
  };

  const handleExportCsv = () => {
    if (!inventoryItems) {
      toast({ variant: "destructive", title: "No data", description: "No inventory data available to export." });
      return;
    }
    const headers = ["Item Name", "Start of Term", "Added", "Lost/Damaged", "Current Stock", "Remarks"];
    const rows = inventoryItems.map(item => [
      `"${(item.itemName || '').replace(/"/g, '""')}"`,
      Number(item.quantityStart) || 0,
      Number(item.quantityAdded) || 0,
      Number(item.quantityLost) || 0,
      calculateCurrentStock(item),
      `"${(item.remarks || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `classroom_inventory_${selectedYear.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Exported to CSV", description: "The inventory data has been downloaded." });
  };
  
  const handleAddItem = async () => {
    if (!newItemName.trim() || !schoolId) {
      toast({ variant: "destructive", title: "Item name cannot be empty." });
      return;
    }
    const newItem = {
      id: `custom-${Date.now()}`,
      itemName: newItemName.trim(),
      quantityStart: 0,
      quantityAdded: 0,
      quantityLost: 0,
      remarks: '',
    };
    try {
        await addInventoryItem(selectedYear, schoolId, newItem);
        await loadInventory(selectedYear); // Reload data to show the new item
        setNewItemName('');
        toast({ title: "Item Added", description: `"${newItem.itemName}" has been added to the list.`});
    } catch(err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add item to the database.' });
    }
  };

  const handleRemoveItem = async (itemIdToRemove: string) => {
    if (!schoolId) return;

    const itemToRemove = inventoryItems.find(item => item.id === itemIdToRemove);
    if (!itemToRemove) return;

    // Convert EditableInventoryItem to the format stored in Firestore for removal
    const storedItemFormat = {
        ...itemToRemove,
        quantityStart: Number(itemToRemove.quantityStart) || 0,
        quantityAdded: Number(itemToRemove.quantityAdded) || 0,
        quantityLost: Number(itemToRemove.quantityLost) || 0,
    };

    try {
        await deleteInventoryItem(selectedYear, schoolId, storedItemFormat);
        await loadInventory(selectedYear); // Reload to reflect deletion
        toast({ title: "Item Removed", description: "The item has been removed from your inventory list." });
    } catch(err) {
        toast({ variant: "destructive", title: "Error", description: `Failed to remove item. ${err instanceof Error ? err.message : ''}` });
    }
  };
  
  const yearOptions = generateYearOptions();

  return (
    <div className="p-8 space-y-8 printable-area">
        <PageHeader 
            title="Classroom Stock Inventory"
            description="Manage classroom resources and supplies for each year level."
        />
        
        {canEdit && (
            <Alert className="mb-6">
                <FileUp className="h-4 w-4" />
                <AlertTitle>Bulk Data Upload</AlertTitle>
                <AlertDescription>
                    To add many inventory items at once, you can use the bulk upload feature. Navigate to the{' '}
                    <Link href="/dashboard/operations/infodatafeed" className="font-bold underline">
                        Info Data Feed
                    </Link>
                    {' '}page, select "Classroom Inventory", download the template, and upload your file.
                </AlertDescription>
            </Alert>
        )}

        <Card className="shadow-lg rounded-lg w-full">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
              <div className="flex items-center gap-4">
                <Label htmlFor="year-select" className="font-semibold">Select Year Level:</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoading || !schoolId}>
                    <SelectTrigger id="year-select" className="w-[240px]">
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {yearOptions.map(year => <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExportCsv} variant="outline" disabled={isLoading || isSaving}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
                <Button onClick={handlePrint} variant="outline" disabled={isLoading || isSaving}>
                    <Printer className="mr-2 h-4 w-4" /> Print / PDF
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isSaving || isLoading || !canEdit || !isFirebaseConfigured}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {isSaving ? "Saving..." : "Save All Changes"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Inventory Update</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will save all modifications made on this page. Do you want to proceed?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSaveInventory} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continue & Save"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {isLoading && (
              <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
              </div>
            )}
            {fetchError && (
              <Card className="bg-destructive/10 border-destructive print:hidden">
                  <CardHeader>
                      <CardTitle className="text-base text-destructive flex items-center">
                          <AlertCircle className="mr-2 h-5 w-5" /> Error Loading Inventory
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-sm text-destructive">{fetchError}</p>
                  </CardContent>
              </Card>
            )}

            {!isLoading && !fetchError && inventoryItems && (
              <div className="overflow-x-auto border rounded-lg">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[20%]">Item Name</TableHead>
                      <TableHead className="text-center">Start of Term</TableHead>
                      <TableHead className="text-center">Added</TableHead>
                      <TableHead className="text-center">Lost/Damaged</TableHead>
                      <TableHead className="text-center">Current Stock</TableHead>
                      <TableHead className="w-[25%]">Remarks</TableHead>
                      <TableHead className="text-center print:hidden">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.itemName}
                            onChange={(e) => handleInputChange(item.id, 'itemName', e.target.value)}
                            disabled={!canEdit}
                            className="font-medium"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            className="text-center"
                            value={item.quantityStart}
                            onChange={(e) => handleInputChange(item.id, 'quantityStart', e.target.value)}
                            disabled={!canEdit}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            className="text-center"
                            value={item.quantityAdded}
                            onChange={(e) => handleInputChange(item.id, 'quantityAdded', e.target.value)}
                            disabled={!canEdit}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            className="text-center"
                            value={item.quantityLost}
                            onChange={(e) => handleInputChange(item.id, 'quantityLost', e.target.value)}
                            disabled={!canEdit}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle font-bold text-lg">
                          {calculateCurrentStock(item)}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.remarks || ''}
                            onChange={(e) => handleInputChange(item.id, 'remarks', e.target.value)}
                            disabled={!canEdit}
                          />
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={!canEdit} title="Remove Item">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          This will permanently remove the item "{item.itemName}" from the database. This action cannot be undone.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleRemoveItem(item.id)} className="bg-destructive hover:bg-destructive/90">
                                          Yes, Remove
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
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
                    <CardHeader className="p-2">
                        <CardTitle className="text-lg">Add Custom Item</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 flex flex-col sm:flex-row items-center gap-4">
                        <Label htmlFor="new-item-name" className="sr-only">New Item Name</Label>
                        <Input
                            id="new-item-name"
                            placeholder="Enter new item name, e.g., 'Whiteboard Markers'"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="flex-grow"
                        />
                        <Button onClick={handleAddItem} className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </CardContent>
                </Card>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
