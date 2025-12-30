"use client"

import HeaderAISearch from "@/app/chat-ui/components/Header"
import Sidebar from "@/app/components/dashboard/Sidebar"
import { DashboardProvider } from "@/app/context/DashboardContext"
import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { TokenDisplay } from "../epic/tokenDisplay"
import { EpicAuthentication } from "../epic/epicAuthentication"
import EOBList from "./eobList" // Import EOBList which manages both list and details
import FooterAISearch from "../../chat-ui/components/Footer";
import Breadcrumbs from "../../components/dashboard/Breadcrumbs"

export default function Page() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [practitionerId, setPractitionerId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load authentication state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("epic_auth_token")
    const savedPractitionerId = localStorage.getItem("epic_practitioner_id")

    if (savedToken && savedPractitionerId) {
      setAuthToken(savedToken)
      setPractitionerId(savedPractitionerId)
    }

    setIsInitialized(true)
  }, [])

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
  const showSidebar = pathname === "/mediNote-ai/epic-eob-search"

  const handleTokenSubmit = (token: string, practitionerId: string) => {
    setAuthToken(token)
    setPractitionerId(practitionerId)
    localStorage.setItem("epic_auth_token", token)
    localStorage.setItem("epic_practitioner_id", practitionerId)
  }

  const handleClearAuth = () => {
    setAuthToken(null)
    setPractitionerId(null)
    localStorage.removeItem("epic_auth_token")
    localStorage.removeItem("epic_practitioner_id")
  }

  if (!isInitialized) {
    return (
      <DashboardProvider>
        <div className="flex overflow-hidden items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardProvider>
    )
  }

  return (
    <DashboardProvider>
      <div className="overflow-hidden">
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
        {!authToken && <EpicAuthentication onTokenSubmit={handleTokenSubmit} />}
        {authToken && (
          <div
            className="flex flex-col flex-1 transition-all duration-300 ease-in-out"
            style={{ marginLeft: showSidebar ? sidebarWidth : 0 }}
          >
            <TokenDisplay token={authToken} onClear={handleClearAuth} />
            
            <div className="flex-1 p-4">
              <EOBList authToken={authToken} />
            </div>
          </div>
        )}
        <FooterAISearch sidebarOpen={showSidebar && isSidebarExpanded} />
      </div>
    </DashboardProvider>
  )
}