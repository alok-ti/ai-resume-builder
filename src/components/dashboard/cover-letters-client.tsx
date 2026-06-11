'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  fetchCoverLetters, 
  createCoverLetter, 
  updateCoverLetter, 
  deleteCoverLetter 
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
  Building
} from 'lucide-react';

interface CoverLettersClientProps {
  resumes: any[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

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
    setCurrentId(null);
    setIsEditing(false);
    setIsOpen(true);
  };

  const handleOpenEdit = (letter: any) => {
    setTitle(letter.title);
    setCompanyName(letter.company_name);
    setJobTitle(letter.job_title);
    setRecipientName(letter.recipient_name || '');
    setRecipientTitle(letter.recipient_title || '');
    setResumeId(letter.resume_id || '');
    setJobDesc('');
    setLetterBody(letter.letter_body);
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
          jobDescription: `Target Company: ${companyName}\nTarget Role: ${jobTitle}\n\nJob Details: ${jobDesc}`
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setLetterBody(data.coverLetter || '');
      setTitle(`Tailored Cover Letter - ${companyName} (${jobTitle})`);
      showToast('AI Cover Letter generated!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('AI generation failed. Please draft manually.', 'error');
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

    startSaveTransition(async () => {
      try {
        if (isEditing && currentId) {
          const res = await updateCoverLetter(currentId, {
            title,
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
            title,
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

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied cover letter to clipboard!', 'success');
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
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Letter
        </button>
      </div>

      {/* Grid of cover letters */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-2">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-500">Loading cover letters...</span>
        </div>
      ) : letters.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 bg-slate-900/10 rounded-3xl flex flex-col justify-center items-center text-center">
          <FileText className="w-10 h-10 text-slate-700 mb-3" />
          <h4 className="text-sm font-bold text-slate-300">No Cover Letters Drafted</h4>
          <p className="text-slate-500 text-xs mt-1 max-w-sm">
            Generate your first letter by clicking the &quot;Create Letter&quot; button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {letters.map((letter) => (
            <div
              key={letter.id}
              className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between gap-4 hover:border-slate-700/80 transition-all group"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {letter.title}
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyText(letter.letter_body)}
                      className="text-slate-500 hover:text-blue-400 p-1.5 rounded transition-colors cursor-pointer"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
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
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                      title="Delete letter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xxs font-light">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-medium text-slate-300">{letter.company_name}</span>
                    <span>•</span>
                    <span>{letter.job_title}</span>
                  </div>
                  {letter.resumes && (
                    <div className="text-[10px] text-slate-500 font-light flex items-center gap-1">
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
          ))}
        </div>
      )}

      {/* Editor Modal Drawer Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                {isEditing ? 'Edit Cover Letter' : 'Draft New Cover Letter'}
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
            <form onSubmit={handleSave} className="flex-grow overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Google Cover Letter"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Linked Resume */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Linked Resume Version *</label>
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

                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Google"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Job Title */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Frontend Engineer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Recipient Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient Name (Optional)</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Hiring Team"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Recipient Title */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient Title (Optional)</label>
                  <input
                    type="text"
                    value={recipientTitle}
                    onChange={(e) => setRecipientTitle(e.target.value)}
                    placeholder="e.g. Engineering Lead"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* AI Draft Generator Helper */}
              {!isEditing && (
                <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      AI Phrasing Tailoring Co-Pilot
                    </h4>
                    <button
                      type="button"
                      disabled={isGenerating || !resumeId}
                      onClick={handleGenerateAI}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                    >
                      {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Draft Letter Body
                    </button>
                  </div>
                  <textarea
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    rows={2.5}
                    placeholder="Optional: Paste Job Description details here to customize cover letter phrasings..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xxs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Letter Body */}
              <div className="space-y-1.5 flex flex-col">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cover Letter Body *</label>
                <textarea
                  required
                  rows={8}
                  value={letterBody}
                  onChange={(e) => setLetterBody(e.target.value)}
                  placeholder="Dear Google Hiring Team,..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-light"
                />
              </div>
            </form>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 shrink-0 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {isEditing ? 'Save Changes' : 'Create Letter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
