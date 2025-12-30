"use client"
import HeaderAISearch from "@/app/chat-ui/components/Header";
import Sidebar from "@/app/components/dashboard/Sidebar";
import { DashboardProvider } from "@/app/context/DashboardContext";
import React, { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TranscriptionSummary } from "../types";
import { TokenDisplay } from "../epic/tokenDisplay";
import { EpicAuthentication } from "../epic/epicAuthentication";
import EpicPatientHistory from "./epicPatientHistory";
import FooterAISearch from "../../chat-ui/components/Footer";
import Breadcrumbs from "../../components/dashboard/Breadcrumbs";

export interface recordingProps {
  patientId: string | number
  practitionerId: any
  patientName: string
  practitionerName: string
  patientMId: string
}

type AppState = "patientCheck" | "transcription" | "summary"

export default function Page() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const icdRef = useRef<HTMLDivElement>(null)
  const [sessionId, setSessionId] = useState<number>()
  const [patientId, setPatientId] = useState<number>()
  const [patientMId, setPatientMId] = useState<string>()
  const [doctorId, setDoctorId] = useState<string>()
  const [patientName, setPatientName] = useState<string>("")
  const [doctorName, setDoctorName] = useState<string>("")
  const [currentState, setCurrentState] = useState<AppState>("patientCheck")
  const [transcriptionEnd, setTranscriptionEnd] = useState<TranscriptionSummary | null>(null)
  const [showICDGenerator, setShowICDGenerator] = useState(false)
  const [epicCounters, setEpicCounters] = useState<any[]>([])
  const [practitionerId, setPractitionerId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showPatientSearch, setShowPatientSearch] = useState(true)
  const [currentView, setCurrentView] = useState<"patients" | "medications">("patients")
  const [medicationSearchPatient, setMedicationSearchPatient] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem("epic_auth_token")
      const savedPractitionerId = localStorage.getItem("epic_practitioner_id")

      if (savedToken && savedPractitionerId) {
        setAuthToken(savedToken)
        setPractitionerId(savedPractitionerId)
      }
    }
    
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCollapsed = localStorage.getItem("sidebar-collapsed")
      if (savedCollapsed !== null) {
        setCollapsed(savedCollapsed === "true")
      }
    }
  }, [])

  const toggleCollapse = () => {
    const newCollapsed = !collapsed
    if (typeof window !== 'undefined') {
      localStorage.setItem("sidebar-collapsed", String(newCollapsed))
    }
    setCollapsed(newCollapsed)
  }

  const isSidebarExpanded = !collapsed || hovered
  const sidebarWidth = isSidebarExpanded ? 256 : 64
  const showSidebar = pathname === "/mediNote-ai/epic-patient-history"

  const handleTokenSubmit = (token: string, practitionerId: string) => {
    setAuthToken(token)
    setPractitionerId(practitionerId)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem("epic_auth_token", token)
      localStorage.setItem("epic_practitioner_id", practitionerId)
    }
  }

  const handleClearAuth = () => {
    setAuthToken(null)
    setPractitionerId(null)
    setSelectedPatient(null)
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem("epic_auth_token")
      localStorage.removeItem("epic_practitioner_id")
    }
    
    // Reset other states
    setCurrentState("patientCheck")
    setSessionId(undefined)
    setPatientId(undefined)
    setPatientMId(undefined)
    setDoctorId(undefined)
    setPatientName("")
    setDoctorName("")
    setTranscriptionEnd(null)
    setShowICDGenerator(false)
    setEpicCounters([])
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
              <EpicPatientHistory
                authToken={authToken}
                onSelectPatient={handleSelectPatient}
                selectedPatient={selectedPatient}
              />
            </div>
          </div>
        )}
        <FooterAISearch sidebarOpen={showSidebar && isSidebarExpanded} />
      </div>
    </DashboardProvider>
  )
}