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
  FileText
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ResumePDFDocument } from '@/components/builder/pdf-document';
import { AIPanel } from '@/components/builder/ai-panel';
import { generateDocxBlob } from '@/lib/docx-exporter';
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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [resumeTitle, setResumeTitle] = useState(initialData?.title || 'My Professional Resume');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('personalInfo');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [workspaceTheme, setWorkspaceTheme] = useState<'dark' | 'light'>('dark');
  const [resumeStatus, setResumeStatus] = useState<'draft' | 'completed'>(initialData?.resume_data?.status || 'draft');

  // Undo & Redo History Stack State
  const [pastStates, setPastStates] = useState<any[]>([]);
  const [futureStates, setFutureStates] = useState<any[]>([]);
  const lastSavedStateRef = useRef<any>(null);
  const isUndoingRedoing = useRef<boolean>(false);

  // Resume Versions State
  const [allResumes, setAllResumes] = useState<any[]>([]);
  const [isVersionsMenuOpen, setIsVersionsMenuOpen] = useState(false);
  const [isDuplicatingVersion, setIsDuplicatingVersion] = useState(false);

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
    },
  });

  const { watch, handleSubmit, setValue } = methods;
  const formData = watch();

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
      
      const timer = setTimeout(() => {
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
      
      return () => clearTimeout(timer);
    });
    return () => subscription.unsubscribe();
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

  // Custom Sections creation and deletion
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
    toast.success('Custom section created!');
  };

  const handleDeleteCustomSection = (customId: string) => {
    const currentOrder = [...(formData.sectionOrder || initialOrder)];
    const filteredOrder = currentOrder.filter(key => key !== customId);
    setValue('sectionOrder', filteredOrder, { shouldDirty: true });
    
    const updatedCustom = { ...(formData.customSections || {}) };
    delete updatedCustom[customId];
    setValue('customSections', updatedCustom, { shouldDirty: true });
    
    if (activeSection === customId) {
      setActiveSection(filteredOrder[0] || 'personalInfo');
    }
    toast.success('Custom section deleted!');
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
              customSections: value.customSections || {},
              parentResumeId: value.parentResumeId || '',
              history: value.history || [],
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
          customSections: data.customSections || {},
          parentResumeId: data.parentResumeId || '',
          history: data.history || [],
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
                    <div className="border-t border-slate-800/40 mt-1 pt-1">
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
                onClick={() => {
                  setIsAiOpen(!isAiOpen);
                  setIsHistoryOpen(false);
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
                          onDelete={secKey.startsWith('custom_') ? () => handleDeleteCustomSection(secKey) : undefined}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              <button
                type="button"
                onClick={handleAddCustomSection}
                className={`w-full mt-4 flex items-center justify-center gap-1.5 py-2 text-xxs font-bold uppercase tracking-wider rounded-xl border transition-all ${
                  workspaceTheme === 'dark'
                    ? 'border-dashed border-slate-800 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 bg-slate-950 hover:bg-indigo-950/10'
                    : 'border-dashed border-slate-200 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-600 bg-white hover:bg-indigo-50/10'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Section
              </button>
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

          {/* ==========================================
             HISTORY TIMELINE DRAWER PANEL
             ========================================== */}
          <div className={`fixed top-16 right-0 bottom-0 z-30 w-[420px] max-w-full shadow-2xl border-l backdrop-blur-xl flex flex-col transform transition-transform duration-300 ${
            isHistoryOpen ? 'translate-x-0' : 'translate-x-full'
          } ${
            workspaceTheme === 'dark' ? 'bg-slate-950/90 border-slate-900 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
          }`}>
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
                        className={`bg-slate-950 text-xs border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-white`}
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
