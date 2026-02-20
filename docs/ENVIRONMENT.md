# Environment

## Prerequisites

| Tool       | Version   | Notes                       |
| ---------- | --------- | --------------------------- |
| Node.js    | 20+       | Required by Angular 21      |
| npm        | 10+       | Ships with Node 20          |
| Angular CLI| 21.x      | Installed as devDependency  |

## Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (mock API enabled by default)
npm start
# → http://localhost:4200

# 3. Run tests
npm test

# 4. Build for production
npm run build
# → dist/vin-portal/
```

## Environment Variables (Angular compile-time)

Configuration is managed via environment files, not runtime env vars:

| Setting              | Dev (`environment.ts`)  | Prod (`environment.prod.ts`) | Description                          |
| -------------------- | ----------------------- | ---------------------------- | ------------------------------------ |
| `production`         | `false`                 | `true`                       | Angular production mode              |
| `apiBaseUrl`         | `/api/v1`               | `/api/v1`                    | Backend API base URL                 |
| `sessionTtlMinutes`  | `15`                    | `15`                         | Session token lifetime               |
| `features.captchaEnabled`  | `false`           | `true`                       | CAPTCHA on auth forms                |
| `features.otpSimulation`  | `true`             | `false`                      | Simulated OTP (dev bypass)           |
| `features.mockApi`   | `true`                  | `false`                      | Use in-app mock backend              |
| `polling.initialIntervalMs` | `10000`          | `10000`                      | Status poll initial interval         |
| `polling.slowIntervalMs`    | `30000`          | `30000`                      | Status poll slow interval            |
| `polling.maxDurationMs`     | `180000`         | `180000`                     | Max polling duration (3 min)         |

File replacement is handled by Angular CLI (see `angular.json` → `fileReplacements`).

## Runtime Dependencies

### Dev Mode
- None — mock API is built into the Angular app (`mock-api.service.ts`).

### Production
- **Backend API** at `/api/v1` — see `openapi/vin-portal.openapi.yaml` for contract.
- **S3 + CloudFront** (or equivalent static hosting) — SPA with `index.html` fallback routing.

## Test Credentials (Mock API)

| VIN (last 7)  | Last Name  | ZIP    | Behavior                  |
| ------------- | ---------- | ------ | ------------------------- |
| `1234567`     | `SMITH`    | `30301`| Happy path (direct auth)  |
| `0TP7654`     | `TESTUSER` | `12345`| Triggers OTP step-up      |
| `LOCKED1`     | `LOCKED`   | `99999`| Contract locked            |

## Ports

| Service    | Port | Notes            |
| ---------- | ---- | ---------------- |
| Dev server | 4200 | `ng serve`       |

## Build Output

- Path: `dist/vin-portal/`
- Type: Static SPA (HTML/CSS/JS)
- Hashing: Production builds use content hashing for cache busting
