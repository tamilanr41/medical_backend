"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import SiteFooter from "./SiteFooter";
import RouteProgress from "./RouteProgress";
import GlobalSearch from "./GlobalSearch";

/**
 * Authenticated application shell shared by every signed-in route:
 * header, compact navigation drawer, route progress, global module search
 * and the footer.
 */
export default function AppShell({ user, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <RouteProgress />

      <Header
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
        onSearchClick={() => setPaletteOpen(true)}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <SiteFooter />

      {paletteOpen ? (
        <GlobalSearch user={user} onClose={() => setPaletteOpen(false)} />
      ) : null}
    </div>
  );
}
