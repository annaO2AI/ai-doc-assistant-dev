import React, { useState, useEffect, useCallback } from "react"
import DoctorCard from "../components/DoctorCard"
import { APIService } from "../service/api"
import { UpdateDoctorModal } from "../components/UpdateDoctorModal"
import { DoctorVoiceEnroll } from "../components/DoctorVoiceEnroll"
import Image from "next/image"

interface ApiResponse {
  results: Doctor[]
}

interface Doctor {
  id: number
  first_name: string
  last_name: string
  email: string
  voice_enrolled: boolean
}

interface DoctorWithFullName extends Doctor {
  full_name: string
}

interface DoctorCreationTypes {
  first_name: string
  last_name: string
  email: string
}

const SearchDoctor: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorWithFullName[]>([])
  const [allDoctors, setAllDoctors] = useState<DoctorWithFullName[]>([]) // Store all doctors
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingAllDoctors, setLoadingAllDoctors] = useState<boolean>(true) // Loading for initial fetch
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false)
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithFullName | null>(null)
  const [showDoctorDetails, setShowDoctorDetails] = useState<boolean>(false) // To show details view

  // Fetch all doctors on initial load
  const fetchAllDoctors = useCallback(async (): Promise<void> => {
    setLoadingAllDoctors(true)
    try {
      const data: ApiResponse = await APIService.SearchDoctor() // You'll need this API method
      
      if (data && data.results) {
        const doctorsWithFullName: DoctorWithFullName[] = data.results.map((doctor: Doctor) => ({
          ...doctor,
          full_name: `${doctor.first_name} ${doctor.last_name}`,
        }))
        setAllDoctors(doctorsWithFullName)
        setDoctors(doctorsWithFullName) // Show all doctors initially
      }
    } catch (err) {
      console.error("Fetch all doctors error:", err)
      setError(err instanceof Error ? `Failed to fetch doctors: ${err.message}` : "Failed to fetch doctors")
    } finally {
      setLoadingAllDoctors(false)
    }
  }, [])

  // Initial fetch on component mount
  useEffect(() => {
    fetchAllDoctors()
  }, [fetchAllDoctors])

  // Memoized search function
  const searchDoctors = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setDoctors(allDoctors) // Show all doctors when search is empty
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data: ApiResponse = await APIService.SearchDoctor(query)
      
      if (!data || !data.results) {
        setDoctors([])
        return
      }
      
      // Add full_name to each doctor
      const doctorsWithFullName: DoctorWithFullName[] = data.results.map((doctor: Doctor) => ({
        ...doctor,
        full_name: `${doctor.first_name} ${doctor.last_name}`,
      }))
      
      setDoctors(doctorsWithFullName)
    } catch (err) {
      console.error("Search doctors error:", err)
      setError(err instanceof Error ? `Failed to search doctors: ${err.message}` : "Failed to search doctors")
      setDoctors([])
    } finally {
      setLoading(false)
    }
  }, [allDoctors])

  // Debounce search input
  useEffect(() => {
    const timerId = setTimeout(() => {
      searchDoctors(searchQuery)
    }, 500)

    return () => {
      clearTimeout(timerId)
    }
  }, [searchQuery, searchDoctors])

  const handleUpdate = (doctorData: DoctorWithFullName): void => {
    setSelectedDoctor(doctorData)
    setIsModalOpen(true)
  }

  const handleEnrollVoice = (doctor: DoctorWithFullName): void => {
    setSelectedDoctor(doctor)
    setIsVoiceModalOpen(true)
  }

  const handleSelectDoctor = (doctor: DoctorWithFullName): void => {
    setSelectedDoctor(doctor)
    setShowDoctorDetails(true)
  }

  const handleBackToList = (): void => {
    setShowDoctorDetails(false)
    setSelectedDoctor(null)
  }

  const handleSave = async (updatedData: DoctorCreationTypes): Promise<void> => {
    if (!selectedDoctor) return
    
    try {
      const response = await APIService.updateDoctor(
        updatedData,
        selectedDoctor.id
      )
      
      if (response) {
        // Refresh the doctors list
        await fetchAllDoctors()
        await searchDoctors(searchQuery)
      }
      
      setIsModalOpen(false)
    } catch (error) {
      console.error("Update failed:", error)
      setError(error instanceof Error ? error.message : "Update failed")
    }
  }

  const handleCloseModal = (): void => {
    setIsModalOpen(false)
  }

  const handleCloseVoiceModal = (): void => {
    setIsVoiceModalOpen(false)
  }

  // Doctor Details View
  const renderDoctorDetails = () => {
    if (!selectedDoctor) return null

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
              onClick={() => handleUpdate(selectedDoctor)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit Doctor
            </button>
            <button
              onClick={() => handleEnrollVoice(selectedDoctor)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {selectedDoctor.voice_enrolled ? "Update Voice" : "Enroll Voice"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Full Name</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {selectedDoctor.full_name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-lg text-gray-900">{selectedDoctor.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Doctor ID</label>
              <p className="mt-1 text-lg text-gray-900">{selectedDoctor.id}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedDoctor.voice_enrolled 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {selectedDoctor.voice_enrolled ? "Voice Enrolled" : "Voice Not Enrolled"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Doctor List View
  const renderDoctorList = () => (
    <>
      {/* Search Input */}
      <div className="relative m-auto w-full max-w-[500px]">
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
          placeholder="Search doctors by name or email"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchQuery(e.target.value)
          }}
        />
      </div>

      {/* Loading State for initial fetch */}
      {loadingAllDoctors && (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading doctors...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && !loadingAllDoctors && (
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

      {/* Search Results / All Doctors List */}
      {!loadingAllDoctors && !error && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-700">
              {searchQuery.trim() ? "Search Results" : "All Doctors"}
            </h2>
            {doctors.length > 0 && (
              <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                {doctors.length} doctor{doctors.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {doctors.length > 0 ? (
            <div className="space-y-4">
              {doctors.map((doctor: DoctorWithFullName) => (
                <div
                  key={doctor.id}
                  className="rounded-lg shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow duration-200"
                  onClick={() => handleSelectDoctor(doctor)}
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-800 text-lg font-semibold">
                          {doctor.first_name.charAt(0)}{doctor.last_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {doctor.full_name}
                          </h3>
                          <p className="text-sm text-gray-500">{doctor.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-600">ID: {doctor.id}</span>
                            <span className={`text-sm px-2 py-1 rounded ${
                              doctor.voice_enrolled 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {doctor.voice_enrolled ? "Voice Enrolled" : "Voice Not Enrolled"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdate(doctor)
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEnrollVoice(doctor)
                          }}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          {doctor.voice_enrolled ? "Update Voice" : "Enroll"}
                        </button>
                      </div> */}
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
                    alt="Search for doctors"
                    width={200}
                    height={200}
                    className="mx-auto"
                    priority
                  />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">
                  No Doctors Found
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  There are no doctors in the system. Add a doctor to get started.
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
                  No doctors found
                </h3>
                <p className="text-gray-500">
                  No doctors match your search criteria. Try different keywords.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </>
  )

  return (
    <div className="container mx-auto px-4 py-8 mt-12">
      <div className="flex flex-col space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Doctor Details
        </h1>

        {showDoctorDetails && selectedDoctor ? renderDoctorDetails() : renderDoctorList()}

        {/* Update Doctor Modal */}
        {selectedDoctor && (
          <UpdateDoctorModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            doctor={{
              first_name: selectedDoctor.first_name,
              last_name: selectedDoctor.last_name,
              email: selectedDoctor.email,
            }}
            onSave={handleSave}
          />
        )}

        {/* Voice Enrollment Modal */}
        {selectedDoctor && (
          <DoctorVoiceEnroll
            isOpen={isVoiceModalOpen}
            onClose={handleCloseVoiceModal}
            id={selectedDoctor.id}
            showAsModal={true}
          />
        )}
      </div>
    </div>
  )
}

export default SearchDoctor