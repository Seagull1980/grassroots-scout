import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-jwt-secret';

const testUser = {
  userId: 'test-user-1',
  email: 'coach@test.com',
  role: 'Coach'
};

const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
console.log('Test JWT Token:');
console.log(token);
