'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Trash2 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, onBlur, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Load initial value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount to avoid overriding cursor position during typing

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, argument: string = '') => {
    document.execCommand(command, false, argument);
    handleInput();
  };

  // Prevent default paste to clean up styles and spans
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div
      className={`flex flex-col rounded-xl border bg-slate-950/60 transition-all duration-200 ${
        isFocused
          ? 'border-indigo-500 ring-2 ring-indigo-500/10'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-slate-800/80 bg-slate-900/40 rounded-t-xl select-none">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Underline"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-4 bg-slate-800 mx-1" />
        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter the link URL:');
            if (url) executeCommand('createLink', url);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Link"
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('removeFormat')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all ml-auto"
          title="Clear Formatting"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-rose-400" />
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="relative min-h-[120px] flex flex-col">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (onBlur) onBlur();
          }}
          className="w-full h-full min-h-[120px] px-4 py-3 text-xs text-slate-200 focus:outline-none leading-relaxed prose prose-invert max-w-none prose-xs"
        />
        {/* Placeholder element if editor is empty */}
        {(!value || value === '<br>' || value === '') && (
          <div className="absolute top-3 left-4 text-xs text-slate-600 pointer-events-none select-none">
            {placeholder || 'Start typing details here...'}
          </div>
        )}
      </div>
    </div>
  );
}
