-- TEST ONLY: run against an empty, isolated local PostgreSQL database.
-- Existing auth schema makes this fail, intentionally. Never run in production.
\set ON_ERROR_STOP on
create schema auth;
create role anon nologin;
create role authenticated nologin;
create table auth.users (
  id uuid primary key, email text unique, email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid;
$$;
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
