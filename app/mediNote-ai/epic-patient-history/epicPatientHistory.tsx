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
}

export default function EpicPatientHistory({
  authToken,
  onSelectPatient,
  selectedPatient,
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
    <>
      <div className="epic-patient-search rounded-lg w-[83%] mx-auto flex flex-col">
        <div className="ml-[-26px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[24px] font-semibold ot-title mt-6">
              Search Epic Patients - Patient History
            </h3>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
                <p className="text-sm ot-title">Loading Epic patients...</p>
              </div>
            </div>
          )}

          {/* Patients List */}
          {!loading && (
            <div className="flex-1">
              {filteredPatients.length > 0 ? (
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
                                <span className="avatar-scr">
                                  {patient.full_name.charAt(0).toUpperCase()}
                                </span>
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
                                  <span className="font-medium">
                                    External ID:
                                  </span>
                                  <span
                                    className="text-md truncate max-w-[150px]"
                                    title={patient.external_id}
                                  >
                                    {patient.external_id}
                                  </span>
                                </div>
                              )}
                            </div>
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
        </div>
      </div>

      {/* Document References Modal - Simplified */}
      {showDocumentReferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Patient History Summary
                </h2>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Patient:</span>{" "}
                    {selectedPatientForHistory?.full_name || ""}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">MRN:</span>{" "}
                    {selectedPatientForHistory?.mrn || ""}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Total Documents:</span>{" "}
                    {documentReferences.length}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDocumentReferences}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {documentReferencesLoading && (
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
              )}

              {documentReferencesError && (
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-blue-50 to-gray-50 border-l-4 border-blue-500 rounded-r-lg p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          No patient history found
                        </h3>
                        <p className="text-sm text-gray-700 mt-2">
                          {documentReferencesError}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!documentReferencesLoading &&
                !documentReferencesError &&
                documentReferences.length === 0 && (
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-gray-500 mt-4">
                      No document references found for this patient
                    </p>
                  </div>
                )}

              {!documentReferencesLoading &&
                !documentReferencesError &&
                documentReferences.length > 0 && (
                  <div className="space-y-6">
                    {documentReferences.map((document, index) => (
                      <div
                        key={document.id || index}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                      >

                        {/* Document Type */}
                        {document.type && document.type.length > 0 && (
                          <div className="mb-4">
                             <h3 className="text-xl font-semibold text-gray-900">
                              Summary Details :
                            </h3>
                            <ul className="list-disc pl-5 space-y-1">
                              {document.type.map((type, idx) => (
                                <li key={idx} className="py-1">
                                  <span className="font-medium">
                                    {type.display}
                                  </span>
                                  {type.code && (
                                    <span className="ml-2 text-sm text-gray-600">
                                      ({type.code})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Document Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          {/* Authors Section */}
                          {document.author && document.author.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                Practitioner Details
                              </h4>
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
                          {document.encounters &&
                            document.encounters.length > 0 && (
                              <div className="bg-blue-50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                  Related Encounters
                                </h4>
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
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">
                                Status:
                              </span>
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
                              <span className="font-medium text-gray-700">
                                Date Created:
                              </span>
                              <p className="mt-1 text-gray-600">
                                {formatDate(document.date)}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">
                                Document ID:
                              </span>
                              <p className="mt-1 font-mono text-xs text-gray-600 truncate">
                                {document.id || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {documentReferences.length} document(s) for{" "}
                {selectedPatientForHistory?.full_name || ""}
              </div>
              <button
                onClick={handleCloseDocumentReferences}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
