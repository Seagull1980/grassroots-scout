import { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { LoadingSpinner as AppLoadingSpinner } from './components/LoadingComponents';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
// import BetaAccessPage from './pages/BetaAccessPage'; // merged into UserAdminPage

// Initialize analytics tracking
import './services/analyticsTracking';

// Optimized imports - Core pages loaded immediately
import DashboardPage from './pages/DashboardPage.tsx';
import PostAdvertPage from './pages/PostAdvertPage.tsx';
import EditAdvertPage from './pages/EditAdvertPage.tsx';
import MyAdvertsPage from './pages/MyAdvertsPage.tsx';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage.tsx';
import AboutManagementPage from './pages/AboutManagementPage.tsx';
import CalendarPage from './pages/CalendarPage.tsx';
import UserAdminPage from './pages/UserAdminPage.tsx';
import Forum from './pages/Forum.tsx';
import ForumPostDetail from './pages/ForumPostDetail.tsx';
import FlaggedContent from './pages/FlaggedContent.tsx';
import TrainingSessionsPage from './pages/TrainingSessionsPage.tsx';
import StartHerePage from './pages/StartHerePage';
import NotFoundPage from './pages/NotFoundPage';
// Import lazy loading utilities
import { LazyComponents } from './utils/lazyLoading';
import { useMobileScrollOptimization, optimizeViewportForMobile } from './utils/performance';
import AdminClubsPage from './pages/AdminClubsPage';
import AdminTeamsPage from './pages/AdminTeamsPage';
import AdminModerationDashboard from './pages/AdminModerationDashboard';
import AdminEmailLogsPage from './pages/AdminEmailLogsPage';

// Heavy features - lazy loaded
const {
  MapsPage,
  PerformanceAnalyticsPage,
  AdminPage,
  TeamProfilePage,
  TeamRosterPage,
  TeamManagementPage,
  InvitationCenter,
  ClubDashboardPage,
  MatchCompletionsPage,
  MyFeedbackPage,
  AdminFeedbackDashboard,
  AdminFrozenAdvertsPage,
  AdminSupportPage,
  AdminSuccessStoriesPage,
  MessagesPage,
  SuccessStoriesPage,
  AlertPreferencesPage,
  RecommendationsPage,
  ChildPlayerAvailabilityPage,
  ChildrenManagementPage,
  FamilyRelationshipsPage,
  TrainingInvitations
} = LazyComponents;

// Analytics components - lazy loaded for better performance
const RealTimeAnalyticsDashboard = LazyComponents.RealTimeAnalyticsDashboard;
const AdvancedAnalyticsInsights = LazyComponents.AdvancedAnalyticsInsights;

// Enhanced loading component
const LoadingSpinner = () => <AppLoadingSpinner text="Loading page..." />;

const RouteTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    const getTitle = () => {
      if (path === '/') return 'The Grassroots Scout';
      if (path.startsWith('/start')) return 'Start Here | The Grassroots Scout';
      if (path.startsWith('/dashboard')) return 'Dashboard | The Grassroots Scout';
      if (path.startsWith('/search')) return 'Search | The Grassroots Scout';
      if (path.startsWith('/messages')) return 'Messages | The Grassroots Scout';
      if (path.startsWith('/maps')) return 'Maps | The Grassroots Scout';
      if (path.startsWith('/profile')) return 'Profile | The Grassroots Scout';
      if (path.startsWith('/post-vacancy')) return 'Post Vacancy | The Grassroots Scout';
      if (path.startsWith('/post-availability')) return 'Post Availability | The Grassroots Scout';
      if (path.startsWith('/my-adverts')) return 'My Adverts | The Grassroots Scout';
      if (path.startsWith('/admin')) return 'Admin | The Grassroots Scout';
      if (path.startsWith('/forum')) return 'Forum | The Grassroots Scout';
      if (path.startsWith('/alert-preferences')) return 'Alert Preferences | The Grassroots Scout';
      return 'The Grassroots Scout';
    };

    document.title = getTitle();
  }, [location.pathname]);

  return null;
};

const AppRoutes = () => {
  const AuthLandingRoute = () => {
    const { user } = useAuth();
    return user ? <Navigate to="/start" replace /> : <HomePage />;
  };

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <ErrorBoundary>
          <Routes>
        <Route path="/" element={<AuthLandingRoute />} />
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
        <Route path="/start" element={
          <ProtectedRoute>
            <StartHerePage />
          </ProtectedRoute>
        } />
        <Route path="/post-advert" element={
          <ProtectedRoute>
            <PostAdvertPage />
          </ProtectedRoute>
        } />
        <Route path="/post-vacancy" element={
          <ProtectedRoute>
            <PostAdvertPage initialPostType="vacancy" />
          </ProtectedRoute>
        } />
        <Route path="/post-availability" element={
          <ProtectedRoute>
            <PostAdvertPage initialPostType="availability" />
          </ProtectedRoute>
        } />
        <Route path="/edit-advert/:id" element={
          <ProtectedRoute>
            <EditAdvertPage />
          </ProtectedRoute>
        } />
        <Route path="/my-adverts" element={
          <ProtectedRoute>
            <MyAdvertsPage />
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
        <Route path="/admin/clubs" element={
          <ProtectedRoute>
            <AdminClubsPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/clubs/:clubName" element={
          <ProtectedRoute>
            <AdminTeamsPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/beta-access" element={
          <ProtectedRoute>
            <UserAdminPage />
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
        <Route path="/invitations" element={
          <ProtectedRoute>
            <InvitationCenter />
          </ProtectedRoute>
        } />
        <Route path="/invitations/:token" element={
          <InvitationTokenHandler />
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
        <Route path="/team-profile/:teamId" element={
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
        <Route path="/family-relationships" element={
          <ProtectedRoute>
            <FamilyRelationshipsPage />
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
        <Route path="/admin/frozen-adverts" element={
          <ProtectedRoute>
            <AdminFrozenAdvertsPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/support" element={
          <ProtectedRoute>
            <AdminSupportPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/email-logs" element={
          <ProtectedRoute>
            <AdminEmailLogsPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/success-stories" element={
          <ProtectedRoute>
            <AdminSuccessStoriesPage />
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
        <Route path="/admin/moderation" element={
          <ProtectedRoute>
            <AdminModerationDashboard />
          </ProtectedRoute>
        } />
        {/* <Route path="/trial-management" element={
          <ProtectedRoute>
            <TrialManagement />
          </ProtectedRoute>
        } /> */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
        </ErrorBoundary>
    </Suspense>
    </>
  );
};

// Component to handle invitation links from emails
const InvitationTokenHandler = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      // Store the token in localStorage for InvitationCenter to use
      localStorage.setItem('invitationToken', token);
      // Redirect to invitations page
      navigate('/invitations');
    }
  }, [token, navigate]);

  return null; // This component doesn't render anything
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
              <RouteTitleManager />
              <ErrorBoundary>
                <Navbar />
              </ErrorBoundary>
              <StorageNotification />
              <ErrorBoundary>
                <AuthDebugger />
              </ErrorBoundary>
              <ErrorBoundary>
                <OnboardingFlow />
              </ErrorBoundary>
              <ErrorBoundary>
                <FeedbackButton />
              </ErrorBoundary>
              <ErrorBoundary>
                <MobileAdminSwitcher 
                  useSpeedDial={true}
                  position={{ bottom: 100, right: 16 }}
                />
              </ErrorBoundary>
              <Box sx={{ pb: { xs: '64px', md: 0 } }}>
                <AppRoutes />
              </Box>
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
