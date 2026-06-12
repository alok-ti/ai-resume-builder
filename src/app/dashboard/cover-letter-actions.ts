'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function fetchCoverLetters() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('cover_letters')
    .select('*, resumes(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cover letters:', error);
    return [];
  }

  return data || [];
}

export async function createCoverLetter(payload: {
  resumeId?: string;
  title: string;
  recipientName?: string;
  recipientTitle?: string;
  companyName: string;
  jobTitle: string;
  letterBody: string;
  style?: string;
  tone?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('cover_letters')
    .insert({
      user_id: user.id,
      resume_id: payload.resumeId || null,
      title: payload.title || 'Tailored Cover Letter',
      recipient_name: payload.recipientName || '',
      recipient_title: payload.recipientTitle || '',
      company_name: payload.companyName,
      job_title: payload.jobTitle,
      letter_body: payload.letterBody,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating cover letter:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true, id: data.id };
}

export async function updateCoverLetter(id: string, payload: {
  resumeId?: string;
  title?: string;
  recipientName?: string;
  recipientTitle?: string;
  companyName?: string;
  jobTitle?: string;
  letterBody?: string;
  style?: string;
  tone?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { error } = await supabase
    .from('cover_letters')
    .update({
      resume_id: payload.resumeId !== undefined ? (payload.resumeId || null) : undefined,
      title: payload.title,
      recipient_name: payload.recipientName,
      recipient_title: payload.recipientTitle,
      company_name: payload.companyName,
      job_title: payload.jobTitle,
      letter_body: payload.letterBody,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating cover letter:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteCoverLetter(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { error } = await supabase
    .from('cover_letters')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting cover letter:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function duplicateCoverLetter(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: original, error: fetchError } = await supabase
    .from('cover_letters')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !original) {
    return { success: false, error: 'Cover letter not found' };
  }

  const { data: newLetter, error: insertError } = await supabase
    .from('cover_letters')
    .insert({
      user_id: user.id,
      resume_id: original.resume_id || null,
      title: `${original.title} (Copy)`,
      recipient_name: original.recipient_name || '',
      recipient_title: original.recipient_title || '',
      company_name: original.company_name,
      job_title: original.job_title,
      letter_body: original.letter_body,
    })
    .select('id')
    .single();

  if (insertError || !newLetter) {
    console.error('Error duplicating cover letter:', insertError);
    return { success: false, error: insertError?.message || 'Duplication failed' };
  }

  revalidatePath('/dashboard');
  return { success: true, id: newLetter.id };
}
