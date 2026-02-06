/**
 * Enhanced Analytics Tracking Service
 * Provides comprehensive event tracking, user behavior analytics, and performance monitoring
 */

import { API_URL } from './api';

const API_BASE_URL = API_URL;

interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface UserBehavior {
  pageViews: string[];
  clickEvents: { element: string; page: string; timestamp: number }[];
  formInteractions: { form: string; field: string; action: string; timestamp: number }[];
  searchQueries: { query: string; filters: any; results: number; timestamp: number }[];
  sessionDuration: number;
  bounceRate: boolean;
}

interface PerformanceMetrics {
  pageLoadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  bundleSize: number;
  apiResponseTimes: { endpoint: string; duration: number; timestamp: number }[];
}

class AnalyticsTrackingService {
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private startTime: number;
  private isTrackingEnabled: boolean = true;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  // private debounceTimeout?: NodeJS.Timeout; // reserved for future debounce logic

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private initializeTracking(): void {
    // Set up automatic event tracking
    this.trackPageView();
    this.setupClickTracking();
    this.setupFormTracking();
    this.setupPerformanceTracking();
    this.setupErrorTracking();
    this.setupUserEngagement();

    // Auto-flush events periodically
    setInterval(() => this.flushEvents(), this.flushInterval);

    // Flush events when user leaves
    window.addEventListener('beforeunload', () => this.flushEvents());
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushEvents();
      }
    });
  }

  // Core tracking methods
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public track(event: string, properties: Record<string, any> = {}): void {
    if (!this.isTrackingEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      category: properties.category || 'General',
      action: properties.action || event,
      label: properties.label,
      value: properties.value,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      metadata: { ...properties, userAgent: navigator.userAgent, url: window.location.href }
    };

    this.events.push(analyticsEvent);

    // Flush if batch is full
    if (this.events.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  // Page tracking
  public trackPageView(page?: string): void {
    const currentPage = page || window.location.pathname;
    this.track('page_view', {
      category: 'Navigation',
      action: 'page_view',
      label: currentPage,
      page: currentPage,
      referrer: document.referrer,
      title: document.title
    });
  }

  // User engagement tracking
  public trackUserAction(action: string, target: string, additionalData: Record<string, any> = {}): void {
    this.track('user_action', {
      category: 'Engagement',
      action,
      label: target,
      ...additionalData
    });
  }

  // Search tracking
  public trackSearch(query: string, filters: any, resultCount: number): void {
    this.track('search', {
      category: 'Search',
      action: 'search_performed',
      label: query,
      value: resultCount,
      filters,
      query
    });
  }

  // Form tracking
  public trackFormInteraction(formName: string, field: string, action: 'focus' | 'blur' | 'submit' | 'error'): void {
    this.track('form_interaction', {
      category: 'Forms',
      action: `form_${action}`,
      label: `${formName}_${field}`,
      formName,
      field
    });
  }

  // Error tracking
  public trackError(error: Error, context: string = ''): void {
    this.track('error', {
      category: 'Errors',
      action: 'javascript_error',
      label: error.message,
      context,
      stack: error.stack,
      severity: 'error'
    });
  }

  // Performance tracking
  public trackPerformance(): void {
    if (!window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const metrics = {
      pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      timeToInteractive: navigation.loadEventEnd - navigation.fetchStart,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
    };

    this.track('performance', {
      category: 'Performance',
      action: 'page_performance',
      ...metrics
    });
  }

  // Business metrics tracking
  public trackBusinessEvent(eventType: string, data: Record<string, any>): void {
    this.track('business_event', {
      category: 'Business',
      action: eventType,
      label: data.label || eventType,
      ...data
    });
  }

  // Conversion tracking
  public trackConversion(goalName: string, value?: number): void {
    this.track('conversion', {
      category: 'Conversions',
      action: 'goal_completed',
      label: goalName,
      value,
      goalName
    });
  }

  // Feature usage tracking
  public trackFeatureUsage(featureName: string, action: string = 'used'): void {
    this.track('feature_usage', {
      category: 'Features',
      action: `feature_${action}`,
      label: featureName,
      featureName
    });
  }

  // Setup automatic tracking
  private setupClickTracking(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const clickData: Record<string, any> = {
        category: 'Interaction',
        action: 'click',
        element: tagName,
        page: window.location.pathname
      };

      // Add specific data based on element type
      if (target.id) clickData.elementId = target.id;
      if (target.className) clickData.elementClass = target.className;
      if (tagName === 'button') clickData.buttonText = target.textContent;
      if (tagName === 'a') clickData.linkHref = (target as HTMLAnchorElement).href;

      this.track('click', clickData);
    });
  }

  private setupFormTracking(): void {
    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackFormInteraction(form.name || form.id || 'unknown', 'form', 'submit');
    });

    // Track form field interactions
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') {
        const form = target.closest('form') as HTMLFormElement;
        const formName = form?.name || form?.id || 'unknown';
        const fieldName = (target as HTMLInputElement).name || (target as HTMLInputElement).id || 'unknown';
        this.trackFormInteraction(formName, fieldName, 'focus');
      }
    });
  }

  private setupPerformanceTracking(): void {
    // Track performance metrics when page loads
    window.addEventListener('load', () => {
      setTimeout(() => this.trackPerformance(), 1000);
    });

    // Track resource loading errors
    window.addEventListener('error', (event) => {
      this.track('resource_error', {
        category: 'Performance',
        action: 'resource_load_error',
        label: event.filename || 'unknown',
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });
  }

  private setupErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.trackError(event.error, 'window_error');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), 'unhandled_promise_rejection');
    });
  }

  private setupUserEngagement(): void {
    let isActive = true;
    let idleTimer: ReturnType<typeof setTimeout>;
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      if (!isActive) {
        isActive = true;
        this.track('user_active', {
          category: 'Engagement',
          action: 'user_became_active'
        });
      }
      
      idleTimer = setTimeout(() => {
        isActive = false;
        this.track('user_idle', {
          category: 'Engagement',
          action: 'user_became_idle'
        });
      }, 30000); // 30 seconds of inactivity
    };

    // Track user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();
  }

  // Data management
  private async flushEvents(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionId: this.sessionId,
          userId: this.userId
        })
      });

      if (!response.ok) {
        console.warn('Failed to send analytics events:', response.statusText);
        // Re-add events to queue for retry
        this.events.unshift(...eventsToSend);
      }
    } catch (error) {
      console.warn('Analytics tracking error:', error);
      // Re-add events to queue for retry
      this.events.unshift(...eventsToSend);
    }
  }

  private getAuthToken(): string {
    return localStorage.getItem('token') || '';
  }

  // Utility methods
  public getSessionStats(): {
    sessionId: string;
    duration: number;
    eventCount: number;
    userId?: string;
  } {
    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.startTime,
      eventCount: this.events.length,
      userId: this.userId
    };
  }

  public setTrackingEnabled(enabled: boolean): void {
    this.isTrackingEnabled = enabled;
    if (!enabled) {
      this.events = [];
    }
  }

  public clearSession(): void {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  // Analytics insights
  public generateInsights(): {
    topPages: string[];
    mostUsedFeatures: string[];
    conversionFunnelData: any[];
    performanceIssues: string[];
  } {
    const pageViews = this.events.filter(e => e.event === 'page_view');
    const featureUsage = this.events.filter(e => e.event === 'feature_usage');
    const performanceEvents = this.events.filter(e => e.category === 'Performance');

    return {
      topPages: this.getTopItems(pageViews, 'label'),
      mostUsedFeatures: this.getTopItems(featureUsage, 'label'),
      conversionFunnelData: this.generateConversionFunnel(),
      performanceIssues: this.identifyPerformanceIssues(performanceEvents)
    };
  }

  private getTopItems(events: AnalyticsEvent[], field: string): string[] {
    const counts = events.reduce((acc, event) => {
      const key = (event as any)[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key]) => key);
  }

  private generateConversionFunnel(): any[] {
    // Implement conversion funnel analysis
    return [];
  }

  private identifyPerformanceIssues(events: AnalyticsEvent[]): string[] {
    const issues: string[] = [];
    
    const loadTimes = events
      .filter(e => e.action === 'page_performance')
      .map(e => e.metadata?.pageLoadTime)
      .filter(t => typeof t === 'number');

    if (loadTimes.length > 0) {
      const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      if (avgLoadTime > 3000) {
        issues.push('Slow page load times detected');
      }
    }

    return issues;
  }
}

// Create singleton instance
const analyticsTracking = new AnalyticsTrackingService();

export { analyticsTracking, AnalyticsTrackingService };
export type { AnalyticsEvent, UserBehavior, PerformanceMetrics };
