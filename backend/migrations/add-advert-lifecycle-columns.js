/**
 * Migration: Add advert lifecycle tracking columns
 * Adds tracking for views, saves, auto-extend, and more granular status tracking
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }

  console.log('Running migration: add-advert-lifecycle-columns');

  const migrations = [
    // Team Vacancies table
    `ALTER TABLE team_vacancies ADD COLUMN views INTEGER DEFAULT 0;`,
    `ALTER TABLE team_vacancies ADD COLUMN saved_count INTEGER DEFAULT 0;`,
    `ALTER TABLE team_vacancies ADD COLUMN inquiries_count INTEGER DEFAULT 0;`,
    `ALTER TABLE team_vacancies ADD COLUMN paused INTEGER DEFAULT 0;`,
    `ALTER TABLE team_vacancies ADD COLUMN closed_reason TEXT;`,
    `ALTER TABLE team_vacancies ADD COLUMN closed_at TIMESTAMP;`,
    `ALTER TABLE team_vacancies ADD COLUMN auto_extend INTEGER DEFAULT 0;`,
    `ALTER TABLE team_vacancies ADD COLUMN expires_at TIMESTAMP;`,
    `ALTER TABLE team_vacancies ADD COLUMN last_viewed_at TIMESTAMP;`,
    
    // Player Availability table
    `ALTER TABLE player_availability ADD COLUMN views INTEGER DEFAULT 0;`,
    `ALTER TABLE player_availability ADD COLUMN saved_count INTEGER DEFAULT 0;`,
    `ALTER TABLE player_availability ADD COLUMN inquiries_count INTEGER DEFAULT 0;`,
    `ALTER TABLE player_availability ADD COLUMN paused INTEGER DEFAULT 0;`,
    `ALTER TABLE player_availability ADD COLUMN closed_reason TEXT;`,
    `ALTER TABLE player_availability ADD COLUMN closed_at TIMESTAMP;`,
    `ALTER TABLE player_availability ADD COLUMN auto_extend INTEGER DEFAULT 0;`,
    `ALTER TABLE player_availability ADD COLUMN expires_at TIMESTAMP;`,
    `ALTER TABLE player_availability ADD COLUMN last_viewed_at TIMESTAMP;`,
    
    // Child Player Availability table
    `ALTER TABLE child_player_availability ADD COLUMN views INTEGER DEFAULT 0;`,
    `ALTER TABLE child_player_availability ADD COLUMN saved_count INTEGER DEFAULT 0;`,
    `ALTER TABLE child_player_availability ADD COLUMN inquiries_count INTEGER DEFAULT 0;`,
    `ALTER TABLE child_player_availability ADD COLUMN paused INTEGER DEFAULT 0;`,
    `ALTER TABLE child_player_availability ADD COLUMN closed_reason TEXT;`,
    `ALTER TABLE child_player_availability ADD COLUMN closed_at TIMESTAMP;`,
    `ALTER TABLE child_player_availability ADD COLUMN auto_extend INTEGER DEFAULT 0;`,
    `ALTER TABLE child_player_availability ADD COLUMN expires_at TIMESTAMP;`,
    `ALTER TABLE child_player_availability ADD COLUMN last_viewed_at TIMESTAMP;`,
  ];

  let completed = 0;
  const total = migrations.length;

  migrations.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        // Column might already exist, continue anyway
        console.warn(`⚠️  Column migration ${index + 1}: ${err.message}`);
      } else {
        console.log(`✅ Column migration ${index + 1}/${total}`);
      }
      
      completed++;
      if (completed === total) {
        console.log('✅ Migration completed');
        db.close();
      }
    });
  });
});
