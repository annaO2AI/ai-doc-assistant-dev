//page.tsx
"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "../../components/dashboard/Sidebar"
import { DashboardProvider } from "../../context/DashboardContext"
import HeaderAISearch from "../../chat-ui/components/Header"
import Breadcrumbs from "../../components/dashboard/Breadcrumbs"

import CheckPatientVoice from "./CheckPatientVoice"
import { APIService } from "../service/api"
import TranscriptionComponent from "../NewTrans/TranscriptionComponent"
import SummaryGeneration from "../NewTrans/SummaryGeneration"
import { TranscriptionSummary } from "../types"
import { sampleData } from "../transcription-summary/Summary"
import ICDGenerator from "../icd-code-generator/ICDGenerator"

// Define types for our state
type AppState = "patientCheck" | "transcription" | "summary"

export default function ProcurementSearchPage() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [sessionId, setSessionId] = useState<number>()
  const [patientId, setPatientId] = useState<number>()
  const [doctorId, setDoctorId] = useState<number>()
  const [patientName, setPatientName] = useState<string>("") // Added state for patientName
  const [doctorName, setDoctorName] = useState<string>("") // Added state for doctorName
  const [currentState, setCurrentState] = useState<AppState>("patientCheck")
  const [transcriptionEnd, setTranscriptionEnd] = useState<TranscriptionSummary | null>(null)
  const [showICDGenerator, setShowICDGenerator] = useState(false)
  const icdRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored !== null) setCollapsed(stored === "true")
  }, [])

  // Handle click outside to close ICDGenerator
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (icdRef.current && !icdRef.current.contains(event.target as Node)) {
        setShowICDGenerator(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle icdGeneratorClose event to hide ICDGenerator
  useEffect(() => {
    const handleICDClose = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sessionId: number } | undefined
      if (detail && Number(detail.sessionId) === Number(sessionId)) {
        setShowICDGenerator(false)
      }
    }
    window.addEventListener("icdGeneratorClose", handleICDClose as EventListener)
    return () => window.removeEventListener("icdGeneratorClose", handleICDClose as EventListener)
  }, [sessionId])

  const toggleCollapse = () => {
    const newCollapsed = !collapsed
    localStorage.setItem("sidebar-collapsed", String(newCollapsed))
    setCollapsed(newCollapsed)
  }

  const isSidebarExpanded = !collapsed || hovered
  const sidebarWidth = isSidebarExpanded ? 256 : 64

  // Show sidebar on the talent-acquisition page
  const showSidebar = pathname === "/mediNote-ai/doctor-patient-voice"

  const startRecording = async (patientId: number, doctorIdParam: number, patientName: string, doctorName: string) => {
    try {
      const effectiveDoctorId = doctorIdParam ?? doctorId
      if (!effectiveDoctorId) {
        console.log("Doctor ID is required to start a session")
        return
      }
      const data = await APIService.startSession(patientId, effectiveDoctorId)
      if (data) {
        console.log("startRecording:", { sessionId: data?.session_id, patientId, doctorId: effectiveDoctorId, patientName, doctorName }); // Debug log
        setSessionId(data?.session_id)
        setPatientId(patientId)
        setDoctorId(effectiveDoctorId)
        setPatientName(patientName || "Unknown Patient") // Store patientName
        setDoctorName(doctorName || "Unknown Doctor") // Store doctorName
        setCurrentState("transcription")
      }
    } catch (error) {
      console.log("Failed to start recording:", error)
    }
  }

  // Debug state changes
  useEffect(() => {
    console.log("ProcurementSearchPage state:", { sessionId, patientId, doctorId, patientName, doctorName, currentState });
  }, [sessionId, patientId, doctorId, patientName, doctorName, currentState]);

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
        {/* <Breadcrumbs sidebarOpen={showSidebar && isSidebarExpanded} /> */}
        <div
          className="flex flex-col flex-1 transition-all duration-300 ease-in-out"
          style={{ marginLeft: showSidebar ? sidebarWidth : 0 }}
        >
          <main>
            <div className="enrollDoctorVoice">
              {currentState === "patientCheck" && 
                <CheckPatientVoice handleStartCon={startRecording} />
              }
              
              {currentState === "transcription" && sessionId && patientId && !transcriptionEnd && (
                <TranscriptionComponent
                  sessionId={sessionId}
                  patientId={patientId}
                  setTranscriptionEnd={setTranscriptionEnd}
                  patientName={patientName} // Pass stored patientName
                  doctorName={doctorName}   // Pass stored doctorName
                />
              )}
              {sessionId && patientId && transcriptionEnd && (
                <SummaryGeneration
                  sessionId={sessionId}
                  patientId={patientId}
                  transcriptionEnd={transcriptionEnd}
                  summaryData={sampleData}
                  showICDGenerator={showICDGenerator}
                  setShowICDGenerator={setShowICDGenerator}
                  doctorId={doctorId || 0}
                />
              )}
              {sessionId && patientId && transcriptionEnd && showICDGenerator && (
                <div className="ICDGenerator-pupup fixed" ref={icdRef}>
                    <ICDGenerator sessionId={sessionId} showButton={false} fullWidth={true}  />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </DashboardProvider>
  )
}