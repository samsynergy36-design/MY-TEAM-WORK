import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import LeaderDashboard from './components/LeaderDashboard';
import MemberDashboard from './components/MemberDashboard';
import CreateTask from './components/CreateTask';
import TaskDetail from './components/TaskDetail';
import TeamManagement from './components/TeamManagement';
import Sidebar from './components/Sidebar';

const AppContent = () => {
  const { user, userData, loading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    setCurrentPage('login');
    setSelectedTask(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#1E293B', color: '#fff' },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
        <Login />
      </>
    );
  }

  const isLeader = userData.role === 'leader';

  const renderPage = () => {
    switch (currentPage) {
      case 'create-task':
        return <CreateTask onBack={() => setCurrentPage('dashboard')} onTaskCreated={() => setCurrentPage('dashboard')} />;
      case 'team':
        return <TeamManagement onBack={() => setCurrentPage('dashboard')} />;
      case 'task':
        return (
          <TaskDetail 
            task={selectedTask} 
            onClose={() => { setSelectedTask(null); setCurrentPage('dashboard'); }} 
          />
        );
      default:
        return isLeader ? (
          <LeaderDashboard onTaskClick={(task) => { setSelectedTask(task); setCurrentPage('task'); }} />
        ) : (
          <MemberDashboard onTaskClick={(task) => { setSelectedTask(task); setCurrentPage('task'); }} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1E293B', color: '#fff' },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />

      <button
        onClick={() => setShowMobileMenu(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary-600 text-white rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Sidebar 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isLeader={isLeader}
        onLogout={handleLogout}
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />

      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMobileMenu(false)} />
      )}

      <main className="flex-1 lg:ml-64 min-h-screen overflow-x-hidden">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          {renderPage()}
        </div>
      </main>

      {selectedTask && currentPage === 'task' && (
        <div className="lg:hidden fixed inset-0 z-50 animate-slide-in">
          <TaskDetail 
            task={selectedTask} 
            onClose={() => { setSelectedTask(null); setCurrentPage('dashboard'); }} 
          />
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
