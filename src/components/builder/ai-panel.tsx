'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { ResumeValues } from '@/types/resume-schema';
import {
  Sparkles,
  Loader2,
  Check,
  Brain,
  AlertCircle,
  Copy,
  Plus,
  Send,
  MessageSquare,
  FileText,
  TrendingUp,
  X,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

type TabType = 'copilot' | 'ats' | 'coverletter' | 'chat' | 'interview' | 'repair';

interface Message {
  role: 'user' | 'model';
  parts: string;
}

// Helper to extract plain-text bullet points from HTML
const extractBullets = (htmlDescription: string): string[] => {
  if (!htmlDescription) return [];
  // Find all <li>...</li> occurrences
  const matches = htmlDescription.match(/<li[^>]*>([\s\S]*?)<\/li>/g);
  if (matches) {
    return matches.map(m => m.replace(/<[^>]*>/g, '').trim()).filter(Boolean);
  }
  // Fallback: strip tags and return as single item
  const clean = htmlDescription.replace(/<[^>]*>/g, '').trim();
  return clean ? [clean] : [];
};

export function AIPanel() {
  const { setValue, getValues, watch } = useFormContext<ResumeValues>();
  const toast = useToast();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('copilot');

  // Common watch values
  const resumeTitle = watch('personalInfo.title');

  // ==========================================================================
  // 1. STATE VARIABLES FOR FEATURES
  // ==========================================================================

  // Summary Generator
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Skills Suggestions
  const [isSkillsLoading, setIsSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [skillsSuggestions, setSkillsSuggestions] = useState<{ technical: string[]; soft: string[] } | null>(null);

  // STAR Bullet Optimizer
  const [bulletText, setBulletText] = useState('');
  const [optimizedBullets, setOptimizedBullets] = useState<string[]>([]);
  const [isBulletLoading, setIsBulletLoading] = useState(false);
  const [bulletError, setBulletError] = useState<string | null>(null);

  // ATS Matching & Tailoring
  const [jobDescription, setJobDescription] = useState('');
  const [atsResult, setAtsResult] = useState<{
    score: number;
    matchKeywords: string[];
    missingKeywords: string[];
    recommendations: string[];
  } | null>(null);
  const [isAtsLoading, setIsAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);

  const [tailorResult, setTailorResult] = useState<{
    suggestedTitle: string;
    suggestedSummary: string;
    tailoredBullets: Array<{ section: string; index: number; original: string; suggested: string }>;
  } | null>(null);

  // Metrics Quantification
  const [isQuantifyLoading, setIsQuantifyLoading] = useState(false);
  const [quantifyError, setQuantifyError] = useState<string | null>(null);
  const [quantifySuggestions, setQuantifySuggestions] = useState<Array<{
    original: string;
    suggestion: string;
    metrics: string[];
    expIndex: number;
    bulletIndex: number;
    companyName: string;
    positionTitle: string;
  }> | null>(null);

  // Cover Letter Generator
  const [coverLetterJobDescription, setCoverLetterJobDescription] = useState('');
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string>('');
  const [isCoverLetterLoading, setIsCoverLetterLoading] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);

  // Interview Prep
  const [interviewJobDescription, setInterviewJobDescription] = useState('');
  const [interviewQuestions, setInterviewQuestions] = useState<Array<{
    question: string;
    answer: string;
    type: 'behavioral' | 'technical' | 'situational';
  }> | null>(null);
  const [isInterviewLoading, setIsInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);

  // Compare section state
  const [compareSection, setCompareSection] = useState<'summary' | 'experience' | 'skills'>('summary');

  const hasImportMetadata = !!watch('importMetadata' as any);
  const importMetadata = watch('importMetadata' as any);

  // AI Quality Audit
  const [auditResult, setAuditResult] = useState<{
    grammarIssues: string[];
    weakBullets: string[];
    missingAchievements: string[];
    missingSkills: string[];
    atsIssues: string[];
  } | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Direct AI Rewrite / Repair Tool
  const [repairSection, setRepairSection] = useState<'summary' | 'experience' | 'project'>('summary');
  const [selectedExpIdx, setSelectedExpIdx] = useState<number>(0);
  const [selectedBulletIdx, setSelectedBulletIdx] = useState<number>(0);
  const [selectedProjIdx, setSelectedProjIdx] = useState<number>(0);
  const [repairTone, setRepairTone] = useState<'improve' | 'rewrite' | 'expand' | 'shorten' | 'professional' | 'executive' | 'technical'>('improve');
  const [repairOriginal, setRepairOriginal] = useState('');
  const [repairSuggestion, setRepairSuggestion] = useState('');
  const [isRepairLoading, setIsRepairLoading] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const workExperience = watch('workExperience') || [];
  const projects = watch('projects') || [];
  const summaryText = watch('personalInfo.summary') || '';

  // Synchronize repairOriginal content
  useEffect(() => {
    if (repairSection === 'summary') {
      setRepairOriginal(summaryText);
    } else if (repairSection === 'experience') {
      const exp = workExperience[selectedExpIdx];
      if (exp) {
        const bullets = extractBullets(exp.description || '');
        setRepairOriginal(bullets[selectedBulletIdx] || '');
      } else {
        setRepairOriginal('');
      }
    } else if (repairSection === 'project') {
      const proj = projects[selectedProjIdx];
      setRepairOriginal(proj?.description || '');
    }
  }, [repairSection, selectedExpIdx, selectedBulletIdx, selectedProjIdx, workExperience, projects, summaryText]);

  // AI Chat Assistant
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([
    {
      role: 'model',
      parts: 'Hello! I am your AI Resume Coach. I have analyzed your resume profile. Ask me anything, for example:\n- "How can I improve my technical skills description?"\n- "Rewrite my experience to sound more executive."\n- "What keywords should I add for an engineering role?"'
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);


  // ==========================================================================
  // 2. CORE ACTION HANDLERS (API INTEGRATION)
  // ==========================================================================

  // A. Generate Summary
  const handleGenerateSummary = async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    const loaderToastId = toast.loading('AI is crafting your summary...');

    try {
      const values = getValues();
      const experienceList = (values.workExperience || []).map(exp => ({
        company: exp.company,
        position: exp.position,
        description: exp.description
      }));
      const skillsList = [
        ...(values.skills?.technicalSkills || []),
        ...(values.skills?.softSkills || [])
      ];

      const response = await fetch('/api/ai?action=summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.personalInfo?.title || '',
          skills: skillsList,
          experience: experienceList
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setValue('personalInfo.summary', data.summary);
      toast.dismiss(loaderToastId);
      toast.success('Summary generated and autofilled!');
    } catch (err: any) {
      console.error(err);
      setSummaryError(err.message || 'Failed to generate summary.');
      toast.dismiss(loaderToastId);
      toast.error('AI Summary Generation failed.');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // B. Suggest Skills
  const handleSuggestSkills = async () => {
    setIsSkillsLoading(true);
    setSkillsError(null);
    const loaderToastId = toast.loading('Finding relevant skills suggestions...');

    try {
      const values = getValues();
      const experienceList = (values.workExperience || []).map(exp => ({
        company: exp.company,
        position: exp.position
      }));

      const response = await fetch('/api/ai?action=skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.personalInfo?.title || '',
          experience: experienceList
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setSkillsSuggestions(data);
      toast.dismiss(loaderToastId);
      toast.success('Suggested skills generated successfully!');
    } catch (err: any) {
      console.error(err);
      setSkillsError(err.message || 'Failed to suggest skills.');
      toast.dismiss(loaderToastId);
      toast.error('Skills suggestion failed.');
    } finally {
      setIsSkillsLoading(false);
    }
  };

  const addSkillToResume = (category: 'technical' | 'soft', skillName: string) => {
    const fieldName = category === 'technical' ? 'skills.technicalSkills' : 'skills.softSkills';
    const currentSkills = getValues(fieldName) || [];
    if (currentSkills.includes(skillName)) {
      toast.info(`'${skillName}' is already added.`);
      return;
    }
    setValue(fieldName, [...currentSkills, skillName]);
    toast.success(`Added '${skillName}' to your skills!`);
  };

  // C. Optimize Bullet
  const handleOptimizeBullet = async () => {
    if (!bulletText.trim()) return;
    setIsBulletLoading(true);
    setBulletError(null);
    setOptimizedBullets([]);
    const loaderToastId = toast.loading('Optimizing bullet point structure...');

    try {
      const values = getValues();
      const recentJob = values.workExperience?.[0];

      const response = await fetch('/api/ai?action=optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: bulletText,
          position: recentJob?.position || 'Software Engineer',
          company: recentJob?.company || 'Company'
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setOptimizedBullets(data.options || []);
      toast.dismiss(loaderToastId);
      toast.success('Generated 3 STAR bullet suggestions!');
    } catch (err: any) {
      console.error(err);
      setBulletError(err.message || 'Failed to optimize bullet point.');
      toast.dismiss(loaderToastId);
      toast.error('Optimization failed.');
    } finally {
      setIsBulletLoading(false);
    }
  };

  // D. ATS Analysis & Tailoring
  const handleAtsAndTailor = async () => {
    if (!jobDescription.trim()) return;
    setIsAtsLoading(true);
    setAtsError(null);
    setAtsResult(null);
    setTailorResult(null);

    const loaderToastId = toast.loading('Running ATS audit and tailoring recommendations...');

    try {
      const resumeData = getValues();

      // Parallel requests for faster responses
      const [atsResponse, tailorResponse] = await Promise.all([
        fetch('/api/ai?action=ats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeData, jobDescription })
        }),
        fetch('/api/ai?action=tailor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeData, jobDescription })
        })
      ]);

      const atsData = await atsResponse.json();
      const tailorData = await tailorResponse.json();

      if (atsData.error) throw new Error(atsData.error);
      if (tailorData.error) throw new Error(tailorData.error);

      setAtsResult(atsData);
      setTailorResult(tailorData);
      toast.dismiss(loaderToastId);
      toast.success(`Analysis finished! Match Score: ${atsData.score}%`);
    } catch (err: any) {
      console.error(err);
      setAtsError(err.message || 'Failed to analyze matching score.');
      toast.dismiss(loaderToastId);
      toast.error('ATS Analysis & Tailoring failed.');
    } finally {
      setIsAtsLoading(false);
    }
  };

  const applyTailoredField = (fieldName: 'personalInfo.title' | 'personalInfo.summary', value: string) => {
    setValue(fieldName, value);
    toast.success(`Applied tailored ${fieldName.split('.')[1]}!`);
  };

  const applyTailoredBullet = (index: number, suggestedText: string) => {
    // RichTextEditor expects html like <ul><li>...</li></ul>, let's format it
    const formattedHtml = `<ul><li>${suggestedText}</li></ul>`;
    setValue(`workExperience.${index}.description`, formattedHtml);
    toast.success(`Applied optimized experience bullet at item #${index + 1}!`);
  };

  // E. Cover Letter Generator
  const handleGenerateCoverLetter = async () => {
    if (!coverLetterJobDescription.trim()) return;
    setIsCoverLetterLoading(true);
    setCoverLetterError(null);
    setGeneratedCoverLetter('');
    const loaderToastId = toast.loading('Drafting tailored cover letter...');

    try {
      const resumeData = getValues();

      const response = await fetch('/api/ai?action=cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData,
          jobDescription: coverLetterJobDescription
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGeneratedCoverLetter(data.coverLetter);
      toast.dismiss(loaderToastId);
      toast.success('Cover letter generated!');
    } catch (err: any) {
      console.error(err);
      setCoverLetterError(err.message || 'Failed to generate cover letter.');
      toast.dismiss(loaderToastId);
      toast.error('Cover letter drafting failed.');
    } finally {
      setIsCoverLetterLoading(false);
    }
  };

  // Helper extractBullets moved to top level

  const handleQuantify = async () => {
    setIsQuantifyLoading(true);
    setQuantifyError(null);
    setQuantifySuggestions(null);
    const loaderToastId = toast.loading('Analyzing achievements for quantification suggestions...');

    try {
      const values = getValues();
      const experiences = values.workExperience || [];
      const flatBullets: string[] = [];
      const mapping: Array<{ expIndex: number; bulletIndex: number }> = [];

      experiences.forEach((exp, expIdx) => {
        const bullets = extractBullets(exp.description || '');
        bullets.forEach((bullet, bulletIdx) => {
          flatBullets.push(bullet);
          mapping.push({ expIndex: expIdx, bulletIndex: bulletIdx });
        });
      });

      if (flatBullets.length === 0) {
        setQuantifySuggestions([]);
        toast.dismiss(loaderToastId);
        toast.info('No experience bullet points found to analyze.');
        return;
      }

      const response = await fetch('/api/ai?action=quantify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bullets: flatBullets })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const suggestionsWithMeta = (data.suggestions || []).map((s: any, idx: number) => {
        const mapItem = mapping[idx];
        return {
          ...s,
          expIndex: mapItem?.expIndex ?? -1,
          bulletIndex: mapItem?.bulletIndex ?? -1,
          companyName: mapItem ? (experiences[mapItem.expIndex]?.company || 'Experience') : 'Experience',
          positionTitle: mapItem ? (experiences[mapItem.expIndex]?.position || 'Role') : 'Role'
        };
      }).filter((s: any) => s.expIndex !== -1);

      setQuantifySuggestions(suggestionsWithMeta);
      toast.dismiss(loaderToastId);
      toast.success('Generated metric suggestions successfully!');
    } catch (err: any) {
      console.error(err);
      setQuantifyError(err.message || 'Failed to suggest metrics.');
      toast.dismiss(loaderToastId);
      toast.error('Metrics analysis failed.');
    } finally {
      setIsQuantifyLoading(false);
    }
  };

  const applyQuantifiedBullet = (expIndex: number, bulletIndex: number, suggestedText: string) => {
    const values = getValues();
    const exp = values.workExperience?.[expIndex];
    if (!exp) return;

    const rawDescription = exp.description || '';
    const bullets = extractBullets(rawDescription);

    if (bullets.length === 0) {
      const formattedHtml = `<ul><li>${suggestedText}</li></ul>`;
      setValue(`workExperience.${expIndex}.description`, formattedHtml, { shouldDirty: true, shouldTouch: true });
    } else {
      bullets[bulletIndex] = suggestedText;
      const formattedHtml = `<ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
      setValue(`workExperience.${expIndex}.description`, formattedHtml, { shouldDirty: true, shouldTouch: true });
    }

    toast.success(`Applied metric suggestion to item #${expIndex + 1}!`);
  };

  // F. Chat Assistant
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', parts: userMsg }]);
    setIsChatLoading(true);

    try {
      const resumeData = getValues();
      // Filter out system message role contexts, just pass dialogue history
      const dialogueHistory = chatHistory.slice(1);

      const response = await fetch('/api/ai?action=chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: dialogueHistory,
          resumeData
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setChatHistory(prev => [...prev, { role: 'model', parts: data.response }]);
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'model', parts: 'Error: Failed to fetch response from AI Coach. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // G. Interview Prep
  const handleGenerateInterviewPrep = async () => {
    if (!interviewJobDescription.trim()) return;
    setIsInterviewLoading(true);
    setInterviewError(null);
    setInterviewQuestions(null);
    setExpandedQuestionIdx(null);
    const loaderToastId = toast.loading('Preparing practice interview questions...');

    try {
      const resumeData = getValues();

      const response = await fetch('/api/ai?action=interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData,
          jobDescription: interviewJobDescription
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setInterviewQuestions(data.questions || []);
      toast.dismiss(loaderToastId);
      toast.success('Generated 5 mock interview questions!');
    } catch (err: any) {
      console.error(err);
      setInterviewError(err.message || 'Failed to generate interview questions.');
      toast.dismiss(loaderToastId);
      toast.error('Interview Prep generation failed.');
    } finally {
      setIsInterviewLoading(false);
    }
  };

  // Run AI Resume Audit Check
  const handleRunAudit = async () => {
    setIsAuditLoading(true);
    setAuditError(null);
    setAuditResult(null);
    const loaderToastId = toast.loading('Running AI quality audit on your resume...');

    try {
      const resumeData = getValues();
      const response = await fetch('/api/ai?action=audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setAuditResult(data);
      toast.dismiss(loaderToastId);
      toast.success('Resume quality audit complete!');
    } catch (err: any) {
      console.error(err);
      setAuditError(err.message || 'Failed to perform quality audit.');
      toast.dismiss(loaderToastId);
      toast.error('Quality audit failed.');
    } finally {
      setIsAuditLoading(false);
    }
  };

  // Run AI Direct Repair
  const handleGenerateRepair = async () => {
    if (!repairOriginal.trim()) {
      toast.error('Select a section with content to repair.');
      return;
    }
    setIsRepairLoading(true);
    setRepairError(null);
    setRepairSuggestion('');
    const loaderToastId = toast.loading('Generating AI suggestion...');

    try {
      const response = await fetch('/api/ai?action=rewrite-in-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: repairOriginal,
          tone: repairTone
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setRepairSuggestion(data.text || '');
      toast.dismiss(loaderToastId);
      toast.success('AI suggestion generated! You can edit it below.');
    } catch (err: any) {
      console.error(err);
      setRepairError(err.message || 'Failed to generate repair suggestion.');
      toast.dismiss(loaderToastId);
      toast.error('AI suggestion generation failed.');
    } finally {
      setIsRepairLoading(false);
    }
  };

  // Apply repair suggestion to resume
  const handleAcceptRepair = () => {
    if (!repairSuggestion.trim()) return;

    if (repairSection === 'summary') {
      setValue('personalInfo.summary', repairSuggestion, { shouldDirty: true, shouldTouch: true });
      toast.success('Professional Summary updated!');
    } else if (repairSection === 'experience') {
      const exp = workExperience[selectedExpIdx];
      if (exp) {
        const bullets = extractBullets(exp.description || '');
        if (bullets.length === 0) {
          const formattedHtml = `<ul><li>${repairSuggestion}</li></ul>`;
          setValue(`workExperience.${selectedExpIdx}.description`, formattedHtml, { shouldDirty: true, shouldTouch: true });
        } else {
          bullets[selectedBulletIdx] = repairSuggestion;
          const formattedHtml = `<ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
          setValue(`workExperience.${selectedExpIdx}.description`, formattedHtml, { shouldDirty: true, shouldTouch: true });
        }
        toast.success(`Experience bullet point updated!`);
      }
    } else if (repairSection === 'project') {
      setValue(`projects.${selectedProjIdx}.description`, repairSuggestion, { shouldDirty: true, shouldTouch: true });
      toast.success(`Project description updated!`);
    }

    setRepairSuggestion('');
  };

  // Discard repair suggestion
  const handleRejectRepair = () => {
    setRepairSuggestion('');
    toast.info('Suggestion discarded.');
  };

  const tabsList = [
    { id: 'copilot', label: 'Co-Pilot', icon: <Sparkles className="w-3 h-3" /> },
    { id: 'ats', label: 'ATS & Tailor', icon: <TrendingUp className="w-3 h-3" /> },
    { id: 'coverletter', label: 'Cover Letter', icon: <FileText className="w-3 h-3" /> },
    { id: 'interview', label: 'Interview Prep', icon: <HelpCircle className="w-3 h-3" /> },
    { id: 'chat', label: 'AI Coach', icon: <MessageSquare className="w-3 h-3" /> },
    { id: 'repair', label: 'Resume Repair', icon: <ShieldAlert className="w-3 h-3" /> }
  ] as const;

  // ==========================================================================
  // 3. UI RENDER MARKUP
  // ==========================================================================
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-slate-900 pb-3 shrink-0">
        <Brain className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-bold text-white tracking-tight">AI Co-Pilot Suite</h3>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-900 pb-px gap-1.5 shrink-0 text-xxs font-bold uppercase tracking-wider select-none overflow-x-auto scrollbar-none">
        {tabsList.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-1 px-3 py-2 rounded-t-xl transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels Contents */}
      <div className="flex-grow overflow-y-auto pr-1">
        
        {/* ====================================================================
           TAB: CO-PILOT (Summary, Skills, Bullet Optimizer)
           ==================================================================== */}
        {activeTab === 'copilot' && (
          <div className="space-y-6 animate-fade-in duration-200">
            {/* Summary Draft Generator */}
            <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Summary Generator
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                Analyzes your current job title, skills, and experiences to draft an ATS-compliant professional profile statement.
              </p>
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={isSummaryLoading}
                className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {isSummaryLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Draft & Autofill Summary
              </button>
              {summaryError && (
                <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {summaryError}</p>
              )}
            </div>

            {/* Skills Suggestion Generator */}
            <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-indigo-400" />
                Skills Suggestions
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                Recommends relevant keywords based on your target job title to help pass ATS parser screenings.
              </p>
              
              {!skillsSuggestions ? (
                <button
                  type="button"
                  onClick={handleSuggestSkills}
                  disabled={isSkillsLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-300 bg-slate-900/60 border border-slate-800 hover:bg-slate-800 rounded-xl disabled:opacity-50 transition-all cursor-pointer animate-fade-in"
                >
                  {isSkillsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Generate Suggested Skills
                </button>
              ) : (
                <div className="space-y-3.5 pt-1 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase font-black tracking-widest text-indigo-400">Click to add skills:</span>
                    <button
                      type="button"
                      onClick={() => setSkillsSuggestions(null)}
                      className="text-slate-500 hover:text-white transition-colors"
                      title="Clear Suggestions"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {skillsSuggestions.technical.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Technical Skills</h5>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {skillsSuggestions.technical.map((sk, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addSkillToResume('technical', sk)}
                            className="group flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-850 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors"
                          >
                            {sk}
                            <Plus className="w-2.5 h-2.5 text-slate-500 group-hover:text-indigo-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {skillsSuggestions.soft.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Soft Skills</h5>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {skillsSuggestions.soft.map((sk, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addSkillToResume('soft', sk)}
                            className="group flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-850 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors"
                          >
                            {sk}
                            <Plus className="w-2.5 h-2.5 text-slate-500 group-hover:text-indigo-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {skillsError && (
                <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {skillsError}</p>
              )}
            </div>

            {/* Bullet Point Optimizer */}
            <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                STAR Bullet Optimizer
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                Transforms generic experience bullet points into action-oriented statements following the STAR methodology.
              </p>
              <div className="space-y-2">
                <textarea
                  value={bulletText}
                  onChange={(e) => setBulletText(e.target.value)}
                  rows={2.5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                  placeholder="e.g., I worked on backend bugs and fixed page speed details."
                />
                <button
                  type="button"
                  onClick={handleOptimizeBullet}
                  disabled={isBulletLoading || !bulletText.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl disabled:opacity-40 transition-colors border border-slate-700/50 cursor-pointer"
                >
                  {isBulletLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Optimize Statement
                </button>
              </div>

              {bulletError && (
                <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {bulletError}</p>
              )}

              {optimizedBullets.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 animate-fade-in">
                  <h5 className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-400">STAR Improvements:</h5>
                  <div className="space-y-2 text-[10px]">
                    {optimizedBullets.map((bullet, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl hover:border-indigo-500/50 transition-colors flex justify-between gap-2.5">
                        <span className="text-slate-300 leading-relaxed">{bullet}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(bullet);
                            toast.success('Copied suggestion to clipboard!');
                          }}
                          title="Copy to clipboard"
                          className="text-slate-500 hover:text-white transition-colors self-start p-1 bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Optimization / Quantification suggestions */}
            <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Metrics Optimization
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                Analyzes your experience descriptions and suggests metric-focused improvements (e.g. percentages, scale, dollar amounts).
              </p>
              
              {!quantifySuggestions ? (
                <button
                  type="button"
                  onClick={handleQuantify}
                  disabled={isQuantifyLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-300 bg-slate-900/60 border border-slate-800 hover:bg-slate-800 rounded-xl disabled:opacity-50 transition-all cursor-pointer animate-fade-in"
                >
                  {isQuantifyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />}
                  Analyze Achievements for Metrics
                </button>
              ) : (
                <div className="space-y-3.5 pt-1 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase font-black tracking-widest text-indigo-400">Quantification suggestions:</span>
                    <button
                      type="button"
                      onClick={() => setQuantifySuggestions(null)}
                      className="text-slate-500 hover:text-white transition-colors"
                      title="Clear Suggestions"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {quantifySuggestions.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic font-light">No achievements found to analyze. Add bullet points under Work Experience first.</p>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {quantifySuggestions.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2 text-[10px] hover:border-indigo-500/30 transition-colors">
                          <div className="flex justify-between items-start gap-2 border-b border-slate-900 pb-1.5">
                            <div>
                              <span className="text-[8px] font-black text-slate-500 uppercase">
                                {item.companyName} — {item.positionTitle}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => applyQuantifiedBullet(item.expIndex, item.bulletIndex, item.suggestion)}
                              className="text-[8px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded transition-all cursor-pointer select-none shrink-0"
                            >
                              Apply Suggestion
                            </button>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-slate-505 italic"><span className="font-semibold text-slate-600">Original:</span> &quot;{item.original}&quot;</p>
                            <p className="text-slate-300 font-light"><span className="font-semibold text-indigo-400">Suggestion:</span> &quot;{item.suggestion}&quot;</p>
                          </div>

                          {item.metrics && item.metrics.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-900/60">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Suggested Metrics:</span>
                              <ul className="list-disc pl-3 text-[9px] text-slate-400 space-y-0.5 mt-1 font-light">
                                {item.metrics.map((m, mIdx) => (
                                  <li key={mIdx}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {quantifyError && (
                <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {quantifyError}</p>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
           TAB: ATS & TAILOR
           ==================================================================== */}
        {activeTab === 'ats' && (
          <div className="space-y-6 animate-fade-in duration-200">
            {/* Input job description */}
            <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                ATS Parser Scoring
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                Analyze your resume criteria against target job listings to identify keyword gaps and score compatibility.
              </p>
              <div className="space-y-2">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={3.5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                  placeholder="Paste target Job Description details here..."
                />
                <button
                  type="button"
                  onClick={handleAtsAndTailor}
                  disabled={isAtsLoading || !jobDescription.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-40 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {isAtsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  Analyze & Suggest Edits
                </button>
              </div>
              {atsError && (
                <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {atsError}</p>
              )}
            </div>

            {/* ATS Score card results */}
            {atsResult && (
              <div className="space-y-4 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl animate-fade-in">
                <div className="flex items-center gap-4 border-b border-slate-800 pb-3.5">
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-slate-950 border-2 border-indigo-500 shadow-md">
                    <span className="text-sm font-bold text-white">{atsResult.score}%</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">ATS Match Index</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-light">
                      {atsResult.score >= 80 ? 'Excellent candidate indexing!' : 'Target key missing topics below.'}
                    </p>
                  </div>
                </div>

                {/* Match Keywords list */}
                {atsResult.matchKeywords.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-[9px] uppercase font-black tracking-widest text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" /> Matched Keywords:
                    </h5>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {atsResult.matchKeywords.map((word, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Keywords list */}
                {atsResult.missingKeywords.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-[9px] uppercase font-black tracking-widest text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-400" /> Missing Core Keywords:
                    </h5>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {atsResult.missingKeywords.map((word, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => addSkillToResume('technical', word)}
                          className="group flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/20 transition-all font-semibold cursor-pointer"
                          title={`Add '${word}' to technical skills`}
                        >
                          {word}
                          <Plus className="w-2.5 h-2.5 text-rose-500/70 group-hover:text-rose-400 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations tips list */}
                {atsResult.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-[9px] uppercase font-black tracking-widest text-indigo-400">Optimization Suggestions:</h5>
                    <ul className="list-disc pl-4 text-[9px] text-slate-300 leading-relaxed space-y-1 font-light">
                      {atsResult.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Resume Tailor recommendations */}
            {tailorResult && (
              <div className="space-y-4 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl animate-fade-in">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-3">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Suggested Tailoring
                </h4>

                {/* Suggested Title */}
                {tailorResult.suggestedTitle && tailorResult.suggestedTitle !== resumeTitle && (
                  <div className="space-y-1.5 p-3 bg-slate-950 border border-slate-850 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-indigo-400">Target Role Title:</span>
                      <button
                        type="button"
                        onClick={() => applyTailoredField('personalInfo.title', tailorResult.suggestedTitle)}
                        className="text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded transition-all cursor-pointer"
                      >
                        Apply Title
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 font-bold mt-1">{tailorResult.suggestedTitle}</p>
                  </div>
                )}

                {/* Suggested Summary */}
                {tailorResult.suggestedSummary && (
                  <div className="space-y-1.5 p-3 bg-slate-950 border border-slate-850 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-indigo-400">Tailored Summary Statement:</span>
                      <button
                        type="button"
                        onClick={() => applyTailoredField('personalInfo.summary', tailorResult.suggestedSummary)}
                        className="text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded transition-all cursor-pointer"
                      >
                        Apply Summary
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed font-light mt-1 whitespace-pre-line">{tailorResult.suggestedSummary}</p>
                  </div>
                )}

                {/* Tailored experience bullets */}
                {tailorResult.tailoredBullets && tailorResult.tailoredBullets.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Experience Bullet Alignments:</h5>
                    <div className="space-y-2">
                      {tailorResult.tailoredBullets.map((bullet, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-500 uppercase">Item #{bullet.index + 1} Bullet Edit:</span>
                            <button
                              type="button"
                              onClick={() => applyTailoredBullet(bullet.index, bullet.suggested)}
                              className="text-[8px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 rounded transition-all cursor-pointer"
                            >
                              Overwrite Bullet
                            </button>
                          </div>
                          <div className="text-[9px] space-y-1">
                            <div className="text-slate-500 italic flex items-center gap-1">Original: <span className="line-through">{bullet.original}</span></div>
                            <div className="text-emerald-400 flex items-center gap-1">Suggested: <span>{bullet.suggested}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
           TAB: COVER LETTER
           ==================================================================== */}
        {activeTab === 'coverletter' && (
          <div className="space-y-6 animate-fade-in duration-200">
            <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                Cover Letter Generator
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                Generates a structured, matching cover letter based on your current resume data and target job details.
              </p>
              <div className="space-y-2">
                <textarea
                  value={coverLetterJobDescription}
                  onChange={(e) => setCoverLetterJobDescription(e.target.value)}
                  rows={3.5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                  placeholder="Paste target Job Description details here..."
                />
                <button
                  type="button"
                  onClick={handleGenerateCoverLetter}
                  disabled={isCoverLetterLoading || !coverLetterJobDescription.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-40 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {isCoverLetterLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate Cover Letter
                </button>
              </div>
              {coverLetterError && (
                <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {coverLetterError}</p>
              )}
            </div>

            {generatedCoverLetter && (
              <div className="space-y-3.5 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase font-black tracking-widest text-indigo-400">Drafted Letter:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCoverLetter);
                      toast.success('Copied cover letter to clipboard!');
                    }}
                    className="flex items-center gap-1 text-[9px] font-bold text-slate-300 hover:text-white bg-slate-950 border border-slate-850 px-3 py-1 rounded transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Letter
                  </button>
                </div>
                <textarea
                  value={generatedCoverLetter}
                  onChange={(e) => setGeneratedCoverLetter(e.target.value)}
                  rows={12}
                  className="w-full bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 text-[10px] text-slate-200 focus:outline-none leading-relaxed whitespace-pre-wrap resize-y font-light"
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
           TAB: REPAIR & COMPARE
           ==================================================================== */}
        {/* ====================================================================
           TAB: RESUME REPAIR
           ==================================================================== */}
        {activeTab === 'repair' && (
          <div className="space-y-6 animate-fade-in duration-200">
            
            {/* AI Resume Repair Suite: Direct Rewrite & Repair Tool */}
            <div className="space-y-4 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                AI Direct Repair Tool
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                Select any content block or bullet point from your resume, choose an AI action or tone, and rewrite it instantly.
              </p>

              <div className="space-y-3">
                {/* Select Section */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Section to Repair</label>
                  <select
                    value={repairSection}
                    onChange={(e) => {
                      setRepairSection(e.target.value as any);
                      setSelectedExpIdx(0);
                      setSelectedBulletIdx(0);
                      setSelectedProjIdx(0);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="summary">Professional Summary</option>
                    <option value="experience">Experience Bullet Point</option>
                    <option value="project">Project Description</option>
                  </select>
                </div>

                {/* Conditional dropdowns based on selected section */}
                {repairSection === 'experience' && workExperience.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Experience Item</label>
                      <select
                        value={selectedExpIdx}
                        onChange={(e) => {
                          setSelectedExpIdx(parseInt(e.target.value));
                          setSelectedBulletIdx(0);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {workExperience.map((exp, idx) => (
                          <option key={idx} value={idx}>
                            {exp.company || `Experience #${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Bullet Point</label>
                      <select
                        value={selectedBulletIdx}
                        onChange={(e) => setSelectedBulletIdx(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {extractBullets(workExperience[selectedExpIdx]?.description || '').map((bullet, idx) => (
                          <option key={idx} value={idx}>
                            Bullet #{idx + 1}: {bullet.substring(0, 25)}...
                          </option>
                        ))}
                        {extractBullets(workExperience[selectedExpIdx]?.description || '').length === 0 && (
                          <option value={0}>No bullets found</option>
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {repairSection === 'experience' && workExperience.length === 0 && (
                  <p className="text-[10px] text-rose-400 italic">Please add a Work Experience item first.</p>
                )}

                {repairSection === 'project' && projects.length > 0 && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Project Item</label>
                    <select
                      value={selectedProjIdx}
                      onChange={(e) => setSelectedProjIdx(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {projects.map((proj, idx) => (
                        <option key={idx} value={idx}>
                          {proj.projectName || `Project #${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {repairSection === 'project' && projects.length === 0 && (
                  <p className="text-[10px] text-rose-400 italic">Please add a Project item first.</p>
                )}

                {/* Tone / Action dropdown */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">AI Strategy / Tone</label>
                  <select
                    value={repairTone}
                    onChange={(e) => setRepairTone(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="improve">Improve with AI</option>
                    <option value="rewrite">Rewrite with AI</option>
                    <option value="expand">Expand content</option>
                    <option value="shorten">Shorten content</option>
                    <option value="professional">Professional tone</option>
                    <option value="executive">Executive tone</option>
                    <option value="technical">Technical tone</option>
                  </select>
                </div>

                {/* Original Text display */}
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-[8px] font-black text-slate-500 uppercase">Original Content:</span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-light italic whitespace-pre-wrap">
                    {repairOriginal ? `"${repairOriginal}"` : '(No content found in this section)'}
                  </p>
                </div>

                {/* Action trigger button */}
                <button
                  type="button"
                  onClick={handleGenerateRepair}
                  disabled={isRepairLoading || !repairOriginal.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-40 transition-all cursor-pointer shadow-md"
                >
                  {isRepairLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Run AI Repair
                </button>
              </div>

              {repairError && (
                <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1 mt-2">
                  <AlertCircle className="w-3.5 h-3.5" /> {repairError}
                </p>
              )}

              {/* Editable suggestion text area and Accept/Reject buttons */}
              {repairSuggestion !== '' && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 animate-fade-in">
                  <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 block">AI Suggestion (Editable)</label>
                  <textarea
                    value={repairSuggestion}
                    onChange={(e) => setRepairSuggestion(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-light resize-y"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptRepair}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept & Apply
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectRepair}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer border border-slate-700/50"
                    >
                      <X className="w-3.5 h-3.5" /> Reject Suggestion
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Resume Quality Audit Section */}
            <div className="space-y-4 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                AI Quality Audit
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                Analyze your current resume sections for formatting issues, grammatical mistakes, ATS keyword gaps, and missing achievements.
              </p>
              
              {!auditResult ? (
                <button
                  type="button"
                  onClick={handleRunAudit}
                  disabled={isAuditLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-300 bg-slate-900/60 border border-slate-800 hover:bg-slate-800 rounded-xl disabled:opacity-50 transition-all cursor-pointer animate-fade-in"
                >
                  {isAuditLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Run Quality Audit
                </button>
              ) : (
                <div className="space-y-3.5 pt-1 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-[9px] uppercase font-black tracking-widest text-indigo-400">Audit Results:</span>
                    <button
                      type="button"
                      onClick={() => setAuditResult(null)}
                      className="text-slate-500 hover:text-white transition-colors"
                      title="Clear Audit"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Grammar Issues Card */}
                  <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Grammar & Spelling Issues
                    </span>
                    {auditResult.grammarIssues.length > 0 ? (
                      <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-1 font-light">
                        {auditResult.grammarIssues.map((issue, idx) => (
                          <li key={idx} className="leading-relaxed">{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[9px] text-emerald-400 italic font-light pl-1">No visible grammar/spelling errors detected.</p>
                    )}
                  </div>

                  {/* Weak Bullet Points Card */}
                  <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Weak Bullet Points
                    </span>
                    {auditResult.weakBullets.length > 0 ? (
                      <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-1 font-light">
                        {auditResult.weakBullets.map((issue, idx) => (
                          <li key={idx} className="leading-relaxed">{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[9px] text-emerald-400 italic font-light pl-1">All bullets look strong and action-oriented.</p>
                    )}
                  </div>

                  {/* Missing Achievements Card */}
                  <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                    <span className="text-[8px] font-black text-sky-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Missing Achievements / Metrics
                    </span>
                    {auditResult.missingAchievements.length > 0 ? (
                      <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-1 font-light">
                        {auditResult.missingAchievements.map((issue, idx) => (
                          <li key={idx} className="leading-relaxed">{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[9px] text-emerald-400 italic font-light pl-1">Achievements are well-quantified.</p>
                    )}
                  </div>

                  {/* Missing Skills Card */}
                  <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1">
                      <Brain className="w-3 h-3" /> Suggested / Missing Skills
                    </span>
                    {auditResult.missingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {auditResult.missingSkills.map((sk, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addSkillToResume('technical', sk)}
                            className="group flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-850 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors"
                          >
                            {sk}
                            <Plus className="w-2.5 h-2.5 text-slate-500 group-hover:text-indigo-400" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-emerald-400 italic font-light pl-1">Your skills section covers the targets nicely.</p>
                    )}
                  </div>

                  {/* ATS Issues Card */}
                  <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                    <span className="text-[8px] font-black text-rose-400/90 uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> ATS Checklist Issues
                    </span>
                    {auditResult.atsIssues.length > 0 ? (
                      <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-1 font-light">
                        {auditResult.atsIssues.map((issue, idx) => (
                          <li key={idx} className="leading-relaxed">{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[9px] text-emerald-400 italic font-light pl-1">No ATS structure issues detected.</p>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* PRESERVED: Original Import Metadata Quality Audit & Repair Checklist */}
            {hasImportMetadata && importMetadata && (
              <>
                {/* ATS Score & KPI Highlights */}
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl flex items-center gap-4">
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-slate-950 border-2 border-indigo-500 shadow-md">
                    <span className="text-sm font-bold text-white">{importMetadata.recommendations?.atsScore || 70}%</span>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-200">AI Estimated ATS Rating (Imported Copy)</h4>
                    <p className="text-[9px] text-slate-500 leading-relaxed font-light">
                      Calculated based on extracted resume parameters, core keyword alignment, and parsed section densities from the imported resume.
                    </p>
                  </div>
                </div>

                {/* AI Recommendations */}
                <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Import Recommendations
                  </h4>
                  
                  {importMetadata.recommendations?.missingKeywords?.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Missing Keywords</h5>
                      <div className="flex flex-wrap gap-1.5 pt-0.5 animate-fade-in">
                        {importMetadata.recommendations.missingKeywords.map((kw: string, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const currentSkills = getValues('skills.technicalSkills') || [];
                              if (!currentSkills.includes(kw)) {
                                setValue('skills.technicalSkills', [...currentSkills, kw]);
                                toast.success(`Added '${kw}' to skills!`);
                              } else {
                                toast.info(`'${kw}' already added.`);
                              }
                            }}
                            className="group flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/20 transition-all font-semibold cursor-pointer animate-fade-in"
                          >
                            {kw}
                            <Plus className="w-2.5 h-2.5 text-indigo-500 group-hover:text-indigo-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {importMetadata.recommendations?.skillGaps?.length > 0 && (
                    <div className="space-y-1 pt-1.5 animate-fade-in">
                      <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Detected Skill Gaps</h5>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {importMetadata.recommendations.skillGaps.map((gap: string, i: number) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold">
                            {gap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {importMetadata.recommendations?.industryRecommendations?.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-900/60">
                      <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Industry Advice</h5>
                      <ul className="list-disc pl-4 text-[9px] text-slate-300 leading-relaxed space-y-1 font-light">
                        {importMetadata.recommendations.industryRecommendations.map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Quality Audit & Repair Checklist */}
                <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Import Quality Repair Report
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                    Checklist of formatting anomalies, spelling/grammar slips, or content structure flaws detected in your uploaded copy.
                  </p>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {importMetadata.audit?.formattingIssues?.length > 0 && (
                      <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider">Formatting Issues</span>
                        <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-0.5 font-light">
                          {importMetadata.audit.formattingIssues.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {importMetadata.audit?.missingInfo?.length > 0 && (
                      <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider">Missing Information</span>
                        <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-0.5 font-light">
                          {importMetadata.audit.missingInfo.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {importMetadata.audit?.weakBullets?.length > 0 && (
                      <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider">Weak Bullet Points</span>
                        <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-0.5 font-light">
                          {importMetadata.audit.weakBullets.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {importMetadata.audit?.grammarIssues?.length > 0 && (
                      <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider">Grammar & Spelling</span>
                        <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-0.5 font-light">
                          {importMetadata.audit.grammarIssues.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {importMetadata.audit?.repetitiveContent?.length > 0 && (
                      <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider">Repetitive Wording</span>
                        <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-0.5 font-light">
                          {importMetadata.audit.repetitiveContent.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Version Comparison View */}
                <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Version Comparison
                    </h4>
                    <select
                      value={compareSection}
                      onChange={(e) => setCompareSection(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                    >
                      <option value="summary">Summary</option>
                      <option value="experience">Experience</option>
                      <option value="skills">Skills</option>
                    </select>
                  </div>

                  {/* Compare Summary */}
                  {compareSection === 'summary' && (
                    <div className="space-y-2.5 animate-fade-in">
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                        <span className="text-[8px] font-black text-rose-400/80 uppercase">Original Summary:</span>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-light italic">
                          &quot;{importMetadata.originalData?.personalInfo?.summary || 'No summary listed'}&quot;
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                        <span className="text-[8px] font-black text-emerald-400 uppercase">Current Summary:</span>
                        <p className="text-[10px] text-slate-200 leading-relaxed font-light">
                          &quot;{watch('personalInfo.summary') || 'No summary listed'}&quot;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Compare Experience */}
                  {compareSection === 'experience' && (
                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 animate-fade-in">
                      {(importMetadata.originalData?.workExperience || []).map((origExp: any, idx: number) => {
                        const currentExp = watch(`workExperience.${idx}` as any) as any;
                        const cleanOrigDesc = (origExp.description || '').replace(/<[^>]*>/g, '').trim();
                        const cleanCurrDesc = (currentExp?.description || '').replace(/<[^>]*>/g, '').trim();
                        const isModified = cleanOrigDesc !== cleanCurrDesc;

                        return (
                          <div key={idx} className="space-y-2 border-b border-slate-900 pb-3 last:border-b-0">
                            <div className="flex justify-between items-center text-[9px] font-extrabold tracking-wide uppercase">
                              <span className="text-slate-400">{origExp.company} — {origExp.position}</span>
                              {isModified ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Modified</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 text-slate-500">Same</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl">
                                <span className="text-[8px] font-bold text-slate-500">Original:</span>
                                <div className="text-[9px] text-slate-500 leading-relaxed font-light mt-1 whitespace-pre-wrap italic">
                                  {cleanOrigDesc}
                                </div>
                              </div>
                              <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl">
                                <span className="text-[8px] font-bold text-slate-300">Current:</span>
                                <div className="text-[9px] text-slate-300 leading-relaxed font-light mt-1 whitespace-pre-wrap">
                                  {cleanCurrDesc}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Compare Skills */}
                  {compareSection === 'skills' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                        <span className="text-[8px] font-black text-rose-400/80 uppercase">Original Skills:</span>
                        <div className="text-[9px] text-slate-500 font-light flex flex-wrap gap-1">
                          {[(importMetadata.originalData?.skills?.technicalSkills || []), (importMetadata.originalData?.skills?.softSkills || [])].flat().map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded-full">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                        <span className="text-[8px] font-black text-emerald-400 uppercase">Current Skills:</span>
                        <div className="text-[9px] text-slate-300 font-light flex flex-wrap gap-1">
                          {[(watch('skills.technicalSkills') || []), (watch('skills.softSkills') || [])].flat().map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded-full">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        )}

        {/* ====================================================================
           TAB: INTERVIEW PREPARATION
           ==================================================================== */}
        {activeTab === 'interview' && (
          <div className="space-y-6 animate-fade-in duration-200">
            <div className="space-y-3 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                AI Interview Prep
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                Generates tailored mock interview questions and structured model answers based on your resume and target job.
              </p>
              <div className="space-y-2">
                <textarea
                  value={interviewJobDescription}
                  onChange={(e) => setInterviewJobDescription(e.target.value)}
                  rows={3.5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                  placeholder="Paste target Job Description details here to get tailored questions..."
                />
                <button
                  type="button"
                  onClick={handleGenerateInterviewPrep}
                  disabled={isInterviewLoading || !interviewJobDescription.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-40 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {isInterviewLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Brain className="w-3.5 h-3.5" />
                  )}
                  Generate Interview Questions
                </button>
              </div>
              {interviewError && (
                <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {interviewError}
                </p>
              )}
            </div>

            {interviewQuestions && (
              <div className="space-y-3.5 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl animate-fade-in">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                  <span className="text-[9px] uppercase font-black tracking-widest text-indigo-400">Practice Q&A Cards:</span>
                  <button
                    type="button"
                    onClick={() => setInterviewQuestions(null)}
                    className="text-slate-500 hover:text-white transition-colors"
                    title="Clear Questions"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {interviewQuestions.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic font-light">
                    No questions generated. Please try again.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {interviewQuestions.map((q, idx) => {
                      const isExpanded = expandedQuestionIdx === idx;
                      const badgeColor =
                        q.type === 'technical'
                          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                          : q.type === 'situational'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-sky-500/10 border-sky-500/20 text-sky-400';
                      
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2 hover:border-indigo-500/30 transition-all"
                        >
                          <div className="flex flex-col gap-1">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border w-fit ${badgeColor}`}>
                              {q.type}
                            </span>
                            <p className="text-xs font-bold text-white mt-1 leading-relaxed">
                              Q{idx + 1}: {q.question}
                            </p>
                          </div>
                          
                          <div className="pt-2 border-t border-slate-900 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                              className="w-full flex items-center justify-between text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors select-none cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Talking Points' : 'Show Talking Points'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </button>
                            
                            {isExpanded && (
                              <div className="p-3 bg-slate-900/40 border border-slate-900/60 rounded-lg text-[10px] text-slate-300 leading-relaxed font-light whitespace-pre-wrap animate-fade-in">
                                <strong className="text-indigo-300 font-bold block mb-1">Model Answer / Tip:</strong>
                                {q.answer}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
           TAB: AI CHAT COACH (Interactive chat log interface)
           ==================================================================== */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[480px] border border-slate-900 bg-slate-950/40 rounded-2xl overflow-hidden animate-fade-in duration-200">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-900 bg-slate-900/20 flex items-center justify-between shrink-0 select-none">
              <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">AI Career Coach Chat</span>
              <button
                type="button"
                onClick={() => setChatHistory([
                  {
                    role: 'model',
                    parts: 'Hello! I am your AI Resume Coach. I have analyzed your resume profile. Ask me anything, for example:\n- "How can I improve my technical skills description?"\n- "Rewrite my experience to sound more executive."\n- "What keywords should I add for an engineering role?"'
                  }
                ])}
                className="text-[8px] font-extrabold text-slate-500 hover:text-white px-2 py-0.5 border border-slate-850 rounded bg-slate-950/50 cursor-pointer"
              >
                Reset Chat
              </button>
            </div>

            {/* Chat Messages Logs Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 text-[10px] scrollbar-thin">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                        : 'bg-slate-900/80 border border-slate-850 text-slate-300 font-light rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    {msg.parts}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-slate-900/80 border border-slate-850 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-slate-400 flex items-center gap-1.5 font-light">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    AI Coach is typing...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Footer Input Box */}
            <div className="p-3 border-t border-slate-900 bg-slate-900/20 shrink-0 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendChatMessage();
                }}
                disabled={isChatLoading}
                placeholder="Ask the AI Coach..."
                className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleSendChatMessage}
                disabled={isChatLoading || !chatInput.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
