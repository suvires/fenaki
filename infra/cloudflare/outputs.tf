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
