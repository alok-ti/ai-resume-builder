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

function serverHtmlToBullets(html: string): string[] {
  if (!html) return [];
  const matches = [...html.matchAll(/<li[^>]*>(.*?)<\/li>/gi)];
  if (matches.length > 0) {
    return matches.map(m => m[1].replace(/<[^>]*>/g, '').trim()).filter(Boolean);
  }
  return html.replace(/<[^>]*>/g, '').split('\n').map(s => s.trim()).filter(Boolean);
}

export async function duplicateResume(resumeId: string, titleSuffix: string = 'Copy', parentResumeId?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch original resume
  const { data: original, error: fetchError } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', resumeId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !original) {
    console.error('Failed to fetch resume to duplicate:', fetchError);
    return { success: false, error: 'Original resume not found' };
  }

  const newTitle = `${original.title} (${titleSuffix})`;
  
  // Clone the resume_data object and remove version/history tags or keep them clean
  const clonedData = { ...original.resume_data };
  if (clonedData.history) {
    clonedData.history = []; // Clear history for the duplicate to start fresh
  }
  if (parentResumeId) {
    clonedData.parentResumeId = parentResumeId;
  } else {
    // If the original has a parent, preserve it. If not, the original's ID is the parent.
    clonedData.parentResumeId = original.resume_data?.parentResumeId || original.id;
  }
  
  try {
    // 2. Insert duplicated resume
    const { data: newResume, error: insertError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        title: newTitle,
        template_id: original.template_id,
        resume_data: clonedData,
      })
      .select('id')
      .single();

    if (insertError || !newResume) {
      console.error('Error duplicating resume root:', insertError);
      return { success: false, error: insertError?.message || 'Failed to insert duplicated resume' };
    }

    // 3. Populate relational details using RPC
    const values = clonedData;
    const { error: syncError } = await supabase.rpc('save_complete_resume', {
      p_resume_id: newResume.id,
      p_title: newTitle,
      p_template_id: original.template_id,
      p_resume_data: clonedData,
      p_experiences: (values.workExperience || []).map((exp: any) => ({
        ...exp,
        description: serverHtmlToBullets(exp.description || '')
      })),
      p_educations: values.education || [],
      p_projects: values.projects || [],
      p_skills: [
        ...(values.skills?.technicalSkills || []).map((skillName: string) => ({ skillName, category: 'technical' })),
        ...(values.skills?.softSkills || []).map((skillName: string) => ({ skillName, category: 'soft' })),
      ],
    });

    if (syncError) {
      console.error('Error syncing duplicated relations:', syncError);
    }

    revalidatePath('/dashboard');
    return { success: true, id: newResume.id };
  } catch (err: any) {
    console.error('Duplication failed:', err);
    return { success: false, error: err.message || 'An unexpected error occurred during duplication' };
  }
}

