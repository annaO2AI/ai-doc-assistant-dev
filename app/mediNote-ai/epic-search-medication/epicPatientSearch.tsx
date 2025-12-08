// components/EpicPatientSearch.tsx
import React, { useState, useEffect } from "react"
import { APIService } from "../service/api"
import {
  EpicPatient,
  Medication,
  MedicationsResponse,
  FormattedMedication,
  IndividualMedicationResponse,
} from "../types"

interface EpicPatientSearchProps {
  tokenId: string
  onSelectPatient: (patient: {
    id: string
    first_name: string
    last_name: string
    full_name: string
    mrn: string
    patientMId: string
  }) => void
  selectedPatient: {
    id: string
    first_name: string
    last_name: string
    full_name: string
    mrn: string
  } | null
  onClose: () => void
  onSelectMedication?: (medication: Medication) => void
}

export default function EpicPatientSearch({
  tokenId,
  onSelectPatient,
  selectedPatient,
  onClose,
  onSelectMedication,
}: EpicPatientSearchProps) {
  const [loading, setLoading] = useState(false)
  const [loadingPatientId, setLoadingPatientId] = useState<string | null>(null)
  const [individualMedLoading, setIndividualMedLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [medsError, setMedsError] = useState<string | null>(null)
  const [patients, setPatients] = useState<EpicPatient[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [medications, setMedications] = useState<Medication[]>([])
  const [individualMedications, setIndividualMedications] = useState<{
    [key: string]: IndividualMedicationResponse
  }>({})
  const [showMedications, setShowMedications] = useState(false)
  const [selectedPatientForMeds, setSelectedPatientForMeds] = useState<EpicPatient | null>(null)
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null)
  const [expandedMedicationId, setExpandedMedicationId] = useState<string | null>(null)

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

  const fetchMedications = async (patientId: string) => {
    if (!patientId) {
      setMedsError("Patient ID is required")
      return
    }

    try {
      setLoadingPatientId(patientId)
      setMedsError(null)
      const data: MedicationsResponse = await APIService.getEpicMedications(
        patientId,
        tokenId
      )

      if (data.entry && data.entry.length > 0) {
        setMedications(data.entry.map((entry) => entry.resource))
        setShowMedications(true)
      } else {
        setMedsError("No medications found for this patient")
        setMedications([])
        setShowMedications(true)
      }
    } catch (err) {
      setMedsError(
        err instanceof Error
          ? `Error fetching medications: ${err.message}`
          : "Failed to fetch medications"
      )
      setMedications([])
      setShowMedications(true)
    } finally {
      setLoadingPatientId(null)
    }
  }

  const handleMedsSearch = (patient: EpicPatient) => {
    if (patient) {
      setSelectedPatientForMeds(patient)
      fetchMedications(patient.id)
    }
  }

  // Fetch individual medication details
  const fetchIndividualMedication = async (medicationRequestId: string) => {
    if (!medicationRequestId) return

    try {
      setIndividualMedLoading(medicationRequestId)
      const medicationData = await APIService.getEpicMedicationById(
        medicationRequestId,
        tokenId
      )

      setIndividualMedications((prev) => ({
        ...prev,
        [medicationRequestId]: medicationData,
      }))
    } catch (err) {
      console.error(`Error fetching medication ${medicationRequestId}:`, err)
    } finally {
      setIndividualMedLoading(null)
    }
  }

  const handleCloseMedications = () => {
    setShowMedications(false)
    setMedications([])
    setMedsError(null)
    setSelectedPatientForMeds(null)
    setSelectedMedication(null)
    setIndividualMedications({})
    setExpandedMedicationId(null)
  }

  // Handle medication selection
  const handleSelectMedication = (medication: Medication) => {
    setSelectedMedication(medication)

    // Pass medication data to parent component if callback provided
    if (onSelectMedication) {
      onSelectMedication(medication)
    }
  }

  // Toggle medication details
  const toggleMedicationDetails = (medicationId: string) => {
    if (expandedMedicationId === medicationId) {
      setExpandedMedicationId(null)
    } else {
      setExpandedMedicationId(medicationId)
      // Fetch individual medication details if not already loaded
      if (!individualMedications[medicationId]) {
        fetchIndividualMedication(medicationId)
      }
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

  // Enhanced medication display formatter
  const formatMedicationDisplay = (med: Medication): FormattedMedication => {
    const medName = med.medicationReference?.display || "Unknown Medication"
    const status = med.status
    const dosage = med.dosageInstruction?.[0]?.text || "No dosage instructions"
    const prescriber = med.requester?.display || "Unknown prescriber"
    const date = med.authoredOn
      ? new Date(med.authoredOn).toLocaleDateString()
      : "Unknown date"
    const identifier = med.identifier?.[0]?.value || "No identifier"
    const category = med.category?.[0]?.text || "Unknown category"
    const reason = med.reasonCode?.[0]?.text || "No reason specified"
    const therapyType = med.courseOfTherapyType?.text || "Not specified"

    return {
      name: medName,
      status,
      dosage,
      prescriber,
      date,
      identifier,
      category,
      reason,
      therapyType,
      timing:
        med.dosageInstruction?.[0]?.timing?.repeat?.timeOfDay?.[0] ||
        "No specific time",
      route: med.dosageInstruction?.[0]?.route?.text || "Unknown route",
      quantity: med.dispenseRequest?.quantity?.value,
      unit: med.dispenseRequest?.quantity?.unit,
      duration: med.dispenseRequest?.expectedSupplyDuration?.value,
      durationUnit: med.dispenseRequest?.expectedSupplyDuration?.unit,
      repeatsAllowed: med.dispenseRequest?.numberOfRepeatsAllowed,
      medicationRequestId: med.id,
    }
  }

  // Format individual medication details for display
  const formatIndividualMedicationDetails = (
    med: IndividualMedicationResponse
  ) => {
    const formatted = formatMedicationDisplay(med as Medication)
    return {
      ...formatted,
      fullDetails: med,
    }
  }

  return (
    <div className="epic-patient-search rounded-lg w-[83%] mx-auto flex flex-col">
      <div className="ml-[-26px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[24px] font-semibold ot-title mt-2">
            Search Epic Patients
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
                      <div className="flex gap-2 mt-2 pt-2 ">
                        <button
                          onClick={() => handleMedsSearch(patient)}
                          disabled={loadingPatientId !== null}
                          className="px-3 py-2 bg-[#0975BB] text-white text-sm font-medium rounded-md  hover:bg-[#04609C] transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed w-[160px]"
                        >
                          {loadingPatientId === patient.id ? (
                            <>
                              Loading...
                            </>
                          ) : (
                            <>
                              Search Meds
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

        {/* Medications Modal / Popup */}
        {showMedications && (
          <div className="fixed inset-0 z-50 flex items-center justify-center glass-card" onClick={handleCloseMedications}>
            <div className="bg-white rounded-tl-lg rounded-tr-lg  shadow-2xl w-full max-w-5xl overflow-y-auto w-[500px] absolute top-[0] right-[0] h-[100vh]">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold ot-title flex gap-3 items-center">
                  <span className="avatar-scr text-2xl">
                    {selectedPatientForMeds?.full_name.charAt(0).toUpperCase()}
                  </span>
                  <span>
                     {selectedPatientForMeds?.full_name} (MRN: {selectedPatientForMeds?.mrn})
                  </span>
                </h3>
                <button
                  onClick={handleCloseMedications}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {medsError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-600">{medsError}</p>
                    </div>
                  </div>
                )}

                {medications.length > 0 ? (
                  <div className="space-y-6">
                    {medications.map((med, index) => {
                      const formattedMed = formatMedicationDisplay(med)
                      const isSelected = selectedMedication?.id === med.id
                      const isExpanded = expandedMedicationId === med.id
                      const individualMed = individualMedications[med.id]
                      const individualFormatted = individualMed
                        ? formatIndividualMedicationDetails(individualMed)
                        : null

                      return (
                        <div
                          key={med.id || index}
                          className={`border p-8 bg-white transition-all rounded-lg ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 "
                              : "hover:shadow-lg  "
                          }`}
                        >
                          {/* Same medication card content as before */}
                          <div
                            className="cursor-pointer"
                            onClick={() => toggleMedicationDetails(med.id)}
                          >
                            <div className="flex items-start justify-between mb-3  border-b border-gray-200 mb-4 pb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold ot-title text-lg">
                                    {formattedMed.name}
                                  </h4>
                                  {isSelected && (
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm ot-title">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    formattedMed.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : formattedMed.status === "completed"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {formattedMed.status}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    <span className="font-bold">ID: </span> 
                                    {formattedMed.medicationRequestId}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleMedicationDetails(med.id)
                                }}
                                className="text-xs text-white hover:text-white flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded transition-colors ml-4 flex-shrink-0"
                              >
                                {isExpanded ? "Hide Details" : "View Details"}
                                <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <span className="font-medium ot-title w-[160px]">Dosage:</span>
                                  <span className="ot-title text-left">{formattedMed.dosage}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-medium ot-title w-[90px]">Route:</span>
                                  <span className="ot-title">{formattedMed.route}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex gap-3">
                                  <span className="font-medium ot-title w-[90px]">Prescriber:</span>
                                  <span className="ot-title">{formattedMed.prescriber}</span>
                                </div>
                                <div className="flex gap-3">
                                  <span className="font-medium ot-title w-[90px]">Prescribed:</span>
                                  <span className="ot-title">{formattedMed.date}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details – unchanged */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              {individualMedLoading === med.id ? (
                                <div className="flex items-center justify-center py-4">
                                  <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span className="text-sm ot-title">Loading detailed information...</span>
                                </div>
                              ) : individualFormatted ? (
                                <div className="space-y-3">
                                  <h5 className="font-semibold ot-title">Detailed Medication Information</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2">
                                      <div className="flex gap-3"><span className="font-medium ot-title w-[90px]">Category:</span><span className="osubtitle">{individualFormatted.category}</span></div>
                                      <div className="flex gap-3"><span className="font-medium ot-title w-[90px]">Therapy Type:</span><span className="osubtitle">{individualFormatted.therapyType}</span></div>
                                      <div className="flex gap-3"><span className="font-medium ot-title w-[90px]">Time:</span><span className="osubtitle">{individualFormatted.timing}</span></div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex gap-3"><span className="font-medium ot-title w-[90px]">Identifier:</span><span className="osubtitle">{individualFormatted.identifier}</span></div>
                                      {individualFormatted.quantity && (
                                        <div className="flex gap-3">
                                          <span className="font-medium ot-title w-[90px]">Quantity:</span>
                                          <span className="osubtitle">
                                            {individualFormatted.quantity} {individualFormatted.unit}
                                            {individualFormatted.duration && ` for ${individualFormatted.duration} ${individualFormatted.durationUnit}`}
                                            {individualFormatted.repeatsAllowed && ` (${individualFormatted.repeatsAllowed} refills)`}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {individualFormatted.reason && individualFormatted.reason !== "No reason specified" && (
                                    <div className="p-3 bg-red-50 rounded ml-[-10px]">
                                      <div className="flex text-sm gap-2">
                                        <span className="font-medium ot-title w-[90px]">Reason:</span>
                                        <span className="ot-title">{individualFormatted.reason}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-sm text-gray-500">
                                  Unable to load detailed medication information
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <p className="text-xs ot-title mt-2">
                              <span className="font-bold">
                                Medication Request ID: 
                              </span>
                              <code className="bg-gray-100 px-1 py-0.5 rounded">{med.id}</code>
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : !medsError ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-gray-500 mt-4">No medications found for this patient</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Selected Patient Info Footer */}
        {selectedPatient && !showMedications && (
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
      </div>
    </div>
  )
}