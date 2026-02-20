# Datadog Monitor Definitions

Recommended monitors for the VIN Portal. Create these in the Datadog UI or via Terraform/Datadog provider.

## Prerequisites

1. **PagerDuty integration:** Configure `@pagerduty-vin-portal` service in Datadog Integrations > PagerDuty
2. **Slack integration:** Configure `@slack-vin-portal-alerts` channel in Datadog Integrations > Slack
3. **RUM application:** Ensure the VIN Portal RUM application is created with `clientToken` and `applicationId` populated in environment files
4. **APM:** Ensure Datadog APM agent is running alongside the ECS task (sidecar or daemon)

## P1 — Critical (PagerDuty / immediate response)

### Frontend Error Rate > 1%
- **Type:** RUM query monitor
- **Query:** `sum(last_5m):sum:rum.error.count{service:vin-portal}.as_count() / sum:rum.session.count{service:vin-portal}.as_count() > 0.01`
- **Threshold:** > 1% for 5 minutes
- **Notification:** `@pagerduty-vin-portal`
- **Tags:** `service:vin-portal`, `team:vin-portal`, `priority:p1`

### Backend 5xx Rate > 5%
- **Type:** Metric monitor
- **Query:** `sum(last_5m):sum:trace.express.request.errors{service:vin-portal-api}.as_count() / sum:trace.express.request.hits{service:vin-portal-api}.as_count() > 0.05`
- **Threshold:** > 5% for 5 minutes
- **Notification:** `@pagerduty-vin-portal`
- **Tags:** `service:vin-portal-api`, `team:vin-portal`, `priority:p1`

## P2 — Warning (Slack / next business day)

### API p95 Latency > 2s
- **Type:** APM monitor
- **Query:** `avg(last_10m):p95:trace.express.request{service:vin-portal-api} > 2`
- **Threshold:** > 2 seconds for 10 minutes
- **Notification:** `@slack-vin-portal-alerts`
- **Tags:** `service:vin-portal-api`, `team:vin-portal`, `priority:p2`

### Pending Request Backlog > 50
- **Type:** Metric monitor
- **Query:** `avg(last_15m):avg:vin_portal.pending_requests.count{service:vin-portal-api} > 50`
- **Threshold:** > 50 pending requests for 15 minutes
- **Notification:** `@slack-vin-portal-alerts`
- **Tags:** `service:vin-portal-api`, `team:vin-portal`, `priority:p2`

### Worker Final Failure
- **Type:** Log monitor
- **Query:** `logs("service:vin-portal-api status:error @message:*final failure*").index("main").rollup("count").last("5m") > 0`
- **Threshold:** Any occurrence
- **Notification:** `@slack-vin-portal-alerts`
- **Tags:** `service:vin-portal-api`, `team:vin-portal`, `priority:p2`

### DB Connection Pool > 90%
- **Type:** Metric monitor
- **Query:** `avg(last_5m):avg:postgresql.connections.active{db:vin_portal} / avg:postgresql.connections.max{db:vin_portal} > 0.9`
- **Threshold:** > 90% (18/20 connections) for 5 minutes
- **Notification:** `@slack-vin-portal-alerts`
- **Tags:** `service:vin-portal-api`, `team:vin-portal`, `priority:p2`

## Dashboard

Create a Datadog dashboard named **VIN Portal Overview** with:
- Frontend: session count, error rate, LCP/FID/CLS vitals
- Backend: request rate, error rate, p50/p95/p99 latency
- Infrastructure: ECS task count, CPU/memory, DB connections
- Business: VIN submissions per hour, success/failure ratio

## Setup Checklist

- [ ] PagerDuty service `vin-portal` created and integrated with Datadog
- [ ] Slack channel `#vin-portal-alerts` created and integrated with Datadog
- [ ] Monitor: Frontend Error Rate > 1% created
- [ ] Monitor: Backend 5xx Rate > 5% created
- [ ] Monitor: API p95 Latency > 2s created
- [ ] Monitor: Pending Request Backlog > 50 created
- [ ] Monitor: Worker Final Failure created
- [ ] Monitor: DB Connection Pool > 90% created
- [ ] Dashboard: VIN Portal Overview created
- [ ] All monitors verified with test notifications
