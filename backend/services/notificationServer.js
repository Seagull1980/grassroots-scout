const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class NotificationServer {
  constructor(server, jwtSecret) {
    this.wss = new WebSocket.Server({ 
      port: 8080,
      verifyClient: this.verifyClient.bind(this)
    });
    this.jwtSecret = jwtSecret;
    this.connections = new Map(); // userId -> Set of connections
    this.userSessions = new Map(); // connectionId -> user info
    
    this.setupEventHandlers();
    console.log('🔔 Notification WebSocket server started on port 8080');
  }

  verifyClient(info) {
    try {
      const url = new URL(info.req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('❌ WebSocket authentication failed: No token provided');
        return false;
      }
      
      jwt.verify(token, this.jwtSecret);
      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('⏰ WebSocket authentication failed: Token expired at', error.expiredAt);
      } else if (error.name === 'JsonWebTokenError') {
        console.log('❌ WebSocket authentication failed: Invalid token -', error.message);
      } else {
        console.log('❌ WebSocket authentication failed:', error.message);
      }
      return false;
    }
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  handleConnection(ws, req) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      const user = jwt.verify(token, this.jwtSecret);
      
      const connectionId = uuidv4();
      const userInfo = {
        id: user.id,
        role: user.role,
        email: user.email,
        connectionId,
        connectedAt: new Date()
      };

      // Store connection mapping
      this.userSessions.set(connectionId, userInfo);
      
      if (!this.connections.has(user.id)) {
        this.connections.set(user.id, new Set());
      }
      this.connections.get(user.id).add(connectionId);

      ws.connectionId = connectionId;
      ws.userId = user.id;
      ws.userRole = user.role;

      console.log(`✅ User ${user.email} connected (${user.role})`);

      // Send welcome message
      this.sendToConnection(connectionId, {
        type: 'WELCOME',
        message: 'Connected to Grassroots Hub notifications',
        timestamp: new Date().toISOString()
      });

      // Handle messages from client
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleClientMessage(connectionId, message);
        } catch (error) {
          console.error('Invalid message from client:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnection(connectionId);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(connectionId);
      });

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(heartbeat);
        }
      }, 30000);

    } catch (error) {
      console.error('Connection setup failed:', error);
      ws.close();
    }
  }

  handleClientMessage(connectionId, message) {
    const userInfo = this.userSessions.get(connectionId);
    if (!userInfo) return;

    switch (message.type) {
      case 'SUBSCRIBE_TO_AREA':
        this.subscribeToArea(connectionId, message.data);
        break;
      case 'SUBSCRIBE_TO_LEAGUE':
        this.subscribeToLeague(connectionId, message.data);
        break;
      case 'MARK_READ':
        this.markNotificationRead(connectionId, message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  handleDisconnection(connectionId) {
    const userInfo = this.userSessions.get(connectionId);
    if (userInfo) {
      const userConnections = this.connections.get(userInfo.id);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) {
          this.connections.delete(userInfo.id);
        }
      }
      this.userSessions.delete(connectionId);
      console.log(`❌ User ${userInfo.email} disconnected`);
    }
  }

  // Notification methods
  sendToUser(userId, notification) {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return false;

    let sent = false;
    userConnections.forEach(connectionId => {
      if (this.sendToConnection(connectionId, notification)) {
        sent = true;
      }
    });
    return sent;
  }

  sendToConnection(connectionId, notification) {
    const userInfo = this.userSessions.get(connectionId);
    if (!userInfo) return false;

    const connection = Array.from(this.wss.clients).find(
      client => client.connectionId === connectionId
    );

    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify({
        id: uuidv4(),
        ...notification,
        timestamp: new Date().toISOString()
      }));
      return true;
    }
    return false;
  }

  // Broadcast to all users with specific role
  sendToRole(role, notification) {
    let count = 0;
    this.userSessions.forEach((userInfo, connectionId) => {
      if (userInfo.role === role) {
        if (this.sendToConnection(connectionId, notification)) {
          count++;
        }
      }
    });
    return count;
  }

  // Broadcast to all connected users
  broadcast(notification) {
    let count = 0;
    this.userSessions.forEach((userInfo, connectionId) => {
      if (this.sendToConnection(connectionId, notification)) {
        count++;
      }
    });
    return count;
  }

  // Specific notification types
  notifyNewTeamVacancy(vacancy, targetUsers = []) {
    const notification = {
      type: 'NEW_TEAM_VACANCY',
      title: `New ${vacancy.position} Position Available`,
      message: `${vacancy.title} in ${vacancy.league}`,
      data: {
        vacancyId: vacancy.id,
        league: vacancy.league,
        ageGroup: vacancy.ageGroup,
        position: vacancy.position,
        location: vacancy.location
      },
      action: {
        type: 'NAVIGATE',
        url: `/search?tab=0&highlightId=${vacancy.id}`
      }
    };

    if (targetUsers.length > 0) {
      targetUsers.forEach(userId => this.sendToUser(userId, notification));
    } else {
      // Send to all players and parents
      this.sendToRole('Player', notification);
      this.sendToRole('Parent/Guardian', notification);
    }
  }

  notifyPlayerInterest(player, vacancy) {
    const notification = {
      type: 'PLAYER_INTEREST',
      title: 'New Player Interest',
      message: `${player.firstName} ${player.lastName} is interested in your ${vacancy.position} position`,
      data: {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        vacancyId: vacancy.id,
        position: vacancy.position
      },
      action: {
        type: 'NAVIGATE',
        url: `/messages`
      }
    };

    this.sendToUser(vacancy.postedBy, notification);
  }

  notifyMatchCompletion(completion) {
    const notification = {
      type: 'MATCH_COMPLETION',
      title: 'Match Completion Pending',
      message: `Please confirm the match result for ${completion.homeTeam} vs ${completion.awayTeam}`,
      data: {
        completionId: completion.id,
        homeTeam: completion.homeTeam,
        awayTeam: completion.awayTeam,
        matchDate: completion.matchDate
      },
      action: {
        type: 'NAVIGATE',
        url: `/match-completions`
      }
    };

    // Notify relevant coaches
    if (completion.targetUsers) {
      completion.targetUsers.forEach(userId => this.sendToUser(userId, notification));
    }
  }

  notifyTrialInvitation(invitation) {
    const notification = {
      type: 'TRIAL_INVITATION',
      title: 'Trial Invitation Received',
      message: `You've been invited to a trial with ${invitation.teamName}`,
      data: {
        invitationId: invitation.id,
        teamName: invitation.teamName,
        trialDate: invitation.trialDate,
        location: invitation.location
      },
      action: {
        type: 'NAVIGATE',
        url: `/dashboard`
      }
    };

    this.sendToUser(invitation.playerId, notification);
  }

  // Subscription management
  subscribeToArea(connectionId, { latitude, longitude, radius }) {
    const userInfo = this.userSessions.get(connectionId);
    if (!userInfo) return;

    // Store area subscription for this user
    userInfo.areaSubscription = { latitude, longitude, radius };
    console.log(`📍 User ${userInfo.email} subscribed to area notifications`);
  }

  subscribeToLeague(connectionId, { league, ageGroup }) {
    const userInfo = this.userSessions.get(connectionId);
    if (!userInfo) return;

    // Store league subscription for this user
    userInfo.leagueSubscription = { league, ageGroup };
    console.log(`⚽ User ${userInfo.email} subscribed to ${league} notifications`);
  }

  markNotificationRead(connectionId, { notificationId }) {
    // In a full implementation, you'd store this in the database
    console.log(`✅ Notification ${notificationId} marked as read`);
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: this.userSessions.size,
      uniqueUsers: this.connections.size,
      connectionsByRole: Array.from(this.userSessions.values()).reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

module.exports = NotificationServer;