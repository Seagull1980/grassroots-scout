const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const DatabaseUtils = require('./utils/dbUtils.js');
const emailService = require('./services/emailService.js');
const { v4: uuidv4 } = require('uuid');
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

// Search for coaches by name or email
app.get('/api/coaches/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ coaches: [] });
    }

    const searchTerm = `%${q}%`;
    const coaches = await db.query(`
      SELECT id, firstName, lastName, email
      FROM users
      WHERE role = 'Coach' 
      AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)
      LIMIT 10
    `, [searchTerm, searchTerm, searchTerm]);

    const results = (coaches.rows || coaches).map(coach => ({
      id: coach.id,
      name: `${coach.firstName} ${coach.lastName}`,
      email: coach.email
    }));

    res.json({ coaches: results });
  } catch (error) {
    console.error('Error searching coaches:', error);
    res.status(500).json({ error: 'Failed to search coaches' });
  }
});

// Send team invitation (creates pending invitation)
app.post('/api/teams/:teamId/invite-coach', authenticateToken, [
  body('coachId').notEmpty().withMessage('Coach ID is required'),
  body('role').isIn(['Head Coach', 'Assistant Coach', 'Youth Coach', 'Goalkeeper Coach', 'Fitness Coach']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { teamId } = req.params;
    const { coachId, role } = req.body;

    // Check if user has permission to invite members
    const membership = await db.query(`
      SELECT permissions, t.teamName FROM team_members tm
      JOIN teams t ON tm.teamId = t.id
      WHERE tm.teamId = ? AND tm.userId = ? AND JSON_EXTRACT(tm.permissions, '$.canInviteMembers') = true
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to invite members' });
    }

    const teamName = membership.rows[0].teamName;

    // Get the coach being invited
    const coachUser = await db.query('SELECT id, firstName, lastName, email FROM users WHERE id = ?', [coachId]);
    if (!coachUser.rows || coachUser.rows.length === 0) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    const coach = coachUser.rows[0];

    // Check if user is already a member
    const existingMember = await db.query(`
      SELECT id FROM team_members WHERE teamId = ? AND userId = ?
    `, [teamId, coachId]);

    if (existingMember.rows && existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'This coach is already a member of this team' });
    }

    // Check if invitation already exists
    const existingInvitation = await db.query(`
      SELECT id FROM team_invitations 
      WHERE teamId = ? AND invitedUserId = ? AND status = 'pending'
    `, [teamId, coachId]);

    if (existingInvitation.rows && existingInvitation.rows.length > 0) {
      return res.status(400).json({ error: 'An invitation is already pending for this coach' });
    }

    // Create invitation
    const invitationToken = uuidv4();
    const invId = await db.insert(`
      INSERT INTO team_invitations (teamId, invitedUserId, invitedByUserId, invitedEmail, role, invitationToken, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [teamId, coachId, req.user.userId, coach.email, role, invitationToken]);

    // Get inviter name
    const inviterResult = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [req.user.userId]);
    const inviterName = inviterResult.rows ? `${inviterResult.rows[0].firstName} ${inviterResult.rows[0].lastName}` : 'A teammate';

    // Send invitation email
    const acceptLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invitations/${invitationToken}`;
    await emailService.sendTeamInvitation(coach.email, inviterName, teamName, acceptLink);

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitationId: invId,
      invitedCoach: {
        id: coach.id,
        name: `${coach.firstName} ${coach.lastName}`,
        email: coach.email,
        role,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Get pending invitations for current user
app.get('/api/invitations', authenticateToken, async (req, res) => {
  try {
    const invitations = await db.query(`
      SELECT ti.*, t.teamName, u.firstName as inviterFirstName, u.lastName as inviterLastName
      FROM team_invitations ti
      JOIN teams t ON ti.teamId = t.id
      JOIN users u ON ti.invitedByUserId = u.id
      WHERE ti.invitedUserId = ? AND ti.status = 'pending'
      ORDER BY ti.createdAt DESC
    `, [req.user.userId]);

    const result = (invitations.rows || invitations).map(inv => ({
      id: inv.id,
      teamId: inv.teamId,
      teamName: inv.teamName,
      role: inv.role,
      invitedBy: `${inv.inviterFirstName} ${inv.inviterLastName}`,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt
    }));

    res.json({ invitations: result });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Accept team invitation
app.post('/api/invitations/:invitationToken/accept', authenticateToken, async (req, res) => {
  try {
    const { invitationToken } = req.params;

    // Get the invitation
    const invitation = await db.query(`
      SELECT * FROM team_invitations 
      WHERE invitationToken = ? AND status = 'pending'
    `, [invitationToken]);

    if (!invitation.rows || invitation.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already responded' });
    }

    const inv = invitation.rows[0];

    // Verify it belongs to current user
    if (inv.invitedUserId !== req.user.userId) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    // Check expiration
    if (new Date(inv.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired' });
    }

    // Add user to team
    const permissions = getDefaultPermissions(inv.role);
    await db.query(`
      INSERT INTO team_members (teamId, userId, role, permissions)
      VALUES (?, ?, ?, ?)
    `, [inv.teamId, inv.invitedUserId, inv.role, JSON.stringify(permissions)]);

    // Update invitation status
    await db.query(`
      UPDATE team_invitations 
      SET status = 'accepted', respondedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [inv.id]);

    // Get team and inviter details for notification
    const teamResult = await db.query('SELECT teamName FROM teams WHERE id = ?', [inv.teamId]);
    const inviterResult = await db.query('SELECT firstName, lastName, email FROM users WHERE id = ?', [inv.invitedByUserId]);
    
    const teamName = teamResult.rows ? teamResult.rows[0].teamName : 'the team';
    const inviterEmail = inviterResult.rows ? inviterResult.rows[0].email : null;
    const inviterName = inviterResult.rows ? `${inviterResult.rows[0].firstName} ${inviterResult.rows[0].lastName}` : 'The team';

    // Send acceptance notification to inviter
    if (inviterEmail) {
      await emailService.sendInvitationResponse(inviterEmail, inviterName, teamName, `${req.user.firstName} ${req.user.lastName}`, 'accepted');
    }

    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Reject team invitation
app.post('/api/invitations/:invitationToken/reject', authenticateToken, async (req, res) => {
  try {
    const { invitationToken } = req.params;

    // Get the invitation
    const invitation = await db.query(`
      SELECT * FROM team_invitations 
      WHERE invitationToken = ? AND status = 'pending'
    `, [invitationToken]);

    if (!invitation.rows || invitation.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already responded' });
    }

    const inv = invitation.rows[0];

    // Verify it belongs to current user
    if (inv.invitedUserId !== req.user.userId) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    // Update invitation status
    await db.query(`
      UPDATE team_invitations 
      SET status = 'rejected', respondedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [inv.id]);

    // Get team and inviter details for notification
    const teamResult = await db.query('SELECT teamName FROM teams WHERE id = ?', [inv.teamId]);
    const inviterResult = await db.query('SELECT firstName, lastName, email FROM users WHERE id = ?', [inv.invitedByUserId]);
    
    const teamName = teamResult.rows ? teamResult.rows[0].teamName : 'the team';
    const inviterEmail = inviterResult.rows ? inviterResult.rows[0].email : null;
    const inviterName = inviterResult.rows ? `${inviterResult.rows[0].firstName} ${inviterResult.rows[0].lastName}` : 'The team';

    // Send rejection notification to inviter
    if (inviterEmail) {
      await emailService.sendInvitationResponse(inviterEmail, inviterName, teamName, `${req.user.firstName} ${req.user.lastName}`, 'rejected');
    }

    res.json({ message: 'Invitation rejected' });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    res.status(500).json({ error: 'Failed to reject invitation' });
  }
});

// Remove team member
app.delete('/api/teams/:teamId/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    // Check if requester has permission to remove members
    const membership = await db.query(`
      SELECT permissions FROM team_members
      WHERE teamId = ? AND userId = ? AND JSON_EXTRACT(permissions, '$.canEditTeam') = true
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to remove members' });
    }

    // Check if member exists
    const memberToRemove = await db.query(`
      SELECT tm.*, u.firstName, u.lastName, u.email
      FROM team_members tm
      JOIN users u ON tm.userId = u.id
      WHERE tm.teamId = ? AND tm.userId = ?
    `, [teamId, userId]);

    if (!memberToRemove.rows || memberToRemove.rows.length === 0) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    const member = memberToRemove.rows[0];

    // Remove the member
    await db.query('DELETE FROM team_members WHERE teamId = ? AND userId = ?', [teamId, userId]);

    // Get team and remover details
    const teamResult = await db.query('SELECT teamName FROM teams WHERE id = ?', [teamId]);
    const removerResult = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [req.user.userId]);

    const teamName = teamResult.rows ? teamResult.rows[0].teamName : 'the team';
    const removerName = removerResult.rows ? `${removerResult.rows[0].firstName} ${removerResult.rows[0].lastName}` : 'A team manager';

    // Send removal notification
    await emailService.sendCoachRemovalNotification(member.email, `${member.firstName} ${member.lastName}`, teamName, removerName);

    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
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