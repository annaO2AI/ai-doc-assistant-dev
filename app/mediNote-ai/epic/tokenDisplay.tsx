//page.tsx
"use client"

import { useState } from "react"
import Image from "next/image"

export function TokenDisplay({
  token,
  onClear,
}: {
  token: string
  onClear: () => void
}) {
  const [showToken, setShowToken] = useState(false)

  return (
    <div className="border rounded-lg border-gray-200 bg-white border-b border-gray-200 px-6 py-3 w-[600px] m-auto fixed top-[0] left-[0] right-[0] z-10 rounded-br-xl rounded-bl-xl">
      <div className="flex items-center justify-between p-1">
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
              Epic Authenticated (R4)
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
          className="group flex items-center px-4 py-2 text-sm text-red-700 border border-red-200 rounded hover:bg-red-50 hover:border-red-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 whitespace-nowrap min-w-fit overflow-hidden"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0 pr-2"
          >
            <path
              d="M2.39705 2.55379L2.46967 2.46967C2.73594 2.2034 3.1526 2.1792 3.44621 2.39705L3.53033 2.46967L8 6.939L12.4697 2.46967C12.7626 2.17678 13.2374 2.17678 13.5303 2.46967C13.8232 2.76256 13.8232 3.23744 13.5303 3.53033L9.061 8L13.5303 12.4697C13.7966 12.7359 13.8208 13.1526 13.6029 13.4462L13.5303 13.5303C13.2641 13.7966 12.8474 13.8208 12.5538 13.6029L12.4697 13.5303L8 9.061L3.53033 13.5303C3.23744 13.8232 2.76256 13.8232 2.46967 13.5303C2.17678 13.2374 2.17678 12.7626 2.46967 12.4697L6.939 8L2.46967 3.53033C2.2034 3.26406 2.1792 2.8474 2.39705 2.55379L2.46967 2.46967L2.39705 2.55379Z"
              fill="currentColor"
            />
          </svg>
            Epic Logout
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
          </div>
        </div>
      )}
    </div>
  )
}
