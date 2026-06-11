import { NextResponse } from 'next/server';
import {
  generateSummary,
  rewriteExperience,
  suggestSkills,
  generateCoverLetter,
  checkAtsScore,
  tailorResume,
  analyzeResume,
  chatAssistant,
  rewriteInPlace,
  quantifyAchievements,
  generateInterviewPrep
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
    // 4. COVER LETTER GENERATOR ACTION
    // ==========================================
    if (action === 'cover-letter') {
      const { resumeData, jobDescription = '' } = body;
      const coverLetter = await generateCoverLetter(resumeData, jobDescription);
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
    // 7. RESUME TAILORING ACTION
    // ==========================================
    if (action === 'tailor') {
      const { resumeData, jobDescription = '' } = body;
      const tailoring = await tailorResume(resumeData, jobDescription);
      return NextResponse.json(tailoring);
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

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('Gemini AI API handler error:', err);
    return NextResponse.json({ error: err.message || 'An error occurred during AI generation' }, { status: 500 });
  }
}
