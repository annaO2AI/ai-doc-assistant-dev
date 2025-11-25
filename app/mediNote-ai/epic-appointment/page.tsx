"use client"
import HeaderAISearch from "@/app/chat-ui/components/Header"
import Sidebar from "@/app/components/dashboard/Sidebar"
import { DashboardProvider } from "@/app/context/DashboardContext"
import React, { useRef, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { AppointmentAuthentication } from "./appointmentAuthentication"
import { AppointmentTokenDisplay } from "./appointmentTokenDisplay"
import { AppointmentSearchForm } from "./appointmentSearchForm"
import { APIService } from "../service/api"
import { TranscriptionSummary } from "../types"

export interface recordingProps {
  patientId: string | number
  practitionerId: any
  patientName: string
  practitionerName: string
  patientMId: string
}

type AppState = "patientCheck"

export default function AppointmentPage() {
  const icdRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [patientName, setPatientName] = useState<string>("")
  const [doctorName, setDoctorName] = useState<string>("")
  const [currentState, setCurrentState] = useState<AppState>("patientCheck")
  const [transcriptionEnd, setTranscriptionEnd] =
    useState<TranscriptionSummary | null>(null)
  const [showICDGenerator, setShowICDGenerator] = useState(false)
  const [epicCounters, setEpicCounters] = useState<any[]>([])
  const [practitionerId, setPractitionerId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [fhirUser, setFhirUser] = useState<string | null>(null)

  // Load authentication state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("appointment_auth_token")
    
    if (savedToken) {
      setAuthToken(savedToken)
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
  const showSidebar = pathname === "/mediNote-ai/epic-appointment"

  const handleTokenSubmit = (token: string, patientId: string | null, fhirUser: string | null) => {
    setAuthToken(token)
    localStorage.setItem("appointment_auth_token", token)
    if (patientId) localStorage.setItem("appointment_patient_id", patientId)
    if (fhirUser) localStorage.setItem("appointment_fhir_user", fhirUser)
  }

  const handleClearAuth = () => {
    setAuthToken(null)
    setPractitionerId(null)
    setFhirUser(null)
    localStorage.removeItem("appointment_auth_token")
    localStorage.removeItem("appointment_patient_id")
    localStorage.removeItem("appointment_fhir_user")
    // Reset other states
    setCurrentState("patientCheck")
    setPatientName("")
    setDoctorName("")
    setTranscriptionEnd(null)
    setShowICDGenerator(false)
    setEpicCounters([])
  }

  // Don't render until initialization is complete
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
        {!authToken && <AppointmentAuthentication onTokenSubmit={handleTokenSubmit} />}
        {authToken && (
          <div
            className="flex flex-col flex-1 transition-all duration-300 ease-in-out"
            style={{ marginLeft: showSidebar ? sidebarWidth : 0 }}
          >
            <AppointmentTokenDisplay
              token={authToken}
              fhirUser={fhirUser ?? null}
              onClear={handleClearAuth}
            />
            <div className="flex-1 overflow-auto p-6">
              <AppointmentSearchForm 
                tokenId={authToken}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardProvider>
  )
}