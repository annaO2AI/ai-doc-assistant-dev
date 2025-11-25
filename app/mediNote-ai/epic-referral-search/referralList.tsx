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
  const [selectedPatient, setSelectedPatient] = useState<EpicPatient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)
  const [operationOutcome, setOperationOutcome] = useState<OperationOutcome | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)

  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoading(true)
        const patientsData = await APIService.searchEpicPatients(authToken)
        setPatients(patientsData.items || [])
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
      setRawResponse(null)
      setSelectedPatient(patient)

      const response = await APIService.getReferralsByPatient(patient.id, authToken)
      setRawResponse(response)

      const entries =
        response.items?.raw?.entry ||
        response.raw?.entry ||
        response.entry ||
        response.items?.entry ||
        []

      const outcomes = entries
        .map((e: any) => e.resource)
        .filter((r: any) => r?.resourceType === "OperationOutcome") as OperationOutcome[]

      setOperationOutcome(outcomes[0] || null)

      if (outcomes.length > 0) {
        console.log("OperationOutcome(s) detected:", outcomes)
      }
    } catch (err) {
      console.error("Error fetching referrals:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch referral data")
    } finally {
      setPatientLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedPatient(null)
    setOperationOutcome(null)
    setRawResponse(null)
    setError(null)
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

  if (error && !selectedPatient) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500 text-lg">Error: {error}</div>
      </div>
    )
  }

  return (
    <>
      <div className="w-[86%] mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 mt-6">
          Select a Patient for Service Requests
        </h1>

        {patients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No patients found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => handlePatientSelect(patient)}
                className="bg-white rounded-lg p-6 cursor-pointer hover:shadow-xl transition-all border border-gray-200 hover:border-blue-300"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    {patient.full_name.charAt(0).toUpperCase()}
                  </span>
                  {patient.full_name}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">MRN:</span> {patient.mrn}</p>
                  <p><span className="font-medium">ID:</span> {patient.id}</p>
                  <p><span className="font-medium">External ID:</span> {patient.external_id || "N/A"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {selectedPatient && (
        <div className="fixed inset-0 glass-card  z-50 flex items-center justify-center p-4 ">
          <div
            className="bg-white shadow-2xl w-[700px]  h-[100vh] overflow-hidden flex flex-col absolute right-[0]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className=" p-4 flex justify-between items-center">
              <div>
                {/* <h2 className="text-xl font-bold">Service Requests</h2> */}
                <div className=" opacity-90 flex gap-2 items-center">
                  <span className="avatar-scr ">{selectedPatient.full_name.charAt(0).toUpperCase()}</span>
                  <span className="font-bold text-xl">{selectedPatient.full_name}</span> 
                  <span className=" text-md">• MRN: {selectedPatient.mrn}</span>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-[#111827] hover:bg-white/20 rounded-full p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {patientLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading service requests...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <p className="font-medium">Error loading data</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              ) : operationOutcome ? (
                <div className="space-y-4">
                  {getAuthorizationIssues().length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-800 mb-2">Access Restricted</h3>
                      <ul className="space-y-2">
                        {getAuthorizationIssues().map((issue, i) => (
                          <li key={i} className="text-sm text-yellow-700">
                            • {issue.diagnostics || "Some data is hidden due to permissions"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {getEnhancedProcessingIssue() ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                      <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2a2 2 0 00-2 2v3m-8 0h2a2 2 0 002-2v-3" />
                      </svg>
                      <p className="text-lg font-medium text-blue-900">
                        {getEnhancedProcessingIssue()?.diagnostics || "No service requests found for this patient."}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>No additional information available.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No referral data returned.</p>
                </div>
              )}
            </div>

            {/* Modal Footer
            <div className="bg-gray-100 px-6 py-4 border-t">
              <button
                onClick={closeModal}
                className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Close
              </button>
            </div> */}
          </div>
        </div>
      )}
    </>
  )
}