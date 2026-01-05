const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();

class DatabaseMigration {
  constructor() {
    this.sqliteDb = null;
    this.pgPool = null;
  }

  async init() {
    // Initialize SQLite connection
    this.sqliteDb = new sqlite3.Database('./database.sqlite', (err) => {
      if (err) {
        console.error('❌ Error connecting to SQLite:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
      }
    });

    // Initialize PostgreSQL connection
    this.pgPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'grassroots_hub',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
      max: 5,
    });

    console.log('✅ Connected to PostgreSQL database');
  }

  async querySQLite(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async queryPostgreSQL(sql, params = []) {
    const client = await this.pgPool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async createPostgreSQLTables() {
    console.log('🏗️ Creating PostgreSQL tables...');
    
    const Database = require('../db/database.js');
    const db = new Database();
    
    // Temporarily set to PostgreSQL for table creation
    const originalDbType = process.env.DB_TYPE;
    process.env.DB_TYPE = 'postgresql';
    
    try {
      await db.createTables();
      console.log('✅ PostgreSQL tables created successfully');
    } catch (error) {
      console.error('❌ Error creating PostgreSQL tables:', error);
      throw error;
    } finally {
      process.env.DB_TYPE = originalDbType;
      await db.close();
    }
  }

  async migrateTable(tableName, columnMapping = {}) {
    console.log(`🔄 Migrating table: ${tableName}`);
    
    try {
      // Get data from SQLite
      const sqliteData = await this.querySQLite(`SELECT * FROM ${tableName}`);
      
      if (sqliteData.length === 0) {
        console.log(`ℹ️ No data found in ${tableName}, skipping...`);
        return;
      }

      // Get column names (excluding id for auto-increment)
      const columns = Object.keys(sqliteData[0]).filter(col => col !== 'id');
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      const columnNames = columns.join(', ');

      // Apply column mapping if provided
      const mappedColumns = columns.map(col => columnMapping[col] || col);
      const mappedColumnNames = mappedColumns.join(', ');

      const insertSQL = `INSERT INTO ${tableName} (${mappedColumnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      let successCount = 0;
      let errorCount = 0;

      for (const row of sqliteData) {
        try {
          const values = columns.map(col => {
            let value = row[col];
            
            // Handle data type conversions
            if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
              // Convert JSON strings to objects
              try {
                value = JSON.parse(value);
              } catch (e) {
                // Keep as string if not valid JSON
              }
            }
            
            // Convert SQLite boolean integers to PostgreSQL booleans
            if (typeof value === 'number' && (value === 0 || value === 1)) {
              const booleanColumns = ['isActive', 'isProfileComplete', 'isRecurring'];
              if (booleanColumns.includes(col)) {
                value = value === 1;
              }
            }
            
            return value;
          });

          await this.queryPostgreSQL(insertSQL, values);
          successCount++;
        } catch (error) {
          console.error(`❌ Error migrating row in ${tableName}:`, error.message);
          errorCount++;
        }
      }

      console.log(`✅ ${tableName}: ${successCount} rows migrated, ${errorCount} errors`);
    } catch (error) {
      console.error(`❌ Error migrating table ${tableName}:`, error);
      throw error;
    }
  }

  async updateSequences() {
    console.log('🔄 Updating PostgreSQL sequences...');
    
    const tables = [
      'users', 'user_profiles', 'leagues', 'team_vacancies', 
      'player_availability', 'email_alerts', 'calendar_events', 
      'trial_invitations', 'event_participants'
    ];

    for (const table of tables) {
      try {
        // Get the current max ID from the table
        const result = await this.queryPostgreSQL(`SELECT MAX(id) as max_id FROM ${table}`);
        const maxId = result[0]?.max_id || 0;
        
        if (maxId > 0) {
          // Update the sequence to start from max_id + 1
          await this.queryPostgreSQL(`SELECT setval('${table}_id_seq', $1, true)`, [maxId]);
          console.log(`✅ Updated ${table}_id_seq to ${maxId}`);
        }
      } catch (error) {
        console.error(`❌ Error updating sequence for ${table}:`, error.message);
      }
    }
  }

  async validateMigration() {
    console.log('🔍 Validating migration...');
    
    const tables = [
      'users', 'user_profiles', 'leagues', 'team_vacancies', 
      'player_availability', 'email_alerts', 'calendar_events', 
      'trial_invitations', 'event_participants'
    ];

    const results = {};

    for (const table of tables) {
      try {
        const sqliteCount = await this.querySQLite(`SELECT COUNT(*) as count FROM ${table}`);
        const pgCount = await this.queryPostgreSQL(`SELECT COUNT(*) as count FROM ${table}`);
        
        const sqliteTotal = sqliteCount[0]?.count || 0;
        const pgTotal = pgCount[0]?.count || 0;
        
        results[table] = {
          sqlite: sqliteTotal,
          postgresql: pgTotal,
          match: sqliteTotal === pgTotal
        };
        
        const status = sqliteTotal === pgTotal ? '✅' : '❌';
        console.log(`${status} ${table}: SQLite(${sqliteTotal}) -> PostgreSQL(${pgTotal})`);
      } catch (error) {
        console.error(`❌ Error validating ${table}:`, error.message);
        results[table] = { error: error.message };
      }
    }

    return results;
  }

  async migrate() {
    console.log('🚀 Starting database migration from SQLite to PostgreSQL...\n');
    
    try {
      await this.init();
      
      // Step 1: Create PostgreSQL tables
      await this.createPostgreSQLTables();
      
      // Step 2: Migrate data table by table
      const tables = [
        'users',
        'user_profiles', 
        'leagues',
        'team_vacancies',
        'player_availability',
        'email_alerts',
        'calendar_events',
        'trial_invitations',
        'event_participants'
      ];

      for (const table of tables) {
        await this.migrateTable(table);
      }
      
      // Step 3: Update PostgreSQL sequences
      await this.updateSequences();
      
      // Step 4: Validate migration
      const validation = await this.validateMigration();
      
      console.log('\n🎉 Migration completed!');
      console.log('📊 Migration Summary:');
      console.table(validation);
      
      return validation;
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
    if (this.pgPool) {
      await this.pgPool.end();
    }
    console.log('🧹 Cleanup completed');
  }
}

// Run migration if called directly
if (require.main === module) {
  (async () => {
    const migration = new DatabaseMigration();
    try {
      await migration.migrate();
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = DatabaseMigration;
