# TeamSync Progress App - Setup Guide

## Supabase Setup

### 1. Create Tables in SQL Editor

Go to **Supabase Dashboard** → **SQL Editor** → **New Query** → Run this SQL:

```sql
-- Users Table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  avatar_color TEXT DEFAULT '#4F46E5',
  yearly_points INT DEFAULT 0,
  total_points INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID,
  assignee_name TEXT,
  created_by UUID,
  status TEXT DEFAULT 'not_started',
  priority TEXT DEFAULT 'medium',
  points INT DEFAULT 0,
  due_date TIMESTAMPTZ,
  is_new BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

-- Task Notes Table
CREATE TABLE task_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID,
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Attachments Table (for file uploads - proof of work)
CREATE TABLE task_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Allow all access (for office use)
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON task_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON task_attachments FOR ALL USING (true) WITH CHECK (true);

-- Create default admin account
INSERT INTO users (username, password, display_name, role) VALUES ('admin', 'admin123', 'Admin', 'leader');
```

### 2. Create Storage Bucket

Go to **Supabase Dashboard** → **Storage** → **Create a new bucket**:

1. Click **"Create bucket"**
2. Name: `task-attachments`
3. Check **"Public bucket"** (make it public)
4. Click **"Create bucket"**

### 3. Add Storage Policies

In **Storage** section, click on `task-attachments` bucket → **Policies** → **Add policies**:

Or run this SQL:

```sql
-- Allow public read access
CREATE POLICY "Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'task-attachments');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-attachments');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'task-attachments');
```

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in:
- **Supabase Dashboard** → **Project Settings** → **General** (Reference URL)
- **Supabase Dashboard** → **Project Settings** → **API** (Project API key - anon/public)

## Run the App

```bash
npm install
npm run dev
```

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Team Members | Created by admin | Set by admin |

## Workflow

### Admin Workflow:
1. Login as admin
2. Go to **Team** → Add team members
3. Go to **Create Task** → Assign tasks to members
4. View all tasks in dashboard
5. When task is marked **Completed**, it appears in **Pending Approvals**
6. Click **"Review & Approve"** to:
   - See task details
   - Review proof of work (files/screenshots)
   - Award points (1-10)
   - Approve

### Team Member Workflow:
1. Login with credentials from admin
2. View assigned tasks
3. Update status: Not Started → In Progress → Half Done → Completed
4. Upload files/screenshots as **proof of work**
5. Add notes/comments
6. Wait for admin approval

## Features

- ✅ Real-time sync (updates every 5 seconds)
- ✅ Team member management
- ✅ Task assignment & tracking
- ✅ Status updates
- ✅ File uploads as proof of work
- ✅ View & download attachments
- ✅ Review & approval workflow
- ✅ Points & rewards system
- ✅ Performance leaderboard

## Supported File Types

- Images: JPG, PNG, GIF, WebP, etc.
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Archives: ZIP, RAR
- Max file size: 10MB

## Troubleshooting

### Storage Error
Make sure the `task-attachments` bucket is set to **Public**.

### Database Error
Make sure all tables have **RLS enabled** and **"Allow all" policies** created.

### Login Error
Make sure the admin account was created:
```sql
INSERT INTO users (username, password, display_name, role) VALUES ('admin', 'admin123', 'Admin', 'leader');
```
