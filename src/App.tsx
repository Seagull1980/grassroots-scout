import { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LoadingSpinner as AppLoadingSpinner } from './components/LoadingComponents';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import theme from './theme/theme';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import StorageNotification from './components/StorageNotification';
import MobileAdminSwitcher from './components/MobileAdminSwitcher';
import FeedbackButton from './components/FeedbackButton';
import ErrorBoundary from './components/ErrorBoundary';
import AuthDebugger from './components/AuthDebugger';
import { OnboardingFlow } from './components/OnboardingFlow';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import EmailVerificationPendingPage from './pages/EmailVerificationPendingPage.tsx';
import EmailVerificationPage from './pages/EmailVerificationPage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import BetaAccessDenied from './pages/BetaAccessDenied';
import BetaAccessPage from './pages/BetaAccessPage';

// Initialize analytics tracking
import './services/analyticsTracking';

// Optimized imports - Core pages loaded immediately
import DashboardPage from './pages/DashboardPage.tsx';
import PostAdvertPage from './pages/PostAdvertPage.tsx';
import SearchPage from './pages/SearchPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import AboutManagementPage from './pages/AboutManagementPage.tsx';
import CalendarPage from './pages/CalendarPage.tsx';
import UserAdminPage from './pages/UserAdminPage.tsx';
import Forum from './pages/Forum.tsx';
import ForumPostDetail from './pages/ForumPostDetail.tsx';
import FlaggedContent from './pages/FlaggedContent.tsx';
import TrainingSessionsPage from './pages/TrainingSessionsPage.tsx';
import MapsPage from './pages/MapsPage.tsx';

// Import lazy loading utilities
import { LazyComponents } from './utils/lazyLoading';
import { useMobileScrollOptimization, optimizeViewportForMobile } from './utils/performance';

// Heavy features - lazy loaded
const {
  PerformanceAnalyticsPage,
  EnhancedSearchPage,
  AdminPage,
  TeamProfilePage,
  TeamRosterPage,
  TeamManagementPage,
  ClubDashboardPage,
  MatchCompletionsPage,
  MyFeedbackPage,
  AdminFeedbackDashboard,
  MessagesPage,
  SuccessStoriesPage,
  AlertPreferencesPage,
  RecommendationsPage,
  ChildPlayerAvailabilityPage,
  ChildrenManagementPage,
  TrainingInvitations
} = LazyComponents;

// Analytics components - lazy loaded for better performance
const RealTimeAnalyticsDashboard = LazyComponents.RealTimeAnalyticsDashboard;
const AdvancedAnalyticsInsights = LazyComponents.AdvancedAnalyticsInsights;

// Enhanced loading component
const LoadingSpinner = () => <AppLoadingSpinner text="Loading page..." />;

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={
          <ProtectedRoute requireAuth={false}>
            <LoginPage />
          </ProtectedRoute>
        } />
        <Route path="/register" element={
          <ProtectedRoute requireAuth={false}>
            <RegisterPage />
          </ProtectedRoute>
        } />
        <Route path="/email-verification-pending" element={
          <ProtectedRoute requireAuth={false}>
            <EmailVerificationPendingPage />
          </ProtectedRoute>
        } />
        <Route path="/verify-email/:token" element={
          <ProtectedRoute requireAuth={false}>
            <EmailVerificationPage />
          </ProtectedRoute>
        } />
        <Route path="/forgot-password" element={
          <ProtectedRoute requireAuth={false}>
            <ForgotPasswordPage />
          </ProtectedRoute>
        } />
        <Route path="/reset-password/:token" element={
          <ProtectedRoute requireAuth={false}>
            <ResetPasswordPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/post-advert" element={
          <ProtectedRoute>
            <PostAdvertPage />
          </ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute>
            <UserAdminPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/beta-access" element={
          <ProtectedRoute>
            <BetaAccessPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/about" element={
          <ProtectedRoute>
            <AboutManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/beta-access-denied" element={<BetaAccessDenied />} />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        } />
        <Route path="/maps" element={
          <ProtectedRoute>
            <MapsPage />
          </ProtectedRoute>
        } />
        <Route path="/team-roster" element={
          <ProtectedRoute>
            <TeamRosterPage />
          </ProtectedRoute>
        } />
        <Route path="/team-management" element={
          <ProtectedRoute>
            <TeamManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/training-sessions" element={
          <ProtectedRoute>
            <TrainingSessionsPage />
          </ProtectedRoute>
        } />
        <Route path="/club-dashboard/:clubName" element={
          <ProtectedRoute>
            <ClubDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/team-profile" element={
          <ProtectedRoute>
            <TeamProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/children" element={
          <ProtectedRoute>
            <ChildrenManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/child-player-availability" element={
          <ProtectedRoute>
            <ChildPlayerAvailabilityPage />
          </ProtectedRoute>
        } />
        <Route path="/match-completions" element={
          <ProtectedRoute>
            <MatchCompletionsPage />
          </ProtectedRoute>
        } />
        <Route path="/my-feedback" element={
          <ProtectedRoute>
            <MyFeedbackPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/feedback" element={
          <ProtectedRoute>
            <AdminFeedbackDashboard />
          </ProtectedRoute>
        } />
        <Route path="/success-stories" element={
          <ProtectedRoute>
            <SuccessStoriesPage />
          </ProtectedRoute>
        } />
        <Route path="/performance-analytics" element={
          <ProtectedRoute>
            <PerformanceAnalyticsPage />
          </ProtectedRoute>
        } />
        <Route path="/analytics/real-time" element={
          <ProtectedRoute>
            <RealTimeAnalyticsDashboard />
          </ProtectedRoute>
        } />
        <Route path="/analytics/insights" element={
          <ProtectedRoute>
            <AdvancedAnalyticsInsights />
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        } />
        <Route path="/alert-preferences" element={
          <ProtectedRoute>
            <AlertPreferencesPage />
          </ProtectedRoute>
        } />
        <Route path="/recommendations" element={
          <ProtectedRoute>
            <RecommendationsPage />
          </ProtectedRoute>
        } />
        <Route path="/enhanced-search" element={
          <ProtectedRoute>
            <EnhancedSearchPage />
          </ProtectedRoute>
        } />
        <Route path="/training-invitations" element={
          <ProtectedRoute>
            <TrainingInvitations />
          </ProtectedRoute>
        } />
        <Route path="/forum" element={<Forum />} />
        <Route path="/forum/:postId" element={<ForumPostDetail />} />
        <Route path="/admin/flagged-content" element={
          <ProtectedRoute>
            <FlaggedContent />
          </ProtectedRoute>
        } />
        {/* <Route path="/trial-management" element={
          <ProtectedRoute>
            <TrialManagement />
          </ProtectedRoute>
        } /> */}
      </Routes>
    </Suspense>
  );
};

function App() {
  // Mobile optimizations
  useMobileScrollOptimization();

  // Optimize viewport on mount
  useEffect(() => {
    optimizeViewportForMobile();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <NotificationProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Navbar />
              <StorageNotification />
              <AuthDebugger />
              <OnboardingFlow />
              <FeedbackButton />
              <MobileAdminSwitcher 
                useSpeedDial={true}
                position={{ bottom: 100, right: 16 }}
              />
              <AppRoutes />
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
