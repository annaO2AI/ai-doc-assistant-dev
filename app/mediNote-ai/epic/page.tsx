//page.tsx
"use client"
import HeaderAISearch from "@/app/chat-ui/components/Header"
import Sidebar from "@/app/components/dashboard/Sidebar"
import { DashboardProvider } from "@/app/context/DashboardContext"
import React, { useRef, useState } from "react"
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

export interface recordingProps {
  patientId: string | number
  practitionerId: any
  patientName: string
  practitionerName: string
  patientMId: string
}
// Define types for our state
type AppState = "patientCheck" | "transcription" | "summary"
export default function page() {
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

  const toggleCollapse = () => {
    const newCollapsed = !collapsed
    localStorage.setItem("sidebar-collapsed", String(newCollapsed))
    setCollapsed(newCollapsed)
  }

  const isSidebarExpanded = !collapsed || hovered
  const sidebarWidth = isSidebarExpanded ? 256 : 64

  // Show sidebar on the talent-acquisition page
  const showSidebar = pathname === "/mediNote-ai/epic"

  const handleTokenSubmit = (token: string) => {
    setAuthToken(token)
    localStorage.setItem("epic_auth_token", token)
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
            // alert("Document Reference created successfully in Epic.")
          }
        } catch (error) {
          console.log("Failed to fetch epic counters:", error)
        }
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
        {!authToken && <EpicAuthentication onTokenSubmit={handleTokenSubmit} />}
        {authToken && (
          <div
            className="flex flex-col flex-1 transition-all duration-300 ease-in-out bg-gray-50"
            style={{ marginLeft: showSidebar ? sidebarWidth : 0 }}
          >
            <TokenDisplay
              token={authToken}
              onClear={() => {
                setAuthToken(null)
                localStorage.removeItem("epic_auth_token")
              }}
            />
            {currentState === "patientCheck" && (
              <CheckPatientAndDoctor
                authToken={authToken}
                handleRecording={handleStartRecording}
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
                  
                />                
              </>
            )}
            {sessionId && patientId && transcriptionEnd && showICDGenerator && (
              <div className="ICDGenerator-pupup fixed" ref={icdRef}>
                <ICDGenerator
                  sessionId={sessionId}
                  showButton={false}
                  fullWidth={true}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardProvider>
  )
}
