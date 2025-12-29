import React, { useState, useEffect, useCallback } from "react";
import { patient, PatientCreationTypes, ObjectiveData } from "../types";
import { APIService } from "../service/api";
import { UpdateUserModal } from "../components/UpdateUserModal";
import Image from 'next/image';
import ObjectiveUpdateModal from "./ObjectiveUpdateModal";

interface ApiResponse {
  results: patient[];
}

interface PatientWithFullName extends patient {
  full_name: string;
}

const VitalsObjectiveForm: React.FC = () => {
  const [patients, setPatients] = useState<PatientWithFullName[]>([]);
  const [allPatients, setAllPatients] = useState<PatientWithFullName[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingAllPatients, setLoadingAllPatients] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithFullName | null>(null);
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
  const [showPatientDetails, setShowPatientDetails] = useState<boolean>(false);
  
  // Objective data states
  const [objectiveData, setObjectiveData] = useState<ObjectiveData[]>([]);
  const [objectiveLoading, setObjectiveLoading] = useState(false);
  const [savingObjective, setSavingObjective] = useState(false);
  const [objectiveError, setObjectiveError] = useState<string | null>(null);
  const [saveObjectiveError, setSaveObjectiveError] = useState<string | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveData | null>(null);
  
  // Single modal state to manage which modal is open
  const [openModal, setOpenModal] = useState<'edit' | 'objective-view' | 'objective-edit' | null>(null);

  // Fetch all patients on initial load
  const fetchAllPatients = useCallback(async (): Promise<void> => {
    setLoadingAllPatients(true);
    try {
      const data: ApiResponse = await APIService.SearchPatient("");
      
      if (data && data.results) {
        const patientsWithFullName: PatientWithFullName[] = data.results.map((patient: patient) => ({
          ...patient,
          full_name: `${patient.first_name} ${patient.last_name}`,
        }));
        setAllPatients(patientsWithFullName);
        setPatients(patientsWithFullName);
      }
    } catch (err) {
      console.error("Fetch all patients error:", err);
      setError(err instanceof Error ? `Failed to fetch patients: ${err.message}` : "Failed to fetch patients");
    } finally {
      setLoadingAllPatients(false);
    }
  }, []);

  // Initial fetch on component mount
  useEffect(() => {
    fetchAllPatients();
  }, [fetchAllPatients]);

  // Memoized search function
  const searchPatients = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setPatients(allPatients);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: ApiResponse = await APIService.SearchPatient(query);
      
      if (!data || !data.results) {
        setPatients([]);
        return;
      }
      
      const patientsWithFullName: PatientWithFullName[] = data.results.map((patient: patient) => ({
        ...patient,
        full_name: `${patient.first_name} ${patient.last_name}`,
      }));
      
      setPatients(patientsWithFullName);
    } catch (err) {
      console.error("Search patients error:", err);
      setError(err instanceof Error ? `Failed to search patients: ${err.message}` : "Failed to search patients");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [allPatients]);

  // Debounce search input
  useEffect(() => {
    const timerId = setTimeout(() => {
      searchPatients(searchQuery);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery, searchPatients]);

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
    if (!selectedPatient) return;
    
    try {
      setSavingObjective(true);
      setSaveObjectiveError(null);
      
      const payload = {
        patient_id: selectedPatient.id,
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
      if (selectedPatient.id) {
        await fetchObjectiveData(selectedPatient.id);
      }
      
      setOpenModal(null);
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

  const handleUpdate = (patientData: PatientWithFullName): void => {
    setSelectedPatient(patientData);
    setOpenModal('edit');
  };

  const handleShowObjective = async (patientData: PatientWithFullName) => {
    setSelectedPatient(patientData);
    setSelectedPatientIds([patientData.id]);
    
    // Fetch objective data
    await fetchObjectiveData(patientData.id);
    
    // Show objective modal
    setOpenModal('objective-view');
  };

  const handleSelectPatient = (patient: PatientWithFullName): void => {
    setSelectedPatient(patient);
    setSelectedPatientIds([patient.id]);
    setShowPatientDetails(true);
    setOpenModal(null);
  };

  const handleBackToList = (): void => {
    setShowPatientDetails(false);
    setSelectedPatient(null);
    setSelectedPatientIds([]);
    setOpenModal(null);
    setObjectiveData([]);
    setObjectiveError(null);
  };

  const handleCloseModal = (): void => {
    setOpenModal(null);
    setSelectedObjective(null);
  };

  const handleCardClick = (patientId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      handleSelectPatient(patient);
    }
  };

  const handleAddNewObjective = () => {
    if (selectedPatient) {
      setSelectedObjective({
        patient_id: selectedPatient.id,
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
      setOpenModal('objective-edit');
    }
  };

  const handleSave = async (updatedData: PatientCreationTypes): Promise<void> => {
    if (!selectedPatient) return;
    
    try {
      const response = await APIService.updatePatient(
        updatedData,
        selectedPatient.id
      );
      
      if (response) {
        await fetchAllPatients();
        await searchPatients(searchQuery);
        if (showPatientDetails && selectedPatient) {
          const updatedPatient = patients.find(p => p.id === selectedPatient.id);
          if (updatedPatient) {
            setSelectedPatient(updatedPatient);
          }
        }
      }
      
      setOpenModal(null);
    } catch (error) {
      console.error("Update failed:", error);
      setError(error instanceof Error ? error.message : "Update failed");
    }
  };

  // Format date of birth
  const formatDateOfBirth = (dob?: string) => {
    if (!dob) return "Not specified";
    try {
      return new Date(dob).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dob;
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch {
      return null;
    }
  };

  // Patient Details View
  const renderPatientDetails = () => {
    if (!selectedPatient) return null;

    const age = calculateAge(selectedPatient.date_of_birth);

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </button>
          <div className="flex space-x-4">
           <button
              onClick={handleAddNewObjective}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Add New Objective Data
            </button>
            <button
              onClick={() => handleShowObjective(selectedPatient)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              View Objective Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800 text-2xl font-semibold">
                {selectedPatient.full_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPatient.full_name}
                </h2>
                <p className="text-gray-600">Patient ID: {selectedPatient.id}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-lg text-gray-900">{selectedPatient.email || "Not specified"}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-lg text-gray-900">{formatDateOfBirth(selectedPatient.date_of_birth)}</p>
                  {age && (
                    <span className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                      {age} years old
                    </span>
                  )}
                </div>
              </div>

              {selectedPatient.ssn_last4 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">SSN </label>
                  <p className="mt-1 text-lg text-gray-900">{selectedPatient.ssn_last4}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {selectedPatient.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone Number</label>
                <p className="mt-1 text-lg text-gray-900">{selectedPatient.phone}</p>
              </div>
            )}
            
            {selectedPatient.address && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Address</label>
                <p className="mt-1 text-lg text-gray-900">{selectedPatient.address}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500">Objective Data Status</label>
              <div className="mt-1">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {objectiveData.length} record{objectiveData.length !== 1 ? 's' : ''} available
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Patient List View
  const renderPatientList = () => (
    <>
      {/* Search Input */}
      <div className="relative m-auto w-full max-w-[500px]">
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
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Search patients by name, email, or phone"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchQuery(e.target.value);
          }}
        />
      </div>

      {/* Loading State for initial fetch */}
      {loadingAllPatients && (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-[#ffffffb3]">Loading patients...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && !loadingAllPatients && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex items-center">
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

      {/* Search Results / All Patients List */}
      {!loadingAllPatients && !error && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-[#fff]">
              {searchQuery.trim() ? "Search Results" : "All Patients"}
            </h2>
            {patients.length > 0 && (
              <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                {patients.length} patient{patients.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {patients.length > 0 ? (
            <div className="space-y-4">
              {patients.map((patient: PatientWithFullName) => (
                <div
                  key={patient.id}
                  className="rounded-lg shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow duration-200"
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-800 text-lg font-semibold">
                          {patient.full_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {patient.full_name}
                          </h3>
                          <p className="text-sm text-gray-500">{patient.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-600">ID: {patient.id}</span>
                            {calculateAge(patient.date_of_birth) && (
                              <span className="text-sm px-2 py-1 bg-gray-100 text-gray-800 rounded">
                                {calculateAge(patient.date_of_birth)} years
                              </span>
                            )}
                            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              View Objective Data
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !searchQuery.trim() ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <Image
                    src="/File searching.gif"
                    alt="Search for patients"
                    width={200}
                    height={200}
                    className="mx-auto"
                    priority
                  />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">
                  No Patients Found
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  There are no patients in the system. Add a patient to get started.
                </p>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No patients found
                </h3>
                <p className="text-gray-500">
                  No patients match your search criteria. Try different keywords.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </>
  );

  // Objective Data Modal
  const ObjectiveDataModal: React.FC = () => {
    if (!selectedPatient) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 bg-white rounded-full p-1"
            onClick={handleCloseModal}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.89705 4.05379L3.96967 3.96967C4.23594 3.7034 4.6526 3.6792 4.94621 3.89705L5.03033 3.96967L10 8.939L14.9697 3.96967C15.2359 3.7034 15.6526 3.6792 15.9462 3.89705L16.0303 3.96967C16.2966 4.23594 16.3208 4.6526 16.1029 4.94621L16.0303 5.03033L11.061 10L16.0303 14.9697C16.2966 15.2359 16.3208 15.6526 16.1029 15.9462L16.0303 16.0303C15.7641 16.2966 15.3474 16.3208 15.0538 16.1029L14.9697 16.0303L10 11.061L5.03033 16.0303C4.76406 16.2966 4.3474 16.3208 4.05379 16.1029L3.96967 16.0303C3.7034 15.7641 3.6792 15.3474 3.89705 15.0538L3.96967 14.9697L8.939 10L3.96967 5.03033C3.7034 4.76406 3.6792 4.3474 3.89705 4.05379L3.96967 3.96967L3.89705 4.05379Z" fill="currentColor"/>
            </svg>
          </button>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Objective Data - {selectedPatient.full_name}
            </h2>
            <p className="text-sm text-gray-600">Patient ID: {selectedPatient.id}</p>
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
                    </div>
                    {/* <button
                      onClick={() => {
                        setSelectedObjective(objective);
                        setOpenModal('objective-edit');
                      }}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Edit
                    </button> */}
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
              <button
                onClick={handleAddNewObjective}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add New Objective Data
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-auto mt-12 ">
      <div className="flex flex-col w-[83%] mx-auto transcription-welcommassege-main p-10 rounded-lg relative autopharmacySearch-min">
        <div className="relative z-[2]">
        <h1 className="text-2xl font-bold text-[#fff] text-center mb-3">
          Patient Objective Data
        </h1>

        {showPatientDetails && selectedPatient ? renderPatientDetails() : renderPatientList()}

        {/* Update Patient Modal */}
        {selectedPatient && openModal === 'edit' && (
          <UpdateUserModal
            isOpen={true}
            onClose={handleCloseModal}
            user={{
              first_name: selectedPatient.first_name || "",
              last_name: selectedPatient.last_name || "",
              email: selectedPatient.email,
              phone: selectedPatient.phone || "",
              ssn_last4: selectedPatient.ssn_last4 || "",
              address: selectedPatient.address || "",
            }}
            onSave={handleSave}
          />
        )}

        {/* Objective Data View Modal */}
        {selectedPatient && openModal === 'objective-view' && (
          <ObjectiveDataModal />
        )}

        {/* Objective Add/Edit Modal */}
        {selectedObjective && openModal === 'objective-edit' && (
          <ObjectiveUpdateModal
            isOpen={true}
            onClose={handleCloseModal}
            objective={selectedObjective}
            onSave={handleSaveObjective}
            isSaving={savingObjective}
            error={saveObjectiveError}
          />
        )}
        </div>

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
  );
};

export default VitalsObjectiveForm;