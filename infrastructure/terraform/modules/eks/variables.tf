variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "vpc_id" {
  description = "VPC ID where the cluster will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the EKS cluster"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the EKS cluster"
  type        = list(string)
}

variable "public_access_cidrs" {
  description = "List of CIDR blocks that can access the EKS cluster API"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "primary_nodes_min" {
  description = "Minimum number of primary nodes"
  type        = number
  default     = 2
}

variable "primary_nodes_desired" {
  description = "Desired number of primary nodes"
  type        = number
  default     = 3
}

variable "primary_nodes_max" {
  description = "Maximum number of primary nodes"
  type        = number
  default     = 10
}

variable "spot_nodes_min" {
  description = "Minimum number of spot nodes"
  type        = number
  default     = 0
}

variable "spot_nodes_desired" {
  description = "Desired number of spot nodes"
  type        = number
  default     = 2
}

variable "spot_nodes_max" {
  description = "Maximum number of spot nodes"
  type        = number
  default     = 20
}

variable "primary_instance_types" {
  description = "Instance types for primary nodes"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "spot_instance_types" {
  description = "Instance types for spot nodes"
  type        = list(string)
  default     = ["t3.medium", "t3.large", "t3a.medium", "t3a.large"]
}

variable "node_disk_size" {
  description = "Disk size in GB for worker nodes"
  type        = number
  default     = 100
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "ebs_csi_driver_version" {
  description = "Version of the EBS CSI driver add-on"
  type        = string
  default     = "v1.25.0-eksbuild.1"
}

variable "vpc_cni_version" {
  description = "Version of the VPC CNI add-on"
  type        = string
  default     = "v1.15.4-eksbuild.1"
}

variable "coredns_version" {
  description = "Version of the CoreDNS add-on"
  type        = string
  default     = "v1.10.1-eksbuild.6"
}