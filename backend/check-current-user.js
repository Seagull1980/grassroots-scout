const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Check if a token exists and decode it
const checkToken = () => {
  // Use the same JWT secret that the server uses
  const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';
  
  console.log('Using JWT_SECRET from env:', process.env.JWT_SECRET || 'fallback: grassroots-hub-secret-key');
  
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
  
  console.log('Admin test token for cgill1980@hotmail.com:');
  console.log(token);
  console.log('\nToken payload:');
  console.log(jwt.decode(token));
};

checkToken();