'use client';

import React, { useState, useEffect } from 'react';
import { fetchResumeAnalytics } from '@/app/dashboard/actions';
import { 
  Activity, 
  Eye, 
  Download, 
  Calendar, 
  FileText, 
  Loader2,
  TrendingUp
} from 'lucide-react';

interface AnalyticsClientProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function AnalyticsClient({ showToast }: AnalyticsClientProps) {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchResumeAnalytics()
      .then((data) => {
        if (active) {
          setAnalytics(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          showToast('Failed to load resume analytics', 'error');
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const totalViews = analytics.reduce((sum, item) => sum + (item.view_count || 0), 0);
  const totalDownloads = analytics.reduce((sum, item) => sum + (item.download_count || 0), 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          Resume Analytics Suite
        </h2>
        <p className="text-slate-400 text-xxs leading-relaxed mt-1">
          Monitor access metrics, view counts, and total downloads across all active resume layout variants.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-2">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-500">Loading metrics data...</span>
        </div>
      ) : (
        <>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* KPI 1: Views */}
            <div className="p-6 bg-slate-900/30 border border-slate-900 rounded-2xl flex items-center gap-4 hover:border-blue-500/20 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Eye className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Cumulative Document Views</span>
                <h3 className="text-2xl font-black text-white">{totalViews}</h3>
              </div>
            </div>

            {/* KPI 2: Downloads */}
            <div className="p-6 bg-slate-900/30 border border-slate-900 rounded-2xl flex items-center gap-4 hover:border-indigo-500/20 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Download className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total PDF Downloads</span>
                <h3 className="text-2xl font-black text-white">{totalDownloads}</h3>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 overflow-hidden">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-900 pb-3">
              <TrendingUp className="w-4.5 h-4.5 text-blue-400" />
              Document Access Details
            </h3>

            {analytics.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No active resume variants to track. Generate a resume draft first.
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="pb-3 pr-4">Resume Title</th>
                      <th className="pb-3 px-4 text-center">Views</th>
                      <th className="pb-3 px-4 text-center">Downloads</th>
                      <th className="pb-3 px-4">Last Viewed</th>
                      <th className="pb-3 pl-4">Last Downloaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300 font-light">
                    {analytics.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5 pr-4 font-semibold text-slate-200 flex items-center gap-2 max-w-[200px] truncate">
                          <FileText className="w-4 h-4 text-blue-500/70 shrink-0" />
                          {item.resumes?.title || 'Untitled Resume'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-200">{item.view_count || 0}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-200">{item.download_count || 0}</td>
                        <td className="py-3.5 px-4 text-slate-400 flex-wrap gap-1 font-mono text-[10px]">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-600" /> {formatDate(item.last_viewed_at)}</span>
                        </td>
                        <td className="py-3.5 pl-4 text-slate-400 font-mono text-[10px]">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-600" /> {formatDate(item.last_downloaded_at)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
