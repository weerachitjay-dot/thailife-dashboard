-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Facebook Auth Table
create table if not exists facebook_auth (
  id uuid default uuid_generate_v4() primary key,
  access_token text not null,
  token_type text default 'long-lived',
  data_scope text, -- To store what permissions were granted
  user_id text, -- Facebook User ID
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Sheet: Append Data
create table if not exists sheet_append (
  id uuid default uuid_generate_v4() primary key,
  day date not null,
  product text,
  ad_name text,
  impressions int default 0,
  cost numeric(10, 2) default 0,
  leads int default 0,
  meta_leads int default 0,
  created_at timestamptz default now(),
  unique(day, product, ad_name) -- Composite key for upserting
);

-- 3. Sheet: Sent Leads
create table if not exists sheet_sent (
  id uuid default uuid_generate_v4() primary key,
  day date not null,
  product text not null,
  leads_sent int default 0,
  created_at timestamptz default now(),
  unique(day, product)
);

-- 4. Sheet: Targets
create table if not exists sheet_targets (
  id uuid default uuid_generate_v4() primary key,
  owner text,
  type text,
  product_target text not null,
  target_lead_sent int default 0,
  target_cpl numeric(10, 2) default 0,
  created_at timestamptz default now(),
  unique(product_target) -- Assuming one target per product per sync
);

-- 5. Sheet: Time Analysis
create table if not exists sheet_time_analysis (
  id uuid default uuid_generate_v4() primary key,
  day date not null,
  time_of_day text,
  campaign_name text,
  campaign_id text,
  ad_set_name text,
  ad_set_id text,
  ad_name text,
  ad_id text,
  leads int default 0,
  cost numeric(10, 2) default 0,
  created_at timestamptz default now(),
  unique(day, time_of_day, ad_id) -- Unique by Ad ID per time slot is safer
);

-- 6. Sheet: Telesales
create table if not exists sheet_telesales (
  id uuid default uuid_generate_v4() primary key,
  day date not null,
  product text,
  leads_tl int default 0,
  created_at timestamptz default now(),
  unique(day, product)
);

-- RLS Policies (Simple for now: Admin access everything, Public read maybe?)
-- For Phase 1, we assume we use Service Key or authenticated client with policies.
-- Let's enable RLS and allow public read for dashboard, authenticated write for admin.

alter table facebook_auth enable row level security;
alter table sheet_append enable row level security;
alter table sheet_sent enable row level security;
alter table sheet_targets enable row level security;
alter table sheet_time_analysis enable row level security;
alter table sheet_telesales enable row level security;

-- Policies (Adjust based on actual Auth setup)
-- Allow Anon Read (since dashboard seems to be public/semi-public or using shared logins)
create policy "Public Read Append" on sheet_append for select using (true);
create policy "Public Read Sent" on sheet_sent for select using (true);
create policy "Public Read Targets" on sheet_targets for select using (true);
create policy "Public Read Time" on sheet_time_analysis for select using (true);
create policy "Public Read Telesales" on sheet_telesales for select using (true);

-- Allow Insert/Update for Authenticated Users (or just Open for now if logic is client-side protected)
-- Ideally, use a specific role or check user metadata.
create policy "Admin Write Append" on sheet_append for all using (true) with check (true);
create policy "Admin Write Sent" on sheet_sent for all using (true) with check (true);
create policy "Admin Write Targets" on sheet_targets for all using (true) with check (true);
create policy "Admin Write Time" on sheet_time_analysis for all using (true) with check (true);
create policy "Admin Write Telesales" on sheet_telesales for all using (true) with check (true);
create policy "Admin Write Auth" on facebook_auth for all using (true) with check (true);
