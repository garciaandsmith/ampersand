-- Supabase only auto-grants privileges on the `public` schema. Since AMPERSAND's
-- tables live in `ampersand` and are accessed exclusively via the service_role
-- key (see 0001_init.sql), grant that role full access explicitly, including
-- on anything created here in the future.

grant usage on schema ampersand to service_role;
grant all on all tables in schema ampersand to service_role;
grant all on all sequences in schema ampersand to service_role;

alter default privileges in schema ampersand grant all on tables to service_role;
alter default privileges in schema ampersand grant all on sequences to service_role;
