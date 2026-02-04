import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'database.sqlite'));

console.log('\n=== TESTING /api/admin/users QUERY ===');

// Test the exact query
const result = db.prepare(`
  SELECT 
    id, 
    email, 
    firstName, 
    lastName, 
    role, 
    createdAt,
    isVerified,
    isBlocked
  FROM users 
  ORDER BY createdAt DESC
`).all();

console.log(`Query returned ${result.length} rows:`);
console.log(JSON.stringify(result, null, 2));

// Format as the endpoint would return it
const response = { users: result || [] };
console.log('\n=== ENDPOINT RESPONSE ===');
console.log(JSON.stringify(response, null, 2));

db.close();
