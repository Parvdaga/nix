-- SUPABASE SCHEMA SETUP FOR NIX
-- Run this in the SQL Editor of your Supabase Dashboard

-- OPTIONAL: Clean slate script (drops existing tables to avoid duplicate relations)
drop table if exists public.expense_splits cascade;
drop table if exists public.expenses cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.profiles cascade;
drop function if exists public.is_group_member cascade;

-- 1. Create Profiles Table (extends Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  upi_id text,
  pin_hash text not null, -- SHA-256 hashed 4-digit passcode PIN
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Allow public profiles read access" 
  on public.profiles for select 
  using (true);

create policy "Allow users to update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Allow users to insert their own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);


-- 2. Create Groups Table
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  invite_code text unique not null default substring(md5(random()::text) from 1 for 8),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.groups enable row level security;

-- Add select policy for groups by invite code
create policy "Allow select groups by invite code"
  on public.groups for select
  using (true);


-- 3. Create Group Members Table
-- This junction table represents both registered app users and offline placeholder members.
create table public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade, -- NULL for offline members
  dummy_name text,                                                  -- NULL for registered profiles
  dummy_upi_id text,                                                -- NULL for registered profiles
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure that either profile_id is set OR dummy_name is set, but not both or neither
  constraint member_type_check check (
    (profile_id is not null and dummy_name is null and dummy_upi_id is null) or
    (profile_id is null and dummy_name is not null)
  ),
  
  -- Prevent duplicate members in the same group
  constraint unique_group_profile unique (group_id, profile_id),
  constraint unique_group_dummy unique (group_id, dummy_name)
);

alter table public.group_members enable row level security;


-- 4. Create Expenses Table
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  title text not null,
  amount numeric(10, 2) not null check (amount > 0),
  payer_member_id uuid references public.group_members(id) on delete cascade not null,
  category text not null,
  date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.expenses enable row level security;


-- 5. Create Expense Splits Table
create table public.expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  member_id uuid references public.group_members(id) on delete cascade not null,
  amount_owed numeric(10, 2) not null check (amount_owed >= 0),
  constraint unique_expense_member unique (expense_id, member_id)
);

alter table public.expense_splits enable row level security;


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SECURE SHARING
-- =========================================================================

-- Helper function to check if a user is a member of a given group
create or replace function public.is_group_member(group_id uuid, user_id uuid)
returns boolean security definer as $$
begin
  return exists (
    select 1 
    from public.group_members 
    where group_members.group_id = $1 
      and group_members.profile_id = $2
  );
end;
$$ language plpgsql;


-- Groups Policies
create policy "Users can view groups they belong to" 
  on public.groups for select 
  using (public.is_group_member(id, auth.uid()));

create policy "Any registered user can create a group" 
  on public.groups for insert 
  with check (auth.uid() = created_by);

create policy "Group creators or members can update group details" 
  on public.groups for update 
  using (public.is_group_member(id, auth.uid()));

create policy "Group creators can delete their groups" 
  on public.groups for delete 
  using (auth.uid() = created_by);


-- Group Members Policies
create policy "Members can view other members in their groups" 
  on public.group_members for select 
  using (public.is_group_member(group_id, auth.uid()));

create policy "Members can add people to their groups" 
  on public.group_members for insert 
  with check (public.is_group_member(group_id, auth.uid()) or exists (
    -- Allow the group creator to add initial members upon group creation
    select 1 from public.groups where id = group_id and created_by = auth.uid()
  ));

create policy "Members can update group membership details" 
  on public.group_members for update 
  using (public.is_group_member(group_id, auth.uid()));

create policy "Members can remove people if they are group creators" 
  on public.group_members for delete 
  using (
    exists (
      select 1 from public.groups where id = group_id and created_by = auth.uid()
    )
  );


-- Expenses Policies
create policy "Members can view group expenses" 
  on public.expenses for select 
  using (public.is_group_member(group_id, auth.uid()));

create policy "Members can log expenses" 
  on public.expenses for insert 
  with check (public.is_group_member(group_id, auth.uid()));

create policy "Members can update expenses" 
  on public.expenses for update 
  using (public.is_group_member(group_id, auth.uid()));

create policy "Members can delete expenses" 
  on public.expenses for delete 
  using (public.is_group_member(group_id, auth.uid()));


-- Expense Splits Policies
create policy "Members can view splits" 
  on public.expense_splits for select 
  using (
    exists (
      select 1 
      from public.expenses 
      where expenses.id = expense_id 
        and public.is_group_member(expenses.group_id, auth.uid())
    )
  );

create policy "Members can create splits" 
  on public.expense_splits for insert 
  with check (
    exists (
      select 1 
      from public.expenses 
      where expenses.id = expense_id 
        and public.is_group_member(expenses.group_id, auth.uid())
    )
  );

create policy "Members can update splits" 
  on public.expense_splits for update 
  using (
    exists (
      select 1 
      from public.expenses 
      where expenses.id = expense_id 
        and public.is_group_member(expenses.group_id, auth.uid())
    )
  );

create policy "Members can delete splits" 
  on public.expense_splits for delete 
  using (
    exists (
      select 1 
      from public.expenses 
      where expenses.id = expense_id 
        and public.is_group_member(expenses.group_id, auth.uid())
    )
  );
