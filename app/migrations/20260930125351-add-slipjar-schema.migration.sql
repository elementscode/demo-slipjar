-- add slipjar schema

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create type userRole as enum ('employee', 'approver');
create type reportStatus as enum ('draft', 'submitted', 'approved', 'returned');
create type expenseCategory as enum ('travel', 'meals', 'software', 'supplies', 'other');
create type reportEventKind as enum ('submitted', 'approved', 'returned');

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  role userRole not null default 'employee',
  passwordHash text not null
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table receipts (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users(id) on delete cascade,
  name text not null,
  contentType text not null,
  size integer not null,
  data bytea not null,
  -- The cache key: recomputed with the bytes, so a URL carrying it never
  -- names stale data.
  hash text generated always as (encode(sha256(data), 'hex')) stored
);

create trigger receiptsTouchUpdatedAt
  before update on receipts
  for each row execute function touchUpdatedAt();

create table reports (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users(id) on delete cascade,
  title text not null,
  status reportStatus not null default 'draft',
  submittedAt timestamptz,
  decidedAt timestamptz,
  decidedBy uuid references users(id) on delete set null
);

create index reportsUserIdIdx on reports (userId, createdAt desc);
create index reportsStatusIdx on reports (status, submittedAt);

create trigger reportsTouchUpdatedAt
  before update on reports
  for each row execute function touchUpdatedAt();

create table expenses (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users(id) on delete cascade,
  reportId uuid references reports(id) on delete set null,
  receiptId uuid references receipts(id) on delete set null,
  spentOn date not null,
  merchant text not null,
  amountCents integer not null check (amountCents > 0),
  category expenseCategory not null,
  note text not null default ''
);

create index expensesUserIdIdx on expenses (userId, spentOn desc);
create index expensesReportIdIdx on expenses (reportId);
create index expensesSpentOnIdx on expenses (spentOn);

create trigger expensesTouchUpdatedAt
  before update on expenses
  for each row execute function touchUpdatedAt();

-- The report's history: every submit and decision, with the comment that
-- came with it.
create table reportEvents (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  reportId uuid not null references reports(id) on delete cascade,
  userId uuid not null references users(id) on delete cascade,
  kind reportEventKind not null,
  comment text not null default ''
);

create index reportEventsReportIdIdx on reportEvents (reportId, createdAt);

create trigger reportEventsTouchUpdatedAt
  before update on reportEvents
  for each row execute function touchUpdatedAt();
