/**
 * DEV ONLY — print every classroom (id, name, code, member + plot counts) so
 * you can deep-link straight to an academy page, e.g.:
 *
 *   npm run dev:academies
 *   → http://localhost:5173/classes/<id>?tab=estates
 */
const { sequelize, Classroom, ClassMembership, Property } = require('../models');

(async () => {
  await sequelize.authenticate();
  const classrooms = await Classroom.findAll({ attributes: ['id', 'name', 'code'] });
  if (!classrooms.length) {
    console.log('No classrooms found. Run: npm run seed:academy');
  }
  for (const c of classrooms) {
    const [members, plots] = await Promise.all([
      ClassMembership.count({ where: { classroomId: c.id } }),
      Property.count({ where: { classroomId: c.id } }),
    ]);
    console.log(`${c.id}  "${c.name}" (code ${c.code}) — ${members} members, ${plots} plots`);
  }
  await sequelize.close();
})().catch((e) => { console.error('print-academies failed:', e.message || e); process.exit(1); });
