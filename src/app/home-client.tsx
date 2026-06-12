'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Brain, ArrowRight, Download, Sliders, ShieldCheck, Moon, Sun, CheckCircle } from 'lucide-react';

interface HomeClientProps {
  user: any;
}

export function HomeClient({ user }: HomeClientProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, damping: 25, stiffness: 180 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring' as const, damping: 20, stiffness: 150 }
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex flex-col justify-between transition-colors duration-300">
      
      {/* Background Orbits / Glowing Mesh */}
      <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-glow-1 animate-pulse-slow" />
      <div className="absolute bottom-[10%] left-[10%] w-[450px] h-[450px] bg-glow-2 animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Floating grid backdrop overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(0,0,0,0))] pointer-events-none" />

      {/* Header / Navbar */}
      <motion.header 
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="sticky top-0 z-50 border-b border-card-border bg-background/50 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text text-transparent">
            <Sparkles className="w-5.5 h-5.5 text-indigo-500 animate-pulse" />
            AI Resume Builder
          </div>

          <nav className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-card-border hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-text-muted hover:text-foreground cursor-pointer"
              title="Toggle Dark/Light Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-800" />}
            </button>

            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-premium hover:opacity-90 rounded-xl shadow-lg transition-all duration-200 cursor-pointer"
              >
                Go to Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-semibold text-text-muted hover:text-foreground transition-colors px-3 py-2 cursor-pointer"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-foreground bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-card-border rounded-xl transition-all duration-200 cursor-pointer"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
        >
          
          {/* Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-500 dark:text-indigo-400 text-xxs font-semibold uppercase tracking-wider shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              Gemini 2.5 Flash Co-Pilot Integrated
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-foreground"
            >
              Create Your Standout{' '}
              <span className="text-gradient-premium">
                ATS-Optimized
              </span>{' '}
              Resume in Minutes
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="text-text-muted text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-light"
            >
              Tailor description bullets using STAR methodology, perform skills gap analysis, switch templates instantly without data loss, and download client-side A4 PDFs.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2"
            >
              {user ? (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-gradient-premium hover:opacity-95 rounded-xl shadow-xl transition-all duration-200 cursor-pointer"
                >
                  Go to Builder Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-gradient-premium hover:opacity-95 rounded-xl shadow-xl transition-all duration-200 cursor-pointer"
                  >
                    Build My Resume
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-foreground bg-slate-100 dark:bg-slate-900 border border-card-border hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </motion.div>
          </div>

          {/* Hero Visual Mockup */}
          <motion.div 
            variants={cardVariants}
            className="lg:col-span-5 relative w-full aspect-[4/3] rounded-3xl glass-panel p-6 overflow-hidden hidden md:block"
          >
            {/* Visual resume interface illustration */}
            <div className="space-y-4 h-full flex flex-col justify-between opacity-85">
              
              {/* Header mockup */}
              <div className="border-b border-card-border pb-3 flex justify-between items-end">
                <div>
                  <div className="h-6 w-32 bg-indigo-500/20 rounded-md animate-pulse" />
                  <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded mt-1.5" />
                </div>
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>

              {/* Body mockup */}
              <div className="flex-grow space-y-3 pt-3">
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800/60 rounded" />
                <div className="h-3 w-[90%] bg-slate-200 dark:bg-slate-800/60 rounded" />
                
                {/* Visual section 1 */}
                <div className="pt-2 space-y-2">
                  <div className="h-4 w-28 bg-indigo-500/20 rounded" />
                  <div className="flex gap-4 items-center">
                    <div className="h-3 w-3 rounded-full bg-indigo-500/30" />
                    <div className="h-3 w-48 bg-slate-200 dark:bg-slate-800/80 rounded" />
                  </div>
                  <div className="flex gap-4 items-center pl-7">
                    <div className="h-2.5 w-full bg-slate-200/50 dark:bg-slate-900 rounded" />
                  </div>
                </div>

                {/* Visual section 2 */}
                <div className="pt-2 space-y-2">
                  <div className="h-4 w-24 bg-rose-500/20 rounded" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Status bar */}
              <div className="border-t border-card-border pt-3 flex justify-between items-center text-[10px] text-text-muted">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Auto-saved to Supabase</span>
                <span>PDF Document Standard v1.0</span>
              </div>

            </div>
          </motion.div>

        </motion.div>

        {/* Features Grid Section */}
        <section className="mt-32 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Engineered for Maximum Impact</h2>
            <p className="text-text-muted text-xs sm:text-sm">We provide the technical tools to pass recruiters and ATS filters cleanly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <motion.div 
              whileHover={{ y: -6, scale: 1.01 }}
              className="p-6 glass-panel rounded-2xl space-y-4 hover:border-indigo-500/30 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">AI STAR Bullet Optimizer</h3>
              <p className="text-text-muted text-xs leading-relaxed font-light">
                Refine generic job duty statements into action-oriented statements focused on Situation, Task, Action, and measurable Results.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              whileHover={{ y: -6, scale: 1.01 }}
              className="p-6 glass-panel rounded-2xl space-y-4 hover:border-purple-500/30 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 dark:text-purple-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">Section Management</h3>
              <p className="text-text-muted text-xs leading-relaxed font-light">
                Reorder your layout stack (Experience, Projects, Education, Certifications) instantly and hide/show sections as needed per application.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              whileHover={{ y: -6, scale: 1.01 }}
              className="p-6 glass-panel rounded-2xl space-y-4 hover:border-rose-500/30 group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 dark:text-rose-400">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors">Client-side PDF Exporter</h3>
              <p className="text-text-muted text-xs leading-relaxed font-light">
                Export to Standard A4 PDF documents directly in the client. No server side rendering latency, resulting in sub-second downloads.
              </p>
            </motion.div>

          </div>
        </section>

      </main>

      {/* Footer Branding */}
      <footer className="border-t border-card-border bg-background/50 py-6 text-center text-xs text-text-muted relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} AI Resume Builder. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
