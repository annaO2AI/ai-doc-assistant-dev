"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "../../components/dashboard/Sidebar";
import { DashboardProvider } from "../../context/DashboardContext";
import HeaderAISearch from "../../chat-ui/components/Header";
import Breadcrumbs from "../../components/dashboard/Breadcrumbs"; // Import Breadcrumbs component
import PharmacyGenerator from "./PharmacyGenerator";
import clsx from "clsx";

export default function PharmacyGeneratorPage() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  const toggleCollapse = () => {
    const newCollapsed = !collapsed;
    localStorage.setItem("sidebar-collapsed", String(newCollapsed));
    setCollapsed(newCollapsed);
  };

  const isSidebarExpanded = !collapsed || hovered;
  const sidebarWidth = isSidebarExpanded ? 256 : 64;

  // Show sidebar on the talent-acquisition page
   const showSidebar =  pathname === "/mediNote-ai/pharmacy" ;

  return (
    <DashboardProvider>
      <div className="flex overflow-hidden">
        {showSidebar && (
          <Sidebar
            collapsed={collapsed}
            hovered={hovered}
            toggleSidebar={toggleCollapse}
            setHovered={setHovered}
          />
        )}
        <HeaderAISearch sidebarOpen={showSidebar && isSidebarExpanded} />
         <Breadcrumbs sidebarOpen={showSidebar && isSidebarExpanded} />
        <div
          className="flex flex-col flex-1 transition-all duration-300 ease-in-out"
          style={{ marginLeft: showSidebar ? sidebarWidth : 0 }}
        >
          <main     className={clsx("flex-1 overflow-auto p-2 background-chat-ui mt-16")}>
             <PharmacyGenerator defaultOpen={true} showButton={false} fullWidth={true}/>
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}