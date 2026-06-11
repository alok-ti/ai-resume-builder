'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function fetchJobApplications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('job_applications')
    .select('*, resumes(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching job applications:', error);
    return [];
  }

  return data || [];
}

export async function createJobApplication(payload: {
  company: string;
  position: string;
  status?: string;
  salary?: string;
  jobUrl?: string;
  notes?: string;
  resumeId?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      user_id: user.id,
      company: payload.company,
      position: payload.position,
      status: payload.status || 'applied',
      salary: payload.salary || '',
      job_url: payload.jobUrl || '',
      notes: payload.notes || '',
      resume_id: payload.resumeId || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating job application:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true, id: data.id };
}

export async function updateJobApplicationStatus(id: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { error } = await supabase
    .from('job_applications')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating job application status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateJobApplication(id: string, payload: {
  company?: string;
  position?: string;
  status?: string;
  salary?: string;
  jobUrl?: string;
  notes?: string;
  resumeId?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { error } = await supabase
    .from('job_applications')
    .update({
      company: payload.company,
      position: payload.position,
      status: payload.status,
      salary: payload.salary,
      job_url: payload.jobUrl,
      notes: payload.notes,
      resume_id: payload.resumeId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating job application details:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteJobApplication(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { error } = await supabase
    .from('job_applications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting job application:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
