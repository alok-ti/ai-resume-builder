import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Sparkles, Brain, ArrowRight, Download, Sliders, ShieldCheck } from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen bg-slate-950 text-white font-sans overflow-hidden flex flex-col justify-between">
      
      {/* Background radial glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-900/60 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
            AI Resume Builder
          </div>

          <nav className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
              >
                Go to Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all duration-200"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xxs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
              Gemini 2.5 Flash Co-Pilot Integrated
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-white">
              Create Your Standout{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                ATS-Optimized
              </span>{' '}
              Resume in Minutes
            </h1>
            
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Tailor description bullets to follow the STAR methodology, perform strict skills gap analyses, switch layouts instantly, and download high-fidelity PDFs client-side.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2">
              {user ? (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200"
                >
                  Go to Builder Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200"
                  >
                    Build My Resume
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5 relative w-full aspect-[4/3] lg:aspect-[1/1] xl:aspect-[4/3] rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 shadow-2xl p-6 overflow-hidden hidden md:block">
            {/* Visual resume interface illustration */}
            <div className="space-y-4 h-full flex flex-col justify-between opacity-85">
              
              {/* Header mockup */}
              <div className="border-b border-slate-800 pb-3 flex justify-between items-end">
                <div>
                  <div className="h-6 w-32 bg-blue-500/20 rounded-md animate-pulse" />
                  <div className="h-3.5 w-24 bg-slate-800 rounded mt-1.5" />
                </div>
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-slate-800" />
                  <div className="h-3 w-3 rounded-full bg-slate-800" />
                  <div className="h-3 w-3 rounded-full bg-slate-800" />
                </div>
              </div>

              {/* Body mockup */}
              <div className="flex-grow space-y-3 pt-3">
                <div className="h-3 w-full bg-slate-800/60 rounded" />
                <div className="h-3 w-[90%] bg-slate-800/60 rounded" />
                
                {/* Visual section 1 */}
                <div className="pt-2 space-y-2">
                  <div className="h-4 w-28 bg-indigo-500/20 rounded" />
                  <div className="flex gap-4 items-center">
                    <div className="h-3 w-3 rounded-full bg-indigo-500/30" />
                    <div className="h-3 w-48 bg-slate-800/80 rounded" />
                  </div>
                  <div className="flex gap-4 items-center pl-7">
                    <div className="h-2.5 w-full bg-slate-900 rounded" />
                  </div>
                </div>

                {/* Visual section 2 */}
                <div className="pt-2 space-y-2">
                  <div className="h-4 w-24 bg-purple-500/20 rounded" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-slate-800 rounded-lg" />
                    <div className="h-5 w-20 bg-slate-800 rounded-lg" />
                    <div className="h-5 w-14 bg-slate-800 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Status bar */}
              <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Auto-saved to Supabase</span>
                <span>PDF Document Standard v1.0</span>
              </div>

            </div>
          </div>

        </div>

        {/* Features Grid Section */}
        <section className="mt-32 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Engineered for Maximum Impact</h2>
            <p className="text-slate-400 text-xs sm:text-sm">We provide the technical tools to pass recruiters and ATS filters cleanly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl hover:border-blue-500/30 hover:bg-slate-900/60 transition-all duration-300 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">AI STAR Bullet Optimizer</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Refine generic job duty statements into action-oriented statements focused on Situation, Task, Action, and measurable Results.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all duration-300 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Section Management Settings</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Reorder your layout stack (Experience, Projects, Education, Certifications) instantly and hide/show sections as needed per application.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl hover:border-purple-500/30 hover:bg-slate-900/60 transition-all duration-300 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Client-side PDF Exporter</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Export to Standard A4 PDF documents directly in the client. No server side rendering latency, resulting in sub-second downloads.
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Footer Branding */}
      <footer className="border-t border-slate-900/60 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} AI Resume Builder. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
