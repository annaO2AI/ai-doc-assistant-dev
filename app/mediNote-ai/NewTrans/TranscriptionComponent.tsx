//TranscriptionComponent.tsx
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useTranscriptionWebSocket } from "./useTranscriptionWebSocket"
import WelcomeMessage from "./WelcomeMessage"
import {
  AudioLineIcon,
  Speeker,
  StopRecoding,
} from "@/app/chat-ui/components/icons"
import { TranscriptionSummary } from "../types"
import { APIService } from "../service/api"
import Image from "next/image"
import PharmacyGenerator from "../pharmacy/PharmacyGenerator"

interface TranscriptionInterfaceProps {
  sessionId: number
  patientId: number
  patientName: string
  doctorName: string
  setTranscriptionEnd: (summary: TranscriptionSummary) => void
  authToken: string
  patientMId: string
}

// Types for Diagnostic Reports
type DiagnosticReportSummary = {
  raw_report: any
  patient_info: {
    name: string
    patient_id: string
    birth_date: string
    gender: string
  }
  provider_lab_info: {
    ordering_provider_name: string
  }
  date_info: {
    effective_datetime: string
    issued_datetime: string
  }
  clinical_info: {
    clinical_diagnosis: string
    encounter_description: string
  }
  results: Array<{
    test_name: string
    value: string
    unit: string
    reference_min: string
    reference_max: string
    reference_unit: string
    flag: string
  }>
  conclusion: {
    results_interpretation: string
    final_diagnosis: string
  }
  stats: {
    total_tests: number
    num_normal: number
    num_high: number
    num_low: number
    num_unknown: number
  }
}

type DiagnosticReportObservations = {
  observations: Array<{
    test_name: string
    value: string
    unit: string
    reference_min: string
    reference_max: string
    reference_unit: string
    flag: string
  }>
}

const TranscriptionInterface: React.FC<TranscriptionInterfaceProps> = ({
  sessionId,
  patientId,
  patientName,
  doctorName,
  setTranscriptionEnd,
  authToken,
  patientMId,
}) => {
  const {
    isConnected,
    isRecording,
    transcription,
    connect,
    disconnect,
    startRecording,
    stopRecording,
  } = useTranscriptionWebSocket({
    sessionId,
    doctorId: 0,
    patientId,
  })

  const [showStopConfirmation, setShowStopConfirmation] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [userInitiatedStop, setUserInitiatedStop] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Lab Results States
  const [showDiagnosticReports, setShowDiagnosticReports] = useState(false)
  const [diagnosticReports, setDiagnosticReports] = useState<any[]>([])
  const [diagnosticReportsLoading, setDiagnosticReportsLoading] = useState(false)
  const [diagnosticReportsError, setDiagnosticReportsError] = useState<string | null>(null)
  
  // Report Details States
  const [showReportDetails, setShowReportDetails] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [activeView, setActiveView] = useState<"summary" | "epic" | "observations">("summary")
  const [summaryDataLab, setSummaryDataLab] = useState<DiagnosticReportSummary | null>(null)
  const [observationsData, setObservationsData] = useState<DiagnosticReportObservations | null>(null)
  const [epicData, setEpicData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    console.log("TranscriptionComponent props:", { patientName, doctorName })
  }, [patientName, doctorName])

  useEffect(() => {
    scrollToBottom()
  }, [transcription])

  useEffect(() => {
    if (!isRecording && !userInitiatedStop && !isProcessing && isConnected) {
      const timer = setTimeout(() => {
        startRecording()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [
    isRecording,
    userInitiatedStop,
    isProcessing,
    isConnected,
    startRecording,
  ])

  // Fetch Diagnostic Reports
  const fetchDiagnosticReports = useCallback(async () => {
    console.log("Fetch diagnostic reports called")
    console.log("Patient MID:", patientMId)
    console.log("Auth Token:", authToken ? "Present" : "Missing")
    
    if (!patientMId || !authToken) {
      const errorMsg = `Missing required data - Patient ID: ${patientMId ? "Present" : "Missing"}, Auth Token: ${authToken ? "Present" : "Missing"}`
      console.error(errorMsg)
      setDiagnosticReportsError(errorMsg)
      setShowDiagnosticReports(true)
      return
    }

    try {
      setDiagnosticReportsLoading(true)
      setDiagnosticReportsError(null)

      const url = `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/diagnostic-report/search?token_id=${authToken}&patient_id=${patientMId}&_count=50`
      console.log("Fetching from URL:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      })

      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Response error text:", errorText)
        throw new Error(`Failed to fetch diagnostic reports: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Response data:", data)

      if (data.entry && data.entry.length > 0) {
        const reports = data.entry.map((entry: any) => entry.resource)
        console.log("Found reports:", reports.length)
        setDiagnosticReports(reports)
        setShowDiagnosticReports(true)
      } else {
        console.log("No reports found in response")
        setDiagnosticReportsError("No diagnostic reports found for this patient")
        setDiagnosticReports([])
        setShowDiagnosticReports(true)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch diagnostic reports"
      console.error("Error fetching diagnostic reports:", err)
      setDiagnosticReportsError(errorMessage)
      setDiagnosticReports([])
      setShowDiagnosticReports(true)
    } finally {
      setDiagnosticReportsLoading(false)
    }
  }, [authToken, patientMId])

  // Fetch Report Data (Summary/Epic/Observations)
  const fetchReportData = useCallback(async (
    reportId: string,
    type: "summary" | "epic" | "observations"
  ) => {
    if (!reportId || !authToken) return

    try {
      setReportLoading(true)
      setReportError(null)

      const endpoints = {
        summary: `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/diagnostic-report/${reportId}/summary?token_id=${authToken}`,
        epic: `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/diagnostic-report/${reportId}?token_id=${authToken}`,
        observations: `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/diagnostic-report/${reportId}/observations?token_id=${authToken}`,
      }

      const response = await fetch(endpoints[type], {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} data: ${response.statusText}`)
      }

      const data = await response.json()

      switch (type) {
        case "summary":
          setSummaryDataLab(data)
          break
        case "epic":
          setEpicData(data)
          break
        case "observations":
          setObservationsData(data)
          break
      }

      setActiveView(type)
    } catch (err) {
      setReportError(
        err instanceof Error
          ? `Error fetching ${type} data: ${err.message}`
          : `Failed to fetch ${type} data`
      )
    } finally {
      setReportLoading(false)
    }
  }, [authToken])

  // Handle View Report
  const handleViewReport = useCallback((report: any) => {
    setSelectedReport(report)
    setShowReportDetails(true)
    setActiveView("summary")
    fetchReportData(report.id, "summary")
  }, [fetchReportData])

  // Handle Close Report Details
  const handleCloseReportDetails = useCallback(() => {
    setShowReportDetails(false)
    setSelectedReport(null)
    setSummaryDataLab(null)
    setEpicData(null)
    setObservationsData(null)
    setReportError(null)
  }, [])

  // Handle Close Diagnostic Reports
  const handleCloseDiagnosticReports = useCallback(() => {
    setShowDiagnosticReports(false)
    setDiagnosticReports([])
    setDiagnosticReportsError(null)
  }, [])

  // Format Date
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])

  const formatDateOnly = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  // Get Status Color
  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case "final":
        return "bg-green-100 text-green-800"
      case "amended":
        return "bg-blue-100 text-blue-800"
      case "preliminary":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }, [])

  // Get Flag Color
  const getFlagColor = useCallback((flag: string) => {
    switch (flag?.toUpperCase()) {
      case "HIGH":
        return "bg-red-100 text-red-800 border border-red-200"
      case "LOW":
        return "bg-blue-100 text-blue-800 border border-blue-200"
      case "NORMAL":
        return "bg-green-100 text-green-800 border border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200"
    }
  }, [])

  const handleStopRecording = () => {
    setUserInitiatedStop(true)
    setShowStopConfirmation(true)
  }

  const confirmStopRecording = async () => {
    setIsProcessing(true)

    try {
      stopRecording()

      const result = await APIService.endSession(sessionId)
      if (result) {
        setTranscriptionEnd(result)
      }
    } catch (error) {
      console.error("Error ending session:", error)
      setUserInitiatedStop(false)
    } finally {
      setIsProcessing(false)
      setShowStopConfirmation(false)
    }
  }

  const cancelStopRecording = () => {
    setUserInitiatedStop(false)
    setShowStopConfirmation(false)
  }

  const handleStartRecording = () => {
    setUserInitiatedStop(false)
    startRecording()
  }

  return (
    <div className="flex Patient-voice mx-auto w-[88%] mt-6 transcription-welcommassege-main rounded-[1vw] relative min-h-[600px]">
      {/* Top-right Buttons */}
      <div className="absolute top-[5px] right-[190px] mt-4 mr-4 z-50">
        <div className="flex gap-2">
          <button
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            onClick={() => {
              console.log("Get Lab Results button clicked!")
              console.log("Props - authToken:", authToken, "patientMId:", patientMId)
              fetchDiagnosticReports()
            }}
            disabled={diagnosticReportsLoading}
          >
            {diagnosticReportsLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Get Lab Results</span>
              </>
            )}
          </button>
          <PharmacyGenerator
            defaultOpen={false}
            showButton={true}
            fullWidth={false}
          />
        </div>
      </div>

      {/* Stop Recording Confirmation Popup */}
      {showStopConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-95 shadow-xl">
            {isProcessing ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <h3 className="text-lg font-medium mb-2">Processing...</h3>
                <p className="text-gray-600">
                  Generating summary note, please wait...
                </p>
              </div>
            ) : (
              <div className="flex justify-center flex-col items-center p-10">
                <Image
                  src="/stoprecording-conversation.svg"
                  alt="stop recording"
                  width={136.35}
                  height={117.99}
                />
                <h3 className="text-xl font-medium mb-0 mt-10">
                  Are you sure you want to stop the recording?
                </h3>
                <p className="text-gray-600 mb-8">
                  The current conversation will be saved and processed.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelStopRecording}
                    className="px-4 py-2 hover:text-blue-800 bg-blue-100 text-blue-600 font-medium py-2 px-4 rounded-lg"
                    disabled={isProcessing}
                  >
                    Continue recording
                  </button>
                  <button
                    onClick={confirmStopRecording}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessing}
                  >
                    Stop recording & Generate summary note
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className={
          transcription.length === 0
            ? "mediNote-widthfix-warpper-center m-auto w-[88%]"
            : "mediNote-widthfix-warpper m-auto w-[88%]"
        }
      >
        {/* Transcription Display */}
        <div className="mt-10">
          <div className="flex gap-2 text-white items-center absolute left-8 top-8 z-20 ">
            <span className="avatar flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-semibold">
              {patientName ? patientName.charAt(0).toUpperCase() : "P"}
            </span>
            <span className="font-semibold text-white flex flex-col leading-[1.4] ">
              <span className="text-white text-[16px]">
                {patientName || "No patient selected"}
              </span>
              <span className="text-white text-[14px] font-normal">Patent</span>
            </span>
            <span>
              <svg
                width="10"
                height="8"
                viewBox="0 0 10 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.86603 7.5C5.48112 8.16667 4.51887 8.16667 4.13397 7.5L0.669873 1.5C0.284972 0.833333 0.766098 5.89981e-08 1.5359 1.26296e-07L8.4641 7.31979e-07C9.2339 7.99277e-07 9.71503 0.833334 9.33013 1.5L5.86603 7.5Z"
                  fill="white"
                />
              </svg>
            </span>
          </div>

          <div className="flex gap-2 text-white items-center absolute top-6 right-6 w-[160px] z-10">
            <span className="avatar flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-semibold">
              {doctorName ? doctorName.charAt(0).toUpperCase() : "D"}
            </span>
            <span className="font-semibold text-white flex flex-col leading-[1.4] ">
              <span className="text-white text-[16px]">
                {doctorName || "No doctor selected"}
              </span>
              <span className="text-white text-[14px] font-normal">Doctor</span>
            </span>
            <span>
              <svg
                width="10"
                height="8"
                viewBox="0 0 10 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.86603 7.5C5.48112 8.16667 4.51887 8.16667 4.13397 7.5L0.669873 1.5C0.284972 0.833333 0.766098 5.89981e-08 1.5359 1.26296e-07L8.4641 7.31979e-07C9.2339 7.99277e-07 9.71503 0.833334 9.33013 1.5L5.86603 7.5Z"
                  fill="white"
                />
              </svg>
            </span>
          </div>
          {transcription.length === 0 ? (
            <WelcomeMessage username={"Doctor"} />
          ) : (
            <div className="space-y-4 overflow-y-auto p-2 transcriptDoctorPatient">
              {transcription.map((msg: any, index: number) => {
                if (msg.text === "Thank you.") return null
                return (
                  <div
                    key={index}
                    className={`p-2 border-l-4 transition-all duration-200 hover:shadow-md transcript-strip-msg ${
                      msg.type === "turn-final"
                        ? "hover:bg-white"
                        : msg.type === "error"
                          ? "bg-red-50  hover:bg-red-100"
                          : "bg-blue-50  hover:bg-blue-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 items-center">
                        <div className="flex items-center">
                          <div className="flex items-center space-x-2">
                            {msg.speakerName}
                          </div>
                        </div>
                        <p className="text-gray-800 leading-relaxed">
                          {msg.text || msg.msg}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4 text-white">
            <span
              className={`h-3 w-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-10 justify-between controle-search-AIDocAssist h-[70px]">
          <div className="flex items-center overflow-hidden dm-width">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={!isConnected || isProcessing}
            >
              {isRecording ? (
                <span className="flex gap-3 items-center">
                  <span className="px-6 py-4 rounded-md font-medium flex items-center bg-blue-200 hover:bg-blue-300">
                    <Speeker />
                  </span>
                  <AudioLineIcon />
                </span>
              ) : (
                <span className="flex gap-3 items-center">
                  <span className="px-6 py-4 rounded-md font-medium flex items-center bg-blue-200 hover:bg-blue-300">
                    <Speeker />
                  </span>
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={!isConnected || isProcessing}
              className={`rounded-md font-medium h-[44px] ${
                isRecording
                  ? "bg-white-500 hover:bg-white-600"
                  : "px-4 py-2 bg-blue-500 hover:bg-blue-600"
              } text-white ${
                !isConnected || isProcessing
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {isRecording ? (
                <span className="flex items-center">
                  <StopRecoding />
                </span>
              ) : (
                "Start Recording"
              )}
            </button>
          </div>
        </div>

        <span className="bottomlinerGrading">
          <svg
            width="289"
            height="199"
            viewBox="0 0 289 199"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M74.4604 14.9961C29.4945 21.2278 -3.5762 38.2063 -12.2914 45.6118L-26.7382 51.5987L-18.129 238.328L15.9938 288.05L59.727 287.301L185.831 257.872C186.478 228.034 237.253 176.817 262.56 154.938C307.047 107.868 284.151 58.3168 267.142 39.4252C236.04 -2.0024 184.942 -2.74081 158.943 2.76831C155.608 3.47505 152.272 4.08963 148.876 4.38837C134.405 5.6613 97.5463 9.50809 74.4604 14.9961Z"
              fill="url(#paint0_linear_3427_90583)"
              fillOpacity="0.4"
            />
            <defs>
              <linearGradient
                id="paint0_linear_3427_90583"
                x1="307.848"
                y1="2.45841"
                x2="-6.38578"
                y2="289.124"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#45CEF1" />
                <stop offset="1" stopColor="#219DF1" />
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span className="rightlinerGrading">
          <svg
            width="461"
            height="430"
            viewBox="0 0 461 430"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M261.412 0C341.45 8.67863e-05 413.082 35.9951 461.001 92.6807V429.783C460.94 429.856 460.878 429.928 460.816 430H289.244C370.46 416.708 432.435 346.208 432.435 261.232C432.435 166.779 355.865 90.2101 261.412 90.21C166.959 90.21 90.3887 166.779 90.3887 261.232C90.3887 346.208 152.364 416.707 233.579 430H62.0068C23.4388 384.476 0.179688 325.571 0.179688 261.232C0.179741 116.958 117.137 0 261.412 0Z"
              fill="#C2F5F9"
              fillOpacity="0.2"
            />
          </svg>
        </span>
      </div>

      {/* Diagnostic Reports Modal */}
      {showDiagnosticReports && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-card" onClick={handleCloseDiagnosticReports}>
          <div 
            className="bg-white rounded-tl-lg rounded-tr-lg shadow-2xl w-full max-w-5xl overflow-y-auto w-[500px] absolute top-[0] right-[0] h-[100vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold ot-title flex gap-3 items-center">
                <span className="avatar-scr text-2xl">
                  {patientName.charAt(0).toUpperCase()}
                </span>
                <span>
                  Lab Results - {patientName}
                </span>
              </h3>
              <button
                onClick={handleCloseDiagnosticReports}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Previous Lab test</h4>
              
              {diagnosticReportsError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600">{diagnosticReportsError}</p>
                  </div>
                </div>
              )}

              {diagnosticReportsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="animate-spin h-10 w-10 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-sm text-gray-600">
                      Loading diagnostic reports...
                    </p>
                  </div>
                </div>
              ) : diagnosticReports.length > 0 ? (
                <div className="space-y-3">
                  {diagnosticReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => handleViewReport(report)}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        {report.code.text || "Appointment Consultation Summary"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(report.effectiveDateTime)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : !diagnosticReportsError ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 mt-4">No diagnostic reports found for this patient</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal - FIXED WITH ACTUAL CONTENT RENDERING */}
      {showReportDetails && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Diagnostic Report Details
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedReport.code?.text || "Report"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    selectedReport.status
                  )}`}
                >
                  {selectedReport.status.charAt(0).toUpperCase() +
                    selectedReport.status.slice(1)}
                </span>
              </div>
              <button
                onClick={handleCloseReportDetails}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* View Tabs */}
            <div className="border-b border-gray-200">
              <div className="px-6">
                <div className="flex space-x-4">
                  <button
                    onClick={() =>
                      fetchReportData(selectedReport.id, "summary")
                    }
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeView === "summary"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Summarize Diagnostic Report
                  </button>
                  <button
                    onClick={() => fetchReportData(selectedReport.id, "epic")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeView === "epic"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    EPIC DiagnosticReport
                  </button>
                  <button
                    onClick={() =>
                      fetchReportData(selectedReport.id, "observations")
                    }
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeView === "observations"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Diagnostic Report Observations
                  </button>
                </div>
              </div>
            </div>

            {/* Content - NOW WITH ACTUAL RENDERING */}
            <div className="flex-1 overflow-y-auto p-6">
              {reportLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="animate-spin h-10 w-10 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-sm text-gray-600">
                      Loading {activeView} data...
                    </p>
                  </div>
                </div>
              ) : reportError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-600 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-600">{reportError}</p>
                  </div>
                </div>
              ) : activeView === "summary" && summaryDataLab ? (
                <div className="space-y-6">
                  {/* Patient Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Patient Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="text-base font-medium text-gray-900">{summaryDataLab.patient_info.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Patient ID</p>
                        <p className="text-base font-medium text-gray-900">{summaryDataLab.patient_info.patient_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Birth Date</p>
                        <p className="text-base font-medium text-gray-900">{formatDateOnly(summaryDataLab.patient_info.birth_date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Gender</p>
                        <p className="text-base font-medium text-gray-900">{summaryDataLab.patient_info.gender}</p>
                      </div>
                    </div>
                  </div>

                  {/* Test Statistics */}
                  {summaryDataLab.stats && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{summaryDataLab.stats.total_tests}</p>
                          <p className="text-sm text-gray-600">Total Tests</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{summaryDataLab.stats.num_normal}</p>
                          <p className="text-sm text-gray-600">Normal</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{summaryDataLab.stats.num_high}</p>
                          <p className="text-sm text-gray-600">High</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{summaryDataLab.stats.num_low}</p>
                          <p className="text-sm text-gray-600">Low</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-500">{summaryDataLab.stats.num_unknown}</p>
                          <p className="text-sm text-gray-600">Unknown</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Results */}
                  {summaryDataLab.results && summaryDataLab.results.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Results</h3>
                      <div className="space-y-2">
                        {summaryDataLab.results.map((result, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{result.test_name}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getFlagColor(result.flag)}`}>
                                {result.flag || "NORMAL"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Value</p>
                                <p className="font-medium text-gray-900">{result.value} {result.unit}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Reference Range</p>
                                <p className="font-medium text-gray-900">
                                  {result.reference_min} - {result.reference_max} {result.reference_unit}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conclusion */}
                  {summaryDataLab.conclusion && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Conclusion</h3>
                      <p className="text-sm text-gray-700 mb-2">{summaryDataLab.conclusion.results_interpretation}</p>
                      <p className="text-sm font-medium text-gray-900">{summaryDataLab.conclusion.final_diagnosis}</p>
                    </div>
                  )}
                </div>
              ) : activeView === "epic" && epicData ? (
                <div className="space-y-4">
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(epicData, null, 2)}
                  </pre>
                </div>
              ) : activeView === "observations" && observationsData ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Observations</h3>
                  {observationsData.observations && observationsData.observations.length > 0 ? (
                    <div className="space-y-2">
                      {observationsData.observations.map((obs, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{obs.test_name}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getFlagColor(obs.flag)}`}>
                              {obs.flag || "NORMAL"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Value</p>
                              <p className="font-medium text-gray-900">{obs.value} {obs.unit}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Reference Range</p>
                              <p className="font-medium text-gray-900">
                                {obs.reference_min} - {obs.reference_max} {obs.reference_unit}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No observations available</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    Click a tab above to view report data
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseReportDetails}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TranscriptionInterface