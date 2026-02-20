# GitHub Environments Setup

This document describes the required GitHub Environments configuration for the VIN Portal CI/CD pipeline.

## Environments

Create four GitHub Environments in the repository settings:

- **dev** — Development environment
- **qa** — Quality Assurance environment
- **uat** — User Acceptance Testing environment
- **production** — Production environment

All environments auto-deploy on push to their respective branch (DEV, QA, UAT, PROD). No manual approval gates are configured.

## Variables (per environment)

Configure these as **Environment Variables** (not secrets) in each environment:

| Variable | Description | Example |
|----------|-------------|---------|
| `DD_ENV` | Datadog environment tag | `dev`, `qa`, `uat`, `prod` |
| `S3_BUCKET` | Frontend S3 bucket name | `vin-portal-dev-frontend` |
| `CF_DISTRIBUTION_ID` | CloudFront distribution ID | `E1234ABCDEF` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `ECR_REPOSITORY` | ECR repository name | `vin-portal-api` |
| `ECS_CLUSTER` | ECS cluster name | `vin-portal-dev` |
| `ECS_SERVICE` | ECS service name | `vin-portal-api` |

## Secrets (per environment)

Configure these as **Environment Secrets** in each environment:

| Secret | Description |
|--------|-------------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for OIDC-based AWS authentication |
| `DD_CLIENT_TOKEN` | Datadog RUM client token (injected into SPA at build time) |
| `DD_APPLICATION_ID` | Datadog RUM application ID (injected into SPA at build time) |
| `DATADOG_API_KEY` | Datadog API key (for sourcemap uploads) |
| `DATABASE_HOST` | PostgreSQL host for migration runner |
| `DATABASE_PORT` | PostgreSQL port |
| `DATABASE_NAME` | PostgreSQL database name |
| `DATABASE_USER` | PostgreSQL username |
| `DATABASE_PASSWORD` | PostgreSQL password |

## Repository-level Secrets (shared)

These secrets are configured at the repository level, not per-environment:

| Secret | Description |
|--------|-------------|
| `CHECKMARX_TENANT` | Checkmarx One tenant ID |
| `CHECKMARX_CLIENT_ID` | Checkmarx One OAuth client ID |
| `CHECKMARX_CLIENT_SECRET` | Checkmarx One OAuth client secret |

## AWS OIDC Configuration

The pipeline uses OIDC (OpenID Connect) for AWS authentication instead of long-lived access keys. Each environment has its own IAM role with permissions scoped to its resources.

Required IAM permissions per role:
- **S3:** `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on the frontend bucket
- **CloudFront:** `cloudfront:CreateInvalidation` on the distribution
- **ECR:** `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, etc.
- **ECS:** `ecs:UpdateService`, `ecs:DescribeServices`

## Branch → Environment Mapping

| Branch | Environment | Auto-deploy |
|--------|-------------|-------------|
| `DEV` | dev | Yes |
| `QA` | qa | Yes |
| `UAT` | uat | Yes |
| `PROD` | production | Yes |
