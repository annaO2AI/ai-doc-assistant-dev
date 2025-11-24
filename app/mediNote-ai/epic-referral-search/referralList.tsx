"use client"

import { useState, useEffect } from "react"
import { APIService } from "../service/api"
import { EpicPatient } from "../types"

interface ReferralListProps {
  authToken: string
}

interface OperationOutcomeIssue {
  severity: string
  code: string
  details?: {
    coding?: Array<{
      system: string
      code: string
      display: string
    }>
    text?: string
  }
  diagnostics?: string
}

interface OperationOutcome {
  resourceType: "OperationOutcome"
  issue: OperationOutcomeIssue[]
}

export default function ReferralList({ authToken }: ReferralListProps) {
  const [patients, setPatients] = useState<EpicPatient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<EpicPatient | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)
  const [operationOutcome, setOperationOutcome] =
    useState<OperationOutcome | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null) // Add this state

  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoading(true)
        const patientsData = await APIService.searchEpicPatients(authToken)
        setPatients(patientsData.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (authToken) {
      fetchPatients()
    }
  }, [authToken])

  const handlePatientSelect = async (patient: EpicPatient) => {
    try {
      setPatientLoading(true)
      setError(null)
      setOperationOutcome(null)
      setRawResponse(null) // Reset raw response
      setSelectedPatient(patient)

      const response = await APIService.getReferralsByPatient(
        patient.id,
        authToken
      )

      // Store raw response for debugging
      setRawResponse(response)

      // Normalize: find all entries from any possible location
      const entries =
        response.items?.raw?.entry ||
        response.raw?.entry ||
        response.entry ||
        response.items?.entry ||
        []

      // Find ALL OperationOutcome resources (there can be more than one!)
      const outcomes = entries
        .map((e: any) => e.resource)
        .filter(
          (r: any) => r?.resourceType === "OperationOutcome"
        ) as OperationOutcome[]

      // Prefer the first one (usually the most relevant), or null
      const primaryOutcome = outcomes[0] || null

      setOperationOutcome(primaryOutcome)

      // Optional: Log all for debugging
      if (outcomes.length > 0) {
        console.log("OperationOutcome(s) detected:", outcomes)
      }
    } catch (err) {
      console.error("Error fetching referrals:", err)
      setError(
        err instanceof Error ? err.message : "Failed to fetch referral data"
      )
    } finally {
      setPatientLoading(false)
    }
  }

  const handleBackToPatients = () => {
    setSelectedPatient(null)
    setOperationOutcome(null)
    setRawResponse(null) 
  }

  const getProcessingIssue = () => {
    if (!operationOutcome) return null
    return operationOutcome.issue.find((issue) => issue.code === "processing")
  }

  const getEnhancedProcessingIssue = () => {
    if (!operationOutcome) return null

    return operationOutcome.issue.find(
      (issue) =>
        issue.code === "processing" ||
        issue.code === "informational" ||
        issue.code === "not-found" ||
        issue.diagnostics?.toLowerCase().includes("no results") ||
        issue.diagnostics?.toLowerCase().includes("not found") ||
        issue.diagnostics?.toLowerCase().includes("no data")
    )
  }

  const getAuthorizationIssues = () => {
    if (!operationOutcome) return []
    return operationOutcome.issue.filter((issue) => issue.code === "suppressed")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading patients...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500 text-lg">Error: {error}</div>
      </div>
    )
  }

  if (!selectedPatient) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">
          Select a Patient for Service Requests
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white shadow-md rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200"
              onClick={() => handlePatientSelect(patient)}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {patient.full_name}
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <span className="font-medium">MRN:</span> {patient.mrn}
                </p>
                <p>
                  <span className="font-medium">ID:</span> {patient.id}
                </p>
                <p>
                  <span className="font-medium">External ID:</span>{" "}
                  {patient.external_id}
                </p>
              </div>
            </div>
          ))}
        </div>

        {patients.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No patients found</p>
          </div>
        )}
      </div>
    )
  }

  const processingIssue = getProcessingIssue()
  const enhancedProcessingIssue = getEnhancedProcessingIssue()
  const authorizationIssues = getAuthorizationIssues()

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={handleBackToPatients}
            className="mb-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            ← Back to Patients
          </button>
          <h1 className="text-2xl font-bold">
            Service Requests - {selectedPatient.full_name}
          </h1>
          <p className="text-gray-600">
            MRN: {selectedPatient.mrn} | Patient ID: {selectedPatient.id}
          </p>
        </div>
      </div>

      {patientLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="text-lg">Loading service requests...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Card with Dynamic Data */}
          <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
            <div className="text-center">
              <svg
                className="h-12 w-12 text-gray-400 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>

              <ul className="space-y-2">
                {authorizationIssues.map((issue, index) => (
                  <li key={index} className="flex items-start">
                    <div>
                      <p className="text-yellow-700 font-medium">
                        {issue.diagnostics}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
