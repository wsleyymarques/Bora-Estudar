import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StudyProvider } from "@/contexts/StudyContext";
import { AppThemeProvider } from "@/contexts/AppThemeContext";
import { TrackerProvider } from "@/contexts/TrackerContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import AppLayout from "@/layouts/AppLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import SubjectsPage from "@/pages/SubjectsPage";
import SchedulePage from "@/pages/SchedulePage";
import SchedulesPage from "@/pages/SchedulesPage";
import TemplatesPage from "@/pages/TemplatesPage";
import TimerPage from "@/pages/TimerPage";
import HistoryPage from "@/pages/HistoryPage";
import StatsPage from "@/pages/StatsPage";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import ProfileDataPage from "@/pages/ProfileDataPage";
import ProfileGoalsPage from "@/pages/ProfileGoalsPage";
import UpdatePasswordPage from "@/pages/UpdatePasswordPage";
import PlansPage from "@/pages/PlansPage";
import PlanDetailsPage from "@/pages/PlanDetailsPage";
import PlanWizardPage from "@/pages/PlanWizardPage";
import NotFound from "@/pages/NotFound";
import PrivacyPolicyPage from "@/pages/legal/PrivacyPolicyPage";
import TermsOfUsePage from "@/pages/legal/TermsOfUsePage";
import { CookieBanner } from "@/components/legal/CookieBanner";

const queryClient = new QueryClient();

function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}

function ProtectedLayout() {
  return (
    <StudyProvider>
      <NotificationProvider>
        <TrackerProvider>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </TrackerProvider>
      </NotificationProvider>
    </StudyProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes - accessible without authentication */}
      <Route path="/privacidade" element={<PrivacyPolicyPage />} />
      <Route path="/termos" element={<TermsOfUsePage />} />
      <Route path="/auth/*" element={<AuthPage />} />
      
      {/* Protected routes - require authentication */}
      <Route element={<RequireAuth />}>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/new" element={<PlanWizardPage />} />
          <Route path="/plans/:planId" element={<PlanDetailsPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/data" element={<ProfileDataPage />} />
          <Route path="/profile/goals" element={<ProfileGoalsPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Sonner />
        <AuthProvider>
          <AppThemeProvider>
            <BrowserRouter>
              <AppRoutes />
              <CookieBanner />
            </BrowserRouter>
          </AppThemeProvider>
        </AuthProvider>
      </TooltipProvider>
    </NextThemeProvider>
  </QueryClientProvider>
);

export default App;
