variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "location" {
  description = "Artifact Registry location"
  type        = string
}

variable "repository_id" {
  description = "Repository ID"
  type        = string
}

variable "description" {
  description = "Repository description"
  type        = string
  default     = "Container images for Smart Learning"
}

variable "enable_cleanup" {
  description = "Enable cleanup policy"
  type        = bool
  default     = true
}

variable "cleanup_older_than" {
  description = "Delete images older than this duration (e.g., 30d)"
  type        = string
  default     = "30d"
}

variable "cleanup_keep_versions" {
  description = "Keep at least N most recent versions"
  type        = number
  default     = 10
}

variable "iam_roles" {
  description = "Map of role => list(members) for IAM on the repository"
  type        = map(list(string))
  default     = {}
}
