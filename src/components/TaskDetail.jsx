import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, BUCKET_NAME } from '../supabase';
import { X, Edit2, Trash2, Upload, FileText, Image, Download, Eye, Paperclip, AlertTriangle, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const TaskDetail = ({ task, onClose }) => {
  const { user, userData } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const fileInputRef = useRef(null);
  const notesEndRef = useRef(null);
  const isLeader = userData?.role === 'leader';

  const fetchNotes = async () => {
    const { data } = await supabase.from('task_notes').select('*').eq('task_id', task.id).order('created_at', { ascending: true });
    if (data) setNotes(data);
  };

  const fetchAttachments = async () => {
    const { data } = await supabase.from('task_attachments').select('*').eq('task_id', task.id).order('created_at', { ascending: true });
    if (data) setAttachments(data);
  };

  useEffect(() => {
    if (task.id) {
      fetchNotes();
      fetchAttachments();
    }
  }, [task.id]);

  useEffect(() => { notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [notes]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('task_notes').insert({
        task_id: task.id,
        content: newNote.trim(),
        author_id: user.id,
        author_name: userData.display_name,
        author_role: userData.role
      });
      if (error) throw error;
      fetchNotes();
      setNewNote('');
    } catch (error) { toast.error('Failed to add note'); }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${task.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, selectedFile);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from('task_attachments').insert({
        task_id: task.id,
        file_name: selectedFile.name,
        file_url: urlData.publicUrl,
        file_path: fileName,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        uploaded_by: user.id,
        uploaded_by_name: userData.display_name
      });
      
      if (dbError) throw dbError;
      
      toast.success('File uploaded successfully!');
      fetchAttachments();
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error('Failed to upload file: ' + error.message);
    }
    setUploading(false);
  };

  const handleDownload = async (attachment) => {
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download(attachment.file_path);
      if (error) throw error;
      
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

  const handleDeleteAttachment = async (attachment) => {
    try {
      await supabase.storage.from(BUCKET_NAME).remove([attachment.file_path]);
      await supabase.from('task_attachments').delete().eq('id', attachment.id);
      toast.success('File deleted');
      fetchAttachments();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString(), is_new: false }).eq('id', task.id);
      if (error) throw error;
      toast.success(`Status updated to "${getStatusLabel(newStatus)}"`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) { toast.error('Failed to update status'); }
  };

  const handleSaveEdit = async () => {
    if (!isEditing) return;
    const { error } = await supabase.from('tasks').update({ title: task.title, description: task.description, priority: task.priority, due_date: task.due_date, updated_at: new Date().toISOString() }).eq('id', task.id);
    if (error) { toast.error('Failed to update task'); } else { toast.success('Task updated successfully'); setIsEditing(false); setTimeout(() => window.location.reload(), 1000); }
  };

  const handleRaiseIssue = async () => {
    if (!issueDescription.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    try {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'issue_raised', updated_at: new Date().toISOString(), is_new: false })
        .eq('id', task.id);

      if (taskError) throw taskError;

      const { error: noteError } = await supabase.from('task_notes').insert({
        task_id: task.id,
        content: `⚠️ ISSUE RAISED: ${issueDescription.trim()}`,
        author_id: user.id,
        author_name: userData.display_name,
        author_role: userData.role
      });

      if (noteError) throw noteError;

      toast.success('Issue raised! Admin has been notified.', { icon: '🚨' });
      setShowIssueModal(false);
      setIssueDescription('');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Failed to raise issue');
    }
  };

  const handleDeleteTask = async () => {
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) { toast.error('Failed to delete task'); } else { toast.success('Task deleted successfully'); onClose(); }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
    return <FileText size={20} className="text-slate-500" />;
  };

  const getStatusColor = (status) => {
    const colors = { not_started: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }, in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' }, half_done: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' }, issue_raised: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }, revision_requested: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' }, completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' }, approved: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' } };
    return colors[status] || colors.not_started;
  };

  const getStatusLabel = (status) => {
    const labels = { not_started: 'Not Started', in_progress: 'In Progress', half_done: 'Half Done', issue_raised: 'Issue Raised', revision_requested: 'Revision Requested', completed: 'Completed', approved: 'Approved' };
    return labels[status] || 'Unknown';
  };

  const getPriorityColor = (priority) => {
    const colors = { low: 'text-slate-500 bg-slate-100', medium: 'text-blue-500 bg-blue-100', high: 'text-amber-500 bg-amber-100', urgent: 'text-red-500 bg-red-100' };
    return colors[priority] || colors.medium;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    return formatDate(timestamp);
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const currentColors = getStatusColor(task.status);

  return (
    <div className="h-full lg:h-auto lg:max-w-4xl lg:mx-auto lg:rounded-2xl lg:shadow-2xl bg-white lg:my-8 flex flex-col">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"><X size={24} /></button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${currentColors.bg} ${currentColors.text}`}>{getStatusLabel(task.status)}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)} capitalize`}>{task.priority}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">{task.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLeader && (
            <>
              <button onClick={() => setIsEditing(!isEditing)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit"><Edit2 size={18} /></button>
              <button onClick={() => setShowDelete(true)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={18} /></button>
            </>
          )}
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors hidden lg:block"><X size={24} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><span className="text-emerald-600 font-medium">{task.assignee_name?.[0]?.toUpperCase()}</span></div>
              <div><p className="text-xs text-slate-500">Assigned to</p><p className="font-medium text-slate-800">{task.assignee_name}</p></div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-blue-600">📅</span></div>
              <div><p className="text-xs text-slate-500">Due Date</p><p className="font-medium text-slate-800">{task.due_date ? formatDate(task.due_date) : 'No deadline'}</p></div>
            </div>
          </div>

          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
              <p className="text-slate-700 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Attachments Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
              <Paperclip size={16} />
              Attachments & Proof of Work ({attachments.length})
            </h3>
            
            {/* Upload Section */}
            <div className="mb-4 p-4 border-2 border-dashed border-slate-200 rounded-lg hover:border-primary-400 transition-colors">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                <Upload size={24} className="text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">
                  {selectedFile ? selectedFile.name : 'Click to upload files, images, or screenshots'}
                </span>
                <span className="text-xs text-slate-400 mt-1">Max file size: 10MB</span>
              </label>
              {selectedFile && (
                <div className="mt-3 flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getFileIcon(selectedFile.type)}
                    <div>
                      <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedFile(null)} className="px-3 py-1 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={handleUpload} disabled={uploading} className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments List */}
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      {getFileIcon(attachment.file_type)}
                      <div>
                        <p className="text-sm font-medium text-slate-700">{attachment.file_name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <span>•</span>
                          <span>by {attachment.uploaded_by_name}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(attachment.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => window.open(attachment.file_url, '_blank')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleDownload(attachment)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Download">
                        <Download size={16} />
                      </button>
                      <button onClick={() => handleDeleteAttachment(attachment)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No attachments yet</p>
            )}
          </div>

          {task.status === 'approved' && task.points > 0 && (
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center"><span className="text-2xl">🏆</span></div>
              <div><p className="text-sm text-amber-600">Points Earned</p><p className="text-2xl font-bold text-amber-700">{task.points} / 10</p></div>
            </div>
          )}

          {!isLeader && task.status !== 'approved' && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {['not_started', 'in_progress', 'half_done', 'completed'].map(status => {
                  const colors = getStatusColor(status);
                  return (
                    <button key={status} onClick={() => handleStatusUpdate(status)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${task.status === status ? `${colors.bg} ${colors.text}` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>{getStatusLabel(status)}</div>
                    </button>
                  );
                })}
              </div>
              {!['completed', 'approved', 'issue_raised'].includes(task.status) && (
                <button onClick={() => setShowIssueModal(true)} className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Raise Issue
                </button>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">Notes & Comments ({notes.length})</h3>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {notes.map(note => (
                <div key={note.id} className={`p-3 rounded-lg ${note.author_id === user.id ? 'bg-primary-50 ml-8' : 'bg-slate-50 mr-8'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: isLeader ? '#4F46E5' : '#10B981' }}>{getInitials(note.author_name)}</div>
                    <span className="font-medium text-slate-800 text-sm">{note.author_name}</span>
                    <span className="text-xs text-slate-400">{formatTimeAgo(note.created_at)}</span>
                  </div>
                  <p className="text-slate-700 text-sm pl-8">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No notes yet. Start the conversation!</p>}
              <div ref={notesEndRef} />
            </div>
            <form onSubmit={handleAddNote} className="flex items-center gap-2">
              <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note or comment..." className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 outline-none" />
              <button type="submit" disabled={loading || !newNote.trim()} className="p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"><span className="text-lg">→</span></button>
            </form>
          </div>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} className="text-red-600" /></div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Delete Task?</h2>
              <p className="text-slate-500 mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleDeleteTask} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                Raise an Issue
              </h2>
              <button onClick={() => setShowIssueModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Task:</p>
                <p className="font-medium text-slate-800">{task.title}</p>
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
                <button onClick={() => setShowIssueModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
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

export default TaskDetail;
