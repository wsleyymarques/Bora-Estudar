import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Layers, BarChart3, Settings } from "lucide-react";

const mobileItems = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "Planos", url: "/plans", icon: Layers },
  { title: "Estatísticas", url: "/stats", icon: BarChart3 },
];

export function BottomNavigator() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-3 ">
        {mobileItems.map((item) => {
          const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
          return (
            <li key={item.url}>
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
