-- Task Groups and Tasks (for startup/tasks tab)
-- Run after organizations, profiles, and org_memberships exist

-- 1) UUID helper (if needed)
create extension if not exists pgcrypto;

-- 2) Enums (safe create)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'note_source') then
    create type note_source as enum ('human','ai');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('todo','in_progress','blocked','done','canceled');
  end if;
end$$;

-- 3) Parent table first: task_groups
create table if not exists task_groups (
  id uuid primary key default gen_random_uuid(),
  startup_org_id uuid not null references organizations(id) on update cascade on delete cascade,
  title text not null,
  category text,
  impact text,
  how_to_approach text,
  source note_source not null default 'ai',
  sort_order int not null default 0,
  deleted_at timestamptz,
  deleted_by uuid references profiles(id) on update cascade on delete set null,
  created_by uuid references profiles(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_task_groups_startup_sort
  on task_groups (startup_org_id, sort_order);

-- 4) Child table: tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references task_groups(id) on update cascade on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  due_at timestamptz,
  sort_order int not null default 0,
  requires_rescore boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references profiles(id) on update cascade on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references profiles(id) on update cascade on delete set null,
  created_by uuid references profiles(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_tasks_completion_consistency
    check ((status <> 'done') or (completed_at is not null))
);

create index if not exists idx_tasks_group_sort
  on tasks (group_id, sort_order);

create index if not exists idx_tasks_status
  on tasks (status);

create index if not exists idx_tasks_due_at
  on tasks (due_at);

-- RLS (optional – adjust policies to your needs)
alter table task_groups enable row level security;
alter table tasks enable row level security;

-- Org members can read their startup's task groups and tasks
create policy "Org members can read task_groups"
  on task_groups for select
  using (
    startup_org_id in (
      select org_id from org_memberships where user_id = auth.uid() and is_active = true
    )
  );

create policy "Org members can read tasks"
  on tasks for select
  using (
    group_id in (
      select id from task_groups
      where startup_org_id in (
        select org_id from org_memberships where user_id = auth.uid() and is_active = true
      )
    )
  );

-- Service role has full access (for backend)
create policy "Service role full access task_groups"
  on task_groups for all
  using (true)
  with check (true);

create policy "Service role full access tasks"
  on tasks for all
  using (true)
  with check (true);
