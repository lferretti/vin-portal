# On-Call Escalation Runbook -- VIN Portal

**Owner team:** Warranty Digital Products
**Last updated:** 2026-02-18

---

## 1. On-Call Rotation

### Structure

| Role | Description |
|------|-------------|
| **Primary on-call** | First responder for all alerts. Triages, acknowledges, and begins investigation. |
| **Secondary on-call** | Backup if primary does not acknowledge within 10 minutes. |
| **Escalation manager** | Team lead or engineering manager engaged for P1 incidents or when on-call needs support. |

### Schedule

- Rotations run **weekly**, starting Monday at 09:00 ET and ending the following Monday at 09:00 ET.
- Schedules are managed in **PagerDuty** under the `vin-portal-on-call` policy.
- Each engineer participates in the rotation. No engineer should be on-call for consecutive weeks.

### Handoff Procedure

1. Outgoing on-call posts a summary in `#vin-portal-oncall` Slack channel by end of rotation covering:
   - Active or recently resolved incidents.
   - Alerts that fired but required no action (flapping, known issues).
   - Any temporary workarounds currently in place.
2. Incoming on-call acknowledges the handoff in the same channel.
3. Both engineers confirm the PagerDuty schedule reflects the correct rotation.

---

## 2. Severity Levels

| Severity | Name | Definition | Examples |
|----------|------|------------|----------|
| **P1** | Critical | Service is fully down or data integrity is at risk. Consumer-facing functionality is completely unavailable. | CloudFront returning 5xx for all requests; API returning 500 on all endpoints; database corruption. |
| **P2** | High | Service is degraded. Core functionality works but with significant impact on users. | OTP delivery delays > 5 minutes; VIN lookup endpoint intermittently failing; latency > 10s on critical paths. |
| **P3** | Medium | Non-critical issue affecting a subset of users or a secondary feature. | Admin dashboard search slow; one environment config incorrect but workaround exists; non-blocking UI errors. |
| **P4** | Low | Cosmetic or minor issue with no functional impact. | Styling inconsistency; typo in UI copy; minor logging noise. |

---

## 3. Escalation Flows

### P1 -- Critical

| Step | Action | Timeframe |
|------|--------|-----------|
| 0 min | PagerDuty alerts primary on-call. | Immediate |
| 5 min | Primary acknowledges alert and begins investigation. | Within 5 min |
| 10 min | If no acknowledgment, PagerDuty escalates to secondary on-call. | Within 10 min |
| 15 min | On-call declares incident in `#vin-portal-incidents` Slack channel. | Within 15 min |
| 15 min | Escalation manager is notified. | Within 15 min |
| 30 min | First status update posted. Engineering management and stakeholders informed. | Within 30 min |
| 60 min | If unresolved, escalate to infrastructure team and/or AWS support. | Within 60 min |

**Response time SLA:** Acknowledge within 5 minutes. First status update within 30 minutes.

### P2 -- High

| Step | Action | Timeframe |
|------|--------|-----------|
| 0 min | PagerDuty alerts primary on-call. | Immediate |
| 15 min | Primary acknowledges and begins investigation. | Within 15 min |
| 30 min | If no acknowledgment, PagerDuty escalates to secondary on-call. | Within 30 min |
| 30 min | Post status in `#vin-portal-incidents`. | Within 30 min |
| 60 min | Escalation manager notified if not yet resolved. | Within 60 min |

**Response time SLA:** Acknowledge within 15 minutes. First status update within 1 hour.

### P3 -- Medium

| Step | Action | Timeframe |
|------|--------|-----------|
| 0 min | Alert or ticket created. | Immediate |
| 4 hrs | On-call triages during business hours. | Within 4 business hours |
| 1 day | Fix or workaround identified. | Within 1 business day |

**Response time SLA:** Acknowledge within 4 business hours. Resolution within 3 business days.

### P4 -- Low

| Step | Action | Timeframe |
|------|--------|-----------|
| 0 min | Ticket created in backlog. | Immediate |
| Sprint | Prioritized during normal sprint planning. | Next sprint cycle |

**Response time SLA:** No immediate response required. Address during normal development cycle.

---

## 4. Communication Templates

### Incident Declaration

Post to `#vin-portal-incidents`:

```
INCIDENT DECLARED -- [P1/P2]
Service:    VIN Portal
Severity:   [P1 Critical / P2 High]
Impact:     [Brief description of user impact]
Start time: [YYYY-MM-DD HH:MM ET]
On-call:    [Your name]
Status:     Investigating
Tracking:   [PagerDuty incident link]
```

### Status Update

Post to `#vin-portal-incidents` (thread on the declaration message):

```
STATUS UPDATE -- [P1/P2] -- [HH:MM ET]
Current status: [Investigating / Identified / Mitigating / Monitoring]
Summary:        [What has been done, what is known]
Next steps:     [What will be tried next]
ETA:            [Estimated time to resolution or next update]
```

### Resolution Notification

Post to `#vin-portal-incidents` (thread on the declaration message):

```
INCIDENT RESOLVED -- [P1/P2]
Service:       VIN Portal
Resolved at:   [YYYY-MM-DD HH:MM ET]
Duration:      [Total incident duration]
Root cause:    [Brief root cause summary]
Resolution:    [What was done to fix it]
Follow-up:     [Post-mortem scheduled? Ticket number for follow-up items?]
```

### Stakeholder Email (P1 only)

```
Subject: [RESOLVED/ONGOING] VIN Portal P1 Incident -- [Brief title]

Team,

Incident summary:
- Impact: [Description of user-facing impact]
- Start: [Start time]
- Current status: [Investigating / Resolved]
- Resolution: [If resolved, what was done]

Next steps:
- [Post-mortem date if applicable]
- [Follow-up action items]

Regards,
[Your name], Warranty Digital Products
```

---

## 5. Contacts

| Role | Name | Email | Phone | Slack Handle |
|------|------|-------|-------|--------------|
| Team Lead | TBD | tbd@company.com | TBD | @tbd-team-lead |
| Engineering Manager | TBD | tbd@company.com | TBD | @tbd-eng-manager |
| Backend Lead | TBD | tbd@company.com | TBD | @tbd-backend-lead |
| Frontend Lead | TBD | tbd@company.com | TBD | @tbd-frontend-lead |
| Infrastructure / DevOps | TBD | tbd@company.com | TBD | @tbd-infra |
| Security Team | TBD | security@company.com | TBD | @security-oncall |
| Database Admin | TBD | tbd@company.com | TBD | @tbd-dba |
| Director of Engineering | TBD | tbd@company.com | TBD | @tbd-director |
| VP of Technology | TBD | tbd@company.com | TBD | @tbd-vp |
| AWS Account Rep | TBD | tbd@company.com | TBD | N/A |

---

## 6. Tools

### Datadog

| Dashboard | Purpose | URL |
|-----------|---------|-----|
| VIN Portal -- Overview | Request rates, error rates, latency (p50/p95/p99) | `https://app.datadoghq.com/dashboard/TBD` |
| VIN Portal -- API Health | Backend endpoint health, 4xx/5xx breakdown | `https://app.datadoghq.com/dashboard/TBD` |
| VIN Portal -- RUM | Frontend performance, Core Web Vitals, JS errors | `https://app.datadoghq.com/dashboard/TBD` |
| CloudFront & S3 | CDN cache hit ratio, origin errors, bandwidth | `https://app.datadoghq.com/dashboard/TBD` |

- **Monitors/Alerts:** Configured in Datadog under the `vin-portal` team tag.
- **Log Explorer:** Filter by `service:vin-portal` for backend logs.

### PagerDuty

| Item | Link |
|------|------|
| On-call schedule | `https://company.pagerduty.com/schedules/TBD` |
| Escalation policy | `https://company.pagerduty.com/escalation_policies/TBD` |
| Service page | `https://company.pagerduty.com/services/TBD` |

### Slack Channels

| Channel | Purpose |
|---------|---------|
| `#vin-portal-oncall` | On-call handoffs, non-urgent alert discussion |
| `#vin-portal-incidents` | Active incident communication (P1/P2 only) |
| `#vin-portal-dev` | General development discussion |
| `#vin-portal-alerts` | Automated alert feed from Datadog/PagerDuty |

### AWS Console

| Resource | Region | Purpose |
|----------|--------|---------|
| CloudFront distribution | us-east-1 | SPA delivery, caching |
| S3 bucket (`vin-portal-*`) | us-east-1 | Static asset hosting |
| ECS / Lambda (backend API) | us-east-1 | NestJS API runtime |
| RDS / DynamoDB | us-east-1 | Contract and session data |
| CloudWatch Logs | us-east-1 | Backup log source if Datadog is unavailable |

Access AWS Console through your organization's SSO portal. If you do not have access, contact the infrastructure team.
