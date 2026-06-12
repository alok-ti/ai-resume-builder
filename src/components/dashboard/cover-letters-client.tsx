'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  fetchCoverLetters, 
  createCoverLetter, 
  updateCoverLetter, 
  deleteCoverLetter,
  duplicateCoverLetter
} from '@/app/dashboard/cover-letter-actions';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  X, 
  Calendar,
  Building,
  Download,
  Layers
} from 'lucide-react';

interface CoverLettersClientProps {
  resumes: any[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Helper to parse style and tone from the encoded title
const parseTitleMetadata = (titleText: string) => {
  const metaRegex = /^\[style:([^|]+)\|tone:([^\]]+)\]\s*(.*)$/;
  const match = titleText?.match(metaRegex);
  if (match) {
    return {
      style: match[1],
      tone: match[2],
      cleanTitle: match[3]
    };
  }
  return {
    style: 'professional',
    tone: 'formal',
    cleanTitle: titleText || 'Tailored Cover Letter'
  };
};

export function CoverLettersClient({ resumes, showToast }: CoverLettersClientProps) {
  const [letters, setLetters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientTitle, setRecipientTitle] = useState('');
  const [resumeId, setResumeId] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [letterBody, setLetterBody] = useState('');

  // Styles and tones
  const [style, setStyle] = useState<'professional' | 'storytelling' | 'executive' | 'internship' | 'creative' | 'concise'>('professional');
  const [tone, setTone] = useState<'formal' | 'confident' | 'enthusiastic' | 'humble' | 'technical'>('confident');
  const [companyPersonalization, setCompanyPersonalization] = useState('');
  const [wordCount, setWordCount] = useState<number>(280);
  const [rewriteInstruction, setRewriteInstruction] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();

  const loadLetters = async (showLoading = false) => {
    if (showLoading) {
      setTimeout(() => setIsLoading(true), 0);
    }
    try {
      const data = await fetchCoverLetters();
      setLetters(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load cover letters', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLetters(false);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenCreate = () => {
    setTitle('');
    setCompanyName('');
    setJobTitle('');
    setRecipientName('');
    setRecipientTitle('');
    setResumeId(resumes[0]?.id || '');
    setJobDesc('');
    setLetterBody('');
    setStyle('professional');
    setTone('confident');
    setCompanyPersonalization('');
    setWordCount(280);
    setRewriteInstruction('');
    setCurrentId(null);
    setIsEditing(false);
    setIsOpen(true);
  };

  const handleOpenEdit = (letter: any) => {
    const parsed = parseTitleMetadata(letter.title);
    setTitle(parsed.cleanTitle);
    setStyle(parsed.style as any);
    setTone(parsed.tone as any);
    setCompanyName(letter.company_name);
    setJobTitle(letter.job_title);
    setRecipientName(letter.recipient_name || '');
    setRecipientTitle(letter.recipient_title || '');
    setResumeId(letter.resume_id || '');
    setJobDesc('');
    setLetterBody(letter.letter_body);
    setCompanyPersonalization('');
    setWordCount(280);
    setRewriteInstruction('');
    setCurrentId(letter.id);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleGenerateAI = async () => {
    if (!companyName || !jobTitle) {
      showToast('Company name and job title are required for AI generation', 'error');
      return;
    }
    const selectedResume = resumes.find(r => r.id === resumeId);
    if (!selectedResume) {
      showToast('Please select a resume version to ground the cover letter content', 'error');
      return;
    }

    setIsGenerating(true);
    showToast('AI is drafting cover letter...', 'info');

    try {
      const response = await fetch('/api/ai?action=cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: selectedResume.resume_data,
          jobDescription: jobDesc,
          style,
          tone,
          companyName,
          jobTitle,
          hiringManagerName: recipientName,
          hiringManagerTitle: recipientTitle,
          companyPersonalization,
          wordCount
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setLetterBody(data.coverLetter || '');
      setTitle(`Cover Letter - ${companyName} (${jobTitle})`);
      showToast('AI Cover Letter generated!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('AI generation failed. Please draft manually.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIImprove = async () => {
    if (!letterBody) return;
    setIsGenerating(true);
    showToast('AI is improving cover letter...', 'info');
    try {
      const response = await fetch('/api/ai?action=cover-letter-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: letterBody })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setLetterBody(data.coverLetter || '');
      showToast('Cover letter improved!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('AI improvement failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIRewrite = async () => {
    if (!letterBody || !rewriteInstruction.trim()) return;
    setIsGenerating(true);
    showToast('AI is rewriting cover letter...', 'info');
    try {
      const response = await fetch('/api/ai?action=cover-letter-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter: letterBody,
          instruction: rewriteInstruction
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setLetterBody(data.coverLetter || '');
      setRewriteInstruction('');
      showToast('Cover letter rewritten!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('AI rewrite failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !companyName || !jobTitle || !letterBody) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    const encodedTitle = `[style:${style}|tone:${tone}] ${title}`;

    startSaveTransition(async () => {
      try {
        if (isEditing && currentId) {
          const res = await updateCoverLetter(currentId, {
            title: encodedTitle,
            recipientName,
            recipientTitle,
            companyName,
            jobTitle,
            letterBody,
            resumeId: resumeId || undefined
          });
          if (res.success) {
            showToast('Cover letter updated successfully!', 'success');
            setIsOpen(false);
            loadLetters(true);
          } else {
            showToast(res.error || 'Failed to update', 'error');
          }
        } else {
          const res = await createCoverLetter({
            title: encodedTitle,
            recipientName,
            recipientTitle,
            companyName,
            jobTitle,
            letterBody,
            resumeId: resumeId || undefined
          });
          if (res.success) {
            showToast('Cover letter created successfully!', 'success');
            setIsOpen(false);
            loadLetters(true);
          } else {
            showToast(res.error || 'Failed to create', 'error');
          }
        }
      } catch (err) {
        console.error(err);
        showToast('An error occurred during save', 'error');
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this cover letter?')) {
      try {
        const res = await deleteCoverLetter(id);
        if (res.success) {
          showToast('Cover letter deleted successfully', 'success');
          loadLetters(true);
        } else {
          showToast(res.error || 'Failed to delete', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to delete cover letter', 'error');
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    showToast('Duplicating cover letter...', 'info');
    try {
      const res = await duplicateCoverLetter(id);
      if (res.success) {
        showToast('Cover letter duplicated successfully!', 'success');
        loadLetters(true);
      } else {
        showToast(res.error || 'Failed to duplicate', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred during duplication', 'error');
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied cover letter to clipboard!', 'success');
  };

  const handleExportPDF = () => {
    if (!letterBody) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked. Please allow popups to export PDF.', 'error');
      return;
    }

    const selectedResume = resumes.find(r => r.id === resumeId);
    const resumeData = selectedResume?.resume_data || {};
    const name = resumeData.personalInfo?.fullName || 'Candidate';
    const email = resumeData.personalInfo?.email || '';
    const phone = resumeData.personalInfo?.phone || '';
    const address = resumeData.personalInfo?.address || '';
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
            ${recipientName ? `<div class="recipient-title">${recipientName}${recipientTitle ? `, ${recipientTitle}` : ''}</div>` : ''}
            <div class="company">${companyName || 'Company'}</div>
          </div>
          <div class="body">${letterBody}</div>
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

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            AI Cover Letter Manager
          </h2>
          <p className="text-slate-400 text-xxs leading-relaxed">
            Generate custom cover letters linked to specific resume versions using target job listings details.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-655 hover:bg-indigo-600 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Letter
        </button>
      </div>

      {/* Grid of cover letters */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-2">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-550">Loading cover letters...</span>
        </div>
      ) : letters.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 bg-slate-900/10 rounded-3xl flex flex-col justify-center items-center text-center">
          <FileText className="w-10 h-10 text-slate-700 mb-3" />
          <h4 className="text-sm font-bold text-slate-350">No Cover Letters Drafted</h4>
          <p className="text-slate-500 text-xs mt-1 max-w-sm">
            Generate your first letter by clicking the &quot;Create Letter&quot; button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {letters.map((letter) => {
            const meta = parseTitleMetadata(letter.title);
            return (
              <div
                key={letter.id}
                className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between gap-4 hover:border-slate-700/80 transition-all group"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {meta.cleanTitle}
                    </h4>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyText(letter.letter_body)}
                        className="text-slate-500 hover:text-indigo-400 p-1.5 rounded transition-colors cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(letter.id)}
                        className="text-slate-500 hover:text-indigo-400 p-1.5 rounded transition-colors cursor-pointer"
                        title="Duplicate as new version"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(letter)}
                        className="text-slate-500 hover:text-indigo-400 p-1.5 rounded transition-colors cursor-pointer"
                        title="Edit letter"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(letter.id)}
                        className="text-slate-500 hover:text-rose-455 p-1.5 rounded transition-colors cursor-pointer"
                        title="Delete letter"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xxs font-light">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium text-slate-350">{letter.company_name}</span>
                      <span>•</span>
                      <span>{letter.job_title}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-slate-400">
                        {meta.style}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-900/40 text-indigo-400">
                        {meta.tone}
                      </span>
                    </div>

                    {letter.resumes && (
                      <div className="text-[10px] text-slate-500 font-light flex items-center gap-1 pt-1.5 border-t border-slate-900/50 mt-1">
                        <FileText className="w-3 h-3 text-slate-650" />
                        Linked Resume: <span className="text-slate-400 italic font-medium">{letter.resumes.title}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-xxs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-600" /> 
                    {new Date(letter.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <div className="text-slate-400 line-clamp-1 max-w-[50%] font-light italic">
                    Preview: {letter.letter_body.substring(0, 40)}...
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal Drawer Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                {isEditing ? `Edit Cover Letter` : 'Draft New Cover Letter'}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form */}
            <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Configuration Panel */}
              <div className="lg:col-span-2 space-y-4 border-r border-slate-850/60 pr-0 lg:pr-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Configuration</h4>
                
                {/* Title */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Google Cover Letter"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-light"
                  />
                </div>

                {/* Linked Resume */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider">Linked Resume *</label>
                  <select
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">No Resume Link</option>
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                </div>

                {/* Company Name & Job Title */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider">Company *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Google"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-blue-500 font-light"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider">Role Title *</label>
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Frontend Engineer"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-blue-500 font-light"
                    />
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider">Manager Name</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-blue-500 font-light"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider">Manager Title</label>
                    <input
                      type="text"
                      value={recipientTitle}
                      onChange={(e) => setRecipientTitle(e.target.value)}
                      placeholder="e.g. Recruiter Lead"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-blue-500 font-light"
                    />
                  </div>
                </div>

                {/* Style Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider">Style</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['professional', 'storytelling', 'executive', 'internship', 'creative', 'concise'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStyle(st)}
                        className={`text-[9px] font-semibold py-1 rounded transition-all cursor-pointer border text-center ${
                          style === st
                            ? 'bg-indigo-600 border-indigo-500 text-white font-extrabold'
                            : 'bg-slate-950 border-slate-850 text-slate-400'
                        }`}
                      >
                        <span className="capitalize">{st}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider">Tone</label>
                  <div className="flex flex-wrap gap-1">
                    {(['formal', 'confident', 'enthusiastic', 'humble', 'technical'] as const).map((tn) => (
                      <button
                        key={tn}
                        type="button"
                        onClick={() => setTone(tn)}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          tone === tn
                            ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400 font-black'
                            : 'bg-slate-950 border-slate-850 text-slate-400'
                        }`}
                      >
                        <span className="capitalize">{tn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target length preset */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider">Word Limit: <span className="text-white">{wordCount}w</span></label>
                  <div className="flex gap-1">
                    {([150, 250, 350, 450] as const).map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setWordCount(len)}
                        className={`flex-1 text-[8.5px] font-bold py-0.5 rounded border transition-all cursor-pointer text-center ${
                          wordCount === len
                            ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400 font-black'
                            : 'bg-slate-950 border-slate-850 text-slate-500'
                        }`}
                      >
                        {len}w
                      </button>
                    ))}
                  </div>
                </div>

                {/* Personalization & JD Paste */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider">JD Context & Personalization</label>
                  <textarea
                    value={companyPersonalization}
                    onChange={(e) => setCompanyPersonalization(e.target.value)}
                    rows={2}
                    placeholder="Why this company excites you..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[10.5px] text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-light"
                  />
                  <textarea
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    rows={2.5}
                    placeholder="Paste job details here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[10.5px] text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-light"
                  />
                  <button
                    type="button"
                    disabled={isGenerating || !resumeId}
                    onClick={handleGenerateAI}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors shadow-md cursor-pointer"
                  >
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate Draft
                  </button>
                </div>
              </div>

              {/* Right Editable Preview Area */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-855 pb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Letter Body Preview</h4>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">
                    {letterBody.split(/\s+/).filter(Boolean).length} Words
                  </div>
                </div>

                <textarea
                  required
                  value={letterBody}
                  onChange={(e) => setLetterBody(e.target.value)}
                  placeholder="Dear hiring manager..."
                  className="w-full bg-slate-950 border border-slate-855 rounded-2xl p-4 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 leading-relaxed whitespace-pre-wrap flex-grow min-h-[300px] font-light shadow-inner animate-fade-in"
                />

                {/* AI Iteration Toolbar */}
                {letterBody && (
                  <div className="p-3.5 bg-slate-955/30 border border-slate-855/80 rounded-2xl space-y-3.5 animate-fade-in">
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-550 block">AI Editing Tools</span>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAIImprove}
                        disabled={isGenerating}
                        className="flex-grow py-1.5 bg-slate-800 border border-slate-700/50 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Auto-Improve Letter
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rewriteInstruction}
                        onChange={(e) => setRewriteInstruction(e.target.value)}
                        placeholder="e.g. Make it more concise..."
                        className="flex-grow bg-slate-950 border border-slate-855 rounded-xl px-3 py-1 text-[10.5px] text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-blue-500 font-light"
                      />
                      <button
                        type="button"
                        onClick={handleAIRewrite}
                        disabled={isGenerating || !rewriteInstruction.trim()}
                        className="px-4 py-1 bg-indigo-655 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Rewrite
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 shrink-0 flex justify-between gap-2.5">
              <div className="flex gap-2">
                {letterBody && (
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-450" /> Export PDF
                  </button>
                )}
                {isEditing && currentId && (
                  <button
                    type="button"
                    onClick={() => handleDuplicate(currentId)}
                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-455" /> Duplicate Version
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {isEditing ? 'Save Changes' : 'Create Letter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
