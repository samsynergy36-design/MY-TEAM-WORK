import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { 
  CheckCircle2, Clock, AlertCircle, Trophy, TrendingUp, AlertTriangle,
  Users, CheckCircle, Star, ChevronRight, RefreshCw, Edit2, Trash2, X, Eye, Paperclip, FileText, Image, Download, MessageSquare, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

const LeaderDashboard = ({ onTaskClick }) => {
  const { user, userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, pending: 0, approved: 0 });
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });
  const [deletingTask, setDeletingTask] = useState(null);
  const [approvingTask, setApprovingTask] = useState(null);
  const [approvingTaskAttachments, setApprovingTaskAttachments] = useState([]);
  const [points, setPoints] = useState(5);
  const [issueTask, setIssueTask] = useState(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [issueNotes, setIssueNotes] = useState([]);
  const [issueReply, setIssueReply] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  const calculateStats = useCallback((tasksData) => {
    setStats({
      total: tasksData.length,
      completed: tasksData.filter(t => t.status === 'completed').length,
      inProgress: tasksData.filter(t => t.status === 'in_progress' || t.status === 'half_done').length,
      pending: tasksData.filter(t => t.status === 'not_started').length,
      approved: tasksData.filter(t => t.status === 'approved').length,
      issues: tasksData.filter(t => t.status === 'issue_raised').length
    });
  }, []);

  const fetchData = async () => {
    const [tasksRes, membersRes] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*').eq('role', 'member')
    ]);

    if (tasksRes.data) setTasks(tasksRes.data);
    if (membersRes.data) setTeamMembers(membersRes.data);
    calculateStats(tasksRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const tasksChannel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchData();
      })
      .subscribe();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => {
      supabase.removeChannel(tasksChannel);
      clearInterval(interval);
    };
  }, [calculateStats]);

  const handleEditTask = (task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        due_date: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingTask.id);

    if (error) {
      toast.error('Failed to update task');
    } else {
      toast.success('Task updated successfully');
      setEditingTask(null);
      fetchData();
    }
  };

  const handleDeleteTask = async () => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', deletingTask.id);

    if (error) {
      toast.error('Failed to delete task');
    } else {
      toast.success('Task deleted successfully');
      setDeletingTask(null);
      fetchData();
    }
  };

  const fetchAttachmentsForTask = async (taskId) => {
    const { data } = await supabase.from('task_attachments').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
    if (data) setApprovingTaskAttachments(data);
  };

  const handleApprove = async () => {
    if (!approvingTask) return;
    
    try {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'approved', points, approved_at: new Date().toISOString(), approved_by: user.id, is_new: false })
        .eq('id', approvingTask.id);

      if (taskError) throw taskError;

      const member = teamMembers.find(m => m.id === approvingTask.assignee_id);
      if (member) {
        await supabase
          .from('users')
          .update({ 
            yearly_points: (member.yearly_points || 0) + points,
            total_points: (member.total_points || 0) + points,
            tasks_completed: (member.tasks_completed || 0) + 1
          })
          .eq('id', approvingTask.assignee_id);
      }

      toast.success(`Task approved! ${points} points awarded.`, { icon: '🎉' });
      setApprovingTask(null);
      setApprovingTaskAttachments([]);
      fetchData();
    } catch (error) {
      toast.error('Failed to approve task');
    }
  };

  const openApprovalModal = (task) => {
    setApprovingTask(task);
    setPoints(5);
    fetchAttachmentsForTask(task.id);
  };

  const handleSendReminder = async () => {
    if (!issueTask || !reminderMessage.trim()) {
      toast.error('Please enter a reminder message');
      return;
    }
    try {
      const { error } = await supabase.from('task_notes').insert({
        task_id: issueTask.id,
        content: `📝 REPLY from Admin: ${reminderMessage.trim()}`,
        author_id: user.id,
        author_name: userData.display_name,
        author_role: userData.role
      });

      if (error) throw error;

      toast.success('Reply sent!', { icon: '📨' });
      setReminderMessage('');
      fetchIssueNotes(issueTask.id);
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const fetchIssueNotes = async (taskId) => {
    setLoadingNotes(true);
    const { data } = await supabase.from('task_notes').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
    if (data) setIssueNotes(data);
    setLoadingNotes(false);
  };

  const handleResolveIssue = async (newStatus) => {
    if (!issueTask) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', issueTask.id);

      if (error) throw error;

      toast.success(`Issue resolved to "${getStatusLabel(newStatus)}"`, { icon: '✅' });
      setIssueTask(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openIssueModal = (task) => {
    setIssueTask(task);
    setReminderMessage('');
    setIssueNotes([]);
    fetchIssueNotes(task.id);
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const diff = new Date() - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image size={18} className="text-blue-500" />;
    return <FileText size={18} className="text-slate-500" />;
  };

  const handleDownload = async (attachment) => {
    try {
      const { data } = await supabase.storage.from('task-attachments').download(attachment.file_path);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      not_started: 'bg-red-100 text-red-700 border-red-200',
      in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
      half_done: 'bg-blue-100 text-blue-700 border-blue-200',
      issue_raised: 'bg-red-100 text-red-700 border-red-200',
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      approved: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return colors[status] || colors.not_started;
  };

  const getStatusLabel = (status) => {
    const labels = { not_started: 'Not Started', in_progress: 'In Progress', half_done: 'Half Done', issue_raised: 'Issue Raised', completed: 'Completed', approved: 'Approved' };
    return labels[status] || 'Unknown';
  };

  const getPriorityColor = (priority) => {
    const colors = { low: 'text-slate-500', medium: 'text-blue-500', high: 'text-amber-500', urgent: 'text-red-500' };
    return colors[priority] || colors.medium;
  };

  const getMemberStats = (memberId) => {
    const memberTasks = tasks.filter(t => t.assignee_id === memberId);
    return {
      total: memberTasks.length,
      completed: memberTasks.filter(t => t.status === 'approved').length,
      inProgress: memberTasks.filter(t => ['in_progress', 'half_done', 'completed'].includes(t.status)).length,
      points: memberTasks.reduce((sum, t) => sum + (t.points || 0), 0)
    };
  };

  const sortedMembers = [...teamMembers].sort((a, b) => (b.yearly_points || 0) - (a.yearly_points || 0));
  const formatDate = (timestamp) => { if (!timestamp) return ''; const date = new Date(timestamp); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
          <h1 className="text-2xl font-bold text-slate-800">Team Dashboard</h1>
          <p className="text-slate-500">Monitor your team's progress in real-time</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
          <RefreshCw size={14} />
          Live Updates
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard icon={AlertCircle} label="Pending" value={stats.pending} color="red" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} color="amber" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="emerald" />
        <StatCard icon={CheckCircle} label="Approved" value={stats.approved} color="purple" />
        <StatCard icon={Trophy} label="Total Points" value={teamMembers.reduce((sum, m) => sum + (m.yearly_points || 0), 0)} color="amber" />
        <StatCard icon={AlertTriangle} label="Issues Raised" value={stats.issues} color="red" />
      </div>

      {/* Pending Approvals Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle size={18} className="text-primary-600" />
            Pending Approvals
          </h2>
          <span className="text-sm text-slate-500">{tasks.filter(t => t.status === 'completed').length} tasks</span>
        </div>
        <div className="divide-y divide-slate-100">
          {tasks.filter(t => t.status === 'completed').length === 0 ? (
            <div className="p-8 text-center text-slate-500">No tasks pending approval</div>
          ) : (
            tasks.filter(t => t.status === 'completed').map(task => (
              <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 mb-1">{task.title}</h3>
                    <p className="text-sm text-slate-500">by {task.assignee_name}</p>
                  </div>
                  <button onClick={() => openApprovalModal(task)} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                    <CheckCircle size={16} />
                    Review & Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Issues Raised Section */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
          <h2 className="font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            Issues Raised
          </h2>
          <span className="text-sm text-red-600">{tasks.filter(t => t.status === 'issue_raised').length} issues</span>
        </div>
        <div className="divide-y divide-slate-100">
          {tasks.filter(t => t.status === 'issue_raised').length === 0 ? (
            <div className="p-8 text-center text-slate-500">No issues raised</div>
          ) : (
            tasks.filter(t => t.status === 'issue_raised').map(task => (
              <div key={task.id} className="p-4 hover:bg-red-50/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-800">{task.title}</h3>
                    </div>
                    <p className="text-sm text-slate-500">by {task.assignee_name}</p>
                    {task.description && <p className="text-sm text-slate-600 mt-1 line-clamp-1">{task.description}</p>}
                  </div>
                  <button onClick={() => openIssueModal(task)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                    <MessageSquare size={16} />
                    View & Reply
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            All Tasks
          </h2>
          <span className="text-sm text-slate-500">{tasks.length} total</span>
        </div>
        <div className="divide-y divide-slate-100">
          {tasks.map(task => (
            <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-800 truncate">{task.title}</h3>
                    {task.is_new && <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full animate-pulse">New</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#10B981' }}>{task.assignee_name?.[0]?.toUpperCase() || 'U'}</div>
                      {task.assignee_name}
                    </span>
                    <span className={getPriorityColor(task.priority)}>{task.priority}</span>
                    <span>{formatDate(task.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>{getStatusLabel(task.status)}</span>
                  <button onClick={() => handleEditTask(task)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit Task">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => setDeletingTask(task)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Task">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <div className="p-8 text-center text-slate-500">No tasks yet. Create your first task!</div>}
        </div>
      </div>

      {/* Approve Task Modal - Review Proof of Work */}
      {approvingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-500" />
                Review & Approve Task
              </h2>
              <button onClick={() => { setApprovingTask(null); setApprovingTaskAttachments([]); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Task Info */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-slate-800 text-lg">{approvingTask.title}</h3>
                {approvingTask.description && <p className="text-sm text-slate-600 mt-2">{approvingTask.description}</p>}
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-medium">{approvingTask.assignee_name?.[0]?.toUpperCase()}</div>
                    {approvingTask.assignee_name}
                  </span>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Completed</span>
                </div>
              </div>

              {/* Proof of Work - Attachments */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-medium text-slate-800 flex items-center gap-2 mb-3">
                  <Paperclip size={18} className="text-blue-600" />
                  Proof of Work ({approvingTaskAttachments.length} files)
                </h4>
                
                {approvingTaskAttachments.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No proof of work uploaded yet</p>
                ) : (
                  <div className="space-y-2">
                    {approvingTaskAttachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3">
                          {getFileIcon(attachment.file_type)}
                          <div>
                            <p className="text-sm font-medium text-slate-700">{attachment.file_name}</p>
                            <p className="text-xs text-slate-400">{formatFileSize(attachment.file_size)} • by {attachment.uploaded_by_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => window.open(attachment.file_url, '_blank')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => handleDownload(attachment)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Download">
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Points Award */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Award Reward Points (out of 10)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value))}
                    className="flex-1 accent-primary-600"
                  />
                  <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-amber-600">{points}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {points <= 3 ? 'Needs improvement' : points <= 6 ? 'Good work' : points <= 8 ? 'Great work!' : 'Excellent work!'}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
              <button onClick={() => { setApprovingTask(null); setApprovingTaskAttachments([]); }} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleApprove} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                <CheckCircle size={18} />
                Approve & Award {points} Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit2 size={20} className="text-primary-600" />Edit Task</h2>
              <button onClick={() => setEditingTask(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 outline-none resize-none" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 outline-none bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button onClick={() => setEditingTask(null)} className="px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Delete Task?</h2>
              <p className="text-slate-500 mb-6">Are you sure you want to delete "{deletingTask.title}"? This action cannot be undone.</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setDeletingTask(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleDeleteTask} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Detail Modal */}
      {issueTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                Issue Details
              </h2>
              <button onClick={() => setIssueTask(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm text-red-600 font-medium mb-1">Task:</p>
                <p className="font-semibold text-slate-800">{issueTask.title}</p>
                <p className="text-sm text-slate-500 mt-1">Assigned to: {issueTask.assignee_name}</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Issue Conversation</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {loadingNotes ? (
                    <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
                  ) : issueNotes.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No messages yet</p>
                  ) : (
                    issueNotes.map(note => (
                      <div key={note.id} className={`p-3 rounded-lg ${note.author_role === 'leader' ? 'bg-blue-50 ml-8' : 'bg-slate-50 mr-8'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800 text-sm">{note.author_name}</span>
                          <span className="text-xs text-slate-400">{formatTimeAgo(note.created_at)}</span>
                        </div>
                        <p className="text-slate-700 text-sm">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reply to this issue</label>
                <textarea
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary-500 outline-none resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-slate-600">Resolve Issue:</span>
                <button onClick={() => handleResolveIssue('in_progress')} className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-lg hover:bg-amber-200">Back to In Progress</button>
                <button onClick={() => handleResolveIssue('not_started')} className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200">Reset to Not Started</button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIssueTask(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Close</button>
                <button onClick={handleSendReminder} disabled={!reminderMessage.trim()} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send size={16} />
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = { red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600', purple: 'bg-purple-50 text-purple-600', blue: 'bg-blue-50 text-blue-600' };
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}><Icon size={20} /></div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
};

export default LeaderDashboard;
