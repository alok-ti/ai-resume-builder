'use client';

import React, { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resumeSchema, ResumeValues } from '@/types/resume-schema';
import { createClient } from '@/lib/supabase/client';
import {
  PersonalInfoForm,
  SummaryForm,
  ExperienceForm,
  EducationForm,
  ProjectsForm,
  SkillsForm,
  CertificatesForm,
  AchievementsForm
} from '@/components/builder/section-forms';
import { LivePreview } from '@/components/builder/live-preview';
import { logout } from '../../auth/actions';
import {
  Loader2,
  Check,
  LogOut,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  Brain,
  Sliders,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Edit2,
  ChevronDown
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ResumePDFDocument } from '@/components/builder/pdf-document';
import { AIPanel } from '@/components/builder/ai-panel';
import Link from 'next/link';
import { ToastProvider, useToast } from '@/components/ui/toast';

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BuilderClientProps {
  resumeId: string;
  initialData: any;
  userEmail?: string;
  profile?: any;
}

// Convert HTML editor output to standard clean text bullet arrays for Postgres compatibility
function convertHtmlToBulletArray(html: string): string[] {
  if (typeof window === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const listItems = doc.querySelectorAll('li');
  if (listItems.length > 0) {
    return Array.from(listItems).map(li => li.textContent || '').filter(Boolean);
  }
  const paragraphs = doc.querySelectorAll('p, div');
  if (paragraphs.length > 0) {
    return Array.from(paragraphs).map(p => p.textContent || '').filter(Boolean);
  }
  return html.replace(/<[^>]*>/g, '').split('\n').map(s => s.trim()).filter(Boolean);
}

// Wrap inside ToastProvider to leverage useToast() internally
export function BuilderClient(props: BuilderClientProps) {
  return (
    <ToastProvider>
      <BuilderWorkspace {...props} />
    </ToastProvider>
  );
}

function BuilderWorkspace({ resumeId, initialData, userEmail, profile }: BuilderClientProps) {
  const supabase = createClient();
  const toast = useToast();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [resumeTitle, setResumeTitle] = useState(initialData?.title || 'My Professional Resume');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('personalInfo');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [workspaceTheme, setWorkspaceTheme] = useState<'dark' | 'light'>('dark');
  const [resumeStatus, setResumeStatus] = useState<'draft' | 'completed'>(initialData?.resume_data?.status || 'draft');

  // Load and normalize initial section order and visibility
  const initialOrder = initialData?.resume_data?.sectionOrder || [
    'personalInfo',
    'summary',
    'workExperience',
    'education',
    'projects',
    'skills',
    'certificates',
    'achievements',
  ];
  if (!initialOrder.includes('summary')) {
    const pinIdx = initialOrder.indexOf('personalInfo');
    if (pinIdx !== -1) {
      initialOrder.splice(pinIdx + 1, 0, 'summary');
    } else {
      initialOrder.unshift('summary');
    }
  }

  const initialVisible = initialData?.resume_data?.visibleSections || {
    personalInfo: true,
    summary: true,
    workExperience: true,
    education: true,
    projects: true,
    skills: true,
    certificates: true,
    achievements: true,
  };
  if (initialVisible.summary === undefined) {
    initialVisible.summary = true;
  }

  // Load initial form data or fall back to defaults
  const methods = useForm<ResumeValues>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      personalInfo: {
        fullName: initialData?.resume_data?.personalInfo?.fullName || profile?.full_name || '',
        title: initialData?.resume_data?.personalInfo?.title || '',
        email: initialData?.resume_data?.personalInfo?.email || profile?.email || userEmail || '',
        phone: initialData?.resume_data?.personalInfo?.phone || '',
        location: initialData?.resume_data?.personalInfo?.location || '',
        linkedin: initialData?.resume_data?.personalInfo?.linkedin || '',
        github: initialData?.resume_data?.personalInfo?.github || '',
        portfolio: initialData?.resume_data?.personalInfo?.portfolio || '',
        summary: initialData?.resume_data?.personalInfo?.summary || '',
      },
      workExperience: (initialData?.resume_data?.workExperience || []).map((exp: any) => ({
        ...exp,
        description: Array.isArray(exp.description)
          ? `<ul>${exp.description.map((b: string) => `<li>${b}</li>`).join('')}</ul>`
          : exp.description || '<ul><li></li></ul>'
      })),
      education: initialData?.resume_data?.education || [],
      projects: (initialData?.resume_data?.projects || []).map((proj: any) => ({
        ...proj,
        description: proj.description || ''
      })),
      skills: {
        technicalSkills: initialData?.resume_data?.skills?.technicalSkills || [],
        softSkills: initialData?.resume_data?.skills?.softSkills || [],
      },
      certificates: initialData?.resume_data?.certificates || [],
      achievements: initialData?.resume_data?.achievements || [],
      templateId: initialData?.template_id || initialData?.resume_data?.templateId || 'modern-minimalist',
      sectionOrder: initialOrder,
      visibleSections: initialVisible,
    },
  });

  const { watch, handleSubmit, setValue } = methods;
  const formData = watch();

  // Auto-saving debouncing trigger
  useEffect(() => {
    const subscription = watch((value) => {
      setSaveStatus('saving');
      const debounceTimer = setTimeout(async () => {
        try {
          const { error } = await supabase.rpc('save_complete_resume', {
            p_resume_id: resumeId,
            p_title: resumeTitle,
            p_template_id: value.templateId || 'modern-minimalist',
            p_resume_data: {
              personalInfo: value.personalInfo,
              certificates: value.certificates || [],
              achievements: value.achievements || [],
              workExperience: value.workExperience || [],
              education: value.education || [],
              projects: value.projects || [],
              skills: value.skills,
              templateId: value.templateId || 'modern-minimalist',
              sectionOrder: value.sectionOrder || initialOrder,
              visibleSections: value.visibleSections || initialVisible,
              status: resumeStatus,
            },
            p_experiences: (value.workExperience || []).map((exp: any) => ({
              ...exp,
              description: convertHtmlToBulletArray(exp.description || '')
            })),
            p_educations: value.education || [],
            p_projects: value.projects || [],
            p_skills: [
              ...(value.skills?.technicalSkills || []).map((skillName: string) => ({ skillName, category: 'technical' })),
              ...(value.skills?.softSkills || []).map((skillName: string) => ({ skillName, category: 'soft' })),
            ],
          });

          if (error) throw error;
          setSaveStatus('saved');
        } catch (err) {
          console.error('Autosave failed:', err);
          setSaveStatus('error');
          toast.error('Autosave failed. Please check network connection.');
        }
      }, 1200);

      return () => clearTimeout(debounceTimer);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, resumeId, supabase, resumeTitle, resumeStatus]);

  // Form submission handler
  const onSubmit = async (data: ResumeValues) => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase.rpc('save_complete_resume', {
        p_resume_id: resumeId,
        p_title: resumeTitle,
        p_template_id: data.templateId || 'modern-minimalist',
        p_resume_data: {
          personalInfo: data.personalInfo,
          certificates: data.certificates || [],
          achievements: data.achievements || [],
          workExperience: data.workExperience || [],
          education: data.education || [],
          projects: data.projects || [],
          skills: data.skills,
          templateId: data.templateId || 'modern-minimalist',
          sectionOrder: data.sectionOrder || initialOrder,
          visibleSections: data.visibleSections || initialVisible,
          status: resumeStatus,
        },
        p_experiences: (data.workExperience || []).map((exp: any) => ({
          ...exp,
          description: convertHtmlToBulletArray(exp.description || '')
        })),
        p_educations: data.education || [],
        p_projects: data.projects || [],
        p_skills: [
          ...(data.skills?.technicalSkills || []).map((skillName: string) => ({ skillName, category: 'technical' })),
          ...(data.skills?.softSkills || []).map((skillName: string) => ({ skillName, category: 'soft' })),
        ],
      });

      if (error) throw error;
      setSaveStatus('saved');
      toast.success('Resume saved successfully!');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      toast.error('Failed to save. Try again.');
    }
  };

  const handleCompleteResume = async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase.rpc('save_complete_resume', {
        p_resume_id: resumeId,
        p_title: resumeTitle,
        p_template_id: formData.templateId || 'modern-minimalist',
        p_resume_data: {
          personalInfo: formData.personalInfo,
          certificates: formData.certificates || [],
          achievements: formData.achievements || [],
          workExperience: formData.workExperience || [],
          education: formData.education || [],
          projects: formData.projects || [],
          skills: formData.skills,
          templateId: formData.templateId || 'modern-minimalist',
          sectionOrder: formData.sectionOrder || initialOrder,
          visibleSections: formData.visibleSections || initialVisible,
          status: 'completed',
        },
        p_experiences: (formData.workExperience || []).map((exp: any) => ({
          ...exp,
          description: convertHtmlToBulletArray(exp.description || '')
        })),
        p_educations: formData.education || [],
        p_projects: formData.projects || [],
        p_skills: [
          ...(formData.skills?.technicalSkills || []).map((skillName: string) => ({ skillName, category: 'technical' })),
          ...(formData.skills?.softSkills || []).map((skillName: string) => ({ skillName, category: 'soft' })),
        ],
      });

      if (error) throw error;
      setSaveStatus('saved');
      setResumeStatus('completed');
      toast.success('Resume created successfully!');
    } catch (err) {
      console.error('Failed to complete resume:', err);
      setSaveStatus('error');
      toast.error('Failed to complete resume. Try again.');
    }
  };

  const handleRevertToDraft = async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase.rpc('save_complete_resume', {
        p_resume_id: resumeId,
        p_title: resumeTitle,
        p_template_id: formData.templateId || 'modern-minimalist',
        p_resume_data: {
          personalInfo: formData.personalInfo,
          certificates: formData.certificates || [],
          achievements: formData.achievements || [],
          workExperience: formData.workExperience || [],
          education: formData.education || [],
          projects: formData.projects || [],
          skills: formData.skills,
          templateId: formData.templateId || 'modern-minimalist',
          sectionOrder: formData.sectionOrder || initialOrder,
          visibleSections: formData.visibleSections || initialVisible,
          status: 'draft',
        },
        p_experiences: (formData.workExperience || []).map((exp: any) => ({
          ...exp,
          description: convertHtmlToBulletArray(exp.description || '')
        })),
        p_educations: formData.education || [],
        p_projects: formData.projects || [],
        p_skills: [
          ...(formData.skills?.technicalSkills || []).map((skillName: string) => ({ skillName, category: 'technical' })),
          ...(formData.skills?.softSkills || []).map((skillName: string) => ({ skillName, category: 'soft' })),
        ],
      });

      if (error) throw error;
      setSaveStatus('saved');
      setResumeStatus('draft');
      toast.success('Reverted to draft status.');
    } catch (err) {
      console.error('Failed to revert to draft:', err);
      setSaveStatus('error');
      toast.error('Failed to update status. Try again.');
    }
  };

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Reorder sections handler
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const currentOrder = [...(formData.sectionOrder || initialOrder)];
      const oldIndex = currentOrder.indexOf(active.id as string);
      const newIndex = currentOrder.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        currentOrder.splice(oldIndex, 1);
        currentOrder.splice(newIndex, 0, active.id as string);
        setValue('sectionOrder', currentOrder);
        toast.success('Section order updated!');
      }
    }
  };

  const sectionLabels: Record<string, string> = {
    personalInfo: 'Personal Info',
    summary: 'Summary',
    workExperience: 'Experience',
    education: 'Education',
    projects: 'Projects',
    skills: 'Skills',
    certificates: 'Certifications',
    achievements: 'Achievements',
  };

  // Section completion checks
  const isSectionComplete = (key: string): boolean => {
    switch (key) {
      case 'personalInfo':
        return !!(formData.personalInfo?.fullName && formData.personalInfo?.email);
      case 'summary':
        return !!formData.personalInfo?.summary;
      case 'workExperience':
        return (formData.workExperience?.length ?? 0) > 0;
      case 'education':
        return (formData.education?.length ?? 0) > 0;
      case 'projects':
        return (formData.projects?.length ?? 0) > 0;
      case 'skills':
        return !!((formData.skills?.technicalSkills?.length ?? 0) > 0 || (formData.skills?.softSkills?.length ?? 0) > 0);
      case 'certificates':
        return (formData.certificates?.length ?? 0) > 0;
      case 'achievements':
        return (formData.achievements?.length ?? 0) > 0;
      default:
        return false;
    }
  };

  // Navigation handlers
  const activeOrder = formData.sectionOrder || initialOrder;
  const currentIdx = activeOrder.indexOf(activeSection);
  const handlePrevSection = () => {
    if (currentIdx > 0) {
      setActiveSection(activeOrder[currentIdx - 1]);
    }
  };
  const handleNextSection = () => {
    if (currentIdx < activeOrder.length - 1) {
      setActiveSection(activeOrder[currentIdx + 1]);
    }
  };

  // Template dropdown status
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  return (
    <FormProvider {...methods}>
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className={`min-h-screen flex flex-col transition-colors duration-300 ${
          workspaceTheme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-950'
        }`}
      >
        
        {/* ==========================================================================
           1. TOP BAR HEADER
           ========================================================================== */}
        <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
          workspaceTheme === 'dark' 
            ? 'border-slate-800/80 bg-slate-950/80' 
            : 'border-slate-200 bg-white/80'
        }`}>
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            
            {/* Left Header */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/dashboard"
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  workspaceTheme === 'dark'
                    ? 'text-slate-400 border-slate-800 bg-slate-900/40 hover:text-white hover:bg-slate-900'
                    : 'text-slate-600 border-slate-200 bg-slate-100 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <div className={`h-4 w-[1px] ${workspaceTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
              
              {/* Editable Name Field */}
              <div className="flex items-center gap-1.5 max-w-[150px] sm:max-w-[240px]">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={resumeTitle}
                    onChange={(e) => setResumeTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingTitle(false); }}
                    autoFocus
                    className={`bg-transparent text-sm font-bold border-b border-indigo-500 focus:outline-none w-full ${
                      workspaceTheme === 'dark' ? 'text-white' : 'text-slate-950'
                    }`}
                  />
                ) : (
                  <div 
                    onClick={() => setIsEditingTitle(true)}
                    className={`flex items-center gap-1 cursor-pointer hover:opacity-80 group max-w-full`}
                  >
                    <span className="text-sm font-bold truncate">{resumeTitle}</span>
                    <Edit2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 select-none">
                {resumeStatus === 'completed' ? (
                  <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-950/80 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Draft
                  </span>
                )}
              </div>

              {/* Autosave Indicator */}
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                    Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                    <Check className="w-3 h-3 text-emerald-500" />
                    Saved
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                    Saving Error
                  </span>
                )}
              </div>
            </div>

            {/* Right Header Buttons */}
            <div className="flex items-center gap-2.5">
              
              {/* Workspace Light/Dark Toggler */}
              <button
                type="button"
                onClick={() => setWorkspaceTheme(workspaceTheme === 'dark' ? 'light' : 'dark')}
                className={`p-2 rounded-xl border transition-all ${
                  workspaceTheme === 'dark'
                    ? 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Workspace Theme"
              >
                {workspaceTheme === 'dark' ? '☀️' : '🌙'}
              </button>

              {/* AI Co-Pilot Toggle */}
              <button
                type="button"
                onClick={() => setIsAiOpen(!isAiOpen)}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  isAiOpen 
                    ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-md'
                    : workspaceTheme === 'dark'
                    ? 'border-slate-800 bg-slate-900/40 text-indigo-400 hover:bg-slate-900 hover:text-white'
                    : 'border-slate-200 bg-slate-100 text-indigo-600 hover:bg-slate-200'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden md:inline">AI Co-Pilot</span>
              </button>

              {/* Template Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    workspaceTheme === 'dark'
                      ? 'border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Template:</span>
                  <span className="text-indigo-400 capitalize">{formData.templateId?.replace('-', ' ')}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {isTemplateMenuOpen && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl border p-1.5 z-50 animate-fade-in ${
                    workspaceTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    {([
                      { id: 'modern-minimalist', label: 'Minimalist' },
                      { id: 'professional', label: 'Professional' },
                      { id: 'executive', label: 'Executive' }
                    ] as const).map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setValue('templateId', tmpl.id);
                          setIsTemplateMenuOpen(false);
                          toast.success(`Switched to ${tmpl.label} template!`);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition-all font-semibold ${
                          formData.templateId === tmpl.id
                            ? 'bg-indigo-600 text-white'
                            : workspaceTheme === 'dark'
                            ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Complete Resume / Mark as Draft Button */}
              {resumeStatus === 'draft' ? (
                <button
                  type="button"
                  onClick={handleCompleteResume}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/10 cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  Complete Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRevertToDraft}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer shrink-0 ${
                    workspaceTheme === 'dark'
                      ? 'border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Mark as Draft
                </button>
              )}

              {/* PDF Exporter Button */}
              {isMounted ? (
                <PDFDownloadLink
                  document={<ResumePDFDocument data={formData} />}
                  fileName={`${(formData.personalInfo?.fullName || 'My_Resume').replace(/\s+/g, '_')}_Resume.pdf`}
                >
                  {({ loading }) => (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        if (!loading) toast.success('Exporting A4 PDF...');
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50 transition-all duration-200 animate-fade-in shadow-lg shadow-indigo-600/10"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {loading ? 'Preparing...' : 'Export PDF'}
                    </button>
                  )}
                </PDFDownloadLink>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-800 rounded-xl"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading PDF...
                </button>
              )}

              {/* Logout Button */}
              <button
                type="button"
                onClick={async () => {
                  await logout();
                }}
                className={`p-2 rounded-xl border transition-all ${
                  workspaceTheme === 'dark'
                    ? 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white hover:bg-rose-900/20 hover:border-rose-900/50'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-rose-50 hover:border-rose-200'
                }`}
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

            </div>
          </div>
        </header>

        {/* ==========================================================================
           2. BUILDER WORKSPACE BODY LAYOUT
           ========================================================================== */}
        <div className="flex-grow flex items-stretch overflow-hidden relative">
          
          {/* ==========================================
             LEFT SIDEBAR: SECTIONS LIST & DND ORDERING
             ========================================== */}
          <div className={`w-[240px] shrink-0 border-r flex flex-col justify-between hidden lg:flex transition-colors ${
            workspaceTheme === 'dark' ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-white'
          }`}>
            <div className="p-4 flex-grow flex flex-col overflow-y-auto">
              <h2 className={`text-xxs font-bold uppercase tracking-wider mb-4 px-2 ${
                workspaceTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Resume Sections
              </h2>

              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSectionDragEnd}
              >
                <SortableContext items={formData.sectionOrder || initialOrder} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {(formData.sectionOrder || initialOrder).map((secKey) => {
                      const isSelected = activeSection === secKey;
                      const label = sectionLabels[secKey] || secKey;
                      const isVisible = formData.visibleSections?.[secKey as keyof typeof formData.visibleSections] ?? true;
                      const complete = isSectionComplete(secKey);

                      return (
                        <SortableSectionItem
                          key={secKey}
                          secKey={secKey}
                          label={label}
                          isSelected={isSelected}
                          isVisible={isVisible}
                          complete={complete}
                          theme={workspaceTheme}
                          onSelect={() => setActiveSection(secKey)}
                          onToggleVisibility={() => {
                            setValue(`visibleSections.${secKey as keyof typeof formData.visibleSections}`, !isVisible);
                            toast.info(`${label} visibility updated!`);
                          }}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className={`p-4 border-t ${workspaceTheme === 'dark' ? 'border-slate-900' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between text-xxs text-slate-500">
                <span>Auto Save Enabled</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </div>

          {/* ==========================================
             CENTER PANEL: FORM EDITOR (ACTIVE SECTION ONLY)
             ========================================== */}
          <div className="flex-grow flex flex-col overflow-y-auto max-h-[calc(100vh-64px)] px-4 sm:px-6 py-6 border-r border-slate-900 bg-slate-900/10">
            <div className="max-w-2xl mx-auto w-full flex-grow flex flex-col justify-between">
              
              {/* Form Content Area */}
              <div className="space-y-6">
                
                {/* Active Section Header Indicator */}
                <div className="flex items-center gap-1.5 text-xxs text-indigo-400 uppercase tracking-widest font-bold">
                  <span>Step {currentIdx + 1} of {activeOrder.length}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className={`${workspaceTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{sectionLabels[activeSection]}</span>
                </div>

                {/* Render corresponding form */}
                <div className="animate-fade-in duration-200">
                  {activeSection === 'personalInfo' && <PersonalInfoForm />}
                  {activeSection === 'summary' && <SummaryForm />}
                  {activeSection === 'workExperience' && <ExperienceForm />}
                  {activeSection === 'education' && <EducationForm />}
                  {activeSection === 'projects' && <ProjectsForm />}
                  {activeSection === 'skills' && <SkillsForm />}
                  {activeSection === 'certificates' && <CertificatesForm />}
                  {activeSection === 'achievements' && <AchievementsForm />}
                </div>

              </div>

              {/* Form Footer Navigation Controls */}
              <div className={`flex items-center justify-between mt-10 pt-4 border-t ${
                workspaceTheme === 'dark' ? 'border-slate-900' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={handlePrevSection}
                  disabled={currentIdx === 0}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    currentIdx === 0
                      ? 'opacity-30 cursor-not-allowed border-transparent text-slate-500'
                      : workspaceTheme === 'dark'
                      ? 'border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Section
                </button>

                <div className="flex items-center gap-1.5">
                  {activeOrder.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setActiveSection(sec)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        activeSection === sec 
                          ? 'bg-indigo-500 scale-125' 
                          : workspaceTheme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'
                      }`}
                      title={sectionLabels[sec]}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleNextSection}
                  disabled={currentIdx === activeOrder.length - 1}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    currentIdx === activeOrder.length - 1
                      ? 'opacity-30 cursor-not-allowed border-transparent text-slate-500'
                      : workspaceTheme === 'dark'
                      ? 'border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Next Section
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* ==========================================
             RIGHT PANEL: LIVE CANVAS RESUME PREVIEW
             ========================================== */}
          <div className="flex-grow lg:w-[48%] xl:w-[52%] bg-slate-900/15 p-6 overflow-y-auto max-h-[calc(100vh-64px)] hidden md:flex items-start justify-center">
            <div className="w-full max-w-[800px] shrink-0 sticky top-0">
              <LivePreview data={formData} />
            </div>
          </div>

          {/* ==========================================
             AI ASSISTANT DRAWER PANEL
             ========================================== */}
          <div className={`fixed top-16 right-0 bottom-0 z-30 w-[420px] max-w-full shadow-2xl border-l backdrop-blur-xl flex flex-col transform transition-transform duration-300 ${
            isAiOpen ? 'translate-x-0' : 'translate-x-full'
          } ${
            workspaceTheme === 'dark' ? 'bg-slate-950/90 border-slate-900' : 'bg-white/95 border-slate-200'
          }`}>
            <div className="flex-grow overflow-y-auto p-5">
              <AIPanel />
            </div>
          </div>

        </div>

      </form>
    </FormProvider>
  );
}

/* ==========================================================================
   SORTABLE SECTION ITEM COMPONENT FOR SIDEBAR
   ========================================================================== */
interface SortableSectionProps {
  secKey: string;
  label: string;
  isSelected: boolean;
  isVisible: boolean;
  complete: boolean;
  theme: 'dark' | 'light';
  onSelect: () => void;
  onToggleVisibility: () => void;
}

function SortableSectionItem({
  secKey,
  label,
  isSelected,
  isVisible,
  complete,
  theme,
  onSelect,
  onToggleVisibility
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: secKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between rounded-xl px-2.5 py-2 transition-all border ${
        isSelected
          ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-400 font-bold'
          : theme === 'dark'
          ? 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50'
          : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-100'
      } ${!isVisible ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-2 flex-grow min-w-0">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-600 group-hover:text-slate-400 p-0.5"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="flex-grow text-left text-xs font-semibold truncate flex items-center gap-1.5"
        >
          {label}
          {complete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
        </button>
      </div>

      <div className="flex items-center gap-1">
        {/* Toggle eye */}
        <button
          type="button"
          onClick={onToggleVisibility}
          className={`p-1 rounded hover:bg-slate-800/40 transition-colors ${
            isVisible ? 'text-slate-400 hover:text-white' : 'text-slate-600'
          }`}
          title={isVisible ? 'Hide Section' : 'Show Section'}
        >
          {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
