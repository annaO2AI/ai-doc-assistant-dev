import React, { useState, useEffect, useCallback } from "react"
import { patient, PatientCreationTypes } from "../types"
import { APIService } from "../service/api"
import { UpdateUserModal } from "../components/UpdateUserModal"
import { PatientVoiceEnroll } from "../components/PatientVoiceEnroll"
import PatientHistory from "../doctor-patient-voice/PatientHistory"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface ApiResponse {
  results: patient[]
}

interface PatientWithFullName extends patient {
  full_name: string
}

type VoiceFilter = "all" | "enrolled" | "not-enrolled"

const SearchPatient: React.FC = () => {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientWithFullName[]>([])
  const [allPatients, setAllPatients] = useState<PatientWithFullName[]>([])
  const [loadingAllPatients, setLoadingAllPatients] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [searchId, setSearchId] = useState<string>("")
  const [searchSsn, setSearchSsn] = useState<string>("")
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilter>("all") // New filter
  const [selectedPatient, setSelectedPatient] = useState<PatientWithFullName | null>(null)
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([])
  const [showPatientDetails, setShowPatientDetails] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [openModal, setOpenModal] = useState<'edit' | 'voice' | 'history' | null>(null)

  // Fetch all patients
  const fetchAllPatients = useCallback(async (): Promise<void> => {
    setLoadingAllPatients(true)
    try {
      const data: ApiResponse = await APIService.SearchPatient("")
      if (data && data.results) {
        const patientsWithFullName: PatientWithFullName[] = data.results.map((patient: patient) => ({
          ...patient,
          full_name: `${patient.first_name} ${patient.last_name}`,
        }))
        setAllPatients(patientsWithFullName)
        setPatients(patientsWithFullName)
      }
    } catch (err) {
      console.error("Fetch all patients error:", err)
      setError(err instanceof Error ? `Failed to fetch patients: ${err.message}` : "Failed to fetch patients")
    } finally {
      setLoadingAllPatients(false)
    }
  }, [])

  useEffect(() => {
    fetchAllPatients()
  }, [fetchAllPatients])

  // Client-side filtering with voice filter
  useEffect(() => {
    const queryLower = searchQuery.trim().toLowerCase()

    const filtered = allPatients.filter((patient) => {
      const matchesQuery = searchQuery.trim()
        ? patient.full_name.toLowerCase().includes(queryLower) ||
          (patient.email && patient.email.toLowerCase().includes(queryLower)) ||
          (patient.phone && patient.phone.includes(searchQuery))
        : true

      const matchesId = searchId.trim()
        ? patient.id.toString().includes(searchId)
        : true

      const matchesSsn = searchSsn.trim()
        ? patient.ssn_last4 && patient.ssn_last4.includes(searchSsn)
        : true

      const matchesVoice = voiceFilter === "all"
        ? true
        : voiceFilter === "enrolled"
        ? patient.voice_enrolled
        : !patient.voice_enrolled

      return matchesQuery && matchesId && matchesSsn && matchesVoice
    })

    setPatients(filtered)
  }, [searchQuery, searchId, searchSsn, voiceFilter, allPatients])

  const handleUpdate = (patientData: PatientWithFullName): void => {
    setSelectedPatient(patientData)
    setOpenModal('edit')
  }

  const handleEnrollVoice = (patient: PatientWithFullName): void => {
    setSelectedPatient(patient)
    setOpenModal('voice')
  }

  const handleSelectPatient = (patient: PatientWithFullName): void => {
    setSelectedPatient(patient)
    setSelectedPatientIds([patient.id])
    setShowPatientDetails(true)
    setOpenModal(null)
  }

  const handleBackToList = (): void => {
    setShowPatientDetails(false)
    setSelectedPatient(null)
    setSelectedPatientIds([])
    setOpenModal(null)
  }

  const handleShowHistory = (patientId: number) => {
    setSelectedPatientIds([patientId])
    setOpenModal('history')
  }

  const handleCloseModal = (): void => {
    setOpenModal(null)
  }

  const handleSave = async (updatedData: PatientCreationTypes): Promise<void> => {
    if (!selectedPatient) return
    try {
      const response = await APIService.updatePatient(updatedData, selectedPatient.id)
      if (response) {
        await fetchAllPatients()
        if (showPatientDetails && selectedPatient) {
          const updatedPatient = patients.find(p => p.id === selectedPatient.id)
          if (updatedPatient) setSelectedPatient(updatedPatient)
        }
      }
      setOpenModal(null)
    } catch (error) {
      console.error("Update failed:", error)
      setError(error instanceof Error ? error.message : "Update failed")
    }
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setSearchId("")
    setSearchSsn("")
    setVoiceFilter("all")
  }

  const handleRegistration = () => {
    router.push("/mediNote-ai/patient-registration")
  }

  const formatDateOfBirth = (dob?: string) => {
    if (!dob) return "Not specified"
    try {
      return new Date(dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dob
    }
  }

  const calculateAge = (dob?: string) => {
    if (!dob) return null
    try {
      const birthDate = new Date(dob)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
      return age
    } catch {
      return null
    }
  }

  const renderPatientDetails = () => {
    if (!selectedPatient) return null
    const age = calculateAge(selectedPatient.date_of_birth)

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={handleBackToList} className="flex items-center text-blue-600 hover:text-blue-800">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </button>
          <div className="flex space-x-4">
            <button onClick={() => handleUpdate(selectedPatient)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Edit Patient
            </button>
            <button onClick={() => handleEnrollVoice(selectedPatient)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              {selectedPatient.voice_enrolled ? "Update Voice" : "Enroll Voice"}
            </button>
            <button onClick={() => handleShowHistory(selectedPatient.id)} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              View Medical History
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800 text-2xl font-semibold">
                {selectedPatient.full_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.full_name}</h2>
                <p className="text-gray-600">Patient ID: {selectedPatient.id}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-lg text-gray-900">{selectedPatient.email || "Not specified"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-lg text-gray-900">{formatDateOfBirth(selectedPatient.date_of_birth)}</p>
                  {age && <span className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">{age} years old</span>}
                </div>
              </div>
              {selectedPatient.ssn_last4 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">SSN</label>
                  <p className="mt-1 text-lg text-gray-900">{selectedPatient.ssn_last4}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {selectedPatient.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone Number</label>
                <p className="mt-1 text-lg text-gray-900">{selectedPatient.phone}</p>
              </div>
            )}
            {selectedPatient.address && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Address</label>
                <p className="mt-1 text-lg text-gray-900">{selectedPatient.address}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-500">Voice Enrollment Status</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedPatient.voice_enrolled ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                  {selectedPatient.voice_enrolled ? "Voice Enrolled" : "Voice Not Enrolled"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {patients.map((patient: PatientWithFullName) => (
        <div
          key={patient.id}
          className="rounded-lg shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow duration-200"
          onClick={() => handleSelectPatient(patient)}
        >
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-800 text-lg font-semibold">
                {patient.full_name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{patient.full_name}</h3>
                <p className="text-sm text-gray-500">{patient.email || "No email"}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-sm text-gray-600">ID: {patient.id}</span>
                  {calculateAge(patient.date_of_birth) && (
                    <span className="text-sm px-2 py-1 bg-gray-100 text-gray-800 rounded">
                      {calculateAge(patient.date_of_birth)} years
                    </span>
                  )}
                  <span className={`text-sm px-2 py-1 rounded ${
                    patient.voice_enrolled ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {patient.voice_enrolled ? "Voice Enrolled" : "Voice Not Enrolled"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voice Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {patients.map((patient: PatientWithFullName) => (
            <tr key={patient.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectPatient(patient)}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.full_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.email || "Not specified"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {calculateAge(patient.date_of_birth) ? `${calculateAge(patient.date_of_birth)} years` : "Not specified"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 py-1 rounded text-xs ${
                  patient.voice_enrolled ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                  {patient.voice_enrolled ? "Enrolled" : "Not Enrolled"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderPatientList = () => {
    const hasSearch = searchQuery.trim() || searchId.trim() || searchSsn.trim() || voiceFilter !== "all"

    return (
      <>
        <div className="flex justify-between items-start">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[400px] max-w-[500px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search patients by name, email, or phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <input
              type="text"
              className="w-[100px] px-3 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="Search ID"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />

            <input
              type="text"
              maxLength={4}
              className="w-[100px] px-3 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="SSN Last 4"
              value={searchSsn}
              onChange={(e) => setSearchSsn(e.target.value)}
            />

            {/* Voice Enrollment Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {/* <button
                onClick={() => setVoiceFilter("all")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  voiceFilter === "all" ? "bg-white text-gray-900 shadow" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All
              </button> */}
              <button
                onClick={() => setVoiceFilter("enrolled")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  voiceFilter === "enrolled" ? "bg-green-600 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Enrolled
              </button>
              <button
                onClick={() => setVoiceFilter("not-enrolled")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  voiceFilter === "not-enrolled" ? "bg-yellow-600 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Not Enrolled
              </button>
            </div>

            <button
              onClick={handleClearFilters}
              className="px-2 py-2  text-[#fff] rounded-lg"
            >
              Clear Filter
            </button>
          </div>

          {/* Right side: View Toggle + Registration */}
          <div className="flex items-center gap-3">
            <div className="flex bg-[#0c9bcf] rounded-md p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded ${viewMode === 'card' ? 'bg-[#0975BB]' : ''}`}
              >
                <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.20225 9.28961C6.64904 9.28961 7.01124 9.66393 7.01124 10.1257V16.1639C7.01124 16.6257 6.64904 17 6.20225 17H0.808989C0.362197 17 3.0577e-07 16.6257 0 16.1639V10.1257L0.000263343 10.1041C0.0113442 9.65232 0.369182 9.28961 0.808989 9.28961H6.20225ZM15.191 9.28961C15.6378 9.28961 16 9.66393 16 10.1257V16.1639C16 16.6257 15.6378 17 15.191 17H9.79775C9.35096 17 8.98876 16.6257 8.98876 16.1639V10.1257C8.98876 9.66393 9.35096 9.28961 9.79775 9.28961H15.191ZM10.6067 15.3279H14.382V10.9617H10.6067V15.3279ZM1.61798 15.3279H5.39326V10.9617H1.61798V15.3279ZM6.20225 0C6.64904 1.14918e-07 7.01124 0.374319 7.01124 0.836066V6.87433C7.01124 7.33607 6.64904 7.71039 6.20225 7.71039H0.808989C0.3622 7.71039 4.86447e-06 7.33607 0 6.87433V0.836066L0.000263343 0.814484C0.0113398 0.362712 0.369179 0 0.808989 0H6.20225ZM15.191 0C15.6378 0 16 0.374319 16 0.836066V6.87433C16 7.33607 15.6378 7.71039 15.191 7.71039H9.79775C9.35096 7.71039 8.98876 7.33606 8.98876 6.87433V0.836066C8.98876 0.374322 9.35096 4.71129e-06 9.79775 0H15.191ZM10.6067 6.03826H14.382V1.67213H10.6067V6.03826ZM1.61798 6.03826H5.39326V1.67213H1.61798V6.03826Z" fill="white"/>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-[#0975BB]' : ''}`}
              >
                <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.81849 2.18194C5.81849 0.976889 4.8416 0 3.63656 0H2.18194C0.976889 0 0 0.976889 0 2.18194V3.63656C0 4.8416 0.976889 5.81849 2.18194 5.81849H3.63656C4.8416 5.81849 5.81849 4.8416 5.81849 3.63656V2.18194ZM4.36387 2.18194C4.36387 1.78026 4.03824 1.45462 3.63656 1.45462H2.18194C1.78026 1.45462 1.45462 1.78026 1.45462 2.18194V3.63656C1.45462 4.03824 1.78026 4.36387 2.18194 4.36387H3.63656C4.03824 4.36387 4.36387 4.03824 4.36387 3.63656V2.18194Z" fill="white"/>
                  <path d="M7.27344 2.90895C7.27344 2.50727 7.59906 2.18164 8.00075 2.18164H15.2739C15.6756 2.18164 16.0012 2.50727 16.0012 2.90895C16.0012 3.31063 15.6756 3.63626 15.2739 3.63626H8.00075C7.59906 3.63626 7.27344 3.31063 7.27344 2.90895Z" fill="white"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.81849 9.45537C5.81849 8.25029 4.8416 7.27344 3.63656 7.27344H2.18194C0.976889 7.27344 0 8.25029 0 9.45537V10.91C0 12.1151 0.976889 13.0919 2.18194 13.0919H3.63656C4.8416 13.0919 5.81849 12.1151 5.81849 10.91V9.45537ZM4.36387 9.45537C4.36387 9.05368 4.03824 8.72806 3.63656 8.72806H2.18194C1.78026 8.72806 1.45462 9.05368 1.45462 9.45537V10.91C1.45462 11.3117 1.78026 11.6373 2.18194 11.6373H3.63656C4.03824 11.6373 4.36387 11.3117 4.36387 10.91V9.45537Z" fill="white"/>
                  <path d="M7.27344 10.1824C7.27344 9.7807 7.59906 9.45508 8.00075 9.45508H15.2739C15.6756 9.45508 16.0012 9.7807 16.0012 10.1824C16.0012 10.5841 15.6756 10.9097 15.2739 10.9097H8.00075C7.59906 10.9097 7.27344 10.5841 7.27344 10.1824Z" fill="white"/>
                </svg>
              </button>
            </div>

            <button
              onClick={handleRegistration}
              className="px-4 py-3 bg-[#0975BB] text-white rounded-lg hover:bg-[#0975BB]"
            >
              + Patient Registration
            </button>
          </div>
        </div>

        {/* Loading, Error, List */}
        {loadingAllPatients && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading patients...</p>
          </div>
        )}

        {error && !loadingAllPatients && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!loadingAllPatients && !error && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-[#fff]">
                {hasSearch ? "Search Results" : "All Patients"}
              </h2>
              {patients.length > 0 && (
                <span className="text-white">
                  {patients.length} patient{patients.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {patients.length > 0 ? (
              viewMode === 'card' ? renderCardView() : renderTableView()
            ) : (
              !hasSearch ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="mb-4">
                    <Image src="/File searching.gif" alt="No patients" width={200} height={200} className="mx-auto" priority />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">No Patients Found</h3>
                  <p className="text-gray-500 max-w-md mx-auto">There are no patients in the system. Add a patient to get started.</p>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
                  <p className="text-gray-500">No patients match your search criteria. Try different keywords.</p>
                </div>
              )
            )}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="container mx-auto px-16 py-16 mt-12 transcription-welcommassege-main rounded-[20px] w-[82%]">
      <div className="flex flex-col space-y-6">
        <h1 className="text-2xl font-bold text-left text-[#fff]">Patient Details</h1>

        {showPatientDetails && selectedPatient ? renderPatientDetails() : renderPatientList()}

        {/* Modals */}
        {selectedPatient && openModal === 'edit' && (
          <UpdateUserModal
            isOpen={true}
            onClose={handleCloseModal}
            user={{
              first_name: selectedPatient.first_name || "",
              last_name: selectedPatient.last_name || "",
              email: selectedPatient.email || "",
              phone: selectedPatient.phone || "",
              ssn_last4: selectedPatient.ssn_last4 || "",
              address: selectedPatient.address || "",
            }}
            onSave={handleSave}
          />
        )}

        {selectedPatient && openModal === 'voice' && (
          <PatientVoiceEnroll isOpen={true} onClose={handleCloseModal} id={selectedPatient.id} />
        )}

        {openModal === 'history' && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
            <div className="bg-white rounded-lg shadow-sm p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
              <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-white rounded-full p-1">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.89705 4.05379L3.96967 3.96967C4.23594 3.7034 4.6526 3.6792 4.94621 3.89705L5.03033 3.96967L10 8.939L14.9697 3.96967C15.2359 3.7034 15.6526 3.6792 15.9462 3.89705L16.0303 3.96967C16.2966 4.23594 16.3208 4.6526 16.1029 4.94621L16.0303 5.03033L11.061 10L16.0303 14.9697C16.2966 15.2359 16.3208 15.6526 16.1029 15.9462L16.0303 16.0303C15.7641 16.2966 15.3474 16.3208 15.0538 16.1029L14.9697 16.0303L10 11.061L5.03033 16.0303C4.76406 16.2966 4.3474 16.3208 4.05379 16.1029L3.96967 16.0303C3.7034 15.7641 3.6792 15.3474 3.89705 15.0538L3.96967 14.9697L8.939 10L3.96967 5.03033C3.7034 4.76406 3.6792 4.3474 3.89705 4.05379L3.96967 3.96967L3.89705 4.05379Z" fill="currentColor"/>
                </svg>
              </button>
              <PatientHistory patientIds={selectedPatientIds} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPatient