# ASES - College Schedule Management System

**ASES** is a comprehensive, institutional-grade academic schedule and timetable management system built for colleges. It streamlines the entire scheduling lifecycle—from static master timetables to dynamic daily scheduling, absent faculty replacement, lecture execution tracking, and automated reporting.

## 🌟 Key Features

The system operates with strict Role-Based Access Control (RBAC), dividing functionalities between **Admins** and **Faculty**.

### 👨‍💼 Admin Features
* **Master Timetable Management:** Create and maintain fixed weekly schedules with dedicated day-wise tabs (Monday–Saturday).
* **Dynamic Daily Scheduler:** Automatically generates the day's timetable from the master schedule.
* **Smart Absentee Resolution:** Highlights slots where assigned faculty are on leave. Allows admins to instantly swap in available replacement faculty (filtered by Course/Subject mapping) without schedule conflicts.
* **Lecture Execution Logging:** A one-click grid interface to track daily lecture compliance (`On Time`, `Late`, `Not Engaged`, `Not Marked`).
* **Leave & Holiday Management:** Add faculty leaves (automatically reflected in the daily scheduler) and declare institutional holidays (automatically excluding those dates from generation and reporting).
* **Comprehensive Reporting:** Generate custom reports including Daily Execution Summaries, Faculty Load tracking (Master Load vs. Actual Scheduled vs. Extra), Rescheduled Slots, and Leave Summaries.
* **Export Capabilities:** Export any report to formatted Excel spreadsheets or professional PDFs (complete with College Header, Logo, and timestamps).
* **User Management:** Create and manage Faculty (Full-Time/Visiting) and Admin accounts via Supabase Edge Functions.

### 👨‍🏫 Faculty Portal (View-Only)
* **Today's Lectures:** A clean dashboard showing their specific schedule for the current day, along with execution status.
* **Lecture History:** Searchable history of past lectures with PDF/Excel export options.
* **Leave Tracking:** Read-only view of their approved leaves.
* **Master Timetables:** Access to view their personal master timetable as well as the full college-wide master timetable.

## 🛠 Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), Tailwind CSS (for rapid UI utility styling)
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL database, Row Level Security, and Authentication)
* **Serverless Functions:** Supabase Edge Functions (Deno/TypeScript) for secure admin user creation.
* **Libraries:**
  * `Flatpickr` - For seamless date selection.
  * `TomSelect` - For advanced dropdowns and search filtering.
  * `jsPDF` & `jspdf-autotable` - For generating perfectly centered, institutional PDF reports.
  * `SheetJS (XLSX)` - For Excel data exports.

## 🗄️ Core Database Entities

* `profiles` / `admin_users` / `faculty`: User and role management.
* `courses`, `subjects`, `rooms`: Academic infrastructure.
* `course_subject_faculty (CSF)`: Maps which faculty are permitted to teach which subjects in which courses.
* `master_timetable`: The static weekday-based institutional timetable.
* `daily_schedule`: The dynamic, generated daily timeline (handles replacements/cancellations).
* `lecture_execution`: The compliance tracker for daily schedule slots.
* `faculty_leaves` & `holidays`: Availability tracking.

## 🚀 Setup & Installation

### 1. Supabase Setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Run the provided SQL migration scripts in your Supabase SQL Editor in the following order:
   * `schema.sql` (Base database setup)
   * `add_faculty_type.sql` (Adds Full-Time/Visiting constraint)
   * `per_day_timetable_migration.sql` (Sets up Monday-Saturday timetable tabs)
3. Note your **Project URL** and **anon/public API key**.

### 2. Edge Function Deployment
To allow Admins to create new users safely:
1. Install the Supabase CLI.
2. Navigate to the functions directory and deploy the user creation function:
```bash
   supabase functions deploy admin-create-user
