-- ===================================================
-- 1. Create Profiles Table (user profiles)
-- ===================================================
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

-- Policies for Profiles
drop policy if exists "Users can view their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;

create policy "Users can view their own profile."
  on public.profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile."
  on public.profiles
  for update
  using (auth.uid() = user_id);


-- ===================================================
-- 2. Create Signup Profile Sync Trigger
-- ===================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_id, full_name, email, avatar_url)
  values (
    gen_random_uuid(),
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ===================================================
-- 3. Create Resumes Table
-- ===================================================
create table if not exists public.resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null default 'My Professional Resume',
  template_id text not null default 'modern-minimalist',
  resume_data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Resumes
alter table public.resumes enable row level security;

-- Policies for Resumes
drop policy if exists "Users can perform CRUD on their own resumes" on public.resumes;
drop policy if exists "Anyone can view public resumes" on public.resumes;

create policy "Users can perform CRUD on their own resumes"
  on public.resumes
  for all
  using (auth.uid() = user_id);


-- ===================================================
-- 4. Create Projects Table
-- ===================================================
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references public.resumes on delete cascade not null,
  project_name text not null,
  description text,
  technologies text, -- Comma-separated list or plain text
  github_url text,
  live_url text
);

-- Enable RLS
alter table public.projects enable row level security;

drop policy if exists "Users can manage projects for their own resumes" on public.projects;
create policy "Users can manage projects for their own resumes"
  on public.projects
  for all
  using (
    exists (
      select 1 from public.resumes
      where public.resumes.id = public.projects.resume_id
      and public.resumes.user_id = auth.uid()
    )
  );


-- ===================================================
-- 5. Create Experience Table
-- ===================================================
create table if not exists public.experience (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references public.resumes on delete cascade not null,
  company text not null,
  position text not null,
  start_date text,
  end_date text,
  description text[] -- Bullet points
);

-- Enable RLS
alter table public.experience enable row level security;

drop policy if exists "Users can manage experience for their own resumes" on public.experience;
create policy "Users can manage experience for their own resumes"
  on public.experience
  for all
  using (
    exists (
      select 1 from public.resumes
      where public.resumes.id = public.experience.resume_id
      and public.resumes.user_id = auth.uid()
    )
  );


-- ===================================================
-- 6. Create Education Table
-- ===================================================
create table if not exists public.education (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references public.resumes on delete cascade not null,
  degree text not null,
  institution text not null,
  start_date text,
  end_date text
);

-- Enable RLS
alter table public.education enable row level security;

drop policy if exists "Users can manage education for their own resumes" on public.education;
create policy "Users can manage education for their own resumes"
  on public.education
  for all
  using (
    exists (
      select 1 from public.resumes
      where public.resumes.id = public.education.resume_id
      and public.resumes.user_id = auth.uid()
    )
  );


-- ===================================================
-- 7. Create Skills Table
-- ===================================================
create table if not exists public.skills (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references public.resumes on delete cascade not null,
  skill_name text not null,
  category text -- 'technical' or 'soft'
);

-- Enable RLS
alter table public.skills enable row level security;

drop policy if exists "Users can manage skills for their own resumes" on public.skills;
create policy "Users can manage skills for their own resumes"
  on public.skills
  for all
  using (
    exists (
      select 1 from public.resumes
      where public.resumes.id = public.skills.resume_id
      and public.resumes.user_id = auth.uid()
    )
  );


-- ===================================================
-- 8. Create Atomic Save RPC Function
-- ===================================================
create or replace function public.save_complete_resume(
  p_resume_id uuid,
  p_title text,
  p_template_id text,
  p_resume_data jsonb,
  p_experiences jsonb,
  p_educations jsonb,
  p_projects jsonb,
  p_skills jsonb
) returns void as $$
declare
  v_user_id uuid;
begin
  -- Get user_id of the current resume
  select user_id into v_user_id from public.resumes where id = p_resume_id;
  
  -- Guard check
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;
  
  -- 1. Update resume root
  update public.resumes
  set title = p_title,
      template_id = p_template_id,
      resume_data = p_resume_data,
      updated_at = now()
  where id = p_resume_id;
  
  -- 2. Sync experiences
  delete from public.experience where resume_id = p_resume_id;
  if jsonb_array_length(p_experiences) > 0 then
    insert into public.experience (resume_id, company, position, start_date, end_date, description)
    select p_resume_id,
           (val->>'company'),
           (val->>'position'),
           (val->>'startDate'),
           (val->>'endDate'),
           array(select jsonb_array_elements_text(val->'description'))
    from jsonb_array_elements(p_experiences) as val;
  end if;
  
  -- 3. Sync educations
  delete from public.education where resume_id = p_resume_id;
  if jsonb_array_length(p_educations) > 0 then
    insert into public.education (resume_id, degree, institution, start_date, end_date)
    select p_resume_id,
           (val->>'degree'),
           (val->>'school'),
           (val->>'startDate'),
           (val->>'endDate')
    from jsonb_array_elements(p_educations) as val;
  end if;
  
  -- 4. Sync projects
  delete from public.projects where resume_id = p_resume_id;
  if jsonb_array_length(p_projects) > 0 then
    insert into public.projects (resume_id, project_name, description, technologies, github_url, live_url)
    select p_resume_id,
           (val->>'projectName'),
           (val->>'description'),
           (val->>'technologies'),
           (val->>'githubUrl'),
           (val->>'liveUrl')
    from jsonb_array_elements(p_projects) as val;
  end if;
  
  -- 5. Sync skills
  delete from public.skills where resume_id = p_resume_id;
  if jsonb_array_length(p_skills) > 0 then
    insert into public.skills (resume_id, skill_name, category)
    select p_resume_id,
           (val->>'skillName'),
           (val->>'category')
    from jsonb_array_elements(p_skills) as val;
  end if;
  
end;
$$ language plpgsql security definer;
