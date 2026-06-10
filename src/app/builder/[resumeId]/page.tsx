import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BuilderClient } from './builder-client';

interface BuilderPageProps {
  params: Promise<{
    resumeId: string;
  }>;
}

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { resumeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('User Authentication check failed for builder route:', authError);
    redirect('/login');
  }

  // Fetch the specific resume owned by the current user
  const { data: resume, error: fetchError } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', resumeId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !resume) {
    console.error('Resume access check failed or not found:', fetchError);
    redirect('/dashboard');
  }

  // Fetch user profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <BuilderClient
      resumeId={resume.id}
      initialData={resume}
      userEmail={user.email}
      profile={profile}
    />
  );
}
