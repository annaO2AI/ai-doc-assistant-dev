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
    <div className="token-display-section pt-6 mb-4 p-4 bg-white rounded-lg epicLoginBox">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Image
            src="/epic-logo.svg"
            alt="stop recording"
            width={60}
            height={80}
          />
          <div>
            {/* <h3 className="text-sm font-medium ot-title">
              Epic Authenticated
            </h3> */}
            <div className="flex items-center gap-2 osubtitle">
              <span className="text-[12px] font-medium">
                Token: 
              </span>
              <span className="text-[12px] font-medium customBord px-2">
                  {showToken ? token : "••••••••••••••••"}
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
          className="px-3 py-1 text-xs  text-red-700 rounded   transition-colors"
        >
         <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.39705 2.55379L2.46967 2.46967C2.73594 2.2034 3.1526 2.1792 3.44621 2.39705L3.53033 2.46967L8 6.939L12.4697 2.46967C12.7626 2.17678 13.2374 2.17678 13.5303 2.46967C13.8232 2.76256 13.8232 3.23744 13.5303 3.53033L9.061 8L13.5303 12.4697C13.7966 12.7359 13.8208 13.1526 13.6029 13.4462L13.5303 13.5303C13.2641 13.7966 12.8474 13.8208 12.5538 13.6029L12.4697 13.5303L8 9.061L3.53033 13.5303C3.23744 13.8232 2.76256 13.8232 2.46967 13.5303C2.17678 13.2374 2.17678 12.7626 2.46967 12.4697L6.939 8L2.46967 3.53033C2.2034 3.26406 2.1792 2.8474 2.39705 2.55379L2.46967 2.46967L2.39705 2.55379Z" fill="#34334B"/>
        </svg>
        </button>
      </div>
    </div>
  )
}