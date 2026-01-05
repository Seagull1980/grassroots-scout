-- Enhanced Analytics Database Schema
-- SQLite schema for comprehensive analytics tracking

-- Analytics Events Table - Core event tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    value INTEGER,
    user_id INTEGER,
    session_id VARCHAR(100) NOT NULL,
    timestamp BIGINT NOT NULL,
    metadata TEXT, -- JSON string for additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_event (event),
    INDEX idx_category (category),
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_timestamp (timestamp),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- User Sessions Table - Session tracking and analytics
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER,
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    duration INTEGER, -- in seconds
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_start_time (start_time),
    INDEX idx_duration (duration),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Page Analytics - Page-specific metrics
CREATE TABLE IF NOT EXISTS page_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    date DATE NOT NULL,
    unique_visitors INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    avg_time_on_page INTEGER DEFAULT 0, -- in seconds
    bounce_rate DECIMAL(5,2) DEFAULT 0.00,
    exit_rate DECIMAL(5,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    load_time_avg INTEGER DEFAULT 0, -- in milliseconds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(page_path, date),
    INDEX idx_page_path (page_path),
    INDEX idx_date (date),
    INDEX idx_page_views (page_views)
);

-- User Behavior Funnel - Conversion funnel tracking
CREATE TABLE IF NOT EXISTS conversion_funnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funnel_name VARCHAR(100) NOT NULL,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    user_id INTEGER,
    session_id VARCHAR(100),
    completed_at BIGINT NOT NULL,
    time_to_complete INTEGER, -- seconds from funnel start
    metadata TEXT, -- JSON for additional context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_funnel_name (funnel_name),
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_completed_at (completed_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- A/B Testing Results
CREATE TABLE IF NOT EXISTS ab_test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name VARCHAR(100) NOT NULL,
    variant VARCHAR(50) NOT NULL,
    user_id INTEGER,
    session_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    value DECIMAL(10,2),
    timestamp BIGINT NOT NULL,
    metadata TEXT, -- JSON for test-specific data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_test_name (test_name),
    INDEX idx_variant (variant),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Performance Metrics - Application performance tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type VARCHAR(50) NOT NULL,
    page_path VARCHAR(500),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    timestamp BIGINT NOT NULL,
    user_id INTEGER,
    session_id VARCHAR(100),
    device_info TEXT, -- JSON for device/browser info
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_metric_type (metric_type),
    INDEX idx_page_path (page_path),
    INDEX idx_timestamp (timestamp),
    INDEX idx_user_id (user_id)
);

-- Error Tracking
CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    page_path VARCHAR(500),
    user_id INTEGER,
    session_id VARCHAR(100),
    timestamp BIGINT NOT NULL,
    browser_info TEXT, -- JSON for browser/device info
    resolved BOOLEAN DEFAULT FALSE,
    severity VARCHAR(20) DEFAULT 'error',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_error_type (error_type),
    INDEX idx_page_path (page_path),
    INDEX idx_timestamp (timestamp),
    INDEX idx_resolved (resolved),
    INDEX idx_severity (severity)
);

-- User Engagement Metrics
CREATE TABLE IF NOT EXISTS user_engagement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    session_count INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    pages_visited INTEGER DEFAULT 0,
    actions_taken INTEGER DEFAULT 0,
    features_used TEXT, -- JSON array of features used
    engagement_score DECIMAL(5,2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, date),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date),
    INDEX idx_engagement_score (engagement_score),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Business Metrics - Football-specific analytics
CREATE TABLE IF NOT EXISTS business_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type VARCHAR(50) NOT NULL, -- 'player_action', 'team_action', 'match_event', etc.
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2),
    string_value TEXT,
    user_id INTEGER,
    target_type VARCHAR(50), -- 'player', 'team', 'match', 'vacancy'
    target_id VARCHAR(100),
    timestamp BIGINT NOT NULL,
    metadata TEXT, -- JSON for additional context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_metric_type (metric_type),
    INDEX idx_metric_name (metric_name),
    INDEX idx_user_id (user_id),
    INDEX idx_target_type (target_type),
    INDEX idx_timestamp (timestamp),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Analytics Alerts - System-generated alerts
CREATE TABLE IF NOT EXISTS analytics_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metric_name VARCHAR(100),
    threshold_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    triggered_at BIGINT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER,
    acknowledged_at BIGINT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at BIGINT,
    metadata TEXT, -- JSON for alert-specific data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_alert_type (alert_type),
    INDEX idx_severity (severity),
    INDEX idx_triggered_at (triggered_at),
    INDEX idx_acknowledged (acknowledged),
    INDEX idx_resolved (resolved)
);

-- User Cohorts - Cohort analysis
CREATE TABLE IF NOT EXISTS user_cohorts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cohort_name VARCHAR(100) NOT NULL,
    cohort_period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    cohort_date DATE NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at BIGINT NOT NULL,
    last_active BIGINT,
    is_retained BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cohort_name (cohort_name),
    INDEX idx_cohort_date (cohort_date),
    INDEX idx_user_id (user_id),
    INDEX idx_joined_at (joined_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Feature Usage Tracking
CREATE TABLE IF NOT EXISTS feature_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id INTEGER,
    session_id VARCHAR(100),
    timestamp BIGINT NOT NULL,
    duration INTEGER, -- time spent using feature in seconds
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata TEXT, -- JSON for feature-specific data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_feature_name (feature_name),
    INDEX idx_action (action),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Search Analytics
CREATE TABLE IF NOT EXISTS search_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL, -- 'team_vacancy', 'player_availability', 'general'
    filters TEXT, -- JSON of applied filters
    result_count INTEGER NOT NULL,
    clicked_results INTEGER DEFAULT 0,
    user_id INTEGER,
    session_id VARCHAR(100),
    timestamp BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_search_type (search_type),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_result_count (result_count),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Analytics Dashboards - Custom dashboard configurations
CREATE TABLE IF NOT EXISTS analytics_dashboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    widgets TEXT NOT NULL, -- JSON array of widget configurations
    layout TEXT, -- JSON layout configuration
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_is_default (is_default),
    INDEX idx_is_public (is_public),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Analytics Insights - AI-generated insights and recommendations
CREATE TABLE IF NOT EXISTS analytics_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    insight_type VARCHAR(50) NOT NULL, -- 'trend', 'anomaly', 'prediction', 'recommendation'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence DECIMAL(5,2) NOT NULL, -- 0-100
    impact VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
    category VARCHAR(50) NOT NULL,
    actionable BOOLEAN DEFAULT FALSE,
    data TEXT, -- JSON data supporting the insight
    generated_at BIGINT NOT NULL,
    expires_at BIGINT,
    viewed BOOLEAN DEFAULT FALSE,
    acted_upon BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_insight_type (insight_type),
    INDEX idx_impact (impact),
    INDEX idx_category (category),
    INDEX idx_generated_at (generated_at),
    INDEX idx_actionable (actionable)
);

-- Create views for common analytics queries
CREATE VIEW IF NOT EXISTS daily_active_users AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users
FROM user_sessions 
WHERE user_id IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE VIEW IF NOT EXISTS page_performance AS
SELECT 
    page_path,
    COUNT(*) as total_views,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(CASE 
        WHEN JSON_EXTRACT(metadata, '$.pageLoadTime') IS NOT NULL 
        THEN CAST(JSON_EXTRACT(metadata, '$.pageLoadTime') AS INTEGER)
        ELSE NULL 
    END) as avg_load_time
FROM analytics_events 
WHERE event = 'page_view'
GROUP BY page_path
ORDER BY total_views DESC;

CREATE VIEW IF NOT EXISTS conversion_funnel_summary AS
SELECT 
    funnel_name,
    step_number,
    step_name,
    COUNT(DISTINCT user_id) as users,
    COUNT(*) as completions,
    AVG(time_to_complete) as avg_completion_time
FROM conversion_funnels
GROUP BY funnel_name, step_number, step_name
ORDER BY funnel_name, step_number;

-- Triggers for automatic data maintenance
CREATE TRIGGER IF NOT EXISTS update_session_stats
AFTER INSERT ON analytics_events
BEGIN
    UPDATE user_sessions 
    SET 
        events_count = events_count + 1,
        page_views = CASE 
            WHEN NEW.event = 'page_view' THEN page_views + 1 
            ELSE page_views 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = NEW.session_id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_engagement
AFTER INSERT ON analytics_events
WHEN NEW.user_id IS NOT NULL
BEGIN
    INSERT OR REPLACE INTO user_engagement (
        user_id, date, session_count, pages_visited, actions_taken, updated_at
    )
    SELECT 
        NEW.user_id,
        DATE(NEW.created_at),
        COUNT(DISTINCT session_id),
        SUM(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END),
        COUNT(*),
        CURRENT_TIMESTAMP
    FROM analytics_events 
    WHERE user_id = NEW.user_id 
    AND DATE(created_at) = DATE(NEW.created_at);
END;