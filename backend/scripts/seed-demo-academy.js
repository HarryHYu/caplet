/**
 * DEV ONLY — seed a demo academy so the Estates tab is viewable locally.
 * Idempotent: safe to re-run. Strictly additive (creates rows, drops nothing).
 *
 *   node backend/scripts/seed-demo-academy.js
 *
 * Then log in at http://localhost:5173 as the test account and open
 * Academy → "Demo Academy" → Estates.
 */
const crypto = require('crypto');
const { sequelize, User, Classroom, ClassMembership, Property } = require('../models');
const { buildDeedRows } = require('../services/estateSeed');
const { getCityPlan } = require('../services/cityPlan');

const TEST_EMAIL = 'pwtest@caplet.local';
const TEST_PASSWORD = 'Test1234!';
const CLASS_NAME = 'Demo Academy';
const START_COINS = 300000; // enough to buy across districts (Finance lots ~9k+)

async function ensureUser(email, first, last, password) {
  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      email, password, firstName: first, lastName: last,
      isEmailVerified: true, onboarded: true,
    });
    console.log(`  created user ${email}`);
  }
  return user;
}

(async () => {
  await sequelize.authenticate();

  // Main test player.
  const me = await ensureUser(TEST_EMAIL, 'Pat', 'Tester', TEST_PASSWORD);
  if (me.capletCoins < START_COINS) {
    me.capletCoins = START_COINS;
    await me.save();
  }
  console.log(`Test user ${TEST_EMAIL} — capletCoins now ${me.capletCoins}`);

  // A couple of other "players" so the map shows multiplayer ownership.
  const rivals = await Promise.all([
    ensureUser('ava.demo@caplet.local', 'Ava', 'Nguyen', TEST_PASSWORD),
    ensureUser('leo.demo@caplet.local', 'Leo', 'Marino', TEST_PASSWORD),
  ]);

  // Demo classroom.
  let classroom = await Classroom.findOne({ where: { name: CLASS_NAME } });
  if (!classroom) {
    classroom = await Classroom.create({
      name: CLASS_NAME,
      description: 'A sandbox academy for trying out the property market.',
      code: 'DEMO01',
      createdBy: me.id,
    });
    console.log(`  created classroom "${CLASS_NAME}"`);
  }

  // Seed ONLY the landmark deeds (ordinary plots are created on demand when
  // bought — see academyEstate buy). Idempotent: clear + reinsert this
  // academy's rows so a re-run tracks the current plan.
  await Property.destroy({ where: { classroomId: classroom.id } });
  await Property.bulkCreate(buildDeedRows(classroom.id));
  console.log(`  seeded ${buildDeedRows(classroom.id).length} landmark deeds for "${CLASS_NAME}"`);

  // Enrol everyone (idempotent).
  await ClassMembership.findOrCreate({
    where: { classroomId: classroom.id, userId: me.id },
    defaults: { role: 'student' },
  });
  for (const r of rivals) {
    await ClassMembership.findOrCreate({
      where: { classroomId: classroom.id, userId: r.id },
      defaults: { role: 'student' },
    });
  }

  // Hand some central (Finance/Commerce) lots to players so the demo shows
  // ownership near the heart of the city. With on-demand plots these rows don't
  // exist yet, so create them explicitly from the plan with an owner set.
  const central = getCityPlan().plots
    .filter((p) => p.neighborhood === 'Finance' || p.neighborhood === 'Commerce')
    .sort((a, b) => (a.gridY - b.gridY) || (a.gridX - b.gridX));
  const giveaways = [
    { spec: central[0], owner: me, style: 'modern', color: '#8b5cf6' },
    { spec: central[40], owner: me, style: 'mansion', color: '#0ea5e9' },
    { spec: central[90], owner: rivals[0], style: 'modern', color: '#3b82f6' },
    { spec: central[150], owner: rivals[0], style: 'villa', color: '#14b8a6' },
    { spec: central[220], owner: rivals[1], style: 'townhouse', color: '#f97316' },
    { spec: central[300], owner: rivals[1], style: 'castle', color: '#22c55e' },
  ];
  for (const g of giveaways) {
    if (!g.spec) continue;
    const exists = await Property.findOne({ where: { classroomId: classroom.id, gridX: g.spec.gridX, gridY: g.spec.gridY } });
    if (exists) continue;
    await Property.create({
      id: crypto.randomUUID(),
      classroomId: classroom.id,
      name: g.spec.name,
      neighborhood: g.spec.neighborhood,
      tier: g.spec.tier,
      gridX: g.spec.gridX,
      gridY: g.spec.gridY,
      price: g.spec.price,
      marketValue: g.spec.price,
      ownerId: g.owner.id,
      purchasePrice: g.spec.price,
      lastRentAt: new Date(),
      houseStyle: g.style,
      houseColor: g.color,
    });
  }

  console.log(`\n✅ Demo academy ready. Log in as ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  console.log('   Academy → "Demo Academy" → Estates');
  await sequelize.close();
})().catch((e) => { console.error('seed-demo-academy failed:', e); process.exit(1); });
