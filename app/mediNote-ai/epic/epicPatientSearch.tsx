// components/EpicPatientSearch.tsx
import React, { useState, useEffect } from "react";
import { APIService } from "../service/api"; 
import { EpicPatient } from "../types"

interface EpicPatientSearchProps {
  tokenId: string;
  onSelectPatient: (patient: { 
    id: string; 
    first_name: string; 
    last_name: string; 
    full_name: string; 
    mrn: string;
    patientMId: string;
  }) => void;
  selectedPatient: { 
    id: string; 
    first_name: string; 
    last_name: string; 
    full_name: string; 
    mrn: string;
  } | null;
  onClose: () => void;
  selectedDoctor: any;
}

export default function EpicPatientSearch({
  tokenId,
  onSelectPatient,
  selectedPatient,
  onClose,
  selectedDoctor,
}: EpicPatientSearchProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<EpicPatient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch patients on component mount
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    if (!tokenId) {
      setError("Authentication token is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await APIService.searchEpicPatients(tokenId);
      
      if (data.items && data.items.length > 0) {
        setPatients(data.items);
      } else {
        setError("No patients found");
      }
    } catch (err) {
      setError(
        err instanceof Error 
          ? `Error: ${err.message}` 
          : "Failed to fetch patients"
      );
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: EpicPatient) => {
    // Check if doctor is selected first
    if (!selectedDoctor) {
      setError("Please select a practitioner first before selecting a patient");
      return;
    }

    const firstName = patient.given[0] || "Patient";
    const lastName = patient.family || "Unknown";
    
    // Use MRN as the patient ID
    onSelectPatient({
      id: patient.mrn,
      first_name: firstName,
      last_name: lastName,
      full_name: patient.full_name,
      mrn: patient.mrn,
      patientMId: patient.id || ""
    });
    // Don't close here - let parent handle it
  };

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.given.some(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="epic-patient-search bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full mx-auto max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Search Epic Patients</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.89705 4.05379L3.96967 3.96967C4.23594 3.7034 4.6526 3.6792 4.94621 3.89705L5.03033 3.96967L10 8.939L14.9697 3.96967C15.2359 3.7034 15.6526 3.6792 15.9462 3.89705L16.0303 3.96967C16.2966 4.23594 16.3208 4.6526 16.1029 4.94621L16.0303 5.03033L11.061 10L16.0303 14.9697C16.2966 15.2359 16.3208 15.6526 16.1029 15.9462L16.0303 16.0303C15.7641 16.2966 15.3474 16.3208 15.0538 16.1029L14.9697 16.0303L10 11.061L5.03033 16.0303C4.76406 16.2966 4.3474 16.3208 4.05379 16.1029L3.96967 16.0303C3.7034 15.7641 3.6792 15.3474 3.89705 15.0538L3.96967 14.9697L8.939 10L3.96967 5.03033C3.7034 4.76406 3.6792 4.3474 3.89705 4.05379L3.96967 3.96967L3.89705 4.05379Z" fill="currentColor"/>
          </svg>
        </button>
      </div>

      {/* Doctor Selection Status */}
      {!selectedDoctor && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-yellow-700">
              <strong>Please select a practitioner first</strong> before selecting a patient
            </p>
          </div>
        </div>
      )}

      {selectedDoctor && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-700">
              Practitioner selected: <strong>{selectedDoctor.first_name} {selectedDoctor.last_name}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients by name or MRN..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={!selectedDoctor}
          />
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-1">
            Found {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-600">Loading Epic patients...</p>
          </div>
        </div>
      )}

      {/* Patients List */}
      {!loading && (
        <div className="flex-1 overflow-y-auto">
          {filteredPatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPatients.map((patient) => {
                const isSelected = selectedPatient?.mrn === patient.mrn;
                return (
                  <div
                    key={patient.id}
                    className={`border rounded-lg p-4 transition-all ${
                      selectedDoctor 
                        ? isSelected
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer"
                        : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
                    }`}
                    onClick={() => selectedDoctor && handleSelectPatient(patient)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {patient.full_name}
                          </h4>
                          {isSelected && (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">MRN:</span>
                            <span className="font-semibold text-blue-600">{patient.mrn}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Patient ID:</span>
                            <span className="font-mono text-xs truncate max-w-[150px]" title={patient.id}>
                              {patient.id}
                            </span>
                          </div>
                          {patient.external_id && (
                            <div className="flex justify-between items-center">
                              <span className="font-medium">External ID:</span>
                              <span className="text-xs truncate max-w-[150px]" title={patient.external_id}>
                                {patient.external_id}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedDoctor 
                            ? isSelected
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                            : "bg-gray-100 text-gray-400"
                        }`}>
                          {selectedDoctor ? (isSelected ? "Selected" : "Select") : "Disabled"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 mt-4">
                {searchQuery 
                  ? `No patients found matching "${searchQuery}"`
                  : selectedDoctor 
                    ? "No patients available"
                    : "Please select a practitioner first to view and select patients"
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Patient Info Footer */}
      {selectedPatient && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">Currently Selected</h4>
              <p className="text-sm text-blue-700 font-semibold">{selectedPatient.full_name}</p>
              <p className="text-xs text-blue-600 mt-1">MRN: {selectedPatient.mrn}</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}