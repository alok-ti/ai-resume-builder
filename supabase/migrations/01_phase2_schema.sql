-- ===================================================
-- 1. Create Cover Letters Table
-- ===================================================
create table if not exists public.cover_letters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  resume_id uuid references public.resumes on delete set null,
  title text not null default 'Tailored Cover Letter',
  recipient_name text,
  recipient_title text,
  company_name text not null,
  job_title text not null,
  letter_body text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Cover Letters
alter table public.cover_letters enable row level security;

-- Policies for Cover Letters
drop policy if exists "Users can perform CRUD on their own cover letters" on public.cover_letters;
create policy "Users can perform CRUD on their own cover letters"
  on public.cover_letters
  for all
  using (auth.uid() = user_id);


-- ===================================================
-- 2. Create Job Applications Table (Kanban Board tracking)
-- ===================================================
create table if not exists public.job_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  resume_id uuid references public.resumes on delete set null,
  company text not null,
  position text not null,
  status text not null default 'applied', -- 'applied' | 'interviewing' | 'offered' | 'rejected'
  salary text,
  job_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Job Applications
alter table public.job_applications enable row level security;

-- Policies for Job Applications
drop policy if exists "Users can perform CRUD on their own job applications" on public.job_applications;
create policy "Users can perform CRUD on their own job applications"
  on public.job_applications
  for all
  using (auth.uid() = user_id);


-- ===================================================
-- 3. Create Resume Analytics Table (views & downloads)
-- ===================================================
create table if not exists public.resume_analytics (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references public.resumes on delete cascade not null unique,
  view_count integer not null default 0,
  download_count integer not null default 0,
  last_viewed_at timestamp with time zone,
  last_downloaded_at timestamp with time zone
);

-- Enable RLS for Resume Analytics
alter table public.resume_analytics enable row level security;

-- Policies for Resume Analytics
drop policy if exists "Users can manage analytics for their own resumes" on public.resume_analytics;
create policy "Users can manage analytics for their own resumes"
  on public.resume_analytics
  for all
  using (
    exists (
      select 1 from public.resumes
      where public.resumes.id = public.resume_analytics.resume_id
      and public.resumes.user_id = auth.uid()
    )
  );

-- Helper trigger to automatically insert analytics row on resume creation
create or replace function public.handle_new_resume_analytics()
returns trigger as $$
begin
  insert into public.resume_analytics (resume_id)
  values (new.id)
  on conflict (resume_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_resume_created_analytics on public.resumes;
create trigger on_resume_created_analytics
  after insert on public.resumes
  for each row execute procedure public.handle_new_resume_analytics();

-- Insert analytics rows for any existing resumes
insert into public.resume_analytics (resume_id)
select id from public.resumes
on conflict (resume_id) do nothing;
