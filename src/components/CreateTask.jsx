import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { ArrowLeft, Plus, User, Calendar, AlertCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const CreateTask = ({ onBack, onTaskCreated }) => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigneeId: '',
    assigneeName: '',
    priority: 'medium',
    dueDate: '',
    notes: ''
  });

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase.from('users').select('*').eq('role', 'member');
      if (data) setTeamMembers(data);
    };
    fetchMembers();

    // Auto-refresh members every 5 seconds
    const interval = setInterval(() => {
      fetchMembers();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssigneeChange = (member) => {
    setFormData(prev => ({ ...prev, assigneeId: member.id, assigneeName: member.display_name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('Please enter a task title'); return; }
    if (!formData.assigneeId) { toast.error('Please select an assignee'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignee_id: formData.assigneeId,
        assignee_name: formData.assigneeName,
        created_by: user.id,
        status: 'not_started',
        priority: formData.priority,
        due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        is_new: true
      });

      if (error) throw error;
      toast.success(`Task "${formData.title}" assigned to ${formData.assigneeName}`, { icon: '✅' });
      onTaskCreated();
    } catch (error) {
      toast.error('Failed to create task');
    }
    setLoading(false);
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft size={20} />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Plus size={24} className="text-primary-600" />
            Create New Task
          </h1>
          <p className="text-sm text-slate-500 mt-1">Assign a task to your team member</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Task Title <span className="text-red-500">*</span></label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none" placeholder="What needs to be done?" maxLength={100} required />
            <p className="text-xs text-slate-400 mt-1 text-right">{formData.title.length}/100</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none resize-none" placeholder="Provide more details about the task..." rows={3} maxLength={500} />
            <p className="text-xs text-slate-400 mt-1 text-right">{formData.description.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Assign To <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {teamMembers.map(member => (
                <button key={member.id} type="button" onClick={() => handleAssigneeChange(member)} className={`p-3 rounded-lg border-2 transition-all text-left ${formData.assigneeId === member.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: member.avatar_color || '#4F46E5' }}>{getInitials(member.display_name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate text-sm">{member.display_name}</p>
                      <p className="text-xs text-slate-500">{member.yearly_points || 0} pts</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {teamMembers.length === 0 && <p className="text-sm text-slate-500 mt-2">No team members found. Add members first.</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
              <div className="relative">
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select name="priority" value={formData.priority} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none appearance-none bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button type="button" onClick={onBack} className="px-6 py-3 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !formData.assigneeId} className="flex-1 py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Send size={18} /> Assign Task</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTask;
