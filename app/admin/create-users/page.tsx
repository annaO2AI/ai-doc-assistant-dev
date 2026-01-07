//page.tsx
"use client"
import HeaderAISearch from "@/app/chat-ui/components/Header";
import Sidebar from "@/app/components/dashboard/Sidebar";
import { DashboardProvider } from "@/app/context/DashboardContext";
import React, { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Breadcrumbs from "@/app/components/dashboard/Breadcrumbs";
import FooterAISearch from "../../chat-ui/components/Footer";

import CreateUserForm from "./CreateUserForm"

export default function Page() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [hovered, setHovered] = useState(false)

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed")
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === "true")
    }
  }, [])

  const toggleCollapse = () => {
    const newCollapsed = !collapsed
    localStorage.setItem("sidebar-collapsed", String(newCollapsed))
    setCollapsed(newCollapsed)
  }

  const isSidebarExpanded = !collapsed || hovered
  const sidebarWidth = isSidebarExpanded ? 256 : 64
  const showSidebar = pathname === "/admin/create-users"

  return (
    <DashboardProvider>
      <div className="overflow-hidden mt-12">
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
          <main>
            <CreateUserForm />
          </main>
        </div>
        <FooterAISearch sidebarOpen={showSidebar && isSidebarExpanded} />
      </div>
    </DashboardProvider>
  )
}
