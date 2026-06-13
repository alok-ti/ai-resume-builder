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

export interface BulletSuggestion {
  text: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
}

export interface BulletRewriteResponse {
  originalScore: number;
  actionOriented: BulletSuggestion;
  quantified: BulletSuggestion;
  concise: BulletSuggestion;
  atsOptimized: BulletSuggestion;
}

/**
 * Premium Experience Bullet Point Rewriter
 */
export async function rewriteExperienceBullet(
  bullet: string,
  position: string,
  company: string
): Promise<BulletRewriteResponse> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for bullet point rewriter.");
    const cleanBullet = bullet.replace(/^[•\-\s]+/, '').trim() || 'managed team coordination and communication across departments';
    
    return {
      originalScore: 62,
      actionOriented: {
        text: `Spearheaded cross-functional communication and department alignment, establishing unified project tracking standards.`,
        explanation: `Replaces passive coordination phrasing with active ownership ("Spearheaded") and structured outcomes.`,
        confidence: 'high',
        score: 85
      },
      quantified: {
        text: `Coordinated weekly cross-functional meetings for 15+ team members across 3 departments, boosting project delivery rate by 20%.`,
        explanation: `Quantifies the scale (15+ members, 3 departments) and business impact (20% delivery rate) of department coordination.`,
        confidence: 'medium',
        score: 90
      },
      concise: {
        text: `Facilitated cross-functional collaboration and department communication to streamline project execution.`,
        explanation: `Improves clarity and readability by removing wordy phrasing and focusing on the core activity.`,
        confidence: 'high',
        score: 80
      },
      atsOptimized: {
        text: `Managed cross-functional coordination, agile communication, and stakeholder collaboration across engineering departments.`,
        explanation: `Integrates targeted keywords like "agile communication", "stakeholder collaboration", and "cross-functional coordination" to match parser standards.`,
        confidence: 'high',
        score: 88
      }
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist.
    Optimize the following experience bullet point from a professional's work experience section into four distinct variations, and assess why each suggestion is stronger.
    
    Current Bullet: "${bullet}"
    Job Title/Position: ${position}
    Company: ${company}
    
    GENERATE THESE FOUR VARIATIONS:
    1. actionOriented: Focuses on ownership, initiative, and responsibility. Starts with a strong, active verb.
    2. quantified: Includes measurable scale, outcomes, or metrics (e.g. percentages, counts, time, or currency). If exact numbers aren't in the original bullet, suggest a realistic, logically framed placeholder metric representing standard performance outcomes. Do not manufacture completely arbitrary claims.
    3. concise: Improves readability by keeping the wording direct, eliminating fluff/redundancies, and making the achievement crystal clear.
    4. atsOptimized: Emphasizes relevant industry keywords, technical terminology, and action descriptors to score higher in semantic parsing systems.
    
    IMPORTANT CONSTRAINTS:
    - Preserve the factual meaning of the original bullet.
    - Never fabricate untrue metrics or achievements.
    - Rate the confidence level ('high', 'medium', or 'low') of each suggestion's applicability.
    - Provide a score (0-100) for the original bullet, and a score (0-100) for each suggestion representing its strength.
    - Provide a short explanation (one sentence) of why each suggestion is stronger.
    
    Format your response as a valid, raw JSON object matching the following structure:
    {
      "originalScore": 62,
      "actionOriented": {
        "text": "...",
        "explanation": "...",
        "confidence": "high",
        "score": 85
      },
      "quantified": {
        "text": "...",
        "explanation": "...",
        "confidence": "medium",
        "score": 90
      },
      "concise": {
        "text": "...",
        "explanation": "...",
        "confidence": "high",
        "score": 80
      },
      "atsOptimized": {
        "text": "...",
        "explanation": "...",
        "confidence": "high",
        "score": 88
      }
    }
    
    Return ONLY the raw JSON object. Do not wrap in markdown code block tags. Ensure all quotes inside the JSON keys and values are properly escaped.
  `;

  const result = await model.generateContent(prompt);
  const outputText = result.response.text().trim();
  const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  
  try {
    return JSON.parse(cleanJson) as BulletRewriteResponse;
  } catch (err) {
    console.error('Failed to parse Gemini output as JSON:', err, outputText);
    
    // Fallback JSON in case of parse errors
    const fallbackText = bullet.replace(/^[•\-\s]+/, '').trim() || 'worked on experience detail';
    return {
      originalScore: 50,
      actionOriented: {
        text: `Spearheaded execution of: ${fallbackText}.`,
        explanation: `Uses a strong active verb to establish ownership.`,
        confidence: 'high',
        score: 75
      },
      quantified: {
        text: `Executed ${fallbackText}, improving team deliverable efficiency by 15%.`,
        explanation: `Includes a standard estimated performance impact metric.`,
        confidence: 'medium',
        score: 80
      },
      concise: {
        text: `${fallbackText}.`,
        explanation: `Simplifies phrasing for immediate clarity.`,
        confidence: 'high',
        score: 70
      },
      atsOptimized: {
        text: `Managed deliverables and workflow execution for: ${fallbackText}.`,
        explanation: `Integrates standard operational parser keywords.`,
        confidence: 'high',
        score: 78
      }
    };
  }
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

export interface CoverLetterOptions {
  style: 'professional' | 'storytelling' | 'executive' | 'internship' | 'creative' | 'concise';
  tone: 'formal' | 'confident' | 'enthusiastic' | 'humble' | 'technical';
  companyName?: string;
  jobTitle?: string;
  hiringManagerName?: string;
  hiringManagerTitle?: string;
  companyPersonalization?: string;
  wordCount?: number;
}

/**
 * Advanced Cover Letter Generator
 */
export async function generateCoverLetterAdvanced(
  resumeData: any,
  jobDescription: string,
  options: CoverLetterOptions
): Promise<string> {
  const {
    style = 'professional',
    tone = 'confident',
    companyName = 'the company',
    jobTitle = 'the position',
    hiringManagerName = '',
    hiringManagerTitle = '',
    companyPersonalization = '',
    wordCount = 280,
  } = options;

  const salutation = hiringManagerName
    ? `Dear ${hiringManagerName}${hiringManagerTitle ? `, ${hiringManagerTitle}` : ''}` 
    : 'Dear Hiring Manager';

  const styleInstructions: Record<string, string> = {
    professional: 'Write a polished, structured cover letter with clear paragraphs: Hook, Value Proposition, Relevant Experience, Fit & Culture, Call to Action.',
    storytelling: 'Open with a compelling micro-story or anecdote from your career that directly relates to the role. Use narrative arc — challenge, action, result — throughout. Make it personal and memorable.',
    executive: 'Write as a senior executive. Lead with strategic vision and measurable business impact. Use P&L language, leadership scope, and board-level communication style. Minimal fluff, maximum gravitas.',
    internship: 'Write as an early-career student or recent graduate. Emphasize academic projects, coursework, internships, and eagerness to learn. Show enthusiasm for growth and contribution. Keep it concise at around 180–200 words.',
    creative: 'Open with a bold, unusual hook that grabs attention. Use vivid language, personality, and show cultural fit. Break conventional cover letter structure intentionally while remaining professional.',
    concise: 'Write a tight, punchy cover letter of 150–180 words maximum. Three paragraphs only: Why this company, why you, call to action. Zero filler sentences.',
  };

  const toneInstructions: Record<string, string> = {
    formal: 'Use formal business English. Avoid contractions. Maintain third-person distance where appropriate.',
    confident: 'Be assertive and self-assured. Use strong action verbs. Avoid hedging language like "I believe" or "I think".',
    enthusiastic: 'Show genuine excitement and passion. Use energy in your phrasing. Let personality shine through.',
    humble: 'Balance confidence with humility. Acknowledge growth areas, show eagerness to learn, express gratitude.',
    technical: 'Use precise technical language and domain-specific terminology appropriate to the role. Reference specific technologies, methodologies, and metrics.',
  };

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for advanced cover letter.");
    const name = resumeData?.personalInfo?.fullName || 'Alex Johnson';
    const email = resumeData?.personalInfo?.email || 'alex@example.com';
    const resumeTitle = resumeData?.personalInfo?.title || 'Software Engineer';
    const skills = [...(resumeData?.skills?.technicalSkills || []), ...(resumeData?.skills?.softSkills || [])].slice(0, 3).join(', ');
    const exp = resumeData?.workExperience?.[0];

    const mockBodies: Record<string, string> = {
      storytelling: `${salutation},\n\nThree years ago, I was staring at a production outage at 2 AM, responsible for a system serving 200,000 users. In that moment, I learned what it truly means to own a platform end-to-end. That experience defined my engineering philosophy — and it's why ${companyName} excites me deeply.\n\nAs a ${resumeTitle} specializing in ${skills}, I have since built and shipped features that reduced latency by 40% and improved reliability SLAs across distributed systems.${companyPersonalization ? `\n\n${companyPersonalization}` : ''}\n\nI would welcome the opportunity to bring this intensity and ownership mindset to the ${jobTitle} role.\n\nSincerely,\n${name}\n${email}`,
      executive: `${salutation},\n\nI am writing to express my interest in the ${jobTitle} opportunity at ${companyName}. With a track record of delivering $2M+ in operational efficiency gains and leading engineering organizations of 15+ engineers, I bring the strategic and execution capabilities your team needs.${companyPersonalization ? `\n\n${companyPersonalization}` : ''}\n\nMy background as a ${resumeTitle} positions me uniquely to drive measurable outcomes from day one.\n\nI look forward to a conversation.\n\nSincerely,\n${name}\n${email}`,
      internship: `${salutation},\n\nI am a Computer Science student applying for the ${jobTitle} internship at ${companyName}. Through coursework and personal projects in ${skills}, I have built hands-on skills that I am eager to apply in a real-world setting.${companyPersonalization ? `\n\n${companyPersonalization}` : ''}\n\nI am a fast learner who thrives in collaborative environments. I would be grateful for the opportunity to contribute and grow with your team.\n\nThank you for your consideration,\n${name}\n${email}`,
      professional: `${salutation},\n\nI am excited to apply for the ${jobTitle} position at ${companyName}. With extensive experience as a ${resumeTitle}${exp ? ` at ${exp.company}` : ''} and a strong foundation in ${skills}, I am confident I can drive meaningful impact for your team.${companyPersonalization ? `\n\n${companyPersonalization}` : ''}\n\nI look forward to discussing how my experience aligns with your needs.\n\nSincerely,\n${name}\n${email}`,
    };

    return mockBodies[style] || mockBodies['professional'];
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
You are a world-class career coach and professional ghostwriter specializing in cover letters.

WRITING STYLE: ${style.toUpperCase()}
${styleInstructions[style]}

TONE: ${tone.toUpperCase()}
${toneInstructions[tone]}

CANDIDATE RESUME:
${JSON.stringify(resumeData)}

TARGET ROLE: ${jobTitle} at ${companyName}
JOB DESCRIPTION: "${jobDescription}"
SALUTATION TO USE: "${salutation}"
${companyPersonalization ? `COMPANY-SPECIFIC PERSONALIZATION (include this naturally): "${companyPersonalization}"` : ''}
TARGET WORD COUNT: ~${wordCount} words

INSTRUCTIONS:
- Start directly with the salutation, no preamble
- Weave the candidate's actual experience, skills, and achievements naturally into the letter
- Incorporate relevant keywords from the job description
- Do NOT use square-bracket placeholders
- Do NOT include a subject line
- Sign off with the candidate's full name and email from the resume
- Return ONLY the cover letter text — no commentary, no headers, no markdown

Write the cover letter now:
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Cover Letter AI Rewrite with specific instruction
 */
export async function rewriteCoverLetter(letter: string, instruction: string): Promise<string> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured. Returning mock rewrite.");
    return `[Rewritten per instruction: "${instruction}"]\n\n` + letter.split('\n').slice(0, 3).join('\n') + '\n\n[Content rewritten based on your instruction. Add your Gemini API key to enable live AI rewrites.]';
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `You are a professional cover letter editor.

INSTRUCTION: ${instruction}

CURRENT COVER LETTER:
${letter}

Rewrite the cover letter following the instruction exactly. Preserve all factual information about the candidate. Return ONLY the rewritten letter text with no commentary.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Cover Letter AI General Improvement
 */
export async function improveCoverLetter(letter: string): Promise<string> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured. Returning mock improvement.");
    return letter + '\n\n[AI-improved version would appear here with a valid Gemini API key. Improvements include stronger opening hooks, quantified achievements, and a more compelling call to action.]';
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `You are an elite career coach. Improve this cover letter by:
1. Strengthening the opening hook
2. Making passive language more active and assertive
3. Adding more specific impact language where possible
4. Tightening verbose sentences
5. Improving the closing call to action

COVER LETTER TO IMPROVE:
${letter}

Return ONLY the improved cover letter text. Do not add commentary or explanations.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Cover Letter Generator (Legacy — kept for backward compatibility)
 */
export async function generateCoverLetter(resumeData: any, jobDescription: string): Promise<string> {
  return generateCoverLetterAdvanced(resumeData, jobDescription, {
    style: 'professional',
    tone: 'confident',
    wordCount: 280,
  });
}

/**
 * Resume Analyzer & ATS Score Checker
 */
export async function checkAtsScore(resumeData: any, jobDescription: string): Promise<{
  overallScore: number;
  formattingScore: number;
  hardSkillsScore: number;
  softSkillsScore: number;
  impactScore: number;
  readabilityScore: number;
  keywordMatch: {
    matched: Array<{ keyword: string; count: number; density: number }>;
    missing: Array<{ keyword: string; priority: 'high' | 'medium' | 'low' }>;
  };
  pdfCompatibility: {
    passed: boolean;
    checks: Array<{ label: string; status: 'pass' | 'fail' | 'warning'; tip: string }>;
  };
  benchmark: {
    percentile: number;
    comparisonText: string;
    strengths: string[];
    gaps: string[];
  };
  aiSuggestions: Array<{
    category: 'formatting' | 'keywords' | 'impact' | 'structure';
    tip: string;
    suggestionText: string;
    fieldPath?: string;
  }>;
}> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for Enterprise ATS score checker.");
    const textContent = JSON.stringify(resumeData).toLowerCase();
    
    const targetKeywords = [
      { key: "React", type: "hard" },
      { key: "TypeScript", type: "hard" },
      { key: "Node.js", type: "hard" },
      { key: "Next.js", type: "hard" },
      { key: "PostgreSQL", type: "hard" },
      { key: "AWS", type: "hard" },
      { key: "Docker", type: "hard" },
      { key: "CI/CD", type: "hard" },
      { key: "Collaboration", type: "soft" },
      { key: "Communication", type: "soft" },
      { key: "Problem Solving", type: "soft" },
      { key: "System Design", type: "hard" },
      { key: "Agile", type: "soft" }
    ];
    
    const matched: Array<{ keyword: string; count: number; density: number }> = [];
    const missing: Array<{ keyword: string; priority: 'high' | 'medium' | 'low' }> = [];
    
    let matchCount = 0;
    targetKeywords.forEach((kwObj, idx) => {
      const regex = new RegExp(`\\b${kwObj.key.toLowerCase().replace('.', '\\.')}\\b`, 'g');
      const occurrences = (textContent.match(regex) || []).length;
      
      if (occurrences > 0) {
        matchCount++;
        const totalWords = textContent.split(/\s+/).length || 500;
        const density = Math.min(6.5, parseFloat(((occurrences / totalWords) * 100).toFixed(1)));
        matched.push({
          keyword: kwObj.key,
          count: occurrences,
          density: density > 0 ? density : 0.8
        });
      } else {
        missing.push({
          keyword: kwObj.key,
          priority: idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low'
        });
      }
    });

    if (matched.length === 0) {
      matched.push(
        { keyword: "React", count: 2, density: 1.2 },
        { keyword: "TypeScript", count: 1, density: 0.6 }
      );
    }
    
    const hardCount = matched.length;
    const overallScore = Math.min(98, Math.max(45, Math.round((hardCount / targetKeywords.length) * 40 + 55)));
    
    const checks: Array<{ label: string; status: 'pass' | 'fail' | 'warning'; tip: string }> = [
      { label: "Text Extraction parsing check", status: "pass", tip: "No font or image blocks obstructing raw text reading." },
      { label: "Standard fonts check (Arial, Inter, Calibri)", status: "pass", tip: "ATS parsers can easily extract details cleanly." },
      { label: "Tables usage scan check", status: (resumeData?.workExperience?.length || 0) > 3 ? "warning" : "pass", tip: "Tables could confuse older parsing engines. Keep layout structural headers simple." },
      { label: "Images/Shapes inclusion check", status: "pass", tip: "No scanning blocks found. Layout is completely readable." }
    ];
    
    const passed = checks.every(c => c.status !== 'fail');
    const formattingScore = passed ? 90 : 75;
    const hardSkillsScore = Math.min(100, Math.round((hardCount / 8) * 40 + 60));
    const softSkillsScore = Math.min(100, 85);
    const impactScore = textContent.includes('%') || textContent.includes('metrics') || textContent.includes('optimized') ? 92 : 68;
    const readabilityScore = 88;
    
    return {
      overallScore,
      formattingScore,
      hardSkillsScore,
      softSkillsScore,
      impactScore,
      readabilityScore,
      keywordMatch: {
        matched,
        missing: missing.slice(0, 5)
      },
      pdfCompatibility: {
        passed,
        checks
      },
      benchmark: {
        percentile: Math.min(99, Math.round(overallScore * 0.9 + 5)),
        comparisonText: `Your resume matches ${overallScore}% of targeted keyword thresholds inside typical recruiter screening parameters.`,
        strengths: ["Strong technical match with target hard skills", "Standard layout fonts used correctly"],
        gaps: ["Lacks quantifiable metrics inside experience highlights", "Missing soft skill keywords (e.g. Agile, Collaboration)"]
      },
      aiSuggestions: [
        {
          category: "formatting",
          tip: "Verify resume section structural spacing matches A4 page layouts.",
          suggestionText: "Slightly adjust vertical spacing to align templates correctly."
        },
        {
          category: "keywords",
          tip: "Add suggested keywords to your technical skills to improve matches.",
          suggestionText: missing.length > 0 ? `Include '${missing[0].keyword}' in your technical skills list.` : "Skills keywords match perfectly.",
          fieldPath: "skills.technicalSkills"
        },
        {
          category: "impact",
          tip: "Quantify accomplishments inside summary or job descriptions.",
          suggestionText: "Draft a technical summary highlighting specific optimization metrics.",
          fieldPath: "personalInfo.summary"
        }
      ]
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    You are an enterprise-grade Applicant Tracking System (ATS) parsing simulator and resume editor.
    Your task is to analyze the following resume data against the job description and return a detailed compatibility report.
    
    Active Resume:
    ${JSON.stringify(resumeData)}
    
    Job Description:
    "${jobDescription}"
    
    Perform a strict keyword matching, layout parsing check, sentiment readability, and impact metrics analysis.
    
    Return your response ONLY as a valid JSON object matching this exact structure:
    {
      "overallScore": 85, // Integer 0-100 overall compatibility
      "formattingScore": 90, // Layout structure score
      "hardSkillsScore": 80, // Technical skills coverage
      "softSkillsScore": 75, // Behavioral/process keywords matching
      "impactScore": 70, // Quantifiable STAR accomplishments density
      "readabilityScore": 85, // Recruiters readability index (sentence complexity)
      "keywordMatch": {
        "matched": [
          { "keyword": "React", "count": 3, "density": 2.1 } // count of keywords, density percentage
        ],
        "missing": [
          { "keyword": "Kubernetes", "priority": "high" } // priorities: "high" | "medium" | "low"
        ]
      },
      "pdfCompatibility": {
        "passed": true, // overall pass status
        "checks": [
          { "label": "Text extraction scan check", "status": "pass", "tip": "Feedback detail..." } // status: "pass" | "fail" | "warning"
        ]
      },
      "benchmark": {
        "percentile": 82, // compared percentile
        "comparisonText": "Comparison feedback text...",
        "strengths": ["Strength 1"],
        "gaps": ["Gap 1"]
      },
      "aiSuggestions": [
        {
          "category": "keywords", // "formatting" | "keywords" | "impact" | "structure"
          "tip": "AI critique tip...",
          "suggestionText": "Suggested action or text replacement...",
          "fieldPath": "personalInfo.summary" // optional target form field react-hook-form path to modify if applied
        }
      ]
    }
    
    Ensure your response is valid JSON. Do not wrap in markdown code blocks like \`\`\`json. Return only the raw JSON.
  `;

  const result = await model.generateContent(prompt);
  const outputText = result.response.text().trim();
  const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Resume Tailoring Recommendations (Legacy — kept for backward compatibility)
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
  const prompt = `Act as an expert technical resume writer. Analyze the resume details against the target job description and provide specific tailored edits.
    Resume Details: ${JSON.stringify(resumeData)}
    Job Description Details: "${jobDescription}"
    Produce: 1. A tailored Job Title 2. A tailored Professional Summary 3. Specific suggested replacements for experience description bullets.
    Format response as JSON: { "suggestedTitle": "...", "suggestedSummary": "...", "tailoredBullets": [{ "section": "workExperience", "index": 0, "original": "...", "suggested": "..." }] }
    Return ONLY the raw JSON object. Do not wrap in code tags.`;
  const result = await model.generateContent(prompt);
  const outputText = result.response.text().trim();
  const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanJson);
}

export interface TailorOptions {
  industry: string;
  seniority: 'junior' | 'mid' | 'senior' | 'executive';
  tone: 'professional' | 'executive' | 'technical' | 'creative';
  prioritizeSkills: string[];
}

export interface TailorChangeItem {
  field: string;
  label: string;
  original: string;
  suggested: string;
  changeType: 'rewrite' | 'enhance' | 'keyword-inject';
  accepted?: boolean;
}

export interface AdvancedTailorResult {
  extractedKeywords: string[];
  industryInsights: string;
  suggestedTitle: string;
  suggestedSummary: string;
  tailoredBullets: Array<{
    section: string;
    index: number;
    original: string;
    suggested: string;
    changeType: 'rewrite' | 'enhance' | 'keyword-inject';
  }>;
  suggestedSkills: {
    toAdd: string[];
    toPrioritize: string[];
    toRemove: string[];
  };
  changeLog: TailorChangeItem[];
}

/**
 * Advanced Resume Tailoring with industry, seniority, tone, and skill prioritization
 */
export async function tailorResumeAdvanced(
  resumeData: any,
  jobDescription: string,
  options: TailorOptions
): Promise<AdvancedTailorResult> {
  const { industry, seniority, tone, prioritizeSkills } = options;

  // --- Extract keywords from job description (client-side fast path) ---
  const jdWords = jobDescription.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','need','this','that','these','those','we','you','they','their','our','your','its','not','also','as','if','so','than','then','just','about','up','out','into','over','after','before','when','where','who','which','what','how','all','more','other','such','no','nor','only','same','both','each','few','most','other','some','such','than','too','very','s','t','re','ll','m','ve']);
  const keywordFreq: Record<string, number> = {};
  for (const w of jdWords) {
    if (w.length > 3 && !stopWords.has(w)) {
      keywordFreq[w] = (keywordFreq[w] || 0) + 1;
    }
  }
  const autoKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for advanced tailoring.");
    const currentTitle = resumeData?.personalInfo?.title || 'Software Engineer';
    const experienceList = resumeData?.workExperience || [];
    const existingSkills = [
      ...(resumeData?.skills?.technicalSkills || []),
      ...(resumeData?.skills?.softSkills || [])
    ];

    const seniorityPrefix = seniority === 'executive' ? 'VP of' :
                            seniority === 'senior' ? 'Senior' :
                            seniority === 'mid' ? '' : 'Junior';

    const industryMap: Record<string, string> = {
      fintech: 'financial technology platforms and regulatory compliance systems',
      healthcare: 'HIPAA-compliant healthcare data pipelines and patient-facing applications',
      saas: 'scalable multi-tenant SaaS architectures and subscription billing systems',
      ecommerce: 'high-throughput e-commerce platforms and real-time inventory management',
      consulting: 'client-facing technical consulting engagements and cross-sector delivery',
      education: 'adaptive learning platforms and educational content management systems',
      marketing: 'marketing automation platforms, analytics dashboards, and CRM integrations',
      general: 'enterprise-grade software solutions and business-critical applications',
    };
    const industryContext = industryMap[industry.toLowerCase()] || industryMap['general'];

    const toneMap: Record<string, string> = {
      executive: 'strategic, leadership-focused, and outcome-driven',
      technical: 'highly technical, architecture-focused, and engineering-metric-driven',
      creative: 'dynamic, innovative, and visually compelling',
      professional: 'polished, results-oriented, and professionally succinct',
    };
    const toneDesc = toneMap[tone] || toneMap['professional'];

    const suggestedTitle = seniorityPrefix ? `${seniorityPrefix} ${currentTitle}` : currentTitle;
    const suggestedSummary = `${toneDesc.charAt(0).toUpperCase() + toneDesc.slice(1)} ${seniority}-level engineer with deep expertise in ${industryContext}. ${prioritizeSkills.length > 0 ? `Specialized in ${prioritizeSkills.slice(0, 3).join(', ')}.` : ''} Demonstrated track record of delivering high-impact ${industry} products and leading cross-functional engineering teams to measurable business outcomes.`;

    const tailoredBullets = experienceList.slice(0, 2).map((exp: any, idx: number) => ({
      section: 'workExperience',
      index: idx,
      original: exp.description ? exp.description.replace(/<[^>]*>/g, '').substring(0, 60) + '...' : 'Led engineering team initiatives.',
      suggested: `Architected and delivered ${industryContext} features${prioritizeSkills[0] ? ` using ${prioritizeSkills[0]}` : ''}, improving system performance by 35% and reducing operational costs by 20%.`,
      changeType: 'rewrite' as const,
    }));

    const toAdd = autoKeywords
      .filter(k => !existingSkills.map((s: string) => s.toLowerCase()).includes(k.toLowerCase()))
      .slice(0, 5);

    const changeLog: TailorChangeItem[] = [
      { field: 'personalInfo.title', label: 'Job Title', original: currentTitle, suggested: suggestedTitle, changeType: 'rewrite' },
      { field: 'personalInfo.summary', label: 'Professional Summary', original: resumeData?.personalInfo?.summary || '', suggested: suggestedSummary, changeType: 'rewrite' },
      ...tailoredBullets.map((b: { section: string; index: number; original: string; suggested: string; changeType: 'rewrite' | 'enhance' | 'keyword-inject' }) => ({
        field: `workExperience.${b.index}.description`,
        label: `Experience #${b.index + 1} Bullet`,
        original: b.original,
        suggested: b.suggested,
        changeType: b.changeType,
      })),
    ];

    return {
      extractedKeywords: autoKeywords,
      industryInsights: `For ${industry.toUpperCase()} roles at the ${seniority} level, recruiters prioritize: quantified impact metrics, relevant domain experience (${industryContext}), and ${tone} communication style. Ensure your resume addresses compliance, scale, and collaboration themes.`,
      suggestedTitle,
      suggestedSummary,
      tailoredBullets,
      suggestedSkills: {
        toAdd,
        toPrioritize: prioritizeSkills.slice(0, 3),
        toRemove: [],
      },
      changeLog,
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
You are an elite resume strategist and career coach specializing in tailoring resumes for specific job descriptions.

ACTIVE RESUME:
${JSON.stringify(resumeData)}

JOB DESCRIPTION:
"${jobDescription}"

TAILORING OPTIONS:
- Industry: ${industry}
- Seniority Level: ${seniority}
- Desired Tone: ${tone}
- Skills to Prioritize: ${prioritizeSkills.join(', ') || 'none specified'}

YOUR TASKS:
1. Extract the top 15-20 key technical and domain-specific keywords from the job description.
2. Provide a concise industry-specific insight (2-3 sentences) about what this ${industry} role values most.
3. Suggest a tailored job title matching the seniority and role.
4. Write a new professional summary in ${tone} tone at the ${seniority} level, incorporating key JD keywords and the prioritized skills.
5. For each work experience entry, suggest improved bullet points that align with the JD keywords and the ${tone} tone.
6. Recommend skills to add (from JD but missing in resume), skills to prioritize (user-selected or highly relevant), and skills to remove (irrelevant to this role).
7. Build a complete changeLog of every field being modified.

RETURN ONLY a valid JSON object in this exact structure (no markdown wrappers):
{
  "extractedKeywords": ["Keyword1", "Keyword2"],
  "industryInsights": "Insight text...",
  "suggestedTitle": "Senior Software Engineer",
  "suggestedSummary": "Tailored summary...",
  "tailoredBullets": [
    {
      "section": "workExperience",
      "index": 0,
      "original": "Original bullet text...",
      "suggested": "Improved bullet with JD keywords...",
      "changeType": "rewrite"
    }
  ],
  "suggestedSkills": {
    "toAdd": ["Skill A", "Skill B"],
    "toPrioritize": ["Skill C"],
    "toRemove": []
  },
  "changeLog": [
    {
      "field": "personalInfo.title",
      "label": "Job Title",
      "original": "Current title",
      "suggested": "New tailored title",
      "changeType": "rewrite"
    }
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const outputText = result.response.text().trim();
    const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleanJson);
    // Merge auto-extracted keywords with AI ones
    const merged = Array.from(new Set([...autoKeywords, ...(parsed.extractedKeywords || [])])).slice(0, 25);
    return { ...parsed, extractedKeywords: merged };
  } catch (err) {
    console.error('tailorResumeAdvanced failed, returning mock fallback:', err);
    // Fallback to mock
    return tailorResumeAdvanced(resumeData, jobDescription, options);
  }
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
    
    switch (tone) {
      case 'improve':
        return `Optimized and enhanced ${cleanText} to maximize efficiency, performance, and overall utility.`;
      case 'rewrite':
        return `Re-engineered the implementation of ${cleanText} using modern industry design patterns.`;
      case 'expand':
        return `Successfully designed, implemented, and refactored ${cleanText}, collaborating with cross-functional stakeholders to deliver robust, scalable, and high-performance solutions.`;
      case 'shorten':
        return `Streamlined and optimized ${cleanText} to reduce complexity.`;
      case 'professional':
        return `Conducted professional development and maintenance of ${cleanText} in alignment with engineering best practices.`;
      case 'executive':
        return `Spearheaded strategic execution of ${cleanText}, driving operational efficiency and key performance outcomes.`;
      case 'technical':
        return `Architected and optimized high-performance technical pipelines for ${cleanText}, improving API latency and system scalability.`;
      default:
        // fallback matching original general improve
        return `Designed, architected, and deployed critical updates for ${cleanText}, leading to a 30% increase in system efficiency and performance.`;
    }
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  let toneGuideline = '';
  switch (tone) {
    case 'improve':
      toneGuideline = 'Improve clarity, use active impact verbs, and format as a strong STAR action-oriented statement.';
      break;
    case 'rewrite':
      toneGuideline = 'Rewrite the text completely to improve phrasing, structure, and readability while preserving the core meaning.';
      break;
    case 'expand':
      toneGuideline = 'Expand the content to add more detail, depth, and context about the achievement and its impact.';
      break;
    case 'shorten':
      toneGuideline = 'Keep it concise, punchy, and short, removing fluff without losing key accomplishments.';
      break;
    case 'professional':
      toneGuideline = 'Make it sound highly professional, polished, and suited for a corporate setting.';
      break;
    case 'executive':
      toneGuideline = 'Focus on leadership, ownership, strategic impact, business outcomes, and high-level results.';
      break;
    case 'technical':
      toneGuideline = 'Make it highly technical, focusing on tools, technologies, architecture, systems, and engineering metrics.';
      break;
    default:
      toneGuideline = 'Improve clarity, use active impact verbs, and format as a strong action-oriented statement.';
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

/**
 * Parse Resume text using Gemini
 */
export async function parseResume(rawText: string): Promise<any> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for resume parsing.");
    return generateMockParsedResume(rawText);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
      You are an expert senior document-processing engineer specializing in parsing resume text.
      Your task is to parse the following raw text from a resume and extract the structured content exactly as specified below.
      
      Raw Resume Text:
      """
      ${rawText}
      """
      
      You must extract and structure the following sections:
      1. personalInfo:
         - fullName: candidate's full name.
         - title: professional title or target role.
         - email: contact email address.
         - phone: contact phone number.
         - location: geographic location (city, state/country).
         - linkedin: LinkedIn profile URL.
         - github: GitHub profile URL.
         - portfolio: portfolio or personal website URL.
         - summary: a compelling, professional summary.
      2. workExperience: Array of jobs, each containing:
         - company: name of the company or organization.
         - position: job title or position.
         - location: location of job.
         - startDate: start date (e.g. YYYY-MM or "Month YYYY").
         - endDate: end date (e.g. YYYY-MM or "Month YYYY" or "Present").
         - current: boolean (true if currently working there).
         - description: Array of strings representing bullet points describing accomplishments and duties.
      3. education: Array of education items, each containing:
         - school: school or university name.
         - degree: degree or certificate earned (e.g. B.S., M.S.).
         - fieldOfStudy: field of study (e.g. Computer Science).
         - location: location of school.
         - startDate: start date.
         - endDate: end date.
         - current: boolean.
         - description: any extra notes or GPA.
      4. projects: Array of projects, each containing:
         - projectName: project name.
         - description: description of the project.
         - technologies: comma-separated list of technologies used (e.g. "React, Node.js").
         - githubUrl: project GitHub repository URL.
         - liveUrl: live project URL.
      5. skills:
         - technicalSkills: Array of technical/hard skills, tools, or frameworks.
         - softSkills: Array of soft/interpersonal/process skills.
      6. certificates: Array of certifications, each containing:
         - name: certification name.
         - issuer: organization issuing the certificate.
         - date: date of certification.
         - url: certification validation URL.
      7. languages: Array of languages, each containing:
         - language: language name.
         - proficiency: proficiency level (e.g., Native, Fluent, Conversational, Basic, or leave empty).

      Ensure all fields are populated with values extracted from the text. If a field cannot be found, use an empty string "" (or empty array [] for lists).
      Provide your output ONLY as a valid JSON object matching the described structure.
      Do not wrap your response in markdown code blocks like \`\`\`json. Return only the raw JSON string.
    `;

    const result = await model.generateContent(prompt);
    const outputText = result.response.text().trim();
    const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse resume using Gemini API, falling back to mock parser:', err);
    return generateMockParsedResume(rawText);
  }
}

/**
 * Helper to generate mock parsed resume data from raw text when API key is missing or parsing fails
 */
function generateMockParsedResume(rawText: string): any {
  const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  
  // Extract a plausible name (e.g. the first non-empty line of the text)
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const mockName = lines[0] || 'John Doe';
  
  return {
    personalInfo: {
      fullName: mockName,
      title: 'Professional Resume',
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
      summary: rawText.substring(0, 400) + (rawText.length > 400 ? '...' : ''),
    },
    workExperience: [
      {
        company: 'Sample Company',
        position: 'Role Title',
        location: '',
        startDate: '2020',
        endDate: 'Present',
        current: true,
        description: ['Demonstrated strong performance and collaboration.', 'Managed project milestones and deliverables.']
      }
    ],
    education: [
      {
        school: 'University or College',
        degree: 'Degree / Program',
        fieldOfStudy: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: ''
      }
    ],
    projects: [],
    skills: {
      technicalSkills: [],
      softSkills: []
    },
    certificates: [],
    languages: []
  };
}

/**
 * Audit Resume for Grammar, Weak Bullets, Missing Achievements, Missing Skills, and ATS Issues
 */
export async function auditResume(resumeData: any): Promise<{
  grammarIssues: string[];
  weakBullets: string[];
  missingAchievements: string[];
  missingSkills: string[];
  atsIssues: string[];
}> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for resume audit.");
    return {
      grammarIssues: [
        "Inconsistent capitalization detected in work experience description.",
        "Ensure bullet points start with past-tense action verbs (e.g. 'Led' instead of 'Leading')."
      ],
      weakBullets: [
        "Bullet point 'worked on features' is generic. Use the STAR method to describe Situation, Task, Action, and Result.",
        "Bullet point 'helped team members' lacks specificity. Describe how you mentored or supported the team."
      ],
      missingAchievements: [
        "No quantifiable metrics or performance indicators found in the most recent job description.",
        "Missing outcomes for projects. Consider adding user growth, response times, or cost reduction percentages."
      ],
      missingSkills: [
        "No modern testing tools (e.g., Jest, Cypress, Playwright) listed under technical skills.",
        "Consider adding cloud platform competencies (e.g., AWS, GCP, Azure) to complement your engineering title."
      ],
      atsIssues: [
        "Missing clear contact information link (LinkedIn/GitHub) in header.",
        "Inconsistent section header formatting might cause parsing issues with legacy ATS systems."
      ]
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as a professional resume auditor. Analyze the following resume data to detect:
    1. Grammar issues: Spelling mistakes, incorrect tense usage, run-on sentences, formatting slips.
    2. Weak bullet points: Bullet points that are passive, generic, or don't clearly explain what the candidate did.
    3. Missing achievements: Areas where achievements could be quantified (e.g. missing metrics, dollar amounts, performance percentages).
    4. Missing skills: Crucial technical or soft skills that would naturally fit the candidate's target job title but are missing.
    5. ATS issues: ATS parsing blocks, lack of search keyword optimization, structure/layout problems, missing links.

    Resume Data:
    ${JSON.stringify(resumeData)}

    Provide your output ONLY as a valid JSON object matching this structure:
    {
      "grammarIssues": ["Issue 1", "Issue 2"],
      "weakBullets": ["Issue 1", "Issue 2"],
      "missingAchievements": ["Issue 1", "Issue 2"],
      "missingSkills": ["Issue 1", "Issue 2"],
      "atsIssues": ["Issue 1", "Issue 2"]
    }
    
    Ensure your response is valid JSON. Do not wrap in markdown code blocks. Return ONLY the raw JSON string.
  `;

  try {
    const result = await model.generateContent(prompt);
    const outputText = result.response.text().trim();
    const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse audit results from AI, falling back to mock details:', err);
    return {
      grammarIssues: ["Spelling or grammar checks failed to run. Check formatting manually."],
      weakBullets: ["Ensure all bullets follow the STAR format (Situation, Task, Action, Result)."],
      missingAchievements: ["Try to add metrics like % optimization or headcount managed to your bullets."],
      missingSkills: ["Review the job description to ensure all required tools and skills are present."],
      atsIssues: ["Verify standard section titles (Experience, Education, Skills) are spelled correctly."]
    };
  }
}

/**
 * AI Entire Resume Improver
 */
export async function improveEntireResume(resumeData: any): Promise<any> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for entire resume improvement.");
    // Deep clone the original resume data
    const improved = JSON.parse(JSON.stringify(resumeData));
    
    // 1. Improve summary
    if (improved.personalInfo) {
      improved.personalInfo.summary = `Results-driven and highly accomplished professional with a proven track record of success in designing, building, and optimizing scalable systems. Expert in implementing modern engineering best practices and collaborating across functional groups to deliver high-performance user-centric solutions. Dedicated to technical excellence and business alignment.`;
    }
    
    // 2. Improve experience bullets (convert rich text html bullets to improved versions)
    if (improved.workExperience && Array.isArray(improved.workExperience)) {
      improved.workExperience = improved.workExperience.map((exp: any) => {
        // Simple mock replacement of first bullet point
        const description = exp.description || '';
        const bullets = description.match(/<li[^>]*>([\s\S]*?)<\/li>/g);
        if (bullets && bullets.length > 0) {
          const firstClean = bullets[0].replace(/<[^>]*>/g, '').trim();
          const improvedFirst = `Spearheaded software architecture and technical optimizations for ${firstClean || 'core modules'}, delivering a 30% performance improvement and reducing API response times.`;
          
          let newDesc = '<ul>';
          newDesc += `<li>${improvedFirst}</li>`;
          for (let i = 1; i < bullets.length; i++) {
            newDesc += bullets[i];
          }
          newDesc += '</ul>';
          return { ...exp, description: newDesc };
        }
        return exp;
      });
    }

    // 3. Improve project descriptions
    if (improved.projects && Array.isArray(improved.projects)) {
      improved.projects = improved.projects.map((proj: any) => ({
        ...proj,
        description: `Designed and architected a high-performance technical pipeline, resulting in a 25% throughput improvement and modernizing deployment workflows.`
      }));
    }

    // 4. Suggest technical skills
    if (improved.skills) {
      const currentTech = improved.skills.technicalSkills || [];
      const suggestions = ["CI/CD Pipelines", "System Architecture", "Cloud Deployments (AWS/GCP)", "Automated Testing"];
      const newTech = [...currentTech];
      suggestions.forEach(s => {
        if (!newTech.includes(s)) newTech.push(s);
      });
      improved.skills.technicalSkills = newTech.slice(0, 12);
    }

    return improved;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    Act as an elite executive resume coach and professional editor.
    Your task is to take the following resume JSON and return an improved version of the entire resume data.

    Specifically, you should:
    1. Optimize the professional summary (personalInfo.summary) to sound executive, professional, and impact-driven.
    2. Rewrite and polish each work experience description bullet points. Since the work experience description is saved as HTML (e.g., <ul><li>Bullet 1</li><li>Bullet 2</li></ul>), please preserve this HTML format but rewrite the bullets inside the <li> tags to use strong action verbs, STAR methodology, and highlight achievements and metrics.
    3. Restructure and optimize project descriptions to highlight scale, technologies, and clear outcomes.
    4. Suggest and insert additional relevant high-value technical/soft skills into the skills.technicalSkills and skills.softSkills arrays (limit to adding 2-3 new high-value skills that align with the candidate's professional profile).

    Resume JSON Data:
    ${JSON.stringify(resumeData)}

    Important Constraints:
    - You MUST preserve all IDs (such as item IDs in workExperience, projects, education, certificates). Do NOT change any UUIDs, keys, templateId, or sectionOrder.
    - Preserve the structure of the JSON exactly. Return a valid JSON object matching the input schema.
    - Return ONLY the raw JSON object. Do not wrap in markdown code blocks like \`\`\`json.
  `;

  try {
    const result = await model.generateContent(prompt);
    const outputText = result.response.text().trim();
    const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to improve entire resume using Gemini API, returning original:', err);
    return resumeData;
  }
}

function getMockResponseForMessage(message: string, resumeData: any): string {
  const query = message.toLowerCase();
  const name = resumeData?.personalInfo?.fullName || 'John Doe';
  const title = resumeData?.personalInfo?.title || 'Software Engineer';
  
  if (query.includes('critique')) {
    return `### Resume Critique for ${name}

Here is a structural audit of your resume:
1. **Professional Summary:** Your summary is a good start, but it lacks specific metrics. Quantify your achievements to stand out to hiring managers.
2. **Work Experience:** You have solid experience as a ${title}. However, several bullet points start with passive verbs. I recommend changing them to strong action verbs like "Spearheaded", "Architected", or "Optimized".
3. **Skills Section:** Well-cataloged. Ensure your technical skills align closely with the jobs you are targeting.

Would you like me to help you rewrite a specific section?
<follow_ups>["Optimize my summary", "Show me strong action verbs to use", "Suggest skills to add"]</follow_ups>`;
  }
  
  if (query.includes('career') || query.includes('advice')) {
    return `### Career Advice for a ${title}

Based on your current profile, here is a roadmap to advance your career:
1. **Target Senior Roles:** Focus on showcasing system design and leadership capabilities.
2. **Cloud & DevOps:** If you haven't already, add cloud platforms (AWS/GCP) and CI/CD pipelines to your skillset.
3. **Open Source & Projects:** Contribution to key repositories or building a signature project will set you apart.

Would you like me to suggest some specific projects to build?
<follow_ups>["Suggest side projects", "How do I transition to a Senior Engineer role?", "Mock interview prep"]</follow_ups>`;
  }
  
  if (query.includes('interview') || query.includes('prep') || query.includes('prepare')) {
    return `### Tailored Interview Preparation

Here are key questions you should prepare for based on your target title of **${title}**:
1. **Behavioral:** "Tell me about a time you solved a complex scalability issue."
2. **Technical:** "Explain the lifecycles and performance trade-offs of the frameworks in your stack."
3. **Situational:** "How do you handle technical debt when product timelines are tight?"

I can run a mock role-play interview with you. Just tell me when you're ready!
<follow_ups>["Start mock interview", "Give me a technical question", "How should I answer behavioral questions?"]</follow_ups>`;
  }
  
  if (query.includes('project') || query.includes('suggest')) {
    return `### Recommended Projects for ${title}

Here are 3 unique projects you could add to your resume to showcase advanced capabilities:
1. **Distributed Task Queue:** Build a persistent cluster task scheduler in Go/Node.js using Redis.
2. **Real-time Analytics Dashboard:** Build an event collection pipeline with Next.js, PostgreSQL, and WebSockets.
3. **AI Search Assistant:** Build a semantic search interface using Vector Embeddings (e.g., pgvector) and Gemini.

Would you like me to draft a project description for one of these to add to your projects list?
<follow_ups>["Draft project description for AI search", "Draft project description for task queue", "Suggest technologies to use"]</follow_ups>`;
  }

  if (query.includes('summary') && (query.includes('rewrite') || query.includes('improve') || query.includes('optimize'))) {
    const text = `Results-driven and highly accomplished ${title} with a proven track record of designing, building, and optimizing scalable systems. Expert in implementing modern engineering best practices and collaborating across functional groups to deliver high-performance user-centric solutions. Dedicated to technical excellence and business alignment.`;
    return `Here is an optimized Professional Summary tailored for a **${title}** role:

[APPLY:personalInfo.summary]${text}[/APPLY]

I have wrapped this recommendation in a smart apply card below. Click "Apply to Resume" to update your summary instantly!
<follow_ups>["Critique my resume", "How do I optimize experience bullets?", "Suggest skills to add"]</follow_ups>`;
  }

  // General fallback response
  return `I've analyzed your active resume. As your AI Career Coach, I can help you critique your content, generate cover letters, suggest side projects, prepare for interviews, or perform inline edits.

For example, ask me to **"Critique my resume"** or **"Rewrite my summary"** to see how I can help you!
<follow_ups>["Critique my resume", "Give me career advice", "Suggest projects for me"]</follow_ups>`;
}

/**
 * AI Chat Assistant Stream for real-time streaming responses
 */
export async function chatAssistantStream(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: string }>,
  resumeData: any
): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. Running in Mock Mode for chat assistant stream.");
    const mockResponse = getMockResponseForMessage(message, resumeData);
    return new ReadableStream({
      async start(controller) {
        // Send word-by-word with delay
        const words = mockResponse.split(' ');
        for (const word of words) {
          controller.enqueue(encoder.encode(word + ' '));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        controller.close();
      }
    });
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  // Construct the prompt with context awareness from the active resume
  const resumeJsonStr = JSON.stringify(resumeData, null, 2);
  
  const systemPrompt = `
You are "AI Career Coach & Resume Editor", a principal AI assistant built into an advanced AI Resume Builder.
Your task is to help the candidate optimize their resume, critique their qualifications, provide career pathing, brainstorm interview prep, and write specific, highly targeted edits for their resume sections.

---
ACTIVE RESUME STATE:
${resumeJsonStr}
---

Your capabilities and formatting rules:
1. Context Awareness: You have full access to the active resume data. Always tailor your critique, advice, suggestions, and interview prep to the candidate's actual work experience, education, projects, and skills.
2. Section-Specific Editing (Smart Apply):
   - Whenever you suggest specific, concrete replacements for any field in the resume (such as personalInfo.summary, or work experience descriptions, or project descriptions), you MUST wrap the exact suggested text block inside [APPLY:<fieldPath>]suggested text[/APPLY] tags.
   - Examples of valid fieldPaths:
     * personalInfo.summary
     * workExperience.0.description (Note: Work experience descriptions should be formatted as HTML e.g. <ul><li>Bullet 1</li><li>Bullet 2</li></ul>)
     * workExperience.1.description
     * projects.0.description
     * projects.1.description
   - Only place the direct replacement text inside the [APPLY:...] tags. Do not put markdown headers or other dialogue inside the tag.
   - Example response snippet:
     "Here is a technical draft for your professional summary:
     [APPLY:personalInfo.summary]Highly optimized summary text here...[/APPLY]
     You can click the Apply button below to overwrite it instantly."
3. Critique & Career Advice: Be objective, constructive, and direct. Highlight specific formatting weaknesses, passive bullet phrasing, or unquantified achievements.
4. Suggested Follow-up Questions:
   - At the very end of your response (after all other text), you MUST output exactly 2 or 3 logical follow-up questions that the user can ask next.
   - Wrap these follow-up questions inside a single <follow_ups>["Question 1", "Question 2"]</follow_ups> JSON array block.
   - Ensure it is valid JSON inside the tag.
   - Example: "<follow_ups>[\"Critique my experience\", \"Suggest projects to add\"]</follow_ups>"

Dialogue Stack:
${history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.parts}`).join('\n')}
User: ${message}
Assistant:
`;

  return new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(systemPrompt);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err: any) {
        console.error('Error generating streaming content:', err);
        controller.enqueue(encoder.encode(`\n[Error during generation: ${err.message || 'Unknown error'}]`));
      } finally {
        controller.close();
      }
    }
  });
}

/**
 * Career Assistant Suite generation (Skill gaps, roadmaps, goals, action plans, STAR prep, salary, promo readiness, mock interviews)
 */
export async function generateCareerAssistantContent(
  type: string,
  resumeData: any,
  options: { targetRole?: string; jobDescription?: string; input?: string } = {}
): Promise<any> {
  const { targetRole = 'Senior Engineer', jobDescription = '', input = '' } = options;

  if (!apiKey) {
    console.warn(`GEMINI_API_KEY is not configured. Running in Mock Mode for career assistant type: ${type}`);
    const name = resumeData?.personalInfo?.fullName || 'Candidate';
    const currentTitle = resumeData?.personalInfo?.title || 'Professional';

    switch (type) {
      case 'skill-gap':
        return {
          score: 68,
          gaps: [
            { skill: 'System Design & Architecture', category: 'technical', impact: 'high', reasoning: 'Target role requires designing scalable distributed microservices, whereas current resume focuses primarily on frontend development.' },
            { skill: 'Cloud infrastructure (AWS/Terraform)', category: 'technical', impact: 'high', reasoning: 'Job description highlights deployment ownership. Resume lacks cloud computing tools.' },
            { skill: 'Cross-functional Team Mentorship', category: 'soft', impact: 'medium', reasoning: 'Target title implies leadership, but resume bullet points lack direct mentoring experience.' },
            { skill: 'System Integration Testing', category: 'technical', impact: 'low', reasoning: 'Missing concrete references to integration test pipelines.' }
          ]
        };
      case 'roadmap':
        return {
          roadmap: [
            { phase: 'Month 1 - 3: Foundation', goal: 'Build solid backend & system design skills', tasks: ['Complete a comprehensive course on System Design and Distributed Systems.', 'Shadow lead backend developers during architectural reviews.', 'Contribute to system design documentation for upcoming features.'] },
            { phase: 'Month 3 - 6: Practical Ownership', goal: 'Own minor architectural migrations', tasks: ['Lead the migration of a single service database or helper module.', 'Earn AWS Certified Solutions Architect credential.', 'Proactively initiate and conduct code reviews for the team.'] },
            { phase: 'Month 6 - 12: Leadership Shift', goal: 'Establish tech leadership presence', tasks: ['Spearhead a major platform refactoring project involving distributed messaging (Kafka/RabbitMQ).', 'Mentor 2 junior engineers or interns during core sprints.', 'Present tech architectures to senior product leadership.'] }
          ]
        };
      case 'goals':
        return {
          goals: [
            { task: 'Refactor one codebase module to use a cleaner architectural pattern.', completed: false },
            { task: 'Draw a high-level system design diagram for a distributed chat app.', completed: false },
            { task: 'Study Kafka vs RabbitMQ message broker design trade-offs.', completed: false },
            { task: 'Review 3 team pull requests, offering detailed constructive feedback.', completed: false },
            { task: 'Schedule a 1-on-1 with a Staff Engineer to ask about system scaling.', completed: false }
          ]
        };
      case 'learning':
        return {
          recommendations: [
            { topic: 'System Design', type: 'Course', name: 'Designing Data-Intensive Applications (Book) & Pragmatic System Design', platform: 'O\'Reilly / Educative' },
            { topic: 'Cloud Deployments', type: 'Certification', name: 'AWS Certified Cloud Practitioner & Developer Associate', platform: 'Amazon Web Services' },
            { topic: 'Infrastructure as Code', type: 'Tool', name: 'Terraform & Docker orchestration fundamentals', platform: 'HashiCorp / Coursera' },
            { topic: 'Leadership', type: 'Book', name: 'The Staff Engineer\'s Path by Tanya Reilly', platform: 'Bookstore' }
          ]
        };
      case 'action-plan':
        return {
          plan30: ['Perform a skills audit on cloud platforms and configure a multi-stage Dockerized CI/CD pipeline locally.', 'Read the first 5 chapters of Designing Data-Intensive Applications.', 'Analyze target job listings to document the top 5 requested tech tools.'],
          plan60: ['Engage in a backend-focused project at work or write a high-fidelity open-source service.', 'Study database caching patterns (Redis/Memcached) and query optimization strategies.', 'Initiate system architecture peer reviews within your engineering team.'],
          plan90: ['Actively mentor a junior teammate or lead a complex system design sprint.', 'Publish a technical write-up or present a brown-bag system architecture session.', 'Request feedback on promotion parameters from engineering directors.']
        };
      case 'salary':
        return {
          min: 120000,
          median: 155000,
          max: 185000,
          currency: 'USD',
          topSkills: ['System Architecture', 'AWS/GCP Cloud', 'Kubernetes/Docker', 'Database Optimization (PostgreSQL Sharding)', 'Go/Rust development'],
          tips: [
            'Highlight metrics (dollars saved, latency reduced) to anchor negotiations in business value.',
            'Always negotiate base salary rather than relying entirely on non-guaranteed bonuses.',
            'Reference sector benchmarks (Levels.fyi, Glassdoor) for equivalent seniority levels.'
          ]
        };
      case 'promotion':
        return {
          readiness: 72,
          strengths: [
            `Strong domain expertise as a ${currentTitle}.`,
            'High-quality, clean codebase contributions.',
            'Proven execution consistency in feature delivery.'
          ],
          blockers: [
            'Lacks visibility in system design decision-making panels.',
            'Needs to demonstrate proactive architectural foresight rather than just task execution.',
            'Requires more clear evidence of technical coaching and mentorship.'
          ]
        };
      case 'transition':
        return {
          advice: [
            `Reframe your resume title to highlight transferable engineering capabilities rather than specific sub-technologies.`,
            `Develop and deploy 2 high-impact fullstack or system services to illustrate versatility beyond ${currentTitle} boundaries.`,
            `Participate in cross-functional working groups to learn systems architecture, data pipeline operations, or site reliability engineering workflows.`
          ],
          strategy: 'Focus on highlighting system scalability, API integration metrics, and databases on your resume. De-emphasize niche frontend/UI-only bullet points to capture backend recruiters interest.'
        };
      case 'star':
        return {
          situation: 'Our service was experiencing a high volume of concurrent users which caused the page rendering to slow down and block transactions.',
          task: 'My responsibility was to optimize the database query latency and caching mechanisms to handle high concurrency during flash sales.',
          action: 'I refactored the legacy queries to implement indexed sub-joins, and added a Redis database caching layer with an eviction policy for hot catalog items.',
          result: 'Reduced catalog page response times by 40% and successfully supported a peak load of 15,000 concurrent active users with zero downtime.',
          optimizedBullet: 'Refactored legacy catalog queries with database indexing and a Redis caching layer, reducing page load times by 40% and supporting peak loads of 15k concurrent users.'
        };
      case 'mock-interview-evaluation':
        return {
          score: 82,
          feedback: 'Great job! Your answers show strong technical vocabulary and you naturally structure your experience around database indexing and scalability constraints. To improve further, make sure to clearly quantify the exact business results (e.g. % faster, resources saved) at the end of each story.',
          starCritique: 'The Situation and Actions were described perfectly. Emphasize the Result section more by linking query optimization directly to server cost savings or transactional conversions.'
        };
      case 'mock-questions':
        return {
          questions: [
            `Based on your resume and target role of ${targetRole}, how do you handle scaling databases when query volume spikes?`,
            `Tell me about a time you had to optimize page load latency or system performance. What was your strategy?`,
            `How do you prioritize learning new tools vs using standard frameworks when deadlines are tight?`
          ]
        };
      default:
        return { message: 'Action completed successfully.' };
    }
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  let systemInstructions = '';

  switch (type) {
    case 'mock-questions':
      systemInstructions = `
        Generate exactly 3 customized interview questions for the candidate based on their resume and the target role: "${targetRole}".
        The questions should challenge their specific experience, technical skills, and behavioral traits suitable for the level.
        Return a JSON object containing:
        {
          "questions": ["Question 1", "Question 2", "Question 3"]
        }
      `;
      break;
    case 'skill-gap':
      systemInstructions = `
        Compare the candidate's resume against the target role: "${targetRole}" and job description: "${jobDescription}".
        Identify the skill and experience gaps the candidate needs to fill.
        Return a JSON object containing:
        {
          "score": 65, // estimated percentage match
          "gaps": [
            {
              "skill": "Skill Name",
              "category": "technical" or "soft",
              "impact": "high" or "medium" or "low",
              "reasoning": "Reason why it is a gap based on resume vs target role"
            }
          ]
        }
      `;
      break;
    case 'roadmap':
      systemInstructions = `
        Build a customized, actionable career roadmap for the candidate to transition from their current resume profile to the target role: "${targetRole}".
        Provide specific milestones for Month 1-3, Month 3-6, and Month 6-12.
        Return a JSON object containing:
        {
          "roadmap": [
            {
              "phase": "Milestone Phase Name",
              "goal": "Overall goal for this phase",
              "tasks": ["Specific action item 1", "Specific action item 2"]
            }
          ]
        }
      `;
      break;
    case 'goals':
      systemInstructions = `
        Based on the candidate's current resume and target role: "${targetRole}", generate exactly 5 actionable weekly goals for this week to improve skills, prepare for interviews, or optimize their portfolio.
        Return a JSON object containing:
        {
          "goals": [
            {
              "task": "Task description statement",
              "completed": false
            }
          ]
        }
      `;
      break;
    case 'learning':
      systemInstructions = `
        Suggest specific learning recommendations to bridge the gap between the candidate's current profile and the target role: "${targetRole}".
        Include online courses, books, key tools, and certifications.
        Return a JSON object containing:
        {
          "recommendations": [
            {
              "topic": "Skill topic",
              "type": "Course" or "Book" or "Certification" or "Tool",
              "name": "Title of course/book/cert/tool",
              "platform": "Platform or publisher name (e.g. Coursera, AWS, O'Reilly)"
            }
          ]
        }
      `;
      break;
    case 'action-plan':
      systemInstructions = `
        Generate a personalized 30-60-90 day readiness plan for the candidate to successfully prepare for the target role: "${targetRole}".
        Provide 3 specific tasks for each 30-day block.
        Return a JSON object containing:
        {
          "plan30": ["task 1", "task 2", "task 3"],
          "plan60": ["task 1", "task 2", "task 3"],
          "plan90": ["task 1", "task 2", "task 3"]
        }
      `;
      break;
    case 'salary':
      systemInstructions = `
        Provide salary guidance benchmarks for the target role: "${targetRole}".
        Auto-detect target location or default to USD/US averages.
        Return a JSON object containing:
        {
          "min": 110000,
          "median": 140000,
          "max": 175000,
          "currency": "USD" or match candidate location,
          "topSkills": ["High-paying skill 1", "High-paying skill 2"],
          "tips": ["Negotiation tip 1", "Negotiation tip 2"]
        }
      `;
      break;
    case 'promotion':
      systemInstructions = `
        Analyze the candidate's resume for promotion readiness to a senior or target level: "${targetRole}".
        Estimate a readiness score (out of 100).
        Return a JSON object containing:
        {
          "readiness": 75,
          "strengths": ["Strength 1 proving readiness", "Strength 2"],
          "blockers": ["Blocker/Gap to solve 1", "Blocker 2"]
        }
      `;
      break;
    case 'transition':
      systemInstructions = `
        Provide strategic transition advice for pivoting from the candidate's current title to: "${targetRole}".
        Include key transferrable skills and repositioning strategy.
        Return a JSON object containing:
        {
          "advice": ["Transition advice 1", "Transition advice 2"],
          "strategy": "Core resume rebranding advice"
        }
      `;
      break;
    case 'star':
      systemInstructions = `
        Take the user's raw experience bullet point or text: "${input}".
        Break it down into Situation, Task, Action, and Result, and generate a polished, optimized single STAR bullet point.
        Return a JSON object containing:
        {
          "situation": "Situation description...",
          "task": "Task description...",
          "action": "Action taken...",
          "result": "Result achieved...",
          "optimizedBullet": "Unified optimized bullet point"
        }
      `;
      break;
    case 'mock-interview-evaluation':
      systemInstructions = `
        Evaluate the user's answers to the mock interview questions.
        The questions and user's answers are provided as: "${input}".
        Provide a performance rating (out of 100), key constructive feedback, and advice on how to improve STAR delivery.
        Return a JSON object containing:
        {
          "score": 85,
          "feedback": "Overall performance feedback...",
          "starCritique": "Critique focusing on Situation, Task, Action, and Result details..."
        }
      `;
      break;
    default:
      systemInstructions = `Analyze the resume data and return a JSON status object.`;
  }

  const prompt = `
    You are an expert career strategy planner and hiring consultant.
    Analyze the candidate's resume data:
    ${JSON.stringify(resumeData, null, 2)}

    Output requirements:
    ${systemInstructions}

    Constraints:
    - Return ONLY the raw JSON string. Do not wrap in markdown code blocks.
  `;

  try {
    const result = await model.generateContent(prompt);
    const outputText = result.response.text().trim();
    const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error(`Failed to generate career assistant content for type: ${type}`, err);
    throw err;
  }
}

// ============================================================================
// ATS SKILL GAP ANALYZER
// ============================================================================

export interface SkillGapPlacement {
  section: 'skills' | 'experience' | 'summary' | 'projects' | 'certifications';
  reason: string;
  example?: string;
}

export interface SkillGapRecommendation {
  skill: string;
  priority: 'critical' | 'important' | 'nice-to-have';
  category: 'technical' | 'soft' | 'domain' | 'tool';
  placement: SkillGapPlacement[];
  confidence: number; // 0-100
}

export interface KeywordInsight {
  keyword: string;
  status: 'present' | 'missing' | 'overused';
  frequency?: number;
  suggestion?: string;
}

export interface SkillGapWeakArea {
  area: string;
  reason: string;
  actionItem: string;
}

export interface SkillGapResult {
  keywordMatchPercentage: number;
  confidenceScore: number;
  summary: string;
  criticalMissing: SkillGapRecommendation[];
  importantMissing: SkillGapRecommendation[];
  niceToHave: SkillGapRecommendation[];
  strongKeywords: KeywordInsight[];
  missingKeywords: KeywordInsight[];
  overusedKeywords: KeywordInsight[];
  weakAreas: SkillGapWeakArea[];
  actionItems: string[];
}

/**
 * ATS Skill Gap Analyzer
 * Compares resume against a job description and returns prioritized skill gaps,
 * keyword insights, smart placement recommendations, and action items.
 */
export async function analyzeSkillGap(
  resumeData: any,
  jobDescription: string
): Promise<SkillGapResult> {
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured. Running in Mock Mode for skill gap analysis.');

    const techSkills = resumeData?.skills?.technicalSkills || [];
    const softSkills = resumeData?.skills?.softSkills || [];

    return {
      keywordMatchPercentage: 58,
      confidenceScore: 82,
      summary: 'Your resume covers the foundational technical stack but is missing several critical cloud and DevOps keywords that are prominent in this job description. Addressing the critical gaps will significantly improve your ATS pass rate.',
      criticalMissing: [
        {
          skill: 'Kubernetes',
          priority: 'critical',
          category: 'tool',
          confidence: 92,
          placement: [
            { section: 'skills', reason: 'Kubernetes appears 4 times in the JD. Adding it to your skills section ensures ATS keyword matching.', example: 'Kubernetes (container orchestration)' },
            { section: 'experience', reason: 'Reference Kubernetes in a deployment or infrastructure bullet to demonstrate hands-on usage.', example: 'Deployed microservices to Kubernetes clusters, reducing deployment time by 40%.' }
          ]
        },
        {
          skill: 'CI/CD Pipelines',
          priority: 'critical',
          category: 'technical',
          confidence: 88,
          placement: [
            { section: 'skills', reason: 'The JD explicitly lists CI/CD as a required skill. Including it improves keyword density.', example: 'CI/CD (GitHub Actions, Jenkins)' },
            { section: 'experience', reason: 'Mention the CI/CD tools you used in a past role to substantiate the claim.', example: 'Built CI/CD pipeline using GitHub Actions, enabling automated testing and zero-downtime deployments.' }
          ]
        },
        {
          skill: 'AWS',
          priority: 'critical',
          category: 'tool',
          confidence: 90,
          placement: [
            { section: 'skills', reason: 'AWS is a required qualification in the JD. Missing it could auto-reject your application.', example: 'AWS (EC2, S3, Lambda, RDS)' },
            { section: 'summary', reason: 'Mentioning AWS in your summary immediately signals cloud competency to recruiters.', example: 'Cloud-native engineer with AWS expertise...' }
          ]
        }
      ],
      importantMissing: [
        {
          skill: 'System Design',
          priority: 'important',
          category: 'technical',
          confidence: 78,
          placement: [
            { section: 'summary', reason: 'System design skills signal senior-level thinking. Include it in your professional summary.', example: 'Experienced in distributed system design and scalable architecture.' },
            { section: 'experience', reason: 'Call out any architectural decisions you made in past roles.', example: 'Designed event-driven microservices architecture handling 1M+ daily requests.' }
          ]
        },
        {
          skill: 'Agile / Scrum',
          priority: 'important',
          category: 'soft',
          confidence: 72,
          placement: [
            { section: 'skills', reason: 'Agile methodology is expected for most senior engineering roles. Add to soft skills.', example: 'Agile / Scrum Methodology' },
            { section: 'experience', reason: 'Reference sprint ceremonies or cross-functional collaboration to show Agile experience.', example: 'Collaborated in 2-week Agile sprints with product managers and designers to deliver features.' }
          ]
        },
        {
          skill: 'GraphQL',
          priority: 'important',
          category: 'technical',
          confidence: 65,
          placement: [
            { section: 'skills', reason: 'GraphQL is listed as a preferred skill in the JD. Including it differentiates your resume.', example: 'GraphQL (Apollo Server, REST APIs)' },
            { section: 'projects', reason: 'If you have a personal project using GraphQL, reference it to demonstrate initiative.', example: 'Built a GraphQL API for a full-stack app...' }
          ]
        }
      ],
      niceToHave: [
        {
          skill: 'Terraform',
          priority: 'nice-to-have',
          category: 'tool',
          confidence: 55,
          placement: [
            { section: 'skills', reason: 'Infrastructure as Code is a growing expectation. Terraform adds a bonus signal.', example: 'Terraform (IaC)' }
          ]
        },
        {
          skill: 'Redis',
          priority: 'nice-to-have',
          category: 'tool',
          confidence: 50,
          placement: [
            { section: 'skills', reason: 'Redis caching experience rounds out backend proficiency.', example: 'Redis (caching, pub/sub)' }
          ]
        }
      ],
      strongKeywords: [
        { keyword: 'React', status: 'present', frequency: 3, suggestion: 'Good. React is well-represented in your resume.' },
        { keyword: 'TypeScript', status: 'present', frequency: 2, suggestion: 'Good. TypeScript is clearly demonstrated.' },
        { keyword: 'Node.js', status: 'present', frequency: 2, suggestion: 'Present and relevant to the JD.' },
        { keyword: 'PostgreSQL', status: 'present', frequency: 1, suggestion: 'Mentioned once. Consider referencing in more contexts.' }
      ],
      missingKeywords: [
        { keyword: 'distributed systems', status: 'missing', suggestion: 'Add to summary or experience bullets.' },
        { keyword: 'observability', status: 'missing', suggestion: 'Mention logging, metrics, or tracing tools used.' },
        { keyword: 'microservices', status: 'missing', suggestion: 'Reference microservices architecture in experience.' }
      ],
      overusedKeywords: [
        { keyword: 'developed', status: 'overused', frequency: 7, suggestion: 'Vary with: Architected, Engineered, Implemented, Spearheaded.' },
        { keyword: 'worked', status: 'overused', frequency: 5, suggestion: 'Replace with stronger action verbs to improve ATS impact scores.' }
      ],
      weakAreas: [
        { area: 'Cloud Infrastructure', reason: 'No mention of cloud platforms, services, or deployments.', actionItem: 'Add AWS/GCP/Azure certifications or project experience to the skills and experience sections.' },
        { area: 'Quantified Impact', reason: 'Less than 30% of bullets include measurable outcomes.', actionItem: 'Revise experience bullets to include % improvements, time reductions, or scale metrics.' },
        { area: 'DevOps Practices', reason: 'No CI/CD, containerization, or infrastructure-as-code keywords detected.', actionItem: 'Add DevOps tools (Docker, GitHub Actions, Terraform) to skills and reference them in project descriptions.' }
      ],
      actionItems: [
        'Add Kubernetes to your technical skills section and reference it in at least one experience bullet.',
        'Include AWS (EC2, S3, Lambda) in both your skills and professional summary.',
        'Quantify 2-3 more experience bullets with specific metrics (e.g., "reduced latency by 35%").',
        'Replace passive verbs (worked, helped, assisted) with strong action verbs (architected, engineered, led).',
        'Add a CI/CD pipeline reference to your most recent work experience.',
        'Consider adding a projects section demonstrating cloud or DevOps skills if not yet present.'
      ]
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
You are a senior ATS (Applicant Tracking System) specialist and professional resume strategist.

Analyze the following resume against the provided job description. Identify skill gaps, keyword mismatches, and provide smart, placement-specific recommendations to maximize ATS compatibility and recruiter impact.

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

JOB DESCRIPTION:
"${jobDescription}"

ANALYSIS INSTRUCTIONS:
1. Compare all resume sections (skills, experience, projects, certifications, summary) against the job description.
2. Identify skills and keywords that are CRITICAL (blocking ATS pass), IMPORTANT (significantly improves chances), or NICE-TO-HAVE (differentiators).
3. For each missing skill, recommend the best placement section(s) with a clear reason and an example of how to incorporate it.
4. Identify strong keywords (already well-covered), missing keywords (not in resume at all), and overused keywords (appear too frequently and may dilute impact).
5. Identify 2-4 weak areas in the resume relative to this JD.
6. Generate 5-7 actionable, specific improvement items.

CATEGORY DEFINITIONS:
- "technical": Programming languages, frameworks, algorithms, data structures
- "soft": Interpersonal, communication, leadership, process skills
- "domain": Industry-specific knowledge (fintech, healthcare, e-commerce, etc.)
- "tool": Dev tools, platforms, services, infrastructure (AWS, Docker, Jira, etc.)

SECTION DEFINITIONS for placement:
- "skills": The skills section of the resume
- "experience": Work experience bullet points
- "summary": Professional summary statement
- "projects": Project descriptions
- "certifications": Certifications section

Return ONLY a valid raw JSON object matching this exact structure:
{
  "keywordMatchPercentage": 65,
  "confidenceScore": 85,
  "summary": "Brief 2-3 sentence summary of the skill gap analysis...",
  "criticalMissing": [
    {
      "skill": "Kubernetes",
      "priority": "critical",
      "category": "tool",
      "confidence": 90,
      "placement": [
        {
          "section": "skills",
          "reason": "Why this placement improves ATS compatibility...",
          "example": "Example text for how to incorporate this skill..."
        }
      ]
    }
  ],
  "importantMissing": [
    {
      "skill": "System Design",
      "priority": "important",
      "category": "technical",
      "confidence": 75,
      "placement": [
        {
          "section": "experience",
          "reason": "Why...",
          "example": "Example..."
        }
      ]
    }
  ],
  "niceToHave": [
    {
      "skill": "Terraform",
      "priority": "nice-to-have",
      "category": "tool",
      "confidence": 55,
      "placement": [
        {
          "section": "skills",
          "reason": "Why...",
          "example": "Example..."
        }
      ]
    }
  ],
  "strongKeywords": [
    { "keyword": "React", "status": "present", "frequency": 3, "suggestion": "Well-represented." }
  ],
  "missingKeywords": [
    { "keyword": "distributed systems", "status": "missing", "suggestion": "Add to summary or experience." }
  ],
  "overusedKeywords": [
    { "keyword": "worked", "status": "overused", "frequency": 5, "suggestion": "Use stronger action verbs." }
  ],
  "weakAreas": [
    { "area": "Cloud Infrastructure", "reason": "No cloud platform references.", "actionItem": "Add AWS/GCP to skills and experience." }
  ],
  "actionItems": [
    "Specific action item 1...",
    "Specific action item 2..."
  ]
}

Rules:
- Do NOT fabricate skills that are not in the JD or resume.
- Provide at least 2 and at most 5 criticalMissing items.
- Provide at least 2 and at most 6 importantMissing items.
- Provide at most 4 niceToHave items.
- Each skill must have at least 1 placement recommendation.
- confidence values must be 0-100 integers.
- keywordMatchPercentage must be 0-100.
- Return ONLY raw JSON. No markdown, no code blocks.
`;

  const result = await model.generateContent(prompt);
  const outputText = result.response.text().trim();
  const cleanJson = outputText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

  try {
    return JSON.parse(cleanJson) as SkillGapResult;
  } catch (err) {
    console.error('analyzeSkillGap: Failed to parse Gemini JSON output:', err, outputText);
    // Return a minimal fallback so UI doesn't crash
    return {
      keywordMatchPercentage: 50,
      confidenceScore: 60,
      summary: 'Analysis complete. Some recommendations could not be parsed — please try reanalyzing.',
      criticalMissing: [],
      importantMissing: [],
      niceToHave: [],
      strongKeywords: [],
      missingKeywords: [],
      overusedKeywords: [],
      weakAreas: [{ area: 'Parse Error', reason: 'AI response could not be parsed.', actionItem: 'Click Reanalyze to try again.' }],
      actionItems: ['Click Reanalyze to get fresh suggestions.']
    };
  }
}

