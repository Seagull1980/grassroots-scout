const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const DatabaseUtils = require('./utils/dbUtils.js');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = new DatabaseUtils();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Team Management API endpoints

// Create a new team
app.post('/api/teams', authenticateToken, [
  body('teamName').notEmpty().withMessage('Team name is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('league').notEmpty().withMessage('League is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (req.user.role !== 'Coach') {
    return res.status(403).json({ error: 'Only coaches can create teams' });
  }

  try {
    const { teamName, clubName, ageGroup, league, teamGender, location, locationData, contactEmail, website, socialMedia } = req.body;

    // Create the team
    const teamResult = await db.query(`
      INSERT INTO teams (teamName, clubName, ageGroup, league, teamGender, location, locationData, contactEmail, website, socialMedia)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [teamName, clubName || null, ageGroup, league, teamGender || 'Mixed', location || null, locationData ? JSON.stringify(locationData) : null, contactEmail || null, website || null, socialMedia ? JSON.stringify(socialMedia) : null]);

    const teamId = teamResult.lastID || teamResult.rows[0].id;

    // Add creator as Head Coach
    await db.query(`
      INSERT INTO team_members (teamId, userId, role, permissions)
      VALUES (?, ?, ?, ?)
    `, [teamId, req.user.userId, 'Head Coach', JSON.stringify({
      canPostVacancies: true,
      canManageRoster: true,
      canEditTeam: true,
      canDeleteTeam: true,
      canInviteMembers: true
    })]);

    // Create default roster for the team
    await db.query(`
      INSERT INTO team_rosters (teamId, maxSquadSize)
      VALUES (?, ?)
    `, [teamId, 20]); // Default max squad size

    res.status(201).json({
      message: 'Team created successfully',
      teamId,
      team: {
        id: teamId,
        teamName,
        clubName,
        ageGroup,
        league,
        teamGender: teamGender || 'Mixed',
        userRole: 'Head Coach'
      }
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get teams for the authenticated user
app.get('/api/teams', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can view teams' });
    }

    const teams = await db.query(`
      SELECT t.*, tm.role as userRole, tm.permissions
      FROM teams t
      JOIN team_members tm ON t.id = tm.teamId
      WHERE tm.userId = ?
      ORDER BY t.createdAt DESC
    `, [req.user.userId]);

    res.json({ teams: teams.rows || teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team details
app.get('/api/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if user is a member of the team
    const membership = await db.query(`
      SELECT tm.role, tm.permissions, t.*
      FROM team_members tm
      JOIN teams t ON tm.teamId = t.id
      WHERE tm.teamId = ? AND tm.userId = ?
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }

    const team = membership.rows[0];
    team.permissions = JSON.parse(team.permissions);

    // Get all team members
    const members = await db.query(`
      SELECT tm.*, u.firstName, u.lastName, u.email
      FROM team_members tm
      JOIN users u ON tm.userId = u.id
      WHERE tm.teamId = ?
      ORDER BY tm.joinedAt ASC
    `, [teamId]);

    team.members = members.rows || members;

    res.json({ team });
  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// Invite a coach to join the team
app.post('/api/teams/:teamId/invite', authenticateToken, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['Head Coach', 'Assistant Coach', 'Youth Coach', 'Goalkeeper Coach', 'Fitness Coach']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { teamId } = req.params;
    const { email, role } = req.body;

    // Check if user has permission to invite members
    const membership = await db.query(`
      SELECT permissions FROM team_members
      WHERE teamId = ? AND userId = ? AND JSON_EXTRACT(permissions, '$.canInviteMembers') = true
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to invite members' });
    }

    // Check if user exists
    const user = await db.query('SELECT id, firstName, lastName FROM users WHERE email = ?', [email]);
    if (!user.rows || user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }

    // Check if user is already a member
    const existingMember = await db.query(`
      SELECT id FROM team_members WHERE teamId = ? AND userId = ?
    `, [teamId, user.rows[0].id]);

    if (existingMember.rows && existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }

    // Add user to team
    const permissions = getDefaultPermissions(role);
    await db.query(`
      INSERT INTO team_members (teamId, userId, role, permissions)
      VALUES (?, ?, ?, ?)
    `, [teamId, user.rows[0].id, role, JSON.stringify(permissions)]);

    res.json({
      message: 'Coach invited successfully',
      member: {
        userId: user.rows[0].id,
        firstName: user.rows[0].firstName,
        lastName: user.rows[0].lastName,
        email,
        role,
        permissions
      }
    });
  } catch (error) {
    console.error('Error inviting coach:', error);
    res.status(500).json({ error: 'Failed to invite coach' });
  }
});

// Update team details
app.put('/api/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if user has permission to edit team
    const membership = await db.query(`
      SELECT permissions FROM team_members
      WHERE teamId = ? AND userId = ? AND JSON_EXTRACT(permissions, '$.canEditTeam') = true
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to edit this team' });
    }

    const { teamName, clubName, ageGroup, league, teamGender, location, locationData, contactEmail, website, socialMedia } = req.body;

    await db.query(`
      UPDATE teams SET
        teamName = ?, clubName = ?, ageGroup = ?, league = ?, teamGender = ?,
        location = ?, locationData = ?, contactEmail = ?, website = ?, socialMedia = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [teamName, clubName, ageGroup, league, teamGender, location, locationData ? JSON.stringify(locationData) : null, contactEmail, website, socialMedia ? JSON.stringify(socialMedia) : null, teamId]);

    res.json({ message: 'Team updated successfully' });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Get team vacancies
app.get('/api/teams/:teamId/vacancies', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if user is a member of the team
    const membership = await db.query(`
      SELECT id FROM team_members WHERE teamId = ? AND userId = ?
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }

    const vacancies = await db.query(`
      SELECT tv.*, u.firstName, u.lastName
      FROM team_vacancies tv
      JOIN users u ON tv.postedBy = u.id
      WHERE tv.teamId = ? AND tv.status = 'active'
      ORDER BY tv.createdAt DESC
    `, [teamId]);

    res.json({ vacancies: vacancies.rows || vacancies });
  } catch (error) {
    console.error('Error fetching team vacancies:', error);
    res.status(500).json({ error: 'Failed to fetch team vacancies' });
  }
});

// Helper function to get default permissions for a role
function getDefaultPermissions(role) {
  const permissionMap = {
    'Head Coach': {
      canPostVacancies: true,
      canManageRoster: true,
      canEditTeam: true,
      canDeleteTeam: true,
      canInviteMembers: true
    },
    'Assistant Coach': {
      canPostVacancies: true,
      canManageRoster: true,
      canEditTeam: false,
      canDeleteTeam: false,
      canInviteMembers: false
    },
    'Youth Coach': {
      canPostVacancies: false,
      canManageRoster: true,
      canEditTeam: false,
      canDeleteTeam: false,
      canInviteMembers: false
    },
    'Goalkeeper Coach': {
      canPostVacancies: false,
      canManageRoster: true,
      canEditTeam: false,
      canDeleteTeam: false,
      canInviteMembers: false
    },
    'Fitness Coach': {
      canPostVacancies: false,
      canManageRoster: true,
      canEditTeam: false,
      canDeleteTeam: false,
      canInviteMembers: false
    }
  };

  return permissionMap[role] || permissionMap['Assistant Coach'];
}

module.exports = app;