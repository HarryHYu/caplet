const path = require('path');
const { assertMigrationNames, LEGACY_DUPLICATE_MIGRATIONS } = require('../utils/migrationNaming');

describe('migration naming', () => {
  test('preserves only the documented legacy collisions', () => {
    const result = assertMigrationNames(path.join(__dirname, '../migrations'));
    expect(result.collisions.map(([prefix]) => prefix)).toEqual(['002', '016', '034', '039']);
    expect(LEGACY_DUPLICATE_MIGRATIONS.size).toBe(4);
  });
});
