import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Layers, BarChart3, History } from "lucide-react";

const mobileItems = [
  { title: "Início", url: "/", icon: LayoutDashboard, iconImage: '/assets/media__1779561373778.png' },
  { title: "Planos", url: "/plans", icon: Layers, iconImage: '/assets/media__1779561369461.png' },
  { title: "Estatísticas", url: "/stats", icon: BarChart3, iconImage: '/assets/media__1779561368073.png' },
  { title: "Sessões", url: "/history", icon: History, iconImage: '/icon-history.png' },
];

export function BottomNavigator() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-4 ">
        {mobileItems.map((item) => {
          const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
          return (
            <li key={item.url}>
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  isActive ? "text-sky-500" : "text-muted-foreground"
                }`}
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  {item.iconImage ? (
                    <img 
                      src={item.iconImage} 
                      alt={item.title} 
                      className={`w-full h-full object-contain transition-transform ${isActive ? "scale-110" : "opacity-80 grayscale-[30%]"}`} 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <item.icon className={`h-5 w-5 ${item.iconImage ? 'hidden' : ''}`} />
                </div>
                <span>{item.title}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
