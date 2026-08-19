const assert = require('node:assert/strict');
const { createHash } = require('crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const app = require('../server');
const DatabaseUtils = require('../db/database');
const db = new DatabaseUtils();

const createdUserIds = [];
let usersTableColumns = null;

const hashEmail = (email) => createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

async function createUser(role, prefix) {
  const unique = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `${unique}@example.com`;

  if (!usersTableColumns) {
    const schema = await db.query('PRAGMA table_info(users)');
    usersTableColumns = new Set((schema.rows || []).map((row) => row.name));
  }

  const columns = ['email', 'emailHash', 'password', 'firstName', 'lastName', 'role'];
  const values = [email, hashEmail(email), 'test-password-hash', `${prefix}First`, `${prefix}Last`, role];

  if (usersTableColumns.has('isEmailVerified')) {
    columns.push('isEmailVerified');
    values.push(true);
  } else if (usersTableColumns.has('isVerified')) {
    columns.push('isVerified');
    values.push(true);
  }

  const placeholders = columns.map(() => '?').join(', ');
  const result = await db.query(
    `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  const userId = Number(result.lastID || 0);
  if (!userId) throw new Error('Failed to create test user');

  createdUserIds.push(userId);
  return {
    userId,
    role,
    authCookie: `auth_token=${jwt.sign({ userId, role }, process.env.JWT_SECRET)}`
  };
}

async function cleanupUsers() {
  if (!createdUserIds.length) return;

  const placeholders = createdUserIds.map(() => '?').join(',');
  const userParams = [...createdUserIds];

  await db.query(`DELETE FROM testimonial_reports WHERE reporterId IN (${placeholders})`, userParams);
  await db.query(`DELETE FROM testimonials WHERE authorId IN (${placeholders}) OR recipientId IN (${placeholders})`, [...createdUserIds, ...createdUserIds]);
  await db.query(`DELETE FROM users WHERE id IN (${placeholders})`, userParams);
}

async function waitForTestimonialsTable(maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const result = await db.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name = 'testimonials'`
      );
      if ((result.rows || []).length > 0) return;
    } catch {
      // keep retrying while bootstrapping
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('testimonials table did not become ready in time');
}

async function run() {
  await waitForTestimonialsTable();

  const coach = await createUser('Coach', 'coach');
  const player = await createUser('Player', 'player');
  const parent = await createUser('Parent/Guardian', 'parent');

  try {
    // 1) Invalid role pair is rejected (Coach cannot write a testimonial for another Coach)
    const otherCoach = await createUser('Coach', 'coach2');
    const invalidPairResponse = await request(app)
      .post('/api/testimonials')
      .set('Cookie', coach.authCookie)
      .send({ recipientId: otherCoach.userId, content: 'Great coaching colleague and mentor.' });

    assert.equal(invalidPairResponse.status, 403);

    // 2) Coach can write a testimonial for a player
    const createResponse = await request(app)
      .post('/api/testimonials')
      .set('Cookie', coach.authCookie)
      .send({ recipientId: player.userId, content: 'Fantastic attitude and great team player all season.', rating: 5 });

    assert.equal(createResponse.status, 201);
    const testimonialId = createResponse.body.testimonialId;
    assert.ok(testimonialId);

    // 3) Received testimonial appears for the player, not yet public
    const receivedResponse = await request(app)
      .get('/api/testimonials/received')
      .set('Cookie', player.authCookie);

    assert.equal(receivedResponse.status, 200);
    assert.equal(receivedResponse.body.testimonials.length, 1);
    assert.equal(Boolean(receivedResponse.body.testimonials[0].isPublic), false);

    // 4) Public endpoint returns nothing until recipient opts in
    const publicBeforeResponse = await request(app).get(`/api/users/${player.userId}/testimonials/public`);
    assert.equal(publicBeforeResponse.status, 200);
    assert.equal(publicBeforeResponse.body.testimonials.length, 0);

    // 5) Non-recipient cannot toggle visibility
    const unauthorizedVisibilityResponse = await request(app)
      .patch(`/api/testimonials/${testimonialId}/visibility`)
      .set('Cookie', coach.authCookie)
      .send({ isPublic: true });

    assert.equal(unauthorizedVisibilityResponse.status, 404);

    // 6) Recipient makes the testimonial public
    const visibilityResponse = await request(app)
      .patch(`/api/testimonials/${testimonialId}/visibility`)
      .set('Cookie', player.authCookie)
      .send({ isPublic: true });

    assert.equal(visibilityResponse.status, 200);

    const publicAfterResponse = await request(app).get(`/api/users/${player.userId}/testimonials/public`);
    assert.equal(publicAfterResponse.status, 200);
    assert.equal(publicAfterResponse.body.testimonials.length, 1);
    assert.equal(publicAfterResponse.body.testimonials[0].content.includes('Fantastic attitude'), true);

    // 7) Parent/Guardian can write a testimonial for a coach
    const parentTestimonialResponse = await request(app)
      .post('/api/testimonials')
      .set('Cookie', parent.authCookie)
      .send({ recipientId: coach.userId, content: 'Always supportive and organized with the kids.' });

    assert.equal(parentTestimonialResponse.status, 201);

    console.log('✅ testimonials.integration.node.test.cjs passed');
  } finally {
    await cleanupUsers();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ testimonials.integration.node.test.cjs failed');
    console.error(error);
    cleanupUsers().finally(() => process.exit(1));
  });
