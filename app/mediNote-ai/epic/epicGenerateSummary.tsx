"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { Play, Pause, Edit, CheckCircle, User, Stethoscope, Save, Activity } from "lucide-react"
import { APIService } from "../service/api"
import { ObjectiveData, TranscriptionSummary } from "../types"
import { Summary } from "../transcription-summary/Summary"
import Image from "next/image"
import SummaryPharmacyGen from "../pharmacy/SummaryPharmacyGen"
import { MedicationResponse } from "../pharmacy/PharmacyGenerator"
import ICDGenerator from "../icd-code-generator/ICDGenerator"

type TextCase = {
  sessionId: number
  patientId: number
  transcriptionEnd: TranscriptionSummary
  summaryData: SummaryText
  showICDGenerator: boolean
  setShowICDGenerator: (show: boolean) => void
  doctorId: number
  handleEpicCounters: () => void
  epicCounters: any[]
  handleSelectedEpic: (item: any, summaryContent: string) => void
  authToken: string
  patientMId: string
  epicPatientName: string
  epicDoctorName: string
}

type SummaryText = {
  success: boolean
  session_id: number
  summary_id: number
  status: string
  title: string
  content: string
  created_at: string
  approved_at: string | null
  file_path: string
  summary: Summary
}

// Types for Epic FHIR DocumentReference
type DocumentReferenceType = {
  system: string
  code: string
  display: string
}

type DocumentReference = {
  id: string | null
  status: string | null
  date: string | null
  title: string | null
  author: string[]
  encounters: string[]
  type: DocumentReferenceType[]
}

// Default encounter type
type DefaultEncounter = {
  id: string
  type: string[]
  status: string
  serviceProvider: string
  display: string
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

export default function EpicGenerateSummary({
  sessionId,
  patientId,
  transcriptionEnd,
  summaryData,
  showICDGenerator,
  setShowICDGenerator,
  doctorId,
  handleEpicCounters,
  epicCounters,
  handleSelectedEpic,
  authToken,
  patientMId,
  epicPatientName,
  epicDoctorName,
}: TextCase) {
  const [apiError, setApiError] = useState("")
  const [isEdit, setIsEdit] = useState(false)
  const [editedSummary, setEditedSummary] = useState("")
  const [icdSectionText, setIcdSectionText] = useState<string>("")
  const [notification, setNotification] = useState<{
    message: string
    show: boolean
  }>({
    message: "",
    show: false,
  })
  const [summaryId, setSummaryId] = useState<SummaryText | null>(null)
  const [summaryContent, setSummaryContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const [pharmacyData, setPharmacyData] = useState<MedicationResponse | any>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null)
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [epicDocuments, setEpicDocuments] = useState<DocumentReference[]>([])
  const [isLoadingEpicDocuments, setIsLoadingEpicDocuments] = useState(false)
  const [clinicalNote, setClinicalNote] = useState("")
  const [noteTypeDisplay, setNoteTypeDisplay] = useState("")
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [objectiveData, setObjectiveData] = useState<ObjectiveData[]>([]);
  const [isLoadingObjective, setIsLoadingObjective] = useState(false);

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

  const handleBackToEpic = useCallback(() => {
    const epicPath = "/mediNote-ai/epic"
    window.location.href = epicPath
  }, [])
  
  // Define handleApiError FIRST
  const handleApiError = useCallback((error: unknown, context: string) => {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred"
    setApiError(`${context}: ${message}`)
    console.error(`${context} error:`, error)
  }, [])

  const showNotification = useCallback((message: string) => {
    setNotification({ message, show: true })
    setTimeout(() => setNotification({ message: "", show: false }), 3000)
  }, [])

  // Fetch Diagnostic Reports
  const fetchDiagnosticReports = useCallback(async () => {
    if (!patientMId || !authToken) {
      setDiagnosticReportsError("Patient ID or authentication token is required")
      return
    }

    try {
      setDiagnosticReportsLoading(true)
      setDiagnosticReportsError(null)

      const response = await fetch(
        `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/diagnostic-report/search?token_id=${authToken}&patient_id=${patientMId}&_count=50`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch diagnostic reports: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.entry && data.entry.length > 0) {
        const reports = data.entry.map((entry: any) => entry.resource)
        setDiagnosticReports(reports)
        setShowDiagnosticReports(true)
        showNotification("Lab results loaded successfully!")
      } else {
        setDiagnosticReportsError("No diagnostic reports found for this patient")
        setDiagnosticReports([])
        setShowDiagnosticReports(true)
      }
    } catch (err) {
      setDiagnosticReportsError("Failed to fetch diagnostic reports")
      setDiagnosticReports([])
      setShowDiagnosticReports(true)
      handleApiError(err, "Failed to fetch diagnostic reports")
    } finally {
      setDiagnosticReportsLoading(false)
    }
  }, [authToken, patientMId, handleApiError, showNotification])

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

  // Now fetchObjectiveData can use handleApiError safely
  const fetchObjectiveData = useCallback(async () => {
    if (!patientId) return;
    
    try {
      setIsLoadingObjective(true);
      const data = await APIService.getObjectiveByPatient(patientId);
      if (Array.isArray(data)) {
        // Filter out entries with all zeros/default values if needed
        const validData = data.filter(item => 
          item.blood_pressure_systolic > 0 || 
          item.blood_pressure_diastolic > 0 ||
          item.heart_rate > 0 ||
          item.respiratory_rate > 0 ||
          item.temperature_f > 0 ||
          item.oxygen_saturation > 0 ||
          item.general_appearance ||
          item.heent ||
          item.neurological
        );
        setObjectiveData(validData);
      }
    } catch (err) {
      handleApiError(err, "Failed to fetch objective data");
    } finally {
      setIsLoadingObjective(false);
    }
  }, [patientId, handleApiError]);

  // Generate fixed waveform heights (shared for gray and blue)
  const waveformHeights = useRef<number[]>([])
  useEffect(() => {
    if (waveformHeights.current.length === 0) {
      waveformHeights.current = Array.from({ length: 25 }).map(
        () => Math.random() * 20 + 8
      )
    }
  }, [])

  // Create default encounter
  const createDefaultEncounter = useCallback((): DefaultEncounter => {
    return {
      id: `eoK8nLRcEypNjtns4dgnF3Q3`,
      type: ["AMB", "OFFICE_VISIT"],
      status: "in-progress",
      serviceProvider: "Default Healthcare Provider",
      display: `Visit - ${new Date().toLocaleDateString()}`,
    }
  }, [])

  // Get available encounters - use epicCounters if available, otherwise use default
  const getAvailableEncounters = useCallback(() => {
    if (epicCounters && epicCounters.length > 0) {
      return epicCounters
    }
    // Return default encounter if no epic counters available
    const defaultEncounter = createDefaultEncounter()
    return [defaultEncounter]
  }, [epicCounters, createDefaultEncounter])

  // Handler for direct save summary
  const handleSaveSummary = useCallback(() => {
    const availableEncounters = getAvailableEncounters()
    const encounterToUse = availableEncounters.length > 0 ? availableEncounters[0] : createDefaultEncounter()
    
    handleSelectedEpic(encounterToUse, summaryContent)
    showNotification("Summary saved successfully to Epic!")
    
    // Mark as approved
    setIsApproved(true)
    localStorage.setItem(`summaryApproved:${sessionId}`, "true")
  }, [getAvailableEncounters, createDefaultEncounter, handleSelectedEpic, summaryContent, showNotification, sessionId])

  // Updated function to handle Edit Summary button click - opens edit mode
  const handleEditSummaryClick = useCallback(() => {
    setIsEdit(true);
    setEditedSummary(summaryContent);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`visitSummaryEdit:${sessionId}`, "true");
        window.dispatchEvent(new CustomEvent("visitSummaryEditToggle", { detail: { sessionId, isEdit: true } }));
      }
    } catch {}
  }, [summaryContent, sessionId])

  // Handler for saving edited summary
  const handleSaveEditedSummary = useCallback(async () => {
    const resolvedSummaryId = summaryId?.summary_id ?? transcriptionEnd?.summary_id ?? summaryData?.summary_id;
    if (!resolvedSummaryId) {
      handleApiError(new Error("summary_id not available"), "Cannot update summary");
      return;
    }
    try {
      setIsLoading(true);
      await APIService.editSummary({
        summaryId: resolvedSummaryId,
        edited_text: editedSummary || summaryContent,
      });
      setSummaryContent(editedSummary || summaryContent);
      setIsEdit(false);
      showNotification("Summary updated successfully!");
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`visitSummaryEdit:${sessionId}`, "false");
          window.dispatchEvent(new CustomEvent("visitSummaryEditToggle", { detail: { sessionId, isEdit: false } }));
        }
      } catch {}
    } catch (err) {
      handleApiError(err, "Failed to update summary");
    } finally {
      setIsLoading(false);
    }
  }, [editedSummary, summaryContent, summaryId, transcriptionEnd, summaryData, sessionId, handleApiError, showNotification]);

  // New function to fetch Epic DocumentReferences
  const fetchEpicDocumentReferences = useCallback(async () => {
    try {
      setIsLoadingEpicDocuments(true)
      setApiError("")
      if (!authToken || !patientMId) {
        throw new Error("Missing authentication token or patient ID")
      }
      const count = 100
      const response = await APIService.getEpicDocumentReferences(
        authToken,
        patientMId,
        count
      )
      if (response.ok && Array.isArray(response.items)) {
        setEpicDocuments(response.items)
        if (response.items.length > 0) {
          showNotification("Epic documents loaded successfully!")
        }
      } else {
        throw new Error("Failed to load Epic documents")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      if (
        errorMessage.includes("Authentication failed") ||
        errorMessage.includes("401")
      ) {
        setApiError("Your Epic session has expired. Please re-authenticate.")
      } else {
        setApiError(`Failed to fetch Epic documents: ${errorMessage}`)
      }
      handleApiError(err, "Failed to fetch Epic documents")
    } finally {
      setIsLoadingEpicDocuments(false)
    }
  }, [authToken, patientMId, handleApiError, showNotification])

  const loadAudio = useCallback(async () => {
    if (!sessionId) return
    try {
      setIsLoadingAudio(true)
      const info = await APIService.getRecordingInfo(sessionId)
      const directUrl = info?.web_url || null
      if (!directUrl) {
        throw new Error("Recording URL not available")
      }
      setAudioUrl(directUrl)
      setIsLoadingAudio(false)

      if (audioRef.current) {
        audioRef.current.src = directUrl
        audioRef.current.load()
        audioRef.current.addEventListener(
          "loadedmetadata",
          () => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration || 125)
            }
          },
          { once: true }
        )
      }

      showNotification("Audio loaded successfully!")
    } catch (err) {
      handleApiError(err, "Failed to load audio")
      setIsLoadingAudio(false)
    }
  }, [sessionId, handleApiError, showNotification])

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) {
      loadAudio()
      return
    }

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => {
        handleApiError(err, "Failed to play audio")
      })
    }
  }, [isPlaying, loadAudio, handleApiError])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setProgress((audioRef.current.currentTime / duration) * 100)
    }
  }, [duration])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || !progressRef.current || duration === 0) return

      const rect = progressRef.current.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      const newTime = Math.max(0, Math.min(duration, percent * duration))

      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
      setProgress(percent * 100)
    },
    [duration]
  )

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }, [])

  const fetchSummaryById = useCallback(async () => {
    if (!sessionId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const data = await APIService.getSummaryById(sessionId)
      if (data && typeof data === "object" && "summary_id" in data) {
        setSummaryId(data)
        // Check if summary is already approved
        if (data.approved_at) {
          setIsApproved(true)
          localStorage.setItem(`summaryApproved:${sessionId}`, "true")
        }
      } else {
        setSummaryId(null)
        handleApiError(
          new Error("Invalid summary data"),
          "Failed to fetch summary"
        )
      }
    } catch (err) {
      handleApiError(err, "Failed to fetch summary")
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, handleApiError])

  const upsertIcdSection = useCallback((baseText: string, section: string) => {
    if (!section) return baseText
    const normalizedSection = section.replace(
      /^\s*ICD Codes\s*\(/,
      "## ICD Codes ("
    )
    const lines = baseText.split("\n")
    // Match any header that starts with "## ICD Codes"
    const headerIndex = lines.findIndex((l) => /^##\s+ICD Codes\b/.test(l))
    if (headerIndex === -1) {
      const needsNewline = baseText.endsWith("\n") ? "" : "\n"
      return baseText + needsNewline + normalizedSection
    }
    let endIndex = lines.length
    for (let i = headerIndex + 1; i < lines.length; i++) {
      if (/^##\s+/.test(lines[i])) {
        endIndex = i
        break
      }
    }
    const before = lines.slice(0, headerIndex).join("\n")
    const after = lines.slice(endIndex).join("\n")
    const mid = normalizedSection.replace(/\n+$/, "")
    const parts = [before, mid, after].filter((p) => p.length > 0)
    return parts.join("\n") + (after ? "" : "\n")
  }, [])

  useEffect(() => {
    loadAudio()
  }, [loadAudio])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      setProgress(0)
    }
    const handleLoadedData = () => {
      if (audio.duration) {
        setDuration(audio.duration)
      }
    }

    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadeddata", handleLoadedData)

    return () => {
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadeddata", handleLoadedData)
    }
  }, [handleTimeUpdate])

  // Fetch objective data when component mounts
  useEffect(() => {
    if (patientId) {
      fetchObjectiveData();
    }
  }, [patientId, fetchObjectiveData]);

  useEffect(() => {
    fetchSummaryById()
  }, [fetchSummaryById])

  useEffect(() => {
    fetchEpicDocumentReferences()
  }, [fetchEpicDocumentReferences])

  useEffect(() => {
    if (typeof window === "undefined") return

    // Load approved status from localStorage
    const savedApprovedStatus = localStorage.getItem(
      `summaryApproved:${sessionId}`
    )
    if (savedApprovedStatus === "true") {
      setIsApproved(true)
    }

    const initializeFromStorage = () => {
      try {
        const raw = localStorage.getItem(`icdSelection:${sessionId}`)
        if (!raw) return
        const parsed = JSON.parse(raw) as {
          system?: string
          items?: Array<{ code: string; title: string }>
          updatedAt?: string
        }
        if (
          parsed &&
          Array.isArray(parsed.items) &&
          parsed.items.length > 0 &&
          parsed.system
        ) {
          // Normalize to markdown header used in summaries without extra blank lines
          const header = `## ICD Codes\n`
          const unique = parsed.items.reduce(
            (acc: Array<{ code: string; title: string }>, it) => {
              if (!acc.some((x) => x.code === it.code)) acc.push(it)
              return acc
            },
            []
          )
          const lines = unique
            .map((it) => `- ${it.code}: ${it.title} - (${parsed.system})`)
            .join("\n")
          const section = (header + lines)
            .replace(/\n{3,}/g, "\n\n") // collapse 3+ newlines
            .replace(/^\n+/, "") // trim leading newlines
            .replace(/\n+$/, "") // trim trailing newlines
          setIcdSectionText(section)
        } else {
          setIcdSectionText("")
        }
      } catch {
        // noop
      }
    }

    initializeFromStorage()

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { sessionId: number; sectionText: string }
        | undefined
      if (!detail || Number(detail.sessionId) !== Number(sessionId)) return
      const cleaned = (detail.sectionText || "")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\n+/, "")
        .replace(/\n+$/, "")
      setIcdSectionText(cleaned)
    }

    window.addEventListener("icdSelectionUpdated", handler as EventListener)
    return () =>
      window.removeEventListener(
        "icdSelectionUpdated",
        handler as EventListener
      )
  }, [sessionId])

  useEffect(() => {
    if (!summaryId?.summary?.content) {
      setSummaryContent("Summary content not available.")
      return
    }
    setSummaryContent(summaryId.summary.content)
  }, [summaryId])

  useEffect(() => {
    if (!isEdit) return
    setEditedSummary((current) => {
      const base =
        current && current.trim().length > 0 ? current : summaryContent
      return upsertIcdSection(base || "", icdSectionText)
    })
  }, [isEdit, icdSectionText, summaryContent, upsertIcdSection])

  // Validate props after Hooks
  if (!sessionId || !patientId || !transcriptionEnd || !summaryData) {
    console.error("Missing required props in SummaryGeneration")
    return <div>Error: Missing required props</div>
  }

  // Extract symptoms and family history from summary content
  const extractSymptomsFromSummary = () => {
    const symptomsMatch = summaryContent.match(/## Patient Chief Concerns & Symptoms\s*\n([\s\S]*?)(?=\n##|$)/);
    if (symptomsMatch) {
      const symptomsText = symptomsMatch[1].trim();
      // Get first 3 symptoms or the full text if shorter
      const lines = symptomsText.split('\n').filter(line => line.trim().startsWith('-'));
      return lines.slice(0, 3).map(line => line.replace(/^-\s*/, '').trim()).join(', ') || "No symptoms recorded";
    }
    return "No symptoms recorded";
  };

  const extractFamilyHistoryFromSummary = () => {
    const familyMatch = summaryContent.match(/## Family History\s*\n([\s\S]*?)(?=\n##|$)/);
    if (familyMatch) {
      const familyText = familyMatch[1].trim();
      const lines = familyText.split('\n').filter(line => line.trim().startsWith('-'));
      return lines.slice(0, 2).map(line => line.replace(/^-\s*/, '').trim()).join(', ') || "No family history recorded";
    }
    return "No family history recorded";
  };

  // Rest of the component logic remains unchanged
  const parseContentSections = (content: string) => {
    if (!content) return []
    const sections = content
      .split(/(?=^#+ )/m)
      .filter((section) => section.trim())
    return sections
      .map((section) => {
        const lines = section.trim().split("\n")
        const headerLine = lines[0]
        const contentLines = lines.slice(1)
        const headerMatch = headerLine.match(/^(#+)\s*(.+)/)
        if (!headerMatch) return null
        const level = headerMatch[1].length
        const title = headerMatch[2].trim()
        const content = contentLines.join("\n").trim()
        return { level, title, content }
      })
      .filter(Boolean)
  }

  const processDoctorInsights = (bullets: string[] = []) => {
    const clean = (str: string) => {
      return str
        .replace(/[*#]+/g, "")
        .replace(/^-\s*/, "")
        .replace(/^\w+\s*-\s*/, "")
        .trim()
    }
    const sections: Record<string, string[]> = {
      Treatment: [],
      Instructions: [],
      General: [],
    }
    bullets.forEach((text) => {
      const cleanText = clean(text)
      if (cleanText) {
        if (/treatment|therapy|medication|administered/i.test(text)) {
          sections.Treatment.push(cleanText)
        } else if (/instruction|education|precaution/i.test(text)) {
          sections.Instructions.push(cleanText)
        } else {
          sections.General.push(cleanText)
        }
      }
    })
    return sections
  }

  const processPatientInsights = (bullets: string[] = []) => {
    return bullets
      .map((bullet) =>
        bullet
          .replace(/[*#]+/g, "")
          .replace(/^-\s*/, "")
          .replace(/^\w+\s*Summary\s*-\s*/i, "")
          .trim()
      )
      .filter((bullet) => bullet.length > 0)
  }

  const renderContentSections = (content: string) => {
    const sections = parseContentSections(content || "")
    return sections.map((section, index) => {
      if (!section) return null
      const { level, title, content: sectionContent } = section
      const displayTitle = title === "Patient Chief Concerns & Symptoms"
        ? "Current Symptoms"
        : title === "Encounter Summary"
          ? "Subjective"
          : title

      const formatContent = (text: string) => {
        const lines = text.split("\n").filter((line) => line.trim())

        return lines
          .map((line, lineIndex) => {
            let content = line.trim()
            if (!content) return null

            if (content.startsWith("-") || content.startsWith("•")) {
              const bulletText = content.replace(/^[-•]\s*/, "").trim()
              const parts = bulletText.split(/(\*\*[^*]+\*\*)/g)

              const formattedParts = parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return <strong key={i}>{part.slice(2, -2).trim()}</strong>
                }
                return part
              })

              return (
                <li
                  key={lineIndex}
                  className="text-gray-700 text-[16px] leading-relaxed ml-4 mb-1"
                >
                  {formattedParts}
                </li>
              )
            }

            // Same logic for normal paragraphs
            const parts = content.split(/(\*\*[^*]+\*\*)/g)
            const formattedParts = parts.map((part, i) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={i}>{part.slice(2, -2).trim()}</strong>
              }
              return part
            })

            return (
              <p
                key={lineIndex}
                className="text-gray-700 text-[16px] leading-relaxed mb-2"
              >
                {formattedParts}
              </p>
            )
          })
          .filter(Boolean)
      }

      const HeaderTag = level === 1 ? "h2" : "h3"
      const headerClass =
        level === 1
          ? "text-lg font-bold text-[#0975bb] mb-3 mt-6 first:mt-0 border-b border-gray-200"
          : "text-[16px] font-bold text-[#0975bb] mb-2 mt-4 border-b border-gray-200"
      return (
        <div key={index} className="mb-4">
          <HeaderTag className={headerClass}>{displayTitle}</HeaderTag>
          <div className="pl-2">
            {sectionContent.includes("-") || sectionContent.includes("•") ? (
              <ul className="list-disc space-y-1">
                {formatContent(sectionContent)}
              </ul>
            ) : (
              <div>{formatContent(sectionContent)}</div>
            )}
          </div>
        </div>
      )
    })
  }

  const patientName = epicPatientName || "Patient"
  const doctorName = epicDoctorName || "Doctor"
  const doctorBullets = summaryId?.summary?.ui?.insights?.doctor?.bullets ?? []
  const structuredInsights = processDoctorInsights(doctorBullets)
  const patientBullets = summaryId?.summary?.ui?.insights?.patient?.bullets ?? []
  const processedPatientInsights = processPatientInsights(patientBullets)
  const followupNote = summaryId?.summary?.ui?.followup?.note?.replace(/\*\*/g, "") ?? ""
  const followupDate = summaryId?.summary?.ui?.followup?.date ?? "To be scheduled"

  // Get the latest objective data
  const latestObjective = objectiveData.length > 0 ? objectiveData[0] : null;

  const Loader = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
    </div>
  )

  const handleDownloadRecording = async () => {
    try {
      setIsDownloading(true)
      const info = await APIService.getRecordingInfo(sessionId)
      const url = info?.web_url || ""
      if (!url) throw new Error("Recording URL not available")
      const response = await fetch(url, { method: "GET" })
      if (!response.ok)
        throw new Error(`Failed to fetch audio: ${response.status}`)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download =
        info?.filename || `Patient-${patientName.replace("#", "")}.wav`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      showNotification("Recording downloaded successfully!")
    } catch (err) {
      handleApiError(err, "Failed to download recording")
    } finally {
      setIsDownloading(false)
    }
  }

  const formatDisplayDate = (dateString: string | null) => {
    if (!dateString) return "No date"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "Invalid date"
    }
  }

  const getDisplayTypes = (types: DocumentReferenceType[]) => {
    if (!types.length) return ["No type specified"]
    const loincType = types.find((t) => t.system === "http://loinc.org")
    if (loincType) return [loincType.display]
    return types.map((t) => t.display).filter(Boolean)
  }

  const stripMarkdownForEditing = (text: string): string => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')           // remove **bold**
      .replace(/\*([^*]+)\*/g, '$1')               // remove *italic* if you have any
      .replace(/^\s*###?\s*/gm, '')                 // optional: remove ### if you don't want them in edit
      .replace(/^\s*##\s*/gm, '')                   // optional: remove ## in edit mode
      .replace(/\n{3,}/g, '\n\n')                   // clean up excessive newlines
      .trim();
  };

  // Function to render objective data section inside Visit Summary
  const renderObjectiveSection = () => {
    if (isLoadingObjective) {
      return (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Objective</h3>
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-600"></div>
          </div>
        </div>
      );
    }

    if (!latestObjective) {
      return null;
    }

    const {
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      temperature_f,
      oxygen_saturation,
      general_appearance,
      heent,
      neurological
    } = latestObjective;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Objective</h3>
        
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-blue-600" />
            Vital Signs
          </h4>
          <ul className="list-none space-y-2 pl-6">
            <li className="text-gray-700 text-[16px] leading-relaxed">
              <span className="font-medium">Blood Pressure:</span> {blood_pressure_systolic}/{blood_pressure_diastolic} mmHg
            </li>
            <li className="text-gray-700 text-[16px] leading-relaxed">
              <span className="font-medium">Heart Rate:</span> {heart_rate} bpm
            </li>
            <li className="text-gray-700 text-[16px] leading-relaxed">
              <span className="font-medium">Respiratory Rate:</span> {respiratory_rate} breaths/min
            </li>
            <li className="text-gray-700 text-[16px] leading-relaxed">
              <span className="font-medium">Temperature:</span> {temperature_f}°F
            </li>
            <li className="text-gray-700 text-[16px] leading-relaxed">
              <span className="font-medium">Oxygen Saturation:</span> {oxygen_saturation}% on room air
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-2">General Appearance</h4>
            <p className="text-gray-700 text-[16px] leading-relaxed pl-4">
              {general_appearance}
            </p>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-2">HEENT</h4>
            <p className="text-gray-700 text-[16px] leading-relaxed pl-4">
              {heent}
            </p>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-2">Neurological</h4>
            <p className="text-gray-700 text-[16px] leading-relaxed pl-4">
              {neurological}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {isLoading && <Loader />}
      <>
        <div
          className={`w-full mt-12 p-16 mx-auto bg-gray-50 min-h-screen rounded-lg summaryGenerationSection relative ${
            isLoading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {notification.show && (
            <div className="fixed top-4 right-4 z-50">
              <div className="flex items-center bg-green-500 text-white text-[16px] font-bold px-4 py-3 rounded-md shadow-lg">
                <CheckCircle className="h-5 w-5 mr-2" />
                {notification.message}
              </div>
            </div>
          )}


          {/* Audio Player Section */}
          <div className="rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center">
                  <svg
                    width="10"
                    height="14"
                    viewBox="0 0 10 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M5 8.8421C6.18575 8.8421 7.14283 7.85471 7.14283 6.6316V2.21053C7.14283 0.987368 6.18575 0 5 0C3.81425 0 2.85714 0.987368 2.85714 2.21053V6.6316C2.85714 7.85471 3.81425 8.8421 5 8.8421ZM4.28575 2.21053C4.28575 1.80527 4.60717 1.47369 5 1.47369C5.39283 1.47369 5.71425 1.80527 5.71425 2.21053V6.6316C5.71425 7.04423 5.4 7.3684 5 7.3684C4.60717 7.3684 4.28575 7.03684 4.28575 6.6316V2.21053ZM8.78575 6.6316H10C10 9.14418 8.05717 11.2221 5.71425 11.5832V14H4.28575V11.5832C1.94286 11.2221 0 9.14418 0 6.6316H1.21428C1.21428 8.8421 3.02858 10.3895 5 10.3895C6.97142 10.3895 8.78575 8.8421 8.78575 6.6316Z"
                      fill="#fff"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 text-white">
                  Patient-{patientName.replace("#", "")}.mp3
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDownloadRecording}
                  disabled={isDownloading || isLoading || isApproved}
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                      <span>Downloading...</span>
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
                          strokeWidth="2"
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Audio Player */}
            <div className="relative w-full max-w-2xl mb-6">
              <div className="relative rounded-full overflow-hidden flex items-center px-2 py-2 border border-white">
                <div className="flex items-center space-x-2 mr-3">
                  <button
                    className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLoadingAudio ? "animate-pulse" : ""
                    }`}
                    onClick={togglePlayPause}
                    disabled={isLoadingAudio || isLoading || isApproved}
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isLoadingAudio ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5 text-white" />
                    ) : (
                      <Play className="h-5 w-5 text-white ml-0.5" />
                    )}
                  </button>
                </div>

                <div className="relative flex-1 h-6 mx-2 overflow-hidden">
                  <div className="absolute inset-0 flex items-center space-x-0.5">
                    {waveformHeights.current.map((height, i) => (
                      <div
                        key={`gray-${i}`}
                        className="w-0.5 bg-blue-300 rounded-full opacity-[.37]"
                        style={{ height: `${height}px` }}
                      />
                    ))}
                  </div>

                  <div
                    className="absolute inset-0 flex items-center space-x-0.5 overflow-hidden"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="flex items-center space-x-0.5">
                      {waveformHeights.current.map((height, i) => (
                        <div
                          key={`blue-${i}`}
                          className={`w-0.5 bg-blue-200 rounded-full transition-all duration-300 ease-in-out ${
                            isPlaying ? "animate-pulse" : ""
                          }`}
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center space-x-2 mx-3"
                  ref={progressRef}
                >
                  <div className="w-16 text-white text-xs font-medium text-left min-w-[3.5rem]">
                    {formatTime(currentTime)}
                  </div>

                  <div
                    className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer relative group"
                    onClick={handleSeek}
                  >
                    <div
                      className={`h-full bg-white/80 rounded-full transition-all duration-300 ease-linear relative overflow-hidden ${
                        isPlaying ? "animate-pulse" : ""
                      }`}
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                    </div>
                  </div>

                  <div className="w-10 text-white text-xs font-medium text-right min-w-[2.5rem]">
                    {formatTime(duration)}
                  </div>
                </div>
              </div>
            </div>
          </div>

   {/* NEW: Info Cards Section */}
          <div className="flex  items-center gap-4 mb-8">
            {/* Patient Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 w-[20%] h-[180px] flex flex-col  items-center">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-[#0975bb] rounded-full flex items-center text-[#fff] justify-center overflow-hidden">
                  {patientName.charAt(0).toUpperCase()}
                </div>
              </div>
               <p className="text-[24px] font-semibold text-gray-900">{patientName}</p>
              <h3 className="text-lx font-semibold text-gray-500 mb-1">Patient</h3>
             
            </div>

            {/* Symptoms Card */}
            <div className="bg-blue-500 rounded-lg shadow-sm p-6 text-white w-[30%] h-[180px] relative">
              <div className="flex items-center mb-3">
                <svg width="29" height="24" viewBox="0 0 29 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28.275 16.5H27.7258C26.434 16.5 25.7869 14.8842 26.7004 13.9392L27.0892 13.5375C27.1565 13.4678 27.2099 13.3852 27.2463 13.2942C27.2828 13.2032 27.3015 13.1056 27.3015 13.0071C27.3015 12.9086 27.2828 12.8111 27.2463 12.7201C27.2099 12.6291 27.1565 12.5464 27.0892 12.4767C27.0218 12.4071 26.9419 12.3518 26.8539 12.3141C26.766 12.2764 26.6717 12.257 26.5765 12.257C26.4812 12.257 26.387 12.2764 26.299 12.3141C26.211 12.3518 26.1311 12.4071 26.0637 12.4767L25.6754 12.8789C24.7619 13.8239 23.2 13.1545 23.2 11.8181V11.25C23.2 11.0511 23.1236 10.8603 22.9877 10.7197C22.8517 10.579 22.6673 10.5 22.475 10.5C22.2827 10.5 22.0983 10.579 21.9623 10.7197C21.8264 10.8603 21.75 11.0511 21.75 11.25V11.8181C21.75 13.1545 20.1881 13.8239 19.2746 12.8789L18.8862 12.4767C18.7503 12.3361 18.5658 12.257 18.3735 12.257C18.1812 12.257 17.9968 12.3361 17.8608 12.4767C17.7248 12.6174 17.6485 12.8082 17.6485 13.0071C17.6485 13.206 17.7248 13.3968 17.8608 13.5375L18.2496 13.9392C19.1631 14.8842 18.516 16.5 17.2242 16.5H16.675C16.4827 16.5 16.2983 16.579 16.1623 16.7197C16.0264 16.8603 15.95 17.0511 15.95 17.25C15.95 17.4489 16.0264 17.6397 16.1623 17.7803C16.2983 17.921 16.4827 18 16.675 18H17.2242C18.516 18 19.1631 19.6158 18.2496 20.5608L17.8608 20.9625C17.7935 21.0322 17.7401 21.1148 17.7036 21.2058C17.6672 21.2969 17.6485 21.3944 17.6485 21.4929C17.6485 21.5914 17.6672 21.6889 17.7036 21.7799C17.7401 21.8709 17.7935 21.9536 17.8608 22.0233C17.9282 22.0929 18.0081 22.1482 18.0961 22.1859C18.184 22.2236 18.2783 22.243 18.3735 22.243C18.4688 22.243 18.563 22.2236 18.651 22.1859C18.739 22.1482 18.8189 22.0929 18.8862 22.0233L19.2746 21.6211C20.1881 20.6761 21.75 21.3455 21.75 22.6819V23.25C21.75 23.4489 21.8264 23.6397 21.9623 23.7803C22.0983 23.921 22.2827 24 22.475 24C22.6673 24 22.8517 23.921 22.9877 23.7803C23.1236 23.6397 23.2 23.4489 23.2 23.25V22.6819C23.2 21.3455 24.7619 20.6761 25.6754 21.6211L26.0637 22.0233C26.1311 22.0929 26.211 22.1482 26.299 22.1859C26.387 22.2236 26.4812 22.243 26.5765 22.243C26.6717 22.243 26.766 22.2236 26.8539 22.1859C26.9419 22.1482 27.0218 22.0929 27.0892 22.0233C27.1565 21.9536 27.2099 21.8709 27.2463 21.7799C27.2828 21.6889 27.3015 21.5914 27.3015 21.4929C27.3015 21.3944 27.2828 21.2969 27.2463 21.2058C27.2099 21.1148 27.1565 21.0322 27.0892 20.9625L26.7004 20.5608C25.7869 19.6158 26.434 18 27.7258 18H28.275C28.4673 18 28.6517 17.921 28.7877 17.7803C28.9236 17.6397 29 17.4489 29 17.25C29 17.0511 28.9236 16.8603 28.7877 16.7197C28.6517 16.579 28.4673 16.5 28.275 16.5ZM21.75 18C21.4632 18 21.1829 17.912 20.9444 17.7472C20.706 17.5824 20.5201 17.3481 20.4104 17.074C20.3006 16.7999 20.2719 16.4983 20.3279 16.2074C20.3838 15.9164 20.5219 15.6491 20.7247 15.4393C20.9275 15.2296 21.1858 15.0867 21.4671 15.0288C21.7484 14.9709 22.0399 15.0006 22.3049 15.1142C22.5698 15.2277 22.7963 15.42 22.9556 15.6666C23.115 15.9133 23.2 16.2033 23.2 16.5C23.2 16.8978 23.0472 17.2794 22.7753 17.5607C22.5034 17.842 22.1346 18 21.75 18ZM15.7012 9.99984H16.4335C16.6898 9.99984 16.9357 9.8945 17.1169 9.707C17.2982 9.51949 17.4 9.26518 17.4 9C17.4 8.73483 17.2982 8.48051 17.1169 8.293C16.9357 8.1055 16.6898 8.00016 16.4335 8.00016H15.7012C13.9794 8.00016 13.1162 5.84391 14.3342 4.58578L14.8521 4.04953C15.0323 3.86177 15.1332 3.60778 15.1327 3.3432C15.1322 3.07861 15.0304 2.82501 14.8495 2.63795C14.6686 2.45089 14.4235 2.34563 14.1677 2.34522C13.9119 2.34482 13.6664 2.4493 13.485 2.63578L12.9671 3.17156C11.7491 4.43156 9.66652 3.53953 9.66652 1.75734V0.999844C9.66652 0.734669 9.56469 0.480355 9.38343 0.292847C9.20217 0.10534 8.95634 0 8.7 0C8.44366 0 8.19783 0.10534 8.01657 0.292847C7.83531 0.480355 7.73348 0.734669 7.73348 0.999844V1.75734C7.73348 3.53859 5.64911 4.43156 4.43292 3.17156L3.915 2.63578C3.73356 2.4493 3.48807 2.34482 3.2323 2.34522C2.97654 2.34563 2.73135 2.45089 2.55047 2.63795C2.36959 2.82501 2.26775 3.07861 2.26727 3.3432C2.2668 3.60778 2.36772 3.86177 2.54792 4.04953L3.06584 4.58578C4.28384 5.84578 3.42155 8.00016 1.69877 8.00016H0.966516C0.71018 8.00016 0.464343 8.1055 0.283086 8.293C0.101829 8.48051 0 8.73483 0 9C0 9.26518 0.101829 9.51949 0.283086 9.707C0.464343 9.8945 0.71018 9.99984 0.966516 9.99984H1.69877C3.42064 9.99984 4.28384 12.1561 3.06584 13.4142L2.54792 13.95C2.45816 14.0429 2.38695 14.1531 2.33837 14.2744C2.28979 14.3958 2.26479 14.5258 2.26479 14.6571C2.26479 14.9223 2.36664 15.1767 2.54792 15.3642C2.72921 15.5518 2.97508 15.6571 3.23146 15.6571C3.48784 15.6571 3.73371 15.5518 3.915 15.3642L4.43292 14.8284C5.65092 13.5684 7.73348 14.4605 7.73348 16.2427V17.0002C7.73348 17.2653 7.83531 17.5196 8.01657 17.7072C8.19783 17.8947 8.44366 18 8.7 18C8.95634 18 9.20217 17.8947 9.38343 17.7072C9.56469 17.5196 9.66652 17.2653 9.66652 17.0002V16.2427C9.66652 14.4614 11.7509 13.5684 12.9671 14.8284L13.485 15.3642C13.6663 15.5518 13.9122 15.6571 14.1685 15.6571C14.4249 15.6571 14.6708 15.5518 14.8521 15.3642C15.0334 15.1767 15.1352 14.9223 15.1352 14.6571C15.1352 14.3919 15.0334 14.1375 14.8521 13.95L14.3342 13.4142C13.1162 12.1542 13.9785 9.99984 15.7012 9.99984ZM7.25 9C6.96322 9 6.68287 8.91203 6.44442 8.7472C6.20597 8.58238 6.02012 8.34811 5.91037 8.07403C5.80063 7.79994 5.77191 7.49834 5.82786 7.20736C5.88381 6.91639 6.02191 6.64912 6.2247 6.43934C6.42748 6.22956 6.68585 6.0867 6.96712 6.02882C7.24839 5.97094 7.53994 6.00065 7.80489 6.11418C8.06984 6.22771 8.2963 6.41997 8.45563 6.66665C8.61496 6.91332 8.7 7.20333 8.7 7.5C8.7 7.89783 8.54723 8.27936 8.2753 8.56066C8.00338 8.84196 7.63456 9 7.25 9ZM10.875 10.5C10.7316 10.5 10.5914 10.456 10.4722 10.3736C10.353 10.2912 10.2601 10.1741 10.2052 10.037C10.1503 9.89997 10.136 9.74917 10.1639 9.60368C10.1919 9.4582 10.261 9.32456 10.3623 9.21967C10.4637 9.11478 10.5929 9.04335 10.7336 9.01441C10.8742 8.98547 11.02 9.00032 11.1524 9.05709C11.2849 9.11386 11.3982 9.20999 11.4778 9.33332C11.5575 9.45666 11.6 9.60166 11.6 9.75C11.6 9.94891 11.5236 10.1397 11.3877 10.2803C11.2517 10.421 11.0673 10.5 10.875 10.5Z" fill="white"/>
                </svg>
              </div>
              <h3 className="text-[24px] font-semibold mb-2">Symptoms</h3>
              <p className="text-sm opacity-90 line-clamp-2">
                {extractSymptomsFromSummary()}
              </p>
              <span className="absolute bottom-0 right-0">
                <svg width="138" height="93" viewBox="0 0 138 93" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path opacity="0.1" d="M151.125 88H148.19C141.285 88 137.826 79.3825 142.709 74.3425L144.787 72.2C145.147 71.8285 145.432 71.3875 145.627 70.9022C145.822 70.4168 145.922 69.8966 145.922 69.3712C145.922 68.8459 145.822 68.3257 145.627 67.8403C145.432 67.355 145.147 66.914 144.787 66.5425C144.427 66.171 144 65.8764 143.53 65.6753C143.059 65.4743 142.556 65.3708 142.047 65.3708C141.538 65.3708 141.034 65.4743 140.564 65.6753C140.093 65.8764 139.666 66.171 139.306 66.5425L137.231 68.6875C132.348 73.7275 124 70.1575 124 63.03V60C124 58.9391 123.592 57.9217 122.865 57.1716C122.138 56.4214 121.153 56 120.125 56C119.097 56 118.112 56.4214 117.385 57.1716C116.658 57.9217 116.25 58.9391 116.25 60V63.03C116.25 70.1575 107.902 73.7275 103.019 68.6875L100.944 66.5425C100.217 65.7923 99.2312 65.3708 98.2034 65.3708C97.1756 65.3708 96.1898 65.7923 95.4631 66.5425C94.7363 67.2927 94.328 68.3103 94.328 69.3712C94.328 70.4322 94.7363 71.4498 95.4631 72.2L97.541 74.3425C102.424 79.3825 98.9651 88 92.0603 88H89.125C88.0973 88 87.1117 88.4214 86.385 89.1716C85.6582 89.9217 85.25 90.9391 85.25 92C85.25 93.0609 85.6582 94.0783 86.385 94.8284C87.1117 95.5786 88.0973 96 89.125 96H92.0603C98.9651 96 102.424 104.618 97.541 109.657L95.4631 111.8C95.1032 112.171 94.8177 112.612 94.6229 113.098C94.4282 113.583 94.328 114.103 94.328 114.629C94.328 115.154 94.4282 115.674 94.6229 116.16C94.8177 116.645 95.1032 117.086 95.4631 117.457C95.8229 117.829 96.2501 118.124 96.7203 118.325C97.1905 118.526 97.6945 118.629 98.2034 118.629C98.7123 118.629 99.2163 118.526 99.6865 118.325C100.157 118.124 100.584 117.829 100.944 117.457L103.019 115.312C107.902 110.272 116.25 113.842 116.25 120.97V124C116.25 125.061 116.658 126.078 117.385 126.828C118.112 127.579 119.097 128 120.125 128C121.153 128 122.138 127.579 122.865 126.828C123.592 126.078 124 125.061 124 124V120.97C124 113.842 132.348 110.272 137.231 115.312L139.306 117.457C139.666 117.829 140.093 118.124 140.564 118.325C141.034 118.526 141.538 118.629 142.047 118.629C142.556 118.629 143.059 118.526 143.53 118.325C144 118.124 144.427 117.829 144.787 117.457C145.147 117.086 145.432 116.645 145.627 116.16C145.822 115.674 145.922 115.154 145.922 114.629C145.922 114.103 145.822 113.583 145.627 113.098C145.432 112.612 145.147 112.171 144.787 111.8L142.709 109.657C137.826 104.618 141.285 96 148.19 96H151.125C152.153 96 153.138 95.5786 153.865 94.8284C154.592 94.0783 155 93.0609 155 92C155 90.9391 154.592 89.9217 153.865 89.1716C153.138 88.4214 152.153 88 151.125 88ZM116.25 96C114.717 96 113.219 95.5308 111.944 94.6518C110.67 93.7727 109.677 92.5233 109.09 91.0615C108.503 89.5997 108.35 87.9911 108.649 86.4393C108.948 84.8874 109.686 83.462 110.77 82.3431C111.854 81.2243 113.235 80.4624 114.738 80.1537C116.241 79.845 117.8 80.0035 119.216 80.609C120.632 81.2145 121.842 82.2398 122.694 83.5554C123.545 84.871 124 86.4177 124 88C124 90.1217 123.183 92.1566 121.73 93.6569C120.277 95.1572 118.305 96 116.25 96ZM83.9204 53.3325H87.8341C89.2042 53.3325 90.5182 52.7707 91.487 51.7706C92.4557 50.7706 93 49.4143 93 48C93 46.5857 92.4557 45.2294 91.487 44.2294C90.5182 43.2293 89.2042 42.6675 87.8341 42.6675H83.9204C74.7173 42.6675 70.1036 31.1675 76.6136 24.4575L79.3818 21.5975C80.345 20.5961 80.8844 19.2415 80.8818 17.8304C80.8793 16.4193 80.335 15.0667 79.3682 14.0691C78.4014 13.0714 77.0909 12.51 75.7239 12.5078C74.3569 12.5057 73.0448 13.0629 72.075 14.0575L69.3068 16.915C62.7968 23.635 51.6659 18.8775 51.6659 9.3725V5.3325C51.6659 3.91823 51.1216 2.56189 50.1528 1.56185C49.184 0.561815 47.8701 0 46.5 0C45.1299 0 43.816 0.561815 42.8472 1.56185C41.8784 2.56189 41.3341 3.91823 41.3341 5.3325V9.3725C41.3341 18.8725 30.1935 23.635 23.6932 16.915L20.925 14.0575C19.9552 13.0629 18.6431 12.5057 17.2761 12.5078C15.9091 12.51 14.5986 13.0714 13.6318 14.0691C12.665 15.0667 12.1207 16.4193 12.1182 17.8304C12.1156 19.2415 12.655 20.5961 13.6182 21.5975L16.3864 24.4575C22.8964 31.1775 18.2876 42.6675 9.07961 42.6675H5.16586C3.79579 42.6675 2.48183 43.2293 1.51305 44.2294C0.544259 45.2294 0 46.5857 0 48C0 49.4143 0.544259 50.7706 1.51305 51.7706C2.48183 52.7707 3.79579 53.3325 5.16586 53.3325H9.07961C18.2827 53.3325 22.8964 64.8325 16.3864 71.5425L13.6182 74.4C13.1384 74.8952 12.7579 75.4832 12.4982 76.1303C12.2386 76.7773 12.1049 77.4709 12.1049 78.1713C12.1049 79.5857 12.6493 80.9423 13.6182 81.9425C14.5871 82.9427 15.9013 83.5046 17.2716 83.5046C18.6419 83.5046 19.9561 82.9427 20.925 81.9425L23.6932 79.085C30.2032 72.365 41.3341 77.1225 41.3341 86.6275V90.6675C41.3341 92.0818 41.8784 93.4381 42.8472 94.4381C43.816 95.4382 45.1299 96 46.5 96C47.8701 96 49.184 95.4382 50.1528 94.4381C51.1216 93.4381 51.6659 92.0818 51.6659 90.6675V86.6275C51.6659 77.1275 62.8065 72.365 69.3068 79.085L72.075 81.9425C73.0439 82.9427 74.3581 83.5046 75.7284 83.5046C77.0987 83.5046 78.4128 82.9427 79.3818 81.9425C80.3507 80.9423 80.8951 79.5857 80.8951 78.1713C80.8951 76.7568 80.3507 75.4002 79.3818 74.4L76.6136 71.5425C70.1036 64.8225 74.7124 53.3325 83.9204 53.3325ZM38.75 48C37.2172 48 35.7188 47.5308 34.4443 46.6518C33.1698 45.7727 32.1765 44.5233 31.5899 43.0615C31.0034 41.5997 30.8499 39.9911 31.1489 38.4393C31.4479 36.8874 32.1861 35.462 33.2699 34.3431C34.3538 33.2243 35.7347 32.4624 37.238 32.1537C38.7414 31.845 40.2997 32.0035 41.7158 32.609C43.1319 33.2145 44.3423 34.2398 45.1939 35.5554C46.0455 36.871 46.5 38.4178 46.5 40C46.5 42.1217 45.6835 44.1566 44.2301 45.6569C42.7767 47.1571 40.8054 48 38.75 48ZM58.125 56C57.3586 56 56.6094 55.7654 55.9722 55.3259C55.3349 54.8864 54.8383 54.2616 54.545 53.5307C54.2517 52.7998 54.1749 51.9956 54.3245 51.2196C54.474 50.4437 54.843 49.731 55.385 49.1716C55.9269 48.6122 56.6173 48.2312 57.369 48.0769C58.1207 47.9225 58.8998 48.0017 59.6079 48.3045C60.316 48.6072 60.9212 49.1199 61.3469 49.7777C61.7727 50.4355 62 51.2089 62 52C62 53.0609 61.5917 54.0783 60.865 54.8284C60.1383 55.5786 59.1527 56 58.125 56Z" fill="white"/>
                </svg>
              </span>
            </div>

            {/* Family History Card */}
            <div className="bg-cyan-400 rounded-lg shadow-sm p-6 text-white w-[30%] h-[180px] relative">
              <div className="flex items-center mb-3">
                <svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.99807 11.5384C11.1512 11.5384 12.086 10.6036 12.086 9.45046C12.086 8.29734 11.1512 7.36255 9.99807 7.36255C8.84495 7.36255 7.91016 8.29734 7.91016 9.45046C7.91016 10.6036 8.84495 11.5384 9.99807 11.5384Z" fill="white"/>
                  <path d="M10.8907 11.6484H9.11258C7.63326 11.6484 6.42969 12.8573 6.42969 14.3423V16.5262L6.43518 16.5602L6.58476 16.607C7.99652 17.05 9.22329 17.1979 10.2331 17.1979C12.2047 17.1979 13.3475 16.6331 13.4181 16.5976L13.5581 16.5258L13.5725 16.5262V14.3421C13.5736 12.8573 12.3704 11.6484 10.8907 11.6484Z" fill="white"/>
                  <path d="M5.7424 6.7033C7.60864 6.7033 9.12152 5.20271 9.12152 3.35165C9.12152 1.50058 7.60864 0 5.7424 0C3.87617 0 2.36328 1.50058 2.36328 3.35165C2.36328 5.20271 3.87617 6.7033 5.7424 6.7033Z" fill="white"/>
                  <path d="M14.2581 6.7033C16.1245 6.7033 17.6371 5.20211 17.6371 3.35124C17.6371 1.50099 16.1239 0 14.2581 0C12.3913 0 10.8789 1.50058 10.8789 3.35124C10.8789 5.20191 12.3913 6.7033 14.2581 6.7033Z" fill="white"/>
                  <path d="M8.34605 11.3468C7.81261 10.8875 7.47337 10.2094 7.47337 9.45282C7.47337 8.52502 7.98294 7.71517 8.73626 7.28319C8.24571 7.0883 7.71248 6.97803 7.15315 6.97803H4.30188C1.92984 6.97783 0 8.90531 0 11.2731V14.755L0.00869844 14.8093L0.248816 14.8839C2.47036 15.577 4.40424 15.8155 6.00556 15.8242V14.3364C6.00556 12.8936 7.00386 11.6826 8.34605 11.3468Z" fill="white"/>
                  <path d="M15.6992 6.97803H12.8483C12.289 6.97803 11.7564 7.08829 11.2656 7.28318C12.0196 7.71516 12.5291 8.52458 12.5291 9.45276C12.5291 10.2089 12.1897 10.887 11.6567 11.3463C12.1939 11.4798 12.6885 11.7542 13.0905 12.1557C13.6747 12.7393 13.9965 13.514 13.9963 14.3368V15.8242C15.5976 15.8155 17.5317 15.5768 19.7529 14.8839L19.993 14.8094L20.0019 14.755V11.2732C20.0011 8.90547 18.0712 6.97803 15.6992 6.97803Z" fill="white"/>
                </svg>
              </div>
              <h3 className="text-[24px] font-semibold mb-2">Family History</h3>
              <p className="text-sm opacity-90 line-clamp-2">
                {extractFamilyHistoryFromSummary()}
              </p>
               <span className="absolute bottom-0 right-0">
                <svg width="125" height="86" viewBox="0 0 125 86" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g opacity="0.1">
                  <path d="M69.2902 67.5997C77.2796 67.5997 83.7562 62.1231 83.7562 55.3673C83.7562 48.6114 77.2796 43.1348 69.2902 43.1348C61.3009 43.1348 54.8242 48.6114 54.8242 55.3673C54.8242 62.1231 61.3009 67.5997 69.2902 67.5997Z" fill="white"/>
                  <path d="M75.4389 68.2441H63.1196C52.8701 68.2441 44.5312 75.3263 44.5312 84.027V96.8219L44.5693 97.0206L45.6057 97.2947C55.387 99.8901 63.8866 100.757 70.8832 100.757C84.5434 100.757 92.4607 97.448 92.95 97.2397L93.9201 96.8195L94.0202 96.8219V84.0258C94.0273 75.3263 85.6912 68.2441 75.4389 68.2441Z" fill="white"/>
                  <path d="M39.791 39.2727C52.7211 39.2727 63.2031 30.4812 63.2031 19.6364C63.2031 8.7915 52.7211 0 39.791 0C26.8609 0 16.3789 8.7915 16.3789 19.6364C16.3789 30.4812 26.8609 39.2727 39.791 39.2727Z" fill="white"/>
                  <path d="M98.7878 39.2727C111.719 39.2727 122.199 30.4777 122.199 19.634C122.199 8.79387 111.715 0 98.7878 0C85.8537 0 75.375 8.7915 75.375 19.634C75.375 30.4765 85.8537 39.2727 98.7878 39.2727Z" fill="white"/>
                  <path d="M57.8252 66.4781C54.1293 63.7875 51.7789 59.8142 51.7789 55.3819C51.7789 49.9462 55.3094 45.2015 60.5288 42.6706C57.13 41.5288 53.4355 40.8828 49.5603 40.8828H29.8054C13.3708 40.8816 0 52.1742 0 66.0462V86.446L0.0602667 86.7643L1.72391 87.2009C17.1157 91.2617 30.5146 92.659 41.6093 92.7099V83.9932C41.6093 75.5403 48.5259 68.4458 57.8252 66.4781Z" fill="white"/>
                  <path d="M108.757 40.8828H89.0048C85.1295 40.8828 81.4392 41.5288 78.0391 42.6706C83.2626 45.2014 86.7932 49.9437 86.7932 55.3816C86.7932 59.8114 84.4414 63.7846 80.7483 66.4751C84.4708 67.2572 87.8976 68.8652 90.6825 71.2173C94.7301 74.6368 96.96 79.1755 96.9586 83.9958V92.7099C108.053 92.659 121.454 91.2605 136.843 87.201L138.506 86.7644L138.568 86.4461V66.0468C138.562 52.1751 125.191 40.8828 108.757 40.8828Z" fill="white"/>
                  </g>
                  </svg>
              </span>
            </div>

            {/* Next Steps Card */}
            <div className="bg-purple-500 rounded-lg shadow-sm p-6 text-white w-[30%] h-[180px] relative">
              <div className="flex items-center mb-3">
               <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.586 10.0827C15.9553 10.3625 16.3901 10.4983 16.8203 10.4983C17.4371 10.4983 18.0481 10.2189 18.4506 9.68836C19.1324 8.78893 18.9553 7.50656 18.0563 6.82427L9.6012 0.415615C8.70132 -0.267133 7.41941 -0.0899727 6.73757 0.809456C6.05573 1.70888 6.23198 2.99171 7.13186 3.67355L7.24724 3.76076L0.928531 12.0982C0.191272 13.0721 -0.123074 14.2732 0.0436384 15.4824C0.210351 16.6921 0.838134 17.7632 1.81024 18.5L2.74965 19.2123C3.55232 19.821 4.5108 20.1413 5.50108 20.1413C5.71095 20.1413 5.92218 20.1272 6.13341 20.0977C7.34309 19.9319 8.41514 19.3041 9.15285 18.3306L15.4711 9.99407L15.586 10.0827ZM5.89492 15.8617C5.79498 15.9934 5.66688 16.0357 5.57649 16.048C5.48518 16.0598 5.35117 16.0543 5.21989 15.9548L4.27958 15.2417C4.1483 15.1426 4.10651 15.0145 4.09379 14.925C4.08107 14.8355 4.08743 14.7006 4.18691 14.5694L10.5056 6.23147L12.2132 7.5261L5.89492 15.8617Z" fill="white"/>
                <path d="M17.3913 11.9855C17.0892 11.6343 16.6472 11.4299 16.1839 11.4299C15.7196 11.4299 15.2785 11.6325 14.9764 11.9855C14.0021 13.1229 12.3672 15.2679 12.3672 16.8492C12.3672 18.9529 14.0802 20.665 16.1834 20.665C18.2866 20.665 19.9996 18.952 19.9996 16.8492C20.001 15.2657 18.3656 13.1229 17.3913 11.9855Z" fill="white"/>
                </svg>
              </div>
              <h3 className="text-[24px] font-semibold mb-2">Next Steps</h3>
              <p className="text-sm opacity-90">
                {followupNote ? "Follow-up tasks scheduled" : "No tasks scheduled"}
              </p>
               <span className="absolute bottom-0 right-0">
                <svg width="139" height="104" viewBox="0 0 139 104" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g opacity="0.1">
                <path d="M117.253 74.4355C120.032 76.5013 123.302 77.5041 126.538 77.5041C131.179 77.5041 135.775 75.4416 138.803 71.5247C143.933 64.8846 142.6 55.4175 135.837 50.3804L72.2295 3.06829C65.4597 -1.97212 55.8159 -0.664226 50.6865 5.97584C45.557 12.6159 46.883 22.0864 53.6528 27.1201L54.5208 27.764L6.98531 89.3153C1.43893 96.5054 -0.925881 105.372 0.32829 114.299C1.58246 123.23 6.30525 131.138 13.6184 136.577L20.6855 141.836C26.724 146.329 33.9346 148.694 41.3844 148.694C42.9633 148.694 44.5523 148.59 46.1414 148.372C55.2418 147.148 63.3068 142.513 68.8566 135.326L116.389 73.7816L117.253 74.4355ZM44.3473 117.1C43.5955 118.072 42.6318 118.384 41.9517 118.475C41.2648 118.562 40.2567 118.522 39.2691 117.787L32.1952 112.522C31.2075 111.791 30.8931 110.845 30.7975 110.185C30.7018 109.524 30.7496 108.528 31.498 107.559L79.0335 46.004L91.8793 55.5617L44.3473 117.1Z" fill="white"/>
                <path d="M130.839 88.4842C128.566 85.8919 125.241 84.3828 121.756 84.3828C118.263 84.3828 114.945 85.8785 112.672 88.4842C105.342 96.8816 93.043 112.717 93.043 124.391C93.043 139.921 105.93 152.561 121.752 152.561C137.575 152.561 150.461 139.915 150.461 124.391C150.472 112.7 138.169 96.8816 130.839 88.4842Z" fill="white"/>
                </g>
                </svg>
              </span>
            </div>
          </div>
          {/* Visit Summary Section */}
          <div className="rounded-lg shadow-sm p-12 mb-6 bg-white ">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[24px] font-semibold text-gray-900">
                Summary
              </h2>
              <div className="flex gap-4">
                <button
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={() => setShowICDGenerator(!showICDGenerator)}
                  disabled={isLoading || isApproved}
                >
                  ICD Code Generator
                </button>

                {/* NEW: Get Lab Results Button */}
                <button
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={fetchDiagnosticReports}
                  disabled={diagnosticReportsLoading || isLoading || isApproved}
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

                <SummaryPharmacyGen
                  data={pharmacyData}
                  setData={setPharmacyData}
                  sessionId={sessionId}
                  patientId={patientId}
                  doctorId={doctorId}
                />
            </div>
          </div>
            <div className="flex justify-between items-start items-center">
              <div className="w-[60%] pr-4">
                {isEdit ? (
                  <textarea
                    className="w-full h-96 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-[16px] resize-none"
                    value={stripMarkdownForEditing(editedSummary || summaryContent || "")}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    placeholder="Edit the summary here..."
                    disabled={isApproved}
                  />
                ) : (
                  <div className="text-gray-700 text-[16px] leading-relaxed">
                    {summaryContent === "Summary content not available." ? (
                      <p>{summaryContent}</p>
                    ) : (
                      <>
                        {renderContentSections(summaryContent || "")}
                        {renderObjectiveSection()}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="w-[40%] flex flex-col items-center justify-center">
                <Image
                  src="/summary-docter-petiont.svg"
                  alt="Doctor-Patient Illustration"
                  width={250}
                  height={170}
                  className="mt-12 w-[70%]"
                />
              </div>
            </div>
          </div>

          {/* Insights Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    Doctor Call Insights
                  </h3>
                  <p className="text-[16px] text-gray-600 mb-3">{doctorName}</p>
                  {Object.entries(structuredInsights).map(
                    ([section, items]) =>
                      items.length > 0 && (
                        <div key={section} className="mb-4">
                          <h4 className="text-[16px] font-semibold text-gray-800 mb-1">
                            {section}
                          </h4>
                          <ul className="text-[16px] text-gray-700 list-disc pl-5 space-y-1">
                            {items.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )
                  )}
                  {doctorBullets.length === 0 && (
                    <p className="text-[16px] text-gray-500">
                      No doctor insights available.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    Patient Call Insights
                  </h3>
                  <p className="text-[16px] text-gray-600 mb-3">{patientName}</p>
                  {processedPatientInsights.length > 0 ? (
                    <ul className="text-[16px] text-gray-700 list-disc pl-5 space-y-1">
                      {processedPatientInsights.map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[16px] text-gray-500">
                      No patient insights available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up Section */}
          <div className="rounded-lg shadow-sm p-6 follow-upAppointment-gradiant mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <Image
                  src="/follow-up-appointment.svg"
                  alt="Follow-up Illustration"
                  width={40}
                  height={40}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  Follow-up Appointment
                </h3>
                <p className="text-[16px] text-gray-600">
                  <span className="font-medium">Note:</span>{" "}
                  {followupNote || "No follow-up actions specified"}
                </p>
                <p className="text-[16px] text-gray-600">
                  <span className="font-medium">Date:</span> {followupDate}
                </p>
              </div>
            </div>
          </div>

          {/* Epic Documents Section */}
          <div className="rounded-lg shadow-sm p-6 my-6 bg-white z-10 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Epic FHIR Documents
              </h2>
              <button
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                onClick={fetchEpicDocumentReferences}
                disabled={isLoadingEpicDocuments}
              >
                {isLoadingEpicDocuments ? (
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
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
            </div>

            {isLoadingEpicDocuments ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
              </div>
            ) : epicDocuments.length > 0 ? (
              <>
                <div
                  className="max-h-80 overflow-y-auto space-y-3 pr-2 
                  scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 
                  hover:scrollbar-thumb-blue-400"
                >
                  {epicDocuments.map((doc, index) => (
                    <div
                      key={doc.id || `doc-${index}`}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors bg-white"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-800 text-[16px]">
                          ID : {doc.id || "No ID"}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            doc.status === "current"
                              ? "bg-green-100 text-green-800"
                              : doc.status === "entered-in-error"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {doc.status || "Unknown"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[16px] text-gray-600">
                        <div>
                          <p className="font-medium text-xs text-gray-500">
                            Date:
                          </p>
                          <p className="text-[16px]">
                            {formatDisplayDate(doc.date)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-xs text-gray-500">
                            Type:
                          </p>
                          <p className="text-[16px]">
                            {getDisplayTypes(doc.type).join(", ")}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-xs text-gray-500">
                            Authors:
                          </p>
                          <p className="text-[16px]">
                            {doc.author.length > 0
                              ? doc.author
                                  .map((author) =>
                                    author.includes("/")
                                      ? author.split("/")[1]
                                      : author
                                  )
                                  .join(", ")
                              : "No authors"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-xs text-gray-500">
                            Encounters:
                          </p>
                          <p className="text-[16px]">
                            {doc.encounters.length > 0
                              ? doc.encounters.length
                              : "No encounters"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No Epic documents found.</p>
              </div>
            )}
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
                d="M261.412 0C341.45 8.67863e-05 413.082 35.9951 461.001 92.6807V429.783C460.94 429.856 460.878 429.928 460.816 430H289.244C370.46 416.708 432.435 346.208 432.435 261.232C432.435 166.779 355.865 90.2101 261.412 90.21C166.959 90.21 90.3887 166.779 90.3887 261.232C90.3887 346.208 152.364 416.707 233.579 430H62.0068C23.4388 384.475 0.179688 325.571 0.179688 261.232C0.179741 116.958 117.137 0 261.412 0Z"
                fill="#C2F5F9"
                fillOpacity="0.2"
              />
            </svg>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-around space-x-4 mt-8 mb-8 relative z-[1]">
          <div className="flex gap-4">
            {!isEdit && (
              <button
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                onClick={handleSaveSummary}
                disabled={isLoading || isApproved}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>Save Summary</span>
              </button>
            )}

            {!isEdit && !isApproved && (
              <button
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                onClick={handleEditSummaryClick}
                disabled={isLoading || isApproved}
              >
                <Edit className="w-4 h-4 mr-2" />
                <span>Edit Summary</span>
              </button>
            )}

            {isEdit && (
              <button
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                onClick={handleSaveEditedSummary}
                disabled={isLoading || isApproved}
              >
                <Save className="w-4 h-4 mr-2" />
                <span>Save Changes</span>
              </button>
            )}

            {isEdit && (
              <button
                className="flex items-center px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                onClick={() => {
                  setIsEdit(false);
                  try {
                    if (typeof window !== "undefined") {
                      localStorage.setItem(`visitSummaryEdit:${sessionId}`, "false");
                      window.dispatchEvent(new CustomEvent("visitSummaryEditToggle", { detail: { sessionId, isEdit: false } }));
                    }
                  } catch {}
                }}
                disabled={isLoading || isApproved}
              >
                <span>Cancel</span>
              </button>
            )}
          </div>

          <button
            onClick={handleBackToEpic}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="pl-2">Back To EPIC</span>
          </button>
        </div>
      </>
{/* Report Details Modal - COMPLETE IMPLEMENTATION */}
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

      {/* Content */}
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
          <div className="space-y-8">
            {/* 1. Report Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-5 text-left">
                  <div className="text-sm text-gray-600 mb-1">
                    Report ID: {summaryDataLab.raw_report.id}
                  </div>
                  <div className="text-sm text-gray-600">
                    Order ID:{" "}
                    {summaryDataLab.raw_report.identifier?.[0]?.value ||
                      "N/A"}
                  </div>
                </div>
                <div className="col-span-4 text-center">
                  <h3 className="text-xl font-bold text-gray-900">
                    {summaryDataLab.raw_report.code?.text ||
                      "Diagnostic Report"}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Laboratory Report
                  </p>
                </div>
                <div className="col-span-3 text-right">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      summaryDataLab.raw_report.status
                    )}`}
                  >
                    {summaryDataLab.raw_report.status
                      .charAt(0)
                      .toUpperCase() +
                      summaryDataLab.raw_report.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2 & 3. Patient & Provider Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Patient Information
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Patient Name:
                    </span>
                    <span className="text-sm text-gray-900">
                      {summaryDataLab.patient_info.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Patient ID:
                    </span>
                    <span className="text-sm text-gray-900">
                      {summaryDataLab.patient_info.patient_id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Date of Birth:
                    </span>
                    <span className="text-sm text-gray-900">
                      {formatDateOnly(
                        summaryDataLab.patient_info.birth_date
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Gender:
                    </span>
                    <span className="text-sm text-gray-900 capitalize">
                      {summaryDataLab.patient_info.gender}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Provider & Lab Information
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Ordering Provider:
                    </span>
                    <span className="text-sm text-gray-900">
                      {summaryDataLab.provider_lab_info
                        .ordering_provider_name || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Laboratory Name:
                    </span>
                    <span className="text-sm text-gray-900">
                      {"CBC and differential"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Laboratory Address:
                    </span>
                    <span className="text-sm text-gray-900">{"N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-700">
                      Signature:
                    </span>
                    <span className="text-sm italic text-gray-500">
                      ____________________ (Digital Signature / NPI)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Date & Specimen Details */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Date & Specimen Details
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Effective Date
                  </div>
                  <div className="text-sm text-gray-900">
                    {formatDate(summaryDataLab.date_info.effective_datetime)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Reported Date
                  </div>
                  <div className="text-sm text-gray-900">
                    {formatDate(summaryDataLab.date_info.issued_datetime)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Specimen Type
                  </div>
                  <div className="text-sm text-gray-900">
                    {"Hospital Visit/Office Visit"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Specimen Reference ID
                  </div>
                  <div className="text-sm text-gray-900 font-mono break-words">
                    {summaryDataLab.raw_report.id}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Clinical / Medical History */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Clinical / Medical History
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Clinical Diagnosis:
                  </div>
                  <div className="text-sm text-gray-900 p-3 bg-blue-50 rounded-md">
                    {summaryDataLab.clinical_info.clinical_diagnosis ||
                      "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Encounter Description:
                  </div>
                  <div className="text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                    {summaryDataLab.clinical_info.encounter_description ||
                      "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Results Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <h4 className="text-lg font-semibold text-gray-900 p-6 border-b border-gray-200 bg-gray-50">
                Laboratory Results
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Test Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Reference Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Flag
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summaryDataLab.results?.map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {result.test_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {result.value}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {result.unit}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {result.reference_min} - {result.reference_max}{" "}
                          {result.reference_unit}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getFlagColor(
                              result.flag
                            )}`}
                          >
                            {result.flag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7. Interpretation & Final Diagnosis */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Interpretation & Final Diagnosis
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Results Interpretation:
                  </div>
                  <div className="text-sm text-gray-900 p-4 bg-gray-50 rounded-md min-h-[60px]">
                    {summaryDataLab.conclusion.results_interpretation ||
                      "No interpretation available"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Final Diagnosis:
                  </div>
                  <div className="text-sm text-gray-900 p-4 bg-blue-50 rounded-md min-h-[60px]">
                    {summaryDataLab.conclusion.final_diagnosis ||
                      "No final diagnosis available"}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            {summaryDataLab.stats && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Test Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {summaryDataLab.stats.total_tests}
                    </div>
                    <div className="text-sm text-gray-600">
                      Total Tests
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-green-600">
                      {summaryDataLab.stats.num_normal}
                    </div>
                    <div className="text-sm text-gray-600">Normal</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-red-600">
                      {summaryDataLab.stats.num_high}
                    </div>
                    <div className="text-sm text-gray-600">High</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {summaryDataLab.stats.num_low}
                    </div>
                    <div className="text-sm text-gray-600">Low</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-600">
                      {summaryDataLab.stats.num_unknown}
                    </div>
                    <div className="text-sm text-gray-600">Unknown</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeView === "epic" && epicData ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-900">
                EPIC Diagnostic Report - FHIR Format
              </h4>
              <button
                onClick={() => {
                  const blob = new Blob(
                    [JSON.stringify(epicData, null, 2)],
                    { type: "application/json" }
                  )
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `epic-report-${epicData.id || "data"}.json`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download JSON
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg">
              {/* Report Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-lg font-semibold text-gray-900">
                      FHIR Diagnostic Report
                    </h5>
                    <p className="text-sm text-gray-600">
                      Resource Type: {epicData.resourceType}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      epicData.status
                    )}`}
                  >
                    {epicData.status}
                  </span>
                </div>
              </div>

              {/* Basic Information */}
              <div className="p-6 border-b border-gray-200">
                <h6 className="text-md font-semibold text-gray-900 mb-4">
                  Basic Information
                </h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Report ID
                    </label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200">
                      <code className="text-sm text-gray-900">
                        {epicData.id}
                      </code>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Report Code
                    </label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="text-sm text-gray-900">
                        {epicData.code?.text || "N/A"}
                      </div>
                      {epicData.code?.coding?.map(
                        (coding: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-xs text-gray-600 mt-1"
                          >
                            {coding.system}: {coding.code} -{" "}
                            {coding.display}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Identifiers */}
              {epicData.identifier && epicData.identifier.length > 0 && (
                <div className="p-6 border-b border-gray-200">
                  <h6 className="text-md font-semibold text-gray-900 mb-4">
                    Identifiers
                  </h6>
                  <div className="space-y-3">
                    {epicData.identifier.map(
                      (identifier: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-gray-50 rounded border border-gray-200"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Type
                              </label>
                              <div className="text-sm text-gray-900">
                                {identifier.type?.text ||
                                  identifier.type?.coding?.[0]?.display ||
                                  "N/A"}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                System
                              </label>
                              <div className="text-sm text-gray-900 truncate">
                                {identifier.system || "N/A"}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Value
                              </label>
                              <div className="text-sm text-gray-900 font-medium">
                                {identifier.value || "N/A"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Subject & Encounter */}
              <div className="p-6 border-b border-gray-200">
                <h6 className="text-md font-semibold text-gray-900 mb-4">
                  Patient & Encounter
                </h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Patient
                    </label>
                    <div className="mt-1 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="text-sm text-gray-900">
                        {epicData.subject?.display || "N/A"}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Reference: {epicData.subject?.reference || "N/A"}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Encounter
                    </label>
                    <div className="mt-1 p-3 bg-green-50 rounded border border-green-200">
                      <div className="text-sm text-gray-900">
                        {epicData.encounter?.display || "N/A"}
                      </div>
                      {epicData.encounter?.identifier && (
                        <div className="text-xs text-gray-600 mt-1">
                          ID:{" "}
                          {epicData.encounter.identifier.value || "N/A"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="p-6 border-b border-gray-200">
                <h6 className="text-md font-semibold text-gray-900 mb-4">
                  Timing Information
                </h6>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Effective Date
                    </label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="text-sm text-gray-900">
                        {formatDate(epicData.effectiveDateTime)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Issued Date
                    </label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="text-sm text-gray-900">
                        {formatDate(epicData.issued)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Based On
                    </label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="text-sm text-gray-900">
                        {epicData.basedOn?.[0]?.display || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Categories */}
              {epicData.category && epicData.category.length > 0 && (
                <div className="p-6 border-b border-gray-200">
                  <h6 className="text-md font-semibold text-gray-900 mb-4">
                    Categories
                  </h6>
                  <div className="flex flex-wrap gap-2">
                    {epicData.category.map(
                      (category: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                        >
                          {category.text ||
                            category.coding?.[0]?.display ||
                            `Category ${idx + 1}`}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Performer */}
              {epicData.performer && epicData.performer.length > 0 && (
                <div className="p-6 border-b border-gray-200">
                  <h6 className="text-md font-semibold text-gray-900 mb-4">
                    Performer(s)
                  </h6>
                  <div className="space-y-3">
                    {epicData.performer.map(
                      (performer: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-gray-50 rounded border border-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {performer.display}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Type: {performer.type} | Reference:{" "}
                                {performer.reference}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Results */}
              {epicData.result && epicData.result.length > 0 && (
                <div className="p-6 border-b border-gray-200">
                  <h6 className="text-md font-semibold text-gray-900 mb-4">
                    Results ({epicData.result.length})
                  </h6>
                  <div className="space-y-3">
                    {epicData.result.map((result: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-green-50 rounded border border-green-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-800 text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {result.display}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Reference: {result.reference}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Details */}
              {epicData.code?.coding &&
                epicData.code.coding.length > 0 && (
                  <div className="p-6">
                    <h6 className="text-md font-semibold text-gray-900 mb-4">
                      Code Details
                    </h6>
                    <div className="space-y-3">
                      {epicData.code.coding.map(
                        (coding: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-gray-50 rounded border border-gray-200"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="text-xs font-medium text-gray-700">
                                  System
                                </label>
                                <div className="text-sm text-gray-900 truncate">
                                  {coding.system}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-700">
                                  Code
                                </label>
                                <div className="text-sm text-gray-900 font-mono">
                                  {coding.code}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-700">
                                  Display
                                </label>
                                <div className="text-sm text-gray-900">
                                  {coding.display}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        ) : activeView === "observations" && observationsData ? (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">
              Diagnostic Report Observations
            </h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Test Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Reference Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Flag
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {observationsData.observations?.map((obs, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {obs.test_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {obs.value}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {obs.unit}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {obs.reference_min} - {obs.reference_max}{" "}
                          {obs.reference_unit}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getFlagColor(
                              obs.flag
                            )}`}
                          >
                            {obs.flag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Select a view to load data</p>
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
                <div className="space-y-6">
                  {diagnosticReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow"
                    >
                      {/* Report Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {report.code.text || "Diagnostic Report"}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {formatDate(report.effectiveDateTime)}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                report.status
                              )}`}
                            >
                              {report.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Category */}
                      {report.category && report.category.length > 0 && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Category:{" "}
                          </span>
                          <span className="text-sm text-gray-600">
                            {report.category
                              .map(
                                (cat: any) =>
                                  cat.text || cat.coding?.[0]?.display
                              )
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Performer */}
                      {report.performer && report.performer.length > 0 && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Performed by:{" "}
                          </span>
                          <span className="text-sm text-gray-600">
                            {report.performer
                              .map((p: any) => p.display)
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Results */}
                      {report.result && report.result.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Results ({report.result.length}):
                          </div>
                          <div className="bg-gray-50 rounded-md p-3 space-y-1">
                            {report.result.map((result: any, idx: number) => (
                              <div
                                key={idx}
                                className="text-sm text-gray-600 flex items-start gap-2"
                              >
                                <span className="text-blue-600 mt-0.5">
                                  •
                                </span>
                                <span>{result.display}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Conclusion */}
                      {report.conclusionCode &&
                        report.conclusionCode.length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Diagnosis:
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-1">
                              {report.conclusionCode.map(
                                (conclusion: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-sm text-gray-800"
                                  >
                                    {conclusion.text ||
                                      conclusion.coding?.[0]?.display}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <svg
                            className="w-4 h-4"
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
                          View Details
                        </button>
                      </div>
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

      {/* Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          style={{ display: "none" }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false)
            setCurrentTime(0)
            setProgress(0)
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => {
            const target = e.target as HTMLAudioElement
            setDuration(target.duration || 0)
          }}
        />
      )}
    </>
  )
}