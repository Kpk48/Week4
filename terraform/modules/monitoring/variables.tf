variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "backend_host" {
  description = "Backend host domain used for uptime check (e.g., backend-abc-uc.a.run.app)"
  type        = string
}

variable "notification_emails" {
  description = "List of email addresses to notify"
  type        = list(string)
  default     = []
}
