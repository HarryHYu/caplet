#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
: "${BACKUP_KMS_KEY_ID:?BACKUP_KMS_KEY_ID is required}"
: "${CAPLET_API_BASE_URL:?CAPLET_API_BASE_URL is required}"
: "${CAPLET_OPS_SERVICE_TOKEN:?CAPLET_OPS_SERVICE_TOKEN is required}"

started_epoch="$(date +%s)"
created_at="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
backup_id="caplet-${GITHUB_RUN_ID:-manual}-${created_at//[:.-]/}"
object_key="postgres/${created_at:0:10}/${backup_id}.dump"
work_dir="$(mktemp -d)"
source_dump="$work_dir/source.dump"
restored_dump="$work_dir/restored.dump"
restore_db="caplet_restore_${GITHUB_RUN_ID:-manual}_${RANDOM}"

cleanup() {
  PGPASSWORD="${RESTORE_POSTGRES_PASSWORD:-postgres}" dropdb \
    --if-exists --host "${RESTORE_POSTGRES_HOST:-127.0.0.1}" \
    --username "${RESTORE_POSTGRES_USER:-postgres}" "$restore_db" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

pg_dump "$BACKUP_DATABASE_URL" --format=custom --no-owner --no-acl --file "$source_dump"
checksum="$(sha256sum "$source_dump" | awk '{print $1}')"
size_bytes="$(wc -c < "$source_dump" | tr -d ' ')"

upload_json="$(aws s3api put-object \
  --bucket "$BACKUP_S3_BUCKET" \
  --key "$object_key" \
  --body "$source_dump" \
  --server-side-encryption aws:kms \
  --ssekms-key-id "$BACKUP_KMS_KEY_ID" \
  --metadata "sha256=$checksum")"
version_id="$(jq -r '.VersionId // "unversioned"' <<<"$upload_json")"
test "$version_id" != "unversioned"

aws s3api get-object --bucket "$BACKUP_S3_BUCKET" --key "$object_key" \
  --version-id "$version_id" "$restored_dump" >/dev/null
restored_checksum="$(sha256sum "$restored_dump" | awk '{print $1}')"
test "$restored_checksum" = "$checksum"

export PGPASSWORD="${RESTORE_POSTGRES_PASSWORD:-postgres}"
createdb --host "${RESTORE_POSTGRES_HOST:-127.0.0.1}" \
  --username "${RESTORE_POSTGRES_USER:-postgres}" "$restore_db"
pg_restore --exit-on-error --no-owner --no-acl \
  --host "${RESTORE_POSTGRES_HOST:-127.0.0.1}" \
  --username "${RESTORE_POSTGRES_USER:-postgres}" \
  --dbname "$restore_db" "$restored_dump"

migration_count="$(psql --host "${RESTORE_POSTGRES_HOST:-127.0.0.1}" \
  --username "${RESTORE_POSTGRES_USER:-postgres}" --dbname "$restore_db" \
  --tuples-only --no-align --command 'SELECT COUNT(*) FROM "SequelizeMeta";')"
test "$migration_count" -gt 0
psql --host "${RESTORE_POSTGRES_HOST:-127.0.0.1}" \
  --username "${RESTORE_POSTGRES_USER:-postgres}" --dbname "$restore_db" \
  --tuples-only --no-align --command 'SELECT 1 FROM users LIMIT 1;' >/dev/null

verified_at="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
elapsed="$(( $(date +%s) - started_epoch ))"
payload="$(jq -n \
  --arg verificationKey "s3:production:${backup_id}" \
  --arg backupId "$backup_id" \
  --arg backupCreatedAt "$created_at" \
  --arg verifiedAt "$verified_at" \
  --arg restoreTestedAt "$verified_at" \
  --arg objectKey "$object_key" \
  --arg versionId "$version_id" \
  --arg checksum "$checksum" \
  --argjson sizeBytes "$size_bytes" \
  --argjson recoveryTimeSeconds "$elapsed" \
  --argjson migrationCount "$migration_count" \
  '{verificationKey:$verificationKey,backupId:$backupId,provider:"aws-s3",environment:"production",status:"verified",backupCreatedAt:$backupCreatedAt,verifiedAt:$verifiedAt,restoreTestedAt:$restoreTestedAt,checksumVerified:true,sizeBytes:$sizeBytes,recoveryPointAt:$backupCreatedAt,recoveryTimeSeconds:$recoveryTimeSeconds,evidence:{job:"scheduled-postgres-backup-restore",objectKey:$objectKey,versionId:$versionId,sha256:$checksum,migrationCount:$migrationCount}}')"

curl --fail-with-body --silent --show-error \
  --request POST "${CAPLET_API_BASE_URL%/}/api/ops/admin/backups/verifications" \
  --header "X-Caplet-Ops-Token: $CAPLET_OPS_SERVICE_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "$payload"
