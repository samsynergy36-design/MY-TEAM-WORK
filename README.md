# TeamSync Progress App

Real-time team progress tracking application with task management, file uploads, notes system, and reward points.

## Features

- ✅ **Real-time sync** - Updates reflect instantly across all devices
- ✅ **Role-based access** - Team Leader (Admin) and Team Member roles
- ✅ **Task Management** - Create, assign, edit, delete tasks
- ✅ **Status Updates** - Not Started → In Progress → Half Done → Completed → Approved
- ✅ **File Attachments** - Upload images, documents, screenshots as proof of work
- ✅ **Download Files** - View and download all attachments
- ✅ **Notes System** - Threaded comments inside each task
- ✅ **Reward Points** - Leaders can award 1-10 points per completed task
- ✅ **Leaderboard** - Track team performance
- ✅ **Auto-refresh** - Pages update every 5 seconds

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage)
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Quick Setup

### 1. Supabase Project

1. Go to [Supabase](https://app.supabase.com) and create a project
2. Go to **SQL Editor** and run the SQL from `SETUP.md`
3. Go to **Storage** → Create bucket named `task-attachments` (set as Public)
4. Add storage policies from `SETUP.md`

### 2. Environment Variables

Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the App

```bash
npm install
npm run dev
```

## How to Use

### As Admin:
1. Login: `admin` / `admin123`
2. Go to **Team** → Add team members
3. Go to **Create Task** → Assign tasks to members
4. View tasks and approve completed work
5. Award points (1-10) for completed tasks

### As Team Member:
1. Login with credentials provided by admin
2. View assigned tasks
3. Update task status (Not Started → In Progress → Half Done → Completed)
4. Upload files/screenshots as proof of work
5. Add notes/comments

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── Sidebar.jsx
│   │   ├── LeaderDashboard.jsx
│   │   ├── MemberDashboard.jsx
│   │   ├── CreateTask.jsx
│   │   ├── TaskDetail.jsx
│   │   └── TeamManagement.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── supabase.js
│   ├── App.jsx
│   └── main.jsx
├── SETUP.md
├── README.md
└── package.json
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

### Netlify

1. Push to GitHub
2. Connect to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`

## Database Schema

### Users
- id, username, password, display_name, role, avatar_color, yearly_points, total_points, tasks_completed

### Tasks
- id, title, description, assignee_id, assignee_name, created_by, status, priority, points, due_date, is_new, created_at, updated_at

### Task Notes
- id, task_id, content, author_id, author_name, author_role, created_at

### Task Attachments
- id, task_id, file_name, file_url, file_path, file_type, file_size, uploaded_by, uploaded_by_name, created_at

## License

MIT - Free for personal and commercial use
