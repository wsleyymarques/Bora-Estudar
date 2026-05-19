import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Falha ao registrar service worker:", error);
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => void registration.unregister());
    });
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => void caches.delete(key));
      });
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
