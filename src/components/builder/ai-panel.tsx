'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { ResumeValues } from '@/types/resume-schema';
import { useParams } from 'next/navigation';
import { createCoverLetter } from '@/app/dashboard/cover-letter-actions';
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
  ShieldAlert,
  Target,
  Download,
  Save
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { TailorPanel } from '@/components/builder/tailor-panel';

type TabType = 'copilot' | 'ats' | 'tailor' | 'coverletter' | 'chat' | 'interview' | 'repair';

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

interface AIPanelProps {
  onSaveTailoredVersion?: (tailoredData: Partial<ResumeValues>, label: string) => void;
}

export function AIPanel({ onSaveTailoredVersion }: AIPanelProps = {}) {
  const { setValue, getValues, watch } = useFormContext<ResumeValues>();
  const toast = useToast();
  const params = useParams();
  const resumeId = params?.resumeId as string;
  
  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  const starterPrompts = [
    { label: '🔍 Critique My Resume', text: 'Critique my resume structure and metrics, and suggest improvements.' },
    { label: '👔 Get Career Advice', text: 'Analyze my experience and skills to suggest high-impact career advice.' },
    { label: '🤝 Interview Prep Questions', text: 'Generate 5 mock interview questions tailored to my resume.' },
    { label: '💡 Project Suggestions', text: 'Suggest 3 side projects I can build to strengthen my engineering stack.' },
    { label: '✏️ Optimize Summary', text: 'Rewrite my Professional Summary to highlight my technical experience.' },
    { label: '📈 Analyze ATS Score', text: 'Help me review potential keyword omissions and ATS formatting blocks.' }
  ];

  const getSmartRecommendations = () => {
    const recs = [];
    const fullName = watch('personalInfo.fullName');
    const summary = watch('personalInfo.summary');
    const experience = watch('workExperience') || [];
    const skills = watch('skills') || { technicalSkills: [], softSkills: [] };
    const linkedin = watch('personalInfo.linkedin');
    
    if (!fullName || fullName === 'John Doe') {
      recs.push({
        title: 'Update Full Name',
        prompt: 'Help me draft a resume heading with my contact info.',
        desc: 'Set your name and professional identity.'
      });
    }
    if (!summary) {
      recs.push({
        title: 'Draft Professional Summary',
        prompt: 'Rewrite my Professional Summary to be professional and impact-driven.',
        desc: 'Add a summary statement at the top of your resume.'
      });
    }
    if (experience.length === 0) {
      recs.push({
        title: 'Add Work Experience',
        prompt: 'What are standard work experience points I can add for a software engineer?',
        desc: 'No employment items have been listed yet.'
      });
    } else {
      const hasMetrics = experience.some(exp => /\d+%|\d+\s*years|\$\d+/i.test(exp.description || ''));
      if (!hasMetrics) {
        recs.push({
          title: 'Quantify Achievements',
          prompt: 'Critique my experience bullet points and suggest specific metrics to add.',
          desc: 'Add metrics (e.g. 30% speedup) to experience points.'
        });
      }
    }
    if ((skills.technicalSkills?.length || 0) === 0) {
      recs.push({
        title: 'Populate Skills List',
        prompt: 'Suggest technical skills for my resume based on my profile.',
        desc: 'Ensure skills section contains keywords for ATS parsing.'
      });
    }
    if (!linkedin) {
      recs.push({
        title: 'Add LinkedIn Profile',
        prompt: 'Why should I include LinkedIn on my resume and how do I format it?',
        desc: 'Link contact details to increase callback visibility.'
      });
    }
    
    return recs;
  };

  const recommendations = getSmartRecommendations();

  // Helper to parse message content for Apply Cards and Follow-Ups
  interface ApplyCard {
    fieldPath: string;
    suggestedText: string;
  }

  const parseMessageContent = (content: string) => {
    let cleanText = content || '';
    const applyCards: ApplyCard[] = [];
    let followUps: string[] = [];

    // 1. Parse follow-ups: <follow_ups>["Q1", "Q2"]</follow_ups>
    const followUpRegex = /<follow_ups>([\s\S]*?)<\/follow_ups>/i;
    const followUpMatch = cleanText.match(followUpRegex);
    if (followUpMatch) {
      try {
        followUps = JSON.parse(followUpMatch[1].trim());
      } catch (e) {
        console.error('Error parsing follow-ups JSON:', e);
      }
      cleanText = cleanText.replace(followUpRegex, '');
    }

    // 2. Parse [APPLY:path]...[/APPLY]
    const applyRegex = /\[APPLY:([\w.]+)\]([\s\S]*?)\[\/APPLY\]/gi;
    let match;
    const tempText = cleanText;
    while ((match = applyRegex.exec(tempText)) !== null) {
      applyCards.push({
        fieldPath: match[1],
        suggestedText: match[2]
      });
    }
    
    cleanText = cleanText.replace(/\[APPLY:[\w.]+\]([\s\S]*?)\[\/APPLY\]/gi, '$1');

    return {
      cleanText: cleanText.trim(),
      applyCards,
      followUps
    };
  };

  const getFieldLabel = (path: string): string => {
    if (path === 'personalInfo.summary') return 'Professional Summary';
    if (path === 'personalInfo.title') return 'Professional Title';
    if (path === 'personalInfo.fullName') return 'Full Name';
    if (path === 'personalInfo.email') return 'Email Address';
    
    const experienceMatch = path.match(/^workExperience\.(\d+)\.description$/);
    if (experienceMatch) {
      return `Experience #${parseInt(experienceMatch[1]) + 1} Bullets`;
    }
    
    const projectMatch = path.match(/^projects\.(\d+)\.description$/);
    if (projectMatch) {
      return `Project #${parseInt(projectMatch[1]) + 1} Desc`;
    }
    
    return path;
  };

  const renderFormattedMessage = (text: string) => {
    if (!text) return null;
    return text.split('\n\n').map((para, i) => {
      if (para.trim().startsWith('* ') || para.trim().startsWith('- ')) {
        const items = para.split(/\n[*-]\s+/).map(x => x.replace(/^[*-]\s+/, '').trim()).filter(Boolean);
        return (
          <ul key={i} className="list-disc pl-4 space-y-1 my-1.5">
            {items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        );
      }
      if (/^\d+\.\s+/.test(para.trim())) {
        const items = para.split(/\n\d+\.\s+/).map(x => x.replace(/^\d+\.\s+/, '').trim()).filter(Boolean);
        return (
          <ol key={i} className="list-decimal pl-4 space-y-1 my-1.5">
            {items.map((item, j) => <li key={j}>{item}</li>)}
          </ol>
        );
      }
      if (para.trim().startsWith('#')) {
        const level = para.match(/^#+/)?.[0].length || 1;
        const cleanHeader = para.replace(/^#+\s+/, '').trim();
        const sizeClass = level === 1 ? 'text-sm font-black' : level === 2 ? 'text-xs font-black' : 'text-xxs font-bold';
        return <div key={i} className={`${sizeClass} text-white mt-3 mb-1.5`}>{cleanHeader}</div>;
      }
      return <p key={i} className="mb-2 whitespace-pre-line leading-relaxed">{para}</p>;
    });
  };

  const renderFollowUps = () => {
    if (chatHistory.length === 0 || isChatLoading) return null;
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg.role !== 'model') return null;
    
    const parsed = parseMessageContent(lastMsg.parts);
    if (parsed.followUps.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-900 mt-3.5">
        {parsed.followUps.map((question, qIdx) => (
          <button
            key={qIdx}
            type="button"
            onClick={() => handleSendChatMessageStream(question)}
            className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/25 px-2.5 py-1 rounded-full transition-all cursor-pointer text-left"
          >
            {question}
          </button>
        ))}
      </div>
    );
  };

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
  const [atsResult, setAtsResult] = useState<any | null>(null);
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
  const [coverLetterStyle, setCoverLetterStyle] = useState<'professional' | 'storytelling' | 'executive' | 'internship' | 'creative' | 'concise'>('professional');
  const [coverLetterTone, setCoverLetterTone] = useState<'formal' | 'confident' | 'enthusiastic' | 'humble' | 'technical'>('confident');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [hiringManagerName, setHiringManagerName] = useState('');
  const [hiringManagerTitle, setHiringManagerTitle] = useState('');
  const [companyPersonalization, setCompanyPersonalization] = useState('');
  const [wordCount, setWordCount] = useState<number>(280);
  const [rewriteInstruction, setRewriteInstruction] = useState('');

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

  // Career Assistant states
  const [careerSubTab, setCareerSubTab] = useState<'chat' | 'paths' | 'plans' | 'interviews'>('chat');
  const [targetRole, setTargetRole] = useState('');
  const [targetJD, setTargetJD] = useState('');
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState<string | null>(null);

  // Gaps & Roadmap
  const [skillGapResult, setSkillGapResult] = useState<{ score: number; gaps: Array<{ skill: string; category: string; impact: string; reasoning: string }> } | null>(null);
  const [roadmapResult, setRoadmapResult] = useState<Array<{ phase: string; goal: string; tasks: string[] }> | null>(null);
  const [transitionResult, setTransitionResult] = useState<{ advice: string[]; strategy: string } | null>(null);
  const [promoResult, setPromoResult] = useState<{ readiness: number; strengths: string[]; blockers: string[] } | null>(null);

  // Plans & Goals
  const [actionPlan, setActionPlan] = useState<{ plan30: string[]; plan60: string[]; plan90: string[] } | null>(null);
  const [weeklyGoals, setWeeklyGoals] = useState<Array<{ task: string; completed: boolean }> | null>(null);
  const [learningRecs, setLearningRecs] = useState<Array<{ topic: string; type: string; name: string; platform: string }> | null>(null);

  // STAR & Salary
  const [starInput, setStarInput] = useState('');
  const [starResult, setStarResult] = useState<{ situation: string; task: string; action: string; result: string; optimizedBullet: string } | null>(null);
  const [salaryResult, setSalaryResult] = useState<{ min: number; median: number; max: number; currency: string; topSkills: string[]; tips: string[] } | null>(null);

  // Mock Interview
  const [mockQuestions, setMockQuestions] = useState<string[] | null>(null);
  const [mockAnswers, setMockAnswers] = useState<string[]>(['', '', '']);
  const [mockEvaluation, setMockEvaluation] = useState<{ score: number; feedback: string; starCritique: string } | null>(null);

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
  const chatHistory = watch('chatHistory' as any) || [];
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  // Synchronize targetRole with resume title initially
  useEffect(() => {
    if (resumeTitle && !targetRole) {
      setTargetRole(resumeTitle);
    }
  }, [resumeTitle]);


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

  const applySuggestion = (fieldPath: string, suggestionText: string) => {
    if (!fieldPath) return;

    if (fieldPath.startsWith('skills.')) {
      const matches = suggestionText.match(/'([^']+)'/);
      const keyword = matches ? matches[1] : suggestionText;
      const fieldName = fieldPath as 'skills.technicalSkills' | 'skills.softSkills';
      const current = getValues(fieldName) || [];
      if (!current.includes(keyword)) {
        setValue(fieldName, [...current, keyword], { shouldDirty: true, shouldTouch: true });
        toast.success(`Added '${keyword}' to your skills!`);
      } else {
        toast.info(`'${keyword}' is already in your skills.`);
      }
    } else {
      setValue(fieldPath as any, suggestionText, { shouldDirty: true, shouldTouch: true });
      toast.success(`Updated ${getFieldLabel(fieldPath)}!`);
    }
  };

  // E. Cover Letter Generator
  const handleGenerateCoverLetter = async () => {
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
          jobDescription: coverLetterJobDescription,
          style: coverLetterStyle,
          tone: coverLetterTone,
          companyName: companyName || 'Company',
          jobTitle: jobTitle || 'Role',
          hiringManagerName,
          hiringManagerTitle,
          companyPersonalization,
          wordCount
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

  const handleImproveCoverLetter = async () => {
    if (!generatedCoverLetter) return;
    setIsCoverLetterLoading(true);
    setCoverLetterError(null);
    const loaderToastId = toast.loading('AI is improving your cover letter...');

    try {
      const response = await fetch('/api/ai?action=cover-letter-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: generatedCoverLetter })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGeneratedCoverLetter(data.coverLetter);
      toast.dismiss(loaderToastId);
      toast.success('Cover letter improved!');
    } catch (err: any) {
      console.error(err);
      setCoverLetterError(err.message || 'Failed to improve cover letter.');
      toast.dismiss(loaderToastId);
      toast.error('AI Improvement failed.');
    } finally {
      setIsCoverLetterLoading(false);
    }
  };

  const handleRewriteCoverLetter = async () => {
    if (!generatedCoverLetter || !rewriteInstruction.trim()) return;
    setIsCoverLetterLoading(true);
    setCoverLetterError(null);
    const loaderToastId = toast.loading('AI is rewriting cover letter...');

    try {
      const response = await fetch('/api/ai?action=cover-letter-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter: generatedCoverLetter,
          instruction: rewriteInstruction
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGeneratedCoverLetter(data.coverLetter);
      setRewriteInstruction('');
      toast.dismiss(loaderToastId);
      toast.success('Cover letter rewritten successfully!');
    } catch (err: any) {
      console.error(err);
      setCoverLetterError(err.message || 'Failed to rewrite cover letter.');
      toast.dismiss(loaderToastId);
      toast.error('AI Rewrite failed.');
    } finally {
      setIsCoverLetterLoading(false);
    }
  };

  const handleSaveCoverLetter = async () => {
    if (!generatedCoverLetter) return;
    const loaderToastId = toast.loading('Saving cover letter to dashboard...');

    try {
      const res = await createCoverLetter({
        resumeId,
        title: `${companyName || 'Company'} Cover Letter - ${coverLetterStyle.toUpperCase()}`,
        recipientName: hiringManagerName,
        recipientTitle: hiringManagerTitle,
        companyName: companyName || 'Company',
        jobTitle: jobTitle || 'Role',
        letterBody: generatedCoverLetter,
        style: coverLetterStyle,
        tone: coverLetterTone
      });

      if (!res.success) throw new Error(res.error);
      toast.dismiss(loaderToastId);
      toast.success('Cover letter saved to dashboard!');
    } catch (err: any) {
      console.error(err);
      toast.dismiss(loaderToastId);
      toast.error(err.message || 'Failed to save cover letter.');
    }
  };

  const handleExportPDF = () => {
    if (!generatedCoverLetter) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups to export PDF.');
      return;
    }

    const name = watch('personalInfo.fullName') || '';
    const email = watch('personalInfo.email') || '';
    const phone = watch('personalInfo.phone') || '';
    const address = watch('personalInfo.location') || '';

    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <html>
        <head>
          <title>${companyName || 'Company'} Cover Letter - ${name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              line-height: 1.6;
              font-size: 11pt;
              margin: 0;
              padding: 0;
            }
            .header {
              margin-bottom: 25px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 15px;
            }
            .sender-name {
              font-size: 20pt;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 5px 0;
              letter-spacing: -0.5px;
            }
            .sender-info {
              font-size: 9.5pt;
              color: #475569;
              margin: 0;
            }
            .date {
              margin-bottom: 25px;
              color: #64748b;
              font-weight: 500;
            }
            .recipient {
              margin-bottom: 25px;
            }
            .recipient-title {
              font-weight: 600;
              color: #0f172a;
            }
            .company {
              font-weight: 500;
              color: #334155;
            }
            .body {
              white-space: pre-wrap;
              color: #1e293b;
              text-align: justify;
            }
            .signature {
              margin-top: 40px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="sender-name">${name}</h1>
            <p class="sender-info">
              ${email ? `Email: ${email}` : ''} 
              ${phone ? ` | Phone: ${phone}` : ''}
              ${address ? ` | Address: ${address}` : ''}
            </p>
          </div>
          <div class="date">${dateStr}</div>
          <div class="recipient">
            ${hiringManagerName ? `<div class="recipient-title">${hiringManagerName}${hiringManagerTitle ? `, ${hiringManagerTitle}` : ''}</div>` : ''}
            <div class="company">${companyName || 'Company'}</div>
          </div>
          <div class="body">${generatedCoverLetter}</div>
          <div class="signature">
            <p>Sincerely,</p>
            <br/>
            <p style="font-weight: 600; color: #0f172a;">${name}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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

  // Unified Career Assistant Suite API Dispatcher
  const handleGenerateCareerContent = async (type: string, customInput?: string) => {
    setCareerLoading(true);
    setCareerError(null);
    const loaderToastId = toast.loading(`Generating ${type.replace('-', ' ')} details...`);

    try {
      const resumeData = getValues();
      const bodyPayload: any = {
        type,
        resumeData,
        targetRole: targetRole || resumeTitle || 'Senior Software Engineer',
        jobDescription: targetJD || '',
      };

      if (customInput) {
        bodyPayload.input = customInput;
      }

      const response = await fetch('/api/ai?action=career-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Dispatch to correct state
      switch (type) {
        case 'skill-gap':
          setSkillGapResult(data);
          break;
        case 'roadmap':
          setRoadmapResult(data.roadmap || []);
          break;
        case 'transition':
          setTransitionResult(data);
          break;
        case 'promotion':
          setPromoResult(data);
          break;
        case 'action-plan':
          setActionPlan(data);
          break;
        case 'goals':
          setWeeklyGoals(data.goals || []);
          break;
        case 'learning':
          setLearningRecs(data.recommendations || []);
          break;
        case 'salary':
          setSalaryResult(data);
          break;
        case 'star':
          setStarResult(data);
          break;
        case 'mock-questions':
          setMockQuestions(data.questions || []);
          setMockAnswers(['', '', '']);
          setMockEvaluation(null);
          break;
        case 'mock-interview-evaluation':
          setMockEvaluation(data);
          break;
        default:
          break;
      }
      toast.dismiss(loaderToastId);
      toast.success(`${type.replace('-', ' ')} generated successfully!`);
    } catch (err: any) {
      console.error(err);
      setCareerError(err.message || `Failed to generate ${type}.`);
      toast.dismiss(loaderToastId);
      toast.error(`Failed to generate ${type.replace('-', ' ')}.`);
    } finally {
      setCareerLoading(false);
    }
  };

  // F. Chat Assistant Streaming Sender
  const handleSendChatMessageStream = async (messageText?: string) => {
    const textToSend = messageText || chatInput.trim();
    if (!textToSend || isChatLoading) return;
    
    if (!messageText) setChatInput('');
    
    const userTurn = { role: 'user', parts: textToSend };
    const currentHistory = getValues('chatHistory' as any) || [];
    const updatedHistory = [...currentHistory, userTurn];
    
    setValue('chatHistory' as any, updatedHistory, { shouldDirty: true });
    setIsChatLoading(true);
    setStreamingMessage('');
    
    try {
      const resumeData = getValues();
      const response = await fetch('/api/ai?action=chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: currentHistory,
          resumeData
        })
      });
      
      if (!response.ok) throw new Error('Failed to stream response');
      if (!response.body) throw new Error('Readable stream not supported');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = '';
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          accumulatedText += chunk;
          setStreamingMessage(accumulatedText);
        }
      }
      
      const modelTurn = { role: 'model', parts: accumulatedText };
      setValue('chatHistory' as any, [...updatedHistory, modelTurn], { shouldDirty: true });
      setStreamingMessage('');
    } catch (err: any) {
      console.error('Streaming failed:', err);
      const errorTurn = { 
        role: 'model', 
        parts: 'Error: Failed to receive streaming response. Please try again.' 
      };
      setValue('chatHistory' as any, [...updatedHistory, errorTurn], { shouldDirty: true });
      setStreamingMessage('');
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
    { id: 'ats', label: 'ATS Score', icon: <TrendingUp className="w-3 h-3" /> },
    { id: 'tailor', label: 'Tailor', icon: <Target className="w-3 h-3" /> },
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
            {atsResult && (() => {
              const overallScore = atsResult.overallScore !== undefined ? atsResult.overallScore : (atsResult.score !== undefined ? atsResult.score : 0);
              return (
                <div className="space-y-4 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl animate-fade-in">
                  {/* Overall Score Dial */}
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-950/40 border border-slate-900/60 rounded-2xl">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          className="stroke-slate-800"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          className={`${
                            overallScore >= 80 ? 'stroke-emerald-500' : overallScore >= 60 ? 'stroke-amber-500' : 'stroke-rose-500'
                          } transition-all duration-1000 ease-out`}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 48}
                          strokeDashoffset={2 * Math.PI * 48 * (1 - overallScore / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-white">{overallScore}%</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Match</span>
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <h5 className="text-xs font-bold text-slate-200">ATS Match Index</h5>
                      <p className="text-[10px] text-slate-400 mt-1 font-light leading-relaxed max-w-[220px]">
                        {overallScore >= 80 
                          ? 'Excellent match! Your resume is highly optimized for this role.' 
                          : overallScore >= 60 
                          ? 'Good alignment. Add a few missing keywords to cross the 80% threshold.' 
                          : 'Weak alignment. Review the prioritized checklist and skills below.'}
                      </p>
                    </div>
                  </div>

                  {/* Sub-scores metrics grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'Formatting', value: atsResult.formattingScore },
                      { label: 'Hard Skills', value: atsResult.hardSkillsScore },
                      { label: 'Soft Skills', value: atsResult.softSkillsScore },
                      { label: 'Impact / STAR', value: atsResult.impactScore },
                      { label: 'Readability', value: atsResult.readabilityScore },
                    ].map((sub, idx) => {
                      const val = sub.value !== undefined ? sub.value : 0;
                      const colorClass = val >= 80 ? 'bg-emerald-500' : val >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                      return (
                        <div key={idx} className="bg-slate-950/30 border border-slate-900/40 p-2.5 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-semibold text-slate-450 text-[9px]">{sub.label}</span>
                            <span className="font-bold text-white">{val}%</span>
                          </div>
                          <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                            <div className={`${colorClass} h-full transition-all duration-500`} style={{ width: `${val}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* PDF Compatibility Checklist */}
                  {atsResult.pdfCompatibility && (
                    <div className="space-y-2.5 p-3.5 bg-slate-950/20 border border-slate-900 rounded-xl">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" /> PDF Parser Checks:
                        </h5>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          atsResult.pdfCompatibility.passed 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        }`}>
                          {atsResult.pdfCompatibility.passed ? 'COMPATIBLE' : 'ISSUES DETECTED'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {atsResult.pdfCompatibility.checks?.map((check: any, idx: number) => {
                          const isPass = check.status === 'pass';
                          const isWarn = check.status === 'warning';
                          return (
                            <div key={idx} className="flex items-start gap-2.5 text-[10px] leading-relaxed">
                              {isPass ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              ) : isWarn ? (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="font-semibold text-slate-200">{check.label}</span>
                                <p className="text-[9px] text-slate-400 font-light mt-0.5">{check.tip}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Keyword Density Analysis Chart */}
                  {atsResult.keywordMatch && (
                    <div className="space-y-3 p-3.5 bg-slate-950/20 border border-slate-900 rounded-xl">
                      <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-850 pb-2">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Keyword Density analysis:
                      </h5>
                      {atsResult.keywordMatch.matched?.length > 0 ? (
                        <div className="space-y-2.5">
                          {atsResult.keywordMatch.matched.map((item: any, idx: number) => {
                            const isIdeal = item.density >= 2.0 && item.density <= 4.0;
                            const densityColor = isIdeal ? 'text-emerald-400' : item.density > 4.0 ? 'text-amber-400' : 'text-slate-400';
                            const barWidth = Math.min(100, (item.density / 6.0) * 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-semibold text-slate-200">{item.keyword}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] text-slate-400">{item.count} {item.count === 1 ? 'match' : 'matches'}</span>
                                    <span className={`font-bold text-[9px] ${densityColor}`}>{item.density}% density</span>
                                    {isIdeal && (
                                      <span className="text-[7px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold px-1 rounded">IDEAL</span>
                                    )}
                                  </div>
                                </div>
                                <div className="relative w-full bg-slate-800/40 rounded-full h-1.5 overflow-hidden">
                                  <div className="absolute left-[33.3%] right-[33.3%] top-0 bottom-0 bg-slate-700/20 border-l border-r border-slate-700/35 z-0" />
                                  <div 
                                    className={`h-full ${isIdeal ? 'bg-emerald-500' : item.density > 4.0 ? 'bg-amber-500' : 'bg-indigo-500'} transition-all duration-500 relative z-10`}
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">No matching keywords detected.</p>
                      )}
                    </div>
                  )}

                  {/* Prioritized Missing Keywords */}
                  {atsResult.keywordMatch?.missing?.length > 0 && (
                    <div className="space-y-2 p-3.5 bg-slate-950/20 border border-slate-900 rounded-xl">
                      <h5 className="text-[10px] uppercase font-black tracking-widest text-rose-400 flex items-center gap-1.5 border-b border-slate-850 pb-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Prioritized Missing Keywords:
                      </h5>
                      <p className="text-[9px] text-slate-400 font-light pb-1">Click a keyword to instantly add it to your profile skills.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {atsResult.keywordMatch.missing.map((wordObj: any, idx: number) => {
                          const priority = wordObj.priority || 'medium';
                          const priorityColor = priority === 'high' 
                            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/20' 
                            : priority === 'medium'
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/20'
                            : 'bg-slate-500/10 border border-slate-500/25 text-slate-400 hover:border-slate-500/50 hover:bg-slate-500/20';
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => addSkillToResume(priority === 'high' || idx % 2 === 0 ? 'technical' : 'soft', wordObj.keyword)}
                              className={`group flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-full border transition-all font-semibold cursor-pointer ${priorityColor}`}
                              title={`Add '${wordObj.keyword}' to skills`}
                            >
                              {wordObj.keyword}
                              <span className="text-[7px] uppercase opacity-70 px-1 rounded bg-slate-950/50">{priority}</span>
                              <Plus className="w-2.5 h-2.5 shrink-0 opacity-70 group-hover:opacity-100 transition-colors" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Benchmark Card */}
                  {atsResult.benchmark && (
                    <div className="p-3.5 bg-gradient-to-br from-indigo-950/25 to-slate-900/30 border border-slate-900 rounded-xl space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                        <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Sector Benchmarking</h5>
                        <span className="text-[9px] font-black text-indigo-400">Top {100 - atsResult.benchmark.percentile}% of Candidates</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center bg-slate-950/40 border border-slate-900 rounded-xl p-2 shrink-0">
                          <span className="text-lg font-black text-white">{atsResult.benchmark.percentile}th</span>
                          <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Percentile</p>
                        </div>
                        <p className="text-[10px] text-slate-300 font-light leading-relaxed">
                          {atsResult.benchmark.comparisonText}
                        </p>
                      </div>
                      {atsResult.benchmark.strengths?.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-slate-900">
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">Key Strengths</span>
                          <ul className="list-disc pl-4 text-[9px] text-slate-400 space-y-0.5 leading-relaxed font-light">
                            {atsResult.benchmark.strengths.map((str: string, idx: number) => <li key={idx}>{str}</li>)}
                          </ul>
                        </div>
                      )}
                      {atsResult.benchmark.gaps?.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-slate-900">
                          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">Optimization Gaps</span>
                          <ul className="list-disc pl-4 text-[9px] text-slate-400 space-y-0.5 leading-relaxed font-light">
                            {atsResult.benchmark.gaps.map((gap: string, idx: number) => <li key={idx}>{gap}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Suggestions / Recommendations */}
                  {atsResult.aiSuggestions?.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-900/60">
                      <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Smart AI Recommendations:</h5>
                      <div className="space-y-2">
                        {atsResult.aiSuggestions.map((sug: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className={`text-[8px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded ${
                                sug.category === 'keywords' 
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                  : sug.category === 'impact'
                                  ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                                  : sug.category === 'formatting'
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                  : 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
                              }`}>
                                {sug.category}
                              </span>
                              {sug.fieldPath && (
                                <button
                                  type="button"
                                  onClick={() => applySuggestion(sug.fieldPath, sug.suggestionText)}
                                  className="text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded transition-all cursor-pointer"
                                >
                                  Apply Fix
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-200 font-semibold">{sug.tip}</p>
                            <p className="text-[9.5px] text-slate-400 italic bg-slate-900/50 p-2 rounded-lg border border-slate-900/40 leading-relaxed font-light">
                              {sug.suggestionText}
                            </p>
                            {sug.fieldPath && (
                              <div className="text-[8px] text-slate-500 uppercase font-semibold">
                                Target: {getFieldLabel(sug.fieldPath)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
           TAB: TAILOR
           ==================================================================== */}
        {activeTab === 'tailor' && (
          <div className="animate-fade-in duration-200">
            <TailorPanel onSaveTailoredVersion={onSaveTailoredVersion} />
          </div>
        )}

        {/* ====================================================================
           TAB: COVER LETTER
           ==================================================================== */}
        {activeTab === 'coverletter' && (
          <div className="space-y-5 animate-fade-in duration-200 text-slate-300">
            {/* Main Config Card */}
            <div className="space-y-4 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Cover Letter Assistant
                </h4>
              </div>

              {/* Job Details Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Developer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-light"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-light"
                  />
                </div>
              </div>

              {/* Hiring Manager Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Hiring Manager Name</label>
                  <input
                    type="text"
                    value={hiringManagerName}
                    onChange={(e) => setHiringManagerName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-light"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Hiring Manager Title</label>
                  <input
                    type="text"
                    value={hiringManagerTitle}
                    onChange={(e) => setHiringManagerTitle(e.target.value)}
                    placeholder="e.g. Recruiter Lead"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-light"
                  />
                </div>
              </div>

              {/* Personalization text area */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Company Personalization (Optional)</label>
                <textarea
                  value={companyPersonalization}
                  onChange={(e) => setCompanyPersonalization(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed font-light"
                  placeholder="What excites you about this company? e.g. I follow your open-source libraries..."
                />
              </div>

              {/* JD Paste box */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Job Description Context</label>
                <textarea
                  value={coverLetterJobDescription}
                  onChange={(e) => setCoverLetterJobDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed font-light"
                  placeholder="Paste details of the role description here for better personalization..."
                />
              </div>

              {/* Style Selector */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Writing Style</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['professional', 'storytelling', 'executive', 'internship', 'creative', 'concise'] as const).map((st) => {
                    const icons: Record<string, string> = {
                      professional: '🏢',
                      storytelling: '📖',
                      executive: '👔',
                      internship: '🎓',
                      creative: '✏️',
                      concise: '⚡'
                    };
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setCoverLetterStyle(st)}
                        className={`text-[10px] font-bold py-1.5 px-2 rounded-xl border transition-all text-center select-none cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          coverLetterStyle === st
                            ? 'bg-indigo-600 border-indigo-500 text-white font-extrabold shadow-sm'
                            : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-400'
                        }`}
                      >
                        <span className="text-xs">{icons[st]}</span>
                        <span className="capitalize text-[8px]">{st}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tone Selector */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Tone of Voice</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['formal', 'confident', 'enthusiastic', 'humble', 'technical'] as const).map((tn) => (
                    <button
                      key={tn}
                      type="button"
                      onClick={() => setCoverLetterTone(tn)}
                      className={`text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        coverLetterTone === tn
                          ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400 font-black'
                          : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      <span className="capitalize">{tn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Count presets */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Target Word Count: <span className="text-white font-bold">{wordCount}w</span></label>
                <div className="flex gap-1.5">
                  {([150, 250, 350, 450] as const).map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setWordCount(len)}
                      className={`flex-1 text-[9px] font-bold py-1 rounded-lg border transition-all cursor-pointer text-center ${
                        wordCount === len
                          ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400 font-black'
                          : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500'
                      }`}
                    >
                      {len === 150 ? 'Short' : len === 250 ? 'Medium' : len === 350 ? 'Long' : 'Detailed'} ({len}w)
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateCoverLetter}
                disabled={isCoverLetterLoading}
                className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-40 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {isCoverLetterLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Draft Custom Cover Letter
              </button>
            </div>

            {coverLetterError && (
              <p className="text-rose-400 text-[10px] font-medium flex items-center gap-1 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" /> {coverLetterError}
              </p>
            )}

            {/* Generated Cover Letter Preview & Editor */}
            {generatedCoverLetter && (
              <div className="space-y-4 p-4 bg-slate-900/20 border border-slate-900 rounded-2xl animate-fade-in">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black tracking-widest text-indigo-400">Generated Letter Preview</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                      {generatedCoverLetter.split(/\s+/).filter(Boolean).length} Words | {coverLetterStyle} ({coverLetterTone})
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCoverLetter);
                        toast.success('Copied cover letter to clipboard!');
                      }}
                      title="Copy text"
                      className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      title="Export PDF"
                      className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCoverLetter}
                      title="Save to Dashboard"
                      className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Edit Area */}
                <textarea
                  value={generatedCoverLetter}
                  onChange={(e) => setGeneratedCoverLetter(e.target.value)}
                  rows={12}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3.5 text-[10.5px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 leading-relaxed whitespace-pre-wrap resize-y font-light shadow-inner"
                />

                {/* AI Improvement Tools */}
                <div className="pt-3 border-t border-slate-850 space-y-3">
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Iterate with AI</span>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleImproveCoverLetter}
                      disabled={isCoverLetterLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700/50 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" /> Auto-Improve
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={rewriteInstruction}
                        onChange={(e) => setRewriteInstruction(e.target.value)}
                        placeholder="e.g. Make it more concise or add technical keywords..."
                        className="flex-grow bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-[10.5px] text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-light"
                      />
                      <button
                        type="button"
                        onClick={handleRewriteCoverLetter}
                        disabled={isCoverLetterLoading || !rewriteInstruction.trim()}
                        className="px-3.5 py-1.5 text-[10px] font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                      >
                        Rewrite
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
          <div className="flex flex-col h-[calc(100vh-220px)] border border-slate-900 bg-slate-950/40 rounded-2xl overflow-hidden animate-fade-in duration-200">
            {/* Sub-Tabs Navigation */}
            <div className="flex border-b border-slate-900 bg-slate-905/30 px-3 py-2 gap-1.5 shrink-0 text-[10px] font-bold select-none overflow-x-auto scrollbar-none">
              {[
                { id: 'chat', label: 'Coach Chat', icon: '💬' },
                { id: 'paths', label: 'Career Planner', icon: '🗺️' },
                { id: 'plans', label: 'Action Plans', icon: '🎯' },
                { id: 'interviews', label: 'Interview & STAR', icon: '🎙️' },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  type="button"
                  onClick={() => setCareerSubTab(subTab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    careerSubTab === subTab.id
                      ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                      : 'text-slate-400 hover:text-slate-205 hover:bg-slate-900/40'
                  }`}
                >
                  <span>{subTab.icon}</span>
                  <span>{subTab.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-Tab 1: Traditional Conversational Coach Chat */}
            {careerSubTab === 'chat' && (
              <>
                {/* Header */}
                <div className="px-4 py-2 border-b border-slate-900 bg-slate-900/10 flex items-center justify-between shrink-0 select-none">
                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">AI Career Coach Chat</span>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('chatHistory' as any, [], { shouldDirty: true });
                      setStreamingMessage('');
                    }}
                    className="text-[8px] font-extrabold text-slate-500 hover:text-white px-2 py-0.5 border border-slate-850 rounded bg-slate-950/50 cursor-pointer animate-fade-in"
                  >
                    Reset Chat
                  </button>
                </div>

                {/* Chat Messages Logs Area */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 text-[10px] scrollbar-thin flex flex-col justify-start">
                  {/* Starter welcome screen if empty */}
                  {chatHistory.length === 0 && !streamingMessage && (
                    <div className="flex-grow flex flex-col justify-center items-center p-4 text-center space-y-5 my-auto select-none animate-fade-in">
                      <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
                        <Brain className="w-5.5 h-5.5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xxs font-bold text-white uppercase tracking-wider">AI Career Coach & Editor</h4>
                        <p className="text-[9.5px] text-slate-400 max-w-[280px] leading-relaxed font-light">
                          Analyze, critique, and edit your resume directly. Select a starting option or type your own question.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 w-full pt-1">
                        {starterPrompts.map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleSendChatMessageStream(prompt.text)}
                            className="p-2.5 bg-slate-900 border border-slate-850 hover:border-indigo-500/40 rounded-xl text-left transition-colors flex flex-col gap-0.5 cursor-pointer hover:bg-slate-900/60 text-[9.5px] font-bold text-slate-300"
                          >
                            <span>{prompt.label}</span>
                            <span className="text-[8.5px] text-slate-500 font-normal leading-tight line-clamp-2">
                              {prompt.text}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Collapsible Smart Recommendations based on resume values */}
                      {recommendations.length > 0 && (
                        <div className="p-3 bg-indigo-950/15 border border-indigo-950/45 rounded-xl space-y-2 w-full text-left">
                          <div className="text-[9px] font-black text-indigo-400 uppercase tracking-wide">
                            Smart Recommendations ({recommendations.length})
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {recommendations.slice(0, 2).map((rec, rIdx) => (
                              <div key={rIdx} className="flex justify-between items-center gap-3 p-2 bg-slate-950 border border-slate-900 rounded-lg text-[8.5px]">
                                <div className="space-y-0.5 min-w-0 flex-grow">
                                  <span className="font-bold text-slate-300 block truncate">{rec.title}</span>
                                  <span className="text-slate-500 font-light block leading-normal truncate">{rec.desc}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSendChatMessageStream(rec.prompt)}
                                  className="text-[8.5px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded transition-all cursor-pointer shrink-0"
                                >
                                  Fix
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat Thread */}
                  {chatHistory.map((msg: Message, index: number) => {
                    const parsed = parseMessageContent(msg.parts);
                    return (
                      <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                              : 'bg-slate-900/80 border border-slate-850 text-slate-300 font-light rounded-tl-none'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            msg.parts
                          ) : (
                            <>
                              <div className="space-y-1.5">
                                {renderFormattedMessage(parsed.cleanText)}
                              </div>

                              {/* Apply Suggested edits card */}
                              {parsed.applyCards.map((card, cIdx) => (
                                <div key={cIdx} className="mt-3 p-2.5 bg-indigo-950/40 border border-indigo-500/25 rounded-xl flex flex-col gap-2 animate-fade-in">
                                  <div className="flex items-center justify-between gap-2 border-b border-indigo-500/10 pb-1">
                                    <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider text-indigo-400">
                                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                      Apply to {getFieldLabel(card.fieldPath)}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setValue(card.fieldPath as any, card.suggestedText, { shouldDirty: true, shouldTouch: true });
                                        toast.success(`Applied AI changes to ${getFieldLabel(card.fieldPath)}!`);
                                      }}
                                      className="text-[8.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded transition-colors cursor-pointer select-none shrink-0"
                                    >
                                      Apply
                                    </button>
                                  </div>
                                  <div className="text-[9px] text-slate-300 leading-relaxed font-light whitespace-pre-wrap max-h-36 overflow-y-auto pr-1">
                                    {card.suggestedText.replace(/<[^>]*>/g, '')}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Streaming response */}
                  {streamingMessage && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-none px-3.5 py-2.5 bg-slate-900/80 border border-slate-850 text-slate-300 font-light">
                        <div className="space-y-1.5">
                          {renderFormattedMessage(parseMessageContent(streamingMessage).cleanText)}
                        </div>
                        <div className="inline-block w-1.5 h-3 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                      </div>
                    </div>
                  )}

                  {/* Typing loader */}
                  {isChatLoading && !streamingMessage && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-slate-900/80 border border-slate-850 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-slate-400 flex items-center gap-1.5 font-light">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        AI Coach is typing...
                      </div>
                    </div>
                  )}

                  {/* Follow-up Prompts Pills */}
                  {renderFollowUps()}

                  <div ref={chatEndRef} />
                </div>

                {/* Footer Input Box */}
                <div className="p-3 border-t border-slate-900 bg-slate-900/20 shrink-0 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendChatMessageStream();
                    }}
                    disabled={isChatLoading}
                    placeholder="Ask the AI Coach..."
                    className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendChatMessageStream()}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-600/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* Sub-Tab 2: Career Planner paths */}
            {careerSubTab === 'paths' && (
              <div className="flex-grow overflow-y-auto p-4 space-y-4 text-[10px]">
                {/* Planner Configuration */}
                <div className="space-y-3 p-4 bg-slate-900/25 border border-slate-900 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-400" />
                    Career Planner Setup
                  </h4>
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Target Role / Title</label>
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Staff Software Engineer"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-light"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Target Job Description (Optional)</label>
                      <textarea
                        value={targetJD}
                        onChange={(e) => setTargetJD(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed font-light"
                        placeholder="Paste target job description to audit skills more accurately..."
                      />
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleGenerateCareerContent('skill-gap')}
                      disabled={careerLoading}
                      className="px-3 py-2 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer text-center"
                    >
                      🔍 Skill Gap Audit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateCareerContent('roadmap')}
                      disabled={careerLoading}
                      className="px-3 py-2 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer text-center"
                    >
                      🗺️ Career Roadmap
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateCareerContent('transition')}
                      disabled={careerLoading}
                      className="px-3 py-2 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer text-center"
                    >
                      🚀 Pivot Advice
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateCareerContent('promotion')}
                      disabled={careerLoading}
                      className="px-3 py-2 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer text-center"
                    >
                      📈 Promo Readiness
                    </button>
                  </div>
                </div>

                {/* Loading indicator */}
                {careerLoading && (
                  <div className="flex items-center justify-center p-8 bg-slate-900/10 border border-slate-900/55 rounded-2xl">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mr-2" />
                    <span className="text-xs text-slate-400 font-semibold">AI is computing career parameters...</span>
                  </div>
                )}

                {/* Error Banner */}
                {careerError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{careerError}</span>
                  </div>
                )}

                {/* Outputs */}
                {!careerLoading && (
                  <div className="space-y-4">
                    {/* Skill Gap Result */}
                    {skillGapResult && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                          <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Skill Gap Audit</h5>
                          <span className="text-[9px] font-black text-indigo-300">Match score: {skillGapResult.score}%</span>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {skillGapResult.gaps?.map((gap, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-950 border border-slate-900 rounded-xl space-y-1.5">
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="font-bold text-slate-205">{gap.skill}</span>
                                <div className="flex gap-1 shrink-0">
                                  <span className={`text-[7px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                    gap.category === 'technical' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                                  }`}>{gap.category}</span>
                                  <span className={`text-[7px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                    gap.impact === 'high' ? 'bg-rose-500/10 text-rose-400' : gap.impact === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'
                                  }`}>Impact: {gap.impact}</span>
                                </div>
                              </div>
                              <p className="text-[9.5px] text-slate-400 leading-normal font-light">{gap.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Career Roadmap Result */}
                    {roadmapResult && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3 animate-fade-in">
                        <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 border-b border-slate-850 pb-2">Career Transition Roadmap</h5>
                        <div className="space-y-3">
                          {roadmapResult.map((milestone, idx) => (
                            <div key={idx} className="relative pl-5 border-l border-indigo-500/30 space-y-1 last:pb-1">
                              <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/50" />
                              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider block">{milestone.phase}</span>
                              <span className="text-xs font-bold text-slate-200 block">{milestone.goal}</span>
                              <ul className="list-disc pl-3.5 text-[9.5px] text-slate-400 space-y-1 font-light pt-0.5">
                                {milestone.tasks?.map((t, tIdx) => <li key={tIdx}>{t}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transition Advice Result */}
                    {transitionResult && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3 animate-fade-in">
                        <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 border-b border-slate-850 pb-2">Pivot Strategy & Repositioning</h5>
                        <div className="space-y-2">
                          <p className="text-[10px] text-indigo-300 font-semibold leading-relaxed whitespace-pre-line bg-slate-950 p-2.5 rounded-xl border border-slate-900">{transitionResult.strategy}</p>
                          <ul className="list-disc pl-4 text-[9.5px] text-slate-400 space-y-1 font-light leading-relaxed">
                            {transitionResult.advice?.map((adv, idx) => <li key={idx}>{adv}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Promotion Readiness Result */}
                    {promoResult && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3.5 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                          <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Promotion Readiness Evaluation</h5>
                          <span className="text-[9px] font-black text-indigo-300">Score: {promoResult.readiness}/100</span>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-950/40 p-3 border border-slate-900 rounded-xl">
                          <div className="text-center bg-slate-950 border border-slate-900 rounded-xl p-2 shrink-0">
                            <span className="text-lg font-black text-white">{promoResult.readiness}%</span>
                          </div>
                          <p className="text-[9.5px] text-slate-400 leading-relaxed font-light">
                            {promoResult.readiness >= 80 
                              ? 'Highly ready! You have demonstrated core execution, design skills, and leadership capabilities.' 
                              : promoResult.readiness >= 60 
                              ? 'Moderate readiness. Focus on bridging the blockers highlighted below.' 
                              : 'Keep developing. Address structural skills and coaching records before initiating review.'}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 pt-1">
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wide">Strengths Proving Readiness</span>
                            <ul className="list-disc pl-3 text-[9px] text-slate-400 space-y-0.5 font-light">
                              {promoResult.strengths?.map((str, idx) => <li key={idx}>{str}</li>)}
                            </ul>
                          </div>
                          <div className="space-y-1 pt-1.5 border-t border-slate-900">
                            <span className="text-[8px] font-bold text-rose-400 uppercase tracking-wide">Key Growth Areas / Blockers</span>
                            <ul className="list-disc pl-3 text-[9px] text-slate-400 space-y-0.5 font-light">
                              {promoResult.blockers?.map((bl, idx) => <li key={idx}>{bl}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 3: Action Plans & Checklists */}
            {careerSubTab === 'plans' && (
              <div className="flex-grow overflow-y-auto p-4 space-y-4 text-[10px]">
                {/* Generation Card */}
                <div className="space-y-3 p-4 bg-slate-900/25 border border-slate-900 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-305 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-indigo-400" />
                    Action Plans & Milestones
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                    Generate structured target milestones (30-60-90 days) alongside weekly micro-goals and recommended training materials.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleGenerateCareerContent('action-plan');
                        await handleGenerateCareerContent('learning');
                      }}
                      disabled={careerLoading}
                      className="px-3 py-2 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer text-center"
                    >
                      🎯 30-60-90 Plan & Training
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateCareerContent('goals')}
                      disabled={careerLoading}
                      className="px-3 py-2 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer text-center"
                    >
                      📅 Weekly micro-goals
                    </button>
                  </div>
                </div>

                {/* Loading indicator */}
                {careerLoading && (
                  <div className="flex items-center justify-center p-8 bg-slate-900/10 border border-slate-900/50 rounded-2xl">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mr-2" />
                    <span className="text-xs text-slate-400 font-semibold">AI is drafting planning details...</span>
                  </div>
                )}

                {/* Error Banner */}
                {careerError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{careerError}</span>
                  </div>
                )}

                {/* Outputs */}
                {!careerLoading && (
                  <div className="space-y-4">
                    {/* Weekly micro-goals (interactive checklist) */}
                    {weeklyGoals && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                          <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Weekly Goals Checklist</h5>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">
                            {weeklyGoals.filter(g => g.completed).length} / {weeklyGoals.length} Done
                          </span>
                        </div>
                        <div className="space-y-2">
                          {weeklyGoals.map((g, idx) => (
                            <label
                              key={idx}
                              className="flex items-start gap-2.5 p-2.5 bg-slate-950 border border-slate-900 rounded-xl hover:border-indigo-500/20 cursor-pointer select-none transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={g.completed}
                                onChange={() => {
                                  const updated = [...weeklyGoals];
                                  updated[idx].completed = !updated[idx].completed;
                                  setWeeklyGoals(updated);
                                }}
                                className="mt-0.5 accent-indigo-650 cursor-pointer rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className={`text-[9.5px] leading-relaxed ${g.completed ? 'line-through text-slate-500' : 'text-slate-350 font-light'}`}>
                                {g.task}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 30-60-90 Day Plan */}
                    {actionPlan && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-4 animate-fade-in">
                        <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 border-b border-slate-850 pb-2">30-60-90 Day Action Plan</h5>
                        
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { title: 'Day 30', tasks: actionPlan.plan30, color: 'text-indigo-400' },
                            { title: 'Day 60', tasks: actionPlan.plan60, color: 'text-purple-400' },
                            { title: 'Day 90', tasks: actionPlan.plan90, color: 'text-emerald-400' }
                          ].map((block, idx) => (
                            <div key={idx} className="bg-slate-950 border border-slate-900 p-3 rounded-xl space-y-2 flex flex-col">
                              <span className={`text-[9px] uppercase font-black tracking-wider ${block.color} border-b border-slate-900 pb-1.5 block`}>
                                {block.title}
                              </span>
                              <ul className="list-disc pl-3 text-[9px] text-slate-400 space-y-1.5 leading-relaxed font-light flex-grow">
                                {block.tasks?.map((t, tIdx) => <li key={tIdx}>{t}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Learning & course recommendations */}
                    {learningRecs && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3 animate-fade-in">
                        <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 border-b border-slate-850 pb-2">Training & Study Recommendations</h5>
                        <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {learningRecs.map((rec, idx) => {
                            const badgeColor =
                              rec.type === 'Course' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                              rec.type === 'Book' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              rec.type === 'Certification' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                              'bg-slate-500/10 text-slate-400 border-slate-500/20';
                            return (
                              <div key={idx} className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-1.5 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center gap-1.5">
                                    <span className="text-[8px] font-black text-slate-550 uppercase tracking-wider truncate">{rec.topic}</span>
                                    <span className={`text-[7px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>{rec.type}</span>
                                  </div>
                                  <p className="text-[9.5px] font-semibold text-slate-200 leading-relaxed">{rec.name}</p>
                                </div>
                                <span className="text-[8px] text-slate-500 font-bold block pt-1 border-t border-slate-900/40">Platform: {rec.platform}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 4: Interview Simulation & Negotiation */}
            {careerSubTab === 'interviews' && (
              <div className="flex-grow overflow-y-auto p-4 space-y-4 text-[10px]">
                {/* Generation Options Card */}
                <div className="space-y-3 p-4 bg-slate-900/25 border border-slate-900 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    Interview & Negotiation Preparation
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                    Initiate mock interviews, translate raw bullet achievements into structured STAR format, or check pay benchmarks.
                  </p>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleGenerateCareerContent('mock-questions')}
                      disabled={careerLoading}
                      className="px-2 py-2 text-[9px] font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer text-center"
                    >
                      🎙️ Mock Interview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateCareerContent('salary')}
                      disabled={careerLoading}
                      className="px-2 py-2 text-[9px] font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer text-center"
                    >
                      💰 Salary Guidance
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStarResult(null);
                        setStarInput('');
                      }}
                      className="px-2 py-2 text-[9px] font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer text-center"
                    >
                      ⭐ STAR Generator
                    </button>
                  </div>
                </div>

                {/* Loading indicator */}
                {careerLoading && (
                  <div className="flex items-center justify-center p-8 bg-slate-900/10 border border-slate-900/50 rounded-2xl">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mr-2" />
                    <span className="text-xs text-slate-400 font-semibold">AI is compiling prep materials...</span>
                  </div>
                )}

                {/* Error Banner */}
                {careerError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{careerError}</span>
                  </div>
                )}

                {/* Outputs */}
                {!careerLoading && (
                  <div className="space-y-4">
                    {/* Salary Guidance Result */}
                    {salaryResult && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                          <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Salary & Compensation Guidance</h5>
                          <span className="text-[9px] font-black text-indigo-300">Currency: {salaryResult.currency || 'USD'}</span>
                        </div>

                        {/* Benchmark slider */}
                        <div className="space-y-1.5 p-3 bg-slate-950 border border-slate-900 rounded-xl">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">Estimated Annual Range</span>
                          <div className="flex justify-between text-[11px] font-black text-slate-200 mt-1">
                            <span>Min: {salaryResult.min?.toLocaleString()}</span>
                            <span className="text-indigo-400">Median: {salaryResult.median?.toLocaleString()}</span>
                            <span>Max: {salaryResult.max?.toLocaleString()}</span>
                          </div>
                          <div className="relative w-full h-2 bg-slate-900 rounded-full mt-2 overflow-hidden flex">
                            <div className="h-full bg-slate-800/80 w-1/3 border-r border-slate-900" />
                            <div className="h-full bg-indigo-500/85 w-1/3 border-r border-slate-900" />
                            <div className="h-full bg-slate-800/85 w-1/3" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-1">
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wide">High-Value Premium Skills</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {salaryResult.topSkills?.map((skill, idx) => (
                                <span key={idx} className="text-[8.5px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold">{skill}</span>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1 pt-1.5 border-t border-slate-900">
                            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wide">Negotiation & Compensation Strategies</span>
                            <ul className="list-disc pl-3.5 text-[9px] text-slate-400 space-y-1 font-light leading-relaxed">
                              {salaryResult.tips?.map((tip, idx) => <li key={idx}>{tip}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STAR Answer Generator Form */}
                    {starResult === null && !salaryResult && !mockQuestions && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3 animate-fade-in">
                        <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 border-b border-slate-850 pb-2">STAR Achievement Writer</h5>
                        <p className="text-[9px] text-slate-400 leading-normal font-light">Input a raw task description below to structure it into Situation, Task, Action, and Result formats.</p>
                        <div className="space-y-2">
                          <textarea
                            value={starInput}
                            onChange={(e) => setStarInput(e.target.value)}
                            rows={3}
                            placeholder="e.g. I worked on moving our server API calls to React Query which speeded up loading pages."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed font-light"
                          />
                          <button
                            type="button"
                            onClick={() => handleGenerateCareerContent('star', starInput)}
                            disabled={!starInput.trim() || careerLoading}
                            className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                          >
                            Generate STAR Breakdown
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STAR Answer Generator Result */}
                    {starResult && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                          <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400">STAR Content Breakdown</h5>
                          <button
                            type="button"
                            onClick={() => setStarResult(null)}
                            className="text-slate-500 hover:text-white transition-colors"
                            title="Clear"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {[
                            { label: 'Situation', text: starResult.situation, color: 'text-indigo-400' },
                            { label: 'Task', text: starResult.task, color: 'text-purple-400' },
                            { label: 'Action', text: starResult.action, color: 'text-amber-500' },
                            { label: 'Result', text: starResult.result, color: 'text-emerald-450' }
                          ].map((block, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-950 border border-slate-905 rounded-xl space-y-1">
                              <span className={`text-[8.5px] uppercase font-black tracking-wider ${block.color}`}>{block.label}</span>
                              <p className="text-[9.5px] text-slate-300 leading-normal font-light">{block.text}</p>
                            </div>
                          ))}
                          <div className="p-3 bg-gradient-to-br from-indigo-950/25 to-slate-950/60 border border-indigo-900/50 rounded-xl space-y-2">
                            <div className="flex justify-between items-center border-b border-indigo-950/20 pb-1.5">
                              <span className="text-[8.5px] uppercase font-black tracking-wider text-indigo-400">Optimized Experience Bullet</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(starResult.optimizedBullet);
                                  toast.success('STAR Bullet copied to clipboard!');
                                }}
                                className="text-[8px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded transition-all cursor-pointer"
                              >
                                Copy Bullet
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-200 font-semibold leading-relaxed">&quot;{starResult.optimizedBullet}&quot;</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mock Interview Practice Form */}
                    {mockQuestions && (
                      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                          <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Mock Interview Simulation</h5>
                          <button
                            type="button"
                            onClick={() => setMockQuestions(null)}
                            className="text-slate-500 hover:text-white transition-colors"
                            title="Exit interview"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {mockQuestions.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">No questions generated. Try generating again.</p>
                        ) : (
                          <div className="space-y-4">
                            {mockQuestions.map((q, idx) => (
                              <div key={idx} className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-2">
                                <span className="text-[8.5px] font-black text-indigo-400 uppercase tracking-wide block">Question {idx + 1}</span>
                                <p className="text-[10px] font-semibold text-slate-200 leading-relaxed">{q}</p>
                                <textarea
                                  value={mockAnswers[idx]}
                                  onChange={(e) => {
                                    const updated = [...mockAnswers];
                                    updated[idx] = e.target.value;
                                    setMockAnswers(updated);
                                  }}
                                  rows={2.5}
                                  placeholder="Type your structured answer here..."
                                  className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-[9.5px] text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed font-light"
                                />
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => {
                                const payloadStr = mockQuestions.map((q, idx) => `Question: ${q}\nAnswer: ${mockAnswers[idx] || 'No answer provided.'}`).join('\n\n');
                                handleGenerateCareerContent('mock-interview-evaluation', payloadStr);
                              }}
                              disabled={careerLoading || mockAnswers.every(ans => !ans.trim())}
                              className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-550 rounded-xl disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                            >
                              Submit Answers for Evaluation
                            </button>
                          </div>
                        )}

                        {/* Mock Evaluation Results */}
                        {mockEvaluation && (
                          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3.5 animate-fade-in">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] uppercase font-black tracking-widest text-emerald-400">Simulation Evaluation</span>
                              <span className="text-[9px] font-black text-emerald-350">Rating: {mockEvaluation.score}/100</span>
                            </div>
                            <div className="p-3.5 bg-slate-950 border border-slate-900 rounded-xl space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="text-center bg-slate-900 border border-slate-855 rounded-xl p-2.5 shrink-0">
                                  <span className="text-md font-black text-white">{mockEvaluation.score}%</span>
                                </div>
                                <p className="text-[9.5px] text-slate-300 leading-normal font-light">{mockEvaluation.feedback}</p>
                              </div>
                            </div>
                            <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-1.5">
                              <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wide block">STAR Delivery Advice</span>
                              <p className="text-[9.5px] text-slate-400 leading-relaxed font-light">{mockEvaluation.starCritique}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
