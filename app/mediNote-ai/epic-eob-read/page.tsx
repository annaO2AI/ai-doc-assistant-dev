"use client"
import HeaderAISearch from "@/app/chat-ui/components/Header";
import Sidebar from "@/app/components/dashboard/Sidebar";
import { DashboardProvider } from "@/app/context/DashboardContext";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TokenDisplay } from "../epic/tokenDisplay";
import { EpicAuthentication } from "../epic/epicAuthentication";
import { EOBDisplay } from "./eobDisplay";
import { EOBData } from "../types";
import FooterAISearch from "../../chat-ui/components/Footer";
import Breadcrumbs from "../../components/dashboard/Breadcrumbs";

export default function Page() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [practitionerId, setPractitionerId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [eobData, setEobData] = useState<EOBData | null>(null)
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

  // Fetch EOB data when auth token is available
  useEffect(() => {
    if (authToken) {
      fetchEOBData();
    }
  }, [authToken])

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed")
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === "true")
    }
  }, [])

  const fetchEOBData = async () => {
    if (!authToken) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/eob/eW3fiTdz5NQ07OSglGVVHZQ3?token_id=${authToken}&demo=true`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch EOB data: ${response.statusText}`);
      }

      const data: EOBData = await response.json();
      setEobData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch EOB data');
      console.error('Error fetching EOB data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollapse = () => {
    const newCollapsed = !collapsed
    localStorage.setItem("sidebar-collapsed", String(newCollapsed))
    setCollapsed(newCollapsed)
  }

  const isSidebarExpanded = !collapsed || hovered
  const sidebarWidth = isSidebarExpanded ? 256 : 64
  const showSidebar = pathname === "/mediNote-ai/epic-eob-read"

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
    setEobData(null)
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
            className="flex flex-col flex-1 transition-all duration-300 ease-in-out "
            style={{ marginLeft: showSidebar ? sidebarWidth : 0 }}
          >
            <TokenDisplay token={authToken} onClear={handleClearAuth} />
            
            <div className="flex-1 p-4">
              {loading && (
                <div className="flex items-center justify-center min-h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <div className="text-red-600 font-medium">Error: {error}</div>
                    <button 
                      onClick={fetchEOBData}
                      className="ml-auto bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
              
              {eobData && !loading && (
                <EOBDisplay eobData={eobData} />
              )}
            </div>
          </div>
        )}
        <FooterAISearch sidebarOpen={showSidebar && isSidebarExpanded} />
      </div>
    </DashboardProvider>
  )
}