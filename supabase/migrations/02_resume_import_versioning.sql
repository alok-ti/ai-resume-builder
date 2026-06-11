-- ===================================================
-- Add versioning and lineage columns to Resumes
-- ===================================================

-- 1. Add parent_id for version tracking
ALTER TABLE public.resumes 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.resumes(id) ON DELETE CASCADE;

-- 2. Add version_type to distinguish originals, improvements, and specific job-tailored copies
ALTER TABLE public.resumes 
ADD COLUMN IF NOT EXISTS version_type text NOT NULL DEFAULT 'original';

-- 3. Create index for faster querying of document history/lineage
CREATE INDEX IF NOT EXISTS resumes_parent_id_idx ON public.resumes(parent_id);
CREATE INDEX IF NOT EXISTS resumes_version_type_idx ON public.resumes(version_type);
