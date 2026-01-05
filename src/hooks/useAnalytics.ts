import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsTracking } from '../services/analyticsTracking';

/**
 * Hook for integrating analytics tracking throughout the application
 * Provides easy-to-use methods for tracking user interactions and business events
 */
export const useAnalytics = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      analyticsTracking.setUserId(user.id);
    }
  }, [user]);

  // Page tracking
  const trackPageView = useCallback((page?: string, additionalData?: Record<string, any>) => {
    analyticsTracking.trackPageView(page);
    
    if (additionalData) {
      analyticsTracking.track('page_view_enhanced', {
        category: 'Navigation',
        action: 'page_view_with_context',
        ...additionalData
      });
    }
  }, []);

  // User actions
  const trackUserAction = useCallback((action: string, target: string, additionalData?: Record<string, any>) => {
    analyticsTracking.trackUserAction(action, target, additionalData);
  }, []);

  // Business events
  const trackBusinessEvent = useCallback((eventType: string, data: Record<string, any>) => {
    analyticsTracking.trackBusinessEvent(eventType, data);
  }, []);

  // Feature usage
  const trackFeatureUsage = useCallback((featureName: string, action: string = 'used') => {
    analyticsTracking.trackFeatureUsage(featureName, action);
  }, []);

  // Search tracking
  const trackSearch = useCallback((query: string, filters: any, resultCount: number) => {
    analyticsTracking.trackSearch(query, filters, resultCount);
  }, []);

  // Form interactions
  const trackFormInteraction = useCallback((formName: string, field: string, action: 'focus' | 'blur' | 'submit' | 'error') => {
    analyticsTracking.trackFormInteraction(formName, field, action);
  }, []);

  // Conversions
  const trackConversion = useCallback((goalName: string, value?: number) => {
    analyticsTracking.trackConversion(goalName, value);
  }, []);

  // Error tracking
  const trackError = useCallback((error: Error, context: string = '') => {
    analyticsTracking.trackError(error, context);
  }, []);

  // Performance tracking
  const trackPerformance = useCallback(() => {
    analyticsTracking.trackPerformance();
  }, []);

  // Football-specific tracking methods
  const trackPlayerAction = useCallback((action: string, playerId?: string, additionalData?: Record<string, any>) => {
    trackBusinessEvent('player_action', {
      action,
      playerId,
      userRole: user?.role,
      ...additionalData
    });
  }, [trackBusinessEvent, user?.role]);

  const trackTeamAction = useCallback((action: string, teamId?: string, additionalData?: Record<string, any>) => {
    trackBusinessEvent('team_action', {
      action,
      teamId,
      userRole: user?.role,
      ...additionalData
    });
  }, [trackBusinessEvent, user?.role]);

  const trackMatch = useCallback((action: string, matchData: Record<string, any>) => {
    trackBusinessEvent('match_event', {
      action,
      ...matchData,
      userRole: user?.role
    });
  }, [trackBusinessEvent, user?.role]);

  const trackVacancy = useCallback((action: string, vacancyData: Record<string, any>) => {
    trackBusinessEvent('vacancy_event', {
      action,
      ...vacancyData,
      userRole: user?.role
    });
  }, [trackBusinessEvent, user?.role]);

  const trackPlayerAvailability = useCallback((action: string, availabilityData: Record<string, any>) => {
    trackBusinessEvent('player_availability_event', {
      action,
      ...availabilityData,
      userRole: user?.role
    });
  }, [trackBusinessEvent, user?.role]);

  // User engagement tracking
  const trackEngagement = useCallback((engagementType: string, data?: Record<string, any>) => {
    trackUserAction('engagement', engagementType, {
      timestamp: Date.now(),
      userRole: user?.role,
      ...data
    });
  }, [trackUserAction, user?.role]);

  // Social interactions
  const trackSocialAction = useCallback((action: string, targetType: string, targetId: string) => {
    trackUserAction('social_interaction', action, {
      targetType,
      targetId,
      userRole: user?.role
    });
  }, [trackUserAction, user?.role]);

  // Notification interactions
  const trackNotificationAction = useCallback((action: string, notificationType: string, notificationId?: string) => {
    trackUserAction('notification_interaction', action, {
      notificationType,
      notificationId,
      userRole: user?.role
    });
  }, [trackUserAction, user?.role]);

  // Advanced search tracking
  const trackAdvancedSearch = useCallback((searchData: {
    query: string;
    filters: Record<string, any>;
    resultCount: number;
    searchType: 'team_vacancy' | 'player_availability' | 'general';
    resultsInteracted: number;
  }) => {
    trackSearch(searchData.query, searchData.filters, searchData.resultCount);
    
    trackBusinessEvent('advanced_search', {
      ...searchData,
      userRole: user?.role,
      searchEffectiveness: searchData.resultCount > 0 ? searchData.resultsInteracted / searchData.resultCount : 0
    });
  }, [trackSearch, trackBusinessEvent, user?.role]);

  // Onboarding tracking
  const trackOnboardingStep = useCallback((step: number, stepName: string, completed: boolean) => {
    trackUserAction('onboarding', completed ? 'step_completed' : 'step_started', {
      step,
      stepName,
      userRole: user?.role
    });

    if (completed) {
      trackFeatureUsage('onboarding_flow', `step_${step}_completed`);
    }
  }, [trackUserAction, trackFeatureUsage, user?.role]);

  const trackOnboardingCompletion = useCallback((completionData: {
    totalSteps: number;
    completedSteps: number;
    timeSpent: number;
    skippedSteps: string[];
  }) => {
    trackConversion('onboarding_completed', completionData.completedSteps);
    
    trackBusinessEvent('onboarding_completion', {
      ...completionData,
      completionRate: completionData.completedSteps / completionData.totalSteps,
      userRole: user?.role
    });
  }, [trackConversion, trackBusinessEvent, user?.role]);

  // A/B Testing tracking
  const trackABTest = useCallback((testName: string, variant: string, action: string) => {
    trackUserAction('ab_test', action, {
      testName,
      variant,
      userRole: user?.role
    });
  }, [trackUserAction, user?.role]);

  // Performance monitoring
  const trackPagePerformance = useCallback((pageName: string, metrics: {
    loadTime: number;
    timeToInteractive: number;
    firstContentfulPaint: number;
  }) => {
    trackUserAction('performance', 'page_metrics', {
      pageName,
      ...metrics,
      userRole: user?.role
    });
  }, [trackUserAction, user?.role]);

  // User satisfaction
  const trackUserFeedback = useCallback((feedbackType: string, rating: number, comments?: string) => {
    trackBusinessEvent('user_feedback', {
      feedbackType,
      rating,
      comments,
      userRole: user?.role
    });
  }, [trackBusinessEvent, user?.role]);

  // Session quality
  const trackSessionQuality = useCallback(() => {
    const sessionStats = analyticsTracking.getSessionStats();
    
    trackBusinessEvent('session_quality', {
      sessionDuration: sessionStats.duration,
      eventCount: sessionStats.eventCount,
      userRole: user?.role,
      quality: sessionStats.eventCount > 10 ? 'high' : sessionStats.eventCount > 5 ? 'medium' : 'low'
    });
  }, [trackBusinessEvent, user?.role]);

  // Utility methods
  const getSessionStats = useCallback(() => {
    return analyticsTracking.getSessionStats();
  }, []);

  const generateInsights = useCallback(() => {
    return analyticsTracking.generateInsights();
  }, []);

  return {
    // Core tracking methods
    trackPageView,
    trackUserAction,
    trackBusinessEvent,
    trackFeatureUsage,
    trackSearch,
    trackFormInteraction,
    trackConversion,
    trackError,
    trackPerformance,

    // Football-specific methods
    trackPlayerAction,
    trackTeamAction,
    trackMatch,
    trackVacancy,
    trackPlayerAvailability,

    // Enhanced tracking methods
    trackEngagement,
    trackSocialAction,
    trackNotificationAction,
    trackAdvancedSearch,
    trackOnboardingStep,
    trackOnboardingCompletion,
    trackABTest,
    trackPagePerformance,
    trackUserFeedback,
    trackSessionQuality,

    // Utility methods
    getSessionStats,
    generateInsights
  };
};

/**
 * Hook for automatic page view tracking
 * Use this in components that represent distinct pages
 */
export const usePageTracking = (pageName?: string, additionalData?: Record<string, any>) => {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(pageName, additionalData);
  }, [trackPageView, pageName, additionalData]);
};

/**
 * Hook for tracking feature usage with automatic mounting/unmounting
 */
export const useFeatureTracking = (featureName: string, autoTrack: boolean = true) => {
  const { trackFeatureUsage } = useAnalytics();

  useEffect(() => {
    if (autoTrack) {
      trackFeatureUsage(featureName, 'mounted');
    }

    return () => {
      if (autoTrack) {
        trackFeatureUsage(featureName, 'unmounted');
      }
    };
  }, [trackFeatureUsage, featureName, autoTrack]);

  return { trackFeature: trackFeatureUsage };
};

/**
 * Hook for tracking form interactions automatically
 */
export const useFormTracking = (formName: string) => {
  const { trackFormInteraction } = useAnalytics();

  const trackField = useCallback((fieldName: string, action: 'focus' | 'blur' | 'submit' | 'error') => {
    trackFormInteraction(formName, fieldName, action);
  }, [trackFormInteraction, formName]);

  return { trackField };
};

export default useAnalytics;