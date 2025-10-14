-- Initial schema for Smart Learning Hub on Supabase
-- Run this script in Supabase SQL editor (or via Supabase CLI) on your project.
-- It creates the core tables used by the backend API.

-- Enable required extension for UUID generation
create extension if not exists pgcrypto;

-- USERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  full_name text not null,
  role text not null default 'student',
  age int,
  guardian_name text,
  guardian_contact text,
  specialization text,
  profile_picture_url text,
  bio text,
  created_at timestamptz not null default now()
);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_created_at on public.users(created_at);

-- COURSES
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text,
  difficulty_level text,
  estimated_duration int,
  instructor_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_courses_instructor on public.courses(instructor_id);
create index if not exists idx_courses_created_at on public.courses(created_at);

-- LESSONS
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  content text,
  duration_minutes int,
  order_index int not null default 0,
  video_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_lessons_course on public.lessons(course_id);
create index if not exists idx_lessons_order on public.lessons(course_id, order_index);

-- ENROLLMENTS
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique(user_id, course_id)
);
create index if not exists idx_enrollments_user on public.enrollments(user_id);
create index if not exists idx_enrollments_course on public.enrollments(course_id);

-- LESSON PROGRESS
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  completed boolean not null default false,
  time_spent int not null default 0,
  last_accessed timestamptz not null default now(),
  unique(user_id, lesson_id)
);
create index if not exists idx_progress_user on public.lesson_progress(user_id);
create index if not exists idx_progress_lesson on public.lesson_progress(lesson_id);
create index if not exists idx_progress_enrollment on public.lesson_progress(enrollment_id);

-- NOTE on RLS:
-- If you plan to use anon key from the backend, create appropriate RLS policies.
-- Since the backend is now configured to use the service role key, it bypasses RLS.
-- You may still enable RLS for safety; service role is exempt.

-- Optional: enable RLS
-- alter table public.users enable row level security;
-- alter table public.courses enable row level security;
-- alter table public.lessons enable row level security;
-- alter table public.enrollments enable row level security;
-- alter table public.lesson_progress enable row level security;

-- Minimal policies (optional) if you ever use anon key directly from clients
-- create policy "read_courses_all" on public.courses for select using (true);
-- create policy "read_lessons_all" on public.lessons for select using (true);
