// components/EpicDoctorSearch.tsx
import React, { useEffect, useState } from "react"
import { APIService } from "../service/api"
import { EpicPractitioner } from "../types"

interface EpicDoctorSearchProps {
  tokenId: string
  onClose: () => void
  setPractitionerData: (practitioner: EpicPractitioner | null) => void
  practitionerData: EpicPractitioner | null
  practId: string | null
  autoFetch?: boolean
}

export default function EpicDoctorSearch({
  tokenId,
  onClose,
  setPractitionerData,
  practitionerData,
  practId,
  autoFetch = false,
}: EpicDoctorSearchProps) {
  const [practitionerId, setPractitionerId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [practitioner, setPractitioner] = useState<EpicPractitioner | null>(
    null
  )

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!practitionerId.trim()) {
      setError("Please enter a Practitioner ID")
      return
    }

    if (!tokenId) {
      setError("Authentication token is required")
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await APIService.searchEpicPractitioner(
        practitionerId.trim(),
        tokenId
      )

      if (data.ok) {
        setPractitioner(data)
        // Automatically update practitioner data without needing selection
        setPractitionerData(data)
      } else {
        setError("Failed to fetch practitioner information")
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Error: ${err.message}`
          : "Failed to search for practitioner"
      )
      setPractitioner(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (practId && tokenId && autoFetch) {
      setPractitionerId(practId)
      // Automatically fetch practitioner data
      const fetchPractitioner = async () => {
        try {
          setLoading(true)
          setError(null)
          const data = await APIService.searchEpicPractitioner(
            practId.trim(),
            tokenId
          )

          if (data.ok) {
            setPractitioner(data)
            setPractitionerData(data)
            // Close modal after successful auto-fetch
            if (autoFetch) {
              setTimeout(() => onClose(), 500)
            }
          } else {
            setError("Failed to fetch practitioner information")
          }
        } catch (err) {
          setError(
            err instanceof Error
              ? `Error: ${err.message}`
              : "Failed to search for practitioner"
          )
          setPractitioner(null)
        } finally {
          setLoading(false)
        }
      }
      fetchPractitioner()
    } else if (practId) {
      setPractitionerId(practId)
    }
  }, [practId, tokenId, autoFetch])

  const handleSelectDoctor = (practitioner: EpicPractitioner | null) => {
    setPractitionerData(practitioner)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(e)
    }
  }

  return (
    <div className="epic-doctor-search bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Search Epic Practitioner
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.89705 4.05379L3.96967 3.96967C4.23594 3.7034 4.6526 3.6792 4.94621 3.89705L5.03033 3.96967L10 8.939L14.9697 3.96967C15.2359 3.7034 15.6526 3.6792 15.9462 3.89705L16.0303 3.96967C16.2966 4.23594 16.3208 4.6526 16.1029 4.94621L16.0303 5.03033L11.061 10L16.0303 14.9697C16.2966 15.2359 16.3208 15.6526 16.1029 15.9462L16.0303 16.0303C15.7641 16.2966 15.3474 16.3208 15.0538 16.1029L14.9697 16.0303L10 11.061L5.03033 16.0303C4.76406 16.2966 4.3474 16.3208 4.05379 16.1029L3.96967 16.0303C3.7034 15.7641 3.6792 15.3474 3.89705 15.0538L3.96967 14.9697L8.939 10L3.96967 5.03033C3.7034 4.76406 3.6792 4.3474 3.89705 4.05379L3.96967 3.96967L3.89705 4.05379Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      {/* Search Form */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="practitionerId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Practitioner ID
          </label>
          <input
            id="practitionerId"
            type="text"
            value={practitionerId}
            onChange={(e) => setPractitionerId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Practitioner ID (e.g., e3MBXCOmcoLKl7ayLD51AWA3)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !practitionerId.trim() || !tokenId}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              Searching...
            </div>
          ) : (
            "Search Practitioner"
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Practitioner Results */}
      {practitioner && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-medium text-green-800 mb-3">
            Practitioner Found
          </h4>
          <div className="space-y-2 text-sm text-green-700">
            <div className="flex justify-between">
              <span className="font-medium">Full Name:</span>
              <span>{practitioner.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">ID:</span>
              <span className="font-mono text-xs">{practitioner.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Resource Type:</span>
              <span>{practitioner.resourceType}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Gender:</span>
              <span className="capitalize">{practitioner.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Display:</span>
              <span>{practitioner.display}</span>
            </div>
          </div>

          <button
            onClick={() => handleSelectDoctor(practitioner)}
            className="w-full mt-4 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Select This Practitioner
          </button>
        </div>
      )}

      {/* Selected Doctor Info */}
      {practitionerData && !practitioner && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            Currently Selected
          </h4>
          <p className="text-sm text-blue-700">{practitionerData.full_name}</p>
          <p className="text-xs text-blue-600 mt-1">
            ID: {practitionerData.id}
          </p>
        </div>
      )}
    </div>
  )
}