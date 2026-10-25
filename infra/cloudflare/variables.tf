variable "cloudflare_api_token" {
  description = "API token with Zone (Zone, DNS, Zone Settings, Single Redirect) edit on both zones and Account (Cloudflare Tunnel, Access) edit. Set TF_VAR_cloudflare_api_token."
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "The Cloudflare account that owns the zones and the tunnel."
  type        = string
}

variable "state_path" {
  description = "Where the encrypted state is kept: outside this public repository."
  type        = string
  default     = "../../private/infra/cloudflare.tfstate"
}

variable "state_passphrase" {
  description = "Encrypts the state and plans (at least 16 characters). Set TF_VAR_state_passphrase."
  type        = string
  sensitive   = true
}

variable "domain" {
  description = "The site's domain."
  type        = string
  default     = "fenaki.tv"
}

variable "redirect_domains" {
  description = "Domains that only redirect to the site, keeping the path (e.g. fenaki.es, fenakitv.es, fenakitv.com, once bought). Empty: none."
  type        = list(string)
  default     = []
}

variable "subdomains" {
  description = "Hostnames served through the tunnel besides the apex: the CMS, listmonk and Umami."
  type        = list(string)
  default     = ["cms", "lists", "stats"]
}

# --- Email ---------------------------------------------------------------------------------------

variable "ovh_mx" {
  description = "MX records of the OVHcloud mailbox (Zimbra). Check the values in the OVHcloud control panel when the mailbox exists."
  type = list(object({
    priority = number
    host     = string
  }))
  default = [
    { priority = 1, host = "mx0.mail.ovh.net" },
    { priority = 5, host = "mx1.mail.ovh.net" },
    { priority = 50, host = "mx2.mail.ovh.net" },
    { priority = 100, host = "mx3.mail.ovh.net" },
  ]
}

variable "ovh_spf_include" {
  description = "The SPF include of OVHcloud's mail servers."
  type        = string
  default     = "mx.ovh.com"
}

variable "ovh_dkim" {
  description = "OVHcloud's DKIM records for the mailbox, once enabled in its control panel (name relative to the domain, e.g. ovhmo1234-selector1._domainkey)."
  type = list(object({
    name    = string
    type    = string
    content = string
  }))
  default = []
}

variable "ovh_autodiscover_host" {
  description = "The OVHcloud mail server that mail clients autodiscover (the SRV record OVHcloud creates for the mailbox). Empty: no record."
  type        = string
  default     = "zimbra1.mail.ovh.net"
}

variable "ses_region" {
  description = "Amazon SES region (EU)."
  type        = string
  default     = "eu-west-1"
}

variable "ses_dkim_tokens" {
  description = "The three Easy DKIM tokens SES shows when verifying the domain. Empty: no SES records yet."
  type        = list(string)
  default     = []
}

variable "ses_mail_from_subdomain" {
  description = "Custom MAIL FROM subdomain for SES, so SPF aligns with the domain for DMARC."
  type        = string
  default     = "bounce"
}

variable "dmarc_policy" {
  description = "DMARC policy for the site's domain: start with none, move to quarantine once the reports are clean."
  type        = string
  default     = "none"
}

variable "dmarc_report_address" {
  description = "Mailbox for DMARC aggregate reports. Empty: no reports."
  type        = string
  default     = ""
}

# --- Social -------------------------------------------------------------------------------------

variable "bluesky_did" {
  description = "The Bluesky account's DID (did:plc:...), for the handle @<domain>. Empty: no record."
  type        = string
  default     = "did:plc:2ldbo45gkowl6ck6tvs4bz3i"
}

# --- Access --------------------------------------------------------------------------------------

variable "access_emails" {
  description = "Who may open the CMS and listmonk's admin, through Cloudflare Access (one-time code by email). Empty: no Access applications, only each app's own login."
  type        = list(string)
  default     = []
}

# --- Backups -------------------------------------------------------------------------------------

variable "backup_bucket" {
  description = "Name of the R2 bucket for the backups (EU jurisdiction). Empty: none here (e.g. Backblaze B2 instead)."
  type        = string
  default     = "fenaki-backups"
}
