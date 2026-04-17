const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const shouldShowToken = process.argv.includes('--show-token');

// Check if a token exists and decode it
const checkToken = () => {
  // Create a test admin token
  const adminUser = {
    id: 2,
    email: "cgill1980@hotmail.com",
    firstName: "Chris",
    lastName: "Gill",
    role: "Admin"
  };
  
  const token = jwt.sign(
    { 
      userId: adminUser.id, 
      email: adminUser.email, 
      role: adminUser.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  console.log('Admin test token generated for cgill1980@hotmail.com');
  if (shouldShowToken) {
    console.log(token);
  } else {
    console.log('Token output hidden by default. Re-run with --show-token to print it.');
  }
  console.log('\nToken payload:');
  console.log(jwt.decode(token));
};

checkToken();