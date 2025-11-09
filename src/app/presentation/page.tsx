
"use client";

import React from "react";
import Link from "next/link";

export default function PresentationPage() {
  return (
    <div
      className="font-sans bg-gray-100 bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('/school-management-bg.png')`,
      }}
    >
      <nav className="fixed top-0 left-0 w-full bg-crimson/90 backdrop-blur-sm z-10 p-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-headline font-bold text-white">
          App Presentation
        </h1>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-800 bg-yellow-400 hover:bg-yellow-500"
        >
          Back to Login
        </Link>
      </nav>

      <div className="snap-y h-screen overflow-y-scroll">
        {/** Slide 1 */}
        <section className="h-screen w-full flex flex-col items-center justify-center p-8 snap-start">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-yellow-400/50 p-8 md:p-12 text-center rounded-lg">
            <h1 className="text-6xl font-headline font-bold text-crimson mb-4">
              Digital Platform for Schools
            </h1>
            <p className="text-2xl text-gray-800">
              Empowering School Management with Modern, Efficient Tools.
            </p>
            <p className="text-gray-500 mt-4">
              A Comprehensive Solution for Fijian Schools
            </p>
          </div>
        </section>

        {/** Slide 2 */}
        <section className="h-screen w-full flex flex-col items-center justify-center p-8 snap-start">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-yellow-400/50 p-8 md:p-12 rounded-lg">
            <h2 className="text-4xl font-headline font-bold text-yellow-500 mb-6">
              The Teacher’s Dashboard
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              A centralized hub for daily tasks and professional growth, providing teachers with the tools they need to excel.
            </p>
            <ul className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-lg list-disc list-inside text-gray-800">
              <li>
                <span className="font-semibold">Teacher Workbook Plan:</span> Use a structured form to create and submit weekly lesson plans for Head Teacher approval.
              </li>
              <li>
                <span className="font-semibold">Record Keeping:</span> Confidentially log important student interactions in the Disciplinary and Counselling modules.
              </li>
              <li>
                <span className="font-semibold">Classroom Inventory:</span> Manage stock levels for classroom-specific supplies like textbooks, pens, and rulers to ensure resources are always available.
              </li>
              <li>
                <span className="font-semibold">Exam Results:</span> Enter student scores individually or prepare data for bulk upload via the Info Data Feed.
              </li>
            </ul>
          </div>
        </section>

        {/** Slide 3 */}
        <section className="h-screen w-full flex flex-col items-center justify-center p-8 snap-start">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-yellow-400/50 p-8 md:p-12 rounded-lg">
            <h2 className="text-4xl font-headline font-bold text-yellow-500 mb-6">
              The Head Teacher’s Panel
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              A powerful command center for academic leadership to monitor progress, manage submissions, and assess performance.
            </p>
            <ul className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-lg list-disc list-inside text-gray-800">
              <li>
                <span className="font-semibold">Submission Status:</span> Your dashboard provides an at-a-glance view of which teachers have not submitted their workbook plan for the current week, enabling timely follow-ups.
              </li>
              <li>
                <span className="font-semibold">Review & Approve:</span> Access a centralized queue to review, approve, or provide feedback on all submitted teacher workbook plans.
              </li>
              <li>
                <span className="font-semibold">Academic Reports:</span> Analyze school-wide exam performance, view subject-specific trends, and track term-over-term progress.
              </li>
              <li>
                <span className="font-semibold">Staff Feedback:</span> Access the "View & Rate Teachers" module to provide constructive feedback and support professional development.
              </li>
            </ul>
          </div>
        </section>

        {/** Slide 4 */}
        <section className="h-screen w-full flex flex-col items-center justify-center p-8 snap-start">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-yellow-400/50 p-8 md:p-12 rounded-lg">
            <h2 className="text-4xl font-headline font-bold text-yellow-500 mb-6">
              The Primary Admin’s Dashboard
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              The central hub for complete school administration, from user management to operational oversight.
            </p>
             <ul className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-lg list-disc list-inside text-gray-800">
              <li>
                <span className="font-semibold">User & Staff Management:</span> Add new staff members, invite users to the platform with specific roles, and manage their details.
              </li>
              <li>
                <span className="font-semibold">Total Record Access:</span> As the highest authority for your school, you can view and manage all data, including academic, financial, inventory, and student service records.
              </li>
              <li>
                <span className="font-semibold">School Information Hub:</span> Update school-wide announcements, daily programs, and the public-facing "About Us" page for the entire school to see.
              </li>
              <li>
                <span className="font-semibold">Info Data Feed:</span> Use the "Operations &gt; Info Data Feed" page to bulk-upload records for staff, inventory, exam results, and more by downloading and filling pre-formatted templates.
              </li>
            </ul>
          </div>
        </section>

        {/** Slide 5 */}
        <section className="h-screen w-full flex flex-col items-center justify-center p-8 snap-start">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-yellow-400/50 p-8 md:p-12 rounded-lg">
            <h2 className="text-4xl font-headline font-bold text-yellow-500 mb-6">
              Specialized & Shared Modules
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              The platform includes dedicated modules for specific functions, accessible based on user roles.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-gray-200/50 rounded-lg">
                <span className="font-semibold">Library Service</span>
                <p className="text-xs text-gray-600">
                  Manage catalogue, loans, and overdue notices.
                </p>
              </div>
              <div className="p-4 bg-gray-200/50 rounded-lg">
                <span className="font-semibold">Disciplinary</span>
                <p className="text-xs text-gray-600">
                  Log and track student disciplinary incidents.
                </p>
              </div>
              <div className="p-4 bg-gray-200/50 rounded-lg">
                <span className="font-semibold">Counselling</span>
                <p className="text-xs text-gray-600">
                  Maintain confidential counselling session records.
                </p>
              </div>
              <div className="p-4 bg-gray-200/50 rounded-lg">
                <span className="font-semibold">Exam Results</span>
                <p className="text-xs text-gray-600">
                  Record and analyze student exam performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/** Slide 6 */}
        <section className="h-screen w-full flex flex-col items-center justify-center p-8 snap-start">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-yellow-400/50 p-8 md:p-12 text-center rounded-lg">
            <h2 className="text-5xl font-headline font-bold text-crimson mb-6">
              Thank You
            </h2>
            <p className="text-xl text-gray-800 mb-8">
              Streamlining school operations, one click at a time.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-gray-800 bg-yellow-400 hover:bg-yellow-500"
            >
              Proceed to App Login
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
