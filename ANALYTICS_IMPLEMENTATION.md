# 📊 Advanced Analytics Implementation

This document outlines the comprehensive analytics system implemented for The Grassroots Scout application.

## 🚀 Overview

The analytics implementation provides:
- **Real-time Analytics Dashboard** - Live metrics and user activity monitoring
- **Advanced Analytics Insights** - AI-powered insights and recommendations
- **Comprehensive Event Tracking** - Automatic user behavior and business event tracking
- **Performance Monitoring** - Application performance and error tracking
- **Football-Specific Metrics** - Player, team, and match analytics

## 🏗️ Architecture

### Frontend Components
- `src/services/analyticsTracking.ts` - Core analytics tracking service
- `src/hooks/useAnalytics.ts` - React hooks for easy analytics integration
- `src/components/RealTimeAnalyticsDashboard.tsx` - Real-time metrics dashboard
- `src/components/AdvancedAnalyticsInsights.tsx` - AI insights and funnel analysis

### Backend Services
- `backend/enhanced-analytics-api.js` - Enhanced analytics API (Port 3002)
- `backend/analytics-server.js` - Basic analytics server (Port 3001)
- `backend/analytics-schema.txt` - Database schema for analytics tables

## 📈 Features Implemented

### 1. Real-Time Analytics Dashboard
- **Live Metrics**: Active users, page views, conversions, error rates
- **Real-Time Events Feed**: Live stream of user actions
- **Performance Monitoring**: API response times, page load speeds
- **Alert System**: Automated alerts for anomalies and thresholds
- **Server-Sent Events**: Real-time data streaming

**Access**: `/analytics/real-time` (Admin only)

### 2. Advanced Analytics Insights
- **AI-Powered Insights**: Trend analysis, anomaly detection, predictions
- **Conversion Funnel Analysis**: Step-by-step conversion tracking
- **User Segmentation**: Behavioral user grouping and analysis
- **Cohort Retention Analysis**: User retention heatmaps
- **Actionable Recommendations**: Data-driven improvement suggestions

**Access**: `/analytics/insights` (Admin only)

### 3. Comprehensive Event Tracking
- **Automatic Tracking**: Page views, clicks, form interactions
- **Business Events**: Player actions, team events, match completions
- **Performance Metrics**: Load times, API responses, errors
- **User Engagement**: Session quality, feature usage
- **Football-Specific**: Vacancy posts, player availability, training events

### 4. Analytics Hooks & Integration
```typescript
// Easy integration in any component
const { trackUserAction, trackConversion } = useAnalytics();

// Track specific actions
trackUserAction('search', 'player_search', { query: 'goalkeeper' });
trackConversion('player_contact', 1);

// Football-specific tracking
trackPlayerAction('profile_viewed', playerId);
trackVacancy('application_submitted', vacancyData);
```

## 🛠️ Technical Implementation

### Database Schema
The analytics system uses the following key tables:
- `analytics_events` - Core event tracking
- `user_sessions` - Session analytics
- `page_analytics` - Page-specific metrics
- `performance_metrics` - Application performance
- `business_metrics` - Football-specific analytics
- `feature_usage` - Feature adoption tracking
- `search_analytics` - Search behavior analysis

### Real-Time Architecture
```
Frontend → Analytics Tracking Service → Enhanced Analytics API → SQLite Database
                                    ↓
Real-Time Dashboard ← Server-Sent Events ← Event Processing Engine
```

### Event Processing
1. **Client-Side Tracking**: Automatic event collection
2. **Batch Processing**: Events sent in batches for efficiency
3. **Real-Time Processing**: Immediate metrics updates
4. **Alerting System**: Automated threshold monitoring
5. **Data Persistence**: SQLite storage with indexing

## 📊 Analytics Capabilities

### Real-Time Metrics
- Active users count
- Page views per minute
- Conversion rates
- Session duration averages
- Error rates and API response times
- New user registrations

### Business Intelligence
- **Player Analytics**: Profile views, search appearances, contact rates
- **Team Analytics**: Vacancy post performance, application rates
- **Match Analytics**: Completion rates, user engagement
- **Search Analytics**: Query analysis, filter usage, result interactions

### User Behavior Analysis
- **Journey Mapping**: Complete user flow analysis
- **Funnel Analysis**: Conversion step optimization
- **Cohort Analysis**: User retention patterns
- **Segmentation**: Behavioral user grouping

### Performance Monitoring
- Page load times and Core Web Vitals
- API endpoint response times
- JavaScript error tracking
- Resource loading failures
- Network performance metrics

## 🎯 Key Benefits

### For Administrators
- **Real-Time Monitoring**: Live application health and user activity
- **Data-Driven Decisions**: Comprehensive insights for strategic planning
- **Performance Optimization**: Identify and fix bottlenecks quickly
- **User Experience Insights**: Understand user behavior patterns

### For Development Team
- **Error Tracking**: Automatic error detection and logging
- **Performance Metrics**: Identify slow pages and API endpoints
- **Feature Usage**: Track adoption of new features
- **A/B Testing Support**: Built-in testing framework

### For Business Growth
- **Conversion Optimization**: Funnel analysis for better conversions
- **User Retention**: Cohort analysis for retention strategies
- **Market Insights**: Understanding user preferences and trends
- **ROI Tracking**: Measure effectiveness of features and campaigns

## 📱 Usage Examples

### Track Page Views
```typescript
// Automatic tracking
usePageTracking('/search', { searchType: 'players' });

// Manual tracking
trackPageView('/team-profile', { teamId: '123' });
```

### Track Business Events
```typescript
// Player-related events
trackPlayerAction('profile_viewed', playerId, { source: 'search' });
trackPlayerAction('contact_initiated', playerId);

// Team-related events
trackTeamAction('vacancy_posted', teamId, { position: 'goalkeeper' });
trackVacancy('application_received', { vacancyId, applicantId });
```

### Track Conversions
```typescript
// Track goal completions
trackConversion('user_registration');
trackConversion('player_contact_made', 1);
trackConversion('team_application_submitted');
```

### Monitor Performance
```typescript
// Automatic performance tracking
trackPerformance(); // Called on page load

// Custom performance metrics
trackPagePerformance('search-page', {
  loadTime: 1500,
  timeToInteractive: 2000,
  firstContentfulPaint: 800
});
```

## 🔧 Configuration

### Environment Variables
```bash
ANALYTICS_PORT=3002
JWT_SECRET=your-secret-key
```

### Frontend Configuration
```typescript
// Enable/disable analytics
analyticsTracking.setTrackingEnabled(true);

// Configure batch size and flush interval
const config = {
  batchSize: 10,
  flushInterval: 30000
};
```

## 🚀 Getting Started

1. **Backend Setup**:
   ```bash
   cd backend
   node enhanced-analytics-api.js
   ```

2. **Database Schema**:
   - Import `analytics-schema.txt` into your SQLite database

3. **Frontend Integration**:
   - Analytics tracking is automatically initialized in `App.tsx`
   - Use `useAnalytics()` hook in components for custom tracking

4. **Access Dashboards**:
   - Real-time Dashboard: `http://localhost:5173/analytics/real-time`
   - Advanced Insights: `http://localhost:5173/analytics/insights`

## 📋 Current Status

✅ **Implemented**:
- Real-time analytics dashboard with live metrics
- Advanced insights with AI-powered recommendations
- Comprehensive event tracking system
- Analytics hooks for easy integration
- Enhanced backend API with real-time streaming
- Database schema for analytics data
- Navigation integration in main app

⚡ **Running Services**:
- Frontend: `http://localhost:5173`
- Main Backend: `http://localhost:3001`
- Analytics API: `http://localhost:3002`
- WebSocket Notifications: `http://localhost:8080`

🎯 **Ready for Testing**:
- Login as Admin to access analytics dashboards
- All tracking is automatically enabled
- Real-time data updates every 30 seconds
- Export functionality available for data analysis

This comprehensive analytics implementation provides The Grassroots Scout with enterprise-level insights and monitoring capabilities, enabling data-driven decision making and continuous optimization of the user experience.

## 🧭 Landing & Auth CTA Event Dictionary

The following events were added to measure pre-login conversion intent on the public landing page and top navigation.

### 1) `user_action` with `action = landing_cta_click`
**Where fired**:
- Homepage hero buttons
- Homepage role quick links
- Homepage feature card buttons

**Key properties**:
- `target`: CTA identifier (for example `hero_create_account`, `hero_role_start_coach`, `feature_for_players`)
- `section`: `hero` | `hero_role_links` | `feature_cards`
- `destination`: route user is sent to
- `roleIntent`: role-oriented intent when applicable (for example `Coach`, `Player`, `Parent/Guardian`)
- `isLoggedIn`: boolean
- `page`: `home`

### 2) `conversion` with `goalName = landing_register_intent`
**Where fired**:
- Homepage CTA click that routes to `/register...` for logged-out users

**Purpose**:
- Normalized conversion-intent counter for landing-driven registration starts

### 3) `user_action` with `action = auth_cta_click`
**Where fired**:
- Logged-out desktop navbar `Login` and `Sign Up`
- Logged-out mobile top bar `Login` and `Sign Up`

**Key properties**:
- `target`: `login` | `signup`
- `placement`: `desktop_topbar` | `mobile_topbar`
- `page`: current pathname
- `isLoggedIn`: boolean

### 4) `conversion` with `goalName = navbar_signup_intent`
**Where fired**:
- Logged-out navbar/topbar `Sign Up` click

**Purpose**:
- Normalized conversion-intent counter for navigation-led signup starts

### Recommended reporting cuts
- Compare `landing_register_intent` vs `navbar_signup_intent` by day/week
- Segment `landing_cta_click` by `section` to identify highest-converting surface
- Segment `landing_cta_click` by `roleIntent` to validate audience demand mix
- Compare desktop vs mobile via `placement` on `auth_cta_click`

## 🧮 Weekly SQL / Query Cheat Sheet

Use these example queries against the `analytics_events` table to monitor landing page conversion intent and CTA performance.

### 1) Daily register intent trend (landing vs navbar)
```sql
SELECT
   date(datetime(timestamp / 1000, 'unixepoch')) AS day,
   SUM(CASE WHEN event = 'conversion' AND json_extract(metadata, '$.goalName') = 'landing_register_intent' THEN 1 ELSE 0 END) AS landing_register_intent,
   SUM(CASE WHEN event = 'conversion' AND json_extract(metadata, '$.goalName') = 'navbar_signup_intent' THEN 1 ELSE 0 END) AS navbar_signup_intent
FROM analytics_events
WHERE timestamp >= (strftime('%s', 'now', '-30 days') * 1000)
GROUP BY day
ORDER BY day;
```

### 2) Landing CTA clicks by section
```sql
SELECT
   json_extract(metadata, '$.section') AS section,
   COUNT(*) AS clicks
FROM analytics_events
WHERE event = 'user_action'
   AND action = 'landing_cta_click'
   AND timestamp >= (strftime('%s', 'now', '-30 days') * 1000)
GROUP BY section
ORDER BY clicks DESC;
```

### 3) Landing CTA clicks by role intent
```sql
SELECT
   COALESCE(json_extract(metadata, '$.roleIntent'), 'unknown') AS role_intent,
   COUNT(*) AS clicks
FROM analytics_events
WHERE event = 'user_action'
   AND action = 'landing_cta_click'
   AND timestamp >= (strftime('%s', 'now', '-30 days') * 1000)
GROUP BY role_intent
ORDER BY clicks DESC;
```

### 4) Top landing CTA targets
```sql
SELECT
   label AS cta_target,
   COUNT(*) AS clicks
FROM analytics_events
WHERE event = 'user_action'
   AND action = 'landing_cta_click'
   AND timestamp >= (strftime('%s', 'now', '-30 days') * 1000)
GROUP BY cta_target
ORDER BY clicks DESC
LIMIT 20;
```

### 5) Auth CTA clicks by placement (desktop vs mobile)
```sql
SELECT
   json_extract(metadata, '$.placement') AS placement,
   label AS cta,
   COUNT(*) AS clicks
FROM analytics_events
WHERE event = 'user_action'
   AND action = 'auth_cta_click'
   AND timestamp >= (strftime('%s', 'now', '-30 days') * 1000)
GROUP BY placement, cta
ORDER BY placement, clicks DESC;
```

### 6) Rough signup intent rate from landing CTA clicks
```sql
WITH landing_clicks AS (
   SELECT COUNT(*) AS c
   FROM analytics_events
   WHERE event = 'user_action'
      AND action = 'landing_cta_click'
      AND timestamp >= (strftime('%s', 'now', '-30 days') * 1000)
),
landing_signups AS (
   SELECT COUNT(*) AS c
   FROM analytics_events
   WHERE event = 'conversion'
      AND json_extract(metadata, '$.goalName') = 'landing_register_intent'
      AND timestamp >= (strftime('%s', 'now', '-30 days') * 1000)
)
SELECT
   landing_clicks.c AS landing_clicks,
   landing_signups.c AS landing_register_intents,
   CASE WHEN landing_clicks.c = 0 THEN 0.0 ELSE ROUND((landing_signups.c * 1.0 / landing_clicks.c) * 100, 2) END AS intent_rate_percent
FROM landing_clicks, landing_signups;
```

### 7) Last 50 raw CTA events for QA
```sql
SELECT
   datetime(timestamp / 1000, 'unixepoch') AS ts,
   event,
   action,
   label,
   json_extract(metadata, '$.section') AS section,
   json_extract(metadata, '$.destination') AS destination,
   json_extract(metadata, '$.placement') AS placement,
   json_extract(metadata, '$.roleIntent') AS role_intent,
   json_extract(metadata, '$.goalName') AS goal_name
FROM analytics_events
WHERE (event = 'user_action' AND action IN ('landing_cta_click', 'auth_cta_click'))
    OR (event = 'conversion' AND json_extract(metadata, '$.goalName') IN ('landing_register_intent', 'navbar_signup_intent'))
ORDER BY timestamp DESC
LIMIT 50;
```

### Notes
- These examples assume `timestamp` is stored as Unix milliseconds.
- If your schema stores `goalName` outside metadata, replace `json_extract(metadata, '$.goalName')` with the correct column.
- Start with 7-day windows for daily monitoring and 30-day windows for trend baselines.

## ✅ Admin Weekly KPI Checklist

Use this checklist during the weekly admin analytics review (recommended: Monday morning).

### 1) Conversion intent snapshot
- Run: Query #1 (daily landing vs navbar signup intent)
- Check:
   - Is `landing_register_intent` up, flat, or down vs previous week?
   - Is `navbar_signup_intent` unusually dominating (can indicate landing CTA weakness)?
- Flag if:
   - Weekly total intent drops by >15% week-over-week.

### 2) Landing surface effectiveness
- Run: Query #2 (by section), Query #4 (top CTA targets)
- Check:
   - Are hero CTA clicks still the top contributor?
   - Did role-specific CTAs lose share after recent copy/UI changes?
- Flag if:
   - Hero section contributes <40% of total landing CTA clicks for 2 consecutive weeks.

### 3) Role demand mix
- Run: Query #3 (role intent)
- Check:
   - Coach / Player / Parent intent split trends
   - Any sudden drop in Parent intent after flow or copy updates
- Flag if:
   - Any role drops >20% week-over-week without expected seasonality.

### 4) Device-placement friction (auth)
- Run: Query #5 (auth CTA by placement)
- Check:
   - `mobile_topbar` signup clicks vs desktop
   - Login-heavy behavior on mobile with weak signup share
- Flag if:
   - Mobile signup clicks are <50% of mobile login clicks for 2+ weeks.

### 5) Intent rate health
- Run: Query #6 (rough landing intent rate)
- Check:
   - Is intent rate trending stable or improving?
- Flag if:
   - Intent rate declines >10% vs trailing 4-week average.

### 6) Instrumentation QA
- Run: Query #7 (last 50 raw CTA events)
- Check:
   - Event names, sections, destinations, and placement values are populated correctly
   - No broken/empty `destination` or malformed role labels
- Flag if:
   - >5% of sampled rows are missing expected metadata.

### 7) Admin action log (what to record each week)
- Keep a short note with:
   - Week start date
   - Top 3 KPI changes (up/down)
   - Suspected cause (release, copy change, seasonal)
   - Action decided (A/B test, copy update, UI adjustment)
   - Owner and due date

### 8) Escalation rules
- Escalate to product/engineering this week if any of the following occur:
   - Total register intent drops >20% week-over-week
   - Parent intent drops >25% week-over-week
   - Mobile signup intent is down for 2 consecutive weeks
   - Tracking metadata quality fails QA checks

## 🤖 Automated Admin KPI Reports

Weekly admin KPI reporting can now run automatically from the backend cron service.

### What it does
- Reads the last 14 days of relevant analytics events
- Compares the last completed 7-day period against the prior 7-day period
- Generates:
   - Markdown report for admins
   - JSON report for downstream tooling or dashboards
- Writes outputs to:
   - `backend/reports/admin-kpi/latest.md`
   - `backend/reports/admin-kpi/latest.json`
   - dated historical files in the same folder

### Default schedule
- Every Monday at 08:00 server time

### Environment controls
```bash
ENABLE_ADMIN_KPI_AUTOMATION=true
ADMIN_KPI_REPORT_CRON=0 8 * * 1
```

Notes:
- Set `ENABLE_ADMIN_KPI_AUTOMATION=false` to disable the weekly job.
- Override `ADMIN_KPI_REPORT_CRON` if you want a different schedule.

### Manual generation
```bash
npm run analytics:admin-kpi-report
```

Optional:
```bash
node backend/scripts/generate-admin-kpi-report.cjs --anchor-date 2026-04-07
node backend/scripts/generate-admin-kpi-report.cjs --json
```

### Best use for admins
- Let the cron job create the report automatically each week.
- Review `latest.md` during the weekly admin analytics check-in.
- Use `latest.json` if you later want to surface the same report in an internal admin page.