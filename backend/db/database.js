const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();

// Singleton instance
let instance = null;

class Database {
  constructor() {
    // Implement singleton pattern to prevent multiple instances
    if (instance) {
      return instance;
    }
    
    this.dbType = process.env.DB_TYPE || 'sqlite';
    this.pool = null;
    this.db = null;
    try {
      this.init();
    } catch (error) {
      console.error('❌ Database initialization failed, but continuing:', error.message);
      // Don't throw - allow the server to start even without database
      this.dbType = 'none';
    }
    
    instance = this;
  }

  init() {
    try {
      if (this.dbType === 'postgresql') {
        this.initPostgreSQL();
      } else {
        this.initSQLite();
      }
    } catch (error) {
      console.error('❌ CRITICAL: Database initialization failed:', error);
      console.error('Falling back to SQLite...');
      // Fallback to SQLite if PostgreSQL fails
      this.dbType = 'sqlite';
      try {
        this.initSQLite();
      } catch (sqliteError) {
        console.error('❌ CRITICAL: SQLite fallback also failed:', sqliteError);
        throw sqliteError;
      }
    }
  }

  initPostgreSQL() {
    console.log('🐘 Initializing PostgreSQL connection...');
    
    // Use DATABASE_URL if available (Render, Heroku, etc.), otherwise use individual env vars
    const config = process.env.DATABASE_URL 
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        }
      : {
          user: process.env.DB_USER || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'grassroots_hub',
          password: process.env.DB_PASSWORD || 'password',
          port: process.env.DB_PORT || 5432,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };
    
    this.pool = new Pool(config);

    this.pool.on('connect', () => {
      console.log('✅ Connected to PostgreSQL database');
    });

    this.pool.on('error', (err) => {
      console.error('❌ PostgreSQL connection error:', err);
    });
  }

  initSQLite() {
    console.log('📁 Initializing SQLite connection...');
    console.log('Current working directory:', process.cwd());
    // Use absolute path based on current working directory
    const dbPath = process.env.RAILWAY_ENVIRONMENT ? `${process.cwd()}/database.sqlite` : './database.sqlite';
    console.log('Database path:', dbPath);
    this.db = new sqlite3.Database(dbPath, (err) => {
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
    if (this.dbType === 'none') {
      throw new Error('Database not available');
    }
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
    // Silently close without spamming logs
    if (this.dbType === 'postgresql' && this.pool) {
      try {
        await this.pool.end();
      } catch (err) {
        // Ignore errors on close
      }
    } else if (this.db) {
      this.db.close((err) => {
        // Silently ignore close errors
      });
    }
  }

  async createTables() {
    try {
      // Skip table creation if database is not available
      if (this.dbType === 'none') {
        console.log('⚠️  Skipping table creation - database not available');
        return;
      }
      const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR NOT NULL,
        emailHash VARCHAR UNIQUE NOT NULL,
        password VARCHAR NOT NULL,
        firstName VARCHAR NOT NULL,
        lastName VARCHAR NOT NULL,
        role VARCHAR NOT NULL CHECK(role IN ('Coach', 'Player', 'Parent/Guardian', 'Admin')),
        betaAccess BOOLEAN DEFAULT FALSE,
        isBlocked BOOLEAN DEFAULT FALSE,
        isDeleted BOOLEAN DEFAULT FALSE,
        isEmailVerified BOOLEAN DEFAULT FALSE,
        emailVerificationToken VARCHAR,
        emailVerificationExpires TIMESTAMP,
        passwordResetToken VARCHAR,
        passwordResetExpires TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
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
        id SERIAL PRIMARY KEY,
        name VARCHAR UNIQUE NOT NULL,
        region VARCHAR,
        country VARCHAR DEFAULT 'England',
        url VARCHAR,
        hits INTEGER DEFAULT 0,
        description VARCHAR,
        isActive BOOLEAN DEFAULT TRUE,
        createdBy INTEGER NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS league_requests (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        region VARCHAR,
        url VARCHAR,
        description TEXT,
        contactName VARCHAR,
        contactEmail VARCHAR,
        contactPhone VARCHAR,
        status VARCHAR DEFAULT 'pending',
        submittedBy INTEGER NOT NULL,
        reviewedBy INTEGER,
        reviewedAt TIMESTAMP,
        reviewNotes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submittedBy) REFERENCES users (id),
        FOREIGN KEY (reviewedBy) REFERENCES users (id),
        CHECK (status IN ('pending', 'approved', 'rejected'))
      )`,

      `CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        teamName VARCHAR NOT NULL,
        clubName VARCHAR,
        ageGroup VARCHAR NOT NULL,
        league VARCHAR NOT NULL,
        teamGender VARCHAR NOT NULL DEFAULT 'Mixed',
        playingTimePolicy VARCHAR,
        location VARCHAR,
        locationData JSONB,
        contactEmail VARCHAR,
        website VARCHAR,
        socialMedia JSONB,
        teamBio TEXT,
        trainingLocation VARCHAR,
        homePitchLocation VARCHAR,
        honours TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS team_vacancies (
        id SERIAL PRIMARY KEY,
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
        teamId INTEGER,
        hasMatchRecording BOOLEAN DEFAULT FALSE,
        hasPathwayToSenior BOOLEAN DEFAULT FALSE,
        status VARCHAR DEFAULT 'active' CHECK(status IN ('active', 'filled', 'expired')),
        isFrozen BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (postedBy) REFERENCES users (id),
        FOREIGN KEY (teamId) REFERENCES teams (id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS player_availability (
        id SERIAL PRIMARY KEY,
        title VARCHAR NOT NULL,
        description VARCHAR NOT NULL,
        preferredLeagues TEXT, -- Changed to TEXT and nullable to support JSON array
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
        isFrozen BOOLEAN DEFAULT FALSE,
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

      `CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        teamId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        role VARCHAR NOT NULL DEFAULT 'Coach' CHECK(role IN ('Head Coach', 'Assistant Coach', 'Youth Coach', 'Goalkeeper Coach', 'Fitness Coach')),
        permissions JSONB DEFAULT '{"canPostVacancies": true, "canManageRoster": true, "canEditTeam": false, "canDeleteTeam": false}',
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teamId) REFERENCES teams (id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(teamId, userId)
      )`,

      `CREATE TABLE IF NOT EXISTS team_invitations (
        id SERIAL PRIMARY KEY,
        teamId INTEGER NOT NULL,
        invitedUserId INTEGER NOT NULL,
        invitedByUserId INTEGER NOT NULL,
        invitedEmail VARCHAR NOT NULL,
        role VARCHAR NOT NULL DEFAULT 'Assistant Coach' CHECK(role IN ('Head Coach', 'Assistant Coach', 'Youth Coach', 'Goalkeeper Coach', 'Fitness Coach')),
        status VARCHAR NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
        invitationToken VARCHAR UNIQUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiresAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
        respondedAt TIMESTAMP,
        FOREIGN KEY (teamId) REFERENCES teams (id) ON DELETE CASCADE,
        FOREIGN KEY (invitedUserId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (invitedByUserId) REFERENCES users (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS team_rosters (
        id SERIAL PRIMARY KEY,
        teamId INTEGER NOT NULL,
        maxSquadSize INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teamId) REFERENCES teams (id) ON DELETE CASCADE
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
        id SERIAL PRIMARY KEY,
        playerId INTEGER NOT NULL,
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

      // User submitted success stories (admin approval)
      `CREATE TABLE IF NOT EXISTS success_story_submissions (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        displayName VARCHAR,
        isAnonymous BOOLEAN DEFAULT FALSE,
        role VARCHAR,
        teamName VARCHAR,
        position VARCHAR,
        ageGroup VARCHAR,
        league VARCHAR,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        story TEXT NOT NULL,
        status VARCHAR DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        adminNotes TEXT,
        approvedBy INTEGER,
        approvedAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (approvedBy) REFERENCES users (id) ON DELETE SET NULL
      )`,

      // Family Relationships - tracks family connections between users
      `CREATE TABLE IF NOT EXISTS family_relationships (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        relatedUserId INTEGER,
        childId INTEGER,
        relationship VARCHAR NOT NULL CHECK(relationship IN ('parent', 'child', 'sibling', 'guardian')),
        verifiedBy INTEGER,
        verifiedAt TIMESTAMP,
        notes TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (relatedUserId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (childId) REFERENCES children (id) ON DELETE CASCADE,
        FOREIGN KEY (verifiedBy) REFERENCES users (id) ON DELETE SET NULL,
        CHECK ((relatedUserId IS NOT NULL AND childId IS NULL) OR (relatedUserId IS NULL AND childId IS NOT NULL))
      )`,

      // Coach Children - junction table for coaches with children, tracks team relationships
      `CREATE TABLE IF NOT EXISTS coach_children (
        id SERIAL PRIMARY KEY,
        coachId INTEGER NOT NULL,
        childId INTEGER NOT NULL,
        relationshipType VARCHAR NOT NULL DEFAULT 'parent' CHECK(relationshipType IN ('parent', 'guardian', 'step_parent')),
        relationshipVerified BOOLEAN DEFAULT FALSE,
        inSameTeam BOOLEAN DEFAULT FALSE,
        teamId INTEGER,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(coachId, childId),
        FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (childId) REFERENCES children (id) ON DELETE CASCADE,
        FOREIGN KEY (teamId) REFERENCES teams (id) ON DELETE SET NULL
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
      )`,

      // Forum tables
      `CREATE TABLE IF NOT EXISTS forum_posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_role VARCHAR NOT NULL,
        author_name VARCHAR NOT NULL,
        title VARCHAR NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR DEFAULT 'General Discussions',
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS forum_replies (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        parent_reply_id INTEGER,
        user_id INTEGER NOT NULL,
        user_role VARCHAR NOT NULL,
        author_name VARCHAR NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (post_id) REFERENCES forum_posts (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_reply_id) REFERENCES forum_replies (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS content_flags (
        id SERIAL PRIMARY KEY,
        content_type VARCHAR NOT NULL CHECK(content_type IN ('post', 'reply')),
        content_id INTEGER NOT NULL,
        flagged_by_user_id INTEGER NOT NULL,
        flagged_by_name VARCHAR NOT NULL,
        reason TEXT,
        status VARCHAR DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'dismissed')),
        reviewed_by_user_id INTEGER,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (flagged_by_user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        event VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        label VARCHAR(255),
        value INTEGER,
        user_id INTEGER,
        session_id VARCHAR(100) NOT NULL,
        timestamp BIGINT NOT NULL,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        user_id INTEGER,
        start_time BIGINT NOT NULL,
        end_time BIGINT,
        duration INTEGER,
        page_views INTEGER DEFAULT 0,
        events_count INTEGER DEFAULT 0,
        device_type VARCHAR(50),
        browser VARCHAR(50),
        operating_system VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer VARCHAR(500),
        landing_page VARCHAR(500),
        exit_page VARCHAR(500),
        bounced BOOLEAN DEFAULT FALSE,
        converted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`
    ];

    // TEMPORARY: Drop playing_history table if it has wrong schema (VARCHAR instead of INTEGER)
    if (this.dbType === 'postgresql') {
      try {
        await this.query('DROP TABLE IF EXISTS playing_history CASCADE');
        console.log('🔄 Dropped playing_history table for schema migration');
      } catch (error) {
        console.warn('⚠️  Could not drop playing_history:', error.message);
      }
    }

    for (const table of tables) {
      try {
        console.log('🔄 Creating table:', table.substring(13, 50) + '...');
        await this.query(table);
        console.log('✅ Table created/verified');
      } catch (error) {
        console.error('❌ Error creating table:', error.message);
        console.error('❌ Table SQL:', table.substring(0, 100) + '...');
        // Don't throw - continue with other tables
        console.log('⚠️  Continuing with next table...');
      }
    }

    // Run database migrations for existing tables
    await this.runMigrations();

    // Create indexes for better performance
    await this.createIndexes();
    } catch (error) {
      console.error('❌ CRITICAL: Table creation failed:', error);
      console.error('Server will continue with existing tables...');
      // Don't throw - allow server to start even if table creation fails
    }
  }

  async runMigrations() {
    try {
      // Migration 0: Add emailHash column to users table if it doesn't exist
      const checkEmailHashColumn = this.dbType === 'postgresql' 
        ? `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'emailhash'`
        : `PRAGMA table_info(users)`;
        
      const emailHashResult = await this.query(checkEmailHashColumn);
      
      if (this.dbType === 'postgresql') {
        if (emailHashResult.rows.length === 0) {
          await this.query('ALTER TABLE users ADD COLUMN emailHash VARCHAR UNIQUE');
          console.log('✅ Added emailHash column to users table');
        }
      } else {
        // For SQLite, check if the column exists in the pragma result
        const hasEmailHash = emailHashResult.rows.some(row => row.name === 'emailHash');
        if (!hasEmailHash) {
          try {
            // SQLite doesn't allow adding UNIQUE columns - add column first, then index
            await this.query('ALTER TABLE users ADD COLUMN emailHash VARCHAR');
            await this.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_emailhash ON users(emailHash)');
            console.log('✅ Added emailHash column to users table');
          } catch (err) {
            // Column might already exist, ignore duplicate column error
            if (!err.message.includes('duplicate column')) {
              throw err;
            }
          }
        }
      }

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
          try {
            await this.query('ALTER TABLE team_rosters ADD COLUMN maxSquadSize INTEGER');
            console.log('✅ Added maxSquadSize column to team_rosters table');
          } catch (err) {
            // Column might already exist, ignore duplicate column error
            if (!err.message.includes('duplicate column')) {
              throw err;
            }
          }
        }
      }

      // Migration 2: Add hasMatchRecording and hasPathwayToSenior to team_vacancies
      const checkVacancyColumns = this.dbType === 'postgresql'
        ? `SELECT column_name FROM information_schema.columns WHERE table_name = 'team_vacancies'`
        : `PRAGMA table_info(team_vacancies)`;
      
      const vacancyResult = await this.query(checkVacancyColumns);
      
      if (this.dbType === 'postgresql') {
        const columnNames = vacancyResult.rows.map(row => row.column_name);
        if (!columnNames.includes('hasmatchrecording')) {
          await this.query('ALTER TABLE team_vacancies ADD COLUMN hasMatchRecording BOOLEAN DEFAULT 0');
          console.log('✅ Added hasMatchRecording column to team_vacancies table');
        }
        if (!columnNames.includes('haspathwaytosenior')) {
          await this.query('ALTER TABLE team_vacancies ADD COLUMN hasPathwayToSenior BOOLEAN DEFAULT 0');
          console.log('✅ Added hasPathwayToSenior column to team_vacancies table');
        }
      } else {
        const hasMatchRecording = vacancyResult.rows.some(row => row.name === 'hasMatchRecording');
        const hasPathwayToSenior = vacancyResult.rows.some(row => row.name === 'hasPathwayToSenior');
        
        if (!hasMatchRecording) {
          try {
            await this.query('ALTER TABLE team_vacancies ADD COLUMN hasMatchRecording BOOLEAN DEFAULT 0');
            console.log('✅ Added hasMatchRecording column to team_vacancies table');
          } catch (err) {
            if (!err.message.includes('duplicate column')) throw err;
          }
        }
        if (!hasPathwayToSenior) {
          try {
            await this.query('ALTER TABLE team_vacancies ADD COLUMN hasPathwayToSenior BOOLEAN DEFAULT 0');
            console.log('✅ Added hasPathwayToSenior column to team_vacancies table');
          } catch (err) {
            if (!err.message.includes('duplicate column')) throw err;
          }
        }
      }

      // Migration 3: Add playingTimePolicy column to teams table if it doesn't exist
      const checkTeamsColumns = this.dbType === 'postgresql'
        ? `SELECT column_name FROM information_schema.columns WHERE table_name = 'teams'`
        : `PRAGMA table_info(teams)`;

      const teamsColumnsResult = await this.query(checkTeamsColumns);

      if (this.dbType === 'postgresql') {
        const columnNames = teamsColumnsResult.rows.map(row => row.column_name);
        if (!columnNames.includes('playingtimepolicy')) {
          await this.query('ALTER TABLE teams ADD COLUMN playingTimePolicy VARCHAR');
          console.log('✅ Added playingTimePolicy column to teams table');
        }
      } else {
        const hasPlayingTimePolicy = teamsColumnsResult.rows.some(row => row.name === 'playingTimePolicy');
        if (!hasPlayingTimePolicy) {
          try {
            await this.query('ALTER TABLE teams ADD COLUMN playingTimePolicy VARCHAR');
            console.log('✅ Added playingTimePolicy column to teams table');
          } catch (err) {
            if (!err.message.includes('duplicate column')) throw err;
          }
        }
      }

      // Migration 3b: Add team bio fields to teams table if they don't exist
      const teamBioColumns = [
        { name: 'teamBio', type: 'TEXT' },
        { name: 'trainingLocation', type: 'VARCHAR' },
        { name: 'homePitchLocation', type: 'VARCHAR' },
        { name: 'honours', type: 'TEXT' }
      ];

      if (this.dbType === 'postgresql') {
        const columnNames = teamsColumnsResult.rows.map(row => row.column_name.toLowerCase());
        for (const column of teamBioColumns) {
          if (!columnNames.includes(column.name.toLowerCase())) {
            await this.query(`ALTER TABLE teams ADD COLUMN ${column.name} ${column.type}`);
            console.log(`✅ Added ${column.name} column to teams table`);
          }
        }
      } else {
        for (const column of teamBioColumns) {
          const hasColumn = teamsColumnsResult.rows.some(row => row.name === column.name);
          if (!hasColumn) {
            try {
              await this.query(`ALTER TABLE teams ADD COLUMN ${column.name} ${column.type}`);
              console.log(`✅ Added ${column.name} column to teams table`);
            } catch (err) {
              if (!err.message.includes('duplicate column')) throw err;
            }
          }
        }
      }

      // Migration 4: Add betaAccess column to users table if it doesn't exist
      console.log('🔍 Checking if betaAccess column exists...');
      const checkBetaAccessColumn = this.dbType === 'postgresql' 
        ? `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'betaaccess'`
        : `PRAGMA table_info(users)`;
        
      const betaAccessResult = await this.query(checkBetaAccessColumn);
      console.log('📊 BetaAccess column check result:', betaAccessResult.rows);
      
      if (this.dbType === 'postgresql') {
        if (betaAccessResult.rows.length === 0) {
          console.log('➕ Adding betaAccess column to users table...');
          try {
            await this.query('ALTER TABLE users ADD COLUMN betaAccess BOOLEAN DEFAULT FALSE');
            console.log('✅ Added betaAccess column to users table');
          } catch (err) {
            console.error('❌ Error adding betaAccess column:', err.message);
            if (!err.message.includes('already exists')) {
              throw err;
            }
          }
        } else {
          console.log('✅ betaAccess column already exists');
        }
      } else {
        const hasBetaAccess = betaAccessResult.rows.some(row => row.name === 'betaAccess');
        if (!hasBetaAccess) {
          try {
            await this.query('ALTER TABLE users ADD COLUMN betaAccess BOOLEAN DEFAULT 0');
            console.log('✅ Added betaAccess column to users table');
          } catch (err) {
            if (!err.message.includes('duplicate column')) throw err;
          }
        }
      }

      // Migration 5: Update preferredLeagues column in player_availability to support JSON array
      console.log('🔍 Checking preferredLeagues column type in player_availability...');
      const checkPreferredLeaguesColumn = this.dbType === 'postgresql' 
        ? `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'player_availability' AND column_name = 'preferredleagues'`
        : `PRAGMA table_info(player_availability)`;
        
      const preferredLeaguesResult = await this.query(checkPreferredLeaguesColumn);
      
      if (this.dbType === 'postgresql') {
        if (preferredLeaguesResult.rows.length > 0) {
          const columnType = preferredLeaguesResult.rows[0].data_type;
          // If it's still VARCHAR, we need to update it to TEXT for JSON storage
          if (columnType === 'character varying') {
            console.log('➕ Updating preferredLeagues column type to TEXT...');
            try {
              // For PostgreSQL, we need to change VARCHAR to TEXT
              await this.query('ALTER TABLE player_availability ALTER COLUMN preferredLeagues TYPE TEXT');
              console.log('✅ Updated preferredLeagues column type to TEXT');
            } catch (err) {
              console.error('❌ Error updating preferredLeagues column:', err.message);
            }
          }
        }
      } else {
        // For SQLite, check if the column type needs updating
        const preferredLeaguesColumn = preferredLeaguesResult.rows.find(row => row.name === 'preferredLeagues');
        if (preferredLeaguesColumn && preferredLeaguesColumn.type === 'VARCHAR') {
          console.log('➕ preferredLeagues column is VARCHAR, should be TEXT for JSON - no migration needed for SQLite');
        }
      }

      // Migration 6: Remove ageGroups columns from leagues and league_requests
      if (this.dbType === 'postgresql') {
        const leaguesAgeGroups = await this.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'agegroups'`
        );
        if (leaguesAgeGroups.rows.length > 0) {
          await this.query('ALTER TABLE leagues DROP COLUMN IF EXISTS agegroups');
          console.log('✅ Dropped ageGroups column from leagues table');
        }

        const requestsAgeGroups = await this.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = 'league_requests' AND column_name = 'agegroups'`
        );
        if (requestsAgeGroups.rows.length > 0) {
          await this.query('ALTER TABLE league_requests DROP COLUMN IF EXISTS agegroups');
          console.log('✅ Dropped ageGroups column from league_requests table');
        }
      } else {
        const leagueColumns = await this.query('PRAGMA table_info(leagues)');
        const hasLeagueAgeGroups = leagueColumns.rows.some(row => row.name === 'ageGroups');
        if (hasLeagueAgeGroups) {
          await this.query(`
            CREATE TABLE leagues_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR UNIQUE NOT NULL,
              region VARCHAR,
              country VARCHAR DEFAULT 'England',
              url VARCHAR,
              hits INTEGER DEFAULT 0,
              description VARCHAR,
              isActive BOOLEAN DEFAULT TRUE,
              createdBy INTEGER NULL,
              createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          await this.query(`
            INSERT INTO leagues_new (id, name, region, country, url, hits, description, isActive, createdBy, createdAt)
            SELECT id, name, region, country, url, hits, description, isActive, createdBy, createdAt
            FROM leagues
          `);
          await this.query('DROP TABLE leagues');
          await this.query('ALTER TABLE leagues_new RENAME TO leagues');
          console.log('✅ Rebuilt leagues table without ageGroups column');
        }

        const requestColumns = await this.query('PRAGMA table_info(league_requests)');
        const hasRequestAgeGroups = requestColumns.rows.some(row => row.name === 'ageGroups');
        if (hasRequestAgeGroups) {
          await this.query(`
            CREATE TABLE league_requests_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR NOT NULL,
              region VARCHAR,
              url VARCHAR,
              description TEXT,
              contactName VARCHAR,
              contactEmail VARCHAR,
              contactPhone VARCHAR,
              status VARCHAR DEFAULT 'pending',
              submittedBy INTEGER NOT NULL,
              reviewedBy INTEGER,
              reviewedAt TIMESTAMP,
              reviewNotes TEXT,
              createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (submittedBy) REFERENCES users (id),
              FOREIGN KEY (reviewedBy) REFERENCES users (id),
              CHECK (status IN ('pending', 'approved', 'rejected'))
            )
          `);
          await this.query(`
            INSERT INTO league_requests_new (
              id, name, region, url, description, contactName, contactEmail, contactPhone,
              status, submittedBy, reviewedBy, reviewedAt, reviewNotes, createdAt, updatedAt
            )
            SELECT id, name, region, url, description, contactName, contactEmail, contactPhone,
              status, submittedBy, reviewedBy, reviewedAt, reviewNotes, createdAt, updatedAt
            FROM league_requests
          `);
          await this.query('DROP TABLE league_requests');
          await this.query('ALTER TABLE league_requests_new RENAME TO league_requests');
          console.log('✅ Rebuilt league_requests table without ageGroups column');
        }
      }

      // Migration 7: Add isDeleted to users and isFrozen to adverts
      const checkUsersColumns = this.dbType === 'postgresql'
        ? `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`
        : `PRAGMA table_info(users)`;
      const usersColumns = await this.query(checkUsersColumns);

      if (this.dbType === 'postgresql') {
        const userColumnNames = usersColumns.rows.map(row => row.column_name);
        if (!userColumnNames.includes('isdeleted')) {
          await this.query('ALTER TABLE users ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE');
          console.log('✅ Added isDeleted column to users table');
        }
      } else {
        const hasIsDeleted = usersColumns.rows.some(row => row.name === 'isDeleted');
        if (!hasIsDeleted) {
          try {
            await this.query('ALTER TABLE users ADD COLUMN isDeleted BOOLEAN DEFAULT 0');
            console.log('✅ Added isDeleted column to users table');
          } catch (err) {
            if (!err.message.includes('duplicate column')) throw err;
          }
        }
      }

      const checkVacancyFrozen = this.dbType === 'postgresql'
        ? `SELECT column_name FROM information_schema.columns WHERE table_name = 'team_vacancies'`
        : `PRAGMA table_info(team_vacancies)`;
      const vacancyColumns = await this.query(checkVacancyFrozen);

      if (this.dbType === 'postgresql') {
        const vacancyNames = vacancyColumns.rows.map(row => row.column_name);
        if (!vacancyNames.includes('isfrozen')) {
          await this.query('ALTER TABLE team_vacancies ADD COLUMN isFrozen BOOLEAN DEFAULT FALSE');
          console.log('✅ Added isFrozen column to team_vacancies table');
        }
      } else {
        const hasIsFrozen = vacancyColumns.rows.some(row => row.name === 'isFrozen');
        if (!hasIsFrozen) {
          try {
            await this.query('ALTER TABLE team_vacancies ADD COLUMN isFrozen BOOLEAN DEFAULT 0');
            console.log('✅ Added isFrozen column to team_vacancies table');
          } catch (err) {
            if (!err.message.includes('duplicate column')) throw err;
          }
        }
      }

      const checkAvailabilityFrozen = this.dbType === 'postgresql'
        ? `SELECT column_name FROM information_schema.columns WHERE table_name = 'player_availability'`
        : `PRAGMA table_info(player_availability)`;
      const availabilityColumns = await this.query(checkAvailabilityFrozen);

      if (this.dbType === 'postgresql') {
        const availabilityNames = availabilityColumns.rows.map(row => row.column_name);
        if (!availabilityNames.includes('isfrozen')) {
          await this.query('ALTER TABLE player_availability ADD COLUMN isFrozen BOOLEAN DEFAULT FALSE');
          console.log('✅ Added isFrozen column to player_availability table');
        }
      } else {
        const hasIsFrozen = availabilityColumns.rows.some(row => row.name === 'isFrozen');
        if (!hasIsFrozen) {
          try {
            await this.query('ALTER TABLE player_availability ADD COLUMN isFrozen BOOLEAN DEFAULT 0');
            console.log('✅ Added isFrozen column to player_availability table');
          } catch (err) {
            if (!err.message.includes('duplicate column')) throw err;
          }
        }
      }
    } catch (error) {
      // Only log non-duplicate column errors
      if (!error.message.includes('duplicate column')) {
        console.warn('Migration warning:', error.message);
      }
    }
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_team_vacancies_location ON team_vacancies USING GIN(locationData)',
      'CREATE INDEX IF NOT EXISTS idx_email_alerts_user ON email_alerts(userId)',
      'CREATE INDEX IF NOT EXISTS idx_email_alerts_active ON email_alerts(isActive)',
      'CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date)',
      'CREATE INDEX IF NOT EXISTS idx_trial_invitations_player ON trial_invitations(playerId)',
      'CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(eventId)',
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
      'CREATE INDEX IF NOT EXISTS idx_family_relationships_userId ON family_relationships(userId)',
      'CREATE INDEX IF NOT EXISTS idx_family_relationships_relatedUserId ON family_relationships(relatedUserId)',
      'CREATE INDEX IF NOT EXISTS idx_family_relationships_childId ON family_relationships(childId)',
      'CREATE INDEX IF NOT EXISTS idx_coach_children_coachId ON coach_children(coachId)',
      'CREATE INDEX IF NOT EXISTS idx_coach_children_childId ON coach_children(childId)',
      'CREATE INDEX IF NOT EXISTS idx_coach_children_teamId ON coach_children(teamId)',
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
