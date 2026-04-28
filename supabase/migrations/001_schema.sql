create extension if not exists "uuid-ossp";

create table if not exists public.people (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null unique,
  full_name text not null,
  birth_date text,
  birth_place text,
  death_date text,
  death_place text,
  spouse_name text,
  marriage_date text,
  father_name text,
  mother_name text,
  connecting_child text,
  main_question text,
  current_step integer not null default 1,
  status text not null default 'Needs Proof' check (status in ('Verified','Likely','Needs Proof','Conflict','Probably Wrong','Done for Now')),
  concern text,
  generation_number integer,
  is_direct_line boolean not null default false,
  is_fast_track boolean not null default false,
  cleanup_note_added boolean not null default false,
  ancestry_profile_url text,
  started_at timestamptz,
  last_worked_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text not null,
  source_title text not null,
  record_type text,
  record_year text,
  record_place text,
  what_it_says text,
  what_it_proves text,
  what_it_does_not_prove text,
  relationship_proven text,
  keep_decision text check (keep_decision in ('Keep','Maybe','No','Clue Only')),
  confidence text,
  source_quality_tier text check (source_quality_tier in ('Original Record','Derivative Record','Authored Work','Family Tree / Other','Find A Grave','Unknown')),
  ancestry_url text,
  downloaded boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text not null,
  relationship_type text not null check (relationship_type in ('Spouse','Connecting Child','Father','Mother','Other')),
  related_person_name text,
  claim text,
  evidence_summary text,
  status text not null check (status in ('Verified','Likely','Needs Proof','Conflict','Probably Wrong')),
  sources_supporting text,
  problems text,
  suggested_searches text,
  created_at timestamptz not null default now()
);

create table if not exists public.hints_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text not null,
  research_question text,
  type text,
  site text,
  search_terms text,
  result_description text,
  decision text,
  same_name_risk text,
  next_step text,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_summary (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text not null,
  claim_being_checked text,
  evidence_for text,
  evidence_against text,
  best_conclusion text,
  status text check (status in ('Verified','Likely','Needs Proof','Conflict','Probably Wrong','Done for Now')),
  strongest_sources text,
  still_needed text,
  cleanup_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.next_steps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text not null,
  task text not null,
  priority text not null check (priority in ('High','Medium','Low')),
  where_to_search text,
  why_it_matters text,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.downloads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text not null,
  record_type text,
  record_year text,
  record_place text,
  source_site text,
  file_name text,
  folder_location text,
  downloaded boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;
alter table public.sources enable row level security;
alter table public.relationships enable row level security;
alter table public.hints_searches enable row level security;
alter table public.evidence_summary enable row level security;
alter table public.next_steps enable row level security;
alter table public.downloads enable row level security;

create policy "own_people" on public.people for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_sources" on public.sources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_relationships" on public.relationships for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_hints" on public.hints_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_evidence" on public.evidence_summary for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_next_steps" on public.next_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_downloads" on public.downloads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
