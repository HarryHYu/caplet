const fs = require('fs');
const path = require('path');

// These collisions are already part of deployed Umzug history. Renaming them
// would make production treat an existing migration as new, so preserve those
// filenames and fail any future, unreviewed collision.
const LEGACY_DUPLICATE_MIGRATIONS = new Map([
  ['002', new Set(['002-chat-messages.js', '002-user-onboarded.js'])],
  ['016', new Set(['016-cdr-financial-twin.js', '016-marked-attempts.js'])],
  ['034', new Set(['034-moderation-notification-delivery.js', '034-money-mode-flag.js'])],
  ['039', new Set(['039-study-coach-recommendation-engine.js', '039-subject-packs.js'])],
]);

function migrationFiles(directory = path.join(__dirname, '../migrations')) {
  return fs.readdirSync(directory)
    .filter((name) => /^\d+-.*\.js$/.test(name))
    .sort();
}

function migrationPrefix(name) {
  return name.match(/^(\d+)-/)?.[1] || null;
}

function assertMigrationNames(directory) {
  const files = migrationFiles(directory);
  const byPrefix = new Map();
  for (const file of files) {
    const prefix = migrationPrefix(file);
    const names = byPrefix.get(prefix) || [];
    names.push(file);
    byPrefix.set(prefix, names);
  }

  const collisions = [...byPrefix.entries()].filter(([, names]) => names.length > 1);
  const unexpected = collisions.filter(([prefix, names]) => {
    const expected = LEGACY_DUPLICATE_MIGRATIONS.get(prefix);
    return !expected || names.length !== expected.size || names.some((name) => !expected.has(name));
  });
  if (unexpected.length) {
    const detail = unexpected.map(([prefix, names]) => `${prefix}: ${names.join(', ')}`).join('; ');
    throw new Error(`Duplicate migration prefixes are not allowed: ${detail}`);
  }
  return { files, collisions };
}

module.exports = {
  LEGACY_DUPLICATE_MIGRATIONS,
  migrationFiles,
  migrationPrefix,
  assertMigrationNames,
};
