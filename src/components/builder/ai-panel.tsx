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
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

type TabType = 'copilot' | 'ats' | 'coverletter' | 'chat';

interface Message {
  role: 'user' | 'model';
  parts: string;
}

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
      <div className="flex border-b border-slate-900 pb-px gap-1.5 shrink-0 text-xxs font-bold uppercase tracking-wider select-none">
        {([
          { id: 'copilot', label: 'Co-Pilot', icon: <Sparkles className="w-3 h-3" /> },
          { id: 'ats', label: 'ATS & Tailor', icon: <TrendingUp className="w-3 h-3" /> },
          { id: 'coverletter', label: 'Cover Letter', icon: <FileText className="w-3 h-3" /> },
          { id: 'chat', label: 'AI Coach', icon: <MessageSquare className="w-3 h-3" /> }
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
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
