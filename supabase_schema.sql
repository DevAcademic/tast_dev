-- Dashboard SQL schema for Supabase
-- Paste this full code into Supabase SQL Editor and run it.

-- 1) Required extension
create extension if not exists pgcrypto;

-- 2) dashboard shared data store
create table if not exists academy_data (
  id text primary key,
  content jsonb not null,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.academy_data (id, content)
values ('main','{}'::jsonb)
on conflict (id) do nothing;

-- 3) admins table for publish access
create table if not exists admins (
  uid uuid primary key,
  role text not null default 'admin',
  inserted_at timestamptz default now()
);

-- 4) app tables
create table if not exists users (
  id UUID primary key,
  email TEXT unique not null,
  phone TEXT,
  full_name TEXT,
  photo_url TEXT,
  registered_at TIMESTAMP DEFAULT NOW()
);

create table if not exists departments (
  id UUID DEFAULT gen_random_uuid() primary key,
  name TEXT not null unique,
  emoji TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

create unique index if not exists departments_name_unique on departments(name);

create table if not exists teachers (
  id UUID DEFAULT gen_random_uuid() primary key,
  department_id UUID references departments(id) on delete cascade,
  name TEXT not null,
  emoji TEXT,
  subject TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

create table if not exists codes (
  id UUID DEFAULT gen_random_uuid() primary key,
  teacher_id UUID references teachers(id) on delete cascade,
  code TEXT unique not null,
  is_used boolean default false,
  is_locked boolean default false,
  user_id UUID references auth.users(id) on delete set null,
  device_id TEXT,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

create unique index if not exists codes_code_unique on codes(code);

create table if not exists teacher_codes (
  id UUID DEFAULT gen_random_uuid() primary key,
  code TEXT unique not null,
  teacher_name TEXT,
  teacher_department TEXT,
  user_id UUID references auth.users(id) on delete set null,
  user_email TEXT,
  device_id TEXT,
  used boolean default false,
  locked boolean default false,
  used_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists teacher_codes_code_unique on teacher_codes(code);

create table if not exists semesters (
  id UUID DEFAULT gen_random_uuid() primary key,
  teacher_id UUID references teachers(id) on delete cascade,
  number integer not null,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

create table if not exists lectures (
  id UUID DEFAULT gen_random_uuid() primary key,
  semester_id UUID references semesters(id) on delete cascade,
  number integer not null,
  title TEXT not null,
  youtube_url TEXT not null,
  is_free boolean default false,
  created_at TIMESTAMP DEFAULT NOW()
);

create table if not exists user_codes (
  id UUID DEFAULT gen_random_uuid() primary key,
  user_id UUID references auth.users(id) on delete cascade,
  code_id UUID references codes(id) on delete cascade,
  used_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, code_id)
);

create unique index if not exists user_codes_user_code_unique on user_codes(user_id, code_id);

create table if not exists user_teachers (
  id UUID DEFAULT gen_random_uuid() primary key,
  user_id UUID references auth.users(id) on delete cascade,
  teacher_id UUID references teachers(id) on delete cascade,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, teacher_id)
);

insert into departments (name, emoji, description) values
('الرياضيات', '📐', 'قسم الرياضيات - دراسة الأعداد والعمليات والهندسة'),
('اللغة العربية', '📖', 'قسم اللغة العربية - دراسة النحو والصرف والأدب'),
('الفيزياء', '⚛️', 'قسم الفيزياء - دراسة المادة والطاقة والحركة'),
('الأحياء', '🧬', 'قسم الأحياء - دراسة الكائنات الحية والجينات'),
('اللغة الإنجليزية', '🇬🇧', 'قسم اللغة الإنجليزية - دراسة القواعد والمفردات'),
('التاريخ', '🏛️', 'قسم التاريخ - دراسة الحضارات والأحداث التاريخية'),
('التربية الإسلامية', '🕌', 'قسم التربية الإسلامية - دراسة القرآن اسلامية')
on conflict (name) do nothing;

-- 5) secure policies for academy_data
alter table academy_data enable row level security;

drop policy if exists public_select_academy on academy_data;
create policy public_select_academy on academy_data
  for select
  using (true);

drop policy if exists admins_insert_academy on academy_data;
create policy admins_insert_academy on academy_data
  for insert
  with check (exists (select 1 from admins where uid = auth.uid()));

drop policy if exists admins_update_academy on academy_data;
create policy admins_update_academy on academy_data
  for update
  using (exists (select 1 from admins where uid = auth.uid()))
  with check (exists (select 1 from admins where uid = auth.uid()));

-- 6) secure policies for codes
alter table codes enable row level security;

drop policy if exists codes_public_select on codes;
create policy codes_public_select on codes
  for select
  using (true);

drop policy if exists codes_admin_insert on codes;
create policy codes_admin_insert on codes
  for insert
  with check (exists (select 1 from admins where uid = auth.uid()));

drop policy if exists codes_user_update on codes;
create policy codes_user_update on codes
  for update
  using ((user_id = auth.uid()) OR (exists (select 1 from admins where uid = auth.uid())))
  with check ((user_id = auth.uid()) OR (exists (select 1 from admins where uid = auth.uid())));

-- 7) secure policies for teacher_codes
alter table teacher_codes enable row level security;

drop policy if exists teacher_codes_public_select on teacher_codes;
create policy teacher_codes_public_select on teacher_codes
  for select
  using (auth.role() = 'authenticated' AND user_id = auth.uid());

drop policy if exists teacher_codes_insert_authenticated on teacher_codes;
create policy teacher_codes_insert_authenticated on teacher_codes
  for insert
  with check (auth.role() = 'authenticated' AND user_id = auth.uid());

drop policy if exists teacher_codes_update_authenticated on teacher_codes;
create policy teacher_codes_update_authenticated on teacher_codes
  for update
  using (auth.role() = 'authenticated' AND user_id = auth.uid())
  with check (auth.role() = 'authenticated' AND user_id = auth.uid());

-- 8) secure policy for user_codes insert
alter table user_codes enable row level security;

drop policy if exists user_codes_insert_authenticated on user_codes;
create policy user_codes_insert_authenticated on user_codes
  for insert
  with check (auth.role() = 'authenticated' AND user_id = auth.uid());

-- 8) secure RPC function to activate a code
create or replace function public.activate_code(p_code text, p_device_id text)
returns jsonb language plpgsql security definer stable as $$
declare
  v_code record;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'message', 'Unauthenticated');
  end if;

  select * into v_code from codes where code = p_code for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Code not found');
  end if;

  if v_code.is_locked then
    return jsonb_build_object('success', false, 'message', 'Code locked');
  end if;

  if v_code.is_used then
    return jsonb_build_object('success', false, 'message', 'Code already used');
  end if;

  update codes set is_used = true, user_id = v_uid, device_id = p_device_id, used_at = now() where id = v_code.id;

  insert into user_codes (user_id, code_id, used_at)
    values (v_uid, v_code.id, now())
    on conflict (user_id, code_id) do nothing;

  return jsonb_build_object('success', true, 'message', 'Code activated', 'code_id', v_code.id::text);
exception when others then
  return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

grant execute on function public.activate_code(text, text) to authenticated;

-- End of dashboard schema
select count(*) from departments;
select * from academy_data limit 1;