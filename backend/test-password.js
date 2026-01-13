const bcrypt = require('bcryptjs');

const hash = '$2a$12$verKoPZ5GEPeg6psw9A5Iervqj3xLTk/TrRf5iC8lktDuNswar.V2';
const password = 'password123';

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Password matches:', result);
  }
});