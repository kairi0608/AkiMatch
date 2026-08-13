create table if not exists schedules (
  id text primary key,
  owner_token text not null,
  title text not null check (char_length(title) between 1 and 80),
  start_date date not null,
  duration_days integer not null check (duration_days between 1 and 60),
  daily_start_hour integer not null check (daily_start_hour between 0 and 23),
  daily_end_hour integer not null check (daily_end_hour between 1 and 24),
  required_duration_hours integer not null check (required_duration_hours between 1 and 8),
  created_at timestamptz not null default now(),
  check (daily_end_hour > daily_start_hour),
  check (required_duration_hours <= daily_end_hour - daily_start_hour)
);

create table if not exists participants (
  id text primary key,
  schedule_id text not null references schedules(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists availabilities (
  participant_id text not null references participants(id) on delete cascade,
  date date not null,
  hour integer not null check (hour between 0 and 23),
  status text not null check (status in ('AVAILABLE', 'DIFFICULT', 'UNAVAILABLE')),
  source text not null check (source in ('MANUAL', 'AI')),
  primary key (participant_id, date, hour)
);

create index if not exists schedules_owner_created_idx
  on schedules(owner_token, created_at desc);
create index if not exists participants_schedule_idx
  on participants(schedule_id, created_at);
create index if not exists availabilities_participant_idx
  on availabilities(participant_id);

-- DATABASE_URLはVercelのサーバーAPIだけで使用します。
-- ブラウザへデータベース接続情報を公開しないでください。
