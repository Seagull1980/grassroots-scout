const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoiY2dpbGwxOTgwQGhvdG1haWwuY29tIiwicm9sZSI6IkFkbWluIiwiaWF0IjoxNzU4MTM5NDA0LCJleHAiOjE3NTgyMjU4MDR9.gABO8BEh5w9rcTqUp5XPuGxGPy54OlZn-tNGFb3FcCA';

console.log('JWT_SECRET:', JWT_SECRET);
console.log('Token:', token);

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token verified successfully!');
  console.log('Decoded payload:', decoded);
  console.log('User role:', decoded.role);
  console.log('Is admin?:', decoded.role === 'Admin');
} catch (error) {
  console.error('Token verification failed:', error.message);
}