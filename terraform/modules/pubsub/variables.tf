variable "region" {
  description = "Region for Cloud Function"
  type        = string
}

variable "topic_name" {
  description = "Pub/Sub topic name"
  type        = string
  default     = "alerts"
}

variable "subscription_name" {
  description = "Subscription name"
  type        = string
  default     = "alerts-sub"
}

variable "function_name" {
  description = "Cloud Function name"
  type        = string
  default     = "alerts-email-handler"
}

variable "function_service_account_id" {
  description = "Service account ID for the function"
  type        = string
  default     = "alerts-fn-sa"
}

variable "entry_point" {
  description = "Entry point for the Cloud Function"
  type        = string
  default     = "handler"
}

variable "source_bucket" {
  description = "Storage bucket containing function source"
  type        = string
}

variable "source_object" {
  description = "Storage object (zip) containing function source"
  type        = string
}

variable "sendgrid_api_key_secret" {
  description = "Secret Manager secret resource for SendGrid API key (projects/.../secrets/NAME/versions/latest)"
  type        = string
  default     = null
}

variable "email_from" {
  description = "Sender email address"
  type        = string
}

variable "email_to" {
  description = "Recipient emails"
  type        = list(string)
}
