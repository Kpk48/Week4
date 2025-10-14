variable "project_id" { description = "GCP project ID" type = string }

variable "secrets" {
  description = "Set of secret IDs to create"
  type        = set(string)
  default     = []
}

variable "initial_values" {
  description = "Optional map of secret_id => value for initial versions (avoid committing real values)"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "iam_bindings" {
  description = "Map of secret_id => { role = string, members = list(string) }"
  type = map(object({
    role    = string
    members = list(string)
  }))
  default = {}
}
