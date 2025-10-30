//page.tsx
"use client"

import { useState } from "react"

export function TokenDisplay({
  token,
  onClear,
}: {
  token: string
  onClear: () => void
}) {
  const [showToken, setShowToken] = useState(false)

  return (
    <div className="token-display-section mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div>
            <h3 className="text-sm font-medium text-green-800">
              Epic Authenticated
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-green-700">
                Token: {showToken ? token : "••••••••••••••••"}
              </span>
              <button
                onClick={() => setShowToken(!showToken)}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                {showToken ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={onClear}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
        >
          Clear Token
        </button>
      </div>
    </div>
  )
}