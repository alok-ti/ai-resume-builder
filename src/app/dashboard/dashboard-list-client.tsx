'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createResume, deleteResume, duplicateResume } from './actions';
import { logout } from '../auth/actions';
import { CoverLettersClient } from '@/components/dashboard/cover-letters-client';
import { JobTrackerClient } from '@/components/dashboard/job-tracker-client';
import { AnalyticsClient } from '@/components/dashboard/analytics-client';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Sparkles,
  LayoutGrid,
  Loader2,
  LogOut,
  FolderOpen,
  Award,
  Trophy,
  Activity,
  CheckCircle,
  XCircle,
  Info,
  Copy,
  UploadCloud
} from 'lucide-react';
import { ImportResumeModal } from '@/components/dashboard/import-resume-modal';

interface DashboardListClientProps {
  resumes: any[];
  profile?: any;
  userEmail?: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastIdCounter = 0;

export function DashboardListClient({ resumes, profile, userEmail }: DashboardListClientProps) {
  const router = useRouter();
  const [isCreating, startCreateTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();
  
  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Creation status for custom loading overlays
  const [creationStatus, setCreationStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'resumes' | 'cover-letters' | 'job-tracker' | 'analytics'>('resumes');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleCreate = (templateId: string, title: string) => {
    setCreationStatus('creating');
    showToast('Creating draft...', 'info');
    startCreateTransition(async () => {
      try {
        const result = await createResume(templateId, title);
        console.log('client handleCreate createResume response:', result);
        if (result?.success && result.id) {
          setCreationStatus('success');
          showToast('Draft created', 'success');
          // Small transition delay so user sees success state
          await new Promise((resolve) => setTimeout(resolve, 800));
          router.push(`/builder/${result.id}`);
          // Reset status after redirection kicks in
          setTimeout(() => setCreationStatus('idle'), 2000);
        } else {
          setCreationStatus('error');
          showToast(result?.error || 'Failed to create draft.', 'error');
          setTimeout(() => setCreationStatus('idle'), 3000);
        }
      } catch (err) {
        console.error('Unexpected client-side error in handleCreate:', err);
        setCreationStatus('error');
        showToast('An unexpected error occurred.', 'error');
        setTimeout(() => setCreationStatus('idle'), 3000);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      setDeletingId(id);
      startDeleteTransition(async () => {
        try {
          await deleteResume(id);
          showToast('Resume deleted successfully.', 'success');
        } catch (err) {
          console.error(err);
          showToast('Failed to delete resume.', 'error');
        } finally {
          setDeletingId(null);
        }
      });
    }
  };

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [, startDuplicateTransition] = useTransition();

  const handleDuplicate = (id: string) => {
    setDuplicatingId(id);
    showToast('Duplicating resume...', 'info');
    startDuplicateTransition(async () => {
      try {
        const result = await duplicateResume(id);
        if (result?.success) {
          showToast('Resume duplicated successfully.', 'success');
          router.refresh();
        } else {
          showToast(result?.error || 'Failed to duplicate resume.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to duplicate resume.', 'error');
      } finally {
        setDuplicatingId(null);
      }
    });
  };

  // Helper to get relative time or simple formatted date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getTemplateName = (tId: string) => {
    switch (tId) {
      case 'modern-minimalist': return 'Modern Minimalist';
      case 'professional': return 'Professional Serif';
      case 'executive': return 'Executive Split';
      default: return tId;
    }
  };

  const totalResumes = resumes.length;
  const displayName = profile?.full_name || userEmail?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans relative overflow-hidden">
      
      {/* Toast Notifications Container */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4.5 py-3 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-950/85 border-emerald-500/30 text-emerald-400'
                : toast.type === 'error'
                ? 'bg-red-950/85 border-red-500/30 text-red-400'
                : 'bg-slate-900/90 border-blue-500/30 text-blue-400'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-400" />
            ) : toast.type === 'error' ? (
              <XCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />
            ) : (
              <Info className="w-4.5 h-4.5 shrink-0 text-blue-400" />
            )}
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Full Screen Loading Overlay for creation */}
      {creationStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex flex-col justify-center items-center gap-4 animate-fade-in">
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl flex flex-col items-center gap-3 shadow-2xl">
            {creationStatus === 'creating' && (
              <>
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <div className="text-center space-y-0.5">
                  <h4 className="text-sm font-bold text-white">Creating Draft...</h4>
                  <p className="text-xxs text-slate-400">Formatting layout templates & metadata</p>
                </div>
              </>
            )}
            {creationStatus === 'success' && (
              <>
                <CheckCircle className="w-8 h-8 text-emerald-400 animate-pulse" />
                <div className="text-center space-y-0.5">
                  <h4 className="text-sm font-bold text-emerald-400">Draft Saved</h4>
                  <p className="text-xxs text-slate-400">Redirecting to editor workspace...</p>
                </div>
              </>
            )}
            {creationStatus === 'error' && (
              <>
                <XCircle className="w-8 h-8 text-red-400 animate-pulse" />
                <div className="text-center space-y-0.5">
                  <h4 className="text-sm font-bold text-red-400">Failed to Create Draft</h4>
                  <p className="text-xxs text-slate-400">Please try again.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Glow Effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
            AI Resume Builder
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-400 border border-slate-700 uppercase">
                {displayName.charAt(0)}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                {displayName}
              </span>
            </div>
            
            <button
              type="button"
              onClick={async () => {
                await logout();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Layout workspace */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Nav */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Workspace</h3>
            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('resumes')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-left transition-all cursor-pointer border ${
                  activeTab === 'resumes'
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                All Resumes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cover-letters')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-left transition-all cursor-pointer border ${
                  activeTab === 'cover-letters'
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Cover Letters
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('job-tracker')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-left transition-all cursor-pointer border ${
                  activeTab === 'job-tracker'
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Trophy className="w-4 h-4" />
                Job Tracker
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-left transition-all cursor-pointer border ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Activity className="w-4 h-4" />
                Resume Analytics
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Overview Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Total Documents
                </span>
                <span className="font-bold text-white">{totalResumes}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Avg Match Rating
                </span>
                <span className="font-bold text-white">--</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-3 space-y-8">
          {activeTab === 'resumes' && (
            <>
              {/* Welcome section */}
              <div className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl">
                <div className="space-y-2 text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 justify-center sm:justify-start">
                    Welcome back, {displayName}!
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm max-w-lg leading-relaxed">
                    Create new layout variants using our ATS-optimized structures, analyze skill sets, or download a printable PDF copy.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl transition-all duration-200 cursor-pointer shadow-md"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-400 animate-pulse" />
                    Import Resume
                  </button>
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => handleCreate('modern-minimalist', `${displayName}'s Resume`)}
                    className="flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50 transition-all duration-200 shrink-0 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Create New Resume
                  </button>
                </div>
              </div>

              {/* Templates Selector section */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-indigo-400" />
                  Start from a Layout Template
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  
                  {/* Template 1 */}
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => handleCreate('modern-minimalist', 'My Modern Minimalist Resume')}
                    className="group p-5 bg-slate-900/30 border border-slate-900 rounded-2xl hover:border-blue-500/40 hover:bg-slate-900/60 transition-all duration-300 text-left space-y-3 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-all">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Modern Minimalist</h4>
                      <p className="text-slate-400 text-xxs leading-relaxed mt-1">
                        Clean, standardized typography layout. Excellent for software engineering, product, and tech roles.
                      </p>
                    </div>
                  </button>

                  {/* Template 2 */}
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => handleCreate('professional', 'My Professional Serif Resume')}
                    className="group p-5 bg-slate-900/30 border border-slate-900 rounded-2xl hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all duration-300 text-left space-y-3 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                      <Award className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Professional Serif</h4>
                      <p className="text-slate-400 text-xxs leading-relaxed mt-1">
                        Centered serif headers with classic horizontal borders. Standard format for consulting, legal, and banking roles.
                      </p>
                    </div>
                  </button>

                  {/* Template 3 */}
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => handleCreate('executive', 'My Executive Split Resume')}
                    className="group p-5 bg-slate-900/30 border border-slate-900 rounded-2xl hover:border-purple-500/40 hover:bg-slate-900/60 transition-all duration-300 text-left space-y-3 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-all">
                      <Trophy className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Executive Split</h4>
                      <p className="text-slate-400 text-xxs leading-relaxed mt-1">
                        Sleek dual-column design with contact sidebar. Ideal for designers, marketers, and manager level roles.
                      </p>
                    </div>
                  </button>

                </div>
              </section>

              {/* Your Resumes Grid Section */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-400" />
                  Your Resumes
                </h3>

                {resumes.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl flex flex-col justify-center items-center text-center">
                    <FileText className="w-10 h-10 text-slate-600 mb-3" />
                    <h4 className="text-sm font-bold text-slate-300">No Resumes Found</h4>
                    <p className="text-slate-500 text-xs mt-1 max-w-sm">
                      Click on any template layout above to generate your first professional resume canvas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {resumes.map((resume) => {
                      const isDeleting = deletingId === resume.id;
                      
                      return (
                        <div
                          key={resume.id}
                          className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-slate-700/80 transition-all flex flex-col justify-between gap-4 group"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <Link
                                href={`/builder/${resume.id}`}
                                className="font-bold text-sm text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1 cursor-pointer"
                              >
                                {resume.title}
                              </Link>
                              
                              <div className="flex items-center gap-1.5 self-start">
                                <button
                                  type="button"
                                  disabled={duplicatingId !== null || isDeleting}
                                  onClick={() => handleDuplicate(resume.id)}
                                  className="text-slate-500 hover:text-blue-400 p-1 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                  title="Duplicate resume"
                                >
                                  {duplicatingId === resume.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={isDeleting || duplicatingId !== null}
                                  onClick={() => handleDelete(resume.id)}
                                  className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                  title="Delete resume"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                                {getTemplateName(resume.template_id)}
                              </span>
                              {resume.version_type === 'original' ? (
                                <span className="text-[10px] bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                                  Original Upload
                                </span>
                              ) : resume.version_type === 'improved' ? (
                                <span className="text-[10px] bg-amber-950/80 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                                  AI Improved
                                </span>
                              ) : resume.parent_id ? (
                                <span className="text-[10px] bg-blue-950/80 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                                  Tailored Copy
                                </span>
                              ) : null}
                              {resume.resume_data?.status === 'completed' ? (
                                <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                                  Completed
                                </span>
                              ) : (
                                <span className="text-[10px] bg-slate-950 border border-slate-850 text-slate-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                  Draft
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-xxs text-slate-500">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-600" /> {formatDate(resume.updated_at)}</span>
                            <Link
                              href={`/builder/${resume.id}`}
                              className="flex items-center gap-0.5 text-blue-500 font-semibold hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              Edit Resume
                              <Edit3 className="w-3 h-3" />
                            </Link>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'cover-letters' && (
            <CoverLettersClient resumes={resumes} showToast={showToast} />
          )}

          {activeTab === 'job-tracker' && (
            <JobTrackerClient resumes={resumes} showToast={showToast} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsClient showToast={showToast} />
          )}
        </main>
      </div>

      <ImportResumeModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        showToast={showToast}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950 py-6 text-center text-xs text-slate-500 relative z-10">
        <p>© {new Date().getFullYear()} AI Resume Builder. Premium SaaS Dashboard Workspace.</p>
      </footer>

    </div>
  );
}
