import React, { useState, useEffect, useCallback } from "react"
import { patient, PatientCreationTypes } from "../types"
import UserCard from "../components/UserCard"
import { APIService } from "../service/api"
import { UpdateUserModal } from "../components/UpdateUserModal"
import { PatientVoiceEnroll } from "../components/PatientVoiceEnroll"
import PatientHistory from "../doctor-patient-voice/PatientHistory"
import Image from "next/image"

interface ApiResponse {
  results: patient[]
}

interface PatientWithFullName extends patient {
  full_name: string
}

const SearchPatient: React.FC = () => {
  const [patients, setPatients] = useState<PatientWithFullName[]>([])
  const [allPatients, setAllPatients] = useState<PatientWithFullName[]>([]) // Store all patients
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingAllPatients, setLoadingAllPatients] = useState<boolean>(true) // Loading for initial fetch
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedPatient, setSelectedPatient] = useState<PatientWithFullName | null>(null)
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([])
  const [showPatientDetails, setShowPatientDetails] = useState<boolean>(false) // To show details view
  
  // Single modal state to manage which modal is open
  const [openModal, setOpenModal] = useState<'edit' | 'voice' | 'history' | null>(null)

  // Fetch all patients on initial load
  const fetchAllPatients = useCallback(async (): Promise<void> => {
    setLoadingAllPatients(true)
    try {
      const data: ApiResponse = await APIService.SearchPatient("") // Empty search to get all
      
      if (data && data.results) {
        const patientsWithFullName: PatientWithFullName[] = data.results.map((patient: patient) => ({
          ...patient,
          full_name: `${patient.first_name} ${patient.last_name}`,
        }))
        setAllPatients(patientsWithFullName)
        setPatients(patientsWithFullName) // Show all patients initially
      }
    } catch (err) {
      console.error("Fetch all patients error:", err)
      setError(err instanceof Error ? `Failed to fetch patients: ${err.message}` : "Failed to fetch patients")
    } finally {
      setLoadingAllPatients(false)
    }
  }, [])

  // Initial fetch on component mount
  useEffect(() => {
    fetchAllPatients()
  }, [fetchAllPatients])

  // Memoized search function
  const searchPatients = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setPatients(allPatients) // Show all patients when search is empty
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data: ApiResponse = await APIService.SearchPatient(query)
      
      if (!data || !data.results) {
        setPatients([])
        return
      }
      
      // Add full_name to each patient
      const patientsWithFullName: PatientWithFullName[] = data.results.map((patient: patient) => ({
        ...patient,
        full_name: `${patient.first_name} ${patient.last_name}`,
      }))
      
      setPatients(patientsWithFullName)
    } catch (err) {
      console.error("Search patients error:", err)
      setError(err instanceof Error ? `Failed to search patients: ${err.message}` : "Failed to search patients")
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [allPatients])

  // Debounce search input
  useEffect(() => {
    const timerId = setTimeout(() => {
      searchPatients(searchQuery)
    }, 500)

    return () => {
      clearTimeout(timerId)
    }
  }, [searchQuery, searchPatients])

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
    setOpenModal(null) // Close any open modals when selecting patient
  }

  const handleBackToList = (): void => {
    setShowPatientDetails(false)
    setSelectedPatient(null)
    setSelectedPatientIds([])
    setOpenModal(null) // Close any open modals when going back to list
  }

  const handleShowHistory = (patientId: number) => {
    setSelectedPatientIds([patientId])
    setOpenModal('history')
  }

  const handleCloseModal = (): void => {
    setOpenModal(null)
  }

  const handleCardClick = (patientId: number) => {
    const patient = patients.find(p => p.id === patientId)
    if (patient) {
      handleSelectPatient(patient)
    }
  }

  const handleSave = async (updatedData: PatientCreationTypes): Promise<void> => {
    if (!selectedPatient) return
    
    try {
      const response = await APIService.updatePatient(
        updatedData,
        selectedPatient.id
      )
      
      if (response) {
        // Refresh the patients list
        await fetchAllPatients()
        await searchPatients(searchQuery)
        // Update selected patient if they're currently being viewed
        if (showPatientDetails && selectedPatient) {
          const updatedPatient = patients.find(p => p.id === selectedPatient.id)
          if (updatedPatient) {
            setSelectedPatient(updatedPatient)
          }
        }
      }
      
      setOpenModal(null)
    } catch (error) {
      console.error("Update failed:", error)
      setError(error instanceof Error ? error.message : "Update failed")
    }
  }

  // Format date of birth
  const formatDateOfBirth = (dob?: string) => {
    if (!dob) return "Not specified"
    try {
      return new Date(dob).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dob
    }
  }

  // Calculate age from date of birth
  const calculateAge = (dob?: string) => {
    if (!dob) return null
    try {
      const birthDate = new Date(dob)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      
      return age
    } catch {
      return null
    }
  }

  // Patient Details View
  const renderPatientDetails = () => {
    if (!selectedPatient) return null

    const age = calculateAge(selectedPatient.date_of_birth)

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </button>
          <div className="flex space-x-4">
            <button
              onClick={() => handleUpdate(selectedPatient)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit Patient
            </button>
            <button
              onClick={() => handleEnrollVoice(selectedPatient)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {selectedPatient.voice_enrolled ? "Update Voice" : "Enroll Voice"}
            </button>
            <button
              onClick={() => handleShowHistory(selectedPatient.id)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
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
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPatient.full_name}
                </h2>
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
                  {age && (
                    <span className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                      {age} years old
                    </span>
                  )}
                </div>
              </div>

              {selectedPatient.ssn_last4 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">SSN </label>
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
                  selectedPatient.voice_enrolled 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
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

  // Patient List View
  const renderPatientList = () => (
    <>
      {/* Search Input */}
      <div className="relative w-full max-w-[600px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Search patients by name, email, or phone"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchQuery(e.target.value)
          }}
        />
      </div>

      {/* Loading State for initial fetch */}
      {loadingAllPatients && (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white-500 mb-4"></div>
            <p className="text-gray-600 text-[#fff]">Loading patients...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && !loadingAllPatients && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Results / All Patients List */}
      {!loadingAllPatients && !error && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-[#fff]">
              {searchQuery.trim() ? "Search Results" : "All Patients"}
            </h2>
            {patients.length > 0 && (
              <span className="text-[16] text-[#fff] rounded-full">
                {patients.length} patient{patients.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {patients.length > 0 ? (
            <div className="space-y-4">
              {patients.map((patient: PatientWithFullName) => (
                <div
                  key={patient.id}
                  className="rounded-lg shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow duration-200"
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-800 text-lg font-semibold">
                          {patient.full_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {patient.full_name}
                          </h3>
                          <p className="text-sm text-gray-500">{patient.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-600">ID: {patient.id}</span>
                            {calculateAge(patient.date_of_birth) && (
                              <span className="text-sm px-2 py-1 bg-gray-100 text-gray-800 rounded">
                                {calculateAge(patient.date_of_birth)} years
                              </span>
                            )}
                            <span className={`text-sm px-2 py-1 rounded ${
                              patient.voice_enrolled 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {patient.voice_enrolled ? "Voice Enrolled" : "Voice Not Enrolled"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !searchQuery.trim() ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <Image
                    src="/File searching.gif"
                    alt="Search for patients"
                    width={200}
                    height={200}
                    className="mx-auto"
                    priority
                  />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">
                  No Patients Found
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  There are no patients in the system. Add a patient to get started.
                </p>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No patients found
                </h3>
                <p className="text-gray-500">
                  No patients match your search criteria. Try different keywords.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </>
  )

  return (
    <div className="container mx-auto px-16 py-16 mt-12 transcription-welcommassege-main rounded-[20px]">
      <div className="flex flex-col space-y-6">
        <h1 className="text-2xl font-bold text-left text-[#fff]">
          Patient Details
        </h1>

        {showPatientDetails && selectedPatient ? renderPatientDetails() : renderPatientList()}

        {/* Update Patient Modal */}
        {selectedPatient && openModal === 'edit' && (
          <UpdateUserModal
            isOpen={true}
            onClose={handleCloseModal}
            user={{
              first_name: selectedPatient.first_name || "",
              last_name: selectedPatient.last_name || "",
              email: selectedPatient.email,
              phone: selectedPatient.phone || "",
              ssn_last4: selectedPatient.ssn_last4 || "",
              address: selectedPatient.address || "",
            }}
            onSave={handleSave}
          />
        )}

        {/* Voice Enrollment Modal */}
        {selectedPatient && openModal === 'voice' && (
          <PatientVoiceEnroll
            isOpen={true}
            onClose={handleCloseModal}
            id={selectedPatient.id}
          />
        )}

        {/* Patient History Modal */}
        {openModal === 'history' && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
            <div className="bg-white rounded-lg shadow-sm p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 bg-white rounded-full p-1"
                onClick={handleCloseModal}
              >
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