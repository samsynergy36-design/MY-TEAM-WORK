# TeamSync Progress App - Specification

## 1. Concept & Vision

TeamSync is a real-time task tracking application that brings WhatsApp-like instant communication combined with task management. It empowers team leaders to assign work and receive live updates from their team, with built-in reward systems to keep motivation high. The app feels responsive, alive, and encouraging - every status update triggers a visual celebration, and every approved task feels like a small victory.

**Personality**: Professional yet warm. The interface celebrates progress without being childish. Real-time updates create a sense of connection - you're always aware of what your team is doing.

## 2. Design Language

### Aesthetic Direction
Clean corporate design with subtle warmth - think Notion meets Slack. Card-based layout with generous whitespace, color-coded status indicators, and smooth real-time transitions.

### Color Palette
```
Primary:        #4F46E5 (Indigo - trust, professionalism)
Secondary:      #10B981 (Emerald - success, growth)
Accent:         #F59E0B (Amber - energy, attention)
Background:     #F8FAFC (Light slate)
Surface:        #FFFFFF (Pure white cards)
Text Primary:   #1E293B (Slate 800)
Text Secondary: #64748B (Slate 500)

Status Colors:
- Not Started:  #EF4444 (Red 500)
- In Progress:  #F59E0B (Amber 500)
- Half Done:    #3B82F6 (Blue 500)
- Completed:    #10B981 (Emerald 500)
- Approved:     #8B5CF6 (Purple 500)
```

### Typography
- **Headings**: Inter (700 weight) - clean, professional
- **Body**: Inter (400, 500 weight)
- **Monospace**: JetBrains Mono (for task IDs)
- Scale: 12/14/16/18/24/32/48px

### Spatial System
- Base unit: 4px
- Component padding: 16px
- Card padding: 24px
- Section spacing: 32px
- Border radius: 8px (cards), 6px (buttons), 4px (inputs)

### Motion Philosophy
- **Micro-interactions**: 150ms ease-out for hover states
- **State changes**: 300ms ease-in-out for status updates
- **Real-time pulse**: Subtle 2s infinite pulse on new updates
- **Celebration**: Confetti burst on task approval (leader view)
- **List reorder**: 400ms spring animation when tasks reorder

### Visual Assets
- Icons: Lucide React (consistent, clean)
- Avatars: Initials-based with role-specific colors
- Empty states: Custom illustrations with encouraging copy

## 3. Layout & Structure

### Information Architecture

```
├── Login Page
├── Dashboard (Role-based routing)
│   ├── Leader Dashboard
│   │   ├── Overview Stats
│   │   ├── Team Progress Grid
│   │   ├── Pending Approvals Queue
│   │   └── Leaderboard
│   └── Member Dashboard
│       ├── My Tasks List
│       ├── Quick Stats
│       └── My Rewards
├── Task Detail Modal
│   ├── Task Info
│   ├── Notes Thread
│   ├── Status History
│   └── Rewards Panel
├── Create Task Page (Leader only)
├── Team Management (Leader only)
└── Settings
```

### Responsive Strategy
- Mobile-first (375px base)
- Tablet breakpoint: 768px
- Desktop breakpoint: 1024px
- Dashboard adapts: stacked cards (mobile) → grid layout (desktop)

### Visual Pacing
- Dashboard hero: Compact stats bar
- Main content: Card-based task list with visual breathing room
- Task detail: Full-height modal with scrollable thread

## 4. Features & Interactions

### Authentication
- **Login**: Username + Password (no OTP)
- **Registration**: Username, Display Name, Password, Role selection (Leader/Member)
- **Session persistence**: LocalStorage with auto-refresh
- **Offline login**: Allow if previously logged in and data cached

### Task Management

#### Creating Tasks (Leader)
- Title (required, max 100 chars)
- Description (optional, max 500 chars)
- Assignee (select from team members)
- Priority: Low/Medium/High/Urgent
- Due date (optional)
- Attach initial notes/instructions

**On submit**: Task appears instantly in assignee's view with "New Task" badge animation.

#### Task Status Updates (Member)
- Not Started → Click to start
- In Progress → Manual update
- Half Done → 50% indicator
- Completed → Triggers notification to leader

**On status change**: 
- Real-time update to leader dashboard
- Toast notification showing "Sarah updated Task X to 'In Progress'"
- Progress bar animation in task card

#### Task Approval (Leader)
- Approve button (✓) on completed tasks
- Optional: Add approval notes
- Assign reward points (1-10 slider with haptic feedback)

**On approve**:
- Task marked as "Approved" (purple state)
- Points added to member's yearly score
- Confetti animation (desktop) / vibration (mobile)
- Notification to member with points earned

### Notes System

#### Inside Task Detail
- Threaded notes with timestamps
- Author avatar and name
- Edit/delete own notes (within 5 minutes)
- @mentions for team members (future)
- File attachments placeholder (v2)

**Visual treatment**: Chat-like bubbles, alternating colors per user

### Reward System

#### Points Tracking
- Per-task points: 1-10
- Total yearly score displayed on profile
- Average performance (total points / completed tasks)
- Running rank among team members

#### Leaderboard
- Top 3 highlighted with medals
- Sorted by total points (current year)
- Shows: Rank, Avatar, Name, Points, Tasks Completed

### Real-Time Sync

#### Sync Indicators
- Green dot: Synced
- Yellow dot: Syncing
- Red dot: Offline (changes queued)

#### Conflict Resolution
- Last-write-wins for simple fields
- Merge for notes (append only)
- Timestamp-based ordering

## 5. Component Inventory

### Button
- **States**: default, hover (+shadow, slight scale), active (pressed), disabled (50% opacity), loading (spinner)
- **Variants**: Primary (filled), Secondary (outlined), Ghost (text only), Danger (red)
- **Sizes**: sm (32px), md (40px), lg (48px)

### Task Card
- **Default**: White background, subtle shadow, status indicator left border
- **Hover**: Elevated shadow, slight translate-y
- **New**: "New" badge with pulse animation
- **Selected**: Indigo border highlight

### Status Badge
- Pill-shaped with icon
- Color-coded per status
- Micro-animation on change (scale pop)

### Input Field
- **Default**: Light gray border
- **Focus**: Indigo border, subtle glow
- **Error**: Red border, error message below
- **Disabled**: Gray background

### Modal/Drawer
- Backdrop blur (mobile)
- Slide-up animation (mobile)
- Center scale animation (desktop)
- Close on backdrop click or X button

### Avatar
- Circle with initials
- Role colors: Leader (indigo), Member (emerald)
- Size variants: xs (24px), sm (32px), md (40px), lg (56px)

### Toast Notification
- Slides in from top-right
- Auto-dismiss after 4 seconds
- Types: success (green), error (red), info (blue), update (amber)
- Dismiss button

### Empty State
- Centered illustration
- Encouraging headline
- Action button when applicable

## 6. Technical Approach

### Tech Stack
- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **State**: React Context + useReducer
- **Real-time**: Firebase Firestore (listeners)
- **Auth**: Firebase Auth (email/password)
- **Offline**: IndexedDB via idb-keyval
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Data Model

#### Users Collection (`/users/{userId}`)
```typescript
{
  id: string;
  username: string;
  displayName: string;
  role: 'leader' | 'member';
  email?: string;
  avatarColor: string;
  totalPoints: number;
  yearlyPoints: number;
  tasksCompleted: number;
  createdAt: Timestamp;
  lastActive: Timestamp;
}
```

#### Tasks Collection (`/tasks/{taskId}`)
```typescript
{
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  createdBy: string;
  status: 'not_started' | 'in_progress' | 'half_done' | 'completed' | 'approved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  points: number; // 0 until approved
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  isNew: boolean; // for "new task" badge
}
```

#### Notes Subcollection (`/tasks/{taskId}/notes/{noteId}`)
```typescript
{
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

#### Status History Subcollection (`/tasks/{taskId}/history/{historyId}`)
```typescript
{
  id: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedByName: string;
  timestamp: Timestamp;
  notes?: string;
}
```

### API Design (Firebase SDK)

All operations through Firestore SDK with security rules:

**Auth Endpoints**
- `signInWithEmailAndPassword(email, password)` → Firebase Auth
- `createUserWithEmailAndPassword(email, password)` → Firebase Auth
- Custom token with username for display

**Task Endpoints**
- `getTasksForUser(userId)` - Real-time listener
- `getTasksByLeader()` - Leader view all tasks
- `createTask(data)` - Leader only
- `updateTaskStatus(taskId, status)` - Member on own tasks
- `approveTask(taskId, points, notes)` - Leader only

**Notes Endpoints**
- `getTaskNotes(taskId)` - Real-time listener
- `addNote(taskId, content)` - Any assignee

### Offline Strategy

1. **Service Worker**: Cache app shell for instant load
2. **IndexedDB**: Store tasks, users, pending actions
3. **Sync Queue**: Store mutations when offline, replay on reconnect
4. **Optimistic Updates**: UI updates immediately, revert on failure

### Security Rules (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data, leaders can read all
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Tasks readable by all authenticated, writable by leader or assignee
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow create: if getUserRole(request.auth.uid) == 'leader';
      allow update: if request.auth.uid == resource.data.assigneeId 
                    || getUserRole(request.auth.uid) == 'leader';
      allow delete: if getUserRole(request.auth.uid) == 'leader';
    }
    
    // Notes readable by task participants, writable by authenticated
    match /tasks/{taskId}/notes/{noteId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null;
      allow delete: if request.auth.uid == resource.data.authorId;
    }
  }
}
```

## 7. Deployment

### Build Commands
```bash
npm install
npm run dev      # Development
npm run build    # Production build
npm run preview  # Preview production build
```

### Environment Variables
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

### Deployment Steps
1. Create Firebase project
2. Enable Firestore and Auth
3. Configure security rules
4. Add team members
5. Deploy web app via Firebase Hosting or Vercel
