//page.tsx
"use client"

import { useState } from "react"

export function EpicAuthentication({
  onTokenSubmit,
}: {
  onTokenSubmit: (token: string) => void
}) {
  const [tokenId, setTokenId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showTokenInput, setShowTokenInput] = useState(false)

  const handleOpenAuth = () => {
    setIsLoading(true)
    window.open(
      "https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/auth/start",
      "_blank",
      "noopener,noreferrer"
    )
    setIsLoading(false)
    setShowTokenInput(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tokenId.trim()) {
      onTokenSubmit(tokenId.trim())
      setTokenId("")
      setShowTokenInput(false)
    }
  }

  const handleCancel = () => {
    setTokenId("")
    setShowTokenInput(false)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Authentication Required
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please authenticate with Epic to access the application
            </p>
          </div>

          {!showTokenInput ? (
            <div className="space-y-6">
              <div className="text-center">
                <button
                  onClick={handleOpenAuth}
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Opening..." : "Start Epic Authentication"}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Click the button above to open Epic authentication in a new tab.
                After completing authentication, you'll be able to enter your
                token here.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="tokenId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Enter Your Epic Token
                </label>
                <input
                  id="tokenId"
                  type="text"
                  required
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="Paste your token ID here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-2 text-xs text-gray-500">
                  After completing authentication in the new tab, paste the
                  token ID you received here
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={!tokenId.trim()}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                >
                  Submit Token & Continue
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}