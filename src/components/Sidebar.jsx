import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, PlusCircle, Users, LogOut, Trophy, Wifi, WifiOff, X } from 'lucide-react';

const Sidebar = ({ currentPage, setCurrentPage, isLeader, onLogout, isOpen, onClose }) => {
  const { userData, isOnline } = useAuth();

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const navItems = isLeader ? [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'create-task', icon: PlusCircle, label: 'Create Task' },
    { id: 'team', icon: Users, label: 'Team' },
  ] : [
    { id: 'dashboard', icon: LayoutDashboard, label: 'My Tasks' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-white border-r border-slate-200">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-slate-800">TeamSync</h1>
            <p className="text-xs text-slate-500">Progress Tracker</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Icon size={20} className={isActive ? 'text-primary-600' : ''} />
                <span className="font-medium">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600"></div>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: userData?.avatar_color || '#4F46E5' }}>
              {getInitials(userData?.display_name || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{userData?.display_name}</p>
              <p className="text-xs text-slate-500 capitalize">{userData?.role}</p>
            </div>
          </div>

          {isLeader && userData?.yearly_points > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg mb-3">
              <Trophy size={16} className="text-amber-500" />
              <span className="text-sm font-medium text-amber-700">{userData.yearly_points} points</span>
            </div>
          )}

          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <LogOut size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-800">TeamSync</h1>
              <p className="text-xs text-slate-500">Progress Tracker</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => { setCurrentPage(item.id); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Icon size={20} className={isActive ? 'text-primary-600' : ''} />
                <span className="font-medium">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600"></div>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: userData?.avatar_color || '#4F46E5' }}>
              {getInitials(userData?.display_name || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{userData?.display_name}</p>
              <p className="text-xs text-slate-500 capitalize">{userData?.role}</p>
            </div>
          </div>

          {isLeader && userData?.yearly_points > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg mb-3">
              <Trophy size={16} className="text-amber-500" />
              <span className="text-sm font-medium text-amber-700">{userData.yearly_points} points</span>
            </div>
          )}

          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <LogOut size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
