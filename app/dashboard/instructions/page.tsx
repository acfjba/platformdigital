
// src/app/dashboard/instructions/page.tsx
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, LogIn, LogOut, Navigation, Shield, UserCog, UserCheck, User, GraduationCap, BookUser, Baby, UserPlus, FolderArchive, Upload, ClipboardCheck } from 'lucide-react';
import React from 'react';

export default function InstructionsPage() {
  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Application Guide & Instructions"
        description="A step-by-step guide on how to use the Digital Platform."
      />

      <div className="space-y-8">
        {/* General Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> General Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <LogIn className="h-6 w-6 mt-1 text-accent flex-shrink-0"/>
              <div>
                <h3 className="font-semibold">Logging In</h3>
                <p className="text-muted-foreground">On the login page, select your assigned role from the dropdown menu. This will pre-fill the email for the demo. Use the provided password to log in. The system will then direct you to the appropriate dashboard for your role.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Navigation className="h-6 w-6 mt-1 text-accent flex-shrink-0"/>
              <div>
                <h3 className="font-semibold">Navigating the App</h3>
                <p className="text-muted-foreground">Use the navigation bar at the top of the page to access different modules. The menus are organized by function: Dashboards, Academics, Student Services, and Operations.</p>
              </div>
            </div>
             <div className="flex items-start gap-4">
              <FolderArchive className="h-6 w-6 mt-1 text-accent flex-shrink-0"/>
              <div>
                <h3 className="font-semibold">Document Vault</h3>
                <p className="text-muted-foreground">Access your saved reports and forms from across the application in the "My Document Vault" page, found under the "Operations" menu.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <LogOut className="h-6 w-6 mt-1 text-accent flex-shrink-0"/>
              <div>
                <h3 className="font-semibold">Logging Out</h3>
                <p className="text-muted-foreground">Click on your user icon in the top-right corner to open the user menu, then select "Log out". This will securely end your session and return you to the login page.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role-Based Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Role-Based Guides</CardTitle>
            <CardDescription>Find instructions specific to your role below, as per Ministry of Education guidelines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><Shield className="text-destructive" /> System Administrator</h3>
                <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                    <li><b>Master Data Management:</b> Use the "Master Data" menu to manage schools, users, and permissions. You can also view the database structure and manage backups/snapshots.</li>
                    <li><b>Firebase Status:</b> Use the "Firebase Status" page to seed the entire database with initial sample data and test the connection.</li>
                    <li><b>Platform Status:</b> Monitor connectivity and performance for all schools on the platform.</li>
                </ul>
            </div>

            <div className="p-4 border rounded-lg">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><UserCog className="text-primary" /> Primary Admin</h3>
                <p className="text-muted-foreground">You are responsible for the complete administration of your assigned school. Your dashboard gives you access to all modules to manage staff, students, and school resources.</p>
                 <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                    <li><b>Staff Records:</b> Add new teachers and administrative staff to your school. Update their details and manage their status (Active, On-Leave, etc.).</li>
                    <li><b>Inventory Management:</b> Oversee both the main school inventory (e.g., desks, chairs, computers) and the individual classroom inventories to ensure resources are well-stocked.</li>
                    <li><b>Academic & Student Records:</b> You have full access to view and manage all student data, including exam results, disciplinary logs, and confidential counselling notes.</li>
                    <li><b>Manage School Information:</b> Navigate to "School Info" to update the daily program, post urgent news, and edit the "About Us" page for the entire school to see.</li>
                    <li><b>Info Data Feed:</b> Use the "Operations" &gt; "Info Data Feed" page to bulk-upload records for staff, users, inventory, and more. To ensure data is formatted correctly, select the data type you wish to upload and click the "Download Template" button. Fill this template with your data and then upload it.</li>
                    <li><b>View Staff Reports:</b> Access the "Staff Reports" module to generate and export detailed reports on staff roles and statuses.</li>
                </ul>
            </div>
            <div className="p-4 border rounded-lg">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><GraduationCap className="text-primary" /> Head Teacher</h3>
                <p className="text-muted-foreground">As the Head Teacher, your primary focus is academic oversight, staff management, and ensuring educational standards are met. Your dashboard helps you monitor teacher progress and school performance.</p>
                 <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                    <li><b>Review Submissions:</b> Your main task is to review, approve, or provide feedback on weekly workbook plans submitted by your teachers through the "Review Submissions" module.</li>
                    <li><b>Submission Status:</b> Your dashboard will show you at a glance which teachers have not yet submitted their plan for the current week, enabling timely follow-ups.</li>
                    <li><b>Rate Teachers:</b> Access "View & Rate Teachers" from your dashboard to provide constructive feedback on your colleagues.</li>
                    <li><b>Academic Reports:</b> Use the "Academic Reports" and "Exam Summary" modules to analyze school-wide performance and identify trends or areas for improvement.</li>
                    <li><b>Edit School Information:</b> You have permission to edit the "School Info" pages, including the daily program, news, and "About Us" section.</li>
                </ul>
            </div>
             <div className="p-4 border rounded-lg">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><UserPlus className="text-primary" /> Assistant Head Teacher</h3>
                <p className="text-muted-foreground">You support the Head Teacher in academic and administrative duties. Your access rights mirror the Head Teacher's, allowing you to assist with plan reviews and staff management.</p>
                 <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                    <li><b>Assist in Reviews:</b> Help the Head Teacher review and approve teacher workbook plans to ensure timely feedback.</li>
                    <li><b>Manage Records:</b> Access and update staff, academic, and student service records as delegated by the Head Teacher.</li>
                    <li><b>Monitor Performance:</b> Utilize the reporting tools to help track and analyze school performance data.</li>
                    <li><b>Edit School Information:</b> Like the Head Teacher, you can also update the school's news, program, and general information pages.</li>
                </ul>
            </div>
            <div className="p-4 border rounded-lg">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><User className="text-primary" /> Teacher</h3>
                <p className="text-muted-foreground">As a Teacher, your dashboard is your primary tool for planning, record-keeping, and managing your classroom activities.</p>
                 <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                    <li><b>Teacher Workbook Plan:</b> Use the form-based tool to create your weekly workbook plan based on your subjects and topics. Review the plan and submit it for Head Teacher approval.</li>
                    <li><b>Record Keeping:</b> Use the "Disciplinary Records" and "Counselling Records" modules to log important student interactions confidentially and professionally.</li>
                    <li><b>Classroom Inventory:</b> Go to "Academics" &gt; "Classroom Inventory" to manage the stock levels of supplies for your specific classroom (e.g., textbooks, pens, rulers).</li>
                    <li><b>Exam Results:</b> Go to "Academics" &gt; "Exam Results" to record student scores. For bulk entry, you can download the template from the "Operations" &gt; "Info Data Feed" page, fill it out, and upload it.</li>
                    <li><b>Check School Info:</b> Regularly visit the "School Info" section from the main navigation to stay updated on school-wide announcements, news, and the weekly program.</li>
                </ul>
            </div>
             <div className="p-4 border rounded-lg">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><Baby className="text-primary" /> Kindergarten Teacher</h3>
                <p className="text-muted-foreground">Your role has access to all standard teacher functionalities, with a focus on early childhood education planning and record-keeping.</p>
                 <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                    <li><b>Specialized Planning:</b> Use the Lesson Planner and Workbook Plan to create age-appropriate activities focusing on numeracy, literacy, and motor skills development.</li>
                    <li><b>Inventory:</b> Manage specific Kindergarten supplies like educational toys, art materials, and learning aids in your "Classroom Inventory".</li>
                     <li><b>Stay Informed:</b> Check the "School Info" hub for important updates relevant to the entire school.</li>
                </ul>
            </div>
             <div className="p-4 border rounded-lg">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><BookUser className="text-primary" /> Librarian</h3>
                <p className="text-muted-foreground">You manage the school's library resources, track issued books, and can help update school-wide information.</p>
                 <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                    <li><b>Manage Inventory:</b> Use the "Library Service" module to add new books to the catalog, edit existing entries, and manage the number of available copies.</li>
                    <li><b>Issue & Return Books:</b> Track which books are issued out to students, manage due dates, and process returns to keep the inventory accurate.</li>
                    <li><b>Update School Information:</b> You have permission to edit the pages in the "School Info" section, helping to keep announcements and programs current.</li>
                </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
    

    