-- =============================================================================
-- Kalika Pantry - Supabase schema
--
-- Run this once in the Supabase SQL Editor (or via `supabase db push`) on a
-- fresh project. Safe to re-run: every statement uses `if not exists` /
-- `create or replace` / `drop policy if exists` where possible.
-- =============================================================================

-- gen_random_uuid() lives in pgcrypto; Supabase usually has it enabled already.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Lookups like "which households is the current user in" filter by user_id,
-- which is the trailing column of the primary key, so it needs its own index.
create index if not exists household_members_user_id_idx
  on household_members (user_id);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  name text not null,
  icon text,
  sort_order int not null default 0
);

create index if not exists locations_household_id_idx
  on locations (household_id);

-- Products are scoped per household so two households can name the same EAN
-- differently (e.g. one household renames a generic item).
create table if not exists products (
  household_id uuid not null references households (id) on delete cascade,
  ean text not null,
  name text not null,
  image_url text,
  created_at timestamptz not null default now(),
  primary key (household_id, ean)
);

-- Stock rows are never deleted when quantity hits 0 - that's what lets the
-- next scan of the same product remember its location.
create table if not exists stock (
  household_id uuid not null references households (id) on delete cascade,
  product_ean text not null,
  location_id uuid not null references locations (id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (household_id, product_ean, location_id),
  foreign key (household_id, product_ean)
    references products (household_id, ean) on delete cascade
);

-- Keep updated_at fresh on every write, regardless of which code path wrote it.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists stock_set_updated_at on stock;
create trigger stock_set_updated_at
  before update on stock
  for each row
  execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table households enable row level security;
alter table household_members enable row level security;
alter table locations enable row level security;
alter table products enable row level security;
alter table stock enable row level security;

-- A naive RLS policy on household_members that queries household_members
-- itself causes infinite recursion in Postgres. Routing the membership check
-- through a SECURITY DEFINER function sidesteps that: the function's body
-- runs with the privileges of its owner, bypassing RLS internally, while the
-- policies that call it are still evaluated per-row for the calling user.
create or replace function is_household_member(hid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

grant execute on function is_household_member(uuid) to authenticated;

drop policy if exists "members can view their household" on households;
create policy "members can view their household" on households
  for select using (is_household_member(id));

drop policy if exists "owners can rename their household" on households;
create policy "owners can rename their household" on households
  for update using (
    exists (
      select 1 from household_members
      where household_id = households.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- Direct inserts into households are intentionally not allowed - creation
-- always goes through create_household() so the owner membership row and
-- default locations are created atomically alongside it.

drop policy if exists "members can view membership rows" on household_members;
create policy "members can view membership rows" on household_members
  for select using (
    user_id = auth.uid() or is_household_member(household_id)
  );

drop policy if exists "members can leave a household" on household_members;
create policy "members can leave a household" on household_members
  for delete using (user_id = auth.uid());

-- Direct inserts are intentionally not allowed - joining always goes through
-- join_household_by_code() so membership requires knowing the invite code.

drop policy if exists "members can manage locations" on locations;
create policy "members can manage locations" on locations
  for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists "members can manage products" on products;
create policy "members can manage products" on products
  for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists "members can manage stock" on stock;
create policy "members can manage stock" on stock
  for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------

-- Short, human-shareable code used to join a household (e.g. "K7QX9F2A").
create or replace function generate_invite_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

-- Creates a household, makes the caller its owner, and seeds the three
-- default locations so the scan flow has somewhere to assign items to
-- immediately after onboarding.
create or replace function create_household(household_name text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household households;
  code text;
begin
  loop
    code := generate_invite_code();
    exit when not exists (select 1 from households where invite_code = code);
  end loop;

  insert into households (name, invite_code)
  values (household_name, code)
  returning * into new_household;

  insert into household_members (household_id, user_id, role)
  values (new_household.id, auth.uid(), 'owner');

  insert into locations (household_id, name, icon, sort_order)
  values
    (new_household.id, 'Kühlschrank', '❄️', 1),
    (new_household.id, 'Gefrierschrank', '🧊', 2),
    (new_household.id, 'Vorratsschrank', '🥫', 3);

  return new_household;
end;
$$;

grant execute on function create_household(text) to authenticated;

-- Joins the caller to whichever household owns the given invite code.
-- SECURITY DEFINER is required here: before joining, the caller has no
-- membership row yet, so RLS would otherwise hide the household entirely.
create or replace function join_household_by_code(code text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  target households;
begin
  select * into target from households where invite_code = upper(trim(code));

  if target.id is null then
    raise exception 'invite_code_not_found';
  end if;

  insert into household_members (household_id, user_id, role)
  values (target.id, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;

  return target;
end;
$$;

grant execute on function join_household_by_code(text) to authenticated;

-- Atomically applies a +1/-1 (or any delta) to a stock row, clamped at 0.
-- Doing this as a single UPDATE instead of a client-side read-modify-write
-- avoids losing an update when two members scan the same item at once.
-- Not SECURITY DEFINER: it runs as the calling user and is still governed by
-- the "members can manage stock" RLS policy above.
create or replace function increment_stock(
  p_household_id uuid,
  p_ean text,
  p_location_id uuid,
  p_delta int
)
returns stock
language plpgsql
as $$
declare
  updated_row stock;
begin
  update stock
  set quantity = greatest(0, quantity + p_delta)
  where household_id = p_household_id
    and product_ean = p_ean
    and location_id = p_location_id
  returning * into updated_row;

  return updated_row;
end;
$$;

grant execute on function increment_stock(uuid, text, uuid, int) to authenticated;

-- The anon/authenticated role has no direct read access to auth.users, so the
-- member list in Settings (which needs to show emails) goes through this
-- SECURITY DEFINER RPC instead. It re-checks membership itself so it can't be
-- used to snoop on households the caller doesn't belong to.
create or replace function get_household_members(hid uuid)
returns table (user_id uuid, email text, role text, joined_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select hm.user_id, u.email, hm.role, hm.created_at
  from household_members hm
  join auth.users u on u.id = hm.user_id
  where hm.household_id = hid
    and is_household_member(hid);
$$;

grant execute on function get_household_members(uuid) to authenticated;
