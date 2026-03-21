const bcrypt = require('bcryptjs');
async function test() {
  const hash = '$2b$12$DpdFzmAD2z.pUSmPo2GY8O2bU/zDQolxD.YBabwZtTLkC9OabtBFq';
  const pwd = 'password123';
  console.log('Result:', await bcrypt.compare(pwd, hash));
}
test();
