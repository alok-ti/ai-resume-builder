import { NextResponse } from 'next/server';
import {
  generateSummary,
  rewriteExperience,
  suggestSkills,
  generateCoverLetter,
  generateCoverLetterAdvanced,
  rewriteCoverLetter,
  improveCoverLetter,
  checkAtsScore,
  tailorResume,
  tailorResumeAdvanced,
  analyzeResume,
  chatAssistant,
  rewriteInPlace,
  quantifyAchievements,
  generateInterviewPrep,
  auditResume,
  improveEntireResume,
  chatAssistantStream,
  generateCareerAssistantContent,
  rewriteExperienceBullet,
  analyzeSkillGap
} from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    // ==========================================
    // 1. SUMMARY GENERATOR ACTION
    // ==========================================
    if (action === 'summary') {
      const { experience = [], skills = [], title = '' } = body;
      const summary = await generateSummary(title, skills, experience);
      return NextResponse.json({ summary });
    }

    // ==========================================
    // 2. EXPERIENCE REWRITER ACTION
    // ==========================================
    if (action === 'optimize') {
      const { text = '', position = '', company = '' } = body;
      const options = await rewriteExperience(text, position, company);
      return NextResponse.json({ options });
    }

    // ==========================================
    // 3. SKILLS SUGGESTIONS ACTION
    // ==========================================
    if (action === 'skills') {
      const { title = '', experience = [] } = body;
      const suggestions = await suggestSkills(title, experience);
      return NextResponse.json(suggestions);
    }

    // ==========================================
    // 4. COVER LETTER GENERATOR ACTION (Legacy + Advanced)
    // ==========================================
    if (action === 'cover-letter') {
      const {
        resumeData,
        jobDescription = '',
        style = 'professional',
        tone = 'confident',
        companyName = '',
        jobTitle = '',
        hiringManagerName = '',
        hiringManagerTitle = '',
        companyPersonalization = '',
        wordCount = 280,
      } = body;
      const coverLetter = await generateCoverLetterAdvanced(resumeData, jobDescription, {
        style,
        tone,
        companyName,
        jobTitle,
        hiringManagerName,
        hiringManagerTitle,
        companyPersonalization,
        wordCount,
      });
      return NextResponse.json({ coverLetter });
    }

    // ==========================================
    // 4b. COVER LETTER REWRITE ACTION
    // ==========================================
    if (action === 'cover-letter-rewrite') {
      const { letter = '', instruction = '' } = body;
      const coverLetter = await rewriteCoverLetter(letter, instruction);
      return NextResponse.json({ coverLetter });
    }

    // ==========================================
    // 4c. COVER LETTER IMPROVE ACTION
    // ==========================================
    if (action === 'cover-letter-improve') {
      const { letter = '' } = body;
      const coverLetter = await improveCoverLetter(letter);
      return NextResponse.json({ coverLetter });
    }

    // ==========================================
    // 5. RESUME ANALYZER (AUDIT) ACTION
    // ==========================================
    if (action === 'analyze') {
      const { resumeData } = body;
      const analysis = await analyzeResume(resumeData);
      return NextResponse.json(analysis);
    }

    // ==========================================
    // 6. ATS SCORE CHECKER ACTION
    // ==========================================
    if (action === 'ats') {
      const { resumeData, jobDescription = '' } = body;
      const analysis = await checkAtsScore(resumeData, jobDescription);
      return NextResponse.json(analysis);
    }

    // ==========================================
    // 7. RESUME TAILORING ACTION (Legacy)
    // ==========================================
    if (action === 'tailor') {
      const { resumeData, jobDescription = '' } = body;
      const tailoring = await tailorResume(resumeData, jobDescription);
      return NextResponse.json(tailoring);
    }

    // ==========================================
    // 7b. ADVANCED RESUME TAILORING ACTION
    // ==========================================
    if (action === 'tailor-advanced') {
      const {
        resumeData,
        jobDescription = '',
        industry = 'general',
        seniority = 'mid',
        tone = 'professional',
        prioritizeSkills = [],
      } = body;
      const result = await tailorResumeAdvanced(resumeData, jobDescription, {
        industry,
        seniority,
        tone,
        prioritizeSkills,
      });
      return NextResponse.json(result);
    }

    // ==========================================
    // 8. AI CHAT ASSISTANT ACTION
    // ==========================================
    if (action === 'chat') {
      const { message = '', history = [], resumeData } = body;
      const response = await chatAssistant(message, history, resumeData);
      return NextResponse.json({ response });
    }

    // ==========================================
    // 9. AI INLINE REWRITE ACTION
    // ==========================================
    if (action === 'rewrite-in-place') {
      const { text = '', tone = 'general' } = body;
      const responseText = await rewriteInPlace(text, tone);
      return NextResponse.json({ text: responseText });
    }

    // ==========================================
    // 10. AI ACHIEVEMENT QUANTIFICATION ACTION
    // ==========================================
    if (action === 'quantify') {
      const { bullets = [] } = body;
      const suggestions = await quantifyAchievements(bullets);
      return NextResponse.json({ suggestions });
    }

    // ==========================================
    // 11. AI INTERVIEW PREPARATION ACTION
    // ==========================================
    if (action === 'interview') {
      const { resumeData, jobDescription = '' } = body;
      const questions = await generateInterviewPrep(resumeData, jobDescription);
      return NextResponse.json({ questions });
    }

    // ==========================================
    // 12. AI RESUME AUDIT ACTION
    // ==========================================
    if (action === 'audit') {
      const { resumeData } = body;
      const auditReport = await auditResume(resumeData);
      return NextResponse.json(auditReport);
    }

    // ==========================================
    // 13. AI RESUME IMPROVE ACTION
    // ==========================================
    if (action === 'improve-resume') {
      const { resumeData } = body;
      const improvedResume = await improveEntireResume(resumeData);
      return NextResponse.json({ improvedResume });
    }

    // ==========================================
    // 14. AI CHAT STREAMING COACH ACTION
    // ==========================================
    if (action === 'chat-stream') {
      const { message = '', history = [], resumeData } = body;
      const stream = await chatAssistantStream(message, history, resumeData);
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        }
      });
    }

    // ==========================================
    // 15. AI CAREER ASSISTANT SUITE ACTIONS
    // ==========================================
    if (action === 'career-assistant') {
      const { type = '', resumeData, targetRole = '', jobDescription = '', input = '' } = body;
      const result = await generateCareerAssistantContent(type, resumeData, {
        targetRole,
        jobDescription,
        input
      });
      return NextResponse.json(result);
    }

    // ==========================================
    // 16. PREMIUM EXPERIENCE BULLET REWRITER ACTION
    // ==========================================
    if (action === 'bullet-rewrite') {
      const { bullet = '', position = '', company = '' } = body;
      const suggestions = await rewriteExperienceBullet(bullet, position, company);
      return NextResponse.json(suggestions);
    }

    // ==========================================
    // 17. ATS SKILL GAP ANALYZER ACTION
    // ==========================================
    if (action === 'skill-gap') {
      const { resumeData, jobDescription = '' } = body;
      const result = await analyzeSkillGap(resumeData, jobDescription);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('Gemini AI API handler error:', err);
    return NextResponse.json({ error: err.message || 'An error occurred during AI generation' }, { status: 500 });
  }
}
