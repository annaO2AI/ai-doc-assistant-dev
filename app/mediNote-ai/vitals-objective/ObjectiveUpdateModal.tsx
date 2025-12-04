import React, { useState, useEffect } from "react"
import { ObjectiveData } from "../types"

interface ObjectiveUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  objective: ObjectiveData
  onSave: (data: Partial<ObjectiveData>) => Promise<any>
  isSaving: boolean
  error: string | null
}

const ObjectiveUpdateModal: React.FC<ObjectiveUpdateModalProps> = ({
  isOpen,
  onClose,
  objective,
  onSave,
  isSaving,
  error,
}) => {
  // Initialize numeric fields as empty strings for display
  const [formData, setFormData] = useState<Partial<ObjectiveData>>({
    session_id: 0,
    summary_id: 0,
    blood_pressure_systolic: 0,
    blood_pressure_diastolic: 0,
    heart_rate: 0,
    respiratory_rate: 0,
    temperature_f: 0,
    oxygen_saturation: 0,
    general_appearance: "",
    heent: "",
    neurological: "",
  })

  // For display purposes, we'll keep string values in a separate state
  const [displayValues, setDisplayValues] = useState({
    session_id: "",
    summary_id: "",
    blood_pressure_systolic: "",
    blood_pressure_diastolic: "",
    heart_rate: "",
    respiratory_rate: "",
    temperature_f: "",
    oxygen_saturation: "",
  })

  useEffect(() => {
    if (objective) {
      setFormData({
        session_id: objective.session_id || 0,
        summary_id: objective.summary_id || 0,
        blood_pressure_systolic: objective.blood_pressure_systolic || 0,
        blood_pressure_diastolic: objective.blood_pressure_diastolic || 0,
        heart_rate: objective.heart_rate || 0,
        respiratory_rate: objective.respiratory_rate || 0,
        temperature_f: objective.temperature_f || 0,
        oxygen_saturation: objective.oxygen_saturation || 0,
        general_appearance: objective.general_appearance || "",
        heent: objective.heent || "",
        neurological: objective.neurological || "",
      })

      // Set display values (empty string for 0 values)
      setDisplayValues({
        session_id: objective.session_id ? objective.session_id.toString() : "",
        summary_id: objective.summary_id ? objective.summary_id.toString() : "",
        blood_pressure_systolic: objective.blood_pressure_systolic ? objective.blood_pressure_systolic.toString() : "",
        blood_pressure_diastolic: objective.blood_pressure_diastolic ? objective.blood_pressure_diastolic.toString() : "",
        heart_rate: objective.heart_rate ? objective.heart_rate.toString() : "",
        respiratory_rate: objective.respiratory_rate ? objective.respiratory_rate.toString() : "",
        temperature_f: objective.temperature_f ? objective.temperature_f.toString() : "",
        oxygen_saturation: objective.oxygen_saturation ? objective.oxygen_saturation.toString() : "",
      })
    }
  }, [objective])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    const numericFields = [
      "session_id",
      "summary_id",
      "blood_pressure_systolic",
      "blood_pressure_diastolic",
      "heart_rate",
      "respiratory_rate",
      "temperature_f",
      "oxygen_saturation",
    ]

    if (numericFields.includes(name)) {
      // Update display value
      setDisplayValues(prev => ({
        ...prev,
        [name]: value
      }))

      // Update form data with numeric value or 0
      const numValue = value === "" ? 0 : Number(value)
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      // Error is handled by parent component
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Add New Objective Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSaving}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            Patient ID:{" "}
            <span className="font-semibold">{objective.patient_id}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Session and Summary IDs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session ID (optional)
                </label>
                <input
                  type="number"
                  name="session_id"
                  value={displayValues.session_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  placeholder="Enter session ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary ID (optional)
                </label>
                <input
                  type="number"
                  name="summary_id"
                  value={displayValues.summary_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  placeholder="Enter summary ID"
                />
              </div>
            </div>

            {/* Vital Signs */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">Vital Signs</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blood Pressure (Systolic)
                  </label>
                  <input
                    type="number"
                    name="blood_pressure_systolic"
                    value={displayValues.blood_pressure_systolic}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    placeholder="e.g., 120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blood Pressure (Diastolic)
                  </label>
                  <input
                    type="number"
                    name="blood_pressure_diastolic"
                    value={displayValues.blood_pressure_diastolic}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    placeholder="e.g., 80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    name="heart_rate"
                    value={displayValues.heart_rate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    placeholder="e.g., 72"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Respiratory Rate (/min)
                  </label>
                  <input
                    type="number"
                    name="respiratory_rate"
                    value={displayValues.respiratory_rate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    placeholder="e.g., 16"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature (°F)
                  </label>
                  <input
                    type="number"
                    name="temperature_f"
                    value={displayValues.temperature_f}
                    onChange={handleInputChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 98.6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Oxygen Saturation (%)
                  </label>
                  <input
                    type="number"
                    name="oxygen_saturation"
                    value={displayValues.oxygen_saturation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max="100"
                    placeholder="e.g., 98"
                  />
                </div>
              </div>
            </div>

            {/* Physical Examination */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">
                Physical Examination
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  General Appearance
                </label>
                <textarea
                  name="general_appearance"
                  value={formData.general_appearance || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Alert and oriented, appears fatigued."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HEENT (Head, Eyes, Ears, Nose, Throat)
                </label>
                <textarea
                  name="heent"
                  value={formData.heent || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Mild tenderness on palpation of the temples, no sinus tenderness."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Neurological
                </label>
                <textarea
                  name="neurological"
                  value={formData.neurological || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Cranial nerves II–XII intact, no focal deficits."
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Saving...
                </>
              ) : (
                "Save Objective Data"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ObjectiveUpdateModal