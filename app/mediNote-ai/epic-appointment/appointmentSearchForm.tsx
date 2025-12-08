"use client"

import { useState } from "react";
import Image from "next/image"

interface AppointmentSearchFormProps {
  tokenId: string
}

// Predefined time slots for start time
const START_TIME_SLOTS = [
  { label: "9:00 AM", value: "09:00:00" },
  { label: "10:00 AM", value: "10:00:00" },
  { label: "11:00 AM", value: "11:00:00" },
  { label: "12:00 PM", value: "12:00:00" },
  { label: "1:00 PM", value: "13:00:00" },
  { label: "2:00 PM", value: "14:00:00" },
  { label: "3:00 PM", value: "15:00:00" },
  { label: "4:00 PM", value: "16:00:00" },
  { label: "5:00 PM", value: "17:00:00" },
  { label: "6:00 PM", value: "18:00:00" },
  { label: "7:00 PM", value: "19:00:00" },
  { label: "8:00 PM", value: "20:00:00" },
  { label: "9:00 PM", value: "21:00:00" }
]

// Predefined duration options
const DURATION_OPTIONS = [
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 }
]

export function AppointmentSearchForm({ tokenId }: AppointmentSearchFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<any>(null)
  const [showSearchForm, setShowSearchForm] = useState(true)
  
  // Form state
  const [patientEpicId, setPatientEpicId] = useState("E3423")
  const [patientMRN, setPatientMRN] = useState("203177")
  const [patientFirstName, setPatientFirstName] = useState("John")
  const [patientLastName, setPatientLastName] = useState("Doe")
  const [selectedDate, setSelectedDate] = useState("2017-10-06")
  const [startTime, setStartTime] = useState("21:00:00")
  const [duration, setDuration] = useState(30)
  const [serviceTypeCode, setServiceTypeCode] = useState("95014")
  const [serviceTypeDisplay, setServiceTypeDisplay] = useState("Office Visit")
  const [indicationCode, setIndicationCode] = useState("46866001")
  const [indicationDisplay, setIndicationDisplay] = useState("Fracture of lower limb (disorder)")
  const [indicationText, setIndicationText] = useState("Broken leg")
  const [locationReference, setLocationReference] = useState("https://apporchard.epic.com/interconnect-aocurprd-oauth/api/FHIR/STU3/Location/e4W4rmGe9QzuGm2Dy4NBqVc0KDe6yGld6HW95UuN-Qd03")

  // Calculate end time based on start time and duration
  const calculateEndTime = () => {
    const [hours, minutes, seconds] = startTime.split(':').map(Number)
    const startDate = new Date(`${selectedDate}T${startTime}Z`)
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000)
    
    const endHours = endDate.getUTCHours().toString().padStart(2, '0')
    const endMinutes = endDate.getUTCMinutes().toString().padStart(2, '0')
    const endSeconds = endDate.getUTCSeconds().toString().padStart(2, '0')
    
    return `${endHours}:${endMinutes}:${endSeconds}`
  }

  const endTime = calculateEndTime()

  // Generate ISO datetime strings
  const startDateTime = `${selectedDate}T${startTime}Z`
  const endDateTime = `${selectedDate}T${endTime}Z`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSearchResults(null)

    // Validate token ID
    if (!tokenId) {
      setError("Token ID is required")
      setLoading(false)
      return
    }

    const searchParams = {
      resourceType: "Parameters",
      parameter: [
        {
          name: "patient",
          resource: {
            resourceType: "Patient",
            identifier: [
              {
                use: "usual",
                type: { text: "EPIC" },
                system: "urn:oid:1.2.840.114350.1.1",
                value: patientEpicId
              },
              {
                use: "usual",
                type: { text: "MRN" },
                system: "urn:oid:1.2.840.114350.1.13.0.1.7.5.737384.14",
                value: patientMRN
              }
            ],
            name: [
              {
                use: "official",
                family: patientLastName,
                given: [patientFirstName]
              }
            ]
          }
        },
        {
          name: "startTime",
          valueDateTime: startDateTime
        },
        {
          name: "endTime",
          valueDateTime: endDateTime
        },
        {
          name: "serviceType",
          valueCodeableConcept: {
            coding: [
              {
                system: "urn:oid:1.2.840.114350.1.13.0.1.7.3.808267.11",
                code: serviceTypeCode,
                display: serviceTypeDisplay
              }
            ]
          }
        },
        {
          name: "indications",
          valueCodeableConcept: {
            coding: [
              {
                system: "urn:oid:2.16.840.1.113883.6.96",
                code: indicationCode,
                display: indicationDisplay
              },
              {
                system: "urn:oid:2.16.840.1.113883.6.90",
                code: "S82.90XA",
                display: "Broken leg"
              }
            ],
            text: indicationText
          }
        },
        {
          name: "location-reference",
          valueReference: {
            reference: locationReference
          }
        }
      ]
    }

    try {
      // Direct API call integration with dynamic tokenId
      const response = await fetch(
        `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/scheduling/find?token_id=${tokenId}`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchParams)
        }
      )

      // Check if the response is OK
      if (!response.ok) {
        if (response.status === 501) {
          throw new Error("Method not implemented - The server does not support this functionality")
        } else if (response.status === 404) {
          throw new Error("Endpoint not found")
        } else if (response.status === 400) {
          throw new Error("Bad request - Check your parameters")
        } else if (response.status === 401) {
          throw new Error("Unauthorized - Check your token ID")
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      }

      const data = await response.json()
      setSearchResults(data)
      setShowSearchForm(false) // Hide search form after successful search
    } catch (err: any) {
      setError(err.message || "Failed to search appointments")
      console.error('Search error:', err)
      
      // If we get a "Method not implemented" error, simulate the expected response
      if (err.message.includes("Method not implemented")) {
        const simulatedResponse = {
          resourceType: "Bundle",
          type: "searchset",
          total: 0,
          link: [
            {
              relation: "self",
              url: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/STU3/Appointment/$find"
            }
          ],
          entry: [
            {
              fullUrl: "urn:uuid:12a50f6c-abef-4e64-afe9-e418a5a804c0",
              resource: {
                resourceType: "OperationOutcome",
                issue: [
                  {
                    severity: "warning",
                    code: "processing",
                    details: {
                      coding: [
                        {
                          system: "urn:oid:1.2.840.114350.1.13.0.1.7.2.657369",
                          code: "59134",
                          display: "Processing issues."
                        }
                      ],
                      text: "Processing issues."
                    },
                    diagnostics: "Not enough providers with templates in MYCHART VIDEO VISIT PROVIDERS for MYCHART VIDEO VISIT."
                  },
                  {
                    severity: "warning",
                    code: "processing",
                    details: {
                      coding: [
                        {
                          system: "urn:oid:1.2.840.114350.1.13.0.1.7.2.657369",
                          code: "4101",
                          display: "Resource request returns no results."
                        }
                      ],
                      text: "Resource request returns no results."
                    }
                  }
                ]
              },
              search: {
                mode: "outcome"
              }
            }
          ]
        }
        setSearchResults(simulatedResponse)
        setShowSearchForm(false) // Hide search form even for simulated response
      }
    } finally {
      setLoading(false)
    }
  }

  const handleNewSearch = () => {
    setShowSearchForm(true)
    setSearchResults(null)
    setError(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search Form Section */}
      {showSearchForm && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Find Appointments
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Information */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={patientFirstName}
                    onChange={(e) => setPatientFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={patientLastName}
                    onChange={(e) => setPatientLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient EPIC ID
                  </label>
                  <input
                    type="text"
                    value={patientEpicId}
                    onChange={(e) => setPatientEpicId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient MRN
                  </label>
                  <input
                    type="text"
                    value={patientMRN}
                    onChange={(e) => setPatientMRN(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
               
              </div>
            </div>

            {/* Time Range */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Time</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Start Time Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    {START_TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Time Range Display */}
              {/* <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700">
                  Selected Time Range:
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(startDateTime).toLocaleString()} - {new Date(endDateTime).toLocaleString()}
                </p>
              </div> */}
            </div>

            {/* Service Type */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Code
                  </label>
                  <input
                    type="text"
                    value={serviceTypeCode}
                    onChange={(e) => setServiceTypeCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Display
                  </label>
                  <input
                    type="text"
                    value={serviceTypeDisplay}
                    onChange={(e) => setServiceTypeDisplay(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Indications */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Indications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indication Code
                  </label>
                  <input
                    type="text"
                    value={indicationCode}
                    onChange={(e) => setIndicationCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indication Display
                  </label>
                  <input
                    type="text"
                    value={indicationDisplay}
                    onChange={(e) => setIndicationDisplay(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indication Text
                  </label>
                  <input
                    type="text"
                    value={indicationText}
                    onChange={(e) => setIndicationText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !tokenId}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Searching..." : "Search Appointments"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Results Section */}
      {searchResults && !showSearchForm && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[28px] font-bold text-gray-900">Search Results</h2>
            <button
              onClick={handleNewSearch}
              className="px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              New Search
            </button>
          </div>
          
          {searchResults.total === 0 ? (
            <div className="rounded-md p-4 text-center">
              <p className="text-[22px] font-medium text-[#34334B] mb-2">No appointments found</p>
              <Image
                src="/No data.gif"
                alt="Epic logo"
                width={180}
                height={180}
                className="flex-shrink-0 m-auto"
              />
              {searchResults.entry && searchResults.entry.length > 0 && searchResults.entry[0].resource?.issue && (
                <div className="space-y-2">
                  {searchResults.entry[0].resource.issue.map((issue: any, index: number) => (
                    <div key={index} className="text-sm text-[#34334B] w-[350px] m-auto">
                      {issue.diagnostics || issue.details?.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.entry?.map((entry: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">Mode:</span>
                    <span className="ml-2 text-sm text-gray-600 capitalize">{entry.search.mode}</span>
                  </div>
                  <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded border">
                    {JSON.stringify(entry.resource, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <button
            onClick={handleNewSearch}
            className="mt-3 px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}