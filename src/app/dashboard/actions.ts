'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createResume(templateId: string = 'modern-minimalist', title: string = 'My Professional Resume') {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile to prefill default contact information
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  console.log('Inserting resume into database for user:', user.id);
  
  try {
    const response = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        title,
        template_id: templateId,
        resume_data: {
          personalInfo: {
            fullName: profile?.full_name || '',
            title: '',
            email: profile?.email || user.email || '',
            phone: '',
            location: '',
            linkedin: '',
            github: '',
            portfolio: '',
            summary: '',
          },
          workExperience: [],
          education: [],
          projects: [],
          skills: {
            technicalSkills: [],
            softSkills: [],
          },
          certificates: [],
          achievements: [],
          templateId,
          sectionOrder: [
            'personalInfo',
            'workExperience',
            'education',
            'projects',
            'skills',
            'certificates',
            'achievements',
          ],
          visibleSections: {
            personalInfo: true,
            workExperience: true,
            education: true,
            projects: true,
            skills: true,
            certificates: true,
            achievements: true,
          },
          status: 'draft',
        },
      })
      .select('id')
      .single();

    console.log('Supabase insert response:', JSON.stringify(response, null, 2));

    const { data: newResume, error } = response;

    if (error || !newResume) {
      console.error('Error creating resume record in DB:', error);
      return { success: false, error: error?.message || 'Failed to create resume record in database' };
    }

    revalidatePath('/dashboard');
    return { success: true, id: newResume.id };
  } catch (err: any) {
    console.error('Unexpected exception during resume creation:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred on the server' };
  }
}

export async function deleteResume(resumeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { error } = await supabase
    .from('resumes')
    .delete()
    .eq('id', resumeId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting resume:', error);
    throw new Error('Failed to delete resume');
  }

  revalidatePath('/dashboard');
}
