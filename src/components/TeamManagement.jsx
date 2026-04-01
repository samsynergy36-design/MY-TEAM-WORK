import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { ArrowLeft, Users, Trophy, CheckCircle2, TrendingUp, Star, Crown, Plus, X, UserPlus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TeamManagement = ({ onBack }) => {
  const { refreshUserData } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ username: '', displayName: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', displayName: '', password: '' });
  const [deletingMember, setDeletingMember] = useState(null);

  const fetchMembers = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'member').order('yearly_points', { ascending: false });
    if (data) setTeamMembers(data);
    setLoading(false);
  };

  useEffect(() => { 
    fetchMembers(); 

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchMembers();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.username || !newMember.displayName || !newMember.password) {
      toast.error('Please fill all fields');
      return;
    }
    if (newMember.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('users').insert({
        username: newMember.username,
        password: newMember.password,
        display_name: newMember.displayName,
        role: 'member',
        avatar_color: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'][Math.floor(Math.random() * 7)]
      });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('Username already exists');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(`${newMember.displayName} added successfully!`);
        setNewMember({ username: '', displayName: '', password: '' });
        setShowAddModal(false);
        fetchMembers();
      }
    } catch (error) {
      toast.error('Failed to add member');
    }
    setCreating(false);
  };

  const handleEditClick = (member) => {
    setEditingMember(member);
    setEditForm({
      username: member.username,
      displayName: member.display_name || '',
      password: ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.username || !editForm.displayName) {
      toast.error('Username and display name are required');
      return;
    }

    try {
      const updateData = {
        username: editForm.username,
        display_name: editForm.displayName
      };

      if (editForm.password && editForm.password.length >= 6) {
        updateData.password = editForm.password;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingMember.id);

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('Username already exists');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Member updated successfully!');
        setEditingMember(null);
        setEditForm({ username: '', displayName: '', password: '' });
        fetchMembers();
      }
    } catch (error) {
      toast.error('Failed to update member');
    }
  };

  const handleDeleteMember = async () => {
    if (!deletingMember) return;

    try {
      const { error: taskError } = await supabase
        .from('tasks')
        .delete()
        .eq('assignee_id', deletingMember.id);

      if (taskError) throw taskError;

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', deletingMember.id);

      if (userError) throw userError;

      toast.success(`${deletingMember.display_name} removed from team`);
      setDeletingMember(null);
      fetchMembers();
    } catch (error) {
      toast.error('Failed to delete member');
    }
  };

  const sortedMembers = [...teamMembers].sort((a, b) => (b.yearly_points || 0) - (a.yearly_points || 0));
  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const formatDate = (timestamp) => { if (!timestamp) return 'Unknown'; return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

  const totalTeamPoints = teamMembers.reduce((sum, m) => sum + (m.yearly_points || 0), 0);
  const totalTasksCompleted = teamMembers.reduce((sum, m) => sum + (m.tasks_completed || 0), 0);
  const averagePoints = teamMembers.length > 0 ? (totalTeamPoints / teamMembers.length).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"><ArrowLeft size={20} />Back to Dashboard</button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users size={28} className="text-primary-600" />Team Management</h1>
          <p className="text-slate-500">Manage your team members</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">
          <UserPlus size={18} />
          Add Team Member
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-2"><Users size={20} className="text-primary-600" /></div>
          <p className="text-2xl font-bold text-slate-800">{teamMembers.length}</p>
          <p className="text-sm text-slate-500">Team Members</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-2"><Trophy size={20} className="text-amber-500" /></div>
          <p className="text-2xl font-bold text-slate-800">{totalTeamPoints}</p>
          <p className="text-sm text-slate-500">Total Points</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-2"><CheckCircle2 size={20} className="text-emerald-500" /></div>
          <p className="text-2xl font-bold text-slate-800">{totalTasksCompleted}</p>
          <p className="text-sm text-slate-500">Tasks Completed</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2"><TrendingUp size={20} className="text-blue-500" /></div>
          <p className="text-2xl font-bold text-slate-800">{averagePoints}</p>
          <p className="text-sm text-slate-500">Avg Points/Member</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Crown size={18} className="text-amber-500" />Performance Leaderboard</h2>
          <span className="text-sm text-slate-500">Year {new Date().getFullYear()}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tasks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Points</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Avg Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMembers.map((member, index) => {
                const avgScore = member.tasks_completed > 0 ? (member.yearly_points / member.tasks_completed).toFixed(1) : '0.0';
                return (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-400 text-amber-900' : index === 1 ? 'bg-slate-300 text-slate-700' : 'bg-amber-600 text-white'}`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </div>
                        ) : (
                          <span className="w-8 h-8 flex items-center justify-center text-slate-500 font-medium">{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: member.avatar_color || '#4F46E5' }}>{getInitials(member.display_name)}</div>
                        <div>
                          <p className="font-medium text-slate-800">{member.display_name}</p>
                          <p className="text-xs text-slate-500">@{member.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /><span className="text-slate-700">{member.tasks_completed || 0}</span></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2"><Star size={16} className="text-amber-500" fill="currentColor" /><span className="font-semibold text-amber-600">{member.yearly_points || 0}</span></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-700">{avgScore}</span><span className="text-slate-400 text-sm">/10</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(member.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditClick(member)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeletingMember(member)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {teamMembers.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Users size={32} className="text-slate-400" /></div>
              <h3 className="font-medium text-slate-800 mb-1">No team members yet</h3>
              <p className="text-sm text-slate-500">Click "Add Team Member" to create one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserPlus size={20} className="text-primary-600" />Add Team Member</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input type="text" value={newMember.username} onChange={(e) => setNewMember({ ...newMember, username: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="johndoe" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" value={newMember.displayName} onChange={(e) => setNewMember({ ...newMember, displayName: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="John Doe" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input type="password" value={newMember.password} onChange={(e) => setNewMember({ ...newMember, password: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="Minimum 6 characters" required minLength={6} />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {creating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><UserPlus size={18} />Add Member</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit2 size={20} className="text-primary-600" />Edit Team Member</h2>
              <button onClick={() => setEditingMember(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="johndoe" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="John Doe" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password (leave empty to keep current)</label>
                <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="Minimum 6 characters" minLength={6} />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button onClick={() => setEditingMember(null)} className="px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Edit2 size={18} />Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Remove Team Member?</h2>
              <p className="text-slate-500 mb-6">Are you sure you want to remove "{deletingMember.display_name}"? This will also delete all their tasks. This action cannot be undone.</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setDeletingMember(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleDeleteMember} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
