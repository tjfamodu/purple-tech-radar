data "aws_route53_zone" "radar" {
  name = "fearless.tech."
}

resource "aws_route53_record" "validation" {
    for_each = {
        for dvo in aws_acm_certificate.radar.domain_validation_options : dvo.domain_name => {
            name = dvo.resource_record_name
            record = dvo.resource_record_value
            type = dvo.resource_record_type
        }
    }
    allow_overwrite = true
    name = each.value.name
    records = [each.value.record]
    ttl = 60
    type = each.value.type
    zone_id = data.aws_route53_zone.radar.zone_id
}

resource "aws_route53_record" "radar" {
  zone_id = data.aws_route53_zone.radar.zone_id
  name = var.domain_name
  type = "A"

  alias {
    name = aws_cloudfront_distribution.radar.domain_name
    zone_id = aws_cloudfront_distribution.radar.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_radar" {
  zone_id = data.aws_route53_zone.radar.zone_id
  name = "www.${var.domain_name}"
  type = "A"

  alias {
    name = aws_cloudfront_distribution.www_radar.domain_name
    zone_id = aws_cloudfront_distribution.www_radar.hosted_zone_id
    evaluate_target_health = false
  }
}