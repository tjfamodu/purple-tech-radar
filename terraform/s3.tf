resource "aws_s3_bucket" "radar" {
  bucket =  var.bucket_name
  tags = var.common_tags
}

resource "aws_s3_bucket" "www_radar" {
  bucket = "www.${var.bucket_name}"
  tags = var.common_tags
}

resource "aws_s3_bucket_policy" "radar" {
  bucket = aws_s3_bucket.radar.id
  policy = templatefile("templates/s3-policy.json", { bucket = "${var.bucket_name}" })
}

resource "aws_s3_bucket_policy" "www_radar" {
  bucket = aws_s3_bucket.www_radar.id
  policy = templatefile("templates/s3-policy.json", { bucket = "www.${var.bucket_name}" })
}

resource "aws_s3_bucket_website_configuration" "radar" {
  bucket = aws_s3_bucket.radar.bucket

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_website_configuration" "www_radar" {
  bucket = aws_s3_bucket.www_radar.bucket

  redirect_all_requests_to {
      host_name = "https://${var.domain_name}"
  }
}

resource "aws_s3_bucket_acl" "radar" {
  bucket = aws_s3_bucket.radar.id
  acl    = "public-read"
}

resource "aws_s3_bucket_acl" "www_radar" {
  bucket = aws_s3_bucket.www_radar.id
  acl    = "public-read"
}

resource "aws_s3_bucket_cors_configuration" "radar" {
  bucket = aws_s3_bucket.radar.bucket

  cors_rule {
    allowed_headers = ["Authorization", "Content-Length"]
    allowed_methods = ["GET", "POST"]
    allowed_origins = ["https://${var.domain_name}"]
    max_age_seconds = 3000
  }
}

