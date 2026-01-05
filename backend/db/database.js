const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();

class Database {
  constructor() {
    this.dbType = process.env.DB_TYPE || 'sqlite';
    this.pool = null;
    this.db = null;
    this.init();
  }

  init() {
    if (this.dbType === 'postgresql') {
      this.initPostgreSQL();
    } else {
      this.initSQLite();
    }
  }

  initPostgreSQL() {
    console.log('🐘 Initializing PostgreSQL connection...');
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'grassroots_hub',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('connect', () => {
      console.log('✅ Connected to PostgreSQL database');
    });

    this.pool.on('error', (err) => {
      console.error('❌ PostgreSQL connection error:', err);
    });
  }

  initSQLite() {
    console.log('📁 Initializing SQLite connection...');
    this.db = new sqlite3.Database('./database.sqlite', (err) => {
      if (err) {
        console.error('❌ Error opening SQLite database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
        // Enable WAL mode for better concurrency
        this.db.run('PRAGMA journal_mode = WAL;', (err) => {
          if (err) {
            console.error('Failed to enable WAL mode:', err);
          } else {
            console.log('✅ WAL mode enabled');
          }
        });
        // Set busy timeout to 5 seconds
        this.db.run('PRAGMA busy_timeout = 5000;', (err) => {
          if (err) {
            console.error('Failed to set busy timeout:', err);
          }
        });
      }
    });
  }

  async query(sql, params = []) {
    if (this.dbType === 'postgresql') {
      return this.queryPostgreSQL(sql, params);
    } else {
      return this.querySQLite(sql, params);
    }
  }

  async queryPostgreSQL(sql, params = []) {
    const client = await this.pool.connect();
    try {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      const pgSql = this.convertSQLiteToPostgreSQL(sql);
      const result = await client.query(pgSql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        lastID: result.rows[0]?.id || null
      };
    } catch (error) {
      console.error('PostgreSQL query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  querySQLite(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows, rowCount: rows.length });
          }
        });
      } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
          }
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ rows: [], rowCount: this.changes });
          }
        });
      }
    });
  }

  convertSQLiteToPostgreSQL(sql) {
    let pgSql = sql;
    let paramCount = 1;
    
    // Replace ? with $1, $2, etc.
    pgSql = pgSql.replace(/\?/g, () => `$${paramCount++}`);
    
    // Convert SQLite data types to PostgreSQL
    pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    pgSql = pgSql.replace(/TEXT/gi, 'VARCHAR');
    pgSql = pgSql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    pgSql = pgSql.replace(/BOOLEAN DEFAULT 0/gi, 'BOOLEAN DEFAULT FALSE');
    pgSql = pgSql.replace(/BOOLEAN DEFAULT 1/gi, 'BOOLEAN DEFAULT TRUE');
    
    return pgSql;
  }

  async close() {
    if (this.dbType === 'postgresql' && this.pool) {
      await this.pool.end();
      console.log('🔒 PostgreSQL connection pool closed');
    } else if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing SQLite database:', err.message);
        } else {
          console.log('🔒 SQLite database connection closed');
        }
      });
    }
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR NOT NULL,
        emailHash VARCHAR UNIQUE NOT NULL,
        password VARCHAR NOT NULL,
        firstName VARCHAR NOT NULL,
        lastName VARCHAR NOT NULL,
        role VARCHAR NOT NULL CHECK(role IN ('Coach', 'Player', 'Parent/Guardian', 'Admin')),
        isEmailVerified BOOLEAN DEFAULT FALSE,
        emailVerificationToken VARCHAR,
        emailVerificationExpires TIMESTAMP,
        passwordResetToken VARCHAR,
        passwordResetExpires TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER UNIQUE NOT NULL,
        phone VARCHAR,
        dateOfBirth DATE,
        location VARCHAR,
        bio VARCHAR,
        position VARCHAR,
        preferredTeamGender VARCHAR DEFAULT 'Mixed' CHECK(preferredTeamGender IN ('Boys', 'Girls', 'Mixed')),
        preferredFoot VARCHAR CHECK(preferredFoot IN ('Left', 'Right', 'Both')),
        height INTEGER,
        weight INTEGER,
        experienceLevel VARCHAR CHECK(experienceLevel IN ('Beginner', 'Intermediate', 'Advanced', 'Professional')),
        availability VARCHAR,
        coachingLicense VARCHAR,
        yearsExperience INTEGER,
        specializations VARCHAR,
        trainingLocation VARCHAR,
        matchLocation VARCHAR,
        trainingDays VARCHAR,
        ageGroupsCoached VARCHAR,
        emergencyContact VARCHAR,
        emergencyPhone VARCHAR,
        medicalInfo VARCHAR,
        profilePicture VARCHAR,
        isProfileComplete BOOLEAN DEFAULT FALSE,
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS leagues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR UNIQUE NOT NULL,
        region VARCHAR,
        ageGroup VARCHAR,
        country VARCHAR DEFAULT 'England',
        url VARCHAR,
        hits INTEGER DEFAULT 0,
        description VARCHAR,
        isActive BOOLEAN DEFAULT TRUE,
        createdBy INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS team_vacancies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR NOT NULL,
        description VARCHAR NOT NULL,
        league VARCHAR NOT NULL,
        ageGroup VARCHAR NOT NULL,
        position VARCHAR NOT NULL,
        teamGender VARCHAR NOT NULL DEFAULT 'Mixed' CHECK(teamGender IN ('Boys', 'Girls', 'Mixed')),
        location VARCHAR,
        locationData JSONB,
        contactInfo VARCHAR,
        postedBy INTEGER NOT NULL,
        hasMatchRecording BOOLEAN DEFAULT 0,
        hasPathwayToSenior BOOLEAN DEFAULT 0,
        status VARCHAR DEFAULT 'active' CHECK(status IN ('active', 'filled', 'expired')),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (postedBy) REFERENCES users (id)
      )`,
      
      // Migration: Add new columns if they don't exist
      `ALTER TABLE team_vacancies ADD COLUMN hasMatchRecording BOOLEAN DEFAULT 0`,
      `ALTER TABLE team_vacancies ADD COLUMN hasPathwayToSenior BOOLEAN DEFAULT 0`,

      `CREATE TABLE IF NOT EXISTS player_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR NOT NULL,
        description VARCHAR NOT NULL,
        preferredLeagues VARCHAR NOT NULL,
        ageGroup VARCHAR NOT NULL,
        positions VARCHAR NOT NULL,
        preferredTeamGender VARCHAR NOT NULL DEFAULT 'Mixed' CHECK(preferredTeamGender IN ('Boys', 'Girls', 'Mixed')),
        location VARCHAR,
        locationAddress VARCHAR,
        locationLatitude REAL,
        locationLongitude REAL,
        locationPlaceId VARCHAR,
        contactInfo VARCHAR,
        postedBy INTEGER NOT NULL,
        status VARCHAR DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (postedBy) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS email_alerts (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        email VARCHAR NOT NULL,
        alertType VARCHAR NOT NULL CHECK(alertType IN ('new_match', 'saved_search')),
        filters JSONB,
        searchRegion JSONB,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastTriggered TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR NOT NULL,
        description VARCHAR,
        eventType VARCHAR NOT NULL CHECK(eventType IN ('training', 'match', 'trial')),
        date DATE NOT NULL,
        startTime TIME NOT NULL,
        endTime TIME NOT NULL,
        location VARCHAR,
        locationData TEXT,
        latitude REAL,
        longitude REAL,
        createdBy INTEGER NOT NULL,
        teamId INTEGER,
        teamName VARCHAR,
        hasVacancies BOOLEAN DEFAULT FALSE,
        isRecurring BOOLEAN DEFAULT FALSE,
        recurringPattern VARCHAR,
        maxParticipants INTEGER,
        currentParticipants INTEGER DEFAULT 0,
        status VARCHAR DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled')),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS trial_invitations (
        id SERIAL PRIMARY KEY,
        eventId INTEGER NOT NULL,
        playerId INTEGER NOT NULL,
        invitedBy INTEGER NOT NULL,
        status VARCHAR DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
        message VARCHAR,
        responseDate TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES calendar_events (id) ON DELETE CASCADE,
        FOREIGN KEY (playerId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (invitedBy) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(eventId, playerId)
      )`,

      `CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        eventId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        role VARCHAR DEFAULT 'participant' CHECK(role IN ('participant', 'organizer', 'coach')),
        status VARCHAR DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'tentative', 'declined')),
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES calendar_events (id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(eventId, userId)
      )`,

      `CREATE TABLE IF NOT EXISTS team_rosters (
        id SERIAL PRIMARY KEY,
        coachId INTEGER NOT NULL,
        teamName VARCHAR NOT NULL,
        clubName VARCHAR,
        ageGroup VARCHAR NOT NULL,
        league VARCHAR NOT NULL,
        teamGender VARCHAR NOT NULL DEFAULT 'Mixed' CHECK(teamGender IN ('Boys', 'Girls', 'Mixed')),
        maxSquadSize INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS team_players (
        id SERIAL PRIMARY KEY,
        teamId INTEGER NOT NULL,
        playerName VARCHAR NOT NULL,
        bestPosition VARCHAR NOT NULL,
        alternativePositions JSONB,
        preferredFoot VARCHAR CHECK(preferredFoot IN ('Left', 'Right', 'Both')),
        age INTEGER,
        contactInfo VARCHAR,
        notes VARCHAR,
        isActive BOOLEAN DEFAULT TRUE,
        addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teamId) REFERENCES team_rosters (id) ON DELETE CASCADE
      )`,

      // Team Profiles table for additional team information
      `CREATE TABLE IF NOT EXISTS team_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coachId INTEGER NOT NULL,
        teamName VARCHAR NOT NULL,
        clubName VARCHAR,
        establishedYear INTEGER,
        teamDescription TEXT,
        teamLogo VARCHAR,
        homeGroundName VARCHAR,
        homeGroundAddress VARCHAR,
        trainingSchedule TEXT,
        
        -- Social & Community Features
        hasRegularSocialEvents BOOLEAN DEFAULT FALSE,
        socialEventsDescription TEXT,
        welcomesParentInvolvement BOOLEAN DEFAULT TRUE,
        parentInvolvementDetails TEXT,
        
        -- Development & Pathways
        attendsSummerTournaments BOOLEAN DEFAULT FALSE,
        tournamentDetails TEXT,
        hasPathwayProgram BOOLEAN DEFAULT FALSE,
        pathwayDescription TEXT,
        linkedAdultTeam VARCHAR,
        academyAffiliation VARCHAR,
        
        -- Training & Coaching
        coachingPhilosophy TEXT,
        trainingFocus VARCHAR,
        developmentAreas TEXT,
        coachingStaff TEXT,
        
        -- Additional Information
        teamAchievements TEXT,
        specialRequirements TEXT,
        equipmentProvided TEXT,
        seasonalFees TEXT,
        contactPreferences TEXT,
        
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE CASCADE
      )`,
      
      // Playing History table
      `CREATE TABLE IF NOT EXISTS playing_history (
        id VARCHAR PRIMARY KEY,
        playerId VARCHAR NOT NULL,
        teamName VARCHAR NOT NULL,
        league VARCHAR NOT NULL,
        ageGroup VARCHAR NOT NULL,
        position VARCHAR NOT NULL,
        season VARCHAR NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE,
        isCurrentTeam BOOLEAN DEFAULT FALSE,
        achievements TEXT,
        matchesPlayed INTEGER,
        goalsScored INTEGER,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playerId) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Children table for Parent/Guardian accounts
      `CREATE TABLE IF NOT EXISTS children (
        id SERIAL PRIMARY KEY,
        parentId INTEGER NOT NULL,
        firstName VARCHAR NOT NULL,
        lastName VARCHAR NOT NULL,
        dateOfBirth DATE NOT NULL,
        gender VARCHAR CHECK(gender IN ('Male', 'Female', 'Other')),
        preferredPosition VARCHAR,
        preferredTeamGender VARCHAR DEFAULT 'Mixed' CHECK(preferredTeamGender IN ('Boys', 'Girls', 'Mixed')),
        medicalInfo TEXT,
        emergencyContact VARCHAR,
        emergencyPhone VARCHAR,
        schoolName VARCHAR,
        profilePicture VARCHAR,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parentId) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Child Player Availability - allows parents to post availability on behalf of children
      `CREATE TABLE IF NOT EXISTS child_player_availability (
        id SERIAL PRIMARY KEY,
        childId INTEGER NOT NULL,
        parentId INTEGER NOT NULL,
        title VARCHAR NOT NULL,
        description TEXT,
        preferredLeagues TEXT, -- JSON string array
        ageGroup VARCHAR NOT NULL,
        positions TEXT, -- JSON string array
        preferredTeamGender VARCHAR NOT NULL DEFAULT 'Mixed' CHECK(preferredTeamGender IN ('Boys', 'Girls', 'Mixed')),
        location VARCHAR,
        locationData TEXT, -- JSON object with address, lat, lng, placeId
        contactInfo VARCHAR,
        availability VARCHAR, -- JSON object with days/times
        status VARCHAR DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'paused')),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (childId) REFERENCES children (id) ON DELETE CASCADE,
        FOREIGN KEY (parentId) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Match Completions table - tracks successful connections between teams and players
      `CREATE TABLE IF NOT EXISTS match_completions (
        id SERIAL PRIMARY KEY,
        vacancyId INTEGER,
        availabilityId INTEGER,
        childAvailabilityId INTEGER,
        coachId INTEGER NOT NULL,
        playerId INTEGER,
        parentId INTEGER,
        matchType VARCHAR NOT NULL CHECK(matchType IN ('player_to_team', 'child_to_team')),
        playerName VARCHAR NOT NULL,
        teamName VARCHAR NOT NULL,
        position VARCHAR NOT NULL,
        ageGroup VARCHAR NOT NULL,
        league VARCHAR NOT NULL,
        startDate DATE,
        completionStatus VARCHAR NOT NULL DEFAULT 'pending' CHECK(completionStatus IN ('pending', 'confirmed', 'declined')),
        coachConfirmed BOOLEAN DEFAULT FALSE,
        playerConfirmed BOOLEAN DEFAULT FALSE,
        parentConfirmed BOOLEAN DEFAULT FALSE,
        successStory TEXT,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        feedback TEXT,
        publicStory BOOLEAN DEFAULT FALSE,
        completedAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vacancyId) REFERENCES team_vacancies (id) ON DELETE SET NULL,
        FOREIGN KEY (availabilityId) REFERENCES player_availability (id) ON DELETE SET NULL,
        FOREIGN KEY (childAvailabilityId) REFERENCES child_player_availability (id) ON DELETE SET NULL,
        FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (playerId) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (parentId) REFERENCES users (id) ON DELETE SET NULL
      )`,

      // Analytics tables for admin dashboard
      `CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        sessionId VARCHAR,
        userId INTEGER,
        page VARCHAR NOT NULL,
        userAgent TEXT,
        ipAddress VARCHAR,
        referrer TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS daily_stats (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        unique_visitors INTEGER DEFAULT 0,
        page_views INTEGER DEFAULT 0,
        new_users INTEGER DEFAULT 0,
        new_teams INTEGER DEFAULT 0,
        new_player_availability INTEGER DEFAULT 0,
        new_team_vacancies INTEGER DEFAULT 0,
        match_completions INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        sessionId VARCHAR UNIQUE NOT NULL,
        userId INTEGER,
        ipAddress VARCHAR,
        userAgent TEXT,
        startTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastActivity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        isActive BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL
      )`,

      // Messages table for internal communication
      `CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        senderId INTEGER NOT NULL,
        recipientId INTEGER NOT NULL,
        subject VARCHAR NOT NULL,
        message TEXT NOT NULL,
        messageType VARCHAR DEFAULT 'general' CHECK(messageType IN ('general', 'vacancy_interest', 'player_inquiry', 'system')),
        relatedVacancyId INTEGER,
        relatedPlayerAvailabilityId INTEGER,
        isRead BOOLEAN DEFAULT FALSE,
        readAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (recipientId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (relatedVacancyId) REFERENCES team_vacancies (id) ON DELETE SET NULL,
        FOREIGN KEY (relatedPlayerAvailabilityId) REFERENCES player_availability (id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS training_invitations (
        id SERIAL PRIMARY KEY,
        coachId INTEGER NOT NULL,
        playerId INTEGER NOT NULL,
        teamName VARCHAR NOT NULL,
        trainingLocation VARCHAR NOT NULL,
        trainingDate DATE NOT NULL,
        trainingTime TIME NOT NULL,
        message VARCHAR,
        status VARCHAR DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'expired')),
        responseMessage VARCHAR,
        responseDate TIMESTAMP,
        expiresAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (playerId) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(coachId, playerId, trainingDate, trainingTime)
      )`,

      `CREATE TABLE IF NOT EXISTS trial_lists (
        id SERIAL PRIMARY KEY,
        coachId INTEGER NOT NULL,
        title VARCHAR NOT NULL,
        description VARCHAR,
        trialDate DATE,
        trialTime TIME,
        location VARCHAR,
        status VARCHAR DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
        maxPlayers INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS trial_evaluations (
        id SERIAL PRIMARY KEY,
        trialListId INTEGER NOT NULL,
        playerId INTEGER NOT NULL,
        coachId INTEGER NOT NULL,
        playerName VARCHAR NOT NULL,
        playerAge INTEGER,
        playerPosition VARCHAR,
        ranking INTEGER DEFAULT 0,
        overallRating INTEGER CHECK(overallRating >= 1 AND overallRating <= 10),
        technicalSkills INTEGER CHECK(technicalSkills >= 1 AND technicalSkills <= 10),
        physicalAttributes INTEGER CHECK(physicalAttributes >= 1 AND physicalAttributes <= 10),
        mentalStrength INTEGER CHECK(mentalStrength >= 1 AND mentalStrength <= 10),
        teamwork INTEGER CHECK(teamwork >= 1 AND teamwork <= 10),
        privateNotes TEXT,
        strengths VARCHAR,
        areasForImprovement VARCHAR,
        recommendedForTeam BOOLEAN DEFAULT FALSE,
        status VARCHAR DEFAULT 'evaluating' CHECK(status IN ('evaluating', 'approved', 'rejected', 'pending')),
        evaluatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trialListId) REFERENCES trial_lists (id) ON DELETE CASCADE,
        FOREIGN KEY (playerId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(trialListId, playerId)
      )`,

      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        type VARCHAR NOT NULL CHECK(type IN ('trial_invitation', 'invitation_accepted', 'invitation_declined', 'event_reminder', 'message', 'match_completion', 'team_invite')),
        title VARCHAR NOT NULL,
        message TEXT NOT NULL,
        relatedId INTEGER,
        relatedType VARCHAR,
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )`
    ];

    for (const table of tables) {
      try {
        await this.query(table);
        console.log('✅ Table created/verified');
      } catch (error) {
        console.error('❌ Error creating table:', error);
        throw error;
      }
    }

    // Run database migrations for existing tables
    await this.runMigrations();

    // Create indexes for better performance
    await this.createIndexes();
  }

  async runMigrations() {
    try {
      // Migration 1: Add maxSquadSize column to team_rosters table if it doesn't exist
      const checkColumn = this.dbType === 'postgresql' 
        ? `SELECT column_name FROM information_schema.columns WHERE table_name = 'team_rosters' AND column_name = 'maxsquadsize'`
        : `PRAGMA table_info(team_rosters)`;
        
      const result = await this.query(checkColumn);
      
      if (this.dbType === 'postgresql') {
        if (result.rows.length === 0) {
          await this.query('ALTER TABLE team_rosters ADD COLUMN maxSquadSize INTEGER');
          console.log('✅ Added maxSquadSize column to team_rosters table');
        }
      } else {
        // For SQLite, check if the column exists in the pragma result
        const hasMaxSquadSize = result.rows.some(row => row.name === 'maxSquadSize');
        if (!hasMaxSquadSize) {
          await this.query('ALTER TABLE team_rosters ADD COLUMN maxSquadSize INTEGER');
          console.log('✅ Added maxSquadSize column to team_rosters table');
        }
      }
    } catch (error) {
      console.warn('Migration warning:', error.message);
    }
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_team_vacancies_location ON team_vacancies USING GIN(locationData)',
      'CREATE INDEX IF NOT EXISTS idx_player_availability_location ON player_availability USING GIN(locationData)',
      'CREATE INDEX IF NOT EXISTS idx_email_alerts_user ON email_alerts(userId)',
      'CREATE INDEX IF NOT EXISTS idx_email_alerts_active ON email_alerts(isActive)',
      'CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date)',
      'CREATE INDEX IF NOT EXISTS idx_trial_invitations_player ON trial_invitations(playerId)',
      'CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(eventId)',
      'CREATE INDEX IF NOT EXISTS idx_team_rosters_coach ON team_rosters(coachId)',
      'CREATE INDEX IF NOT EXISTS idx_team_players_team ON team_players(teamId)',
      'CREATE INDEX IF NOT EXISTS idx_team_players_position ON team_players(bestPosition)',
      'CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipientId)',
      'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId)',
      'CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(createdAt)',
      'CREATE INDEX IF NOT EXISTS idx_training_invitations_coach ON training_invitations(coachId)',
      'CREATE INDEX IF NOT EXISTS idx_training_invitations_player ON training_invitations(playerId)',
      'CREATE INDEX IF NOT EXISTS idx_training_invitations_status ON training_invitations(status)',
      'CREATE INDEX IF NOT EXISTS idx_training_invitations_date ON training_invitations(trainingDate)',
      'CREATE INDEX IF NOT EXISTS idx_trial_lists_coach ON trial_lists(coachId)',
      'CREATE INDEX IF NOT EXISTS idx_trial_lists_status ON trial_lists(status)',
      'CREATE INDEX IF NOT EXISTS idx_trial_lists_date ON trial_lists(trialDate)',
      'CREATE INDEX IF NOT EXISTS idx_trial_evaluations_list ON trial_evaluations(trialListId)',
      'CREATE INDEX IF NOT EXISTS idx_trial_evaluations_player ON trial_evaluations(playerId)',
      'CREATE INDEX IF NOT EXISTS idx_trial_evaluations_coach ON trial_evaluations(coachId)',
      'CREATE INDEX IF NOT EXISTS idx_trial_evaluations_ranking ON trial_evaluations(ranking)',
      'CREATE INDEX IF NOT EXISTS idx_trial_evaluations_rating ON trial_evaluations(overallRating)',
    ];

    for (const index of indexes) {
      try {
        // Skip index creation for SQLite (not as critical)
        if (this.dbType === 'postgresql') {
          await this.query(index);
        }
      } catch (error) {
        // Indexes might already exist, which is fine
        if (!error.message.includes('already exists')) {
          console.warn('Warning creating index:', error.message);
        }
      }
    }
  }
}

module.exports = Database;
