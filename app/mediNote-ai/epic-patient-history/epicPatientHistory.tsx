"use client"

import React, { useState, useEffect } from "react"
import { APIService } from "../service/api"
import { EpicPatient } from "../types"

interface DocumentReference {
  id: string | null
  status: string | null
  date: string | null
  title: string | null
  author: string[]
  encounters: string[]
  type: {
    system: string
    code: string
    display: string
  }[]
}

interface DocumentReferenceResponse {
  ok: boolean
  total: number
  items: DocumentReference[]
  epic_status: number
}

interface EpicPatientHistoryProps {
  authToken: string
  onSelectPatient?: (patient: EpicPatient) => void
  selectedPatient?: EpicPatient | null
  onClose?: () => void
}

export default function EpicPatientHistory({
  authToken,
  onSelectPatient,
  selectedPatient,
  onClose,
}: EpicPatientHistoryProps) {
  const [loading, setLoading] = useState(false)
  const [loadingPatientId, setLoadingPatientId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [patients, setPatients] = useState<EpicPatient[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Document References State
  const [showDocumentReferences, setShowDocumentReferences] = useState(false)
  const [documentReferences, setDocumentReferences] = useState<
    DocumentReference[]
  >([])
  const [documentReferencesLoading, setDocumentReferencesLoading] =
    useState(false)
  const [documentReferencesError, setDocumentReferencesError] = useState<
    string | null
  >(null)
  const [selectedPatientForHistory, setSelectedPatientForHistory] =
    useState<EpicPatient | null>(null)

  // New state for view toggle
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null)

  // Fetch patients on component mount
  useEffect(() => {
    if (authToken) {
      fetchPatients()
    }
  }, [authToken])

  const fetchPatients = async () => {
    if (!authToken) {
      setError("Authentication token is required")
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await APIService.searchEpicPatients(authToken)

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

  const fetchDocumentReferences = async (patientId: string) => {
    if (!patientId) {
      setDocumentReferencesError("Patient ID is required")
      return
    }

    try {
      setDocumentReferencesLoading(true)
      setDocumentReferencesError(null)

      const response = await fetch(
        `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/fhir/documentreference?token_id=${authToken}&patient_id=${patientId}&count=10`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch document references: ${response.statusText}`
        )
      }

      const data: DocumentReferenceResponse = await response.json()

      if (data.ok && data.items && data.items.length > 0) {
        // Filter out null entries
        const validDocuments = data.items.filter((doc) => doc.id !== null)
        setDocumentReferences(validDocuments)
        setShowDocumentReferences(true)
      } else {
        setDocumentReferencesError("No patient history found")
        setDocumentReferences([])
        setShowDocumentReferences(true)
      }
    } catch (err) {
      setDocumentReferencesError("Failed to fetch patient history")
      setDocumentReferences([])
      setShowDocumentReferences(true)
    } finally {
      setDocumentReferencesLoading(false)
      setLoadingPatientId(null)
    }
  }

  const handleGetHistory = (patient: EpicPatient) => {
    if (patient) {
      setSelectedPatientForHistory(patient)
      setLoadingPatientId(patient.id)
      fetchDocumentReferences(patient.id)

      // Call parent's onSelectPatient if provided
      if (onSelectPatient) {
        onSelectPatient(patient)
      }
    }
  }

  const handleCloseDocumentReferences = () => {
    setShowDocumentReferences(false)
    setDocumentReferences([])
    setDocumentReferencesError(null)
    setSelectedPatientForHistory(null)
    setLoadingPatientId(null)
    setExpandedDocumentId(null)
  }

  const toggleDocumentDetails = (documentId: string | null) => {
    if (!documentId) return
    if (expandedDocumentId === documentId) {
      setExpandedDocumentId(null)
    } else {
      setExpandedDocumentId(documentId)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-800"
    switch (status.toLowerCase()) {
      case "current":
        return "bg-green-100 text-green-800"
      case "superseded":
        return "bg-yellow-100 text-yellow-800"
      case "entered-in-error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDocumentTypeColor = (types: DocumentReference["type"]) => {
    if (!types || types.length === 0) return "bg-blue-100 text-blue-800"
    const firstType = types[0]?.display || ""
    if (firstType.toLowerCase().includes("progress")) {
      return "bg-purple-100 text-purple-800"
    } else if (firstType.toLowerCase().includes("consult")) {
      return "bg-indigo-100 text-indigo-800"
    } else if (firstType.toLowerCase().includes("nursing")) {
      return "bg-teal-100 text-teal-800"
    } else if (firstType.toLowerCase().includes("discharge")) {
      return "bg-orange-100 text-orange-800"
    }
    return "bg-blue-100 text-blue-800"
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
            Search Epic Patients - Patient History
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
                              onClick={() => handleGetHistory(patient)}
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
                                  Get Patient History
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
                                  onClick={() => handleGetHistory(patient)}
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
                                  {loadingPatientId === patient.id ? "Loading..." : "Get History"}
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

        {/* Document References Modal / Popup */}
        {showDocumentReferences && (
          <div className="fixed inset-0 z-50 flex items-center justify-center glass-card" onClick={handleCloseDocumentReferences}>
            <div className="bg-white rounded-tl-lg rounded-tr-lg shadow-2xl w-full max-w-5xl overflow-y-auto w-[500px] absolute top-[0] right-[0] h-[100vh]">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold ot-title flex gap-3 items-center">
                  <span className="avatar-scr text-2xl">
                    {selectedPatientForHistory?.full_name.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    Patient History - {selectedPatientForHistory?.full_name} (MRN: {selectedPatientForHistory?.mrn})
                  </span>
                </h3>
                <button
                  onClick={handleCloseDocumentReferences}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {documentReferencesError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-600">{documentReferencesError}</p>
                    </div>
                  </div>
                )}

                {documentReferencesLoading ? (
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
                        Loading patient history...
                      </p>
                    </div>
                  </div>
                ) : documentReferences.length > 0 ? (
                  <div className="space-y-6">
                    {documentReferences.map((document, index) => {
                      const isExpanded = expandedDocumentId === document.id
                      const hasAuthors = document.author && document.author.length > 0
                      const hasEncounters = document.encounters && document.encounters.length > 0
                      const hasTypes = document.type && document.type.length > 0

                      return (
                        <div
                          key={document.id || index}
                          className={`border p-8 bg-white transition-all rounded-lg hover:shadow-lg ${
                            isExpanded ? "border-blue-300 shadow-md" : ""
                          }`}
                        >
                          <div
                            className="cursor-pointer"
                            onClick={() => toggleDocumentDetails(document.id)}
                          >
                            <div className="flex items-start justify-between mb-3 border-b border-gray-200 mb-4 pb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold ot-title text-lg">
                                    {document.title || "Untitled Document"}
                                  </h4>
                                  {document.status && (
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                                        document.status
                                      )}`}
                                    >
                                      {document.status}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm ot-title">
                                  {document.id && (
                                    <span className="text-xs text-gray-500">
                                      <span className="font-bold">ID: </span> 
                                      {document.id}
                                    </span>
                                  )}
                                  {document.date && (
                                    <span className="text-xs text-gray-500">
                                      • Created: {formatDate(document.date)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleDocumentDetails(document.id)
                                }}
                                className="text-xs text-white hover:text-white flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded transition-colors ml-4 flex-shrink-0"
                              >
                                {isExpanded ? "Hide Details" : "View Details"}
                                <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            {hasTypes && (
                              <div className="mb-4">
                                <div className="flex flex-wrap gap-2">
                                  {document.type.map((type, idx) => (
                                    <span
                                      key={idx}
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getDocumentTypeColor([type])}`}
                                    >
                                      {type.display}
                                      {type.code && (
                                        <span className="ml-1 text-xs opacity-75">
                                          ({type.code})
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="space-y-3">
                                <h5 className="font-semibold ot-title">Detailed Information</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {/* Authors Section */}
                                  {hasAuthors && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                      <h6 className="text-sm font-semibold text-gray-900 mb-2">
                                        Practitioner Details
                                      </h6>
                                      <div className="space-y-2">
                                        {document.author.map((author, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-2 text-sm text-gray-700"
                                          >
                                            <svg
                                              className="w-4 h-4 text-gray-500"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                              />
                                            </svg>
                                            <span>{author}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Encounters Section */}
                                  {hasEncounters && (
                                    <div className="bg-blue-50 rounded-lg p-4">
                                      <h6 className="text-sm font-semibold text-gray-900 mb-2">
                                        Related Encounters
                                      </h6>
                                      <div className="space-y-2">
                                        {document.encounters.map((encounter, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-2 text-sm text-gray-700"
                                          >
                                            <svg
                                              className="w-4 h-4 text-blue-500"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                              />
                                            </svg>
                                            <code className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                              {encounter}
                                            </code>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Additional Info */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="font-medium ot-title">Status:</span>
                                      <div className="mt-1">
                                        <span
                                          className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                            document.status
                                          )}`}
                                        >
                                          {document.status || "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-medium ot-title">Date Created:</span>
                                      <p className="mt-1 ot-title">{formatDate(document.date)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : !documentReferencesError ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 mt-4">No patient history found for this patient</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Selected Patient Info Footer */}
        {selectedPatient && !showDocumentReferences && (
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
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Confirm Selection
                  </button>
                )}
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
    </div>
  )
}