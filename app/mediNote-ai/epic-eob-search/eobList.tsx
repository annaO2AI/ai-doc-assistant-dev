// components/EOBList.tsx
"use client"

import { useState, useEffect } from "react"
import { APIService } from "../service/api"
import EOBDetails from "./eobDetails"
import { EOBEntry, EpicPatient } from "../types"

interface EOBListProps {
  authToken: string;
}

export default function EOBList({ authToken }: EOBListProps) {
  const [patients, setPatients] = useState<EpicPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<EpicPatient | null>(null);
  const [eobEntries, setEobEntries] = useState<EOBEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEOB, setSelectedEOB] = useState<EOBEntry | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)

  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoading(true)
        const patientsData = await APIService.searchEpicPatients(authToken)
        setPatients(patientsData.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (authToken) {
      fetchPatients()
    }
  }, [authToken])

  const handlePatientSelect = async (patient: EpicPatient) => {
    try {
      setPatientLoading(true)
      setSelectedPatient(patient)
      const eobData = await APIService.getEOBByPatient(patient.id, authToken)
      setEobEntries(eobData.entry || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch EOB data")
    } finally {
      setPatientLoading(false)
    }
  }

  const handleBackToPatients = () => {
    setSelectedPatient(null)
    setEobEntries([])
    setSelectedEOB(null)
  }

  const handleRowClick = (entry: EOBEntry) => {
    setSelectedEOB(entry)
  }

  const handleBackToList = () => {
    setSelectedEOB(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading patients...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500 text-lg">Error: {error}</div>
      </div>
    )
  }

  if (selectedEOB) {
    return <EOBDetails eobEntry={selectedEOB} onBack={handleBackToList} />
  }

  // Show patient selection if no patient is selected
  if (!selectedPatient) {
    return (
      <div className="w-full mt-6">
        <div className="epic-patient-search w-[88%] mx-auto flex flex-col transcription-welcommassege-main rounded-[20px] p-12 autopharmacySearch-min relative">
          <h1 className="text-2xl font-bold mb-6 text-[#fff]">Select a Patient Explanation of Benefit</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-[2]">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white shadow-md rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200"
                onClick={() => handlePatientSelect(patient)}
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex gap-2 items-center">
                  <span className="avatar-scr">{patient.full_name.charAt(0).toUpperCase()}</span>
                  {patient.full_name}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">MRN:</span> {patient.mrn}</p>
                  <p><span className="font-medium">ID:</span> {patient.id}</p>
                  <p><span className="font-medium">External ID:</span> {patient.external_id}</p>
                </div>
              </div>
            ))}
          </div>

          {patients.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No patients found</p>
            </div>
          )}
          <span className="rightlinerGrading">
            <svg width="461" height="430" viewBox="0 0 461 430" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M261.412 0C341.45 8.67863e-05 413.082 35.9951 461.001 92.6807V429.783C460.94 429.856 460.878 429.928 460.816 430H289.244C370.46 416.708 432.435 346.208 432.435 261.232C432.435 166.779 355.865 90.2101 261.412 90.21C166.959 90.21 90.3887 166.779 90.3887 261.232C90.3887 346.208 152.364 416.707 233.579 430H62.0068C23.4388 384.476 0.179688 325.571 0.179688 261.232C0.179741 116.958 117.137 0 261.412 0Z" fill="#C2F5F9" fillOpacity="0.2" />
            </svg>
          </span>
          <span className="bottomlinerGrading">
            <svg width="289" height="199" viewBox="0 0 289 199" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M74.4604 14.9961C29.4945 21.2278 -3.5762 38.2063 -12.2914 45.6118L-26.7382 51.5987L-18.129 238.328L15.9938 288.05L59.727 287.301L185.831 257.872C186.478 228.034 237.253 176.817 262.56 154.938C307.047 107.868 284.151 58.3168 267.142 39.4252C236.04 -2.0024 184.942 -2.74081 158.943 2.76831C155.608 3.47505 152.272 4.08963 148.876 4.38837C134.405 5.6613 97.5463 9.50809 74.4604 14.9961Z" fill="url(#paint0_linear_3427_90583)" fillOpacity="0.4" />
              <defs>
                <linearGradient id="paint0_linear_3427_90583" x1="307.848" y1="2.45841" x2="-6.38578" y2="289.124" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#45CEF1" />
                  <stop offset="1" stopColor="#219DF1" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </div>
      </div>
    )
  }

  // Show EOB list for selected patient
  return (
     <div className="w-full mt-6">
      <div className="epic-patient-search  w-[88%] mx-auto flex flex-col transcription-welcommassege-main rounded-[20px] p-12 autopharmacySearch-min relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={handleBackToPatients}
              className="mb-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              ← Back to Patients
            </button>
            <h1 className="text-2xl font-bold text-[#fff]">
              Explanation of Benefits - {selectedPatient.full_name}
            </h1>
            <p className="text-[#ffffffb3]">MRN: {selectedPatient.mrn} | Patient ID: {selectedPatient.id}</p>
          </div>
        </div>

        {patientLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-lg text-[#ffffffb3]">Loading EOB data...</div>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    EOB ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Paid
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eobEntries.map((entry) => (
                  <tr
                    key={entry.resource.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(entry)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.resource.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.resource.patient.display}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.resource.provider.display}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.resource.created).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ${entry.resource.payment.amount.value}
                    </td>
                  </tr>
                ))}
                {eobEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No EOB records found for this patient
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}