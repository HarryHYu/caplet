const { sequelize } = require('./config/database');
const User = require('./models/User');

async function createTestUser() {
  try {
    await sequelize.authenticate();
    
    // Check if test user exists, otherwise create
    let user = await User.findOne({ where: { email: 'admin@caplet.com' } });
    if (!user) {
      user = await User.create({
        email: 'admin@caplet.com',
        firstName: 'Test',
        lastName: 'Admin',
        password: 'password123',
        role: 'admin',
        isEmailVerified: true
      });
      console.log('Created admin@caplet.com user');
    } else {
      user.password = 'password123';
      await user.save();
      console.log('Reset admin@caplet.com password to password123');
    }
    
    let student = await User.findOne({ where: { email: 'test@test.com' } });
    if (!student) {
      student = await User.create({
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'Student',
        password: 'password123',
        role: 'student',
        isEmailVerified: true
      });
      console.log('Created test@test.com user');
    } else {
      student.password = 'password123';
      await student.save();
      console.log('Reset test@test.com password to password123');
    }
    
  } catch (err) {
    console.error('Error creating user', err);
  } finally {
    process.exit(0);
  }
}

createTestUser();
