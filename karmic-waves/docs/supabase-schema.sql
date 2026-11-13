-- Karmic Waves — leads table (Supabase / PostgreSQL)
-- Run in the Supabase SQL editor. RLS is enabled with NO policies: only the service-role key (server) can read/write.

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  dob                  date not null,
  birth_month          smallint not null check (birth_month between 1 and 12),
  phone_e164           text not null check (phone_e164 ~ '^\+91[6-9][0-9]{9}$'),
  phone_hash           text not null,
  consent              boolean not null default false,
  consent_at           timestamptz,
  consent_text_version text,
  utm_source           text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  fbclid               text,
  referrer             text,
  landing_path         text,
  ip_hash              text,
  user_agent           text,
  event_id             text,                      -- Meta Pixel / CAPI dedupe id
  client_event_id      text,
  delivery_status      text not null default 'NEW' check (delivery_status in ('NEW','MANUAL_SEND_REQUIRED','ACCEPTED','DELIVERED','FAILED')),
  delivery_detail      text,
  delivery_updated_at  timestamptz,
  retention_until      timestamptz
);

create index if not exists leads_phone_hash_created_idx on public.leads (phone_hash, created_at desc);
create index if not exists leads_delivery_status_idx   on public.leads (delivery_status) where delivery_status <> 'DELIVERED';
create index if not exists leads_retention_idx         on public.leads (retention_until);

alter table public.leads enable row level security;
-- No policies on purpose: anon/authenticated keys get nothing. The server uses the service-role key.

-- Retention job (optional, needs pg_cron): deletes expired rows nightly.
-- select cron.schedule('leads-retention', '15 2 * * *', $$delete from public.leads where retention_until < now()$$);
