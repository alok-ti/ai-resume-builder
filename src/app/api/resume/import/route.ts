import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import mammoth from 'mammoth';
import crypto from 'crypto';
import { parseResume } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let rawText = '';
    let title = 'Imported Resume';
    let resumeId: string | null = null;
    let fileType = '';
    let parsingStatus = 'success';

    if (contentType.includes('application/json')) {
      try {
        const body = await request.json();
        rawText = body.text || '';
        resumeId = body.resumeId || null;
        title = body.title || 'Pasted Resume';
        fileType = 'txt';
      } catch (err) {
        console.error('JSON parsing error:', err);
        parsingStatus = 'failed';
      }
    } else {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        resumeId = (formData.get('resumeId') as string) || null;

        if (file) {
          const cleanFileName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
          title = `Imported Resume - ${cleanFileName}`;
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          fileType = file.name.split('.').pop()?.toLowerCase() || '';

          try {
            if (fileType === 'txt') {
              rawText = buffer.toString('utf-8');
            } else if (fileType === 'docx') {
              const result = await mammoth.extractRawText({ buffer });
              rawText = result.value;
            } else if (fileType === 'pdf') {
              const pdfParseModule = (await import('pdf-parse')) as any;
              const pdf = pdfParseModule.default || pdfParseModule;
              const data = await pdf(buffer);
              rawText = data.text;
            } else {
              parsingStatus = 'failed';
            }
          } catch (parseError: any) {
            console.error('Document parsing error:', parseError);
            parsingStatus = 'failed';
          }
        } else {
          parsingStatus = 'failed';
        }
      } catch (err) {
        console.error('FormData parsing error:', err);
        parsingStatus = 'failed';
      }
    }

    if (!rawText || rawText.trim().length < 50) {
      parsingStatus = 'failed';
    }

    // 2. Fetch profile to prefill contact information
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 3. Parse resume content using Gemini (or mock fallback)
    let parsedData = null;
    if (parsingStatus !== 'failed' && rawText) {
      try {
        parsedData = await parseResume(rawText);
        if (!parsedData) {
          parsingStatus = 'failed';
        }
      } catch (parseErr: any) {
        console.error('Failed parsing resume text:', parseErr);
        parsingStatus = 'failed';
      }
    }

    const templateId = 'modern-minimalist';

    // Helper to validate URLs
    const cleanUrl = (url: any): string => {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      if (!trimmed) return '';
      try {
        new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
        return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      } catch {
        return '';
      }
    };

    // Helper to ensure names have min length
    let fullName = parsedData?.personalInfo?.fullName || profile?.full_name || '';
    if (fullName.trim().length < 2) {
      fullName = profile?.full_name || user.email?.split('@')[0] || 'Resume Owner';
    }

    // Helper to ensure email is valid format
    let email = parsedData?.personalInfo?.email || '';
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        email = profile?.email || user.email || '';
      }
    } else {
      email = profile?.email || user.email || '';
    }

    const personalInfo = {
      fullName,
      title: parsedData?.personalInfo?.title || '',
      email,
      phone: parsedData?.personalInfo?.phone || '',
      location: parsedData?.personalInfo?.location || '',
      linkedin: cleanUrl(parsedData?.personalInfo?.linkedin),
      github: cleanUrl(parsedData?.personalInfo?.github),
      portfolio: cleanUrl(parsedData?.personalInfo?.portfolio),
      summary: parsedData?.personalInfo?.summary || rawText,
    };

    // Format workExperience (generating IDs and wrapping descriptions in HTML tags)
    const workExperience = (parsedData?.workExperience || []).map((exp: any) => {
      const bulletArr = Array.isArray(exp.description) ? exp.description : [];
      const htmlDesc = bulletArr.length > 0
        ? `<ul>${bulletArr.map((b: string) => `<li>${b}</li>`).join('')}</ul>`
        : exp.description || '<ul><li></li></ul>';
      return {
        id: crypto.randomUUID(),
        company: exp.company || 'Company/Organization',
        position: exp.position || 'Position/Role',
        location: exp.location || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        current: !!exp.current,
        description: htmlDesc,
      };
    });

    // Format education
    const education = (parsedData?.education || []).map((edu: any) => ({
      id: crypto.randomUUID(),
      school: edu.school || 'School/University',
      degree: edu.degree || 'Degree/Certificate',
      fieldOfStudy: edu.fieldOfStudy || '',
      location: edu.location || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      current: !!edu.current,
      description: edu.description || '',
    }));

    // Format projects
    const projects = (parsedData?.projects || []).map((proj: any) => ({
      id: crypto.randomUUID(),
      projectName: proj.projectName || 'Project Name',
      description: proj.description || '',
      technologies: proj.technologies || '',
      githubUrl: cleanUrl(proj.githubUrl),
      liveUrl: cleanUrl(proj.liveUrl),
    }));

    // Format skills
    const skills = {
      technicalSkills: Array.isArray(parsedData?.skills?.technicalSkills) ? parsedData.skills.technicalSkills : [],
      softSkills: Array.isArray(parsedData?.skills?.softSkills) ? parsedData.skills.softSkills : [],
    };

    // Format certificates
    const certificates = (parsedData?.certificates || []).map((cert: any) => ({
      id: crypto.randomUUID(),
      name: cert.name || 'Certificate Name',
      issuer: cert.issuer || '',
      date: cert.date || '',
      url: cleanUrl(cert.url),
    }));

    // Format achievements (empty default or map if returned)
    const achievements = (parsedData?.achievements || []).map((ach: any) => ({
      id: crypto.randomUUID(),
      title: ach.title || 'Achievement Title',
      date: ach.date || '',
      description: ach.description || '',
    }));

    // Format languages -> custom section starting with custom_
    const customSections: Record<string, any> = {};
    const sectionOrder = [
      'personalInfo',
      'workExperience',
      'education',
      'projects',
      'skills',
      'certificates',
      'achievements',
    ];
    const visibleSections: Record<string, boolean> = {
      personalInfo: true,
      workExperience: true,
      education: true,
      projects: true,
      skills: true,
      certificates: true,
      achievements: true,
    };

    const parsedLanguages = parsedData?.languages || [];
    if (parsedLanguages.length > 0) {
      const customLangId = `custom_languages`;
      customSections[customLangId] = {
        id: customLangId,
        title: 'Languages',
        items: parsedLanguages.map((lang: any, idx: number) => ({
          id: `lang_${idx}`,
          title: lang.language || 'Language',
          subtitle: lang.proficiency || '',
          date: '',
          description: '',
        })),
      };
      sectionOrder.push(customLangId);
      visibleSections[customLangId] = true;
    }

    const resumeData = {
      personalInfo,
      workExperience,
      education,
      projects,
      skills,
      certificates,
      achievements,
      templateId,
      sectionOrder,
      visibleSections,
      customSections,
      status: 'draft',
    };

    let targetResumeId = resumeId;
    if (targetResumeId) {
      const { error: updateError } = await supabase
        .from('resumes')
        .update({
          title,
          resume_data: resumeData,
        })
        .eq('id', targetResumeId);

      if (updateError) {
        console.error('Error updating resume in retry flow:', updateError);
        return NextResponse.json({ error: `Failed to save resume: ${updateError.message}` }, { status: 500 });
      }
    } else {
      const { data: newResume, error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title,
          template_id: templateId,
          resume_data: resumeData,
        })
        .select('id')
        .single();

      if (insertError || !newResume) {
        console.error('Error inserting imported resume:', insertError);
        return NextResponse.json({ error: `Failed to save resume: ${insertError?.message || 'Database error'}` }, { status: 500 });
      }
      targetResumeId = newResume.id;
    }

    // Call save_complete_resume RPC to sync relational tables
    try {
      const { error: rpcError } = await supabase.rpc('save_complete_resume', {
        p_resume_id: targetResumeId,
        p_title: title,
        p_template_id: templateId,
        p_resume_data: resumeData,
        p_experiences: workExperience.map((exp: any, index: number) => {
          const originalExp = parsedData?.workExperience?.[index];
          const descBullets = originalExp && Array.isArray(originalExp.description) ? originalExp.description : [];
          return {
            company: exp.company,
            position: exp.position,
            startDate: exp.startDate,
            endDate: exp.endDate,
            description: descBullets
          };
        }),
        p_educations: education.map((edu: any) => ({
          school: edu.school,
          degree: edu.degree,
          startDate: edu.startDate,
          endDate: edu.endDate
        })),
        p_projects: projects.map((proj: any) => ({
          projectName: proj.projectName,
          description: proj.description,
          technologies: proj.technologies,
          githubUrl: proj.githubUrl,
          liveUrl: proj.liveUrl
        })),
        p_skills: [
          ...skills.technicalSkills.map((sk: string) => ({ skillName: sk, category: 'technical' })),
          ...skills.softSkills.map((sk: string) => ({ skillName: sk, category: 'soft' })),
        ],
      });
      if (rpcError) {
        console.error('Syncing relational tables via RPC failed:', rpcError);
      }
    } catch (rpcErr) {
      console.error('RPC invocation error:', rpcErr);
    }

    revalidatePath('/dashboard');
    return NextResponse.json({
      success: true,
      resumeId: targetResumeId,
      parsingStatus
    });
  } catch (error: any) {
    console.error('Resume import route error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred during resume import' }, { status: 500 });
  }
}
