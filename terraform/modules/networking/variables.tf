variable "project_id" { description = "GCP project ID" type = string }
variable "region" { description = "Region" type = string }
variable "vpc_name" { description = "VPC network name" type = string default = "smart-learning-vpc" }
variable "subnet_name" { description = "Subnet name" type = string default = "smart-learning-subnet" }
variable "subnet_cidr" { description = "Subnet CIDR" type = string default = "10.10.0.0/24" }
variable "enable_cloud_nat" { description = "Whether to create Cloud NAT" type = bool default = true }
variable "create_https_lb" { description = "Whether to configure HTTPS load balancer (external)" type = bool default = false }
