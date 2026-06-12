'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { ResumeValues } from '@/types/resume-schema';
import type { AdvancedTailorResult, TailorChangeItem, TailorOptions } from '@/lib/gemini';
import {
  Sparkles,
  Loader2,
  Upload,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Edit2,
  LayoutTemplate,
  Zap,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Plus,
  Save,
  Columns,
  ArrowRight,
  Target,
  Briefcase,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface TailorPanelProps {
  onSaveTailoredVersion?: (tailoredData: Partial<ResumeValues>, label: string) => void;
}

const INDUSTRIES = [
  { value: 'saas', label: 'Technology / SaaS' },
  { value: 'fintech', label: 'Fintech / Finance' },
  { value: 'healthcare', label: 'Healthcare / MedTech' },
  { value: 'ecommerce', label: 'E-Commerce / Retail' },
  { value: 'consulting', label: 'Consulting / Advisory' },
  { value: 'education', label: 'Education / EdTech' },
  { value: 'marketing', label: 'Marketing / AdTech' },
  { value: 'general', label: 'General / Other' },
];

const SENIORITY_LEVELS = [
  { value: 'junior', label: 'Junior', desc: '0–2 yrs' },
  { value: 'mid', label: 'Mid-Level', desc: '3–5 yrs' },
  { value: 'senior', label: 'Senior', desc: '6–9 yrs' },
  { value: 'executive', label: 'Executive', desc: '10+ yrs' },
] as const;

const TONES = [
  { value: 'professional', label: 'Professional', color: 'text-slate-300' },
  { value: 'executive', label: 'Executive', color: 'text-amber-400' },
  { value: 'technical', label: 'Technical', color: 'text-cyan-400' },
  { value: 'creative', label: 'Creative', color: 'text-purple-400' },
] as const;

function diffWords(original: string, suggested: string) {
  const origWords = original.split(' ');
  const suggWords = suggested.split(' ');
  const origSet = new Set(origWords.map(w => w.toLowerCase().replace(/[^a-z]/g, '')));
  return suggWords.map(word => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    return { word, isNew: clean.length > 3 && !origSet.has(clean) };
  });
}

interface ChangeCardProps {
  item: TailorChangeItem;
  index: number;
  showDiff: boolean;
  onAccept: (idx: number, text: string) => void;
  onReject: (idx: number) => void;
  onApply: (field: string, text: string) => void;
}

function ChangeCard({ item, index, showDiff, onAccept, onReject, onApply }: ChangeCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.suggested);
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);

  const changeTypeColor =
    item.changeType === 'rewrite' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
    item.changeType === 'enhance' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
    'bg-amber-500/10 border-amber-500/20 text-amber-400';

  const handleAccept = () => {
    setAccepted(true);
    const finalText = editing ? editText : item.suggested;
    onAccept(index, finalText);
    onApply(item.field, finalText);
  };

  const handleReject = () => {
    setRejected(true);
    onReject(index);
  };

  if (rejected) return null;

  return (
    <div className={`rounded-xl border transition-all duration-300 ${accepted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/40'} overflow-hidden`}>
      {/* Card Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className={`text-[8px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded border ${changeTypeColor}`}>
            {item.changeType}
          </span>
          <span className="text-[10px] font-bold text-slate-200">{item.label}</span>
        </div>
        {accepted ? (
          <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Applied
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(e => !e)}
              className="text-[8px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5"
            >
              <Edit2 className="w-2.5 h-2.5" /> Edit
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="text-[8px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-1.5 py-0.5 rounded transition-all cursor-pointer"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="text-[8px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5"
            >
              <Check className="w-2.5 h-2.5" /> Accept
            </button>
          </div>
        )}
      </div>

      {/* Diff / Content */}
      <div className="p-3 space-y-2">
        {showDiff && !accepted && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[8px] uppercase font-black tracking-widest text-slate-500">Original</span>
              <p className="text-[9px] text-slate-400 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-800/40 line-clamp-4">
                {item.original || <em className="text-slate-600">Empty</em>}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] uppercase font-black tracking-widest text-indigo-400">Suggested</span>
              <p className="text-[9px] leading-relaxed bg-indigo-950/20 p-2 rounded-lg border border-indigo-500/15 line-clamp-4">
                {diffWords(item.original, item.suggested).map((t, i) => (
                  <span key={i} className={t.isNew ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                    {t.word}{' '}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}

        {!showDiff && !accepted && (
          <p className="text-[9px] text-slate-300 leading-relaxed">
            {diffWords(item.original, item.suggested).map((t, i) => (
              <span key={i} className={t.isNew ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {t.word}{' '}
              </span>
            ))}
          </p>
        )}

        {editing && !accepted && (
          <div className="space-y-1.5">
            <span className="text-[8px] uppercase font-black tracking-widest text-amber-400">Edit Suggestion</span>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={3}
              className="w-full bg-slate-900 border border-amber-500/30 rounded-lg p-2 text-[10px] text-white focus:ring-1 focus:ring-amber-500/50 focus:outline-none leading-relaxed resize-none"
            />
          </div>
        )}

        {accepted && (
          <p className="text-[9px] text-emerald-400 leading-relaxed font-light">
            ✓ This change has been applied to your resume.
          </p>
        )}
      </div>
    </div>
  );
}

export function TailorPanel({ onSaveTailoredVersion }: TailorPanelProps) {
  const { setValue, getValues, watch } = useFormContext<ResumeValues>();
  const toast = useToast();

  // --- Input State ---
  const [jdInputMode, setJdInputMode] = useState<'paste' | 'upload'>('paste');
  const [jobDescription, setJobDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Options State ---
  const [showOptions, setShowOptions] = useState(true);
  const [industry, setIndustry] = useState('saas');
  const [seniority, setSeniority] = useState<TailorOptions['seniority']>('senior');
  const [tone, setTone] = useState<TailorOptions['tone']>('professional');

  // Skills for prioritization
  const technicalSkills = watch('skills.technicalSkills') || [];
  const softSkills = watch('skills.softSkills') || [];
  const allSkills = [...technicalSkills, ...softSkills];
  const [prioritizeSkills, setPrioritizeSkills] = useState<string[]>([]);

  // --- Auto-extracted keywords (live) ---
  const [liveKeywords, setLiveKeywords] = useState<string[]>([]);
  useEffect(() => {
    if (!jobDescription.trim()) { setLiveKeywords([]); return; }
    const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','had','will','would','could','should','this','that','we','you','they','their','not','also','if','so','than','just','about','up','all','more']);
    const freq: Record<string, number> = {};
    const words = jobDescription.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && !stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
    }
    const kws = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,15).map(([k]) => k.charAt(0).toUpperCase()+k.slice(1));
    setLiveKeywords(kws);
  }, [jobDescription]);

  // --- Results State ---
  const [isLoading, setIsLoading] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [result, setResult] = useState<AdvancedTailorResult | null>(null);
  const [showDiff, setShowDiff] = useState(true);
  const [acceptedChanges, setAcceptedChanges] = useState<Set<number>>(new Set());
  const [rejectedChanges, setRejectedChanges] = useState<Set<number>>(new Set());
  const [versionName, setVersionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- File Upload ---
  const handleFileRead = useCallback((file: File) => {
    setUploadedFileName(file.name);
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = e => setJobDescription((e.target?.result as string) || '');
      reader.readAsText(file);
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Use pdfjs-dist for PDF extraction
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
          GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          const buffer = e.target?.result as ArrayBuffer;
          const pdf = await getDocument({ data: buffer }).promise;
          let text = '';
          for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(' ') + '\n';
          }
          setJobDescription(text.trim());
          toast.success(`Extracted text from ${file.name}`);
        } catch {
          toast.error('Could not parse PDF. Try copying & pasting the text.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Only .txt and .pdf files are supported. Please paste the job description text instead.');
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }, [handleFileRead]);

  // --- Run Tailoring ---
  const handleTailor = async () => {
    if (!jobDescription.trim()) return;
    setIsLoading(true);
    setTailorError(null);
    setResult(null);
    setAcceptedChanges(new Set());
    setRejectedChanges(new Set());

    const loaderToast = toast.loading('Running advanced AI tailoring...');
    try {
      const resumeData = getValues();
      const res = await fetch('/api/ai?action=tailor-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData, jobDescription, industry, seniority, tone, prioritizeSkills }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as AdvancedTailorResult);
      if (!versionName && data.suggestedTitle) {
        setVersionName(`${data.suggestedTitle} — Tailored`);
      }
      toast.dismiss(loaderToast);
      toast.success('Resume tailored successfully!');
    } catch (err: any) {
      setTailorError(err.message || 'Tailoring failed.');
      toast.dismiss(loaderToast);
      toast.error('Advanced tailoring failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Apply Individual Field ---
  const applyField = (field: string, text: string) => {
    if (field === 'personalInfo.title') {
      setValue('personalInfo.title', text, { shouldDirty: true });
    } else if (field === 'personalInfo.summary') {
      setValue('personalInfo.summary', text, { shouldDirty: true });
    } else {
      const match = field.match(/^workExperience\.(\d+)\.description$/);
      if (match) {
        const idx = parseInt(match[1]);
        setValue(`workExperience.${idx}.description`, `<ul><li>${text}</li></ul>`, { shouldDirty: true });
      }
    }
  };

  // --- Accept All ---
  const handleAcceptAll = () => {
    if (!result) return;
    result.changeLog.forEach((item, idx) => {
      if (!rejectedChanges.has(idx)) {
        applyField(item.field, item.suggested);
      }
    });
    setAcceptedChanges(new Set(result.changeLog.map((_, i) => i)));
    // Add suggested skills
    if (result.suggestedSkills.toAdd.length > 0) {
      const current = getValues('skills.technicalSkills') || [];
      const merged = Array.from(new Set([...current, ...result.suggestedSkills.toAdd]));
      setValue('skills.technicalSkills', merged, { shouldDirty: true });
    }
    toast.success('All changes applied!');
  };

  // --- Save Tailored Version ---
  const handleSaveVersion = async () => {
    if (!result) return;
    setIsSaving(true);
    const currentData = getValues();
    // Apply accepted + all non-rejected changes to a snapshot
    const snapshot = JSON.parse(JSON.stringify(currentData)) as ResumeValues;
    result.changeLog.forEach((item, idx) => {
      if (!rejectedChanges.has(idx)) {
        if (item.field === 'personalInfo.title') snapshot.personalInfo.title = item.suggested;
        else if (item.field === 'personalInfo.summary') snapshot.personalInfo.summary = item.suggested;
        else {
          const match = item.field.match(/^workExperience\.(\d+)\.description$/);
          if (match) {
            const i = parseInt(match[1]);
            if (snapshot.workExperience[i]) snapshot.workExperience[i].description = `<ul><li>${item.suggested}</li></ul>`;
          }
        }
      }
    });
    onSaveTailoredVersion?.(snapshot, versionName || 'Tailored Version');
    setIsSaving(false);
  };

  const toggleSkillPriority = (skill: string) => {
    setPrioritizeSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="space-y-1 p-4 bg-gradient-to-br from-indigo-950/30 to-slate-900/20 border border-slate-900 rounded-2xl">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-white">Resume Tailor Suite</h4>
        </div>
        <p className="text-[10px] text-slate-400 font-light leading-relaxed">
          Paste or upload a job description to instantly tailor your resume with AI-powered keyword alignment, industry customization, and seniority-based tone.
        </p>
      </div>

      {/* ── Job Description Input ───────────────────────────── */}
      <div className="space-y-2 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
        <div className="flex items-center gap-1 border-b border-slate-800 pb-2.5">
          <button
            type="button"
            onClick={() => setJdInputMode('paste')}
            className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all cursor-pointer ${jdInputMode === 'paste' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <FileText className="w-3 h-3 inline mr-1" />Paste Text
          </button>
          <button
            type="button"
            onClick={() => setJdInputMode('upload')}
            className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all cursor-pointer ${jdInputMode === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Upload className="w-3 h-3 inline mr-1" />Upload File
          </button>
        </div>

        {jdInputMode === 'paste' ? (
          <textarea
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed resize-none"
            placeholder="Paste the full job description here..."
          />
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-950/30'}`}
          >
            <Upload className={`w-6 h-6 ${isDragging ? 'text-indigo-400' : 'text-slate-500'}`} />
            {uploadedFileName ? (
              <div className="text-center">
                <p className="text-[10px] font-bold text-emerald-400">{uploadedFileName}</p>
                <p className="text-[9px] text-slate-500">Click to replace</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-300">Drop .pdf or .txt file</p>
                <p className="text-[9px] text-slate-500">or click to browse</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f); }}
            />
          </div>
        )}

        {/* Live keyword chips */}
        {liveKeywords.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[8px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" /> Auto-detected keywords
            </p>
            <div className="flex flex-wrap gap-1">
              {liveKeywords.map((kw, i) => (
                <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Options Panel ───────────────────────────────────── */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOptions(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/40 hover:bg-slate-900/60 transition-colors cursor-pointer"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
            <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" /> Tailoring Options
          </span>
          {showOptions ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        {showOptions && (
          <div className="p-4 space-y-4 bg-slate-950/20">
            {/* Industry */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Industry
              </label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[10px] text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                {INDUSTRIES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Seniority */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Seniority Level</label>
              <div className="grid grid-cols-4 gap-1">
                {SENIORITY_LEVELS.map(lvl => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setSeniority(lvl.value)}
                    className={`flex flex-col items-center py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${seniority === lvl.value ? 'border-indigo-500 bg-indigo-600/20 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}
                  >
                    <span className="text-[8px] font-black">{lvl.label}</span>
                    <span className="text-[7px] opacity-60 mt-0.5">{lvl.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Writing Tone</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={`py-1.5 px-2 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${tone === t.value ? 'border-indigo-500 bg-indigo-600/20 text-white' : `border-slate-700 ${t.color} hover:border-slate-600`}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skill Prioritization */}
            {allSkills.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Prioritize Skills
                  <span className="text-[7px] font-normal normal-case text-slate-500 ml-1">(tap to emphasize)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {allSkills.slice(0, 16).map((skill, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleSkillPriority(skill)}
                      className={`text-[8px] px-2 py-0.5 rounded-full border transition-all cursor-pointer font-semibold ${prioritizeSkills.includes(skill) ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}
                    >
                      {prioritizeSkills.includes(skill) && <Check className="w-2 h-2 inline mr-0.5" />}
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── One-click Tailor Button ─────────────────────────── */}
      <button
        type="button"
        id="tailor-run-button"
        onClick={handleTailor}
        disabled={isLoading || !jobDescription.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl disabled:opacity-40 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        {isLoading ? 'Tailoring Resume...' : 'One-Click Tailor'}
      </button>

      {tailorError && (
        <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {tailorError}
        </p>
      )}

      {/* ── Results ────────────────────────────────────────── */}
      {result && (
        <div className="space-y-4 animate-fade-in">

          {/* Industry Insights Banner */}
          <div className="p-3.5 bg-gradient-to-br from-violet-950/30 to-indigo-950/20 border border-violet-800/30 rounded-xl">
            <p className="text-[9px] uppercase font-black tracking-widest text-violet-400 mb-1">
              {INDUSTRIES.find(i => i.value === industry)?.label} Insight
            </p>
            <p className="text-[10px] text-slate-300 leading-relaxed font-light">{result.industryInsights}</p>
          </div>

          {/* Keyword Match Summary */}
          <div className="p-3.5 bg-slate-950/20 border border-slate-900 rounded-xl space-y-2">
            <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-indigo-400" /> Keyword Extraction
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.extractedKeywords.map((kw, i) => {
                const resumeText = JSON.stringify(getValues()).toLowerCase();
                const isPresent = resumeText.includes(kw.toLowerCase());
                return (
                  <span key={i} className={`text-[8px] px-2 py-0.5 rounded-full border font-semibold ${isPresent ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/5 text-rose-400'}`}>
                    {isPresent ? <Check className="w-2 h-2 inline mr-0.5" /> : <X className="w-2 h-2 inline mr-0.5" />}
                    {kw}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Skills Suggestions */}
          {(result.suggestedSkills.toAdd.length > 0 || result.suggestedSkills.toPrioritize.length > 0) && (
            <div className="p-3.5 bg-slate-950/20 border border-slate-900 rounded-xl space-y-3">
              <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Skill Recommendations</p>
              {result.suggestedSkills.toAdd.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                    <Plus className="w-2.5 h-2.5" /> Add to Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suggestedSkills.toAdd.map((skill, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const current = getValues('skills.technicalSkills') || [];
                          if (!current.includes(skill)) {
                            setValue('skills.technicalSkills', [...current, skill], { shouldDirty: true });
                            toast.success(`Added '${skill}' to skills!`);
                          }
                        }}
                        className="group text-[8px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 font-semibold cursor-pointer flex items-center gap-0.5 transition-all"
                      >
                        {skill} <Plus className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {result.suggestedSkills.toPrioritize.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                    <ArrowRight className="w-2.5 h-2.5" /> Prioritize (list first)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suggestedSkills.toPrioritize.map((skill, i) => (
                      <span key={i} className="text-[8px] px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 font-semibold">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Change Cards Header */}
          <div className="flex items-center justify-between">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {result.changeLog.length} Suggested Changes
            </h5>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDiff(d => !d)}
                className="flex items-center gap-1 text-[8px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Toggle side-by-side diff view"
              >
                <Columns className="w-3 h-3" />
                {showDiff ? 'Diff On' : 'Diff Off'}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                disabled={acceptedChanges.size === result.changeLog.length}
                className="text-[8px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-2.5 h-2.5" /> Accept All
              </button>
            </div>
          </div>

          {/* Individual Change Cards */}
          <div className="space-y-2">
            {result.changeLog.map((item, idx) => (
              <ChangeCard
                key={`${item.field}-${idx}`}
                item={item}
                index={idx}
                showDiff={showDiff}
                onAccept={(i) => setAcceptedChanges(prev => new Set([...prev, i]))}
                onReject={(i) => setRejectedChanges(prev => new Set([...prev, i]))}
                onApply={applyField}
              />
            ))}
          </div>

          {/* Save Tailored Version */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-950/20 to-slate-900/20 border border-emerald-800/30 rounded-xl space-y-2.5">
            <p className="text-[9px] uppercase font-black tracking-widest text-emerald-400 flex items-center gap-1.5">
              <Save className="w-3 h-3" /> Save Tailored Version
            </p>
            <input
              type="text"
              value={versionName}
              onChange={e => setVersionName(e.target.value)}
              placeholder="e.g. Senior Engineer @ Stripe — June 2025"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[10px] text-white placeholder-slate-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveVersion}
              disabled={isSaving || !onSaveTailoredVersion}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save as New Resume Version
            </button>
            {!onSaveTailoredVersion && (
              <p className="text-[8px] text-slate-500 italic">Version saving is available when you're signed in.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
