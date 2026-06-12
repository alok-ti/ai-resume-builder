'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sliders,
  FileText,
  Navigation,
  Sparkles,
  Download,
  FileDown,
  Moon,
  Sun,
  History,
  Keyboard,
  ArrowRight
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchTemplate: (templateId: string) => void;
  onNavigateSection: (sectionKey: string) => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onToggleTheme: () => void;
  onTriggerAi: () => void;
  onTriggerHistory: () => void;
  sections: Array<{ key: string; label: string }>;
  currentTheme: 'dark' | 'light';
}

interface CommandItem {
  id: string;
  category: 'Templates' | 'Sections' | 'AI & Utilities' | 'Export Options';
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSwitchTemplate,
  onNavigateSection,
  onExportPdf,
  onExportDocx,
  onToggleTheme,
  onTriggerAi,
  onTriggerHistory,
  sections,
  currentTheme
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Build the list of commands dynamically
  const commands: CommandItem[] = [
    // Templates
    {
      id: 'tmpl-ats',
      category: 'Templates',
      label: 'Switch to ATS Friendly',
      sublabel: 'Standard Georgia/Times, high-parsing single column',
      icon: <Sliders className="w-4 h-4 text-blue-500" />,
      action: () => onSwitchTemplate('ats')
    },
    {
      id: 'tmpl-tech',
      category: 'Templates',
      label: 'Switch to Developer & Tech',
      sublabel: 'Teal accents, sidebar grid, prominent technical tags',
      icon: <Sliders className="w-4 h-4 text-teal-500" />,
      action: () => onSwitchTemplate('tech')
    },
    {
      id: 'tmpl-executive',
      category: 'Templates',
      label: 'Switch to Executive Portfolio',
      sublabel: 'Sleek dark-slate split-column corporate layout',
      icon: <Sliders className="w-4 h-4 text-indigo-500" />,
      action: () => onSwitchTemplate('executive')
    },
    {
      id: 'tmpl-modern',
      category: 'Templates',
      label: 'Switch to Modern Design',
      sublabel: 'Centered indigo banner headers with accent badges',
      icon: <Sliders className="w-4 h-4 text-purple-500" />,
      action: () => onSwitchTemplate('modern')
    },
    {
      id: 'tmpl-minimal',
      category: 'Templates',
      label: 'Switch to Minimalist Clean',
      sublabel: 'Ultra high-whitespace spacing and thin borders',
      icon: <Sliders className="w-4 h-4 text-slate-500" />,
      action: () => onSwitchTemplate('minimal')
    },
    {
      id: 'tmpl-creative',
      category: 'Templates',
      label: 'Switch to Creative Accent',
      sublabel: 'Coral/rose bordered asymmetry and designer elements',
      icon: <Sliders className="w-4 h-4 text-rose-500" />,
      action: () => onSwitchTemplate('creative')
    },
    
    // AI & Utilities
    {
      id: 'utils-ai',
      category: 'AI & Utilities',
      label: 'Open AI Co-Pilot Assistant',
      sublabel: 'Critique resume, STAR bullet optimizer, transition advice',
      icon: <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />,
      action: () => onTriggerAi()
    },
    {
      id: 'utils-history',
      category: 'AI & Utilities',
      label: 'View Version Checkpoint Timeline',
      sublabel: 'Browse and restore database snapshots',
      icon: <History className="w-4 h-4 text-violet-500" />,
      action: () => onTriggerHistory()
    },
    {
      id: 'utils-theme',
      category: 'AI & Utilities',
      label: `Switch Workspace to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`,
      sublabel: `Toggles global theme styles`,
      icon: currentTheme === 'dark' ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-slate-800" />,
      action: () => onToggleTheme()
    },

    // Export Options
    {
      id: 'export-pdf',
      category: 'Export Options',
      label: 'Export to PDF Document',
      sublabel: 'Generate sub-second print-ready A4 PDF',
      icon: <Download className="w-4 h-4 text-emerald-500" />,
      action: () => onExportPdf()
    },
    {
      id: 'export-docx',
      category: 'Export Options',
      label: 'Export to Word DOCX',
      sublabel: 'Download editable office file format',
      icon: <FileDown className="w-4 h-4 text-cyan-500" />,
      action: () => onExportDocx()
    },

    // Sections
    ...sections.map(sec => ({
      id: `sec-${sec.key}`,
      category: 'Sections' as const,
      label: `Go to ${sec.label} Form Editor`,
      sublabel: `Active editing pane navigator`,
      icon: <Navigation className="w-4 h-4 text-slate-400" />,
      action: () => onNavigateSection(sec.key)
    }))
  ];

  // Filter commands based on search query
  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase()) ||
    (cmd.sublabel && cmd.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Handle keyboard inputs
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset search when opening/closing
  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-md"
          />

          {/* Search Card Container */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="w-full max-w-lg rounded-2xl glass-modal overflow-hidden flex flex-col max-h-[460px] shadow-3xl z-10"
          >
            {/* Search Input Area */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-card-border">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command, template, or action..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none text-foreground placeholder:text-text-muted"
              />
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-card-border bg-background text-[9px] text-text-muted font-mono font-bold shrink-0 shadow-xxs">
                ESC
              </span>
            </div>

            {/* Commands List */}
            <div ref={listRef} className="flex-grow overflow-y-auto p-2 space-y-3">
              {filteredCommands.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-xs">
                  No matching commands found.
                </div>
              ) : (
                // Group by Category
                Object.entries(
                  filteredCommands.reduce((acc, cmd) => {
                    if (!acc[cmd.category]) acc[cmd.category] = [];
                    acc[cmd.category].push(cmd);
                    return acc;
                  }, {} as Record<string, CommandItem[]>)
                ).map(([category, items]) => (
                  <div key={category} className="space-y-1">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-text-muted px-2.5 py-1">
                      {category}
                    </h5>
                    <div className="space-y-0.5">
                      {items.map(cmd => {
                        const globalIdx = filteredCommands.findIndex(c => c.id === cmd.id);
                        const isActive = globalIdx === selectedIndex;

                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            data-active={isActive}
                            onClick={() => {
                              cmd.action();
                              onClose();
                            }}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-xl transition-all cursor-pointer ${
                              isActive
                                ? 'bg-indigo-600/10 dark:bg-indigo-500/15 border border-indigo-500/35 text-foreground'
                                : 'bg-transparent border border-transparent text-text-muted hover:bg-slate-100 dark:hover:bg-slate-900/40 hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-1.5 rounded-lg shrink-0 ${
                                isActive ? 'bg-indigo-500/10' : 'bg-slate-100 dark:bg-slate-900/60'
                              }`}>
                                {cmd.icon}
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground">
                                  {cmd.label}
                                </div>
                                {cmd.sublabel && (
                                  <div className="text-[10px] text-text-muted truncate mt-0.5 font-light">
                                    {cmd.sublabel}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {isActive && (
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-500 animate-pulse shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Command Palette Footer */}
            <div className="px-4 py-2 border-t border-card-border bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between text-[10px] text-text-muted">
              <span className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-text-muted" />
                Use <span className="font-bold text-foreground">↑↓</span> to navigate, <span className="font-bold text-foreground">Enter</span> to run
              </span>
              <span>
                Ctrl + K
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
