import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardListClient } from './dashboard-list-client';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // 1. Verify User Authentication is available
  if (authError || !user) {
    console.error('User Authentication Session check failed:', authError);
    redirect('/login');
  }

  // 2. Fetch user resumes list
  const { data: rawResumes, error: fetchError } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (fetchError) {
    console.error('CRITICAL DATABASE FETCH ERROR in resumes query:', {
      message: fetchError.message,
      details: fetchError.details,
      hint: fetchError.hint,
      code: fetchError.code,
    });
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white px-4 text-center">
        <h2 className="text-red-500 text-lg font-bold">Database Query Error (Fetch)</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-lg font-mono bg-slate-900 border border-slate-800 p-4 rounded-xl">
          Code: {fetchError.code} | {fetchError.message}
        </p>
      </div>
    );
  }

  // 3. Fetch user profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <DashboardListClient
      resumes={rawResumes || []}
      profile={profile}
      userEmail={user.email}
    />
  );
}
