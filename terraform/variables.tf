variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "us-central1"
}

variable "artifact_repo_id" {
  description = "Artifact Registry repository ID"
  type        = string
  default     = "smart-learning"
}

variable "artifact_location" {
  description = "Artifact Registry location"
  type        = string
  default     = "us"
}

variable "service_name_backend" {
  description = "Cloud Run service name for backend"
  type        = string
  default     = "smart-learning-backend"
}

variable "service_name_frontend" {
  description = "Cloud Run service name for frontend"
  type        = string
  default     = "smart-learning-frontend"
}

variable "image_backend" {
  description = "Container image for backend"
  type        = string
}

variable "image_frontend" {
  description = "Container image for frontend"
  type        = string
}

variable "min_instances" {
  description = "Minimum instances for Cloud Run"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances for Cloud Run"
  type        = number
  default     = 10
}

variable "cpu" {
  description = "vCPU for Cloud Run services"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory for Cloud Run services"
  type        = string
  default     = "512Mi"
}

variable "enable_vpc_connector" {
  description = "Whether to enable VPC connector for Cloud Run"
  type        = bool
  default     = false
}

variable "vpc_connector_name" {
  description = "VPC connector name to attach (if enabled)"
  type        = string
  default     = null
}

variable "env_vars" {
  description = "Map of environment variables for backend service"
  type        = map(string)
  default     = {}
}

variable "frontend_env_vars" {
  description = "Map of environment variables for frontend service"
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Map of env var name to Secret Manager secret resource ID (projects/.../secrets/NAME/versions/latest)"
  type        = map(string)
  default     = {}
}

variable "function_source_bucket" {
  description = "Storage bucket for Cloud Function source (zip)"
  type        = string
  default     = ""
}

variable "function_source_object" {
  description = "Storage object path for Cloud Function source (zip)"
  type        = string
  default     = ""
}

variable "alerts_email_from" {
  description = "Sender email for alerts"
  type        = string
  default     = ""
}

variable "alerts_email_to" {
  description = "Recipients for alerts"
  type        = list(string)
  default     = []
}

variable "tf_state_bucket" {
  description = "GCS bucket name for Terraform remote state"
  type        = string
}

variable "tf_state_prefix" {
  description = "Prefix (folder) within the state bucket"
  type        = string
  default     = "presidio-week2/terraform/state"
}
