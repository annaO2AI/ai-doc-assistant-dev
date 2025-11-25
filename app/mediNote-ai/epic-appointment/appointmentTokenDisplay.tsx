"use client"

import { useState } from "react"
import Image from "next/image"
export function AppointmentTokenDisplay({
  token,
  fhirUser,
  onClear,
}: {
  token: string
  fhirUser: string | null
  onClear: () => void
}) {
  const [showToken, setShowToken] = useState(false)

  return (
    <div className="border rounded-lg border-gray-200 bg-white border-b border-gray-200 px-6 py-3 w-[600px] m-auto fixed top-[0] left-[0] right-[0] z-10 rounded-br-xl rounded-bl-xl h-[73px] content-center ">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Image
            src="/epic-logo.svg"
            alt="Epic logo"
            width={40}
            height={40}
            className="flex-shrink-0"
          />
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Appointment Authenticated (STU3)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowToken(!showToken)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showToken ? "Hide Details" : "Show Details"}
            </button>
          </div>
        </div>
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
        >
          Clear Authentication
        </button>
      </div>
      {showToken && (
        <div className="mt-3 p-4 bg-gray-50 rounded-md border border-gray-200">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Token ID:</span>
              <p className="text-gray-600 break-all font-mono text-xs mt-1">
                {token}
              </p>
            </div>
            {fhirUser && (
              <div>
                <span className="font-semibold text-gray-700">FHIR User:</span>
                <p className="text-gray-600 break-all font-mono text-xs mt-1">
                  {fhirUser}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}