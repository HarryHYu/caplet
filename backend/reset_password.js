const { User } = require('./models');
async function reset() {
  try {
    const user = await User.findOne({ where: { email: 'test@test.com' } });
    if (user) {
      user.password = 'password123';
      await user.save();
      console.log('Password reset successfully');
    } else {
      console.log('User not found');
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
reset();
