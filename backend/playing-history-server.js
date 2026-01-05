const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const DatabaseUtils = require('./utils/dbUtils');

const app = express();
const PORT = process.env.PLAYING_HISTORY_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Database instance
const dbUtils = new DatabaseUtils();

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get all playing history for a player (current user or specified player)
app.get('/api/playing-history/:playerId?', authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.params;
    const targetPlayerId = playerId || req.user.id;

    // Check if user is accessing their own history or if they're a coach/admin
    if (targetPlayerId !== req.user.id && !['Coach', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = `
      SELECT ph.*, u.firstName, u.lastName
      FROM playing_history ph
      JOIN users u ON ph.playerId = u.id
      WHERE ph.playerId = ?
      ORDER BY ph.startDate DESC, ph.createdAt DESC
    `;

    const history = await dbUtils.runQuery(query, [targetPlayerId]);

    res.json({
      success: true,
      history: history || []
    });

  } catch (error) {
    console.error('Error fetching playing history:', error);
    res.status(500).json({ error: 'Failed to fetch playing history' });
  }
});

// Get all playing history for current user (simplified endpoint)
app.get('/api/playing-history', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT ph.*, u.firstName, u.lastName
      FROM playing_history ph
      JOIN users u ON ph.playerId = u.id
      WHERE ph.playerId = ?
      ORDER BY ph.startDate DESC, ph.createdAt DESC
    `;

    const history = await dbUtils.runQuery(query, [req.user.id]);

    res.json({
      success: true,
      history: history || []
    });

  } catch (error) {
    console.error('Error fetching playing history:', error);
    res.status(500).json({ error: 'Failed to fetch playing history' });
  }
});

// Create new playing history entry
app.post('/api/playing-history', authenticateToken, async (req, res) => {
  try {
    const {
      teamName,
      league,
      ageGroup,
      position,
      season,
      startDate,
      endDate,
      isCurrentTeam,
      achievements,
      matchesPlayed,
      goalsScored,
      notes
    } = req.body;

    // Validation
    if (!teamName || !league || !ageGroup || !position || !season || !startDate) {
      return res.status(400).json({ 
        error: 'Team name, league, age group, position, season, and start date are required' 
      });
    }

    // Validate date format
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid start date format' });
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid end date format' });
      }
      if (endDateObj < startDateObj) {
        return res.status(400).json({ error: 'End date cannot be before start date' });
      }
    }

    // If marking as current team, ensure no other team is marked as current
    if (isCurrentTeam) {
      await dbUtils.runQuery(
        'UPDATE playing_history SET isCurrentTeam = FALSE WHERE playerId = ? AND isCurrentTeam = TRUE',
        [req.user.id]
      );
    }

    const historyId = uuidv4();
    const query = `
      INSERT INTO playing_history (
        id, playerId, teamName, league, ageGroup, position, season,
        startDate, endDate, isCurrentTeam, achievements, matchesPlayed,
        goalsScored, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    await dbUtils.runQuery(query, [
      historyId,
      req.user.id,
      teamName,
      league,
      ageGroup,
      position,
      season,
      startDate,
      endDate || null,
      isCurrentTeam || false,
      achievements || null,
      matchesPlayed || null,
      goalsScored || null,
      notes || null
    ]);

    // Get the created history entry
    const createdHistory = await dbUtils.runQuery(
      'SELECT * FROM playing_history WHERE id = ?',
      [historyId]
    );

    res.status(201).json({
      success: true,
      message: 'Playing history entry created successfully',
      history: createdHistory[0]
    });

  } catch (error) {
    console.error('Error creating playing history:', error);
    res.status(500).json({ error: 'Failed to create playing history entry' });
  }
});

// Update playing history entry
app.put('/api/playing-history/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      teamName,
      league,
      ageGroup,
      position,
      season,
      startDate,
      endDate,
      isCurrentTeam,
      achievements,
      matchesPlayed,
      goalsScored,
      notes
    } = req.body;

    // Check if the history entry exists and belongs to the user
    const existingHistory = await dbUtils.runQuery(
      'SELECT * FROM playing_history WHERE id = ? AND playerId = ?',
      [id, req.user.id]
    );

    if (!existingHistory || existingHistory.length === 0) {
      return res.status(404).json({ error: 'Playing history entry not found' });
    }

    // Validate dates if provided
    if (startDate) {
      const startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid start date format' });
      }
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid end date format' });
      }
      
      const checkStartDate = startDate || existingHistory[0].startDate;
      if (endDateObj < new Date(checkStartDate)) {
        return res.status(400).json({ error: 'End date cannot be before start date' });
      }
    }

    // If marking as current team, ensure no other team is marked as current
    if (isCurrentTeam && !existingHistory[0].isCurrentTeam) {
      await dbUtils.runQuery(
        'UPDATE playing_history SET isCurrentTeam = FALSE WHERE playerId = ? AND isCurrentTeam = TRUE AND id != ?',
        [req.user.id, id]
      );
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (teamName !== undefined) {
      updateFields.push('teamName = ?');
      updateValues.push(teamName);
    }
    if (league !== undefined) {
      updateFields.push('league = ?');
      updateValues.push(league);
    }
    if (ageGroup !== undefined) {
      updateFields.push('ageGroup = ?');
      updateValues.push(ageGroup);
    }
    if (position !== undefined) {
      updateFields.push('position = ?');
      updateValues.push(position);
    }
    if (season !== undefined) {
      updateFields.push('season = ?');
      updateValues.push(season);
    }
    if (startDate !== undefined) {
      updateFields.push('startDate = ?');
      updateValues.push(startDate);
    }
    if (endDate !== undefined) {
      updateFields.push('endDate = ?');
      updateValues.push(endDate);
    }
    if (isCurrentTeam !== undefined) {
      updateFields.push('isCurrentTeam = ?');
      updateValues.push(isCurrentTeam);
    }
    if (achievements !== undefined) {
      updateFields.push('achievements = ?');
      updateValues.push(achievements);
    }
    if (matchesPlayed !== undefined) {
      updateFields.push('matchesPlayed = ?');
      updateValues.push(matchesPlayed);
    }
    if (goalsScored !== undefined) {
      updateFields.push('goalsScored = ?');
      updateValues.push(goalsScored);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const query = `UPDATE playing_history SET ${updateFields.join(', ')} WHERE id = ?`;
    await dbUtils.runQuery(query, updateValues);

    // Get the updated history entry
    const updatedHistory = await dbUtils.runQuery(
      'SELECT * FROM playing_history WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Playing history entry updated successfully',
      history: updatedHistory[0]
    });

  } catch (error) {
    console.error('Error updating playing history:', error);
    res.status(500).json({ error: 'Failed to update playing history entry' });
  }
});

// Delete playing history entry
app.delete('/api/playing-history/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the history entry exists and belongs to the user
    const existingHistory = await dbUtils.runQuery(
      'SELECT * FROM playing_history WHERE id = ? AND playerId = ?',
      [id, req.user.id]
    );

    if (!existingHistory || existingHistory.length === 0) {
      return res.status(404).json({ error: 'Playing history entry not found' });
    }

    await dbUtils.runQuery('DELETE FROM playing_history WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Playing history entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting playing history:', error);
    res.status(500).json({ error: 'Failed to delete playing history entry' });
  }
});

// Update current team status
app.patch('/api/playing-history/:id/current-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isCurrentTeam } = req.body;

    if (typeof isCurrentTeam !== 'boolean') {
      return res.status(400).json({ error: 'isCurrentTeam must be a boolean' });
    }

    // Check if the history entry exists and belongs to the user
    const existingHistory = await dbUtils.runQuery(
      'SELECT * FROM playing_history WHERE id = ? AND playerId = ?',
      [id, req.user.id]
    );

    if (!existingHistory || existingHistory.length === 0) {
      return res.status(404).json({ error: 'Playing history entry not found' });
    }

    // If marking as current team, ensure no other team is marked as current
    if (isCurrentTeam) {
      await dbUtils.runQuery(
        'UPDATE playing_history SET isCurrentTeam = FALSE WHERE playerId = ? AND isCurrentTeam = TRUE AND id != ?',
        [req.user.id, id]
      );
    }

    await dbUtils.runQuery(
      'UPDATE playing_history SET isCurrentTeam = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [isCurrentTeam, id]
    );

    // Get the updated history entry
    const updatedHistory = await dbUtils.runQuery(
      'SELECT * FROM playing_history WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Current team status updated successfully',
      history: updatedHistory[0]
    });

  } catch (error) {
    console.error('Error updating current team status:', error);
    res.status(500).json({ error: 'Failed to update current team status' });
  }
});

// Get playing statistics for a player
app.get('/api/playing-history/stats/:playerId?', authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.params;
    const targetPlayerId = playerId || req.user.id;

    // Check if user is accessing their own stats or if they're a coach/admin
    if (targetPlayerId !== req.user.id && !['Coach', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as totalTeams,
        COUNT(CASE WHEN isCurrentTeam = true THEN 1 END) as currentTeams,
        SUM(COALESCE(matchesPlayed, 0)) as totalMatches,
        SUM(COALESCE(goalsScored, 0)) as totalGoals,
        COUNT(DISTINCT league) as leaguesPlayed,
        COUNT(DISTINCT position) as positionsPlayed,
        MIN(startDate) as firstTeamDate,
        MAX(CASE WHEN endDate IS NOT NULL THEN endDate ELSE startDate END) as lastActiveDate
      FROM playing_history 
      WHERE playerId = ?
    `;

    const positionsQuery = `
      SELECT position, COUNT(*) as count
      FROM playing_history 
      WHERE playerId = ?
      GROUP BY position
      ORDER BY count DESC
    `;

    const leaguesQuery = `
      SELECT league, COUNT(*) as count
      FROM playing_history 
      WHERE playerId = ?
      GROUP BY league
      ORDER BY count DESC
    `;

    const [stats, positions, leagues] = await Promise.all([
      dbUtils.runQuery(statsQuery, [targetPlayerId]),
      dbUtils.runQuery(positionsQuery, [targetPlayerId]),
      dbUtils.runQuery(leaguesQuery, [targetPlayerId])
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalTeams: 0,
        currentTeams: 0,
        totalMatches: 0,
        totalGoals: 0,
        leaguesPlayed: 0,
        positionsPlayed: 0,
        firstTeamDate: null,
        lastActiveDate: null
      },
      positions: positions || [],
      leagues: leagues || []
    });

  } catch (error) {
    console.error('Error fetching playing statistics:', error);
    res.status(500).json({ error: 'Failed to fetch playing statistics' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Playing History API',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏃‍♂️ Playing History Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Playing History Server shutting down...');
  process.exit(0);
});
