'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  Loader2, 
  Database,
  ShieldAlert
} from 'lucide-react';

interface ImportResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

type ImportStep = 'idle' | 'reading' | 'uploading' | 'saving' | 'success';

export function ImportResumeModal({ isOpen, onClose, showToast }: ImportResumeModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [step, setStep] = useState<ImportStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      validateAndSetFile(droppedFiles[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      validateAndSetFile(selectedFiles[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const sizeMB = selectedFile.size / (1024 * 1024);

    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      setError('Unsupported file type. Please upload a PDF, DOCX or TXT file.');
      return;
    }

    if (sizeMB > 10) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleUploadSubmit = async () => {
    if (!file) return;

    setError(null);
    setStep('reading');
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate a small file read step for better user feel
      await new Promise((resolve) => setTimeout(resolve, 600));

      setStep('uploading');
      setProgress(50);

      const response = await fetch('/api/resume/import', {
        method: 'POST',
        body: formData
      });

      setStep('saving');
      setProgress(85);

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Import parser server returned an error');
      }

      setStep('success');
      setProgress(100);
      showToast('Resume imported successfully!', 'success');

      // Defer redirection to let the user see the success state
      setTimeout(() => {
        onClose();
        router.push(`/builder/${result.resumeId}`);
      }, 1000);

    } catch (err: any) {
      console.error('File import failed:', err);
      setError(err.message || 'An unexpected error occurred during resume import.');
      setStep('idle');
      setProgress(0);
    }
  };

  const getStepLabel = () => {
    switch (step) {
      case 'reading': return 'Reading resume file content...';
      case 'uploading': return 'Extracting text content from file...';
      case 'saving': return 'Creating resume draft in database...';
      case 'success': return 'Import successful! Opening builder...';
      default: return 'Ready to upload';
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 'reading': return <FileText className="w-5 h-5 text-blue-400 animate-pulse" />;
      case 'uploading': return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
      case 'saving': return <Database className="w-5 h-5 text-emerald-400 animate-pulse" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-400 animate-pulse" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            Import Existing Resume
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={step !== 'idle'}
            className="text-slate-500 hover:text-white transition-colors cursor-pointer disabled:opacity-35"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {step === 'idle' ? (
            <>
              {/* Drag and Drop Container */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center gap-3 select-none ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/5 scale-[0.99]'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-800 bg-slate-950/20 hover:border-slate-700/80'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />

                <div className={`p-4 rounded-full ${file ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">
                    {file ? file.name : 'Drag & drop your resume file here'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports PDF, DOCX, or TXT (Max 10MB)'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/60 border border-red-500/30 text-red-400 rounded-xl text-xxs flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 border-t border-slate-800 pt-4.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  disabled={!file}
                  className="px-4.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-md shadow-blue-600/10"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload & Import
                </button>
              </div>
            </>
          ) : (
            /* Loading & Progress States Display */
            <div className="py-6 flex flex-col items-center justify-center gap-5 select-none text-center">
              <div className="p-5 rounded-full bg-slate-950 border border-slate-850 shadow-inner">
                {getStepIcon() || <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}
              </div>

              <div className="space-y-2 w-full max-w-xs">
                <h4 className="text-xs font-bold text-slate-200">{getStepLabel()}</h4>
                
                {/* Visual Progress Bar */}
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <span className="text-[10px] text-slate-500 font-mono">{progress}% completed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
