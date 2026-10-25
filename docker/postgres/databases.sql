-- Extra databases on the development PostgreSQL. Idempotent: the `postgres-init` service runs it
-- on every `docker compose up`, so it also works on volumes created before these services existed.
-- Local development credentials only.

SELECT 'CREATE ROLE listmonk LOGIN PASSWORD ''listmonk'''
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'listmonk')\gexec
SELECT 'CREATE DATABASE listmonk OWNER listmonk'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'listmonk')\gexec

SELECT 'CREATE ROLE umami LOGIN PASSWORD ''umami'''
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'umami')\gexec
SELECT 'CREATE DATABASE umami OWNER umami'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'umami')\gexec

-- The e2e tests run the CMS against their own database, with only the sample seed.
SELECT 'CREATE DATABASE fenaki_test OWNER fenaki'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fenaki_test')\gexec
