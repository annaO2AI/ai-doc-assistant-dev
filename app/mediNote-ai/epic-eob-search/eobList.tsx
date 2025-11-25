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
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Select a Patient Explanation of Benefit</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>
    )
  }

  // Show EOB list for selected patient
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={handleBackToPatients}
            className="mb-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            ← Back to Patients
          </button>
          <h1 className="text-2xl font-bold">
            Explanation of Benefits - {selectedPatient.full_name}
          </h1>
          <p className="text-gray-600">MRN: {selectedPatient.mrn} | Patient ID: {selectedPatient.id}</p>
        </div>
      </div>

      {patientLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="text-lg">Loading EOB data...</div>
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
  )
}