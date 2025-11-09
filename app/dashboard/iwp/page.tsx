"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2, Target, Save, FileUp, Printer, Send, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from '@/components/layout/page-header';

interface Goal {
  id: string;
  text: string;
  actionPlan: string;
  evidence: string;
  reflection: string;
}

interface Competency {
  id: string;
  name: string;
  rating: number;
}

const initialGoals: Goal[] = [
  { id: 'goal1', text: 'Integrate more technology into math lessons.', actionPlan: '1. Research new math apps.\n2. Create one interactive lesson per week using a smartboard.\n3. Attend a professional development session on educational technology.', evidence: 'Lesson plans with tech integration noted.\nStudent work samples from interactive lessons.\nPD certificate of completion.', reflection: 'The interactive lessons have significantly increased student engagement, especially for visual learners. A key challenge was finding age-appropriate apps that aligned with the curriculum. Next step is to train students on using collaborative online tools.' },
];

const initialCompetencies: Competency[] = [
    { id: 'comp1', name: 'Curriculum Knowledge', rating: 7 },
    { id: 'comp2', name: 'Student Engagement', rating: 8 },
    { id: 'comp3', name: 'Classroom Management', rating: 7 },
    { id: 'comp4', name: 'Communication with Parents', rating: 6 },
];

export default function IwpPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [competencies, setCompetencies] = useState<Competency[]>(initialCompetencies);
  const [newGoalText, setNewGoalText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const handleAddGoal = () => {
    if (!newGoalText.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Goal text cannot be empty.' });
      return;
    }
    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      text: newGoalText,
      actionPlan: '',
      evidence: '',
      reflection: '',
    };
    setGoals([...goals, newGoal]);
    setNewGoalText('');
    toast({ title: 'Goal Added', description: 'A new goal has been added to your plan.' });
  };

  const handleDeleteGoal = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    setGoals(goals.filter(goal => goal.id !== id));
    toast({ title: 'Goal Deleted', description: 'The goal has been removed from your plan.' });
  };

  const handleGoalChange = (id: string, field: keyof Omit<Goal, 'id'>, value: string) => {
    setGoals(goals.map(goal => (goal.id === id ? { ...goal, [field]: value } : goal)));
  };

  const handleCompetencyChange = (id: string, value: number) => {
    setCompetencies(competencies.map(comp => comp.id === id ? { ...comp, rating: value } : comp));
  };
  
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    toast({ title: 'Saving Draft...', description: 'Your IWP draft is being saved.' });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("Saving IWP Draft:", { goals, competencies });
    
    setIsSavingDraft(false);
    toast({ title: 'Draft Saved', description: 'Your IWP has been saved as a draft.' });
  };
  
  const handleSubmitPlan = async () => {
    setIsSubmitting(true);
    toast({ title: 'Submitting Plan...', description: 'Your Individual Work Plan is being submitted for review.' });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log("Submitting IWP Data:", { goals, competencies });
    
    setIsSubmitting(false);
    toast({ title: 'Plan Submitted Successfully', description: 'Your IWP has been submitted.' });
  };
  
  const handlePrintPlan = () => {
    toast({
      title: "Printing Plan...",
      description: "Use your browser's print dialog to save as PDF or print.",
    });
    window.print();
  };

  const handleEmailPlan = () => {
    toast({
      title: "Emailing Plan (Simulated)",
      description: "An email with your IWP would be sent for review.",
    });
  };

  const handleImportPdf = () => {
    toast({
      title: "Feature not available",
      description: "Importing from PDF is a planned feature and not yet implemented.",
      variant: "default",
    });
  };

  return (
    <div className="p-8 space-y-8 printable-area">
        <PageHeader
            title="Individual Work Plan (IWP)"
            description="Define, track, and reflect on your professional goals for the academic year."
        />
        <Tabs defaultValue="goals" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 print:hidden">
                <TabsTrigger value="goals">Goals & Action Plan</TabsTrigger>
                <TabsTrigger value="evidence">Evidence & Reflection</TabsTrigger>
                <TabsTrigger value="assessment">Self-Assessment</TabsTrigger>
            </TabsList>
            
            <TabsContent value="goals" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Professional Goals</CardTitle>
                        <CardDescription>Define your key objectives for this period.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex gap-2 print:hidden">
                            <Input 
                                value={newGoalText} 
                                onChange={(e) => setNewGoalText(e.target.value)} 
                                placeholder="Enter a new professional goal..."
                            />
                            <Button onClick={handleAddGoal}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {goals.map(goal => (
                                <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                                    <div className="flex justify-between items-start">
                                        <Textarea 
                                            value={goal.text}
                                            onChange={(e) => handleGoalChange(goal.id, 'text', e.target.value)}
                                            className="text-md font-semibold flex-grow mr-2"
                                            rows={2}
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(goal.id)} className="print:hidden">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                    <div>
                                        <Label htmlFor={`action-plan-${goal.id}`} className="font-semibold text-muted-foreground">Action Plan</Label>
                                        <Textarea 
                                            id={`action-plan-${goal.id}`}
                                            value={goal.actionPlan}
                                            onChange={(e) => handleGoalChange(goal.id, 'actionPlan', e.target.value)}
                                            placeholder="List the steps to achieve this goal..."
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="evidence" className="mt-6">
                    <Card>
                    <CardHeader>
                        <CardTitle>Evidence & Reflection</CardTitle>
                        <CardDescription>Document evidence of your progress and reflect on your journey for each goal.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {goals.map(goal => (
                            <div key={goal.id} className="p-4 border rounded-lg space-y-4">
                                <p className="font-semibold text-lg text-primary">{goal.text}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor={`evidence-${goal.id}`} className="font-semibold text-muted-foreground">Evidence of Progress</Label>
                                        <Textarea 
                                            id={`evidence-${goal.id}`}
                                            value={goal.evidence}
                                            onChange={(e) => handleGoalChange(goal.id, 'evidence', e.target.value)}
                                            placeholder="List documents, links, or observations that demonstrate progress towards this goal..."
                                            rows={5}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`reflection-${goal.id}`} className="font-semibold text-muted-foreground">Reflection</Label>
                                        <Textarea 
                                            id={`reflection-${goal.id}`}
                                            value={goal.reflection}
                                            onChange={(e) => handleGoalChange(goal.id, 'reflection', e.target.value)}
                                            placeholder="What went well? What were the challenges? What are the next steps?"
                                            rows={5}
                                            className="bg-background/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="assessment" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Self-Assessment</CardTitle>
                        <CardDescription>Rate your proficiency in key professional areas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {competencies.map(comp => (
                            <div key={comp.id}>
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor={`slider-${comp.id}`}>{comp.name}</Label>
                                    <span className="font-bold text-lg text-primary">{comp.rating}</span>
                                </div>
                                <Slider
                                    id={`slider-${comp.id}`}
                                    value={[comp.rating]}
                                    onValueChange={([val]) => handleCompetencyChange(comp.id, val)}
                                    max={10}
                                    step={1}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4 print:hidden">
             <Button onClick={handleEmailPlan} variant="outline" disabled={isSavingDraft || isSubmitting}>
                <Mail className="mr-2 h-4 w-4" /> Email Plan
            </Button>
            <Button onClick={handlePrintPlan} variant="outline" disabled={isSavingDraft || isSubmitting}>
                <Printer className="mr-2 h-4 w-4" /> Print Plan
            </Button>
            <Button onClick={handleSaveDraft} variant="secondary" disabled={isSavingDraft || isSubmitting}>
                <Save className="mr-2 h-4 w-4" /> {isSavingDraft ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={handleSubmitPlan} disabled={isSavingDraft || isSubmitting} size="lg">
                <Send className="mr-2 h-5 w-5" />
                {isSubmitting ? 'Submitting...' : 'Save & Submit'}
            </Button>
        </div>
    </div>
  );
}

    