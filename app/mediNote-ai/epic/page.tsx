//page.tsx
"use client"
import HeaderAISearch from "@/app/chat-ui/components/Header"
import Sidebar from "@/app/components/dashboard/Sidebar"
import { DashboardProvider } from "@/app/context/DashboardContext"
import React, { useRef, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { EpicAuthentication } from "./epicAuthentication"
import { TokenDisplay } from "./tokenDisplay"
import CheckPatientAndDoctor from "./checkPatientAndDoctor"
import { APIService } from "../service/api"
import TranscriptionComponent from "../NewTrans/TranscriptionComponent"
import ICDGenerator from "../icd-code-generator/ICDGenerator"
import { TranscriptionSummary } from "../types"
import { sampleData } from "../transcription-summary/Summary"
import EpicGenerateSummary from "./epicGenerateSummary"
import FooterAISearch from "../../chat-ui/components/Footer";

export interface recordingProps {
  patientId: string | number
  practitionerId: any
  patientName: string
  practitionerName: string
  patientMId: string
}

type AppState = "patientCheck" | "transcription" | "summary"

export default function Page() {
  const icdRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<number>()
  const [patientId, setPatientId] = useState<number>()
  const [patientMId, setPatientMId] = useState<string>()
  const [doctorId, setDoctorId] = useState<string>()
  const [patientName, setPatientName] = useState<string>("")
  const [doctorName, setDoctorName] = useState<string>("")
  const [currentState, setCurrentState] = useState<AppState>("patientCheck")
  const [transcriptionEnd, setTranscriptionEnd] =
    useState<TranscriptionSummary | null>(null)
  const [showICDGenerator, setShowICDGenerator] = useState(false)
  const [epicCounters, setEpicCounters] = useState<any[]>([])
  const [practitionerId, setPractitionerId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

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
  const showSidebar = pathname === "/mediNote-ai/epic"

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

  const handleStartRecording = async ({
    patientId,
    practitionerId,
    patientName,
    practitionerName,
    patientMId,
  }: recordingProps) => {
    console.log("Recording started")
    setPatientMId(patientMId)
    try {
      const effectiveDoctorId = practitionerName ?? practitionerId
      if (!effectiveDoctorId) {
        console.log("Doctor ID is required to start a session")
        return
      }

      const data = await APIService.epicStartSession(
        Number(patientId),
        practitionerId
      )
      if (data) {
        setSessionId(data?.session_id)
        setPatientId(Number(patientId))
        setDoctorId(practitionerId)
        setPatientName(patientName || "Unknown Patient")
        setDoctorName(doctorName || "Unknown Doctor")
        setCurrentState("transcription")
      }
    } catch (error) {
      console.log("Failed to start recording:", error)
    }
  }

  const handleEpicCounters = async () => {
    if (!authToken || !patientMId) return
    try {
      const data = await APIService.getEpicEncounters(
        authToken || "",
        patientMId || ""
      )
      if (data) {
        setEpicCounters(data?.items)
        console.log("Epic counters:", data)
      }
    } catch (error) {
      console.log("Failed to fetch epic counters:", error)
    }
  }

  const handleSelectedEpic = async(item: any, summaryContent: string) => {
    try {
      if (!authToken || !patientMId) return
      const data = await APIService.createEpicDocumentReference(
        authToken || "",
        patientMId || "",
        item.id || "",
        summaryContent
      )
      if (data) {
        console.log("Epic counters:", data)
      }
    } catch (error) {
      console.log("Failed to fetch epic counters:", error)
    }
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
        {!authToken && <EpicAuthentication onTokenSubmit={handleTokenSubmit} />}
        {authToken && (
          <div
            className="flex flex-col flex-1 transition-all duration-300 ease-in-out"
            style={{ marginLeft: showSidebar ? sidebarWidth : 0 }}
          >
            <TokenDisplay
              token={authToken}
              onClear={handleClearAuth}
            />
            {currentState === "patientCheck" && (
              <CheckPatientAndDoctor
                authToken={authToken}
                handleRecording={handleStartRecording}
                practitionerId={practitionerId}
              />
            )}
            {currentState === "transcription" &&
              sessionId &&
              patientId &&
              !transcriptionEnd && (
                <TranscriptionComponent
                  sessionId={sessionId}
                  patientId={patientId}
                  setTranscriptionEnd={setTranscriptionEnd}
                  patientName={patientName}
                  doctorName={doctorName}
                   authToken={authToken || ""}
                  patientMId={patientMId || ""}
                />
              )}
            {sessionId && patientId && transcriptionEnd && (
              <>
                <EpicGenerateSummary
                  sessionId={sessionId}
                  patientId={patientId}
                  transcriptionEnd={transcriptionEnd}
                  summaryData={sampleData}
                  showICDGenerator={showICDGenerator}
                  setShowICDGenerator={setShowICDGenerator}
                  doctorId={Number(doctorId) || 0}
                  handleEpicCounters={handleEpicCounters}
                  epicCounters={epicCounters}
                  handleSelectedEpic={handleSelectedEpic}
                  authToken={authToken || ""}
                  patientMId={patientMId || ""}
                  epicPatientName={patientName}
                  epicDoctorName={doctorName}
                />
              </>
            )}
            {sessionId && patientId && transcriptionEnd && showICDGenerator && (
              <div ref={icdRef}>
                <ICDGenerator
                  sessionId={sessionId}
                  showButton={true}
                  fullWidth={false}
                  editMode={false}
                />
              </div>
            )}
          </div>
        )}
        
        <FooterAISearch sidebarOpen={showSidebar && isSidebarExpanded} />
      </div>
    </DashboardProvider>
  )
}