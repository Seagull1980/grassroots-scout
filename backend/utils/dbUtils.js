const Database = require('../db/database.js');

class DatabaseUtils {
  constructor() {
    this.db = new Database();
  }

  // Convert old SQLite callback style to async/await
  async runQuery(sql, params = []) {
    try {
      const result = await this.db.query(sql, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Get a single row
  async getOne(sql, params = []) {
    const result = await this.runQuery(sql, params);
    return result.rows[0] || null;
  }

  // Get multiple rows
  async getAll(sql, params = []) {
    const result = await this.runQuery(sql, params);
    return result.rows;
  }

  // Insert and return the inserted ID
  async insert(sql, params = []) {
    const result = await this.runQuery(sql, params);
    return result.lastID || result.rows[0]?.id;
  }

  // Update and return the number of affected rows
  async update(sql, params = []) {
    const result = await this.runQuery(sql, params);
    return result.rowCount;
  }

  // Delete and return the number of affected rows
  async delete(sql, params = []) {
    const result = await this.runQuery(sql, params);
    return result.rowCount;
  }

  // Close database connection
  async close() {
    await this.db.close();
  }
}

module.exports = DatabaseUtils;
