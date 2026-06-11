'use client';

import React, { useState } from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { ResumeValues } from '@/types/resume-schema';
import { 
  Plus, Trash2, Mail, Phone, MapPin, Type, Briefcase, 
  GraduationCap, Code, Globe, Award, Trophy, FolderGit2,
  ChevronDown, ChevronUp, GripVertical, Sparkles, Loader2
} from 'lucide-react';
import { LinkedinIcon as Linkedin, GithubIcon as Github } from '@/components/shared/icons';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

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

/* ==========================================================================
   SORTABLE ITEM WRAPPER
   ========================================================================== */
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-4.5 left-3 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800/80 transition-colors z-10 opacity-0 group-hover:opacity-100 duration-200"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </div>
  );
}

import { useToast } from '@/components/ui/toast';

interface InlineAiButtonProps {
  fieldName: string;
  currentValue: string;
  tone?: 'technical' | 'leadership' | 'shorten' | 'improve';
  label?: string;
}

export function InlineAiButton({ fieldName, currentValue, tone = 'improve', label }: InlineAiButtonProps) {
  const { setValue } = useFormContext<ResumeValues>();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleRewrite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Strip HTML tags to evaluate text length
    const cleanText = currentValue ? currentValue.replace(/<[^>]*>/g, '').trim() : '';
    if (!cleanText) {
      toast.error('Please enter some text first for the AI to polish.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('AI is polishing this section...');
    try {
      const response = await fetch('/api/ai?action=rewrite-in-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentValue, tone }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Format work experience bullet point as list items if it's rich text
      let newText = data.text;
      if (fieldName.endsWith('.description') && fieldName.includes('workExperience')) {
        if (!newText.startsWith('<ul>') && !newText.startsWith('<li>')) {
          newText = `<ul><li>${newText.replace(/^[•\-\s]+/, '')}</li></ul>`;
        }
      }
      
      setValue(fieldName as any, newText, { shouldDirty: true, shouldTouch: true });
      toast.dismiss(toastId);
      toast.success('Text polished successfully!');
    } catch (err: any) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('AI Rewrite failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-1 items-center select-none shrink-0">
      <button
        type="button"
        onClick={handleRewrite}
        disabled={isLoading}
        className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded hover:bg-indigo-500/20 transition-all cursor-pointer disabled:opacity-40"
        title={`Polish as ${tone} with AI`}
      >
        {isLoading ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
        ) : (
          <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
        )}
        {label || 'AI Improve'}
      </button>
    </div>
  );
}


/* ==========================================================================
   1. PERSONAL INFORMATION FORM
   ========================================================================== */
export function PersonalInfoForm() {
  const { register, formState: { errors } } = useFormContext<ResumeValues>();

  return (
    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Type className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-bold text-white tracking-tight">Personal Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
          <input
            {...register('personalInfo.fullName')}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
            placeholder="John Doe"
          />
          {errors.personalInfo?.fullName && (
            <p className="text-red-400 text-xxs font-medium mt-1">{errors.personalInfo.fullName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Professional Title</label>
          <input
            {...register('personalInfo.title')}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
            placeholder="Senior Software Engineer"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
            <input
              {...register('personalInfo.email')}
              type="email"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
              placeholder="you@example.com"
            />
          </div>
          {errors.personalInfo?.email && (
            <p className="text-red-400 text-xxs font-medium mt-1">{errors.personalInfo.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
            <input
              {...register('personalInfo.phone')}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
            <input
              {...register('personalInfo.location')}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
              placeholder="San Francisco, CA"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">LinkedIn Profile</label>
          <div className="relative">
            <Linkedin className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
            <input
              {...register('personalInfo.linkedin')}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
              placeholder="https://linkedin.com/in/username"
            />
          </div>
          {errors.personalInfo?.linkedin && (
            <p className="text-red-400 text-xxs font-medium mt-1">{errors.personalInfo.linkedin.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">GitHub Profile</label>
          <div className="relative">
            <Github className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
            <input
              {...register('personalInfo.github')}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
              placeholder="https://github.com/username"
            />
          </div>
          {errors.personalInfo?.github && (
            <p className="text-red-400 text-xxs font-medium mt-1">{errors.personalInfo.github.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Portfolio Website</label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
            <input
              {...register('personalInfo.portfolio')}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
              placeholder="https://yourportfolio.com"
            />
          </div>
          {errors.personalInfo?.portfolio && (
            <p className="text-red-400 text-xxs font-medium mt-1">{errors.personalInfo.portfolio.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   1B. SUMMARY FORM
   ========================================================================== */
export function SummaryForm() {
  const { register, watch } = useFormContext<ResumeValues>();
  const summaryVal = watch('personalInfo.summary') || '';

  return (
    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-bold text-white tracking-tight">Professional Summary</h3>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Summarize your background and key achievements
          </label>
          <div className="flex gap-1.5">
            <InlineAiButton fieldName="personalInfo.summary" currentValue={summaryVal} tone="improve" label="AI Improve" />
            <InlineAiButton fieldName="personalInfo.summary" currentValue={summaryVal} tone="technical" label="AI Technical" />
            <InlineAiButton fieldName="personalInfo.summary" currentValue={summaryVal} tone="shorten" label="AI Shorten" />
          </div>
        </div>
        <textarea
          {...register('personalInfo.summary')}
          rows={6}
          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600 leading-relaxed"
          placeholder="Brief professional profile summary or background details..."
        />
      </div>
    </div>
  );
}

/* ==========================================================================
   2. WORK EXPERIENCE FORM (DYNAMIC FIELD ARRAY WITH ACCORDION & DND)
   ========================================================================== */
export function ExperienceForm() {
  const { control, register, watch } = useFormContext<ResumeValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'workExperience',
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(fields.length > 0 ? 0 : null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Ensure clicking input/textarea does not start drag
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
      
      // Update expanded index to follow the moved item
      if (expandedIndex === oldIndex) {
        setExpandedIndex(newIndex);
      } else if (expandedIndex !== null) {
        if (oldIndex < expandedIndex && newIndex >= expandedIndex) {
          setExpandedIndex(expandedIndex - 1);
        } else if (oldIndex > expandedIndex && newIndex <= expandedIndex) {
          setExpandedIndex(expandedIndex + 1);
        }
      }
    }
  };

  const handleAppend = () => {
    append({ 
      id: Math.random().toString(36).substr(2, 9), 
      company: '', 
      position: '', 
      location: '', 
      startDate: '', 
      endDate: '', 
      current: false, 
      description: '<ul><li></li></ul>' 
    });
    setExpandedIndex(fields.length); // Open the new item
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">Work Experience</h3>
        </div>
        <button
          type="button"
          onClick={handleAppend}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Experience
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-8">No experience items added yet.</p>
      ) : (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isExpanded = expandedIndex === index;
                const companyName = watch(`workExperience.${index}.company`) || '';
                const positionTitle = watch(`workExperience.${index}.position`) || '';
                const titleText = positionTitle && companyName 
                  ? `${positionTitle} at ${companyName}`
                  : positionTitle || companyName || `Work Position #${index + 1}`;

                return (
                  <SortableItem key={field.id} id={field.id}>
                    <div 
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isExpanded 
                          ? 'bg-slate-950/70 border-indigo-500/50 shadow-lg' 
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/60 hover:border-slate-700/80'
                      }`}
                    >
                      {/* Item Header (Click to collapse/expand) */}
                      <div className="flex items-center justify-between px-5 py-4 cursor-pointer select-none pl-11">
                        <div 
                          className="flex-grow flex items-center justify-between"
                          onClick={() => setExpandedIndex(isExpanded ? null : index)}
                        >
                          <span className={`text-xs font-bold ${isExpanded ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {titleText}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-medium font-mono hidden sm:inline">
                              {watch(`workExperience.${index}.startDate`)} – {watch(`workExperience.${index}.current`) ? 'Present' : watch(`workExperience.${index}.endDate`)}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                            if (expandedIndex === index) setExpandedIndex(null);
                          }}
                          className="ml-4 text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Item Details */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-800/60 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                              <input
                                {...register(`workExperience.${index}.company`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="Google"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position Title</label>
                              <input
                                {...register(`workExperience.${index}.position`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="Software Engineer"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                              <input
                                {...register(`workExperience.${index}.location`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="Mountain View, CA"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                                <input
                                  {...register(`workExperience.${index}.startDate`)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                  placeholder="Jan 2024"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                                <input
                                  {...register(`workExperience.${index}.endDate`)}
                                  disabled={watch(`workExperience.${index}.current`)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600 disabled:opacity-40"
                                  placeholder="Present"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              id={`exp-current-${field.id}`}
                              {...register(`workExperience.${index}.current`)}
                              className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500/20"
                            />
                            <label htmlFor={`exp-current-${field.id}`} className="text-xxs text-slate-400 font-semibold select-none cursor-pointer">
                              I currently work here
                            </label>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description & Highlights</label>
                              <div className="flex gap-1.5">
                                <InlineAiButton fieldName={`workExperience.${index}.description`} currentValue={watch(`workExperience.${index}.description`) || ''} tone="improve" label="AI Improve" />
                                <InlineAiButton fieldName={`workExperience.${index}.description`} currentValue={watch(`workExperience.${index}.description`) || ''} tone="technical" label="AI Technical" />
                              </div>
                            </div>
                            <Controller
                              name={`workExperience.${index}.description`}
                              control={control}
                              render={({ field: { value, onChange, onBlur } }) => (
                                <RichTextEditor
                                  value={value || ''}
                                  onChange={onChange}
                                  onBlur={onBlur}
                                  placeholder="e.g., Led refactoring of core backend services reducing API response times by 30%..."
                                />
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}


/* ==========================================================================
   3. EDUCATION FORM
   ========================================================================== */
export function EducationForm() {
  const { control, register, watch, formState: { errors } } = useFormContext<ResumeValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'education',
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(fields.length > 0 ? 0 : null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
      
      if (expandedIndex === oldIndex) {
        setExpandedIndex(newIndex);
      } else if (expandedIndex !== null) {
        if (oldIndex < expandedIndex && newIndex >= expandedIndex) {
          setExpandedIndex(expandedIndex - 1);
        } else if (oldIndex > expandedIndex && newIndex <= expandedIndex) {
          setExpandedIndex(expandedIndex + 1);
        }
      }
    }
  };

  const handleAppend = () => {
    append({ id: Math.random().toString(), school: '', degree: '', fieldOfStudy: '', location: '', startDate: '', endDate: '', current: false, description: '' });
    setExpandedIndex(fields.length);
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">Education</h3>
        </div>
        <button
          type="button"
          onClick={handleAppend}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add School
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-8">No education items added yet.</p>
      ) : (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isExpanded = expandedIndex === index;
                const degree = watch(`education.${index}.degree`) || '';
                const school = watch(`education.${index}.school`) || '';
                const titleText = degree && school 
                  ? `${degree} from ${school}`
                  : degree || school || `School / Degree #${index + 1}`;

                return (
                  <SortableItem key={field.id} id={field.id}>
                    <div 
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isExpanded 
                          ? 'bg-slate-950/70 border-indigo-500/50 shadow-lg' 
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/60 hover:border-slate-700/80'
                      }`}
                    >
                      {/* Accordion Header */}
                      <div 
                        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none pl-11"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      >
                        <div className="flex-grow flex items-center justify-between">
                          <span className={`text-xs font-bold ${isExpanded ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {titleText}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-medium font-mono hidden sm:inline">
                              {watch(`education.${index}.startDate`)} – {watch(`education.${index}.endDate`)}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                            if (expandedIndex === index) setExpandedIndex(null);
                          }}
                          className="ml-4 text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Expanded Fields */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-800/60 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">School / University</label>
                              <input
                                {...register(`education.${index}.school`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="Stanford University"
                              />
                              {errors.education?.[index]?.school && (
                                <p className="text-red-400 text-xxs font-medium mt-1">{errors.education[index].school.message}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Degree / Certificate</label>
                              <input
                                {...register(`education.${index}.degree`)}
                                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="Bachelor of Science"
                              />
                              {errors.education?.[index]?.degree && (
                                <p className="text-red-400 text-xxs font-medium mt-1">{errors.education[index].degree.message}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Field of Study</label>
                              <input
                                {...register(`education.${index}.fieldOfStudy`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="Computer Science"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                                <input
                                  {...register(`education.${index}.startDate`)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                  placeholder="Sep 2020"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                                <input
                                  {...register(`education.${index}.endDate`)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                  placeholder="June 2024"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/* ==========================================================================
   4. PROJECTS FORM (DYNAMIC FIELD ARRAY WITH ACCORDION & DND)
   ========================================================================== */
export function ProjectsForm() {
  const { control, register, watch, formState: { errors } } = useFormContext<ResumeValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'projects',
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(fields.length > 0 ? 0 : null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
      
      if (expandedIndex === oldIndex) {
        setExpandedIndex(newIndex);
      } else if (expandedIndex !== null) {
        if (oldIndex < expandedIndex && newIndex >= expandedIndex) {
          setExpandedIndex(expandedIndex - 1);
        } else if (oldIndex > expandedIndex && newIndex <= expandedIndex) {
          setExpandedIndex(expandedIndex + 1);
        }
      }
    }
  };

  const handleAppend = () => {
    append({ 
      id: Math.random().toString(36).substr(2, 9), 
      projectName: '', 
      description: '', 
      technologies: '', 
      githubUrl: '', 
      liveUrl: '' 
    });
    setExpandedIndex(fields.length);
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">Projects</h3>
        </div>
        <button
          type="button"
          onClick={handleAppend}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Project
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-8">No projects items added yet.</p>
      ) : (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isExpanded = expandedIndex === index;
                const projectName = watch(`projects.${index}.projectName`) || '';
                const titleText = projectName || `Project Showcase #${index + 1}`;

                return (
                  <SortableItem key={field.id} id={field.id}>
                    <div 
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isExpanded 
                          ? 'bg-slate-950/70 border-indigo-500/50 shadow-lg' 
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/60 hover:border-slate-700/80'
                      }`}
                    >
                      {/* Accordion Header */}
                      <div className="flex items-center justify-between px-5 py-4 cursor-pointer select-none pl-11">
                        <div 
                          className="flex-grow flex items-center justify-between"
                          onClick={() => setExpandedIndex(isExpanded ? null : index)}
                        >
                          <span className={`text-xs font-bold ${isExpanded ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {titleText}
                          </span>
                          <div className="flex items-center gap-2">
                            {watch(`projects.${index}.technologies`) && (
                              <span className="text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                                {watch(`projects.${index}.technologies`)}
                              </span>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                            if (expandedIndex === index) setExpandedIndex(null);
                          }}
                          className="ml-4 text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Details Area */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-800/60 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Name</label>
                              <input
                                {...register(`projects.${index}.projectName`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="AI Resume Builder SaaS"
                              />
                              {errors.projects?.[index]?.projectName && (
                                <p className="text-red-400 text-xxs font-medium mt-1">{errors.projects[index].projectName.message}</p>
                              )}
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Technologies Used</label>
                              <input
                                {...register(`projects.${index}.technologies`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="Next.js, Tailwind CSS, Supabase"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">GitHub URL</label>
                              <input
                                {...register(`projects.${index}.githubUrl`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="https://github.com/..."
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Demo URL</label>
                              <input
                                {...register(`projects.${index}.liveUrl`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="https://projectdemo.com"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Description</label>
                              <div className="flex gap-1.5">
                                <InlineAiButton fieldName={`projects.${index}.description`} currentValue={watch(`projects.${index}.description`) || ''} tone="improve" label="AI Improve" />
                                <InlineAiButton fieldName={`projects.${index}.description`} currentValue={watch(`projects.${index}.description`) || ''} tone="technical" label="AI Technical" />
                              </div>
                            </div>
                            <Controller
                              name={`projects.${index}.description`}
                              control={control}
                              render={({ field: { value, onChange, onBlur } }) => (
                                <RichTextEditor
                                  value={value || ''}
                                  onChange={onChange}
                                  onBlur={onBlur}
                                  placeholder="Describe what you built, engineering complexity, metrics, and outcomes..."
                                />
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/* ==========================================================================
   5. SKILLS FORM
   ========================================================================== */
export function SkillsForm() {
  const { register, watch } = useFormContext<ResumeValues>();

  const techVal = (watch('skills.technicalSkills') || []).join(', ');
  const softVal = (watch('skills.softSkills') || []).join(', ');

  return (
    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Code className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-bold text-white tracking-tight">Skills</h3>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Technical Skills (Comma separated)
          </label>
          <input
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
            placeholder="TypeScript, React, Next.js, Node.js, Postgres, AWS"
            value={techVal}
            onChange={(e) => {
              const skills = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
              register('skills.technicalSkills').onChange({
                target: {
                  name: 'skills.technicalSkills',
                  value: skills
                }
              });
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Soft Skills (Comma separated)
          </label>
          <input
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
            placeholder="Leadership, Collaboration, Critical Thinking, Project Management"
            value={softVal}
            onChange={(e) => {
              const skills = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
              register('skills.softSkills').onChange({
                target: {
                  name: 'skills.softSkills',
                  value: skills
                }
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   6. CERTIFICATIONS FORM
   ========================================================================== */
export function CertificatesForm() {
  const { control, register, watch, formState: { errors } } = useFormContext<ResumeValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'certificates',
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(fields.length > 0 ? 0 : null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
      
      if (expandedIndex === oldIndex) {
        setExpandedIndex(newIndex);
      } else if (expandedIndex !== null) {
        if (oldIndex < expandedIndex && newIndex >= expandedIndex) {
          setExpandedIndex(expandedIndex - 1);
        } else if (oldIndex > expandedIndex && newIndex <= expandedIndex) {
          setExpandedIndex(expandedIndex + 1);
        }
      }
    }
  };

  const handleAppend = () => {
    append({ id: Math.random().toString(), name: '', issuer: '', date: '', url: '' });
    setExpandedIndex(fields.length);
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">Certifications</h3>
        </div>
        <button
          type="button"
          onClick={handleAppend}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Certification
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-8">No certifications added yet.</p>
      ) : (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isExpanded = expandedIndex === index;
                const certName = watch(`certificates.${index}.name`) || '';
                const titleText = certName || `Certification #${index + 1}`;

                return (
                  <SortableItem key={field.id} id={field.id}>
                    <div 
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isExpanded 
                          ? 'bg-slate-950/70 border-indigo-500/50 shadow-lg' 
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/60 hover:border-slate-700/80'
                      }`}
                    >
                      {/* Accordion Header */}
                      <div 
                        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none pl-11"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      >
                        <div className="flex-grow flex items-center justify-between">
                          <span className={`text-xs font-bold ${isExpanded ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {titleText}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-medium font-mono hidden sm:inline">
                              {watch(`certificates.${index}.date`)}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                            if (expandedIndex === index) setExpandedIndex(null);
                          }}
                          className="ml-4 text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Expanded fields */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-800/60 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Certification Name</label>
                              <input
                                {...register(`certificates.${index}.name`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="AWS Certified Solutions Architect"
                              />
                              {errors.certificates?.[index]?.name && (
                                <p className="text-red-400 text-xxs font-medium mt-1">{errors.certificates[index].name.message}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issuer Name</label>
                              <input
                                {...register(`certificates.${index}.issuer`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="Amazon Web Services"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</label>
                              <input
                                {...register(`certificates.${index}.date`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="June 2024"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification URL</label>
                              <input
                                {...register(`certificates.${index}.url`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="https://credly.com/..."
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/* ==========================================================================
   7. ACHIEVEMENTS FORM
   ========================================================================== */
export function AchievementsForm() {
  const { control, register, watch, formState: { errors } } = useFormContext<ResumeValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'achievements',
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(fields.length > 0 ? 0 : null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
      
      if (expandedIndex === oldIndex) {
        setExpandedIndex(newIndex);
      } else if (expandedIndex !== null) {
        if (oldIndex < expandedIndex && newIndex >= expandedIndex) {
          setExpandedIndex(expandedIndex - 1);
        } else if (oldIndex > expandedIndex && newIndex <= expandedIndex) {
          setExpandedIndex(expandedIndex + 1);
        }
      }
    }
  };

  const handleAppend = () => {
    append({ id: Math.random().toString(), title: '', date: '', description: '' });
    setExpandedIndex(fields.length);
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">Achievements</h3>
        </div>
        <button
          type="button"
          onClick={handleAppend}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Achievement
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-8">No achievements added yet.</p>
      ) : (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isExpanded = expandedIndex === index;
                const achTitle = watch(`achievements.${index}.title`) || '';
                const titleText = achTitle || `Achievement #${index + 1}`;

                return (
                  <SortableItem key={field.id} id={field.id}>
                    <div 
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isExpanded 
                          ? 'bg-slate-950/70 border-indigo-500/50 shadow-lg' 
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/60 hover:border-slate-700/80'
                      }`}
                    >
                      {/* Accordion Header */}
                      <div 
                        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none pl-11"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      >
                        <div className="flex-grow flex items-center justify-between">
                          <span className={`text-xs font-bold ${isExpanded ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {titleText}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-medium font-mono hidden sm:inline">
                              {watch(`achievements.${index}.date`)}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                            if (expandedIndex === index) setExpandedIndex(null);
                          }}
                          className="ml-4 text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Expanded Fields */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-800/60 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Achievement Title</label>
                              <input
                                {...register(`achievements.${index}.title`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="Won 1st Place at TechCrunch Hackathon"
                              />
                              {errors.achievements?.[index]?.title && (
                                <p className="text-red-400 text-xxs font-medium mt-1">{errors.achievements[index].title.message}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Achieved</label>
                              <input
                                {...register(`achievements.${index}.date`)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="March 2025"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                                <InlineAiButton fieldName={`achievements.${index}.description`} currentValue={watch(`achievements.${index}.description`) || ''} tone="improve" label="AI Improve" />
                              </div>
                              <textarea
                                {...register(`achievements.${index}.description`)}
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600 leading-relaxed"
                                placeholder="Briefly describe the achievement, award, or scope..."
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/* ==========================================================================
   8. CUSTOM SECTIONS FORM
   ========================================================================== */
interface CustomSectionFormProps {
  sectionId: string;
}

export function CustomSectionForm({ sectionId }: CustomSectionFormProps) {
  const { control, register, watch } = useFormContext<ResumeValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `customSections.${sectionId}.items` as any,
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(fields.length > 0 ? 0 : null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
      
      if (expandedIndex === oldIndex) {
        setExpandedIndex(newIndex);
      } else if (expandedIndex !== null) {
        if (oldIndex < expandedIndex && newIndex >= expandedIndex) {
          setExpandedIndex(expandedIndex - 1);
        } else if (oldIndex > expandedIndex && newIndex <= expandedIndex) {
          setExpandedIndex(expandedIndex + 1);
        }
      }
    }
  };

  const handleAppend = () => {
    append({ id: Math.random().toString(), title: '', subtitle: '', date: '', description: '' } as any);
    setExpandedIndex(fields.length);
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-grow">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <input
            {...register(`customSections.${sectionId}.title` as any)}
            className="bg-transparent text-lg font-bold text-white border-b border-transparent hover:border-slate-800 focus:border-indigo-500 focus:outline-none px-1 py-0.5 w-full max-w-[280px]"
            placeholder="Custom Section Title"
          />
        </div>
        <button
          type="button"
          onClick={handleAppend}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-8">No items added yet.</p>
      ) : (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isExpanded = expandedIndex === index;
                const itemTitle = watch(`customSections.${sectionId}.items.${index}.title` as any) || '';
                const titleText = itemTitle || `Item #${index + 1}`;

                return (
                  <SortableItem key={field.id} id={field.id}>
                    <div 
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isExpanded 
                          ? 'bg-slate-950/70 border-indigo-500/50 shadow-lg' 
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/60 hover:border-slate-700/80'
                      }`}
                    >
                      {/* Accordion Header */}
                      <div 
                        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none pl-11"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      >
                        <div className="flex-grow flex items-center justify-between">
                          <span className={`text-xs font-bold ${isExpanded ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {titleText}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-medium font-mono hidden sm:inline">
                              {watch(`customSections.${sectionId}.items.${index}.date` as any)}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                            if (expandedIndex === index) setExpandedIndex(null);
                          }}
                          className="ml-4 text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Expanded Fields */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-800/60 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Name / Title</label>
                              <input
                                {...register(`customSections.${sectionId}.items.${index}.title` as any)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="e.g. Spanish"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtitle / Details</label>
                              <input
                                {...register(`customSections.${sectionId}.items.${index}.subtitle` as any)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="e.g. Fluent"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date / Period</label>
                              <input
                                {...register(`customSections.${sectionId}.items.${index}.date` as any)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                                placeholder="e.g. 2024"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                                <InlineAiButton
                                  fieldName={`customSections.${sectionId}.items.${index}.description`}
                                  currentValue={watch(`customSections.${sectionId}.items.${index}.description` as any) || ''}
                                  tone="improve"
                                  label="AI Improve"
                                />
                              </div>
                              <textarea
                                {...register(`customSections.${sectionId}.items.${index}.description` as any)}
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600 leading-relaxed"
                                placeholder="Additional description info..."
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

