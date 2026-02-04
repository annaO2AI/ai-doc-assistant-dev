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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Patient Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-gray-300">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Patient</h3>
              <p className="text-lg font-bold text-gray-900">{patientName}</p>
            </div>

            {/* Symptoms Card */}
            <div className="bg-blue-500 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-2">Symptoms</h3>
              <p className="text-sm opacity-90 line-clamp-2">
                {extractSymptomsFromSummary()}
              </p>
            </div>

            {/* Family History Card */}
            <div className="bg-cyan-400 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-2">Family History</h3>
              <p className="text-sm opacity-90 line-clamp-2">
                {extractFamilyHistoryFromSummary()}
              </p>
            </div>

            {/* Next Steps Card */}
            <div className="bg-purple-500 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-2">Next Steps</h3>
              <p className="text-sm opacity-90">
                {followupNote ? "Follow-up tasks scheduled" : "No tasks scheduled"}
              </p>
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