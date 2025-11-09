"use client";

import React, { useState, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

export default function KpiSelfAssessmentPage() {
  const { toast } = useToast();

  const [roleDesc, setRoleDesc] = useState('');
  const [activities, setActivities] = useState('');
  const [comments, setComments] = useState('');
  const [rating, setRating] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setRoleDesc('');
    setActivities('');
    setComments('');
    setRating('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const kpiData = {
      roleDesc,
      activities,
      comments,
      rating: parseInt(rating, 10),
    };

    console.log("Submitting KPI Data:", kpiData);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success/failure
    const success = Math.random() > 0.1; // 90% success rate for demo

    if (success) {
      toast({
        title: "KPI Submitted Successfully!",
        description: "Your self-assessment has been recorded.",
      });
      resetForm();
    } else {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not submit KPI. Please try again.",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-8 space-y-8">
        <PageHeader title="KPI Self-Assessment" description="Use the form below to submit your self-assessment." />
        <Card className="w-full max-w-lg mx-auto bg-background/95 p-4 sm:p-6 md:p-8 shadow-2xl my-4">
          <form onSubmit={handleSubmit} className="space-y-4 font-body">
            <div className="form-group">
              <Label htmlFor="roleDesc">Role Description</Label>
              <Textarea 
                id="roleDesc" 
                value={roleDesc} 
                onChange={e => setRoleDesc(e.target.value)} 
                rows={3} 
                required 
                placeholder="Briefly describe your main role and responsibilities."
              />
            </div>
            <div className="form-group">
              <Label htmlFor="activities">Activities Performed</Label>
              <Textarea 
                id="activities" 
                value={activities} 
                onChange={e => setActivities(e.target.value)} 
                rows={3} 
                required 
                placeholder="List key activities and tasks you performed."
              />
            </div>
            <div className="form-group">
              <Label htmlFor="comments">Your Comments</Label>
              <Textarea 
                id="comments" 
                value={comments} 
                onChange={e => setComments(e.target.value)} 
                rows={3} 
                required 
                placeholder="Any challenges, achievements, or general comments."
              />
            </div>
            <div className="form-group">
              <Label htmlFor="rating">Self Rating (1–10)</Label>
              <Input 
                id="rating" 
                type="number" 
                value={rating}
                onChange={e => setRating(e.target.value)}
                min="1" 
                max="10" 
                required 
                placeholder="Enter a number from 1 to 10"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit KPI'}
            </Button>
          </form>
        </Card>
      </div>
  );
}
