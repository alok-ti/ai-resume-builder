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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No resume file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    let rawText = '';
    
    // 1. Text Extraction phase based on file extension
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
        return NextResponse.json({ error: 'Unsupported file extension. Please upload a PDF, DOCX or TXT file.' }, { status: 400 });
      }
    } catch (parseError: any) {
      console.error('Document parsing error:', parseError);
      return NextResponse.json({ error: `Failed to extract text from file: ${parseError.message || parseError}` }, { status: 500 });
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json({ error: 'Successfully read file, but extracted text content is too short to parse.' }, { status: 400 });
    }

    // 2. Fetch profile to prefill contact information
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 3. Parse resume content using Gemini (or mock fallback)
    let parsedData;
    try {
      parsedData = await parseResume(rawText);
    } catch (parseErr: any) {
      console.error('Failed parsing resume text:', parseErr);
      parsedData = null;
    }

    const templateId = 'modern-minimalist';
    const cleanFileName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
    const title = `Imported Resume - ${cleanFileName}`;

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

    const { data: newResume, error: insertError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        title,
        template_id: templateId,
        version_type: 'original',
        resume_data: resumeData,
      })
      .select('id')
      .single();

    if (insertError || !newResume) {
      console.error('Error inserting imported resume:', insertError);
      return NextResponse.json({ error: `Failed to save resume: ${insertError?.message || 'Database error'}` }, { status: 500 });
    }

    // Call save_complete_resume RPC to sync relational tables
    try {
      const { error: rpcError } = await supabase.rpc('save_complete_resume', {
        p_resume_id: newResume.id,
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
      resumeId: newResume.id
    });
  } catch (error: any) {
    console.error('Resume import route error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred during resume import' }, { status: 500 });
  }
}
