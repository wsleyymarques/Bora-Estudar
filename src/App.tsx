import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import PlansPage from "@/pages/PlansPage";
import PlanDetailsPage from "@/pages/PlanDetailsPage";
import PlanWizardPage from "@/pages/PlanWizardPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <AuthPage />;

  return (
    <StudyProvider>
      <NotificationProvider>
        <TrackerProvider>
          <AppLayout>
            <Routes>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </TrackerProvider>
      </NotificationProvider>
    </StudyProvider>
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
            </BrowserRouter>
          </AppThemeProvider>
        </AuthProvider>
      </TooltipProvider>
    </NextThemeProvider>
  </QueryClientProvider>
);

export default App;
