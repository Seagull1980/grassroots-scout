/**
 * Enhanced Analytics API Server
 * Provides comprehensive analytics endpoints with real-time capabilities
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const EventEmitter = require('events');
const DatabaseUtils = require('./utils/dbUtils.js');
require('dotenv').config();

const app = express();
const PORT = process.env.ANALYTICS_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';

// Real-time events emitter
const analyticsEvents = new EventEmitter();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = new DatabaseUtils();

// In-memory storage for real-time data (in production, use Redis)
const realtimeMetrics = {
  activeUsers: new Set(),
  events: [],
  alerts: []
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Helper functions
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const calculateMetrics = (events) => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const recentEvents = events.filter(e => e.timestamp > oneHourAgo);
  
  const pageViews = recentEvents.filter(e => e.event === 'page_view').length;
  const userActions = recentEvents.filter(e => e.event === 'user_action').length;
  const conversions = recentEvents.filter(e => e.event === 'conversion').length;
  const errors = recentEvents.filter(e => e.event === 'error').length;
  
  const uniqueUsers = new Set(recentEvents.map(e => e.userId).filter(Boolean)).size;
  const sessions = new Set(recentEvents.map(e => e.sessionId)).size;
  
  return {
    activeUsers: realtimeMetrics.activeUsers.size,
    pageViews,
    conversionRate: pageViews > 0 ? (conversions / pageViews) * 100 : 0,
    avgSessionDuration: sessions > 0 ? (recentEvents.length / sessions) * 30 : 0, // Approximation
    bounceRate: Math.random() * 30 + 20, // Mock calculation
    errorRate: recentEvents.length > 0 ? (errors / recentEvents.length) * 100 : 0,
    apiResponseTime: Math.floor(Math.random() * 200) + 50,
    newSignups: Math.floor(Math.random() * 5) + 1
  };
};

// Analytics tracking endpoints
app.post('/api/analytics/track', authenticateToken, async (req, res) => {
  try {
    const { events, sessionId, userId } = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }

    // Store events in database
    for (const event of events) {
      const eventData = {
        ...event,
        userId: userId || req.user.id,
        sessionId: sessionId || generateSessionId()
      };

      // Add to in-memory storage for real-time processing
      realtimeMetrics.events.push(eventData);
      
      // Keep only last 1000 events in memory
      if (realtimeMetrics.events.length > 1000) {
        realtimeMetrics.events = realtimeMetrics.events.slice(-1000);
      }

      // Track active users
      if (userId) {
        realtimeMetrics.activeUsers.add(userId);
        // Remove after 5 minutes of inactivity
        setTimeout(() => realtimeMetrics.activeUsers.delete(userId), 5 * 60 * 1000);
      }

      // Emit real-time update
      analyticsEvents.emit('new_event', eventData);

      // Store in database (implement based on your DB schema)
      try {
        await db.runQuery(`
          INSERT INTO analytics_events (
            event, category, action, label, value, 
            user_id, session_id, timestamp, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          event.event,
          event.category,
          event.action,
          event.label,
          event.value,
          eventData.userId,
          eventData.sessionId,
          event.timestamp,
          JSON.stringify(event.metadata || {})
        ]);
      } catch (dbError) {
        console.warn('Failed to store event in database:', dbError);
      }
    }

    // Update metrics and emit
    const updatedMetrics = calculateMetrics(realtimeMetrics.events);
    analyticsEvents.emit('metrics_update', updatedMetrics);

    res.json({ success: true, eventsProcessed: events.length });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Failed to process analytics events' });
  }
});

// Real-time metrics endpoint
app.get('/api/analytics/real-time/metrics', authenticateToken, (req, res) => {
  try {
    const { range = '1h' } = req.query;
    const metrics = calculateMetrics(realtimeMetrics.events);
    res.json(metrics);
  } catch (error) {
    console.error('Real-time metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time metrics' });
  }
});

// Real-time events endpoint
app.get('/api/analytics/real-time/events', authenticateToken, (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const recentEvents = realtimeMetrics.events
      .slice(-parseInt(limit))
      .reverse()
      .map(event => ({
        id: `${event.sessionId}_${event.timestamp}`,
        timestamp: event.timestamp,
        event: event.event,
        userId: event.userId,
        page: event.metadata?.url || event.metadata?.page || 'unknown',
        type: event.event
      }));
    
    res.json(recentEvents);
  } catch (error) {
    console.error('Real-time events error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time events' });
  }
});

// Server-Sent Events for real-time updates
app.get('/api/analytics/real-time/stream', authenticateToken, (req, res) => {
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  // Set up event listeners
  const handleMetricsUpdate = (metrics) => {
    res.write(`data: ${JSON.stringify({ type: 'metrics_update', metrics })}\n\n`);
  };

  const handleNewEvent = (event) => {
    res.write(`data: ${JSON.stringify({ type: 'new_event', event })}\n\n`);
  };

  const handleAlert = (alert) => {
    res.write(`data: ${JSON.stringify({ type: 'alert', alert })}\n\n`);
  };

  analyticsEvents.on('metrics_update', handleMetricsUpdate);
  analyticsEvents.on('new_event', handleNewEvent);
  analyticsEvents.on('alert', handleAlert);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    analyticsEvents.removeListener('metrics_update', handleMetricsUpdate);
    analyticsEvents.removeListener('new_event', handleNewEvent);
    analyticsEvents.removeListener('alert', handleAlert);
  });
});

// Advanced analytics endpoints
app.post('/api/analytics/funnel', authenticateToken, async (req, res) => {
  try {
    const { steps, period } = req.body;
    
    // Mock funnel analysis
    const funnelData = steps.map((step, index) => ({
      step: step.name,
      users: Math.floor(Math.random() * 1000) - (index * 100),
      conversionRate: index === 0 ? 100 : Math.floor(Math.random() * 50) + 20
    }));

    res.json(funnelData);
  } catch (error) {
    console.error('Funnel analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze funnel' });
  }
});

app.post('/api/analytics/cohort', authenticateToken, async (req, res) => {
  try {
    const { period, metric } = req.body;
    
    // Mock cohort analysis
    const cohortData = Array.from({ length: 12 }, (_, i) => ({
      cohort: `Week ${i + 1}`,
      size: Math.floor(Math.random() * 100) + 50,
      retention: Array.from({ length: 8 }, (_, week) => 
        Math.max(0, 100 - (week * 15) + Math.random() * 10)
      )
    }));

    res.json(cohortData);
  } catch (error) {
    console.error('Cohort analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze cohort' });
  }
});

app.get('/api/analytics/user-journey/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    // Get user events from database or memory
    const userEvents = realtimeMetrics.events
      .filter(event => event.userId === userId)
      .slice(-100)
      .map(event => ({
        timestamp: event.timestamp,
        event: event.event,
        page: event.metadata?.url || event.metadata?.page,
        action: event.action,
        category: event.category
      }));

    const journey = {
      userId,
      totalEvents: userEvents.length,
      firstSeen: userEvents.length > 0 ? Math.min(...userEvents.map(e => e.timestamp)) : null,
      lastSeen: userEvents.length > 0 ? Math.max(...userEvents.map(e => e.timestamp)) : null,
      events: userEvents.sort((a, b) => b.timestamp - a.timestamp)
    };

    res.json(journey);
  } catch (error) {
    console.error('User journey error:', error);
    res.status(500).json({ error: 'Failed to fetch user journey' });
  }
});

app.get('/api/analytics/performance', authenticateToken, async (req, res) => {
  try {
    const performanceEvents = realtimeMetrics.events.filter(e => e.category === 'Performance');
    
    const metrics = {
      avgPageLoadTime: performanceEvents.reduce((sum, e) => sum + (e.metadata?.pageLoadTime || 0), 0) / Math.max(performanceEvents.length, 1),
      avgTimeToInteractive: performanceEvents.reduce((sum, e) => sum + (e.metadata?.timeToInteractive || 0), 0) / Math.max(performanceEvents.length, 1),
      errorRate: realtimeMetrics.events.filter(e => e.event === 'error').length / Math.max(realtimeMetrics.events.length, 1) * 100,
      apiResponseTimes: realtimeMetrics.events
        .filter(e => e.metadata?.apiEndpoint)
        .map(e => ({
          endpoint: e.metadata.apiEndpoint,
          responseTime: e.metadata.responseTime || Math.random() * 500,
          timestamp: e.timestamp
        }))
        .slice(-20)
    };

    res.json(metrics);
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

app.get('/api/analytics/alerts', authenticateToken, (req, res) => {
  try {
    res.json(realtimeMetrics.alerts);
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Custom dashboard endpoints
app.post('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const { name, widgets, layout } = req.body;
    
    // Store dashboard configuration
    const dashboard = {
      id: `dashboard_${Date.now()}`,
      userId: req.user.id,
      name,
      widgets,
      layout,
      createdAt: new Date().toISOString()
    };

    // In production, store in database
    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard creation error:', error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

app.get('/api/analytics/dashboards', authenticateToken, async (req, res) => {
  try {
    // Mock dashboards
    const dashboards = [
      {
        id: 'dashboard_1',
        name: 'Main Analytics',
        isDefault: true,
        widgets: ['metrics', 'chart', 'events'],
        createdAt: new Date().toISOString()
      }
    ];

    res.json(dashboards);
  } catch (error) {
    console.error('Dashboards fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
});

// Export endpoints
app.post('/api/analytics/export', authenticateToken, async (req, res) => {
  try {
    const { format, dateRange, metrics } = req.body;
    
    // Generate export data
    const exportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      metrics: realtimeMetrics.events
        .filter(e => metrics.includes(e.event))
        .slice(-1000)
    };

    switch (format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
        
        // Convert to CSV
        const csv = [
          'Timestamp,Event,Category,Action,User ID,Session ID',
          ...exportData.metrics.map(e => 
            `${new Date(e.timestamp).toISOString()},${e.event},${e.category},${e.action},${e.userId || ''},${e.sessionId}`
          )
        ].join('\n');
        
        res.send(csv);
        break;
        
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.json');
        res.json(exportData);
        break;
        
      default:
        res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Health check
app.get('/api/analytics/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Enhanced Analytics API is running',
    activeUsers: realtimeMetrics.activeUsers.size,
    eventsInMemory: realtimeMetrics.events.length
  });
});

// Cleanup old events periodically
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  realtimeMetrics.events = realtimeMetrics.events.filter(e => e.timestamp > oneHourAgo);
  
  // Clear inactive users
  realtimeMetrics.activeUsers.clear();
}, 5 * 60 * 1000); // Every 5 minutes

// Periodic alert generation (demo)
setInterval(() => {
  const metrics = calculateMetrics(realtimeMetrics.events);
  
  // Generate alerts based on thresholds
  if (metrics.errorRate > 5) {
    const alert = {
      id: `alert_${Date.now()}`,
      type: 'error',
      title: 'High Error Rate',
      message: `Error rate is ${metrics.errorRate.toFixed(1)}% - above threshold`,
      timestamp: Date.now(),
      isRead: false,
      actionRequired: true
    };
    
    realtimeMetrics.alerts.unshift(alert);
    analyticsEvents.emit('alert', alert);
  }
  
  if (metrics.apiResponseTime > 500) {
    const alert = {
      id: `alert_${Date.now()}`,
      type: 'warning',
      title: 'Slow API Response',
      message: `API response time is ${metrics.apiResponseTime}ms - performance degraded`,
      timestamp: Date.now(),
      isRead: false,
      actionRequired: false
    };
    
    realtimeMetrics.alerts.unshift(alert);
    analyticsEvents.emit('alert', alert);
  }
  
  // Keep only last 50 alerts
  realtimeMetrics.alerts = realtimeMetrics.alerts.slice(0, 50);
}, 2 * 60 * 1000); // Every 2 minutes

// Error handling
app.use((err, req, res, next) => {
  console.error('Enhanced Analytics API error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Enhanced Analytics API running on port ${PORT}`);
  console.log(`📱 Local access: http://localhost:${PORT}`);
  console.log(`📊 Real-time stream: http://localhost:${PORT}/api/analytics/real-time/stream`);
});

module.exports = app;