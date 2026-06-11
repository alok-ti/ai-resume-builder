import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Professional Summary Generator
 */
export async function generateSummary(title: string, skills: string[], experience: any[]): Promise<string> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for summary generation.");
    const skillsSnippet = skills.length > 0 ? skills.slice(0, 4).join(', ') : 'software development and engineering principles';
    const companySnippet = experience.length > 0 && experience[0].company ? `at ${experience[0].company}` : '';
    const positionSnippet = experience.length > 0 && experience[0].position ? `as ${experience[0].position}` : '';
    const targetTitle = title || (experience.length > 0 && experience[0].position) || 'Professional Job Seeker';
    
    return `Results-driven ${targetTitle} ${positionSnippet} ${companySnippet} with deep expertise in ${skillsSnippet}. Proven track record of leveraging industry best practices to build high-performance scalable solutions and improve user experience. Highly collaborative team player dedicated to driving measurable business growth and engineering excellence.`;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as a professional resume writer. Write a compelling, results-oriented Professional Summary (around 3-4 sentences, 50-70 words) for a job seeker.
    
    Job Title/Target: ${title}
    Key Skills: ${skills.join(', ')}
    Recent Work History Summary: ${JSON.stringify(experience)}
    
    Guidelines: Use active, impact-driven verbs. Do not use pronouns like "I" or "my". Emphasize technical expertise and outcomes.
    Only output the raw summary text. Do not add quotes, introductory text, or markdown formatting.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Experience Rewriter (STAR Bullet Optimizer)
 */
export async function rewriteExperience(text: string, position: string, company: string): Promise<string[]> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for bullet point optimization.");
    const cleanText = text.replace(/^[•\-\s]+/, '').trim() || 'worked on feature development and bug fixes';
    
    return [
      `Architected and refactored core modules for ${cleanText} at ${company || 'Company'}, optimizing performance by 30% and significantly reducing page loading latency.`,
      `Spearheaded the technical design and execution of ${cleanText} as ${position || 'Engineer'}, collaborating with cross-functional product teams to deliver 99.9% uptime.`,
      `Designed and implemented stable microservices to automate ${cleanText}, successfully accelerating engineering velocity and improving system throughput by 25%.`
    ];
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as a senior technical recruiter. Optimize the following resume experience bullet point to use the STAR method (Situation, Task, Action, Result). Make it highly impactful, action-oriented, and highlight clear metrics or outcomes.
    
    Current Bullet: "${text}"
    Position: ${position} at ${company}
    
    Provide exactly 3 distinct improved variations of the bullet point, ordered from most technical to most leadership-oriented.
    Format your response as a JSON array of strings: ["Option 1", "Option 2", "Option 3"]. Do not wrap in markdown block code tags. Return ONLY the raw JSON array.
  `;

  const result = await model.generateContent(prompt);
  const outputText = result.response.text().trim();
  const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Skills Suggestions
 */
export async function suggestSkills(title: string, experience: any[]): Promise<{ technical: string[]; soft: string[] }> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for skills suggestions.");
    const jobTitle = title.toUpperCase();
    if (jobTitle.includes('DESIGN') || jobTitle.includes('UX') || jobTitle.includes('UI')) {
      return {
        technical: ["Figma", "UI/UX Design", "Wireframing", "Prototyping", "Design Systems", "User Research", "Adobe XD"],
        soft: ["User Empathy", "Collaboration", "Communication", "Critical Thinking", "Visual Storytelling"]
      };
    }
    if (jobTitle.includes('PRODUCT') || jobTitle.includes('MANAGER')) {
      return {
        technical: ["Product Roadmap", "Agile/Scrum", "Jira", "SQL Data Analysis", "Market Research", "A/B Testing"],
        soft: ["Product Leadership", "Stakeholder Mgmt", "Public Speaking", "Problem Solving", "Strategic Vision"]
      };
    }
    // Default engineering stack
    return {
      technical: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "REST APIs", "AWS Cloud", "Docker", "CI/CD"],
      soft: ["Team Mentorship", "Agile Execution", "System Design", "Peer Code Reviews", "Problem Solving"]
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as a technical product recruiter. Suggest relevant skills for a job seeker.
    
    Job Title/Target: ${title}
    Work History Details: ${JSON.stringify(experience)}
    
    Provide a list of recommended skills split into two categories: "technical" (hard skills, specific tools or frameworks) and "soft" (interpersonal skills, communication, management, processes).
    Format your response as a JSON object matching this structure:
    {
      "technical": ["Skill A", "Skill B", "Skill C"],
      "soft": ["Skill D", "Skill E"]
    }
    Return ONLY the raw JSON object. Do not wrap in markdown tags.
  `;

  const result = await model.generateContent(prompt);
  const outputText = result.response.text().trim();
  const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Cover Letter Generator
 */
export async function generateCoverLetter(resumeData: any, jobDescription: string): Promise<string> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for cover letter generation.");
    const name = resumeData?.personalInfo?.fullName || 'John Doe';
    const email = resumeData?.personalInfo?.email || 'john.doe@example.com';
    const title = resumeData?.personalInfo?.title || 'Software Engineer';
    const skillsList = [
      ...(resumeData?.skills?.technicalSkills || []),
      ...(resumeData?.skills?.softSkills || [])
    ].slice(0, 4).join(', ');
    
    return `Dear Hiring Manager,

I am writing to express my enthusiastic interest in the Software Engineer position open at your company. With a background as a ${title} and experience in building scalable solutions using ${skillsList}, I am confident in my ability to make a positive impact on your engineering division.

During my career, I have focused on translating business criteria into high-quality technical blueprints. I pride myself on clean code architecture and collaborative execution. The opportunity to join your team aligns perfectly with my professional goals of working on cutting-edge features.

Thank you for your time and consideration. I look forward to discussing how my experience and skill sets can contribute to your goals.

Sincerely,

${name}
${email}`;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as an executive career coach. Write a customized, engaging Cover Letter (around 250-300 words) for a job seeker.
    
    Resume Details:
    ${JSON.stringify(resumeData)}
    
    Job Description Details:
    "${jobDescription}"
    
    Ensure the cover letter is structured professionally (Salutation, Introduction highlighting the match, Body paragraphs connecting resume highlights to job requirements, and Call to action/Conclusion).
    Write in a natural, persuasive business-professional tone. Avoid templates.
    Only return the cover letter text.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Resume Analyzer & ATS Score Checker
 */
export async function checkAtsScore(resumeData: any, jobDescription: string): Promise<{
  score: number;
  matchKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
}> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for ATS score checker.");
    const targetKeywords = ["React", "TypeScript", "Node.js", "SQL", "Database", "API", "Next.js", "Python", "Cloud", "Git", "Testing", "Agile", "AWS", "CI/CD"];
    const matched: string[] = [];
    const missing: string[] = [];
    
    const jdUpper = jobDescription.toUpperCase();
    const resumeString = JSON.stringify(resumeData).toUpperCase();
    
    targetKeywords.forEach(kw => {
      const kwUpper = kw.toUpperCase();
      if (jdUpper.includes(kwUpper)) {
        if (resumeString.includes(kwUpper)) {
          matched.push(kw);
        } else {
          missing.push(kw);
        }
      }
    });
    
    if (matched.length === 0 && missing.length === 0) {
      missing.push("TypeScript", "React", "CI/CD", "AWS");
    }
    
    const matchedCount = matched.length;
    const totalChecked = matched.length + missing.length;
    const score = totalChecked > 0 ? Math.round((matchedCount / totalChecked) * 40 + 55) : 75;
    
    const recommendations = [
      "Format your work history to highlight STAR impact statements with clear metrics.",
      "Ensure your professional summary highlights your core technical stack prominently.",
    ];
    
    missing.forEach(kw => {
      recommendations.push(`Add specific experience examples utilizing the '${kw}' keyword to improve ATS parsing score.`);
    });
    
    return {
      score,
      matchKeywords: matched,
      missingKeywords: missing,
      recommendations
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as an Applicant Tracking System (ATS) parsing simulator. Analyze the following resume details against the target job listing.
    
    Resume Data:
    ${JSON.stringify(resumeData)}
    
    Target Job Description:
    "${jobDescription}"
    
    Perform a strict keyword matching, formatting, and structural analysis.
    Return your response in JSON format matching this structure:
    {
      "score": 85, // Integer between 0 and 100 representing match percentage
      "matchKeywords": ["Keyword1", "Keyword2"], // Top keywords present in both
      "missingKeywords": ["Keyword3", "Keyword4"], // Important job keywords missing from resume
      "recommendations": ["Tip 1", "Tip 2"] // Formatting or content improvement suggestions
    }
    
    Ensure your response is valid JSON. Do not wrap in markdown code blocks. Return ONLY the raw JSON string.
  `;

  const result = await model.generateContent(prompt);
  const outputText = result.response.text().trim();
  const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Resume Tailoring Recommendations
 */
export async function tailorResume(resumeData: any, jobDescription: string): Promise<{
  suggestedTitle: string;
  suggestedSummary: string;
  tailoredBullets: Array<{ section: string; index: number; original: string; suggested: string }>;
}> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for resume tailoring.");
    const currentTitle = resumeData?.personalInfo?.title || 'Engineer';
    const experienceList = resumeData?.workExperience || [];
    
    const suggestedSummary = `Results-oriented professional with extensive hands-on experience aligned with the target job requirements. Proven competence in engineering scalable backend operations, building resilient database schemas, and collaborating across design systems. Experienced at deploying robust APIs and modern frameworks to drive performance efficiency.`;
    
    const tailoredBullets = experienceList.length > 0 ? [
      {
        section: "workExperience",
        index: 0,
        original: experienceList[0].description ? experienceList[0].description.replace(/<[^>]*>/g, '').substring(0, 50) + "..." : "Collaborated on team objectives",
        suggested: `Spearheaded software architecture and technical optimizations, aligning key database pipelines directly with product requirement indices.`
      }
    ] : [];

    return {
      suggestedTitle: currentTitle.includes('Software') ? currentTitle : `Senior ${currentTitle}`,
      suggestedSummary,
      tailoredBullets
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as an expert technical resume writer. Analyze the resume details against the target job description and provide specific tailored edits.
    
    Resume Details:
    ${JSON.stringify(resumeData)}
    
    Job Description Details:
    "${jobDescription}"
    
    Produce suggestions for:
    1. A tailored Job Title
    2. A tailored Professional Summary
    3. Specific suggested replacements for experience description bullets (if applicable) to better align with the job description.
    
    Format your response as a JSON object matching this structure:
    {
      "suggestedTitle": "Tailored Title",
      "suggestedSummary": "Tailored professional profile statement...",
      "tailoredBullets": [
        {
          "section": "workExperience",
          "index": 0, // 0-based index of the experience item
          "original": "Original description bullet",
          "suggested": "Tailored description bullet emphasizing matched criteria"
        }
      ]
    }
    Return ONLY the raw JSON object. Do not wrap in code tags.
  `;

  const result = await model.generateContent(prompt);
  const outputText = result.response.text().trim();
  const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * AI Resume Audit Analyzer (Full Audit Report)
 */
export async function analyzeResume(resumeData: any): Promise<{
  positives: string[];
  negatives: string[];
  readabilityScore: number;
  grammarRating: string;
  sectionsAnalysis: Array<{ section: string; status: 'strong' | 'average' | 'needs-work'; tip: string }>;
}> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for resume analysis.");
    return {
      positives: [
        "Consistent reverse chronological ordering of job highlights.",
        "Key skills are clearly structured into Technical and Soft categories.",
        "Crucial contact parameters (Email, Location) are completely populated."
      ],
      negatives: [
        "Some experience items lack quantified STAR metrics.",
        "The professional summary statement could be more impact-oriented."
      ],
      readabilityScore: 82,
      grammarRating: "Excellent (No visible spelling/syntax errors detected)",
      sectionsAnalysis: [
        { section: "PersonalInfo", status: "strong", tip: "All standard parameters are filled. Excellent work." },
        { section: "WorkExperience", status: "average", tip: "Add quantified outcomes (e.g., improved load times by 30%) to make statements punchier." },
        { section: "Skills", status: "strong", tip: "Well segmented. Keep technical stack updated." },
        { section: "Projects", status: "average", tip: "Integrate technologies badges and deployment URLs for all highlights." }
      ]
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as a professional resume auditor. Perform a full content, layout structure, and grammar analysis on the provided resume.
    
    Resume Data:
    ${JSON.stringify(resumeData)}
    
    Analyze:
    - Overall positive elements
    - Weak points or omissions
    - Readability score (0-100)
    - Formatting and grammar rating
    - Individual sections strengths and custom suggestions
    
    Format your response as a JSON object matching this structure:
    {
      "positives": ["Positive highlight 1", "Positive highlight 2"],
      "negatives": ["Issue 1", "Issue 2"],
      "readabilityScore": 85,
      "grammarRating": "Excellent",
      "sectionsAnalysis": [
        {
          "section": "workExperience", // Section identifier
          "status": "strong", // 'strong' | 'average' | 'needs-work'
          "tip": "Suggested refinement..."
        }
      ]
    }
    Return ONLY the raw JSON object. Do not wrap in code block markdown tags.
  `;

  const result = await model.generateContent(prompt);
  const outputText = result.response.text().trim();
  const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * AI Chat Assistant for Resume Improvements
 */
export async function chatAssistant(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: string }>,
  resumeData: any
): Promise<string> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for chat assistant.");
    const query = message.toLowerCase();
    
    if (query.includes('format') || query.includes('layout')) {
      return "For a clean resume layout, I suggest sticking to standard reverse-chronological order. Ensure your section orders lead with Professional Experience, followed by Projects, then Education and Certifications. Avoid complex multi-column formats unless applying for design-heavy roles.";
    }
    if (query.includes('experience') || query.includes('bullet') || query.includes('work')) {
      return "To make your experience bullet points punchy, always lead with an action verb (e.g., 'Spearheaded', 'Optimized', 'Architected'). Follow that with the situation/task details, and conclude with a measurable result (e.g., 'reducing latency by 35%').";
    }
    if (query.includes('skill')) {
      return "Your skills section should be clearly cataloged. It is recommended to list technical frameworks (like React, Node.js) separate from soft skills. Grouping skills helps Applicant Tracking Systems parse keywords successfully.";
    }
    
    return `Hello! I am your AI Career Assistant. Based on your current resume data (${resumeData?.personalInfo?.fullName || 'Untitled Profile'}), I can help you:
- Write punchy STAR action bullets.
- Add relevant technical keywords to bypass ATS filters.
- Brainstorm professional summary options.
- Give suggestions on layout and structuring.

What specific section or issue would you like to refine next?`;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  // Construct conversation context
  const contextHistory = [
    {
      role: 'user',
      parts: `You are an AI Resume Coach. You are helping a user refine their resume. Here is their current resume data for context:
      ${JSON.stringify(resumeData)}
      
      Respond directly, helpfully, and professionally. Focus on actionable suggestions and content enhancements.`
    },
    {
      role: 'model',
      parts: "I understand. I am ready to assist the candidate in optimizing their resume structure, keywords, bullet points, and formatting details."
    },
    ...history.map(item => ({
      role: item.role,
      parts: item.parts
    }))
  ];

  // Using simple model generation with history passed as context prompts
  const chatContextPrompt = contextHistory.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.parts}`).join('\n') + `\nUser: ${message}\nAssistant:`;
  
  const result = await model.generateContent(chatContextPrompt);
  return result.response.text().trim();
}

/**
 * Direct Inline Text Rewrite & Improve
 */
export async function rewriteInPlace(text: string, tone: string): Promise<string> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for rewrite in place.");
    const cleanText = text.replace(/<[^>]*>/g, '').trim() || 'worked on feature development';
    
    if (tone === 'technical') {
      return `Spearheaded software architecture and technical optimizations for ${cleanText}, successfully improving backend throughput by 35% and reducing API response latency.`;
    }
    if (tone === 'leadership') {
      return `Spearheaded and directed cross-functional team efforts executing ${cleanText}, boosting workflow velocity by 25% and delivering project milestones 2 weeks ahead of schedule.`;
    }
    if (tone === 'shorten') {
      return `Optimized and streamlined ${cleanText} to reduce technical debt.`;
    }
    // general improve
    return `Designed, architected, and deployed critical updates for ${cleanText}, leading to a 30% increase in system efficiency and enhancing overall user retention metrics.`;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  let toneGuideline = '';
  if (tone === 'technical') {
    toneGuideline = 'Make it highly technical, focus on architectures, systems, frameworks, and engineering concepts.';
  } else if (tone === 'leadership') {
    toneGuideline = 'Focus on leadership, ownership, mentoring, cross-functional collaboration, and business value.';
  } else if (tone === 'shorten') {
    toneGuideline = 'Keep it concise, punchy, and short without losing key accomplishments.';
  } else {
    toneGuideline = 'Improve clarity, use active impact verbs, and format as a strong STAR action-oriented statement.';
  }

  const prompt = `
    Act as an expert resume copywriter. Rewrite the following text to improve it based on this guideline: "${toneGuideline}".
    
    Current Text: "${text}"
    
    Important Constraints:
    - If the input is a single bullet point or short sentence, return exactly one improved bullet point or sentence.
    - Do NOT wrap in markdown block code quotes or add introductory text. Return ONLY the raw improved text.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Suggest quantification ideas for experience bullets
 */
export async function quantifyAchievements(bullets: string[]): Promise<Array<{ original: string; suggestion: string; metrics: string[] }>> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for quantification suggestions.");
    return bullets.map(b => {
      const clean = b.replace(/<[^>]*>/g, '').trim();
      return {
        original: clean,
        suggestion: `Successfully executed ${clean}, resulting in a [insert % e.g., 25%] performance optimization and saving [insert hours e.g., 10 hours/week] of developer toil.`,
        metrics: ["Percentage increase/decrease (e.g. 30% faster, 20% cost reduction)", "Scale metrics (e.g. 15+ microservices, 50,000+ active users)", "Time/Money metrics (e.g. $15k saved, 3 weeks ahead of schedule)"]
      };
    });
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as a professional resume editor. Analyze the following list of resume statements and suggest specific ways the job seeker can quantify their achievements by adding metrics, numbers, or percentages.
    
    Statements:
    ${JSON.stringify(bullets)}
    
    For each statement, provide a list of relevant metrics they could add, and a template suggestion illustrating how the statement would read with those metrics.
    Format your response as a JSON array of objects:
    [
      {
        "original": "Original statement",
        "suggestion": "Template suggestion with placeholders like [insert %] or [insert value]",
        "metrics": ["Specific suggestion 1 (e.g. % performance improvement)", "Specific suggestion 2"]
      }
    ]
    Return ONLY the raw JSON array. Do not wrap in markdown code tags.
  `;

  try {
    const result = await model.generateContent(prompt);
    const outputText = result.response.text().trim();
    const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse quantification from AI, falling back to empty suggestions', err);
    return [];
  }
}

/**
 * Generate Interview Prep Q&A recommendations based on resume data and job description
 */
export async function generateInterviewPrep(
  resumeData: any,
  jobDescription: string
): Promise<Array<{ question: string; answer: string; type: 'behavioral' | 'technical' | 'situational' }>> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for interview preparation.");
    const targetTitle = resumeData?.personalInfo?.title || 'Professional';
    const skillsList = [
      ...(resumeData?.skills?.technicalSkills || []),
      ...(resumeData?.skills?.softSkills || [])
    ].slice(0, 3).join(', ') || 'software development';

    return [
      {
        question: `Tell me about a project you led as a ${targetTitle} where you used ${skillsList || 'your core skills'}.`,
        answer: `Use the STAR method: Situation (describe the challenge or project goal), Task (your specific responsibility), Action (how you leveraged ${skillsList} to build/optimize), and Result (the measurable outcome, like performance improvements or speed gains).`,
        type: 'behavioral'
      },
      {
        question: `What is your approach to learning and implementing new tools or frameworks when a job requires them?`,
        answer: `Highlight a specific instance from your resume where you adapted quickly. Focus on hands-on prototyping, reviewing documentation, and contributing to production code within a short timeline.`,
        type: 'situational'
      },
      {
        question: `How do you handle technical disagreements or code reviews within a software engineering team?`,
        answer: `Emphasize constructive feedback, active listening, and seeking objective standard practices (documentation, style guides, benchmarks) rather than subjective opinions.`,
        type: 'behavioral'
      },
      {
        question: `Can you walk me through the architecture of a complex application or database you worked on?`,
        answer: `Structure your response logically: explain the business requirement, the technical stack chosen, the data flow/models, and how you solved potential scalability or latency issues.`,
        type: 'technical'
      },
      {
        question: `Based on the job description, how would you optimize performance and security in a modern web app?`,
        answer: `Discuss using clean separation of concerns, API gateway/caching strategies, server-side rendering (e.g. Next.js), and Row-Level Security (RLS) or HTTPS/encryption best practices.`,
        type: 'technical'
      }
    ];
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as an elite interviewer and technical hiring manager. Analyze the following resume details and target job description to generate exactly 5 highly relevant interview questions that this candidate is likely to face. For each question, provide a suggested structured answer or key talking points tailored to the candidate's background and matching the job description.
    
    Resume Data:
    ${JSON.stringify(resumeData)}
    
    Job Description Details:
    "${jobDescription}"
    
    Provide questions that cover behavioral, situational, and technical aspects.
    Format your response as a JSON array of objects:
    [
      {
        "question": "Question text?",
        "answer": "Suggested answer or talking points...",
        "type": "behavioral" // 'behavioral' | 'technical' | 'situational'
      }
    ]
    Return ONLY the raw JSON array. Do not wrap in markdown code tags.
  `;

  try {
    const result = await model.generateContent(prompt);
    const outputText = result.response.text().trim();
    const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse interview prep questions from AI, falling back to empty suggestions', err);
    return [];
  }
}

