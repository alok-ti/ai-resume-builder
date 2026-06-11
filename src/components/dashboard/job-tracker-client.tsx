'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  fetchJobApplications, 
  createJobApplication, 
  updateJobApplicationStatus, 
  updateJobApplication, 
  deleteJobApplication 
} from '@/app/dashboard/job-tracker-actions';
import { 
  Trophy, 
  Plus, 
  Trash2, 
  Edit3, 
  Building, 
  Briefcase, 
  DollarSign, 
  Link as LinkIcon, 
  FileText, 
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface JobTrackerClientProps {
  resumes: any[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const STAGES = [
  { id: 'applied', label: 'Applied', color: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
  { id: 'interviewing', label: 'Interviewing', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5' },
  { id: 'offered', label: 'Offer Received', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
  { id: 'rejected', label: 'Rejected', color: 'border-rose-500/30 text-rose-400 bg-rose-500/5' }
];

export function JobTrackerClient({ resumes, showToast }: JobTrackerClientProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form Fields
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('applied');
  const [salary, setSalary] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [resumeId, setResumeId] = useState('');

  const [isSaving, startSaveTransition] = useTransition();

  const loadApplications = async (showLoading = false) => {
    if (showLoading) {
      setTimeout(() => setIsLoading(true), 0);
    }
    try {
      const data = await fetchJobApplications();
      setApplications(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load applications', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadApplications(false);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenCreate = (initialStage: string = 'applied') => {
    setCompany('');
    setPosition('');
    setStatus(initialStage);
    setSalary('');
    setJobUrl('');
    setNotes('');
    setResumeId(resumes[0]?.id || '');
    setCurrentId(null);
    setIsEditing(false);
    setIsOpen(true);
  };

  const handleOpenEdit = (app: any) => {
    setCompany(app.company);
    setPosition(app.position);
    setStatus(app.status);
    setSalary(app.salary || '');
    setJobUrl(app.job_url || '');
    setNotes(app.notes || '');
    setResumeId(app.resume_id || '');
    setCurrentId(app.id);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !position) {
      showToast('Company and Position are required fields', 'error');
      return;
    }

    startSaveTransition(async () => {
      try {
        if (isEditing && currentId) {
          const res = await updateJobApplication(currentId, {
            company,
            position,
            status,
            salary,
            jobUrl,
            notes,
            resumeId: resumeId || undefined
          });
          if (res.success) {
            showToast('Application updated successfully', 'success');
            setIsOpen(false);
            loadApplications(true);
          } else {
            showToast(res.error || 'Failed to update', 'error');
          }
        } else {
          const res = await createJobApplication({
            company,
            position,
            status,
            salary,
            jobUrl,
            notes,
            resumeId: resumeId || undefined
          });
          if (res.success) {
            showToast('Application added successfully', 'success');
            setIsOpen(false);
            loadApplications(true);
          } else {
            showToast(res.error || 'Failed to add application', 'error');
          }
        }
      } catch (err) {
        console.error(err);
        showToast('An error occurred during save', 'error');
      }
    });
  };

  const handleStatusShift = async (id: string, currentStatus: string, direction: 'left' | 'right') => {
    const currentIdx = STAGES.findIndex(s => s.id === currentStatus);
    const nextIdx = currentIdx + (direction === 'right' ? 1 : -1);
    if (nextIdx < 0 || nextIdx >= STAGES.length) return;

    const targetStatus = STAGES[nextIdx].id;
    try {
      const res = await updateJobApplicationStatus(id, targetStatus);
      if (res.success) {
        // Optimistic UI update
        setApplications(prev => prev.map(app => app.id === id ? { ...app, status: targetStatus } : app));
        showToast(`Moved to ${STAGES[nextIdx].label}`, 'success');
      } else {
        showToast(res.error || 'Failed to move status', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error shifting stage', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this application tracking card?')) {
      try {
        const res = await deleteJobApplication(id);
        if (res.success) {
          showToast('Application removed', 'success');
          loadApplications(true);
        } else {
          showToast(res.error || 'Failed to delete', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to delete application', 'error');
      }
    }
  };

  // Group applications by stage
  const groupedApps = STAGES.reduce((acc, stage) => {
    acc[stage.id] = applications.filter(app => app.status === stage.id);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-400" />
            Job Application Tracker
          </h2>
          <p className="text-slate-400 text-xxs leading-relaxed">
            Organize and track your resume submittals through interview cycles on a Kanban board layout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenCreate('applied')}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {/* Kanban Stages Columns Grid */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-2">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-500">Loading tracking dashboard...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {STAGES.map((stage) => {
            const appsInStage = groupedApps[stage.id] || [];
            return (
              <div 
                key={stage.id} 
                className="bg-slate-900/25 border border-slate-900 rounded-2xl p-4 space-y-4 max-h-[80vh] flex flex-col"
              >
                {/* Column header */}
                <div className="flex justify-between items-center border-b border-slate-900 pb-2.5 shrink-0">
                  <span className={`text-xxs uppercase tracking-wider font-extrabold flex items-center gap-1.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      stage.id === 'applied' ? 'bg-blue-500' :
                      stage.id === 'interviewing' ? 'bg-amber-500' :
                      stage.id === 'offered' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    {stage.label}
                  </span>
                  <span className="text-[10px] bg-slate-950/70 border border-slate-850 px-2 py-0.5 rounded-full text-slate-400 font-bold">
                    {appsInStage.length}
                  </span>
                </div>

                {/* Cards Scroll Container */}
                <div className="flex-grow overflow-y-auto space-y-3 pr-0.5 min-h-[150px] scrollbar-thin">
                  {appsInStage.length === 0 ? (
                    <div className="h-[120px] border border-dashed border-slate-900 rounded-xl flex flex-col items-center justify-center text-center p-4">
                      <Briefcase className="w-6 h-6 text-slate-800 mb-1" />
                      <button
                        type="button"
                        onClick={() => handleOpenCreate(stage.id)}
                        className="text-[10px] text-slate-500 hover:text-blue-400 font-semibold cursor-pointer"
                      >
                        + Add app
                      </button>
                    </div>
                  ) : (
                    appsInStage.map((app) => (
                      <div 
                        key={app.id} 
                        className="p-3.5 bg-slate-950 border border-slate-850 hover:border-slate-700/80 rounded-xl flex flex-col justify-between gap-3 group/card shadow-sm transition-all"
                      >
                        {/* Title details */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="font-bold text-xs text-slate-200 line-clamp-1">
                              {app.position}
                            </h4>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(app)}
                                className="text-slate-500 hover:text-indigo-400 p-0.5 rounded cursor-pointer"
                                title="Edit details"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(app.id)}
                                className="text-slate-500 hover:text-red-400 p-0.5 rounded cursor-pointer"
                                title="Delete card"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-light">
                            <Building className="w-3 h-3 text-slate-500" />
                            <span className="font-medium text-slate-300">{app.company}</span>
                          </div>
                        </div>

                        {/* Metadata items list */}
                        <div className="space-y-1 pt-1 border-t border-slate-900/60 text-[9px] text-slate-500">
                          {app.salary && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-emerald-600/70" />
                              <span className="text-slate-400">{app.salary}</span>
                            </div>
                          )}
                          {app.resumes && (
                            <div className="flex items-center gap-1 line-clamp-1">
                              <FileText className="w-3 h-3 text-slate-650" />
                              Resume: <span className="text-slate-400 italic">{app.resumes.title}</span>
                            </div>
                          )}
                          {app.job_url && (
                            <a
                              href={app.job_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:underline"
                            >
                              <LinkIcon className="w-3 h-3" />
                              Job Link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        {/* Transition controls */}
                        <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-slate-900/60">
                          <button
                            type="button"
                            disabled={stage.id === 'applied'}
                            onClick={() => handleStatusShift(app.id, app.status, 'left')}
                            className="p-1 rounded bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move Left"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          
                          <span className="text-[8px] text-slate-600 font-mono">
                            {new Date(app.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                          </span>

                          <button
                            type="button"
                            disabled={stage.id === 'rejected'}
                            onClick={() => handleStatusShift(app.id, app.status, 'right')}
                            className="p-1 rounded bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move Right"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                {isEditing ? 'Edit Application Details' : 'Add Tracking Card'}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Position Title */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position Title *</label>
                  <input
                    type="text"
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Frontend Lead"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Stage Status */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Application Stage</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Target Salary */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salary Range / Budget</label>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. $140k - $160k"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Linked Resume */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resume Submitted</label>
                  <select
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">No Resume Link</option>
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                </div>

                {/* Job Link */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Listing URL</label>
                  <input
                    type="url"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="e.g. https://careers.google.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes & Comments</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Insert interviewer names, preparation keynotes, dates..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-light"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {isEditing ? 'Save Changes' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
