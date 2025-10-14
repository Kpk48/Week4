variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Region for Cloud Run services"
  type        = string
}

variable "service_name_backend" {
  description = "Backend service name"
  type        = string
}

variable "service_name_frontend" {
  description = "Frontend service name"
  type        = string
}

variable "image_backend" {
  description = "Backend container image"
  type        = string
}

variable "image_frontend" {
  description = "Frontend container image"
  type        = string
}

variable "min_instances" {
  description = "Minimum instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances"
  type        = number
  default     = 10
}

variable "cpu" {
  description = "vCPU per instance"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory per instance"
  type        = string
  default     = "512Mi"
}

variable "env_vars" {
  description = "Env variables for backend"
  type        = map(string)
  default     = {}
}

variable "frontend_env_vars" {
  description = "Env variables for frontend"
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Env vars from Secret Manager (name => secret resource name)"
  type        = map(string)
  default     = {}
}

variable "enable_vpc_connector" {
  description = "Attach VPC connector"
  type        = bool
  default     = false
}

variable "vpc_connector_name" {
  description = "VPC connector name"
  type        = string
  default     = null
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated invokers"
  type        = bool
  default     = true
}

variable "service_account_id" {
  description = "Cloud Run service account ID (without domain)"
  type        = string
  default     = "cloud-run-sa"
}
