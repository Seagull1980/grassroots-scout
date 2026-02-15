import { lazy } from 'react';

// Utility for creating lazy-loaded components with error boundaries
export const createLazyComponent = (
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  displayName?: string
) => {
  const LazyComponent = lazy(importFn);
  // Set displayName for debugging (cast to any to avoid TS error)
  (LazyComponent as any).displayName = displayName || 'LazyComponent';
  return LazyComponent;
};

// Heavy feature imports - load only when needed
export const LazyComponents = {
  // Maps and location features (large bundle)
  MapsPage: createLazyComponent(
    () => import('../pages/MapsPage').then(module => ({ default: module.default })),
    'MapsPage'
  ),
  
  // Analytics and charts (chart.js is heavy)
  PerformanceAnalyticsPage: createLazyComponent(
    () => import('../pages/PerformanceAnalyticsPage'),
    'PerformanceAnalyticsPage'
  ),
  
  // Advanced search features
  EnhancedSearchPage: createLazyComponent(
    () => import('../pages/EnhancedSearchPage'),
    'EnhancedSearchPage'
  ),
  
  // Admin features (not needed for regular users)
  AdminPage: createLazyComponent(
    () => import('../pages/AdminPage'),
    'AdminPage'
  ),
  
  // Team management features
  TeamProfilePage: createLazyComponent(
    () => import('../pages/TeamProfilePage'),
    'TeamProfilePage'
  ),
  
  TeamRosterPage: createLazyComponent(
    () => import('../pages/TeamRosterPage'),
    'TeamRosterPage'
  ),

  TeamManagementPage: createLazyComponent(
    () => import('../pages/TeamManagementPage'),
    'TeamManagementPage'
  ),

  ClubDashboardPage: createLazyComponent(
    () => import('../pages/ClubDashboardPage'),
    'ClubDashboardPage'
  ),
  
  // Match completion features
  MatchCompletionsPage: createLazyComponent(
    () => import('../pages/MatchCompletionsPage'),
    'MatchCompletionsPage'
  ),
  
  // Feedback system
  MyFeedbackPage: createLazyComponent(
    () => import('../pages/MyFeedbackPage'),
    'MyFeedbackPage'
  ),
  
  AdminFeedbackDashboard: createLazyComponent(
    () => import('../pages/AdminFeedbackDashboard'),
    'AdminFeedbackDashboard'
  ),

  AdminFrozenAdvertsPage: createLazyComponent(
    () => import('../pages/AdminFrozenAdvertsPage'),
    'AdminFrozenAdvertsPage'
  ),
  
  AdminSupportPage: createLazyComponent(
    () => import('../pages/AdminSupportPage'),
    'AdminSupportPage'
  ),
  
  // Messaging (potentially large)
  MessagesPage: createLazyComponent(
    () => import('../pages/MessagesPage'),
    'MessagesPage'
  ),
  
  // Success stories
  SuccessStoriesPage: createLazyComponent(
    () => import('../pages/SuccessStoriesPage'),
    'SuccessStoriesPage'
  ),
  
  // User growth features
  AlertPreferencesPage: createLazyComponent(
    () => import('../pages/AlertPreferencesPage'),
    'AlertPreferencesPage'
  ),
  
  RecommendationsPage: createLazyComponent(
    () => import('../pages/RecommendationsPage'),
    'RecommendationsPage'
  ),
  
  // Child management
  ChildPlayerAvailabilityPage: createLazyComponent(
    () => import('../pages/ChildPlayerAvailabilityPage'),
    'ChildPlayerAvailabilityPage'
  ),
  
  ChildrenManagementPage: createLazyComponent(
    () => import('../pages/ChildrenManagementPage'),
    'ChildrenManagementPage'
  ),
  
  // Training features
  TrainingInvitations: createLazyComponent(
    () => import('../components/TrainingInvitations'),
    'TrainingInvitations'
  ),
  
  // TrialManagement: Temporarily disabled due to MUI date picker dependencies
  // TrialManagement: createLazyComponent(
  //   () => import('../components/TrialManagement'),
  //   'TrialManagement'
  // ),

  // Enhanced Analytics Components
  RealTimeAnalyticsDashboard: createLazyComponent(
    () => import('../components/RealTimeAnalyticsDashboard'),
    'RealTimeAnalyticsDashboard'
  ),
  
  AdvancedAnalyticsInsights: createLazyComponent(
    () => import('../components/AdvancedAnalyticsInsights'),
    'AdvancedAnalyticsInsights'
  ),
};

// Preload critical routes based on user role
export const preloadCriticalRoutes = (userRole?: string) => {
  if (userRole === 'Coach') {
    // Preload coach-specific routes
    import('../pages/TeamProfilePage');
    import('../pages/TeamRosterPage');
  } else if (userRole === 'Player') {
    // Preload player-specific routes
    import('../pages/EnhancedSearchPage');
    import('../pages/RecommendationsPage');
  } else if (userRole === 'Parent/Guardian') {
    // Preload parent-specific routes
    import('../pages/ChildrenManagementPage');
    import('../pages/ChildPlayerAvailabilityPage');
  }
};

// Load heavy features on demand
export const loadHeavyFeatures = {
  maps: () => import('../components/MapSearch'),
  analytics: () => import('../pages/PerformanceAnalyticsPage'),
  charts: () => import('chart.js'),
  messaging: () => import('../pages/MessagesPage'),
};
