-- Runs before every listmonk start in development (the `listmonk-config` service).
-- Local development values only; production is configured by `pnpm setup:services`.

-- The web app's API user gets a known token (LISTMONK_API_TOKEN in apps/web/.env).
UPDATE users
SET password = encode(sha256(convert_to(:'token', 'UTF8')), 'hex')
WHERE username = 'shortix-web' AND type = 'api';

-- Every email goes to Mailpit, never to a real server: listmonk installs with sample SMTP hosts.
UPDATE settings SET value = '[{
  "name": "mailpit", "uuid": "", "enabled": true, "host": "mailpit", "hello_hostname": "",
  "port": 1025, "auth_protocol": "none", "username": "", "password": "",
  "email_headers": [], "max_conns": 10, "max_msg_retries": 2, "msg_retry_delay": "10ms",
  "idle_timeout": "15s", "wait_timeout": "5s", "tls_type": "none", "tls_skip_verify": false,
  "from_addresses": []
}]'
WHERE key = 'smtp';

-- The web app sends its own confirmation email (copy from packages/i18n), not listmonk's.
UPDATE settings SET value = 'false' WHERE key = 'app.send_optin_confirmation';
