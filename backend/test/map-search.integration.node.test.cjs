const assert = require('node:assert/strict');
const { createHash } = require('crypto');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const app = require('../server');
const DatabaseUtils = require('../db/database');
const db = new DatabaseUtils();

const createdUserIds = [];
const createdVacancyIds = [];
const createdAvailabilityIds = [];
const createdTeamIds = [];
const uniquePrefix = `map-test-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
let usersTableColumns = null;

const hashEmail = (email) => createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

async function createUser(role, prefix) {
  const email = `${prefix}-${uniquePrefix}@example.com`;

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
  const result = await db.query(`INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`, values);
  const userId = Number(result.lastID || 0);
  if (!userId) throw new Error('Failed to create test user');

  createdUserIds.push(userId);
  return userId;
}

async function waitForMapTables(maxAttempts = 40) {
  const needed = ['users', 'team_vacancies', 'player_availability', 'teams', 'team_members'];

  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const result = await db.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${needed.map(() => '?').join(',')})`,
        needed
      );
      const names = new Set((result.rows || []).map((row) => row.name));
      if (needed.every((name) => names.has(name))) return;
    } catch {
      // Retry while bootstrap is still running.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Map tables did not become ready in time');
}

async function cleanup() {
  if (createdTeamIds.length) {
    const placeholders = createdTeamIds.map(() => '?').join(',');
    await db.query(`DELETE FROM team_members WHERE teamId IN (${placeholders})`, createdTeamIds);
    await db.query(`DELETE FROM teams WHERE id IN (${placeholders})`, createdTeamIds);
  }

  if (createdVacancyIds.length) {
    const placeholders = createdVacancyIds.map(() => '?').join(',');
    await db.query(`DELETE FROM team_vacancies WHERE id IN (${placeholders})`, createdVacancyIds);
  }

  if (createdAvailabilityIds.length) {
    const placeholders = createdAvailabilityIds.map(() => '?').join(',');
    await db.query(`DELETE FROM player_availability WHERE id IN (${placeholders})`, createdAvailabilityIds);
  }

  if (createdUserIds.length) {
    const placeholders = createdUserIds.map(() => '?').join(',');
    await db.query(`DELETE FROM users WHERE id IN (${placeholders})`, createdUserIds);
  }
}

async function getTableColumns(tableName) {
  const schema = await db.query(`PRAGMA table_info(${tableName})`);
  return new Set((schema.rows || []).map((row) => String(row.name).toLowerCase()));
}

async function insertWithExistingColumns(tableName, valuesByColumn) {
  const existingColumns = await getTableColumns(tableName);
  const selectedEntries = Object.entries(valuesByColumn).filter(([column]) => existingColumns.has(column.toLowerCase()));

  if (selectedEntries.length === 0) {
    throw new Error(`No matching columns found for ${tableName}`);
  }

  const columns = selectedEntries.map(([column]) => column);
  const values = selectedEntries.map(([, value]) => value);
  const placeholders = columns.map(() => '?').join(', ');

  return db.query(
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
}

async function insertFixtureData() {
  const coachId = await createUser('Coach', 'mapcoach');
  const playerId = await createUser('Player', 'mapplayer');

  const inBoundsLocation = JSON.stringify({ address: 'London', latitude: 51.5, longitude: -0.1 });
  const outBoundsLocation = JSON.stringify({ address: 'Glasgow', latitude: 55.86, longitude: -4.25 });

  const vacancyInBounds = await insertWithExistingColumns('team_vacancies', {
    title: `${uniquePrefix}-vacancy-in`,
    description: '<script>alert(1)</script> keeper needed',
    league: `${uniquePrefix}-league-a`,
    ageGroup: 'U12',
    position: 'Defender',
    teamGender: 'Mixed',
    location: 'London',
    locationAddress: 'London',
    locationLatitude: 51.5,
    locationLongitude: -0.1,
    locationData: inBoundsLocation,
    contactInfo: 'private-phone-12345',
    postedBy: coachId,
    status: 'active'
  });
  createdVacancyIds.push(Number(vacancyInBounds.lastID));

  const vacancyOutBounds = await insertWithExistingColumns('team_vacancies', {
    title: `${uniquePrefix}-vacancy-out`,
    description: 'Out of view test vacancy',
    league: `${uniquePrefix}-league-a`,
    ageGroup: 'U14',
    position: 'Midfielder',
    teamGender: 'Mixed',
    location: 'Glasgow',
    locationAddress: 'Glasgow',
    locationLatitude: 55.86,
    locationLongitude: -4.25,
    locationData: outBoundsLocation,
    contactInfo: 'private-phone-54321',
    postedBy: coachId,
    status: 'active'
  });
  createdVacancyIds.push(Number(vacancyOutBounds.lastID));

  const availability = await insertWithExistingColumns('player_availability', {
    title: `${uniquePrefix}-player`,
    description: 'Goalkeeper looking for team',
    preferredLeagues: JSON.stringify([`${uniquePrefix}-league-a`, `${uniquePrefix}-league-b`]),
    ageGroup: 'U12',
    position: 'Goalkeeper',
    positions: JSON.stringify(['Goalkeeper']),
    preferredTeamGender: 'Mixed',
    locationAddress: 'London',
    locationLatitude: 51.5007,
    locationLongitude: -0.1246,
    locationPlaceId: `${uniquePrefix}-place`,
    contactInfo: 'private-player-contact',
    postedBy: playerId,
    status: 'active'
  });
  createdAvailabilityIds.push(Number(availability.lastID));

  const teamsSchema = await db.query('PRAGMA table_info(teams)');
  const teamColumns = new Set((teamsSchema.rows || []).map((row) => row.name.toLowerCase()));

  const hasMapColumns = teamColumns.has('showonteamlocationmap') && teamColumns.has('allowmapcontact');

  if (hasMapColumns) {
    const teamResult = await db.query(
      `INSERT INTO teams
        (teamName, clubName, ageGroup, league, teamGender, location, locationData, showOnTeamLocationMap, allowMapContact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `${uniquePrefix}-team-location`,
        `${uniquePrefix}-club`,
        'U12',
        `${uniquePrefix}-league-a`,
        'Mixed',
        'London',
        inBoundsLocation,
        true,
        true
      ]
    );

    const teamId = Number(teamResult.lastID);
    createdTeamIds.push(teamId);

    await db.query(
      `INSERT INTO team_members (teamId, userId, role, permissions)
       VALUES (?, ?, 'Head Coach', ?)`,
      [teamId, coachId, JSON.stringify({ canPostVacancies: true })]
    );
  }

  return {
    coachId,
    playerId,
    hasMapColumns
  };
}

async function run() {
  await waitForMapTables();
  const { hasMapColumns } = await insertFixtureData();

  try {
    const baseQuery =
      `/api/public/map-search?searchType=both&minLat=51.0&maxLat=52.0&minLng=-1.0&maxLng=0.5&limit=50&offset=0`;
    const baseResponse = await request(app).get(baseQuery);

    assert.equal(baseResponse.status, 200);
    assert.ok(Array.isArray(baseResponse.body.results));
    assert.ok(baseResponse.body.pagination);

    const resultTitles = baseResponse.body.results.map((item) => String(item.title || item.teamName || ''));
    assert.ok(resultTitles.some((title) => title.includes(`${uniquePrefix}-vacancy-in`)));
    assert.ok(resultTitles.some((title) => title.includes(`${uniquePrefix}-player`)));
    assert.ok(!resultTitles.some((title) => title.includes(`${uniquePrefix}-vacancy-out`)));

    if (hasMapColumns) {
      assert.ok(resultTitles.some((title) => title.includes(`${uniquePrefix}-team-location`)));
    }

    // Public map API should only expose map-safe fields.
    for (const result of baseResponse.body.results) {
      assert.equal(result.contactInfo, undefined);
      assert.equal(result.firstName, undefined);
      assert.equal(result.lastName, undefined);
      assert.equal(result.email, undefined);
      assert.equal(result.password, undefined);
    }

    const ageFilterResponse = await request(app).get(
      `/api/public/map-search?searchType=both&ageGroup=U12&minLat=51.0&maxLat=52.0&minLng=-1.0&maxLng=0.5&limit=50&offset=0`
    );

    assert.equal(ageFilterResponse.status, 200);
    assert.ok(
      ageFilterResponse.body.results.every((item) => String(item.ageGroup || '').toLowerCase().includes('u12')),
      'Expected all age-filtered map results to be in selected age group'
    );

    const positionFilterResponse = await request(app).get(
      `/api/public/map-search?searchType=players&positions=Goalkeeper&minLat=51.0&maxLat=52.0&minLng=-1.0&maxLng=0.5&limit=50&offset=0`
    );

    assert.equal(positionFilterResponse.status, 200);
    assert.ok(positionFilterResponse.body.results.length >= 1);
    assert.ok(
      positionFilterResponse.body.results.every((item) => item.itemType === 'player'),
      'Player search should only return player item types'
    );

    const leagueFilterResponse = await request(app).get(
      `/api/public/map-search?searchType=vacancies&league=${encodeURIComponent(`${uniquePrefix}-league-a`)}&minLat=51.0&maxLat=52.0&minLng=-1.0&maxLng=0.5&limit=50&offset=0`
    );

    assert.equal(leagueFilterResponse.status, 200);
    assert.ok(leagueFilterResponse.body.results.every((item) => item.itemType === 'vacancy'));
    assert.ok(
      leagueFilterResponse.body.results.every((item) => String(item.league || '').toLowerCase() === `${uniquePrefix}-league-a`.toLowerCase())
    );

    const paginationResponse = await request(app).get(
      `/api/public/map-search?searchType=both&minLat=51.0&maxLat=52.0&minLng=-1.0&maxLng=0.5&limit=1&offset=0`
    );

    assert.equal(paginationResponse.status, 200);
    assert.equal(paginationResponse.body.results.length, 1);
    assert.ok(Number(paginationResponse.body.pagination.total) >= 2);
    assert.equal(paginationResponse.body.pagination.limit, 1);
    assert.equal(paginationResponse.body.pagination.offset, 0);
    assert.equal(typeof paginationResponse.body.pagination.hasMore, 'boolean');

    console.log('✅ map-search.integration.node.test.cjs passed');
  } finally {
    await cleanup();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ map-search.integration.node.test.cjs failed');
    console.error(error);
    cleanup().finally(() => process.exit(1));
  });
