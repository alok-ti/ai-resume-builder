'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  AchievementsForm,
  CustomSectionForm
} from '@/components/builder/section-forms';
import { LivePreview } from '@/components/builder/live-preview';
import { logout } from '../../auth/actions';
import { duplicateResume } from '@/app/dashboard/actions';
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
  ChevronDown,
  Plus,
  Trash2,
  Undo,
  Redo,
  History,
  ZoomIn,
  ZoomOut,
  X,
  FileText,
  GitPullRequest,
  Sparkles,
  Sun,
  Moon,
  Code,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Award,
  Trophy
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ResumePDFDocument } from '@/components/builder/pdf-document';
import { generateDocxBlob } from '@/lib/docx-exporter';
import Link from 'next/link';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { getResumeDifferences, ResumeDifference } from '@/lib/diff';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const AIPanel = dynamic(() => import('@/components/builder/ai-panel').then(m => m.AIPanel), {
  loading: () => (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
    </div>
  ),
  ssr: false,
});

const CommandPalette = dynamic(() => import('@/components/builder/command-palette').then(m => m.CommandPalette), {
  ssr: false,
});

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

function isResumeMostlyEmpty(data: any): boolean {
  if (!data) return true;
  const hasWork = data.workExperience && data.workExperience.length > 0;
  const hasEducation = data.education && data.education.length > 0;
  const hasProjects = data.projects && data.projects.length > 0;
  const hasSkills = (data.skills?.technicalSkills && data.skills.technicalSkills.length > 0) ||
                    (data.skills?.softSkills && data.skills.softSkills.length > 0);
  const hasSummary = data.personalInfo?.summary && data.personalInfo.summary.trim().length > 10;
  const hasCertificates = data.certificates && data.certificates.length > 0;
  const hasAchievements = data.achievements && data.achievements.length > 0;
  
  return !hasWork && !hasEducation && !hasProjects && !hasSkills && !hasSummary && !hasCertificates && !hasAchievements;
}

const ONBOARDING_STEPS = [
  { step: 'education', label: 'Education', section: 'education' },
  { step: 'experience', label: 'Experience', section: 'workExperience' },
  { step: 'skills', label: 'Skills', section: 'skills' },
  { step: 'projects', label: 'Projects', section: 'projects' },
  { step: 'summary', label: 'Summary', section: 'summary' },
  { step: 'finalReview', label: 'Final Review', section: 'finalReview' }
];

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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [resumeTitle, setResumeTitle] = useState(initialData?.title || 'My Professional Resume');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('personalInfo');
  const [isAiOpen, setIsAiOpen] = useState(false);
  
  // Onboarding States
  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<string>('welcome');
  const [workspaceTheme, setWorkspaceTheme] = useState<'dark' | 'light'>('dark');
  const [resumeStatus, setResumeStatus] = useState<'draft' | 'completed'>(initialData?.resume_data?.status || 'draft');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Timer references for debounced functions to prevent race conditions and leaks
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const historyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Command Palette Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync workspace Theme with document elements
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    setWorkspaceTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = workspaceTheme === 'dark' ? 'light' : 'dark';
    setWorkspaceTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(`Switched to ${nextTheme} theme!`);
  };

  const handleExportPdf = async () => {
    toast.info('Preparing PDF document...');
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(<ResumePDFDocument data={formData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(formData.personalInfo?.fullName || 'My_Resume').replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF.');
    }
  };

  // Undo & Redo History Stack State
  const [pastStates, setPastStates] = useState<any[]>([]);
  const [futureStates, setFutureStates] = useState<any[]>([]);
  const lastSavedStateRef = useRef<any>(null);
  const isUndoingRedoing = useRef<boolean>(false);

  // Resume Versions State
  const [allResumes, setAllResumes] = useState<any[]>([]);
  const [isVersionsMenuOpen, setIsVersionsMenuOpen] = useState(false);
  const [isDuplicatingVersion, setIsDuplicatingVersion] = useState(false);
  const [isAddSectionMenuOpen, setIsAddSectionMenuOpen] = useState(false);

  // Compare Mode State
  const [isCompareActive, setIsCompareActive] = useState(false);
  const [compareBaseId, setCompareBaseId] = useState<string>('');
  const [comparedData, setComparedData] = useState<any>(null);
  const [isAiImproving, setIsAiImproving] = useState(false);

  const allStandardSections = [
    { key: 'summary', label: 'Summary' },
    { key: 'workExperience', label: 'Experience' },
    { key: 'education', label: 'Education' },
    { key: 'projects', label: 'Projects' },
    { key: 'skills', label: 'Skills' },
    { key: 'certificates', label: 'Certifications' },
    { key: 'achievements', label: 'Achievements' },
  ];

  // Preview Zoom State
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  // DOCX Exporter state
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const handleExportDocx = async (data: any) => {
    setIsExportingDocx(true);
    toast.success('Exporting Word Document...');
    try {
      const blob = await generateDocxBlob(data);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `${(data.personalInfo?.fullName || 'My_Resume').replace(/\s+/g, '_')}_Resume.docx`;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('DOCX downloaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export DOCX.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Manual Snapshots State / Drawer Open
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState('');

  // Fetch all user resumes on mount to check versions
  useEffect(() => {
    const fetchUserResumes = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('resumes')
          .select('id, title, resume_data')
          .eq('user_id', user.id);
          
        if (data) {
          setAllResumes(data);
        }
      } catch (err) {
        console.error('Error fetching versions:', err);
      }
    };
    fetchUserResumes();
  }, [supabase]);

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
      customSections: initialData?.resume_data?.customSections || {},
      parentResumeId: initialData?.resume_data?.parentResumeId || '',
      history: initialData?.resume_data?.history || [],
      chatHistory: initialData?.resume_data?.chatHistory || [],
    },
  });

  const { watch, handleSubmit, setValue } = methods;
  const formData = watch();

  const updateOnboardingStep = (nextStep: string) => {
    setOnboardingStep(nextStep);
    try {
      const stored = localStorage.getItem(`resume_onboarding_${resumeId}`);
      const parsed = stored ? JSON.parse(stored) : { skipped: false, completed: false };
      localStorage.setItem(
        `resume_onboarding_${resumeId}`,
        JSON.stringify({
          ...parsed,
          step: nextStep,
        })
      );
    } catch (err) {
      console.error('Error saving onboarding step:', err);
    }

    const sectionMap: Record<string, string> = {
      education: 'education',
      experience: 'workExperience',
      skills: 'skills',
      projects: 'projects',
      summary: 'summary',
      finalReview: 'finalReview',
    };
    if (sectionMap[nextStep]) {
      setActiveSection(sectionMap[nextStep]);
    }
  };

  const handleSkipOnboarding = () => {
    setIsOnboardingActive(false);
    try {
      localStorage.setItem(
        `resume_onboarding_${resumeId}`,
        JSON.stringify({
          skipped: true,
          completed: false,
          step: onboardingStep,
        })
      );
    } catch (err) {
      console.error('Error saving skip state:', err);
    }
    if (activeSection === 'finalReview') {
      setActiveSection('personalInfo');
    }
  };

  const handleCompleteOnboarding = () => {
    setIsOnboardingActive(false);
    try {
      localStorage.setItem(
        `resume_onboarding_${resumeId}`,
        JSON.stringify({
          skipped: false,
          completed: true,
          step: 'finalReview',
        })
      );
    } catch (err) {
      console.error('Error saving complete state:', err);
    }
    setActiveSection('personalInfo');
  };

  const handleResetOnboarding = () => {
    setIsOnboardingActive(true);
    updateOnboardingStep('welcome');
    toast.success('Guided onboarding tour restarted!');
  };

  // Sync activeSection click from left sidebar with onboarding step
  useEffect(() => {
    if (!isOnboardingActive) return;
    const matched = ONBOARDING_STEPS.find((s) => s.section === activeSection);
    if (matched) {
      setOnboardingStep(matched.step);
    }
  }, [activeSection, isOnboardingActive]);

  // Load initial onboarding state from localStorage or calculate empty resume
  useEffect(() => {
    if (!isMounted) return;
    try {
      const stored = localStorage.getItem(`resume_onboarding_${resumeId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.skipped || parsed.completed) {
          setIsOnboardingActive(false);
        } else {
          setIsOnboardingActive(true);
          setOnboardingStep(parsed.step || 'welcome');

          const sectionMap: Record<string, string> = {
            education: 'education',
            experience: 'workExperience',
            skills: 'skills',
            projects: 'projects',
            summary: 'summary',
            finalReview: 'finalReview',
          };
          if (parsed.step && sectionMap[parsed.step]) {
            setActiveSection(sectionMap[parsed.step]);
          }
        }
      } else {
        const isEmpty = isResumeMostlyEmpty(methods.getValues());
        if (isEmpty) {
          setIsOnboardingActive(true);
          setOnboardingStep('welcome');
          localStorage.setItem(
            `resume_onboarding_${resumeId}`,
            JSON.stringify({
              skipped: false,
              completed: false,
              step: 'welcome',
            })
          );
        } else {
          setIsOnboardingActive(false);
        }
      }
    } catch (err) {
      console.error('Error loading onboarding state:', err);
    }
  }, [isMounted, resumeId]);

  // Undo function
  const undo = () => {
    if (pastStates.length === 0) return;
    isUndoingRedoing.current = true;
    const previousState = pastStates[pastStates.length - 1];
    const currentState = {
      personalInfo: methods.getValues('personalInfo'),
      workExperience: methods.getValues('workExperience'),
      education: methods.getValues('education'),
      projects: methods.getValues('projects'),
      skills: methods.getValues('skills'),
      certificates: methods.getValues('certificates'),
      achievements: methods.getValues('achievements'),
      templateId: methods.getValues('templateId'),
      sectionOrder: methods.getValues('sectionOrder'),
      visibleSections: methods.getValues('visibleSections'),
      customSections: methods.getValues('customSections') || {},
      parentResumeId: methods.getValues('parentResumeId'),
      history: methods.getValues('history') || [],
      chatHistory: methods.getValues('chatHistory') || [],
    };
    
    setFutureStates(prev => [...prev, currentState]);
    setPastStates(prev => prev.slice(0, -1));
    
    methods.reset(previousState);
    lastSavedStateRef.current = previousState;
    toast.success('Undo successful!');
  };

  // Redo function
  const redo = () => {
    if (futureStates.length === 0) return;
    isUndoingRedoing.current = true;
    const nextState = futureStates[futureStates.length - 1];
    const currentState = {
      personalInfo: methods.getValues('personalInfo'),
      workExperience: methods.getValues('workExperience'),
      education: methods.getValues('education'),
      projects: methods.getValues('projects'),
      skills: methods.getValues('skills'),
      certificates: methods.getValues('certificates'),
      achievements: methods.getValues('achievements'),
      templateId: methods.getValues('templateId'),
      sectionOrder: methods.getValues('sectionOrder'),
      visibleSections: methods.getValues('visibleSections'),
      customSections: methods.getValues('customSections') || {},
      parentResumeId: methods.getValues('parentResumeId'),
      history: methods.getValues('history') || [],
      chatHistory: methods.getValues('chatHistory') || [],
    };
    
    setPastStates(prev => [...prev, currentState]);
    setFutureStates(prev => prev.slice(0, -1));
    
    methods.reset(nextState);
    lastSavedStateRef.current = nextState;
    toast.success('Redo successful!');
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastStates, futureStates]);

  // History tracking effect
  useEffect(() => {
    if (!isMounted) return;
    
    const subscription = watch((value) => {
      if (isUndoingRedoing.current) {
        isUndoingRedoing.current = false;
        return;
      }
      
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
      
      historyTimerRef.current = setTimeout(() => {
        const stateToSave = {
          personalInfo: value.personalInfo,
          workExperience: value.workExperience,
          education: value.education,
          projects: value.projects,
          skills: value.skills,
          certificates: value.certificates,
          achievements: value.achievements,
          templateId: value.templateId,
          sectionOrder: value.sectionOrder,
          visibleSections: value.visibleSections,
          customSections: value.customSections || {},
          parentResumeId: value.parentResumeId,
          history: value.history || [],
          chatHistory: value.chatHistory || [],
        };
        
        if (lastSavedStateRef.current) {
          const serializedCurrent = JSON.stringify(stateToSave);
          const serializedLast = JSON.stringify(lastSavedStateRef.current);
          if (serializedCurrent !== serializedLast) {
            setPastStates(prev => {
              const nextPast = [...prev, lastSavedStateRef.current];
              if (nextPast.length > 30) return nextPast.slice(nextPast.length - 30);
              return nextPast;
            });
            setFutureStates([]);
            lastSavedStateRef.current = stateToSave;
          }
        } else {
          lastSavedStateRef.current = stateToSave;
        }
      }, 800);
    });
    return () => {
      subscription.unsubscribe();
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
    };
  }, [watch, isMounted]);

  // Snapshot Checkpoints
  const handleSaveSnapshot = () => {
    const label = snapshotLabel.trim() || `Snapshot #${(formData.history || []).length + 1}`;
    const newSnapshot = {
      id: `snap_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      label,
      data: {
        personalInfo: methods.getValues('personalInfo'),
        workExperience: methods.getValues('workExperience'),
        education: methods.getValues('education'),
        projects: methods.getValues('projects'),
        skills: methods.getValues('skills'),
        certificates: methods.getValues('certificates'),
        achievements: methods.getValues('achievements'),
        templateId: methods.getValues('templateId'),
        sectionOrder: methods.getValues('sectionOrder'),
        visibleSections: methods.getValues('visibleSections'),
        customSections: methods.getValues('customSections') || {},
        parentResumeId: methods.getValues('parentResumeId'),
        history: methods.getValues('history') || [],
      }
    };

    const currentHistory = [...(formData.history || [])];
    currentHistory.unshift(newSnapshot);
    if (currentHistory.length > 10) {
      currentHistory.pop();
    }

    setValue('history', currentHistory, { shouldDirty: true, shouldTouch: true });
    setSnapshotLabel('');
    toast.success('Checkpoint snapshot saved successfully!');
  };

  const handleRestoreSnapshot = (snap: any) => {
    isUndoingRedoing.current = true;
    methods.reset(snap.data);
    lastSavedStateRef.current = snap.data;
    toast.success(`Restored checkpoint: "${snap.label}"`);
  };

  const handleDeleteSnapshot = (snapId: string) => {
    const currentHistory = (formData.history || []).filter((h: any) => h.id !== snapId);
    setValue('history', currentHistory, { shouldDirty: true, shouldTouch: true });
    toast.success('Snapshot deleted.');
  };

  // Sections creation and deletion
  const handleAddCustomSection = () => {
    const customId = `custom_${Math.random().toString(36).substr(2, 9)}`;
    const currentOrder = [...(formData.sectionOrder || initialOrder)];
    currentOrder.push(customId);
    
    setValue('sectionOrder', currentOrder, { shouldDirty: true });
    setValue(`visibleSections.${customId}` as any, true, { shouldDirty: true });
    
    const updatedCustom = { ...(formData.customSections || {}) };
    updatedCustom[customId] = {
      id: customId,
      title: 'Custom Section',
      items: [],
    };
    setValue('customSections', updatedCustom, { shouldDirty: true });
    
    setActiveSection(customId);
    setIsAddSectionMenuOpen(false);
    toast.success('Custom section created!');
  };

  const handleDeleteSection = (secKey: string) => {
    const currentOrder = [...(formData.sectionOrder || initialOrder)];
    const filteredOrder = currentOrder.filter(key => key !== secKey);
    setValue('sectionOrder', filteredOrder, { shouldDirty: true });
    
    if (secKey.startsWith('custom_')) {
      const updatedCustom = { ...(formData.customSections || {}) };
      delete updatedCustom[secKey];
      setValue('customSections', updatedCustom, { shouldDirty: true });
    }
    
    if (activeSection === secKey) {
      setActiveSection(filteredOrder[0] || 'personalInfo');
    }
    toast.success('Section deleted!');
  };

  const handleAddStandardSection = (secKey: string) => {
    const currentOrder = [...(formData.sectionOrder || initialOrder)];
    if (!currentOrder.includes(secKey)) {
      currentOrder.push(secKey);
      setValue('sectionOrder', currentOrder, { shouldDirty: true });
    }
    setValue(`visibleSections.${secKey}` as any, true, { shouldDirty: true });
    setActiveSection(secKey);
    setIsAddSectionMenuOpen(false);
    toast.success(`${sectionLabels[secKey] || secKey} section added!`);
  };

  const baseResumeId = initialData?.resume_data?.parentResumeId || initialData?.id;
  const versions = allResumes.filter(r => r.id === baseResumeId || r.resume_data?.parentResumeId === baseResumeId);

  const handleCreateNewVersion = async () => {
    setIsDuplicatingVersion(true);
    const toastId = toast.loading('Creating new version...');
    try {
      const nextVerNum = versions.length + 1;
      const response = await duplicateResume(resumeId, `V${nextVerNum}`, baseResumeId);
      if (response.success && response.id) {
        toast.dismiss(toastId);
        toast.success(`Version V${nextVerNum} created successfully! Redirecting...`);
        window.location.href = `/builder/${response.id}`;
      } else {
        throw new Error(response.error);
      }
    } catch (err: any) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error(`Failed to create version: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDuplicatingVersion(false);
    }
  };

  // Synchronize comparedData content when compareBaseId changes
  useEffect(() => {
    if (!compareBaseId) {
      setComparedData(null);
      return;
    }

    if (compareBaseId.startsWith('snap_')) {
      const snap = (formData.history || []).find((h: any) => h.id === compareBaseId);
      if (snap) {
        setComparedData(snap.data);
      }
    } else {
      const res = allResumes.find(r => r.id === compareBaseId);
      if (res) {
        const normData = {
          ...res.resume_data,
          templateId: res.template_id || res.resume_data?.templateId || 'modern-minimalist',
        };
        if (normData.workExperience) {
          normData.workExperience = normData.workExperience.map((exp: any) => ({
            ...exp,
            description: Array.isArray(exp.description)
              ? `<ul>${exp.description.map((b: string) => `<li>${b}</li>`).join('')}</ul>`
              : exp.description || '<ul><li></li></ul>'
          }));
        }
        setComparedData(normData);
      }
    }
  }, [compareBaseId, allResumes, formData.history]);

  // Merge/Compare Actions
  const handleAcceptIndividualChange = (diff: ResumeDifference) => {
    const { fieldPath, changeType, baseValue, currentValue } = diff;
    
    if (changeType === 'added') {
      // Accepting addition of item in current. (Already added, do nothing)
    } else if (changeType === 'deleted') {
      // Accepting deletion of item from current. (Already deleted, do nothing)
    } else {
      // Modified. Apply the compared version's value to the current resume.
      setValue(fieldPath as any, baseValue, { shouldDirty: true, shouldTouch: true });
    }
    toast.success('Applied compared value!');
  };

  const handleRejectIndividualChange = (diff: ResumeDifference) => {
    const { fieldPath, changeType, baseValue, currentValue } = diff;

    if (changeType === 'added') {
      // Reverting an addition means removing it from the current resume.
      if (fieldPath === 'workExperience') {
        const list = methods.getValues('workExperience') || [];
        setValue('workExperience', list.filter(x => x.id !== currentValue.id), { shouldDirty: true });
      } else if (fieldPath === 'education') {
        const list = methods.getValues('education') || [];
        setValue('education', list.filter(x => x.id !== currentValue.id), { shouldDirty: true });
      } else if (fieldPath === 'projects') {
        const list = methods.getValues('projects') || [];
        setValue('projects', list.filter(x => x.id !== currentValue.id), { shouldDirty: true });
      } else if (fieldPath === 'certificates') {
        const list = methods.getValues('certificates') || [];
        setValue('certificates', list.filter(x => x.id !== currentValue.id), { shouldDirty: true });
      } else if (fieldPath === 'achievements') {
        const list = methods.getValues('achievements') || [];
        setValue('achievements', list.filter(x => x.id !== currentValue.id), { shouldDirty: true });
      }
    } else if (changeType === 'deleted') {
      // Reverting a deletion means restoring it from base to the current resume.
      if (fieldPath === 'workExperience') {
        const list = methods.getValues('workExperience') || [];
        setValue('workExperience', [...list, baseValue], { shouldDirty: true });
      } else if (fieldPath === 'education') {
        const list = methods.getValues('education') || [];
        setValue('education', [...list, baseValue], { shouldDirty: true });
      } else if (fieldPath === 'projects') {
        const list = methods.getValues('projects') || [];
        setValue('projects', [...list, baseValue], { shouldDirty: true });
      } else if (fieldPath === 'certificates') {
        const list = methods.getValues('certificates') || [];
        setValue('certificates', [...list, baseValue], { shouldDirty: true });
      } else if (fieldPath === 'achievements') {
        const list = methods.getValues('achievements') || [];
        setValue('achievements', [...list, baseValue], { shouldDirty: true });
      }
    } else {
      // Reverting a modification means keeping our current value. (Already kept, do nothing)
    }
    toast.success('Kept current value!');
  };

  const handleAcceptAllChanges = () => {
    if (!comparedData) return;
    isUndoingRedoing.current = true;
    methods.reset(comparedData);
    lastSavedStateRef.current = comparedData;
    toast.success('Applied all values from base version!');
  };

  const handleRejectAllChanges = () => {
    setIsCompareActive(false);
    toast.success('Kept all current edits.');
  };

  const handleCreateAiImprovedVersion = async () => {
    setIsAiImproving(true);
    const toastId = toast.loading('AI is optimizing your entire resume. This takes a few seconds...');
    try {
      const response = await fetch('/api/ai?action=improve-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: formData })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Create new version in DB with version_type 'improved'
      const dupResponse = await duplicateResume(resumeId, `AI Improved`, baseResumeId, 'improved');
      if (dupResponse.success && dupResponse.id) {
        // Now save the AI improved data to the new resume version
        const { error: saveError } = await supabase.rpc('save_complete_resume', {
          p_resume_id: dupResponse.id,
          p_title: `${resumeTitle} (AI Improved)`,
          p_template_id: formData.templateId || 'modern-minimalist',
          p_resume_data: data.improvedResume,
          p_experiences: (data.improvedResume.workExperience || []).map((exp: any) => ({
            ...exp,
            description: convertHtmlToBulletArray(exp.description || '')
          })),
          p_educations: data.improvedResume.education || [],
          p_projects: data.improvedResume.projects || [],
          p_skills: [
            ...(data.improvedResume.skills?.technicalSkills || []).map((skillName: string) => ({ skillName, category: 'technical' })),
            ...(data.improvedResume.skills?.softSkills || []).map((skillName: string) => ({ skillName, category: 'soft' })),
          ],
        });

        if (saveError) throw saveError;

        toast.dismiss(toastId);
        toast.success('AI Improved version created! Redirecting...');
        window.location.href = `/builder/${dupResponse.id}`;
      } else {
        throw new Error(dupResponse.error);
      }
    } catch (err: any) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error(`AI Optimization failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAiImproving(false);
    }
  };

  const handleSaveTailoredVersion = async (tailoredData: Partial<ResumeValues>, label: string) => {
    const toastId = toast.loading('Saving tailored version...');
    try {
      const versionLabel = label || 'Tailored Version';
      const dupResponse = await duplicateResume(resumeId, versionLabel, baseResumeId, 'tailored');
      if (dupResponse.success && dupResponse.id) {
        const merged = { ...formData, ...tailoredData };
        const { error: saveError } = await supabase.rpc('save_complete_resume', {
          p_resume_id: dupResponse.id,
          p_title: `${resumeTitle} (${versionLabel})`,
          p_template_id: merged.templateId || 'modern-minimalist',
          p_resume_data: {
            personalInfo: merged.personalInfo,
            certificates: merged.certificates || [],
            achievements: merged.achievements || [],
            workExperience: merged.workExperience || [],
            education: merged.education || [],
            projects: merged.projects || [],
            skills: merged.skills || { technicalSkills: [], softSkills: [] },
            sectionOrder: merged.sectionOrder || [],
            visibleSections: merged.visibleSections || {},
            customSections: merged.customSections || {},
            parentResumeId: baseResumeId,
            history: merged.history || [],
            chatHistory: merged.chatHistory || [],
          },
          p_experiences: (merged.workExperience || []).map((exp: any) => ({
            ...exp,
            description: convertHtmlToBulletArray(exp.description || '')
          })),
          p_educations: merged.education || [],
          p_projects: merged.projects || [],
          p_skills: [
            ...((merged.skills?.technicalSkills || []).map((skillName: string) => ({ skillName, category: 'technical' }))),
            ...((merged.skills?.softSkills || []).map((skillName: string) => ({ skillName, category: 'soft' }))),
          ],
        });
        if (saveError) throw saveError;
        toast.dismiss(toastId);
        toast.success(`"${versionLabel}" saved! Opening now...`);
        setTimeout(() => { window.location.href = `/builder/${dupResponse.id}`; }, 1200);
      } else {
        throw new Error(dupResponse.error || 'Failed to duplicate resume');
      }
    } catch (err: any) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error(`Failed to save tailored version: ${err.message || 'Unknown error'}`);
    }
  };

  // Auto-saving debouncing trigger

  useEffect(() => {
    const subscription = watch((value) => {
      setSaveStatus('saving');
      
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      
      autosaveTimerRef.current = setTimeout(async () => {
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
              customSections: value.customSections || {},
              parentResumeId: value.parentResumeId || '',
              history: value.history || [],
              chatHistory: value.chatHistory || [],
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
    });

    return () => {
      subscription.unsubscribe();
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
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
          customSections: data.customSections || {},
          parentResumeId: data.parentResumeId || '',
          history: data.history || [],
          chatHistory: data.chatHistory || [],
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
          customSections: formData.customSections || {},
          parentResumeId: formData.parentResumeId || '',
          history: formData.history || [],
          chatHistory: formData.chatHistory || [],
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
          customSections: formData.customSections || {},
          parentResumeId: formData.parentResumeId || '',
          history: formData.history || [],
          chatHistory: formData.chatHistory || [],
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
  const getCoreCompletionPercentage = (): number => {
    let completeSectionsCount = 0;
    if (formData.education && formData.education.length > 0) {
      completeSectionsCount++;
    }
    if (formData.workExperience && formData.workExperience.length > 0) {
      completeSectionsCount++;
    }
    if ((formData.skills?.technicalSkills && formData.skills.technicalSkills.length > 0) || 
        (formData.skills?.softSkills && formData.skills.softSkills.length > 0)) {
      completeSectionsCount++;
    }
    if (formData.projects && formData.projects.length > 0) {
      completeSectionsCount++;
    }
    if (formData.personalInfo?.summary && formData.personalInfo.summary.trim().length > 10) {
      completeSectionsCount++;
    }
    return completeSectionsCount * 20;
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

              {/* Version Selector Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVersionsMenuOpen(!isVersionsMenuOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                    workspaceTheme === 'dark'
                      ? 'border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/25 font-bold font-mono">
                    V{versions.findIndex(v => v.id === resumeId) + 1 !== 0 ? versions.findIndex(v => v.id === resumeId) + 1 : 1}
                  </span>
                  <span className="hidden sm:inline text-xxs font-bold uppercase tracking-wider text-slate-400">Versions</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>
                {isVersionsMenuOpen && (
                  <div className={`absolute left-0 mt-2 w-56 rounded-2xl shadow-2xl border p-1.5 z-50 animate-fade-in ${
                    workspaceTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="px-2.5 py-1.5 border-b border-slate-800/40 mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Switch Version</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {versions.map((ver, idx) => (
                        <Link
                          key={ver.id}
                          href={`/builder/${ver.id}`}
                          onClick={() => setIsVersionsMenuOpen(false)}
                          className={`w-full text-left block px-3.5 py-2 text-xs rounded-xl transition-all font-semibold ${
                            ver.id === resumeId
                              ? 'bg-indigo-600 text-white'
                              : workspaceTheme === 'dark'
                              ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                          }`}
                        >
                          <span className="font-mono text-[9px] opacity-75 mr-1.5">V{idx + 1}</span>
                          {ver.title.length > 20 ? `${ver.title.substring(0, 18)}...` : ver.title}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-slate-800/40 mt-1 pt-1 space-y-1">
                      <button
                        type="button"
                        onClick={handleCreateNewVersion}
                        disabled={isDuplicatingVersion}
                        className="w-full text-left px-3.5 py-2 text-xs rounded-xl text-indigo-400 hover:bg-indigo-500/10 font-bold flex items-center gap-1.5 transition-all"
                      >
                        {isDuplicatingVersion ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Create Version V{versions.length + 1}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateAiImprovedVersion}
                        disabled={isAiImproving}
                        className="w-full text-left px-3.5 py-2 text-xs rounded-xl text-amber-400 hover:bg-amber-500/10 font-bold flex items-center gap-1.5 transition-all border-t border-slate-800/45 pt-1.5"
                        title="AI will optimize your entire resume layout and phrasing, saving it as a new AI Improved version."
                      >
                        {isAiImproving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Improving...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Improve Entire Resume
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 select-none">
                {resumeStatus === 'completed' ? (
                  <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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
              
              {/* Undo & Redo */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={undo}
                  disabled={pastStates.length === 0}
                  className={`p-2 rounded-xl border transition-all ${
                    pastStates.length === 0
                      ? 'opacity-30 cursor-not-allowed border-transparent text-slate-500'
                      : workspaceTheme === 'dark'
                      ? 'border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={futureStates.length === 0}
                  className={`p-2 rounded-xl border transition-all ${
                    futureStates.length === 0
                      ? 'opacity-30 cursor-not-allowed border-transparent text-slate-500'
                      : workspaceTheme === 'dark'
                      ? 'border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Version History Checkpoints Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsHistoryOpen(!isHistoryOpen);
                  setIsAiOpen(false);
                }}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  isHistoryOpen
                    ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-md'
                    : workspaceTheme === 'dark'
                    ? 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-900'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden md:inline">History</span>
              </button>

              {/* Workspace Light/Dark Toggler */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className={`p-2 rounded-xl border transition-all ${
                  workspaceTheme === 'dark'
                    ? 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Workspace Theme"
              >
                {workspaceTheme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-850" />}
              </button>

              {/* Compare Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsCompareActive(!isCompareActive);
                  setIsAiOpen(false);
                  setIsHistoryOpen(false);
                  // Auto-select comparison base if none chosen yet
                  if (!compareBaseId) {
                    const otherVer = versions.find(v => v.id !== resumeId);
                    if (otherVer) {
                      setCompareBaseId(otherVer.id);
                    } else if (formData.history && formData.history.length > 0) {
                      setCompareBaseId(formData.history[0].id);
                    }
                  }
                }}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  isCompareActive
                    ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-md'
                    : workspaceTheme === 'dark'
                    ? 'border-slate-800 bg-slate-900/40 text-indigo-400 hover:bg-slate-900 hover:text-white'
                    : 'border-slate-200 bg-slate-100 text-indigo-600 hover:bg-slate-200'
                }`}
                title="Compare structural versions side-by-side"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Compare Mode</span>
              </button>

              {/* AI Co-Pilot Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsAiOpen(!isAiOpen);
                  setIsHistoryOpen(false);
                  setIsCompareActive(false);
                }}
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
                      { id: 'ats', label: 'ATS Friendly' },
                      { id: 'tech', label: 'Developer & Tech' },
                      { id: 'executive', label: 'Executive Portfolio' },
                      { id: 'modern', label: 'Modern Design' },
                      { id: 'minimal', label: 'Minimalist Clean' },
                      { id: 'creative', label: 'Creative Accent' },
                      { id: 'modern-minimalist', label: 'Minimalist (Legacy)' },
                      { id: 'professional', label: 'Professional (Legacy)' }
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

              {/* DOCX Exporter Button */}
              {isMounted && (
                <button
                  type="button"
                  disabled={isExportingDocx}
                  onClick={() => handleExportDocx(formData)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl transition-all duration-200 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isExportingDocx ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  {isExportingDocx ? 'Exporting...' : 'Export DOCX'}
                </button>
              )}

              {/* PDF Exporter Button */}
              <button
                type="button"
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>

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
                      const customSectionsAny = formData.customSections as any;
                      const label = secKey.startsWith('custom_')
                        ? (customSectionsAny?.[secKey]?.title || 'Custom Section')
                        : (sectionLabels[secKey] || secKey);
                      const isVisible = formData.visibleSections?.[secKey as keyof typeof formData.visibleSections] ?? true;
                      const complete = secKey.startsWith('custom_')
                        ? !!(customSectionsAny?.[secKey]?.items?.length > 0)
                        : isSectionComplete(secKey);

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
                          onDelete={secKey !== 'personalInfo' ? () => handleDeleteSection(secKey) : undefined}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add Section Dropdown */}
              <div className="relative mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddSectionMenuOpen(!isAddSectionMenuOpen)}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 text-xxs font-bold uppercase tracking-wider rounded-xl border transition-all ${
                    workspaceTheme === 'dark'
                      ? 'border-dashed border-slate-800 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 bg-slate-950 hover:bg-indigo-950/10'
                      : 'border-dashed border-slate-200 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-600 bg-white hover:bg-indigo-50/10'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Section
                </button>
                {isAddSectionMenuOpen && (
                  <div className={`absolute bottom-full left-0 mb-2 w-full rounded-2xl shadow-2xl border p-1.5 z-50 animate-fade-in ${
                    workspaceTheme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="px-2.5 py-1.5 border-b border-slate-800/40 mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Available Sections</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {allStandardSections
                        .filter(sec => !formData.sectionOrder?.includes(sec.key))
                        .map((sec) => (
                          <button
                            key={sec.key}
                            type="button"
                            onClick={() => handleAddStandardSection(sec.key)}
                            className={`w-full text-left block px-3 py-1.5 text-xs rounded-xl transition-all font-semibold ${
                              workspaceTheme === 'dark'
                                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                            }`}
                          >
                            {sec.label}
                          </button>
                        ))}
                      
                      <button
                        type="button"
                        onClick={handleAddCustomSection}
                        className={`w-full text-left block px-3 py-1.5 text-xs rounded-xl transition-all font-bold text-indigo-400 hover:bg-indigo-500/10`}
                      >
                        + Custom Section
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                
                {isOnboardingActive && onboardingStep !== 'welcome' && (
                  /* ==========================================
                     ONBOARDING STEPPER PROGRESS BAR
                     ========================================== */
                  <div className={`p-4 rounded-2xl border ${
                    workspaceTheme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex justify-between items-center mb-4 px-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Guided Resume Tour</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSkipOnboarding}
                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Skip Tour
                      </button>
                    </div>
                    <div className="relative flex items-center justify-between w-full px-2">
                      {/* Background track line */}
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 pointer-events-none z-0" />
                      
                      {/* Active step progress indicator fill */}
                      <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-500 transition-all duration-500 pointer-events-none z-0"
                        style={{
                          width: `${
                            (ONBOARDING_STEPS.findIndex(s => s.step === onboardingStep) / (ONBOARDING_STEPS.length - 1)) * 100
                          }%`
                        }}
                      />

                      {ONBOARDING_STEPS.map((s, idx) => {
                        const isStepActive = onboardingStep === s.step;
                        const isStepComplete = s.step === 'finalReview' 
                          ? getCoreCompletionPercentage() === 100
                          : (s.step === 'education' ? (formData.education && formData.education.length > 0)
                             : s.step === 'experience' ? (formData.workExperience && formData.workExperience.length > 0)
                             : s.step === 'skills' ? ((formData.skills?.technicalSkills && formData.skills.technicalSkills.length > 0) || (formData.skills?.softSkills && formData.skills.softSkills.length > 0))
                             : s.step === 'projects' ? (formData.projects && formData.projects.length > 0)
                             : (formData.personalInfo?.summary && formData.personalInfo.summary.trim().length > 10));

                        return (
                          <button
                            key={s.step}
                            type="button"
                            onClick={() => updateOnboardingStep(s.step)}
                            className="relative z-10 flex flex-col items-center gap-1.5 focus:outline-none group cursor-pointer"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 border ${
                              isStepActive
                                ? 'bg-indigo-600 border-indigo-500 text-white scale-110 shadow-lg shadow-indigo-600/30'
                                : isStepComplete
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                : workspaceTheme === 'dark'
                                ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}>
                              {isStepComplete ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : idx + 1}
                            </div>
                            <span className={`text-[9px] font-bold tracking-wide hidden sm:block ${
                              isStepActive 
                                ? 'text-indigo-400' 
                                : isStepComplete 
                                ? 'text-emerald-500' 
                                : 'text-slate-500'
                            }`}>
                              {s.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Onboarding Welcome Card */}
                {isOnboardingActive && onboardingStep === 'welcome' && (
                  <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-8 space-y-6 backdrop-blur-md text-center max-w-xl mx-auto my-8 relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300 animate-fade-in">
                    <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto group-hover:scale-105 group-hover:bg-indigo-500/20 transition-all duration-300 mb-2">
                      <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-extrabold text-white tracking-tight">Welcome to Your Resume Workspace</h3>
                      <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed font-light">
                        Welcome! I've set up your resume workspace. To build a strong resume, let's start with a solid foundation. I recommend beginning with the Education section. Ready to start?
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
                      <button
                        type="button"
                        onClick={() => updateOnboardingStep('education')}
                        className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Go to Education
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSkipOnboarding}
                        className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                      >
                        Skip Guided Tour
                      </button>
                    </div>
                  </div>
                )}

                {/* Onboarding Final Review Screen */}
                {isOnboardingActive && onboardingStep === 'finalReview' && activeSection === 'finalReview' && (
                  <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-8 space-y-6 backdrop-blur-md max-w-xl mx-auto my-8 animate-fade-in relative overflow-hidden group hover:border-indigo-500/25 transition-all duration-300">
                    <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-center gap-3 border-b border-slate-800/85 pb-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white tracking-tight">Foundations Complete!</h3>
                        <p className="text-[10px] text-slate-400 font-light">Great job building the core components of your resume.</p>
                      </div>
                    </div>

                    {/* Completion progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xxs font-bold text-slate-400">
                        <span>FOUNDATIONAL SECTIONS STATUS</span>
                        <span className="text-indigo-400 font-mono text-xs">{getCoreCompletionPercentage()}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                          style={{ width: `${getCoreCompletionPercentage()}%` }} 
                        />
                      </div>
                    </div>

                    {/* Completion Checklist */}
                    <div className="space-y-2.5 py-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Checklist Overview</span>
                      {[
                        { key: 'education', label: 'Education', icon: <GraduationCap className="w-4.5 h-4.5" /> },
                        { key: 'workExperience', label: 'Work Experience', icon: <Briefcase className="w-4.5 h-4.5" /> },
                        { key: 'skills', label: 'Skills Inventory', icon: <Code className="w-4.5 h-4.5" /> },
                        { key: 'projects', label: 'Projects Showcase', icon: <FolderGit2 className="w-4.5 h-4.5" /> },
                        { key: 'summary', label: 'Professional Summary', icon: <Sparkles className="w-4.5 h-4.5" /> }
                      ].map(item => {
                        const complete = item.key === 'education' ? (formData.education && formData.education.length > 0)
                          : item.key === 'workExperience' ? (formData.workExperience && formData.workExperience.length > 0)
                          : item.key === 'skills' ? ((formData.skills?.technicalSkills && formData.skills.technicalSkills.length > 0) || (formData.skills?.softSkills && formData.skills.softSkills.length > 0))
                          : item.key === 'projects' ? (formData.projects && formData.projects.length > 0)
                          : (formData.personalInfo?.summary && formData.personalInfo.summary.trim().length > 10);
                        return (
                          <div key={item.key} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg border ${
                                complete 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : 'bg-slate-900 border-slate-800 text-slate-500'
                              }`}>
                                {item.icon}
                              </div>
                              <span className={`text-xs font-semibold ${complete ? 'text-slate-200' : 'text-slate-500 font-light'}`}>
                                {item.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {complete ? (
                                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  Filled
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  Empty
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleExportPdf}
                        className="w-full sm:flex-grow px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        Export Resume PDF
                      </button>
                      <button
                        type="button"
                        onClick={handleCompleteOnboarding}
                        className="w-full sm:flex-grow px-5 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Continue Editing
                      </button>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={handleResetOnboarding}
                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        Restart Guided Tour
                      </button>
                    </div>
                  </div>
                )}

                {/* Standard forms display (when onboarding is not in welcome or finalReview steps) */}
                {(!isOnboardingActive || (onboardingStep !== 'welcome' && activeSection !== 'finalReview')) && (
                  <>
                    {/* Non-blocking tour warning banner */}
                    {isOnboardingActive && !ONBOARDING_STEPS.some(s => s.section === activeSection) && (
                      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-xxs text-slate-400 flex items-center justify-between mb-4">
                        <span>You are currently editing <strong>{sectionLabels[activeSection] || activeSection}</strong> outside the guided onboarding tour.</span>
                        <button
                          type="button"
                          onClick={() => {
                            const stepSec = ONBOARDING_STEPS.find(s => s.step === onboardingStep);
                            if (stepSec) {
                              setActiveSection(stepSec.section);
                            }
                          }}
                          className="text-indigo-400 font-bold hover:underline cursor-pointer"
                        >
                          Return to Tour
                        </button>
                      </div>
                    )}

                    {/* Active Section Header Indicator */}
                    <div className="flex items-center gap-1.5 text-xxs text-indigo-400 uppercase tracking-widest font-bold">
                      <span>Step {currentIdx + 1} of {activeOrder.length}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className={`${workspaceTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {activeSection.startsWith('custom_')
                          ? ((formData.customSections as any)?.[activeSection]?.title || 'Custom Section')
                          : (sectionLabels[activeSection] || activeSection)}
                      </span>
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
                      {activeSection.startsWith('custom_') && <CustomSectionForm sectionId={activeSection} />}
                    </div>
                  </>
                )}

              </div>

              {/* Form Footer Navigation Controls */}
              {isOnboardingActive ? (
                /* Customized Onboarding Footer */
                onboardingStep !== 'welcome' && activeSection !== 'finalReview' && (
                  <div className={`flex items-center justify-between mt-10 pt-4 border-t ${
                    workspaceTheme === 'dark' ? 'border-slate-900' : 'border-slate-200'
                  }`}>
                    {/* Previous step button */}
                    {onboardingStep === 'education' ? (
                      <button
                        type="button"
                        onClick={handleSkipOnboarding}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                          workspaceTheme === 'dark'
                            ? 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white'
                            : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Skip Tour
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const idx = ONBOARDING_STEPS.findIndex(s => s.step === onboardingStep);
                          if (idx > 0) {
                            updateOnboardingStep(ONBOARDING_STEPS[idx - 1].step);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                          workspaceTheme === 'dark'
                            ? 'border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white'
                            : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous: {ONBOARDING_STEPS[ONBOARDING_STEPS.findIndex(s => s.step === onboardingStep) - 1].label}
                      </button>
                    )}

                    {/* Stepper Dot Nav */}
                    <div className="flex items-center gap-1.5">
                      {ONBOARDING_STEPS.map((s) => (
                        <button
                          key={s.step}
                          type="button"
                          onClick={() => updateOnboardingStep(s.step)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            onboardingStep === s.step 
                              ? 'bg-indigo-500 scale-125' 
                              : workspaceTheme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'
                          }`}
                          title={s.label}
                        />
                      ))}
                    </div>

                    {/* Next step button */}
                    {onboardingStep === 'summary' ? (
                      <button
                        type="button"
                        onClick={() => updateOnboardingStep('finalReview')}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                      >
                        Next: Final Review
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const idx = ONBOARDING_STEPS.findIndex(s => s.step === onboardingStep);
                          if (idx !== -1 && idx < ONBOARDING_STEPS.length - 1) {
                            updateOnboardingStep(ONBOARDING_STEPS[idx + 1].step);
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                      >
                        Next: {ONBOARDING_STEPS[ONBOARDING_STEPS.findIndex(s => s.step === onboardingStep) + 1].label}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* Standard Form Footer Controls */
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
              )}

            </div>
          </div>

          {/* ==========================================
             RIGHT PANEL: PREVIEW / COMPARE WORKSPACE
             ========================================== */}
          {isCompareActive ? (
            /* ==========================================
               COMPARE MODE WORKSPACE
               ========================================== */
            <div className="flex-grow lg:w-[48%] xl:w-[52%] bg-slate-950 p-6 overflow-y-auto max-h-[calc(100vh-64px)] hidden md:flex flex-col gap-6 select-none border-l border-slate-900">
              {/* Compare Control Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/40 border border-slate-900 p-4 rounded-2xl w-full sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <GitPullRequest className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-200">Comparison Workspace</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Compare Base:</span>
                      <select
                        value={compareBaseId}
                        onChange={(e) => setCompareBaseId(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Select Version/Snapshot --</option>
                        <optgroup label="Document Versions">
                          {versions.map((ver, idx) => (
                            <option key={ver.id} value={ver.id} disabled={ver.id === resumeId}>
                              V{idx + 1}: {ver.title} {ver.id === resumeId ? '(Current)' : ''}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Checkpoint Snapshots">
                          {(formData.history || []).map((snap: any) => (
                            <option key={snap.id} value={snap.id}>
                              Snapshot: {snap.label} ({new Date(snap.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptAllChanges}
                    disabled={!comparedData}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-40 transition-all cursor-pointer shadow-md"
                    title="Overwrite all fields in current resume with base version values"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept All Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectAllChanges}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject All Changes
                  </button>
                </div>
              </div>

              {/* Side by Side Previews */}
              {comparedData ? (
                <div className="space-y-6 w-full">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full items-start">
                    
                    {/* Left Column: Base Version (Read Only) */}
                    <div className="space-y-2 w-full">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] uppercase font-black tracking-widest text-rose-400">Base Version (Read-Only)</span>
                        <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-mono">
                          {compareBaseId.startsWith('snap_') ? 'Checkpoint' : 'Database Version'}
                        </span>
                      </div>
                      <div className="pointer-events-none select-none opacity-80 border-2 border-dashed border-rose-500/20 rounded-2xl overflow-hidden scale-[0.8] origin-top w-full">
                        <LivePreview data={comparedData} />
                      </div>
                    </div>

                    {/* Right Column: Current Version (Editable) */}
                    <div className="space-y-2 w-full">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Current Version (Interactive)</span>
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                          Active Form
                        </span>
                      </div>
                      <div className="border-2 border-dashed border-emerald-500/20 rounded-2xl overflow-hidden scale-[0.8] origin-top w-full">
                        <LivePreview data={formData} />
                      </div>
                    </div>

                  </div>

                  {/* Changes List / Diff Dashboard */}
                  <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
                      Detected Lineage Changes ({getResumeDifferences(comparedData, formData).length})
                    </h3>

                    {getResumeDifferences(comparedData, formData).length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center">No differences found. Both versions match perfectly!</p>
                    ) : (
                      <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                        {getResumeDifferences(comparedData, formData).map((diff) => {
                          const isNew = diff.changeType === 'added';
                          const isDel = diff.changeType === 'deleted';
                          
                          return (
                            <div key={diff.id} className="p-3.5 bg-slate-950 border border-slate-900 rounded-xl space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                  <span className="text-[9px] uppercase font-black tracking-widest text-indigo-400">{diff.section}</span>
                                  <h5 className="text-xs font-bold text-slate-200">{diff.itemLabel}</h5>
                                </div>
                                <span className={`text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${
                                  isNew ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400' :
                                  isDel ? 'bg-rose-950/80 border-rose-500/30 text-rose-400' :
                                  'bg-amber-950/80 border-amber-500/30 text-amber-400'
                                }`}>
                                  {diff.changeType}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] leading-relaxed">
                                {/* Base value display */}
                                {!isNew && (
                                  <div className="p-2.5 bg-slate-900/30 border border-slate-900 rounded-lg">
                                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Base value:</span>
                                    <div className="text-slate-400 mt-1 whitespace-pre-wrap line-through font-light">
                                      {Array.isArray(diff.baseValue) 
                                        ? diff.baseValue.join(', ') 
                                        : typeof diff.baseValue === 'string' && diff.baseValue.startsWith('<ul>')
                                        ? diff.baseValue.replace(/<[^>]*>/g, '')
                                        : String(diff.baseValue)}
                                    </div>
                                  </div>
                                )}

                                {/* Current value display */}
                                {!isDel && (
                                  <div className="p-2.5 bg-slate-900/30 border border-slate-900 rounded-lg">
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Current value:</span>
                                    <div className="text-slate-200 mt-1 whitespace-pre-wrap font-semibold">
                                      {Array.isArray(diff.currentValue) 
                                        ? diff.currentValue.join(', ') 
                                        : typeof diff.currentValue === 'string' && diff.currentValue.startsWith('<ul>')
                                        ? diff.currentValue.replace(/<[^>]*>/g, '')
                                        : String(diff.currentValue)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 justify-end border-t border-slate-900/60 pt-2.5">
                                {/* Revert / Apply Base */}
                                <button
                                  type="button"
                                  onClick={() => handleAcceptIndividualChange(diff)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded hover:bg-rose-500/25 transition-all cursor-pointer"
                                  title="Overwrite current form with compared value for this field"
                                >
                                  Apply Base Value
                                </button>

                                {/* Discard Change / Keep Current */}
                                <button
                                  type="button"
                                  onClick={() => handleRejectIndividualChange(diff)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/25 transition-all cursor-pointer"
                                >
                                  Keep Current
                                </button>

                                {/* Edit manually */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSection(diff.section);
                                    toast.info(`Switched to ${sectionLabels[diff.section] || diff.section} form editor!`);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-all cursor-pointer"
                                >
                                  Edit Manually
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col justify-center items-center text-center p-12 border border-dashed border-slate-900 rounded-3xl min-h-[400px]">
                  <GitPullRequest className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                  <h4 className="text-sm font-bold text-slate-300">Select Version to Compare</h4>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm">
                    Choose a database copy or snapshot from the comparison selector above to view structural changes side-by-side.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ==========================================
               STANDARD LIVE PREVIEW WORKSPACE
               ========================================== */
            <div className="flex-grow lg:w-[48%] xl:w-[52%] bg-slate-900/15 p-6 overflow-y-auto max-h-[calc(100vh-64px)] hidden md:flex flex-col items-center justify-start gap-4 select-none">
              {/* Zoom controls */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border backdrop-blur-md sticky top-0 z-20 shadow-sm ${
                workspaceTheme === 'dark' ? 'bg-slate-950/80 border-slate-900 text-white' : 'bg-white/80 border-slate-200 text-slate-900'
              }`}>
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.1))}
                  className="p-1 rounded hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold font-mono text-slate-400 w-12 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(1.5, prev + 0.1))}
                  className="p-1 rounded hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="h-3.5 w-[1px] bg-slate-800/40 mx-1" />
                <button
                  type="button"
                  onClick={() => setZoomScale(1.0)}
                  className="px-2 py-0.5 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  title="Reset Zoom"
                >
                  Reset
                </button>
              </div>

              {/* Scale Wrapper */}
              <div
                className="w-full max-w-[800px] shrink-0 origin-top transition-transform duration-200"
                style={{ transform: `scale(${zoomScale})` }}
              >
                <LivePreview data={formData} />
              </div>
            </div>
          )}

          {/* ==========================================
             AI ASSISTANT DRAWER PANEL
             ========================================== */}
          <AnimatePresence>
            {isAiOpen && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className={`fixed top-16 right-0 bottom-0 z-30 w-[420px] max-w-full shadow-2xl border-l backdrop-blur-xl flex flex-col ${
                  workspaceTheme === 'dark' ? 'bg-slate-950/95 border-slate-900' : 'bg-white/95 border-slate-200'
                }`}
              >
                <div className="flex-grow overflow-y-auto p-5">
                  <AIPanel onSaveTailoredVersion={handleSaveTailoredVersion} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==========================================
             HISTORY TIMELINE DRAWER PANEL
             ========================================== */}
          <AnimatePresence>
            {isHistoryOpen && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className={`fixed top-16 right-0 bottom-0 z-30 w-[420px] max-w-full shadow-2xl border-l backdrop-blur-xl flex flex-col ${
                  workspaceTheme === 'dark' ? 'bg-slate-950/95 border-slate-900 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex-grow overflow-y-auto p-5 flex flex-col h-full justify-between">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-sm font-bold tracking-tight">Version Checkpoints</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsHistoryOpen(false)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Create Snapshot Form */}
                      <div className="bg-slate-900/30 border border-slate-800/80 p-3.5 rounded-xl space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Save Checkpoint</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Snapshot name (e.g. Added certificates)"
                            value={snapshotLabel}
                            onChange={(e) => setSnapshotLabel(e.target.value)}
                            className="bg-slate-950 text-xs border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-white"
                          />
                          <button
                            type="button"
                            onClick={handleSaveSnapshot}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      {/* Snapshots Timeline */}
                      <div className="space-y-3 mt-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Timeline</span>
                        {(formData.history || []).length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-4">No checkpoints saved yet.</p>
                        ) : (
                          <div className="relative border-l border-slate-800 pl-4 space-y-3 ml-2">
                            {(formData.history || []).map((snap: any, index: number) => (
                              <div key={snap.id || index} className="relative group">
                                <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-slate-950" />
                                
                                <div className="flex items-start justify-between gap-3 bg-slate-900/10 hover:bg-slate-900/20 p-2.5 rounded-lg border border-slate-800/60 hover:border-indigo-500/30 transition-all">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-300 block truncate">{snap.label}</span>
                                    <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{new Date(snap.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreSnapshot(snap)}
                                      className="px-2 py-0.5 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded hover:bg-indigo-500/25 transition-all"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSnapshot(snap.id)}
                                      className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==========================================
             FLOATING COMMAND PALETTE
             ========================================== */}
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onSwitchTemplate={(templateId) => {
              setValue('templateId', templateId as any);
              toast.success(`Switched template to ${templateId}!`);
            }}
            onNavigateSection={(sectionKey) => {
              setActiveSection(sectionKey);
            }}
            onExportPdf={handleExportPdf}
            onExportDocx={() => handleExportDocx(formData)}
            onToggleTheme={handleToggleTheme}
            onTriggerAi={() => {
              setIsAiOpen(true);
              setIsHistoryOpen(false);
            }}
            onTriggerHistory={() => {
              setIsHistoryOpen(true);
              setIsAiOpen(false);
            }}
            sections={[
              ...allStandardSections,
              ...(formData.sectionOrder || []).filter(key => key.startsWith('custom_')).map(key => {
                const customSectionsAny = formData.customSections as any;
                return { key, label: customSectionsAny?.[key]?.title || 'Custom Section' };
              })
            ]}
            currentTheme={workspaceTheme}
          />

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
  onDelete?: () => void;
}

function SortableSectionItem({
  secKey,
  label,
  isSelected,
  isVisible,
  complete,
  theme,
  onSelect,
  onToggleVisibility,
  onDelete
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
        {/* Delete custom section if applicable */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-colors"
            title="Delete Section"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
