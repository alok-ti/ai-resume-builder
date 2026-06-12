-- ===================================================
-- Create database indexes to optimize select query execution plans
-- ===================================================

CREATE INDEX IF NOT EXISTS resumes_user_id_idx ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS cover_letters_user_id_idx ON public.cover_letters(user_id);
CREATE INDEX IF NOT EXISTS cover_letters_resume_id_idx ON public.cover_letters(resume_id);
CREATE INDEX IF NOT EXISTS job_applications_user_id_idx ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS job_applications_resume_id_idx ON public.job_applications(resume_id);
CREATE INDEX IF NOT EXISTS experience_resume_id_idx ON public.experience(resume_id);
CREATE INDEX IF NOT EXISTS education_resume_id_idx ON public.education(resume_id);
CREATE INDEX IF NOT EXISTS projects_resume_id_idx ON public.projects(resume_id);
CREATE INDEX IF NOT EXISTS skills_resume_id_idx ON public.skills(resume_id);
