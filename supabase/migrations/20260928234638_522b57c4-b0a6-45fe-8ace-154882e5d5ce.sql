create table public.ai_playbook (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  content text not null,
  change_note text,
  created_by_name text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);
grant select, insert on public.ai_playbook to authenticated;
grant all on public.ai_playbook to service_role;
alter table public.ai_playbook enable row level security;
create policy "staff read playbook" on public.ai_playbook for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create policy "admin add playbook" on public.ai_playbook for insert to authenticated with check (public.has_role(auth.uid(),'admin'));

create table public.ai_agent_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by_name text
);
grant select, insert, update on public.ai_agent_settings to authenticated;
grant all on public.ai_agent_settings to service_role;
alter table public.ai_agent_settings enable row level security;
create policy "staff read ai settings" on public.ai_agent_settings for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create policy "admin write ai settings" on public.ai_agent_settings for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update ai settings" on public.ai_agent_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));
insert into public.ai_agent_settings(key,value) values ('mode','"shadow"'),('daily_email_cap','40');

create table public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.contact_submissions(id),
  trigger text not null,
  status text not null default 'running',
  stage_summary text,
  next_step text,
  reasoning text,
  needs_human boolean not null default false,
  human_reason text,
  confidence numeric,
  playbook_version integer,
  error text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);
grant select on public.ai_agent_runs to authenticated;
grant all on public.ai_agent_runs to service_role;
alter table public.ai_agent_runs enable row level security;
create policy "staff read runs" on public.ai_agent_runs for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create index on public.ai_agent_runs(submission_id, created_at desc);

create table public.ai_agent_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_agent_runs(id),
  submission_id uuid not null references public.contact_submissions(id),
  action_type text not null,
  status text not null default 'proposed',
  reason text,
  confidence numeric,
  email_to text,
  email_subject text,
  email_body text,
  note_body text,
  gmail_thread_id text,
  original_email_body text,
  decided_by_name text,
  decided_at timestamptz,
  executed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);
grant select, update on public.ai_agent_actions to authenticated;
grant all on public.ai_agent_actions to service_role;
alter table public.ai_agent_actions enable row level security;
create policy "staff read actions" on public.ai_agent_actions for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create policy "staff update actions" on public.ai_agent_actions for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create index on public.ai_agent_actions(status, created_at desc);

alter table public.contact_submissions add column if not exists ai_paused_at timestamptz;