'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createResume, deleteResume, duplicateResume } from './actions';
import { logout } from '../auth/actions';
import { CoverLettersClient } from '@/components/dashboard/cover-letters-client';
import { JobTrackerClient } from '@/components/dashboard/job-tracker-client';
import { AnalyticsClient } from '@/components/dashboard/analytics-client';
import { useToast } from '@/components/ui/toast';
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
  UploadCloud,
  Moon,
  Sun
} from 'lucide-react';
import { ImportResumeModal } from '@/components/dashboard/import-resume-modal';

interface DashboardListClientProps {
  resumes: any[];
  profile?: any;
  userEmail?: string;
}

export function DashboardListClient({ resumes, profile, userEmail }: DashboardListClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [isCreating, startCreateTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();
  
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  // Creation status for custom loading overlays
  const [creationStatus, setCreationStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'resumes' | 'cover-letters' | 'job-tracker' | 'analytics'>('resumes');
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.info(message);
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
      case 'ats': return 'ATS Friendly';
      case 'tech': return 'Developer & Tech';
      case 'executive': return 'Executive Split';
      case 'modern': return 'Modern Design';
      case 'minimal': return 'Minimalist Clean';
      case 'creative': return 'Creative Accent';
      case 'modern-minimalist': return 'Minimalist (Legacy)';
      case 'professional': return 'Professional (Legacy)';
      default: return tId;
    }
  };

  const totalResumes = resumes.length;
  const displayName = profile?.full_name || userEmail?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between font-sans relative overflow-hidden transition-colors duration-300">
      
      {/* Full Screen Loading Overlay for creation */}
      <AnimatePresence>
        {creationStatus !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex flex-col justify-center items-center gap-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="p-6 glass-modal rounded-3xl flex flex-col items-center gap-3 shadow-2xl max-w-sm w-full"
            >
              {creationStatus === 'creating' && (
                <>
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <div className="text-center space-y-0.5">
                    <h4 className="text-sm font-bold text-foreground">Creating Draft...</h4>
                    <p className="text-xxs text-text-muted">Formatting layout templates & metadata</p>
                  </div>
                </>
              )}
              {creationStatus === 'success' && (
                <>
                  <CheckCircle className="w-8 h-8 text-emerald-500 animate-pulse" />
                  <div className="text-center space-y-0.5">
                    <h4 className="text-sm font-bold text-emerald-500">Draft Saved</h4>
                    <p className="text-xxs text-text-muted">Redirecting to editor workspace...</p>
                  </div>
                </>
              )}
              {creationStatus === 'error' && (
                <>
                  <XCircle className="w-8 h-8 text-rose-500 animate-pulse" />
                  <div className="text-center space-y-0.5">
                    <h4 className="text-sm font-bold text-rose-500">Failed to Create Draft</h4>
                    <p className="text-xxs text-text-muted">Please try again.</p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glow Effects */}
      <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-glow-1 animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[20%] w-[450px] h-[450px] bg-glow-2 animate-pulse-slow" style={{ animationDelay: '3s' }} />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 border-b border-card-border bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent">
            <Sparkles className="w-5.5 h-5.5 text-indigo-500 animate-pulse" />
            AI Resume Builder
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-card-border flex items-center justify-center font-bold text-xs text-indigo-500 uppercase">
                {displayName.charAt(0)}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-text-muted hover:text-foreground transition-colors">
                {displayName}
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-card-border hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-text-muted hover:text-foreground cursor-pointer"
              title="Toggle Dark/Light Mode"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-800" />}
            </button>
            
            <button
              type="button"
              onClick={async () => {
                await logout();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-text-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-900 border border-card-border rounded-xl transition-all duration-200 cursor-pointer"
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
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Workspace</h3>
            <div className="space-y-1.5 text-xs">
              {[
                { id: 'resumes', label: 'All Resumes', icon: <FolderOpen className="w-4 h-4" /> },
                { id: 'cover-letters', label: 'Cover Letters', icon: <FileText className="w-4 h-4" /> },
                { id: 'job-tracker', label: 'Job Tracker', icon: <Trophy className="w-4 h-4" /> },
                { id: 'analytics', label: 'Resume Analytics', icon: <Activity className="w-4 h-4" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-left transition-all cursor-pointer border ${
                    activeTab === tab.id
                      ? 'bg-indigo-600/10 dark:bg-indigo-500/15 border-indigo-500/30 text-indigo-500 dark:text-indigo-400 shadow-sm'
                      : 'bg-transparent border-transparent text-text-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Overview Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Total Documents
                </span>
                <span className="font-bold text-foreground">{totalResumes}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-450" />
                  Avg Match Rating
                </span>
                <span className="font-bold text-foreground">--</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="space-y-8"
            >
              {activeTab === 'resumes' && (
                <>
                  {/* Welcome section */}
                  <div className="relative glass-panel rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl">
                    <div className="space-y-2 text-center sm:text-left">
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2 justify-center sm:justify-start">
                        Welcome back, {displayName}!
                      </h2>
                      <p className="text-text-muted text-xs sm:text-sm max-w-lg leading-relaxed font-light">
                        Create layout variants using ATS-optimized structures, analyze skill sets, or download a printable PDF copy.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold text-text-muted hover:text-foreground bg-slate-100 dark:bg-slate-900 border border-card-border hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer shadow-md"
                      >
                        <UploadCloud className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                        Import Resume
                      </button>
                      <button
                        type="button"
                        disabled={isCreating}
                        onClick={() => handleCreate('ats', `${displayName}'s Resume`)}
                        className="flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-bold text-white bg-gradient-premium hover:opacity-95 rounded-xl disabled:opacity-50 transition-all duration-200 shrink-0 shadow-lg cursor-pointer"
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
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                      Start from a Layout Template
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {[
                        {
                          id: 'ats',
                          label: 'ATS Friendly',
                          desc: 'Standard serif layout with clean lines. Engineered to parse cleanly with ATS tracking software.',
                          icon: <FileText className="w-4.5 h-4.5" />,
                          color: 'text-blue-500 bg-blue-500/10'
                        },
                        {
                          id: 'tech',
                          label: 'Developer & Tech',
                          desc: 'Sleek double-column tech layout showing specialized project skills first.',
                          icon: <Award className="w-4.5 h-4.5" />,
                          color: 'text-teal-500 bg-teal-500/10'
                        },
                        {
                          id: 'executive',
                          label: 'Executive Split',
                          desc: 'Professional split design with a dark left sidebar for senior and management roles.',
                          icon: <Trophy className="w-4.5 h-4.5" />,
                          color: 'text-indigo-500 bg-indigo-500/10'
                        }
                      ].map(tmpl => (
                        <button
                          key={tmpl.id}
                          type="button"
                          disabled={isCreating}
                          onClick={() => handleCreate(tmpl.id, `My ${tmpl.label} Resume`)}
                          className="group p-5 glass-panel rounded-2xl hover:border-indigo-500/40 text-left space-y-3 cursor-pointer"
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tmpl.color} group-hover:scale-105 transition-all`}>
                            {tmpl.icon}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-foreground group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                              {tmpl.label}
                            </h4>
                            <p className="text-text-muted text-xxs leading-relaxed mt-1 font-light">
                              {tmpl.desc}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Your Resumes Grid Section */}
                  <section className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                      Your Resumes
                    </h3>

                    {resumes.length === 0 ? (
                      <div className="p-12 border border-dashed border-card-border bg-slate-100/10 dark:bg-slate-900/10 rounded-2xl flex flex-col justify-center items-center text-center">
                        <FileText className="w-10 h-10 text-text-muted mb-3" />
                        <h4 className="text-sm font-bold text-foreground">No Resumes Found</h4>
                        <p className="text-text-muted text-xs mt-1 max-w-sm font-light">
                          Click on any template layout above to generate your first professional resume canvas.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {resumes.map((resume) => {
                          const isDeleting = deletingId === resume.id;
                          
                          return (
                            <motion.div
                              layout
                              key={resume.id}
                              className="p-5 glass-panel rounded-2xl flex flex-col justify-between gap-4 group hover:border-indigo-500/20"
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <Link
                                    href={`/builder/${resume.id}`}
                                    className="font-bold text-sm text-foreground group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 cursor-pointer"
                                  >
                                    {resume.title}
                                  </Link>
                                  
                                  <div className="flex items-center gap-1.5 self-start">
                                    <button
                                      type="button"
                                      disabled={duplicatingId !== null || isDeleting}
                                      onClick={() => handleDuplicate(resume.id)}
                                      className="text-text-muted hover:text-indigo-500 p-1 rounded transition-colors disabled:opacity-30 cursor-pointer"
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
                                      className="text-text-muted hover:text-rose-500 p-1 rounded transition-colors disabled:opacity-30 cursor-pointer"
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
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-900 border border-card-border text-foreground px-2 py-0.5 rounded-full font-medium">
                                    {getTemplateName(resume.template_id)}
                                  </span>
                                  {resume.version_type === 'original' ? (
                                    <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                                      Original Upload
                                    </span>
                                  ) : resume.version_type === 'improved' ? (
                                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-550 animate-pulse" />
                                      AI Improved
                                    </span>
                                  ) : resume.parent_id ? (
                                    <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                                      Tailored Copy
                                    </span>
                                  ) : null}
                                  {resume.resume_data?.status === 'completed' ? (
                                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                      <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-900 border border-card-border text-text-muted px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                      Draft
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="border-t border-card-border pt-3 flex justify-between items-center text-xxs text-text-muted">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-text-muted" /> {formatDate(resume.updated_at)}</span>
                                <Link
                                  href={`/builder/${resume.id}`}
                                  className="flex items-center gap-0.5 text-indigo-500 dark:text-indigo-400 font-semibold hover:opacity-85 transition-colors cursor-pointer"
                                >
                                  Edit Resume
                                  <Edit3 className="w-3 h-3" />
                                </Link>
                              </div>

                            </motion.div>
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
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ImportResumeModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        showToast={showToast}
      />

      {/* Footer */}
      <footer className="border-t border-card-border bg-background/50 py-6 text-center text-xs text-text-muted relative z-10">
        <p>© {new Date().getFullYear()} AI Resume Builder. Premium SaaS Dashboard Workspace.</p>
      </footer>

    </div>
  );
}
