import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetCallerUserRole, useIsCallerApproved, useGetCallerStudentProfile, useGetCallerTeacherProfile } from './hooks/useQueries';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RegistrationPage from './pages/RegistrationPage';
import ApprovalPendingScreen from './components/ApprovalPendingScreen';
import { UserRole } from './backend';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
  const { data: userRole, isLoading: roleLoading } = useGetCallerUserRole();
  const { data: isApproved, isLoading: approvalLoading } = useIsCallerApproved();
  const { data: studentProfile, isLoading: studentProfileLoading } = useGetCallerStudentProfile();
  const { data: teacherProfile, isLoading: teacherProfileLoading } = useGetCallerTeacherProfile();

  const isAuthenticated = !!identity;
  const isAdmin = userRole === UserRole.admin;

  // Determine which dashboard to show
  const renderContent = () => {
    if (!isAuthenticated) {
      return <LandingPage />;
    }

    if (isInitializing || profileLoading || roleLoading || approvalLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }

    // If no user profile, show registration
    if (!userProfile) {
      return <RegistrationPage />;
    }

    // If user has profile but no role-specific profile, show registration
    if (userRole === UserRole.user && !studentProfileLoading && !teacherProfileLoading && !studentProfile && !teacherProfile) {
      return <RegistrationPage />;
    }

    // If not admin and not approved, show pending screen
    if (!isAdmin && isApproved === false) {
      return <ApprovalPendingScreen />;
    }

    // Show appropriate dashboard based on role
    if (isAdmin) {
      return <AdminDashboard />;
    }

    // Determine if user is teacher or student
    if (teacherProfile) {
      return <TeacherDashboard />;
    }

    return <StudentDashboard />;
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          {renderContent()}
        </main>
        <Footer />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
