
// src/app/dashboard/school-info/news/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Newspaper, PlusCircle, Save, Trash2, Loader2, AlertCircle, Copy, ClipboardPaste } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface NewsArticle {
    id: string;
    title: string;
    date: string;
    content: string;
}

interface NewsData {
    articles: NewsArticle[];
}

const NEWS_DOC_ID = 'singleton'; // Use a single document for all news articles

const initialNews: NewsArticle[] = [
    {
        id: 'news_1',
        title: 'Parent-Teacher Interviews Next Week',
        date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
        content: 'Please be advised that parent-teacher interviews for Term 2 will be held next week from Monday to Wednesday. Please contact the school office to book a time with your child\'s teacher.'
    },
    {
        id: 'news_2',
        title: 'Sports Day Postponed',
        date: new Date().toISOString().split('T')[0],
        content: 'Due to expected bad weather, the Annual Sports Day has been postponed. A new date will be announced shortly. All students will have a normal school day.'
    }
];

export default function NewsPage() {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [copiedArticle, setCopiedArticle] = useState<NewsArticle | null>(null);
    const { toast } = useToast();

    const canEdit = userRole === 'system-admin' || userRole === 'head-teacher' || userRole === 'primary-admin' || userRole === 'assistant-head-teacher' || userRole === 'librarian';

    const fetchNews = useCallback(async (id: string) => {
        setIsLoading(true);
        if (!isFirebaseConfigured || !db) {
            setNews(initialNews);
            setIsLoading(false);
            return;
        }
        const docRef = doc(db, `schools/${id}/schoolInfo`, NEWS_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as NewsData;
            // Ensure articles is an array, provide initialNews if it's empty or not present
            setNews(data.articles && data.articles.length > 0 ? data.articles : initialNews);
        } else {
            setNews(initialNews); // No news yet, load mock data
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const id = localStorage.getItem('schoolId');
        const role = localStorage.getItem('userRole');
        setSchoolId(id);
        setUserRole(role);
        if (id) {
            fetchNews(id);
        } else {
            setIsLoading(false);
            setNews(initialNews);
        }
    }, [fetchNews]);

    const handleAddArticle = () => {
        const newArticle: NewsArticle = {
            id: `news_${Date.now()}`,
            title: 'New Announcement Title',
            date: new Date().toISOString().split('T')[0],
            content: 'Write the details of the announcement here.'
        };
        setNews(prev => [newArticle, ...prev]);
        toast({ title: 'New article added', description: 'Fill in the details and save.' });
    };

    const handleRemoveArticle = (id: string) => {
        setNews(prev => prev.filter(article => article.id !== id));
        toast({ title: 'Article removed', description: 'The change will be permanent once you save.' });
    };
    
    const handleArticleChange = (id: string, field: keyof Omit<NewsArticle, 'id'>, value: string) => {
        setNews(prev => prev.map(article => 
            article.id === id ? { ...article, [field]: value } : article
        ));
    };

    const handleSaveChanges = async () => {
        if (!schoolId) {
            toast({ variant: 'destructive', title: 'Error', description: 'School ID not found.' });
            return;
        }
        if (!canEdit) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to save changes.' });
            return;
        }
        if (!db) {
            toast({ variant: 'destructive', title: 'Error', description: 'Database not connected.' });
            return;
        }
        setIsSaving(true);
        try {
            const docRef = doc(db, `schools/${schoolId}/schoolInfo`, NEWS_DOC_ID);
            await setDoc(docRef, { articles: news }, { merge: true });
            toast({ title: 'Success', description: 'News and announcements have been updated.' });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not save news.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyArticle = (article: NewsArticle) => {
        setCopiedArticle(article);
        toast({ title: "Article Copied", description: `"${article.title}" content is ready to be pasted.`});
    };

    const handlePasteArticle = () => {
        if (!copiedArticle) {
            toast({ variant: 'destructive', title: "Paste Error", description: "No article has been copied."});
            return;
        }
        const newPastedArticle: NewsArticle = {
            id: `news_${Date.now()}`,
            title: `Copy of: ${copiedArticle.title}`,
            date: new Date().toISOString().split('T')[0],
            content: copiedArticle.content,
        };
        setNews(prev => [newPastedArticle, ...prev]);
        toast({ title: "Article Pasted", description: `A new article has been created from your copied content.`});
    };

  return (
    <div className="p-8 space-y-8">
        <PageHeader
            title="Urgent News & Announcements"
            description="Manage and view important updates for the school community."
        />
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2"><Newspaper/> News Feed</CardTitle>
                    <CardDescription>View, add, or edit school-wide announcements.</CardDescription>
                </div>
                {canEdit && (
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handlePasteArticle} variant="outline" disabled={!copiedArticle}>
                            <ClipboardPaste className="mr-2 h-4 w-4"/> Paste Article
                        </Button>
                        <Button onClick={handleAddArticle}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add News
                        </Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Save All
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                )}
                {!isLoading && news.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground"/>
                        <p className="mt-4 text-muted-foreground">No news articles have been posted yet.</p>
                        {canEdit && <p className="text-sm text-muted-foreground">Click "Add News" to create one.</p>}
                    </div>
                )}
                {!isLoading && news.map(article => (
                    <Card key={article.id} className="bg-muted/30">
                        <CardHeader>
                             <div className="flex justify-between items-start gap-4">
                                <div className="flex-grow space-y-1">
                                    <Label htmlFor={`title-${article.id}`}>Title</Label>
                                    <Input 
                                        id={`title-${article.id}`} 
                                        value={article.title}
                                        onChange={e => handleArticleChange(article.id, 'title', e.target.value)}
                                        disabled={!canEdit}
                                        className="text-lg font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor={`date-${article.id}`}>Date</Label>
                                    <Input 
                                        id={`date-${article.id}`}
                                        type="date"
                                        value={article.date}
                                        onChange={e => handleArticleChange(article.id, 'date', e.target.value)}
                                        disabled={!canEdit}
                                        className="w-fit"
                                    />
                                </div>
                                {canEdit && (
                                    <div className="flex items-center mt-auto">
                                        <Button variant="ghost" size="icon" onClick={() => handleCopyArticle(article)} title="Copy Article">
                                            <Copy className="h-4 w-4 text-blue-600"/>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveArticle(article.id)} title="Delete Article">
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Label htmlFor={`content-${article.id}`}>Content</Label>
                             <Textarea 
                                id={`content-${article.id}`}
                                value={article.content}
                                onChange={e => handleArticleChange(article.id, 'content', e.target.value)}
                                disabled={!canEdit}
                                rows={4}
                             />
                        </CardContent>
                    </Card>
                ))}
            </CardContent>
        </Card>
    </div>
  );
}
