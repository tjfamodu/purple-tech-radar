variable "domain_name" {
  type = string
  default = "radar.fearless.tech"
  description = "The domain name for the website."
}

variable "bucket_name" {
  type = string
  default = "radar.fearless.tech"
  description = "The name of the bucket without the www. prefix. Normally domain_name."
}

variable "common_tags" {
  description = "Common tags you want applied to all components."
  default = {
      Project = "Tech Radar"
  }
}