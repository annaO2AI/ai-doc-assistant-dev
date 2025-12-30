"use client"
import { useState } from "react"
import Aisearch from "./Aisearch"
import DocAssistantPage from "../../mediNote-ai/doctor-patient-encounter/page"


export default function Layout() {
  const [showInner, setShowInner] = useState(false)

  const handleToggle = () => {
    setShowInner((prev) => !prev)
  }

  return (
    <>
      <DocAssistantPage />
    </>
  )
}
