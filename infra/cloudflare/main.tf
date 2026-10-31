# Cloudflare for Fenaki, as code: the zones, the tunnel to the server and its routes, the DNS
# records (site, OVHcloud mailbox, Amazon SES), the redirects (www and any redirect domains) and, optionally,
# Cloudflare Access in front of the admin panels. Runbook: docs/deploy.md.

locals {
  # Every hostname the tunnel serves; kamal-proxy routes each one to its container.
  hostnames = concat([var.domain], [for name in var.subdomains : "${name}.${var.domain}"])
  tunnel    = "${cloudflare_zero_trust_tunnel_cloudflared.server.id}.cfargotunnel.com"
  dmarc_rua = var.dmarc_report_address == "" ? "" : "; rua=mailto:${var.dmarc_report_address}"
}

# --- Zones ---------------------------------------------------------------------------------------

resource "cloudflare_zone" "site" {
  account = { id = var.account_id }
  name    = var.domain
  type    = "full"
}

resource "cloudflare_zone" "redirect" {
  for_each = toset(var.redirect_domains)
  account  = { id = var.account_id }
  name     = each.value
  type     = "full"
}

# HTTPS only, modern TLS, on every zone.
locals {
  zone_ids = merge(
    { (var.domain) = cloudflare_zone.site.id },
    { for domain, zone in cloudflare_zone.redirect : domain => zone.id },
  )
  zone_settings = {
    always_use_https = "on"
    min_tls_version  = "1.2"
    ssl              = "strict"
    tls_1_3          = "on"
  }
}

resource "cloudflare_zone_setting" "all" {
  for_each = {
    for pair in setproduct(keys(local.zone_ids), keys(local.zone_settings)) :
    "${pair[0]}/${pair[1]}" => { zone_id = local.zone_ids[pair[0]], setting = pair[1] }
  }
  zone_id    = each.value.zone_id
  setting_id = each.value.setting
  value      = local.zone_settings[each.value.setting]
}

# DNSSEC, signed by Cloudflare. The registrar (OVHcloud) publishes the DS record built from the key in
# the outputs: docs/deploy.md.
resource "cloudflare_zone_dnssec" "site" {
  zone_id = cloudflare_zone.site.id
  status  = "active"
}

# --- Tunnel --------------------------------------------------------------------------------------

# Managed here, not on the server: the `cloudflared` accessory only needs its token.
resource "cloudflare_zero_trust_tunnel_cloudflared" "server" {
  account_id = var.account_id
  name       = "fenaki-vps"
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "server" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.server.id
  config = {
    # kamal-proxy, by its container name on the server's Docker network.
    ingress = concat(
      [for hostname in local.hostnames : { hostname = hostname, service = "http://kamal-proxy:80" }],
      [{ service = "http_status:404" }],
    )
  }
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "server" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.server.id
}

# --- Site records --------------------------------------------------------------------------------

# Every hostname, and www (redirected below before it reaches the tunnel), points to the tunnel.
resource "cloudflare_dns_record" "tunnel" {
  for_each = toset(concat(local.hostnames, ["www.${var.domain}"]))
  zone_id  = cloudflare_zone.site.id
  name     = each.value
  type     = "CNAME"
  content  = local.tunnel
  proxied  = true
  ttl      = 1
}

resource "cloudflare_ruleset" "site_redirects" {
  zone_id = cloudflare_zone.site.id
  name    = "Redirects"
  kind    = "zone"
  phase   = "http_request_dynamic_redirect"
  rules = [{
    ref         = "www_to_apex"
    description = "www.${var.domain} to ${var.domain}, keeping the path and query"
    expression  = "(http.host eq \"www.${var.domain}\")"
    action      = "redirect"
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          expression = "concat(\"https://${var.domain}\", http.request.uri.path)"
        }
      }
    }
  }]
}

# --- Site email: OVHcloud mailbox, Amazon SES ------------------------------------------------------

resource "cloudflare_dns_record" "mx" {
  for_each = { for record in var.ovh_mx : record.host => record }
  zone_id  = cloudflare_zone.site.id
  name     = var.domain
  type     = "MX"
  content  = each.value.host
  priority = each.value.priority
  ttl      = 1
}

# SES sends from the custom MAIL FROM subdomain, which has its own SPF record below; the apex only
# authorises OVHcloud's servers.
resource "cloudflare_dns_record" "spf" {
  zone_id = cloudflare_zone.site.id
  name    = var.domain
  type    = "TXT"
  content = "\"v=spf1 include:${var.ovh_spf_include} ~all\""
  ttl     = 1
}

resource "cloudflare_dns_record" "dmarc" {
  zone_id = cloudflare_zone.site.id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  content = "\"v=DMARC1; p=${var.dmarc_policy}${local.dmarc_rua}; adkim=r; aspf=r\""
  ttl     = 1
}

resource "cloudflare_dns_record" "ovh_dkim" {
  for_each = { for record in var.ovh_dkim : record.name => record }
  zone_id  = cloudflare_zone.site.id
  name     = "${each.value.name}.${var.domain}"
  type     = each.value.type
  content  = each.value.content
  ttl      = 1
}

# Lets mail clients find the mailbox's settings on their own.
resource "cloudflare_dns_record" "ovh_autodiscover" {
  count   = var.ovh_autodiscover_host == "" ? 0 : 1
  zone_id = cloudflare_zone.site.id
  name    = "_autodiscover._tcp.${var.domain}"
  type    = "SRV"
  ttl     = 1
  # Also at the top level: the API echoes it back there and would otherwise show a change.
  priority = 0
  data = {
    priority = 0
    weight   = 0
    port     = 443
    target   = var.ovh_autodiscover_host
  }
}

resource "cloudflare_dns_record" "ses_dkim" {
  for_each = toset(var.ses_dkim_tokens)
  zone_id  = cloudflare_zone.site.id
  name     = "${each.value}._domainkey.${var.domain}"
  type     = "CNAME"
  content  = "${each.value}.dkim.amazonses.com"
  proxied  = false
  ttl      = 1
}

resource "cloudflare_dns_record" "ses_mail_from_mx" {
  count    = length(var.ses_dkim_tokens) > 0 ? 1 : 0
  zone_id  = cloudflare_zone.site.id
  name     = "${var.ses_mail_from_subdomain}.${var.domain}"
  type     = "MX"
  content  = "feedback-smtp.${var.ses_region}.amazonses.com"
  priority = 10
  ttl      = 1
}

resource "cloudflare_dns_record" "ses_mail_from_spf" {
  count   = length(var.ses_dkim_tokens) > 0 ? 1 : 0
  zone_id = cloudflare_zone.site.id
  name    = "${var.ses_mail_from_subdomain}.${var.domain}"
  type    = "TXT"
  content = "\"v=spf1 include:amazonses.com ~all\""
  ttl     = 1
}

# --- Social -------------------------------------------------------------------------------------

# Bluesky handle @fenaki.tv: proves the account owns the domain.
resource "cloudflare_dns_record" "bluesky" {
  count   = var.bluesky_did == "" ? 0 : 1
  zone_id = cloudflare_zone.site.id
  name    = "_atproto.${var.domain}"
  type    = "TXT"
  content = "\"did=${var.bluesky_did}\""
  ttl     = 1
}

# --- Redirect domains ----------------------------------------------------------------------------

# Proxied placeholders: the redirect rule answers before any origin is needed.
resource "cloudflare_dns_record" "redirect_placeholder" {
  for_each = {
    for pair in setproduct(var.redirect_domains, ["", "www."]) : "${pair[1]}${pair[0]}" => pair[0]
  }
  zone_id = cloudflare_zone.redirect[each.value].id
  name    = each.key
  type    = "AAAA"
  content = "100::"
  proxied = true
  ttl     = 1
}

resource "cloudflare_ruleset" "redirect" {
  for_each = toset(var.redirect_domains)
  zone_id  = cloudflare_zone.redirect[each.value].id
  name     = "Redirect to ${var.domain}"
  kind     = "zone"
  phase    = "http_request_dynamic_redirect"
  rules = [{
    ref         = "to_site"
    description = "Every ${each.value} URL to the same path on ${var.domain}"
    expression  = "true"
    action      = "redirect"
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          expression = "concat(\"https://${var.domain}\", http.request.uri.path)"
        }
      }
    }
  }]
}

# These domains send no email: say so, so nobody can send as them.
resource "cloudflare_dns_record" "redirect_null_mx" {
  for_each = toset(var.redirect_domains)
  zone_id  = cloudflare_zone.redirect[each.value].id
  name     = each.value
  type     = "MX"
  content  = "."
  priority = 0
  ttl      = 1
}

resource "cloudflare_dns_record" "redirect_spf" {
  for_each = toset(var.redirect_domains)
  zone_id  = cloudflare_zone.redirect[each.value].id
  name     = each.value
  type     = "TXT"
  content  = "\"v=spf1 -all\""
  ttl      = 1
}

resource "cloudflare_dns_record" "redirect_dmarc" {
  for_each = toset(var.redirect_domains)
  zone_id  = cloudflare_zone.redirect[each.value].id
  name     = "_dmarc.${each.value}"
  type     = "TXT"
  content  = "\"v=DMARC1; p=reject\""
  ttl      = 1
}

# --- Access: the admin panels behind a one-time email code ---------------------------------------

resource "cloudflare_zero_trust_access_policy" "editors" {
  count      = length(var.access_emails) > 0 ? 1 : 0
  account_id = var.account_id
  name       = "Fenaki editors"
  decision   = "allow"
  include    = [for email in var.access_emails : { email = { email = email } }]
}

# The whole CMS host: the site reads the API on the server's own network, never through here.
# listmonk only behind /admin and /api: subscribers open its other pages (unsubscribe links).
resource "cloudflare_zero_trust_access_application" "admin" {
  for_each = length(var.access_emails) > 0 ? {
    cms      = ["cms.${var.domain}"]
    listmonk = ["lists.${var.domain}/admin", "lists.${var.domain}/api"]
  } : {}
  account_id       = var.account_id
  name             = "Fenaki ${each.key}"
  type             = "self_hosted"
  session_duration = "24h"
  destinations     = [for uri in each.value : { type = "public", uri = uri }]
  # The CMS also lets in the AI coordinator's service token: it works through Payload's REST API
  # with an agent user, which can draft but never approve or send (apps/cms, sales CRM).
  policies = concat(
    [{ id = cloudflare_zero_trust_access_policy.editors[0].id, precedence = 1 }],
    each.key == "cms" ? [{ id = cloudflare_zero_trust_access_policy.agent[0].id, precedence = 2 }] : [],
  )
}

resource "cloudflare_zero_trust_access_service_token" "agent" {
  count      = length(var.access_emails) > 0 ? 1 : 0
  account_id = var.account_id
  name       = "Fenaki agent (CMS API)"
  duration   = "8760h"
}

resource "cloudflare_zero_trust_access_policy" "agent" {
  count      = length(var.access_emails) > 0 ? 1 : 0
  account_id = var.account_id
  name       = "Fenaki agent (service token)"
  decision   = "non_identity"
  include    = [{ service_token = { token_id = cloudflare_zero_trust_access_service_token.agent[0].id } }]
}

# Paths of the CMS that stay public: the health check (external uptime monitor) and uploaded media
# (organization logos), which public pages may show.
resource "cloudflare_zero_trust_access_policy" "everyone" {
  count      = length(var.access_emails) > 0 ? 1 : 0
  account_id = var.account_id
  name       = "Everyone (bypass)"
  decision   = "bypass"
  include    = [{ everyone = {} }]
}

resource "cloudflare_zero_trust_access_application" "cms_public" {
  count      = length(var.access_emails) > 0 ? 1 : 0
  account_id = var.account_id
  name       = "Fenaki CMS public paths"
  type       = "self_hosted"
  destinations = [
    { type = "public", uri = "cms.${var.domain}/up" },
    { type = "public", uri = "cms.${var.domain}/api/media/file" },
    # The shorts' images (collection `stills`, public read): the site's pages load them from here.
    { type = "public", uri = "cms.${var.domain}/api/stills/file" },
  ]
  policies = [{ id = cloudflare_zero_trust_access_policy.everyone[0].id, precedence = 1 }]
}

# --- Backups -------------------------------------------------------------------------------------

# The off-site backup bucket (infra/backup), in the EU jurisdiction: its data stays in the EU.
# The backup accessory's API token (Object Read & Write on this bucket only) is created in the
# dashboard: docs/deploy.md.
resource "cloudflare_r2_bucket" "backups" {
  count        = var.backup_bucket == "" ? 0 : 1
  account_id   = var.account_id
  name         = var.backup_bucket
  jurisdiction = "eu"
}
