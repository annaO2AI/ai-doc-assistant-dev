"use client"

import { useState } from "react"
import { APIService } from "../service/api"

export function AppointmentAuthentication({
  onTokenSubmit,
}: {
  onTokenSubmit: (token: string, patientId: string | null, fhirUser: string | null) => void
}) {
  const [authData, setAuthData] = useState<{
    token: string
    patientId: string | null
    practitionerId: string | null
    fhirUser: string | null
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleOpenAuth = () => {
    setIsLoading(true)
    window.open(
      "https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/auth/start/stu3",
      "_blank",
      "noopener,noreferrer"
    )
    setIsLoading(false)
    setShowTokenInput(true)
  }

  const fetchToken = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await APIService.getEpicSession(authData?.token ?? "")
      if (response.token_id) {
        setAuthData({
          token: response.token_id,
          patientId: response.patient_id || null,
          practitionerId: response.practitioner_id || null,
          fhirUser: response.fhirUser || null,
        })
      }
    } catch (error) {
      console.error("Error fetching Epic appointment session:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onTokenSubmit(
      authData?.token ?? "",
      authData?.patientId || null,
      authData?.fhirUser || null
    )
  }

  const handleCancel = () => {
    setAuthData(null)
    setShowTokenInput(false)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
              APPOINTMENT MODE (STU3)
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Appointment Authentication
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please authenticate with Epic STU3 to access appointments
            </p>
          </div>

          {!showTokenInput ? (
            <div className="space-y-6">
              <div className="text-center">
                <button
                  onClick={handleOpenAuth}
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Opening..." : "Start Appointment Authentication"}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Click the button above to open Epic STU3 authentication in a new tab.
                After completing authentication, you&apos;ll be able to enter
                your credentials here.
              </p>
            </div>
          ) : (
            <div>
              <p className="mt-2 text-xs text-gray-500">
                After completing authentication in the new tab, confirm the
                credentials you received here
              </p>
              <div className="my-3 p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Token ID:</p>
                    <p className="text-xs text-gray-600 break-all">
                      {authData?.token || "No token received"}
                    </p>
                  </div>
                
                </div>
                <button
                  className="mt-3 w-full p-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                  onClick={fetchToken}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Refresh Token Data"}
                </button>
              </div>
              <div className="flex space-x-3 mt-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading || !authData?.token}
                  onClick={handleSubmit}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}