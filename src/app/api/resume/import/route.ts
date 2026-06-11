import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import mammoth from 'mammoth';

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

    // 3. Create standard resume document with the extracted raw text inside the summary
    const templateId = 'modern-minimalist';
    const cleanFileName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
    const title = `Imported Resume - ${cleanFileName}`;

    const { data: newResume, error: insertError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        title,
        template_id: templateId,
        version_type: 'original',
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
            summary: rawText,
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

    if (insertError || !newResume) {
      console.error('Error inserting imported resume:', insertError);
      return NextResponse.json({ error: `Failed to save resume: ${insertError?.message || 'Database error'}` }, { status: 500 });
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
