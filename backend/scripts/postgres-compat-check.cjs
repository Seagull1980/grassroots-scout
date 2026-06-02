#!/usr/bin/env node

const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Missing DATABASE_URL environment variable.');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  // Hosted Postgres providers typically require SSL.
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
});

const checks = [
  {
    name: 'conversations aggregate query',
    sql: `
      EXPLAIN
      SELECT
        CASE
          WHEN m1.senderId = $1 THEN m1.recipientId
          ELSE m1.senderId
        END as otherUserId,
        MAX(m1.createdAt) as lastMessageTime,
        COUNT(CASE WHEN m1.recipientId = $2 AND m1.isRead = false THEN 1 END) as unreadCount
      FROM messages m1
      WHERE m1.senderId = $3 OR m1.recipientId = $4
      GROUP BY 1
      ORDER BY lastMessageTime DESC
    `,
    values: [1, 1, 1, 1]
  },
  {
    name: 'weekly digest preference query',
    sql: `
      EXPLAIN
      SELECT u.id, u.email, u.firstName, u.role
      FROM users u
      LEFT JOIN user_alert_preferences uap ON u.id = uap.userId
      WHERE (uap.emailNotifications IS NULL OR uap.emailNotifications = TRUE)
        AND (uap.weeklyDigest IS NULL OR uap.weeklyDigest = TRUE)
    `,
    values: []
  },
  {
    name: 're-engagement candidate query',
    sql: `
      EXPLAIN
      SELECT DISTINCT u.id, u.email, u.firstName, u.role
      FROM users u
      JOIN user_alert_preferences uap ON u.id = uap.userId
      LEFT JOIN page_views pv ON u.id = pv.userId AND pv.timestamp > NOW() - INTERVAL '10 days'
      WHERE uap.emailNotifications = TRUE
        AND pv.userId IS NULL
        AND u.createdAt < NOW() - INTERVAL '7 days'
    `,
    values: []
  }
];

(async () => {
  try {
    await client.connect();

    for (const check of checks) {
      await client.query(check.sql, check.values);
      console.log(`PASS: ${check.name}`);
    }

    console.log('Postgres compatibility checks passed.');
    process.exit(0);
  } catch (error) {
    console.error('Postgres compatibility check failed.');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
