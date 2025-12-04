import React, { useState, useEffect, useCallback } from "react";
import { patient, PatientCreationTypes, ObjectiveData } from "../types";
import UserCard from "./userCard";
import { APIService } from "../service/api";
import { UpdateUserModal } from "../components/UpdateUserModal";
import Image from 'next/image';
import ObjectiveUpdateModal from "./ObjectiveUpdateModal";

interface ApiResponse {
  results: patient[];
}

const VitalsObjectiveForm: React.FC = () => {
  const [users, setUsers] = useState<patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [objectiveLoading, setObjectiveLoading] = useState(false);
  const [savingObjective, setSavingObjective] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectiveError, setObjectiveError] = useState<string | null>(null);
  const [saveObjectiveError, setSaveObjectiveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<patient | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
  const [objectiveData, setObjectiveData] = useState<ObjectiveData[]>([]);

  // Memoized fetchUsers function
  const fetchUsers = useCallback(async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      const data: ApiResponse = await APIService.SearchPatient(searchQuery);
      if (!data) {
        setError("Something went wrong");
        throw new Error("No response received from server");
      } else {
        setUsers(data.results);
        setHasSearched(true);
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to fetch users: ${err.message}`);
      } else {
        setError("Failed to fetch users");
      }
      setLoading(false);
      setHasSearched(true);
    }
  }, [searchQuery]);

  // Fetch objective data by patient ID
  const fetchObjectiveData = useCallback(async (patientId: number) => {
    try {
      setObjectiveLoading(true);
      setObjectiveError(null);
      
      const response = await fetch(
        `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/objective/by-patient/${patientId}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ObjectiveData[] = await response.json();
      setObjectiveData(data);
      setObjectiveLoading(false);
    } catch (err) {
      console.error('Error fetching objective data:', err);
      setObjectiveError(err instanceof Error ? err.message : "Failed to fetch objective data");
      setObjectiveLoading(false);
    }
  }, []);

  // Function to save objective data
  const handleSaveObjective = async (objectiveData: Partial<ObjectiveData>) => {
    if (!selectedUser) return;
    
    try {
      setSavingObjective(true);
      setSaveObjectiveError(null);
      
      const payload = {
        patient_id: selectedUser.id,
        session_id: objectiveData.session_id || 0,
        summary_id: objectiveData.summary_id || 0,
        blood_pressure_systolic: objectiveData.blood_pressure_systolic || 0,
        blood_pressure_diastolic: objectiveData.blood_pressure_diastolic || 0,
        heart_rate: objectiveData.heart_rate || 0,
        respiratory_rate: objectiveData.respiratory_rate || 0,
        temperature_f: objectiveData.temperature_f || 0,
        oxygen_saturation: objectiveData.oxygen_saturation || 0,
        general_appearance: objectiveData.general_appearance || "",
        heent: objectiveData.heent || "",
        neurological: objectiveData.neurological || "",
      };

      const response = await APIService.saveObjective(payload);
      
      // Refresh the objective data
      if (selectedUser.id) {
        await fetchObjectiveData(selectedUser.id);
      }
      
      setIsObjectiveModalOpen(false);
      setSelectedObjective(null);
      setSavingObjective(false);
      
      return response;
    } catch (err) {
      console.error('Error saving objective data:', err);
      setSaveObjectiveError(err instanceof Error ? err.message : "Failed to save objective data");
      setSavingObjective(false);
      throw err;
    }
  };

  // Function to handle adding new objective data from UserCard
  const handleAddNew = (patientData: patient) => {
    if (patientData) {
      setSelectedUser(patientData);
      setSelectedObjective({
        patient_id: patientData.id,
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
      });
      setIsObjectiveModalOpen(true);
    }
  };

  // Function to handle adding new objective data from View Modal
  const handleAddObjective = () => {
    if (selectedUser) {
      setSelectedObjective({
        patient_id: selectedUser.id,
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
      });
      setIsObjectiveModalOpen(true);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  // Fetch users with search query
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        await fetchUsers();
      } catch (err) {
        if (isMounted) {
          setError("Failed to fetch users");
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearchQuery, fetchUsers]);

  // Function to show objective data
  const handleShowObjective = async (patientId: number, patientData: patient) => {
    setSelectedUser(patientData);
    setSelectedPatientIds([patientId]);
    
    // Fetch objective data
    await fetchObjectiveData(patientId);
    
    // Show objective modal
    setShowObjectiveModal(true);
  };

  const handlePatientSelect = (patientId: number) => {
    setSelectedPatientIds((prev) =>
      prev.includes(patientId)
        ? prev.filter((id) => id !== patientId)
        : [...prev, patientId]
    );
  };

  const handleCardClick = (patientId: number) => {
    const patientData = users.find(user => user.id === patientId);
    if (!patientData) return;
    
    handleShowObjective(patientId, patientData);
  };

  const handleCloseObjectiveModal = () => {
    setShowObjectiveModal(false);
    setSelectedPatientIds([]);
    setObjectiveData([]);
    setObjectiveError(null);
  };

  const handleCloseObjectiveEditModal = () => {
    setIsObjectiveModalOpen(false);
    setSelectedObjective(null);
    setSaveObjectiveError(null);
  };

  // Modal component for displaying objective data
  const ObjectiveDataModal: React.FC = () => {
    if (!selectedUser) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Objective Data - {selectedUser.first_name} {selectedUser.last_name}
              </h2>
              <p className="text-sm text-gray-600">Patient ID: {selectedUser.id}</p>
            </div>
            <button
              onClick={handleCloseObjectiveModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {objectiveLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : objectiveError ? (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{objectiveError}</p>
                </div>
              </div>
            </div>
          ) : objectiveData.length > 0 ? (
            <div className="space-y-6">
              {objectiveData.map((objective, index) => (
                <div key={objective.id || index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-blue-600">
                        Record ID: {objective.id}
                      </h3>
                      {/* <p className="text-sm text-gray-500">
                        Session {objective.session_id}  | Summary ID: {objective.summary_id}
                      </p> */}
                    </div>
                  </div>
                  
                  {/* Vital Signs */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Vital Signs</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded shadow-sm">
                        <p className="text-sm text-gray-500">Blood Pressure</p>
                        <p className="font-semibold text-lg">{objective.blood_pressure_systolic}/{objective.blood_pressure_diastolic} mmHg</p>
                      </div>
                      <div className="bg-white p-3 rounded shadow-sm">
                        <p className="text-sm text-gray-500">Heart Rate</p>
                        <p className="font-semibold text-lg">{objective.heart_rate} bpm</p>
                      </div>
                      <div className="bg-white p-3 rounded shadow-sm">
                        <p className="text-sm text-gray-500">Respiratory Rate</p>
                        <p className="font-semibold text-lg">{objective.respiratory_rate} /min</p>
                      </div>
                      <div className="bg-white p-3 rounded shadow-sm">
                        <p className="text-sm text-gray-500">Temperature</p>
                        <p className="font-semibold text-lg">{objective.temperature_f} °F</p>
                      </div>
                      <div className="bg-white p-3 rounded shadow-sm">
                        <p className="text-sm text-gray-500">O₂ Saturation</p>
                        <p className="font-semibold text-lg">{objective.oxygen_saturation}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Physical Examination */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">General Appearance</h4>
                      <p className="text-gray-800 bg-white p-3 rounded border border-gray-300">{objective.general_appearance}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">HEENT (Head, Eyes, Ears, Nose, Throat)</h4>
                      <p className="text-gray-800 bg-white p-3 rounded border border-gray-300">{objective.heent}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Neurological</h4>
                      <p className="text-gray-800 bg-white p-3 rounded border border-gray-300">{objective.neurological}</p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                    <p>Patient ID: {objective.patient_id} | Session ID: {objective.session_id} | Summary ID: {objective.summary_id}</p>
                    {objective.doctor_name && (
                      <p className="mt-1">Doctor: {objective.doctor_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No objective data available for this patient.</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleCloseObjectiveModal}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-12">
      <div className="flex flex-col space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 auto-margin mx-auto">Patient Details</h1>

        {/* Search Input */}
        <div className="relative mx-auto w-[750px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            type="text"
            className="w-[750px] block h-[60px] pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search patients"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Selected Count */}
        {selectedPatientIds.length > 0 && (
          <div className="text-center text-sm text-gray-600">
            {selectedPatientIds.length} patient{selectedPatientIds.length !== 1 ? 's' : ''} selected
          </div>
        )}

        {/* Loading and Error States */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
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

        {/* User Cards Grid */}
        {!loading && !error && hasSearched && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.length > 0 ? (
              users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onShowObjective={() => handleShowObjective(user.id, user)}
                  isSelected={selectedPatientIds.includes(user.id)}
                  onSelect={handlePatientSelect}
                  onCardClick={handleCardClick}
                  onAddNew={() => handleAddNew(user)} // Changed from onUpdate to onAddNew
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">
                  No patients found matching your search
                </p>
              </div>
            )}
          </div>
        )}

        {/* Initial empty state */}
        {!loading && !error && !hasSearched && (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">
              <Image 
                src="/File searching.gif" 
                alt="I Search" 
                width={240} 
                height={240} 
                className="imagfilter m-auto"
              />
              Enter a search query to find patients 
            </p>
          </div>
        )}

        {/* Objective Data View Modal */}
        {showObjectiveModal && <ObjectiveDataModal />}

        {/* Objective Add Modal */}
        {selectedObjective && (
          <ObjectiveUpdateModal
            isOpen={isObjectiveModalOpen}
            onClose={handleCloseObjectiveEditModal}
            objective={selectedObjective}
            onSave={handleSaveObjective}
            isSaving={savingObjective}
            error={saveObjectiveError}
          />
        )}

      </div>
    </div>
  );
};

export default VitalsObjectiveForm;