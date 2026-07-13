# Operational readiness

Caplet exposes two minimal public probes and keeps detailed operational evidence behind administrator authentication.

## Health checks

- `GET /health` and `GET /api/ops/live` prove the process is alive.
- `GET /api/ops/ready` checks the database and migration ledger. A stale or missing backup reports `degraded` but does not evict an otherwise healthy application instance.
- `GET /api/ops/admin/health` returns the detailed database, migration, and backup checks to an administrator.
- `GET /api/ops/admin/backups/status` returns the newest verified backup and its age.

The legacy `GET /health/db` endpoint deliberately returns only a database status. It must never expose table names, migration names, SQL errors, credentials, or connection details.

## Backup verification evidence

The scheduled `.github/workflows/backup-restore-verification.yml` job creates a PostgreSQL custom-format dump, uploads it to a versioned and KMS-encrypted S3 bucket, downloads and checks the exact object version, restores it into a clean ephemeral PostgreSQL instance, validates core tables, and records the evidence through:

```http
POST /api/ops/admin/backups/verifications
X-Caplet-Ops-Token: <OPS_SERVICE_TOKEN>
Content-Type: application/json

{
  "verificationKey": "railway:production:backup-2026-07-13",
  "backupId": "backup-2026-07-13",
  "provider": "railway",
  "environment": "production",
  "status": "verified",
  "backupCreatedAt": "2026-07-13T00:00:00.000Z",
  "verifiedAt": "2026-07-13T00:30:00.000Z",
  "checksumVerified": true,
  "restoreTestedAt": "2026-07-13T00:25:00.000Z",
  "evidence": {
    "job": "nightly-backup-verification",
    "algorithm": "sha256"
  }
}
```

Verification rows are append-only and idempotent. Reusing a verification key with different evidence is rejected. A `verified` result requires either checksum evidence or a restore test.

Required workflow secrets are `BACKUP_DATABASE_URL`, `BACKUP_S3_BUCKET`, `BACKUP_KMS_KEY_ID`, `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, `CAPLET_API_BASE_URL`, and `CAPLET_OPS_SERVICE_TOKEN`. Set the workflow&apos;s `CAPLET_OPS_SERVICE_TOKEN` secret to the same value as the backend runtime&apos;s `OPS_SERVICE_TOKEN`. The bucket must have versioning enabled. Set `BACKUP_MAX_AGE_HOURS` to the maximum acceptable recovery-point age; the default is 26 hours.

## Controlled rollouts

Administrators manage rollout flags at `/operations` or through `/api/feature-flags/admin`. Public clients receive only public values and their deterministic enabled decision. Internal configuration and rollout rules are never returned by the public endpoint.

Every flag mutation:

- uses optimistic version checks;
- creates an append-only audit record;
- can be disabled or archived without redeploying;
- is treated as a product control, never as an authorisation check.

## Request safety

- Set `RATE_LIMIT_KEY_SALT` to a long random production value.
- Request logs contain route templates and hashed identities, not query strings, bearer tokens, editor codes, guardian links, answers, or user text.
- Every response carries an `X-Request-Id`; server errors return that identifier without exposing stack traces.
- AI workspace audit summaries expire after `AI_WORKSPACE_HISTORY_DAYS` (90 days by default).

## Runtime signals and alert delivery

`GET /api/ops/admin/observability` gives administrators a redacted operational summary:

- request volume, 5xx rate, aborted responses, p50/p95/p99 latency, and the busiest route templates;
- AI quota units reserved, completions, failures, quota/concurrency/circuit rejections, and open circuit breakers;
- an optional USD planning estimate calculated from `AI_ESTIMATED_COST_USD_PER_UNIT` and `AI_MONTHLY_BUDGET_USD`;
- open readiness/backup incidents and moderation-notification delivery health.

HTTP and AI aggregates are bounded in-process diagnostics. They contain no request IDs, user IDs, prompts, answers, URLs, query strings, or response bodies, and they reset when a process restarts. Cost is explicitly an estimate from reserved quota units—not OpenAI invoice data. Set `OBSERVABILITY_WINDOW_MINUTES` and `OBSERVABILITY_MAX_EVENTS` to tune the diagnostic window and memory bound.

Readiness and backup incidents are persisted in `operational_alerts` before delivery. Configure `OPS_ALERT_WEBHOOK_URL` to send a PII-free webhook with a stable idempotency key; production URLs must use HTTPS. Failed attempts use exponential retry (`OPS_ALERT_RETRY_BASE_MS`) and the monitor runs at `OPS_MONITOR_INTERVAL_MS`. Moderation reports retain their independent durable delivery state and use the existing moderation webhook/email configuration. If the primary database itself is unavailable, Caplet cannot persist a new incident in that database; Railway's external `/api/ops/ready` probe and structured process logs remain the outage signal.

AI circuits are scoped by feature. `AI_CIRCUIT_MIN_REQUESTS`, `AI_CIRCUIT_FAILURE_RATE`, `AI_CIRCUIT_WINDOW_MS`, and `AI_CIRCUIT_OPEN_MS` determine when repeated 5xx outcomes pause new AI work briefly. The user receives a retry-safe 503 while non-AI product paths remain available.

The built-in limiter is per process. Before running more than one backend replica, replace its in-memory store with a shared Redis-compatible implementation so limits remain consistent across instances.

## Release and rollback checklist

1. Run frontend tests, backend tests, lint, and the production build.
2. Apply every migration against disposable SQLite and PostgreSQL databases and reverse both back to zero.
3. Run the economics-marker evaluation with a configured `OPENAI_API_KEY`; do not treat a missing-key run as a quality pass.
4. Confirm `/api/ops/admin/health` reports the expected migration count and a current verified backup.
5. Release risky UI or learning-loop changes behind a disabled flag, then use a small deterministic cohort.
6. Watch request errors, latency, learning-session completion, and evidence-write failures.
7. Roll back by disabling the flag first. If a deployment rollback is required, keep schema changes backward-compatible until the previous application version is restored.
8. Complete the [legal and school-trust release gate](./legal-release-checklist.md); external counsel and real production-provider evidence cannot be inferred from code.
