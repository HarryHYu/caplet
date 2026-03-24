const { User } = require('./models');
const { fn, col, where } = require('sequelize');

async function test() {
  const email = 'test@test.com'.toLowerCase();
  
  try {
    const user = await User.findOne({
      where: where(fn('LOWER', col('email')), email)
    });
    console.log("Found user:", user ? user.email : "Not found");
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
