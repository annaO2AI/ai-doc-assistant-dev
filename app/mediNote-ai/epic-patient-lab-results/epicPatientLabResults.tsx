import React, { useState, useEffect } from "react"
import { APIService } from "../service/api"
import {
  DiagnosticReportObservations,
  DiagnosticReportSummary,
  EpicPatient,
  EpicPatientSearchProps,
} from "../types"

export default function EpicPatientLabResults({
  tokenId,
  onSelectPatient,
  selectedPatient,
  onClose,
  onSelectMedication,
}: EpicPatientSearchProps) {
  const [loading, setLoading] = useState(false)
  const [loadingPatientId, setLoadingPatientId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [patients, setPatients] = useState<EpicPatient[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Diagnostic Reports State
  const [showDiagnosticReports, setShowDiagnosticReports] = useState(false)
  const [diagnosticReports, setDiagnosticReports] = useState<any[]>([])
  const [diagnosticReportsLoading, setDiagnosticReportsLoading] =
    useState(false)
  const [diagnosticReportsError, setDiagnosticReportsError] = useState<
    string | null
  >(null)
  const [selectedPatientForReports, setSelectedPatientForReports] =
    useState<EpicPatient | null>(null)

  // New states for report details view
  const [showReportDetails, setShowReportDetails] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [activeView, setActiveView] = useState<
    "summary" | "epic" | "observations"
  >("summary")
  const [summaryData, setSummaryData] =
    useState<DiagnosticReportSummary | null>(null)
  const [observationsData, setObservationsData] =
    useState<DiagnosticReportObservations | null>(null)
  const [epicData, setEpicData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  // New state for view toggle
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')

  // Fetch patients on component mount
  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    if (!tokenId) {
      setError("Authentication token is required")
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await APIService.searchEpicPatients(tokenId)

      if (data.items && data.items.length > 0) {
        setPatients(data.items)
      } else {
        setError("No patients found")
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Error: ${err.message}`
          : "Failed to fetch patients"
      )
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDiagnosticReports = async (patientId: string) => {
    if (!patientId) {
      setDiagnosticReportsError("Patient ID is required")
      return
    }

    try {
      setDiagnosticReportsLoading(true)
      setDiagnosticReportsError(null)

      // API call to get diagnostic reports
      const response = await fetch(
        `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/diagnostic-report/search?token_id=${tokenId}&patient_id=${patientId}&_count=50`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch diagnostic reports: ${response.statusText}`
        )
      }

      const data = await response.json()

      if (data.entry && data.entry.length > 0) {
        const reports = data.entry.map((entry: any) => entry.resource)
        setDiagnosticReports(reports)
        setShowDiagnosticReports(true)
      } else {
        setDiagnosticReportsError(
          "No diagnostic reports found for this patient"
        )
        setDiagnosticReports([])
        setShowDiagnosticReports(true)
      }
    } catch (err) {
      setDiagnosticReportsError("Failed to fetch diagnostic reports")
      setDiagnosticReports([])
      setShowDiagnosticReports(true)
    } finally {
      setDiagnosticReportsLoading(false)
    }
  }

  const fetchReportData = async (
    reportId: string,
    type: "summary" | "epic" | "observations"
  ) => {
    if (!reportId || !tokenId) return

    try {
      setReportLoading(true)
      setReportError(null)

      const endpoints = {
        summary: `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/diagnostic-report/${reportId}/summary?token_id=${tokenId}`,
        epic: `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/diagnostic-report/${reportId}?token_id=${tokenId}`,
        observations: `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/diagnostic-report/${reportId}/observations?token_id=${tokenId}`,
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
          setSummaryData(data)
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
  }

  const handleViewReport = (report: any) => {
    setSelectedReport(report)
    setShowReportDetails(true)
    setActiveView("summary")
    // Load summary data by default
    fetchReportData(report.id, "summary")
  }

  const handleCloseReportDetails = () => {
    setShowReportDetails(false)
    setSelectedReport(null)
    setSummaryData(null)
    setEpicData(null)
    setObservationsData(null)
    setReportError(null)
  }

  const handleGetSummary = (patient: EpicPatient) => {
    if (patient) {
      setSelectedPatientForReports(patient)
      setLoadingPatientId(patient.id)
      fetchDiagnosticReports(patient.id)
    }
  }

  const handleCloseDiagnosticReports = () => {
    setShowDiagnosticReports(false)
    setDiagnosticReports([])
    setDiagnosticReportsError(null)
    setSelectedPatientForReports(null)
    setLoadingPatientId(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
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
  }

  const getFlagColor = (flag: string) => {
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
  }

  // Filter patients based on search query
  const filteredPatients = patients.filter(
    (patient) =>
      patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.given.some((name) =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  )

  return (
    <div className="epic-patient-search mt-10">
      <div className="w-[88%] mx-auto flex flex-col transcription-welcommassege-main rounded-[20px] p-10 autopharmacySearch-min relative">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-[24px] font-semibold text-[#fff] mb-3">
            Search Epic Patients - Lab Results
          </h3>

          {/* View Toggle Buttons */}
          <div className="flex items-center gap-2 justify-between">
            <div className="w-[600px]">
              <input
                type="text"
                placeholder="Search by name or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-[48px]"
              />
            </div>
            <div className="flex bg-[#0c9bcf] rounded-md p-1 justify-center items-center h-[48px]">
              <button
                onClick={() => setViewMode('card')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'card'
                    ? 'bg-[#0975BB] text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.20225 9.28961C6.64904 9.28961 7.01124 9.66393 7.01124 10.1257V16.1639C7.01124 16.6257 6.64904 17 6.20225 17H0.808989C0.362197 17 3.0577e-07 16.6257 0 16.1639V10.1257L0.000263343 10.1041C0.0113442 9.65232 0.369182 9.28961 0.808989 9.28961H6.20225ZM15.191 9.28961C15.6378 9.28961 16 9.66393 16 10.1257V16.1639C16 16.6257 15.6378 17 15.191 17H9.79775C9.35096 17 8.98876 16.6257 8.98876 16.1639V10.1257C8.98876 9.66393 9.35096 9.28961 9.79775 9.28961H15.191ZM10.6067 15.3279H14.382V10.9617H10.6067V15.3279ZM1.61798 15.3279H5.39326V10.9617H1.61798V15.3279ZM6.20225 0C6.64904 1.14918e-07 7.01124 0.374319 7.01124 0.836066V6.87433C7.01124 7.33607 6.64904 7.71039 6.20225 7.71039H0.808989C0.3622 7.71039 4.86447e-06 7.33607 0 6.87433V0.836066L0.000263343 0.814484C0.0113398 0.362712 0.369179 0 0.808989 0H6.20225ZM15.191 0C15.6378 0 16 0.374319 16 0.836066V6.87433C16 7.33607 15.6378 7.71039 15.191 7.71039H9.79775C9.35096 7.71039 8.98876 7.33606 8.98876 6.87433V0.836066C8.98876 0.374322 9.35096 4.71129e-06 9.79775 0H15.191ZM10.6067 6.03826H14.382V1.67213H10.6067V6.03826ZM1.61798 6.03826H5.39326V1.67213H1.61798V6.03826Z" fill="white"></path></svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[#0975BB] text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
               <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M5.81849 2.18194C5.81849 0.976889 4.8416 0 3.63656 0H2.18194C0.976889 0 0 0.976889 0 2.18194V3.63656C0 4.8416 0.976889 5.81849 2.18194 5.81849H3.63656C4.8416 5.81849 5.81849 4.8416 5.81849 3.63656V2.18194ZM4.36387 2.18194C4.36387 1.78026 4.03824 1.45462 3.63656 1.45462H2.18194C1.78026 1.45462 1.45462 1.78026 1.45462 2.18194V3.63656C1.45462 4.03824 1.78026 4.36387 2.18194 4.36387H3.63656C4.03824 4.36387 4.36387 4.03824 4.36387 3.63656V2.18194Z" fill="white"></path><path d="M7.27344 2.90895C7.27344 2.50727 7.59906 2.18164 8.00075 2.18164H15.2739C15.6756 2.18164 16.0012 2.50727 16.0012 2.90895C16.0012 3.31063 15.6756 3.63626 15.2739 3.63626H8.00075C7.59906 3.63626 7.27344 3.31063 7.27344 2.90895Z" fill="white"></path><path fillRule="evenodd" clipRule="evenodd" d="M5.81849 9.45537C5.81849 8.25029 4.8416 7.27344 3.63656 7.27344H2.18194C0.976889 7.27344 0 8.25029 0 9.45537V10.91C0 12.1151 0.976889 13.0919 2.18194 13.0919H3.63656C4.8416 13.0919 5.81849 12.1151 5.81849 10.91V9.45537ZM4.36387 9.45537C4.36387 9.05368 4.03824 8.72806 3.63656 8.72806H2.18194C1.78026 8.72806 1.45462 9.05368 1.45462 9.45537V10.91C1.45462 11.3117 1.78026 11.6373 2.18194 11.6373H3.63656C4.03824 11.6373 4.36387 11.3117 4.36387 10.91V9.45537Z" fill="white"></path><path d="M7.27344 10.1824C7.27344 9.7807 7.59906 9.45508 8.00075 9.45508H15.2739C15.6756 9.45508 16.0012 9.7807 16.0012 10.1824C16.0012 10.5841 15.6756 10.9097 15.2739 10.9097H8.00075C7.59906 10.9097 7.27344 10.5841 7.27344 10.1824Z" fill="white"></path></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-600 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="animate-spin h-10 w-10 text-[#fff]"
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
              <p className="text-sm text-[#ffffffb3]">Loading Epic patients...</p>
            </div>
          </div>
        )}

        {/* Patients List - Conditional Rendering based on viewMode */}
        {!loading && (
          <div className="flex-1 relative z-[2]">
            {filteredPatients.length > 0 ? (
              <>
                {viewMode === 'card' ? (
                  // Card/Grid View
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredPatients.map((patient) => {
                      const isSelected = selectedPatient?.mrn === patient.mrn
                      return (
                        <div
                          key={patient.id}
                          className={`rounded-lg p-6 transition-all bg-white hover:shadow-xl transition-all border border-gray-200 hover:border-blue-300 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 shadow-md"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold ot-title text-lg flex justify-center items-center gap-2">
                                  <span className="avatar-scr">{patient.full_name.charAt(0).toUpperCase()}</span>
                                  <span className="">{patient.full_name}</span>
                                </h4>
                                {isSelected && (
                                  <svg
                                    className="w-5 h-5 text-blue-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="mt-3 space-y-1 text-sm ot-title">
                                <div className="flex gap-2 items-center">
                                  <span className="font-medium">MRN:</span>
                                  <span className="font-semibold text-blue-600">
                                    {patient.mrn}
                                  </span>
                                </div>
                                <div className="flex gap-2 items-center">
                                  <span className="font-medium">Patient ID:</span>
                                  <span
                                    className="font-mono text-xs truncate max-w-[150px]"
                                    title={patient.id}
                                  >
                                    {patient.id}
                                  </span>
                                </div>
                                {patient.external_id && (
                                  <div className="flex gap-2 items-center">
                                    <span className="font-medium">External ID:</span>
                                    <span className="text-md truncate max-w-[150px]" title={patient.external_id} >
                                      {patient.external_id}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  isSelected
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {isSelected ? "Selected" : "Available"}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-2 pt-2">
                            <button
                              onClick={() => handleGetSummary(patient)}
                              disabled={loadingPatientId !== null}
                              className="px-3 py-2 bg-[#0975BB] text-white text-sm font-medium rounded-md hover:bg-[#04609C] transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed w-full"
                            >
                              {loadingPatientId === patient.id ? (
                                <>
                                  <svg
                                    className="animate-spin h-4 w-4"
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
                                  Loading...
                                </>
                              ) : (
                                <>
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
                                  Get Lab Results
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  // Table View
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            MRN
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            External ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPatients.map((patient) => {
                          const isSelected = selectedPatient?.mrn === patient.mrn
                          return (
                            <tr
                              key={patient.id}
                              className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="avatar-scr text-lg mr-3">
                                    {patient.full_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {patient.full_name}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-semibold text-blue-600">
                                  {patient.mrn}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                                  {patient.id}
                                </code>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {patient.external_id || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                    isSelected
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {isSelected ? "Selected" : "Available"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <button
                                  onClick={() => handleGetSummary(patient)}
                                  disabled={loadingPatientId !== null}
                                  className="px-4 py-2 bg-[#0975BB] text-white text-sm font-medium rounded-md hover:bg-[#04609C] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                  {loadingPatientId === patient.id ? "Loading..." : "Get Lab Results"}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-gray-500 mt-4">
                  {searchQuery
                    ? `No patients found matching "${searchQuery}"`
                    : "No patients available"}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected Patient Info Footer */}
        {selectedPatient && !showDiagnosticReports && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-800 mb-1">
                  Currently Selected
                </h4>
                <p className="text-sm text-blue-700 font-semibold">
                  {selectedPatient.full_name}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  MRN: {selectedPatient.mrn}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        )}

        <span className="rightlinerGrading">
          <svg width="461" height="430" viewBox="0 0 461 430" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M261.412 0C341.45 8.67863e-05 413.082 35.9951 461.001 92.6807V429.783C460.94 429.856 460.878 429.928 460.816 430H289.244C370.46 416.708 432.435 346.208 432.435 261.232C432.435 166.779 355.865 90.2101 261.412 90.21C166.959 90.21 90.3887 166.779 90.3887 261.232C90.3887 346.208 152.364 416.707 233.579 430H62.0068C23.4388 384.476 0.179688 325.571 0.179688 261.232C0.179741 116.958 117.137 0 261.412 0Z" fill="#C2F5F9" fillOpacity="0.2" />
          </svg>
        </span>
        <span className="bottomlinerGrading">
          <svg width="289" height="199" viewBox="0 0 289 199" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M74.4604 14.9961C29.4945 21.2278 -3.5762 38.2063 -12.2914 45.6118L-26.7382 51.5987L-18.129 238.328L15.9938 288.05L59.727 287.301L185.831 257.872C186.478 228.034 237.253 176.817 262.56 154.938C307.047 107.868 284.151 58.3168 267.142 39.4252C236.04 -2.0024 184.942 -2.74081 158.943 2.76831C155.608 3.47505 152.272 4.08963 148.876 4.38837C134.405 5.6613 97.5463 9.50809 74.4604 14.9961Z" fill="url(#paint0_linear_3427_90583)" fillOpacity="0.4" />
            <defs>
              <linearGradient id="paint0_linear_3427_90583" x1="307.848" y1="2.45841" x2="-6.38578" y2="289.124" gradientUnits="userSpaceOnUse">
                <stop stopColor="#45CEF1" />
                <stop offset="1" stopColor="#219DF1" />
              </linearGradient>
            </defs>
          </svg>
        </span>
      </div>

      {/* Diagnostic Reports Modal */}
      {showDiagnosticReports && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-card" onClick={handleCloseDiagnosticReports}>
          <div className="bg-white rounded-tl-lg rounded-tr-lg shadow-2xl w-full max-w-5xl overflow-y-auto w-[500px] absolute top-[0] right-[0] h-[100vh]">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold ot-title flex gap-3 items-center">
                <span className="avatar-scr text-2xl">
                  {selectedPatientForReports?.full_name.charAt(0).toUpperCase()}
                </span>
                <span>
                  Lab Results - {selectedPatientForReports?.full_name} (MRN: {selectedPatientForReports?.mrn})
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

      {/* Report Details Modal */}
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
              ) : activeView === "summary" && summaryData ? (
                <div className="space-y-8">
                  {/* 1. Report Header */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* First column - takes 5/12 of the space */}
                      <div className="col-span-5 text-left">
                        <div className="text-sm text-gray-600 mb-1">
                          Report ID: {summaryData.raw_report.id}
                        </div>
                        <div className="text-sm text-gray-600">
                          Order ID:{" "}
                          {summaryData.raw_report.identifier?.[0]?.value ||
                            "N/A"}
                        </div>
                      </div>

                      {/* Second column - takes 4/12 of the space */}
                      <div className="col-span-4 text-center">
                        <h3 className="text-xl font-bold text-gray-900">
                          {summaryData.raw_report.code?.text ||
                            "Diagnostic Report"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Laboratory Report
                        </p>
                      </div>

                      {/* Third column - takes 3/12 of the space */}
                      <div className="col-span-3 text-right">
                        <div className="text-sm text-gray-600 mb-1">Status</div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            summaryData.raw_report.status
                          )}`}
                        >
                          {summaryData.raw_report.status
                            .charAt(0)
                            .toUpperCase() +
                            summaryData.raw_report.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2 & 3. Patient & Provider Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Patient Information */}
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
                            {summaryData.patient_info.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Patient ID:
                          </span>
                          <span className="text-sm text-gray-900">
                            {summaryData.patient_info.patient_id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Date of Birth:
                          </span>
                          <span className="text-sm text-gray-900">
                            {formatDateOnly(
                              summaryData.patient_info.birth_date
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Gender:
                          </span>
                          <span className="text-sm text-gray-900 capitalize">
                            {summaryData.patient_info.gender}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Provider & Lab Information */}
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
                            {summaryData.provider_lab_info
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
                          {formatDate(summaryData.date_info.effective_datetime)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Reported Date
                        </div>
                        <div className="text-sm text-gray-900">
                          {formatDate(summaryData.date_info.issued_datetime)}
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
                          {summaryData.raw_report.id}
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
                          {summaryData.clinical_info.clinical_diagnosis ||
                            "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          Encounter Description:
                        </div>
                        <div className="text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                          {summaryData.clinical_info.encounter_description ||
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
                          {summaryData.results?.map((result, index) => (
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
                          {summaryData.conclusion.results_interpretation ||
                            "No interpretation available"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Final Diagnosis:
                        </div>
                        <div className="text-sm text-gray-900 p-4 bg-blue-50 rounded-md min-h-[60px]">
                          {summaryData.conclusion.final_diagnosis ||
                            "No final diagnosis available"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Summary */}
                  {summaryData.stats && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                        Test Statistics
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                          <div className="text-2xl font-bold text-blue-600">
                            {summaryData.stats.total_tests}
                          </div>
                          <div className="text-sm text-gray-600">
                            Total Tests
                          </div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                          <div className="text-2xl font-bold text-green-600">
                            {summaryData.stats.num_normal}
                          </div>
                          <div className="text-sm text-gray-600">Normal</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                          <div className="text-2xl font-bold text-red-600">
                            {summaryData.stats.num_high}
                          </div>
                          <div className="text-sm text-gray-600">High</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                          <div className="text-2xl font-bold text-blue-600">
                            {summaryData.stats.num_low}
                          </div>
                          <div className="text-sm text-gray-600">Low</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                          <div className="text-2xl font-bold text-gray-600">
                            {summaryData.stats.num_unknown}
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
    </div>
  )
}