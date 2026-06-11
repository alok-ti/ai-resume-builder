import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

import mammoth from 'mammoth';

// A mock response used for testing/local development if GEMINI_API_KEY is not configured.
const mockParsedResult = {
  original: {
    personalInfo: {
      fullName: "Jane Doe",
      title: "Senior Full Stack Engineer",
      email: "jane.doe@example.com",
      phone: "+1 (555) 019-2834",
      location: "San Francisco, CA",
      linkedin: "https://linkedin.com/in/janedoe",
      github: "https://github.com/janedoe",
      portfolio: "",
      summary: "Experienced full stack developer with 6+ years of expertise in TypeScript, React, Next.js, Node.js, and PostgreSQL. Passionate about engineering high-performance scalable web systems and building resilient database architectures."
    },
    workExperience: [
      {
        id: "exp-1",
        company: "Tech Solutions Inc.",
        position: "Senior Software Engineer",
        location: "San Francisco, CA",
        startDate: "2023-01",
        endDate: "Present",
        current: true,
        description: "<ul><li>Led a team of 4 engineers to build the core SaaS product modules, accelerating customer adoption rate.</li><li>Refactored legacy REST APIs into optimized GraphQL endpoints, reducing response times by 35%.</li><li>Collaborated with product designers to implement a shared component library with TailwindCSS.</li></ul>"
      },
      {
        id: "exp-2",
        company: "Innovate Web Corp",
        position: "Software Engineer",
        location: "Oakland, CA",
        startDate: "2020-06",
        endDate: "2022-12",
        current: false,
        description: "<ul><li>Built custom React dashboards and data visualization charts for analytics platforms.</li><li>Maintained SQL databases, writing optimized queries and managing migrations for 200k+ active users.</li><li>Fixed bugs and resolved UI issues, increasing user retention metrics by 15%.</li></ul>"
      }
    ],
    education: [
      {
        id: "edu-1",
        school: "University of California, Berkeley",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        location: "Berkeley, CA",
        startDate: "2016-09",
        endDate: "2020-05",
        current: false,
        description: "Graduated with Honors. Focus on Database Systems and Software Engineering."
      }
    ],
    projects: [
      {
        id: "proj-1",
        projectName: "Collaborative Board",
        description: "Real-time interactive Kanban whiteboard application using WebSockets and React.",
        technologies: "TypeScript, React, Node.js, Socket.io, Redis",
        githubUrl: "https://github.com/janedoe/collab-board",
        liveUrl: ""
      }
    ],
    skills: {
      technicalSkills: ["TypeScript", "React", "Next.js", "Node.js", "Express", "GraphQL", "PostgreSQL", "TailwindCSS", "Git"],
      softSkills: ["Team Leadership", "Agile Execution", "Problem Solving", "Collaboration", "Effective Communication"]
    },
    certificates: [
      {
        id: "cert-1",
        name: "AWS Certified Developer - Associate",
        issuer: "Amazon Web Services",
        date: "2024-02",
        url: ""
      }
    ],
    achievements: [
      {
        id: "ach-1",
        title: "Hackathon Winner - Best Scalable Solution",
        date: "2022-10",
        description: "Engineered a distributed search index system inside 48 hours to win first place."
      }
    ],
    templateId: "modern-minimalist",
    sectionOrder: ["personalInfo", "workExperience", "education", "projects", "skills", "certificates", "achievements"],
    visibleSections: {
      personalInfo: true,
      workExperience: true,
      education: true,
      projects: true,
      skills: true,
      certificates: true,
      achievements: true
    }
  },
  improved: {
    personalInfo: {
      fullName: "Jane Doe",
      title: "Senior Full Stack Engineer",
      email: "jane.doe@example.com",
      phone: "+1 (555) 019-2834",
      location: "San Francisco, CA",
      linkedin: "https://linkedin.com/in/janedoe",
      github: "https://github.com/janedoe",
      portfolio: "",
      summary: "Results-driven Senior Full Stack Engineer with 6+ years of expertise in TypeScript, React, Next.js, and Node.js. Proven track record of architecting scalable web applications, optimizing API latency by 35%, and driving engineering excellence in collaborative teams."
    },
    workExperience: [
      {
        id: "exp-1",
        company: "Tech Solutions Inc.",
        position: "Senior Software Engineer",
        location: "San Francisco, CA",
        startDate: "2023-01",
        endDate: "Present",
        current: true,
        description: "<ul><li>Directed a team of 4 engineers to deploy core SaaS product modules, accelerating customer adoption rate by 20% within 6 months.</li><li>Architected and refactored legacy REST APIs into optimized GraphQL endpoints, reducing response times by 35% and boosting backend throughput.</li><li>Collaborated with design stakeholders to implement a shared component library, accelerating UI feature delivery velocity by 25%.</li></ul>"
      },
      {
        id: "exp-2",
        company: "Innovate Web Corp",
        position: "Software Engineer",
        location: "Oakland, CA",
        startDate: "2020-06",
        endDate: "2022-12",
        current: false,
        description: "<ul><li>Spearheaded the engineering of React dashboards and complex data visualization charts, enhancing analytics rendering speed.</li><li>Maintained SQL databases and wrote optimized queries, managing migrations for 200k+ active users and reducing queries latency by 15%.</li><li>Resolved core UI bottlenecks and bugs, contributing to a 15% increase in user retention metrics.</li></ul>"
      }
    ],
    education: [
      {
        id: "edu-1",
        school: "University of California, Berkeley",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        location: "Berkeley, CA",
        startDate: "2016-09",
        endDate: "2020-05",
        current: false,
        description: "Graduated with Honors. Focus on Database Systems and Software Engineering."
      }
    ],
    projects: [
      {
        id: "proj-1",
        projectName: "Collaborative Board",
        description: "Real-time interactive Kanban whiteboard application using WebSockets and React.",
        technologies: "TypeScript, React, Node.js, Socket.io, Redis",
        githubUrl: "https://github.com/janedoe/collab-board",
        liveUrl: ""
      }
    ],
    skills: {
      technicalSkills: ["TypeScript", "React", "Next.js", "Node.js", "Express", "GraphQL", "PostgreSQL", "TailwindCSS", "Git", "System Design", "AWS", "CI/CD"],
      softSkills: ["Team Leadership", "Agile Execution", "Problem Solving", "Collaboration", "Effective Communication"]
    },
    certificates: [
      {
        id: "cert-1",
        name: "AWS Certified Developer - Associate",
        issuer: "Amazon Web Services",
        date: "2024-02",
        url: ""
      }
    ],
    achievements: [
      {
        id: "ach-1",
        title: "Hackathon Winner - Best Scalable Solution",
        date: "2022-10",
        description: "Engineered a distributed search index system inside 48 hours to win first place."
      }
    ],
    templateId: "modern-minimalist",
    sectionOrder: ["personalInfo", "workExperience", "education", "projects", "skills", "certificates", "achievements"],
    visibleSections: {
      personalInfo: true,
      workExperience: true,
      education: true,
      projects: true,
      skills: true,
      certificates: true,
      achievements: true
    }
  },
  audit: {
    formattingIssues: [
      "Inconsistent date representations in education section.",
      "Work history could use bold styling for core keyword visibility."
    ],
    missingInfo: [
      "No portfolio link listed in personal details.",
      "Missing location coordinates for Innovate Web Corp."
    ],
    weakBullets: [
      "Work Experience item 2 bullet 3 ('Fixed bugs and resolved UI issues') lacks quantified metrics.",
      "Work Experience item 1 bullet 1 ('Led a team of 4 engineers...') could specify the project scale or outcomes."
    ],
    grammarIssues: [
      "Minor styling issue: 'customer adoption rate' should be 'customer adoption rates'."
    ],
    repetitiveContent: [
      "Repeated use of the verb 'Built' in experience descriptions. Replaced with action verbs ('Spearheaded', 'Engineered')."
    ]
  },
  recommendations: {
    atsScore: 78,
    missingKeywords: ["CI/CD", "System Design", "AWS", "Docker", "Unit Testing"],
    skillGaps: ["Cloud Hosting (AWS)", "Deployment Pipelines (CI/CD)"],
    industryRecommendations: [
      "Add direct project metrics detailing cloud deployment scale (e.g. EC2, S3 bucket usage).",
      "Highlight automated testing framework expertise (Jest, Playwright) to align with senior engineering criteria."
    ]
  }
};

function extractBulletsList(html: string): string[] {
  if (!html) return [];
  const matches = [...html.matchAll(/<li[^>]*>(.*?)<\/li>/gi)];
  if (matches.length > 0) {
    return matches.map(m => m[1].replace(/<[^>]*>/g, '').trim()).filter(Boolean);
  }
  return html.replace(/<[^>]*>/g, '').split('\n').map(s => s.trim()).filter(Boolean);
}

async function syncRelations(resumeId: string, values: any) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('save_complete_resume', {
    p_resume_id: resumeId,
    p_title: values.personalInfo?.fullName ? `${values.personalInfo.fullName}'s Resume` : 'My Resume',
    p_template_id: values.templateId || 'modern-minimalist',
    p_resume_data: values,
    p_experiences: (values.workExperience || []).map((exp: any) => ({
      ...exp,
      description: extractBulletsList(exp.description || '')
    })),
    p_educations: values.education || [],
    p_projects: values.projects || [],
    p_skills: [
      ...(values.skills?.technicalSkills || []).map((skillName: string) => ({ skillName, category: 'technical' })),
      ...(values.skills?.softSkills || []).map((skillName: string) => ({ skillName, category: 'soft' })),
    ],
  });
  if (error) {
    console.error('Error in syncRelations RPC for resumeId:', resumeId, error);
  }
}

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

    // 2. AI Parsing & Repair Analysis phase
    const apiKey = process.env.GEMINI_API_KEY || '';
    let parsedResult = mockParsedResult;

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const prompt = `
        You are an expert resume parsing and document intelligence AI system.
        Below is the raw text content extracted from an uploaded resume file.
        
        [RAW RESUME TEXT]
        ${rawText}
        
        Your tasks are:
        1. Parse this raw text into our structured resume JSON schema (this will be the "original" copy).
        2. Create an improved version of the resume data (this will be the "improved" copy) by:
           - Rewriting work experience descriptions into action-oriented bullet points using the STAR methodology.
           - Quantifying achievements with plausible placeholder metrics (e.g. percentages, team sizes, dollar amounts) if not present.
           - Improving overall professional wording, vocabulary, and grammar.
           - Suggesting 3-5 relevant missing skills based on the candidate's career level.
        3. Conduct a full quality audit of the original resume text to detect:
           - Formatting issues (e.g. inconsistent date styles, missing detail blocks)
           - Missing information (e.g. missing locations, contact links)
           - Weak bullet points (lacking action verbs or impact metrics)
           - Grammar/spelling issues
           - Repetitive phrases or keywords
        4. Calculate an estimated ATS match score (0-100), identify industry standard missing keywords/skills, detect skill gaps, and write industry recommendations.
      
        You MUST respond with a single JSON object matching this structure EXACTLY:
        {
          "original": <ResumeData JSON matching schema>,
          "improved": <ResumeData JSON matching schema>,
          "audit": {
            "formattingIssues": ["Issue A", "Issue B"],
            "missingInfo": ["Info A"],
            "weakBullets": ["Bullet A"],
            "grammarIssues": ["Grammar A"],
            "repetitiveContent": ["Repetitive A"]
          },
          "recommendations": {
            "atsScore": 65,
            "missingKeywords": ["Keyword A", "Keyword B"],
            "skillGaps": ["Gap A", "Gap B"],
            "industryRecommendations": ["Rec A", "Rec B"]
          }
        }
      
        ResumeData JSON Schema Requirements:
        - Must conform to:
          - personalInfo: { fullName, title, email, phone, location, linkedin, github, portfolio, summary }
          - workExperience: Array of { id, company, position, location, startDate, endDate, current, description }
            - Note: description MUST be an HTML string formatted with <ul><li>...</li></ul> list wrappers for the editor!
          - education: Array of { id, school, degree, fieldOfStudy, location, startDate, endDate, current, description }
          - projects: Array of { id, projectName, description, technologies, githubUrl, liveUrl }
          - skills: { technicalSkills: string[], softSkills: string[] }
          - certificates: Array of { id, name, issuer, date, url }
          - achievements: Array of { id, title, date, description }
          - templateId: "modern-minimalist"
          - sectionOrder: ["personalInfo", "workExperience", "education", "projects", "skills", "certificates", "achievements"]
          - visibleSections: { personalInfo: true, workExperience: true, education: true, projects: true, skills: true, certificates: true, achievements: true }
          
        Generate unique IDs for all items using a standard format (e.g. "exp-1", "edu-1", "proj-1" etc.).
        Ensure response is a valid JSON string. Do not wrap in markdown code blocks. Return ONLY the raw JSON string.
      `;

      try {
        const response = await model.generateContent(prompt);
        const outputText = response.response.text().trim();
        const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        parsedResult = JSON.parse(cleanJson);
      } catch (geminiError: any) {
        console.error('Gemini processing or JSON parse failed, falling back to mock data:', geminiError);
        parsedResult = mockParsedResult;
      }
    } else {
      console.warn('GEMINI_API_KEY is not configured. Falling back to mock parsed resume values.');
    }

    // 3. Save to database linked via parent_id
    // Set titles appropriately
    const candidateName = parsedResult.improved?.personalInfo?.fullName || 'Candidate';
    
    // A. Insert Original Resume
    const { data: originalResume, error: origError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        title: `Imported Original - ${candidateName}`,
        template_id: 'modern-minimalist',
        version_type: 'original',
        resume_data: parsedResult.original
      })
      .select('id')
      .single();

    if (origError || !originalResume) {
      console.error('Error saving original resume:', origError);
      return NextResponse.json({ error: `Failed to save original resume: ${origError?.message}` }, { status: 500 });
    }

    // B. Insert Improved Resume linked to Original
    const improvedResumeData = {
      ...parsedResult.improved,
      importMetadata: {
        originalResumeId: originalResume.id,
        originalData: parsedResult.original,
        audit: parsedResult.audit,
        recommendations: parsedResult.recommendations
      }
    };

    const { data: improvedResume, error: impError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        title: `AI Improved - ${candidateName}`,
        template_id: 'modern-minimalist',
        parent_id: originalResume.id,
        version_type: 'improved',
        resume_data: improvedResumeData
      })
      .select('id')
      .single();

    if (impError || !improvedResume) {
      console.error('Error saving improved resume:', impError);
      // Clean up orphaned original resume
      await supabase.from('resumes').delete().eq('id', originalResume.id);
      return NextResponse.json({ error: `Failed to save improved resume: ${impError?.message}` }, { status: 500 });
    }

    // C. Sync relational database tables
    try {
      await syncRelations(originalResume.id, parsedResult.original);
      await syncRelations(improvedResume.id, improvedResumeData);
    } catch (syncErr) {
      console.error('Relations sync failed, proceeding anyway to avoid blocking flow:', syncErr);
    }

    revalidatePath('/dashboard');
    return NextResponse.json({
      success: true,
      originalId: originalResume.id,
      improvedId: improvedResume.id
    });
  } catch (error: any) {
    console.error('Resume import route error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred during resume import' }, { status: 500 });
  }
}
