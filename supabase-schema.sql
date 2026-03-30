-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Entries table
create table if not exists entries (
  id text primary key,
  source text,
  insight text,
  "insightBlocks" jsonb,
  "careerConnection" text,
  "connectionBlocks" jsonb,
  category text not null,
  links jsonb default '[]'::jsonb,
  pdfs jsonb default '[]'::jsonb,
  date timestamptz not null default now(),
  created_at timestamptz default now()
);

-- Signals table
create table if not exists signals (
  id text primary key,
  title text not null,
  type text not null default 'article',
  source text,
  url text,
  quote text,
  note text,
  nodes jsonb default '[]'::jsonb,
  date timestamptz not null default now(),
  created_at timestamptz default now()
);

-- Milestones table
create table if not exists milestones (
  node_id text primary key,
  completed jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- Enable Row Level Security on all tables
alter table entries enable row level security;
alter table signals enable row level security;
alter table milestones enable row level security;

-- Policies: anyone can read, only authenticated users can write
create policy "Public read entries" on entries for select using (true);
create policy "Auth insert entries" on entries for insert with check (auth.role() = 'authenticated');
create policy "Auth update entries" on entries for update using (auth.role() = 'authenticated');
create policy "Auth delete entries" on entries for delete using (auth.role() = 'authenticated');

create policy "Public read signals" on signals for select using (true);
create policy "Auth insert signals" on signals for insert with check (auth.role() = 'authenticated');
create policy "Auth update signals" on signals for update using (auth.role() = 'authenticated');
create policy "Auth delete signals" on signals for delete using (auth.role() = 'authenticated');

create policy "Public read milestones" on milestones for select using (true);
create policy "Auth upsert milestones" on milestones for insert with check (auth.role() = 'authenticated');
create policy "Auth update milestones" on milestones for update using (auth.role() = 'authenticated');
