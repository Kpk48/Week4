module "artifact_registry" {
  source         = "./modules/artifact-registry"
  project_id     = var.project_id
  location       = var.artifact_location
  repository_id  = var.artifact_repo_id
  description    = "Smart Learning Artifact Registry"
  enable_cleanup = true
  iam_roles = {
    "roles/artifactregistry.reader" = [
      "serviceAccount:${module.cloud_run.cloud_run_sa_email}"
    ]
    "roles/artifactregistry.writer" = []
  }
}

module "networking" {
  source          = "./modules/networking"
  project_id      = var.project_id
  region          = var.region
  vpc_name        = "smart-learning-vpc"
  subnet_name     = "smart-learning-subnet"
  subnet_cidr     = "10.10.0.0/24"
  enable_cloud_nat = true
}

module "secret_manager" {
  source       = "./modules/secret-manager"
  project_id   = var.project_id
  secrets      = ["jwt-secret", "supabase-url", "supabase-anon-key", "supabase-service-role-key", "sendgrid-api-key"]
  initial_values = {} # Supply via CI or tfvars, do not commit secrets
  iam_bindings = {
    "jwt-secret" = {
      role    = "roles/secretmanager.secretAccessor"
      members = ["serviceAccount:${module.cloud_run.cloud_run_sa_email}"]
    }
    "supabase-url" = {
      role    = "roles/secretmanager.secretAccessor"
      members = ["serviceAccount:${module.cloud_run.cloud_run_sa_email}"]
    }
    "supabase-anon-key" = {
      role    = "roles/secretmanager.secretAccessor"
      members = ["serviceAccount:${module.cloud_run.cloud_run_sa_email}"]
    }
    "supabase-service-role-key" = {
      role    = "roles/secretmanager.secretAccessor"
      members = ["serviceAccount:${module.cloud_run.cloud_run_sa_email}"]
    }
  }
}

module "cloud_run" {
  source                = "./modules/cloud-run"
  project_id            = var.project_id
  region                = var.region
  service_name_backend  = var.service_name_backend
  service_name_frontend = var.service_name_frontend
  image_backend         = var.image_backend
  image_frontend        = var.image_frontend
  min_instances         = var.min_instances
  max_instances         = var.max_instances
  cpu                   = var.cpu
  memory                = var.memory
  env_vars              = var.env_vars
  frontend_env_vars     = var.frontend_env_vars
  secret_env = {
    JWT_SECRET                 = "projects/${var.project_id}/secrets/jwt-secret"
    SUPABASE_URL               = "projects/${var.project_id}/secrets/supabase-url"
    SUPABASE_ANON_KEY          = "projects/${var.project_id}/secrets/supabase-anon-key"
    SUPABASE_SERVICE_ROLE_KEY  = "projects/${var.project_id}/secrets/supabase-service-role-key"
  }
  enable_vpc_connector = var.enable_vpc_connector
  vpc_connector_name   = var.vpc_connector_name
  allow_unauthenticated = true
}

module "monitoring" {
  source               = "./modules/monitoring"
  project_id           = var.project_id
  backend_host         = module.cloud_run.backend_url
  notification_emails  = []
}

module "pubsub" {
  source                      = "./modules/pubsub"
  region                      = var.region
  topic_name                  = "alerts"
  subscription_name           = "alerts-sub"
  function_name               = "alerts-email-handler"
  entry_point                 = "handler"
  source_bucket               = var.function_source_bucket
  source_object               = var.function_source_object
  sendgrid_api_key_secret     = "projects/${var.project_id}/secrets/sendgrid-api-key/versions/latest"
  email_from                  = var.alerts_email_from
  email_to                    = var.alerts_email_to
}

output "backend_url" {
  value = module.cloud_run.backend_url
}

output "frontend_url" {
  value = module.cloud_run.frontend_url
}
