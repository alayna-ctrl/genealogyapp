-- Enable UUID helper
create extension if not exists "pgcrypto";

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text,
  source_title text not null,
  record_type text,
  record_year text,
  record_place text,
  what_it_says text,
  what_it_proves text,
  what_it_does_not_prove text,
  relationship_proven text,
  keep_decision text check (keep_decision in ('Keep','Maybe','No','Clue Only')),
  confidence text check (confidence in ('High','Medium','Low','Unreviewed')),
  source_quality_tier text check (source_quality_tier in ('Original Record','Derivative Record','Authored Work','Family Tree / Other','Find A Grave','Unknown')),
  ancestry_url text,
  downloaded boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text,
  relationship_type text check (relationship_type in ('Spouse','Connecting Child','Father','Mother','Other')),
  related_person_name text,
  claim text,
  evidence_summary text,
  status text check (status in ('Verified','Likely','Needs Proof','Conflict','Probably Wrong')),
  sources_supporting text,
  problems text,
  suggested_searches text,
  created_at timestamptz not null default now()
);

create table if not exists public.hints_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text,
  research_question text,
  type text check (type in ('Ancestry Hint','FamilySearch Search','Manual Search','Other')),
  site text,
  search_terms text,
  result_description text,
  decision text check (decision in ('Attach','Reject','Maybe','Clue Only','Logged - Nothing Found','Needs Follow-Up')),
  same_name_risk text check (same_name_risk in ('Yes - common name','Possibly','No - distinctive name')),
  next_step text,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_summary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text,
  claim_being_checked text,
  evidence_for text,
  evidence_against text,
  best_conclusion text,
  status text check (status in ('Verified','Likely','Needs Proof','Conflict','Probably Wrong')),
  strongest_sources text,
  still_needed text,
  cleanup_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.next_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text,
  task text not null,
  priority text check (priority in ('High','Medium','Low')),
  where_to_search text,
  why_it_matters text,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(person_id) on delete cascade,
  person_name text,
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

create index if not exists people_user_id_idx on public.people(user_id);
create index if not exists people_person_id_idx on public.people(person_id);
create index if not exists sources_user_id_idx on public.sources(user_id);
create index if not exists relationships_user_id_idx on public.relationships(user_id);
create index if not exists hints_searches_user_id_idx on public.hints_searches(user_id);
create index if not exists evidence_summary_user_id_idx on public.evidence_summary(user_id);
create index if not exists next_steps_user_id_idx on public.next_steps(user_id);
create index if not exists downloads_user_id_idx on public.downloads(user_id);

alter table public.people enable row level security;
alter table public.sources enable row level security;
alter table public.relationships enable row level security;
alter table public.hints_searches enable row level security;
alter table public.evidence_summary enable row level security;
alter table public.next_steps enable row level security;
alter table public.downloads enable row level security;

create policy "people_select_own" on public.people for select using (auth.uid() = user_id);
create policy "people_insert_own" on public.people for insert with check (auth.uid() = user_id);
create policy "people_update_own" on public.people for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "people_delete_own" on public.people for delete using (auth.uid() = user_id);

create policy "sources_select_own" on public.sources for select using (auth.uid() = user_id);
create policy "sources_insert_own" on public.sources for insert with check (auth.uid() = user_id);
create policy "sources_update_own" on public.sources for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sources_delete_own" on public.sources for delete using (auth.uid() = user_id);

create policy "relationships_select_own" on public.relationships for select using (auth.uid() = user_id);
create policy "relationships_insert_own" on public.relationships for insert with check (auth.uid() = user_id);
create policy "relationships_update_own" on public.relationships for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "relationships_delete_own" on public.relationships for delete using (auth.uid() = user_id);

create policy "hints_searches_select_own" on public.hints_searches for select using (auth.uid() = user_id);
create policy "hints_searches_insert_own" on public.hints_searches for insert with check (auth.uid() = user_id);
create policy "hints_searches_update_own" on public.hints_searches for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "hints_searches_delete_own" on public.hints_searches for delete using (auth.uid() = user_id);

create policy "evidence_summary_select_own" on public.evidence_summary for select using (auth.uid() = user_id);
create policy "evidence_summary_insert_own" on public.evidence_summary for insert with check (auth.uid() = user_id);
create policy "evidence_summary_update_own" on public.evidence_summary for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "evidence_summary_delete_own" on public.evidence_summary for delete using (auth.uid() = user_id);

create policy "next_steps_select_own" on public.next_steps for select using (auth.uid() = user_id);
create policy "next_steps_insert_own" on public.next_steps for insert with check (auth.uid() = user_id);
create policy "next_steps_update_own" on public.next_steps for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "next_steps_delete_own" on public.next_steps for delete using (auth.uid() = user_id);

create policy "downloads_select_own" on public.downloads for select using (auth.uid() = user_id);
create policy "downloads_insert_own" on public.downloads for insert with check (auth.uid() = user_id);
create policy "downloads_update_own" on public.downloads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "downloads_delete_own" on public.downloads for delete using (auth.uid() = user_id);
