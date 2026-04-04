import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { CheckCircle2, Clock, AlertCircle, Trophy, Star, ChevronRight, RefreshCw, Target, Zap, AlertTriangle, Send, X, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

const MemberDashboard = ({ onTaskClick }) => {
  const { user, userData, refreshUserData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [raisingIssue, setRaisingIssue] = useState(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', userData?.id)
        .order('created_at', { ascending: false });

      if (data) setTasks(data);
      setLoading(false);
    };

    const fetchTeamMembers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'member')
        .order('yearly_points', { ascending: false });
      
      if (data) setTeamMembers(data);
    };

    if (userData?.id) {
      fetchTasks();
      fetchTeamMembers();
    }

    const channel = supabase
      .channel('tasks_member_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        if (userData?.id) fetchTasks();
      })
      .subscribe();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      if (userData?.id) fetchTasks();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userData?.id]);

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const isResubmit = newStatus === 'completed';
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString(), is_new: false })
        .eq('id', taskId);

      if (error) throw error;

      if (isResubmit) {
        await supabase.from('task_notes').insert({
          task_id: taskId,
          content: '📤 Task resubmitted for review after revision',
          author_id: user.id,
          author_name: userData.display_name,
          author_role: userData.role
        });
      }

      toast.success(`Status updated to "${getStatusLabel(newStatus)}"`, { icon: '✅' });
      refreshUserData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleRaiseIssue = async () => {
    if (!raisingIssue || !issueDescription.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    try {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'issue_raised', updated_at: new Date().toISOString(), is_new: false })
        .eq('id', raisingIssue.id);

      if (taskError) throw taskError;

      const { error: noteError } = await supabase.from('task_notes').insert({
        task_id: raisingIssue.id,
        content: `⚠️ ISSUE RAISED: ${issueDescription.trim()}`,
        author_id: user.id,
        author_name: userData.display_name,
        author_role: userData.role
      });

      if (noteError) throw noteError;

      toast.success('Issue raised! Admin has been notified.', { icon: '🚨' });
      setRaisingIssue(null);
      setIssueDescription('');
    } catch (error) {
      toast.error('Failed to raise issue');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      not_started: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
      in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
      half_done: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
      issue_raised: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
      revision_requested: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      approved: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' }
    };
    return colors[status] || colors.not_started;
  };

  const getStatusLabel = (status) => {
    const labels = { not_started: 'Not Started', in_progress: 'In Progress', half_done: 'Half Done', issue_raised: 'Issue Raised', revision_requested: 'Revision Requested', completed: 'Completed', approved: 'Approved' };
    return labels[status] || 'Unknown';
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return <Zap size={14} className="text-red-500" />;
      case 'high': return <AlertCircle size={14} className="text-amber-500" />;
      case 'medium': return <Target size={14} className="text-blue-500" />;
      default: return <div className="w-3 h-3 rounded-full bg-slate-300"></div>;
    }
  };

  const formatDate = (timestamp) => { if (!timestamp) return ''; return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['approved'].includes(task.status);
    return task.status === filter;
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'approved').length,
    inProgress: tasks.filter(t => ['in_progress', 'half_done'].includes(t.status)).length,
    pending: tasks.filter(t => t.status === 'not_started').length,
    issues: tasks.filter(t => t.status === 'issue_raised').length,
    points: userData?.yearly_points || 0,
    avgScore: tasks.length > 0 ? (tasks.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.points || 0), 0) / Math.max(tasks.filter(t => t.status === 'approved').length, 1)).toFixed(1) : 0
  };

  const getStatusAction = (status) => {
    switch (status) {
      case 'not_started': return { label: 'Start', color: 'bg-amber-500 hover:bg-amber-600' };
      case 'in_progress': return { label: 'Half Done', color: 'bg-blue-500 hover:bg-blue-600' };
      case 'half_done': return { label: 'Complete', color: 'bg-emerald-500 hover:bg-emerald-600' };
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Tasks</h1>
          <p className="text-slate-500">Track and update your assigned tasks</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
          <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
          Live Updates
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><AlertCircle size={16} className="text-amber-500" /></div>
            <span className="text-sm text-slate-500">Pending</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Clock size={16} className="text-blue-500" /></div>
            <span className="text-sm text-slate-500">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Trophy size={16} className="text-red-500" /></div>
            <span className="text-sm text-slate-500">Issues</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.issues}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><Trophy size={16} className="text-purple-500" /></div>
            <span className="text-sm text-slate-500">Points Earned</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.points}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-500" /></div>
            <span className="text-sm text-slate-500">Avg Score</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.avgScore}/10</p>
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Crown size={18} className="text-amber-500" />
            Team Leaderboard
          </h2>
          <span className="text-sm text-slate-500">{teamMembers.length} members</span>
        </div>
        <div className="divide-y divide-slate-100">
          {teamMembers.map((member, index) => {
            const isCurrentUser = member.id === userData?.id;
            return (
              <div key={member.id} className={`p-4 flex items-center justify-between ${isCurrentUser ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8">
                    {index < 3 ? (
                      <span className={`text-lg ${index === 0 ? '' : index === 1 ? '' : ''}`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500 font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: member.avatar_color || '#4F46E5' }}>
                    {member.display_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className={`font-medium ${isCurrentUser ? 'text-primary-700' : 'text-slate-800'}`}>
                      {member.display_name}
                      {isCurrentUser && <span className="ml-2 text-xs text-primary-600">(You)</span>}
                    </p>
                    <p className="text-sm text-slate-500">{member.tasks_completed || 0} tasks completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-amber-500" fill="currentColor" />
                  <span className="text-lg font-bold text-amber-600">{member.yearly_points || 0}</span>
                </div>
              </div>
            );
          })}
          {teamMembers.length === 0 && (
            <div className="p-8 text-center text-slate-500">No team members yet</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'all', label: 'All Tasks', count: stats.total },
            { id: 'active', label: 'Active', count: stats.total - stats.completed },
            { id: 'not_started', label: 'To Do', count: stats.pending },
            { id: 'in_progress', label: 'In Progress', count: stats.inProgress },
            { id: 'half_done', label: 'Half Done', count: tasks.filter(t => t.status === 'half_done').length },
            { id: 'revision_requested', label: '🔄 Revision Requested', count: tasks.filter(t => t.status === 'revision_requested').length, color: 'text-orange-600' },
            { id: 'issue_raised', label: '⚠️ Issues Raised', count: stats.issues, color: 'text-red-600' },
            { id: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'completed').length },
            { id: 'approved', label: 'Approved', count: stats.completed },
          ].map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${filter === tab.id ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              <span className={tab.color || ''}>{tab.label}</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${filter === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTasks.map(task => {
            const colors = getStatusColor(task.status);
            const action = getStatusAction(task.status);
            return (
              <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${colors.dot}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getPriorityIcon(task.priority)}
                          <h3 className="font-medium text-slate-800 truncate">{task.title}</h3>
                          {task.is_new && <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full animate-pulse">New</span>}
                        </div>
                        {task.description && <p className="text-sm text-slate-500 line-clamp-2 mb-2">{task.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Due: {task.due_date ? formatDate(task.due_date) : 'No deadline'}</span>
                          {task.points > 0 && <span className="flex items-center gap-1 text-amber-500"><Star size={12} fill="currentColor" />{task.points} pts earned</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>{getStatusLabel(task.status)}</span>
                        {action && (
                          <button onClick={() => handleStatusUpdate(task.id, action.label === 'Start' ? 'in_progress' : action.label === 'Half Done' ? 'half_done' : 'completed')} className={`px-3 py-1.5 ${action.color} text-white text-xs font-medium rounded-lg transition-colors`}>
                            {action.label}
                          </button>
                        )}
                        {!['completed', 'approved', 'issue_raised'].includes(task.status) && (
                          <button onClick={() => { setRaisingIssue(task); setIssueDescription(''); }} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Raise Issue
                          </button>
                        )}
                      </div>
                    </div>
                    {task.status !== 'completed' && task.status !== 'approved' && (
                      <div className="flex items-center gap-2 mt-3">
                        {['not_started', 'in_progress', 'half_done', 'completed'].map(status => (
                          <button key={status} onClick={() => handleStatusUpdate(task.id, status)} className={`px-2 py-1 text-xs rounded transition-colors ${task.status === status ? getStatusColor(status).bg + ' ' + getStatusColor(status).text : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {getStatusLabel(status)}
                          </button>
                        ))}
                        {task.status === 'revision_requested' && (
                          <button onClick={() => handleStatusUpdate(task.id, 'completed')} className="px-2 py-1 text-xs rounded bg-orange-500 text-white hover:bg-orange-600 ml-2">
                            Resubmit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => onTaskClick(task)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} className="text-slate-400" /></div>
              <h3 className="font-medium text-slate-800 mb-1">No tasks found</h3>
              <p className="text-sm text-slate-500">{filter === 'all' ? "You don't have any tasks assigned yet" : `No ${filter.replace('_', ' ')} tasks`}</p>
            </div>
          )}
        </div>
      </div>

      {/* Raise Issue Modal */}
      {raisingIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                Raise an Issue
              </h2>
              <button onClick={() => setRaisingIssue(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Task:</p>
                <p className="font-medium text-slate-800">{raisingIssue.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Describe the issue</label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="What's blocking you? What do you need help with?"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary-500 outline-none resize-none"
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={() => setRaisingIssue(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleRaiseIssue} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Send size={16} />
                  Submit Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDashboard;
