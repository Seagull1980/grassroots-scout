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
  const userParamsDouble = [...createdUserIds, ...createdUserIds];

  await db.query(`DELETE FROM message_reports WHERE reporterId IN (${placeholders})`, userParams);
  await db.query(`DELETE FROM messages WHERE senderId IN (${placeholders}) OR recipientId IN (${placeholders})`, userParamsDouble);
  await db.query(`DELETE FROM conversation_status WHERE participantA IN (${placeholders}) OR participantB IN (${placeholders})`, userParamsDouble);
  await db.query(`DELETE FROM user_privacy_settings WHERE userId IN (${placeholders})`, userParams);
  await db.query(`DELETE FROM user_blocks WHERE blockerId IN (${placeholders}) OR blockedUserId IN (${placeholders})`, userParamsDouble);
  await db.query(`DELETE FROM users WHERE id IN (${placeholders})`, userParams);
}

async function waitForMessagingTables(maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const result = await db.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('messages', 'conversation_status')`
      );
      const names = (result.rows || []).map((row) => row.name);
      if (names.includes('messages') && names.includes('conversation_status')) {
        return;
      }
    } catch {
      // keep retrying while bootstrapping
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Messaging tables did not become ready in time');
}

async function run() {
  await waitForMessagingTables();

  const coach = await createUser('Coach', 'coach');
  const player = await createUser('Player', 'player');
  const outsider = await createUser('Parent/Guardian', 'outsider');

  try {
    // 1) Non-participants cannot report a message
    const sendResponse = await request(app)
      .post('/api/messages')
      .set('Cookie', coach.authCookie)
      .send({
        recipientId: player.userId,
        subject: 'Test',
        message: 'Hello there',
        messageType: 'general'
      });

    assert.equal(sendResponse.status, 201);

    let messageId = Number(sendResponse.body.messageId || 0);
    if (!messageId) {
      const latestMessage = await db.query(
        `SELECT id FROM messages WHERE senderId = ? AND recipientId = ? ORDER BY createdAt DESC LIMIT 1`,
        [coach.userId, player.userId]
      );
      messageId = Number(latestMessage.rows?.[0]?.id || 0);
    }

    assert.ok(messageId, 'Expected send-message response to produce a message ID');
    const reportResponse = await request(app)
      .post(`/api/messages/${messageId}/report`)
      .set('Cookie', outsider.authCookie)
      .send({ reason: 'spam' });

    assert.ok([403, 404].includes(reportResponse.status), `Expected access denial, received ${reportResponse.status}`);
    if (reportResponse.status === 403) {
      assert.match(String(reportResponse.body.error || ''), /own conversations/i);
    }

    // 2) Recipient message preferences are enforced by sender role
    await db.query(
      `INSERT INTO user_privacy_settings (userId, allowsMessagesFromCoaches, allowsMessagesFromPlayers, allowsMessagesFromParents, useAnonymousName)
       VALUES (?, true, false, true, false)
       ON CONFLICT(userId) DO UPDATE
       SET allowsMessagesFromPlayers = false`,
      [coach.userId]
    );

    const blockedByPreferenceResponse = await request(app)
      .post('/api/messages')
      .set('Cookie', player.authCookie)
      .send({
        recipientId: coach.userId,
        subject: 'Intro',
        message: 'Can we talk?',
        messageType: 'general'
      });

    assert.equal(blockedByPreferenceResponse.status, 403);
    assert.match(String(blockedByPreferenceResponse.body.error || ''), /does not accept messages from players/i);

    // 3) Conversation status updates are participant-restricted and persisted
    const setupThreadResponse = await request(app)
      .post('/api/messages')
      .set('Cookie', coach.authCookie)
      .send({
        recipientId: player.userId,
        subject: 'Thread setup',
        message: 'Kickoff',
        messageType: 'general'
      });

    assert.equal(setupThreadResponse.status, 201);

    const conversationId = `${Math.min(coach.userId, player.userId)}_${Math.max(coach.userId, player.userId)}`;

    const outsiderUpdate = await request(app)
      .patch(`/api/conversations/${conversationId}/status`)
      .set('Cookie', outsider.authCookie)
      .send({ matchProgressStage: 'dialogue_active' });

    assert.ok([403, 404].includes(outsiderUpdate.status), `Expected access denial, received ${outsiderUpdate.status}`);

    const validUpdate = await request(app)
      .patch(`/api/conversations/${conversationId}/status`)
      .set('Cookie', coach.authCookie)
      .send({ matchProgressStage: 'dialogue_active' });

    assert.equal(validUpdate.status, 200);

    const statusRow = await db.query(
      `SELECT status FROM conversation_status WHERE participantA = ? AND participantB = ?`,
      [Math.min(coach.userId, player.userId), Math.max(coach.userId, player.userId)]
    );

    assert.ok(statusRow.rows.length > 0);
    assert.equal(statusRow.rows[0].status, 'dialogue_active');

    console.log('✅ messaging.integration.node.test.cjs passed');
  } finally {
    await cleanupUsers();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ messaging.integration.node.test.cjs failed');
    console.error(error);
    cleanupUsers().finally(() => process.exit(1));
  });
