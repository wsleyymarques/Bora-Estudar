import { BarChart3, BookOpen, Calendar, History, LayoutDashboard, Settings, Timer } from "lucide-react";

export const navigationItems = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "Cronograma", url: "/schedule", icon: Calendar },
  { title: "Matérias", url: "/subjects", icon: BookOpen },
  { title: "Timer", url: "/timer", icon: Timer },
  { title: "Histórico", url: "/history", icon: History },
  { title: "Stats", url: "/stats", icon: BarChart3 },
  { title: "Config", url: "/settings", icon: Settings },
] as const;
