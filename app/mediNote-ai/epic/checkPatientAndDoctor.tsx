//page.tsx
"use client"
import React, { useState } from "react"
import WelcomeMessage from "../doctor-patient-voice/WelcomeMessage"
import { PatientProfile } from "./patientProfile"
import EpicPatientSearch from "./epicPatientSearch"
import { DoctorProfile } from "./DoctorProfile"
import EpicDoctorSearch from "./epicDoctorSearch"
import { epicPatientResponse, EpicPractitioner } from "../types"
import { recordingProps } from "./page"

export default function CheckPatientAndDoctor({
  authToken,
  handleRecording,
  practitionerId
}: {
  authToken: string | null
  handleRecording: (recording: recordingProps) => void
  practitionerId: string | null
}) {
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [showEpicPatientSearch, setShowEpicPatientSearch] = useState(false)
  const [showEpicDoctorSearch, setShowEpicDoctorSearch] = useState(false)
  const [practitionerData, setPractitionerData] =
    useState<EpicPractitioner | null>(null)
 const [patientError, setPatientError] = useState<string | null>(null);
    const [doctorError, setDoctorError] = useState<string | null>(null);
  const handleEpicPatientSelect = (patient: epicPatientResponse) => {
    console.log(patient)
    setSelectedPatient(patient)
    setShowEpicPatientSearch(false)
  }

  const handleStartSession = () => {
    if (!selectedPatient || !practitionerData) {
      setPatientError("Please select a patient and a doctor before starting the session");
      setDoctorError("Please select a doctor and a patient before starting the session");
      return;
    }
      handleRecording(
      {
        patientId:parseInt(selectedPatient.id) || 0,
      practitionerId:practitionerData.id || "",
      patientName:selectedPatient.full_name,
      practitionerName:practitionerData.full_name || ``,
      patientMId: selectedPatient.patientMId || ""
      }
    );
  }

   const handleStartConversation = () => {
    if (!practitionerData) {
      setDoctorError("Please select a doctor before starting the session");
      return;
    }
    if (!selectedPatient) {
      setPatientError("Please select a patient before starting the session");
      return;
    }
    handleStartSession();
  };

  return (
    <div className="flex Patient-voice mx-auto w-[80%] mt-6 transcription-welcommassege-main rounded-[1vw] relative">
      <PatientProfile
        patient={selectedPatient}
        onEditClick={() => setShowEpicPatientSearch(true)}
      />
      {showEpicPatientSearch && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
          <EpicPatientSearch
            tokenId={authToken || ""}
            onSelectPatient={handleEpicPatientSelect}
            selectedPatient={selectedPatient}
            onClose={() => setShowEpicPatientSearch(false)}
            selectedDoctor={practitionerData}
          />
        </div>
      )}
      <WelcomeMessage username={"Doctor"} onStartConversation={handleStartConversation} />
      <div className="relative flex gap-3">
        <DoctorProfile
          doctor={practitionerData}
          onEditClick={() => setShowEpicDoctorSearch(true)}
        />
        {/* Epic Doctor Search Modal */}
        {showEpicDoctorSearch && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
            <EpicDoctorSearch
              tokenId={authToken || ""}
              onClose={() => setShowEpicDoctorSearch(false)}
              setPractitionerData={setPractitionerData}
              practitionerData={practitionerData}
              practId={practitionerId}
              autoFetch={true}
            />
          </div>
        )}
      </div>
      <span className="rightlinerGrading">
        <svg
          width="461"
          height="430"
          viewBox="0 0 461 430"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M261.412 0C341.45 8.67863e-05 413.082 35.9951 461.001 92.6807V429.783C460.94 429.856 460.878 429.928 460.816 430H289.244C370.46 416.708 432.435 346.208 432.435 261.232C432.435 166.779 355.865 90.2101 261.412 90.21C166.959 90.21 90.3887 166.779 90.3887 261.232C90.3887 346.208 152.364 416.707 233.579 430H62.0068C23.4388 384.476 0.179688 325.571 0.179688 261.232C0.179741 116.958 117.137 0 261.412 0Z"
            fill="#C2F5F9"
            fillOpacity="0.2"
          />
        </svg>
      </span>
      <span className="bottomlinerGrading">
        <svg
          width="289"
          height="199"
          viewBox="0 0 289 199"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M74.4604 14.9961C29.4945 21.2278 -3.5762 38.2063 -12.2914 45.6118L-26.7382 51.5987L-18.129 238.328L15.9938 288.05L59.727 287.301L185.831 257.872C186.478 228.034 237.253 176.817 262.56 154.938C307.047 107.868 284.151 58.3168 267.142 39.4252C236.04 -2.0024 184.942 -2.74081 158.943 2.76831C155.608 3.47505 152.272 4.08963 148.876 4.38837C134.405 5.6613 97.5463 9.50809 74.4604 14.9961Z"
            fill="url(#paint0_linear_3427_90583)"
            fillOpacity="0.4"
          />
          <defs>
            <linearGradient
              id="paint0_linear_3427_90583"
              x1="307.848"
              y1="2.45841"
              x2="-6.38578"
              y2="289.124"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#45CEF1" />
              <stop offset="1" stopColor="#219DF1" />
            </linearGradient>
          </defs>
        </svg>
      </span>
    </div>
  )
}
