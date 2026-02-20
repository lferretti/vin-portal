# CloudFront Security Headers

Configure a **Response Headers Policy** in CloudFront for the VIN Portal SPA distribution.

## Required Headers

Create a CloudFront response headers policy with the following security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforce HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer info to cross-origin requests |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused browser APIs |

## Setup Steps

1. Go to **CloudFront > Policies > Response headers** in the AWS Console
2. Create a new custom policy named `vin-portal-security-headers`
3. Add each header from the table above under **Custom headers**
4. Enable **Override origin** for each header so CloudFront headers take precedence
5. Attach the policy to each VIN Portal distribution (dev, qa, uat, prod)

## Content Security Policy

CSP is **not** set at the CloudFront level. It is defined in the SPA's `<meta>` tag in `index.html` to allow fine-grained control over inline scripts and styles required by Angular and Tailwind CSS.

## CORS Headers

CORS is handled by the NestJS backend API, not CloudFront. The SPA origin (S3) does not need CORS headers since it serves same-origin content.

## Verification

After attaching the policy to a distribution, verify headers are present:

```bash
curl -sI https://<distribution-domain>/ | grep -iE '(strict-transport|x-content-type|x-frame|referrer-policy|permissions-policy)'
```

Expected output should include all five headers listed above.

### CI Post-Deploy Verification (Optional)

Add this step after the CloudFront invalidation in each deploy job in `.github/workflows/ci.yml`:

```yaml
- name: Verify security headers
  run: |
    sleep 30  # Wait for invalidation to propagate
    HEADERS=$(curl -sI "https://${{ vars.CF_DOMAIN }}/" 2>/dev/null)
    for HEADER in "strict-transport-security" "x-content-type-options" "x-frame-options" "referrer-policy" "permissions-policy"; do
      if ! echo "$HEADERS" | grep -qi "$HEADER"; then
        echo "::warning::Missing security header: $HEADER"
      fi
    done
```

## Checklist

- [ ] Policy `vin-portal-security-headers` created in AWS Console
- [ ] Policy attached to DEV CloudFront distribution
- [ ] Policy attached to QA CloudFront distribution
- [ ] Policy attached to UAT CloudFront distribution
- [ ] Policy attached to PROD CloudFront distribution
- [ ] Verified with `curl -sI` on each distribution
