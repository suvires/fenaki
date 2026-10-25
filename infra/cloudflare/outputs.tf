output "name_servers" {
  description = "The Cloudflare name servers to set for each domain at OVHcloud (registrar)."
  value = merge(
    { (var.domain) = cloudflare_zone.site.name_servers },
    { for domain, zone in cloudflare_zone.redirect : domain => zone.name_servers },
  )
}

output "tunnel_id" {
  value = cloudflare_zero_trust_tunnel_cloudflared.server.id
}

output "tunnel_token" {
  description = "CLOUDFLARE_TUNNEL_TOKEN for Kamal: tofu output -raw tunnel_token"
  value       = data.cloudflare_zero_trust_tunnel_cloudflared_token.server.token
  sensitive   = true
}

output "backup_s3_endpoint" {
  description = "BACKUP_S3_ENDPOINT for the R2 bucket (EU jurisdiction)."
  value       = var.backup_bucket == "" ? null : "https://${var.account_id}.eu.r2.cloudflarestorage.com"
}

output "dnssec" {
  description = "What the registrar needs for the DS record: key tag, algorithm, flags and public key (and the DS itself)."
  value = {
    key_tag    = cloudflare_zone_dnssec.site.key_tag
    algorithm  = cloudflare_zone_dnssec.site.algorithm
    flags      = cloudflare_zone_dnssec.site.flags
    public_key = cloudflare_zone_dnssec.site.public_key
    ds         = cloudflare_zone_dnssec.site.ds
  }
}

output "agent_access_client_id" {
  description = "CF-Access-Client-Id header for the AI coordinator's calls to the CMS API."
  value       = try(cloudflare_zero_trust_access_service_token.agent[0].client_id, "")
}

output "agent_access_client_secret" {
  description = "CF-Access-Client-Secret header for the AI coordinator's calls to the CMS API."
  value       = try(cloudflare_zero_trust_access_service_token.agent[0].client_secret, "")
  sensitive   = true
}
