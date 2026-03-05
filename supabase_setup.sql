-- ==============================================================================
-- 1. Setup Profiles Table (Links to Supabase Auth)
-- ==============================================================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique,
  full_name text,
  role text default 'Software Engineer',
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  
  constraint username_length check (char_length(full_name) >= 2)
);

-- Enable RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- ==============================================================================
-- 2. Setup Resumes Table (Stores Analysis Results)
-- ==============================================================================
create table public.resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  file_name text not null,
  file_size bigint,
  job_role text,
  score integer,
  analysis_data jsonb, -- Stores full JSON analysis (skills, summary, etc.)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.resumes enable row level security;

-- Policies
create policy "Users can view their own resumes."
  on public.resumes for select
  using ( auth.uid() = user_id );

create policy "Users can upload their own resumes."
  on public.resumes for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own resumes."
  on public.resumes for delete
  using ( auth.uid() = user_id );

-- ==============================================================================
-- 3. Automation: Auto-create Profile on Signup
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'Software Engineer')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

