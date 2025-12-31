import { HomeIcon, SearchHistoryIcon } from "../components/icons"
import { useState, useEffect } from "react"
import { useAISearch } from "../../context/AISearchContext"
import Link from "next/link"
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx"
import { APIService } from "../../mediNote-ai/service/api"
import Profile from "./Profile" // Add this import

type FooterProps = {
  sidebarOpen: boolean
}
export default function FooterAISearch({ sidebarOpen }: FooterProps) {
   const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname()
  return (
    <footer 
    className={clsx(
              "text-center p-2 mt-auto text-xs subtitle opacity-70 bacgroundColorSt transition-all duration-300 ease-in-out",
              "backdrop-blur-xl supports-[backdrop-filter]:bg-white",
              scrolled
                ? "shadow-md border-b border-white/30 glass-card"
                : "border-b border-white/10 bg-white",
              sidebarOpen
                ? "pl-[254px]"
                : pathname === "/" || pathname === "/aiops" || pathname === "/talent-acquisition" || pathname === "/human-resources"
                ? "pl-[64px]"
                : "pl-[64px]"
            )}
    >
      <div className="mt-2 text-center px-4 text-gray-500 max-w-6xl mx-auto flex flex-col items-center">
        <span className="font-medium"> ⚠️ Disclaimer:</span>
        This content is AI-generated. Please review carefully and use your judgment before making decisions.
      </div>
      <p className="text-gray-500">© 2026. All rights reserved.</p>
    </footer>
  )
}
