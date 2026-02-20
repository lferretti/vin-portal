# Load Tests

k6 load tests for the VIN Portal backend API.

## Prerequisites

Install k6 on your machine:

```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker (no install required)
docker run --rm -i grafana/k6 run - <load-tests/scenarios/auth-flow.js
```

Verify the installation:

```bash
k6 version
```

## Available Scenarios

| Script | Description | npm Script |
|--------|-------------|------------|
| `scenarios/auth-flow.js` | Consumer authentication (valid + invalid credentials) | `npm run load-test` |
| `scenarios/vin-flow.js` | Full VIN add journey (auth, decode, eligibility, commit, status) | `npm run load-test:vin` |
| `scenarios/admin-search.js` | Admin contract search and request detail retrieval | `npm run load-test:admin` |

## Running Tests

### Against local backend (default: http://localhost:3000)

```bash
# Start the backend first
cd backend && npm run start:dev

# Run a specific scenario
npm run load-test
npm run load-test:vin
npm run load-test:admin
```

### Against a remote environment

```bash
k6 run -e BASE_URL=https://api.staging.example.com load-tests/scenarios/auth-flow.js
k6 run -e BASE_URL=https://api.staging.example.com load-tests/scenarios/vin-flow.js
```

### Admin tests (requires a JWT or credentials)

```bash
# Option 1: Pre-supplied JWT
k6 run -e ADMIN_TOKEN=<your-jwt> load-tests/scenarios/admin-search.js

# Option 2: Username/password (if admin auth endpoint exists)
k6 run -e ADMIN_USER=admin -e ADMIN_PASS=secret load-tests/scenarios/admin-search.js
```

### Override load profile

You can override the number of virtual users and duration via k6 CLI flags:

```bash
k6 run --vus 50 --duration 5m load-tests/scenarios/auth-flow.js
```

## Thresholds

Thresholds are defined in `config.js` and aligned with the SLA targets in `docs/operations-sla.md`:

| Metric | Default Threshold | SLA Source |
|--------|-------------------|------------|
| All endpoints p95 | < 500ms | General target |
| All endpoints p99 | < 2000ms | General target |
| Error rate | < 1% | Availability 99% |
| Authenticate p95 | < 1500ms | operations-sla.md |
| VIN decode p95 | < 1000ms | operations-sla.md |
| Eligibility p95 | < 1500ms | operations-sla.md |
| Commit p95 | < 2000ms | operations-sla.md |

A test run fails if any threshold is breached. Failed thresholds cause k6 to exit with a non-zero code.

## Interpreting Results

After a run, k6 prints a summary including:

- **http_req_duration**: Response time percentiles (p50, p90, p95, p99, max).
- **http_req_failed**: Percentage of requests that returned non-2xx status codes.
- **http_reqs**: Total request count and rate (requests/second).
- **checks**: Pass/fail counts for each named check.
- **iterations**: How many full scenario iterations completed.

Look for:

1. **Threshold breaches** -- printed with a red cross. Any breach means the test failed.
2. **High p99 values** -- may indicate tail latency issues under load.
3. **Rising error rates** during peak stages -- suggests the backend cannot handle the load.
4. **Low iteration counts** -- may mean each iteration is taking too long.

## CI Integration

The `load-test.yml` GitHub Actions workflow runs these tests on demand via `workflow_dispatch`. It accepts a target URL and environment name as inputs. Results are uploaded as artifacts.

## File Structure

```
load-tests/
  config.js               # Shared config: base URL, thresholds, test data, load profiles
  helpers.js              # Shared utilities: auth helper, header builder, UUID generator
  scenarios/
    auth-flow.js          # Consumer authentication scenario
    vin-flow.js           # Full VIN add flow scenario
    admin-search.js       # Admin search and detail scenario
  README.md               # This file
```
