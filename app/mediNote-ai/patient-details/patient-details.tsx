import React, { useState, useEffect, useCallback } from "react";
import { patient, PatientCreationTypes } from "../types";
import UserCard from "../components/UserCard";
import { APIService } from "../service/api";
import { UpdateUserModal } from "../components/UpdateUserModal";
import { PatientVoiceEnroll } from "../components/PatientVoiceEnroll";
import PatientHistory from "../doctor-patient-voice/PatientHistory";
import Image from 'next/image';

interface ApiResponse {
  results: patient[];
}

const SearchPatient: React.FC = () => {
  const [users, setUsers] = useState<patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<patient | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);

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

  const handleUpdate = (userData: patient) => {
    if (userData) {
      setSelectedUser(userData);
      setIsModalOpen(true);
    }
  };

  const handleEnrollVoice = (data: patient) => {
    setIsVoiceModalOpen(true);
    setSelectedUser(data)
  };

  // Add this function to handle showing history
  const handleShowHistory = (userId: number) => {
    console.log('Show history for user ID:', userId);
    setSelectedPatientIds([userId]);
    setShowHistoryModal(true);
  };

  const handlePatientSelect = (patientId: number) => {
    setSelectedPatientIds((prev) =>
      prev.includes(patientId)
        ? prev.filter((id) => id !== patientId)
        : [...prev, patientId]
    );
  };

  const handleCardClick = (patientId: number) => {
    console.log('Card clicked for patient ID:', patientId);
    // Toggle selection and show modal
    setSelectedPatientIds((prev) => {
      const newSelection = prev.includes(patientId)
        ? prev.filter((id) => id !== patientId)
        : [patientId]; // Only select one patient at a time
      
      // Show modal if patient is selected
      if (newSelection.length > 0) {
        setShowHistoryModal(true);
      } else {
        setShowHistoryModal(false);
      }
      
      return newSelection;
    });
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedPatientIds([]);
  };

  const handleSave = async (updatedData: PatientCreationTypes) => {
    if (!selectedUser) return;
    try {
      const response = await APIService.updatePatient(updatedData, selectedUser.id);
      if (!response) {
        // alert("Failed to update patient");
      } else {
        await fetchUsers();
        setSelectedUser(null);
        setIsModalOpen(false);
        // alert("Patient updated successfully!");
      }
    } catch (error) {
      console.error("Update failed:", error);
      setError(error instanceof Error ? error.message : "Update failed");
    }
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
            className="w-[750px] block h-[60px] w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  onUpdate={() => handleUpdate(user)}
                  onEnrollVoice={handleEnrollVoice}
                  onShowHistory={handleShowHistory} // Add this line
                  isSelected={selectedPatientIds.includes(user.id)}
                  onSelect={handlePatientSelect}
                  onCardClick={handleCardClick}
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

        {/* Update User Modal */}
        {selectedUser && (
          <UpdateUserModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            user={{
              first_name: selectedUser.first_name,
              last_name: selectedUser.last_name,
              email: selectedUser.email,
              phone: selectedUser.phone,
              ssn_last4: selectedUser.ssn_last4,
              address: selectedUser.address,
            }}
            onSave={handleSave}
          />
        )}

        {isVoiceModalOpen && (
          <PatientVoiceEnroll
            isOpen={isVoiceModalOpen}
            onClose={() => setIsVoiceModalOpen(false)}
            id={selectedUser?.id || 0}
          />
        )}

        {/* Patient History Modal - Similar to CheckPatientVoice */}
        {selectedPatientIds.length > 0 && showHistoryModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
            <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto relative">
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                onClick={handleCloseHistoryModal}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.89705 4.05379L3.96967 3.96967C4.23594 3.7034 4.6526 3.6792 4.94621 3.89705L5.03033 3.96967L10 8.939L14.9697 3.96967C15.2359 3.7034 15.6526 3.6792 15.9462 3.89705L16.0303 3.96967C16.2966 4.23594 16.3208 4.6526 16.1029 4.94621L16.0303 5.03033L11.061 10L16.0303 14.9697C16.2966 15.2359 16.3208 15.6526 16.1029 15.9462L16.0303 16.0303C15.7641 16.2966 15.3474 16.3208 15.0538 16.1029L14.9697 16.0303L10 11.061L5.03033 16.0303C4.76406 16.2966 4.3474 16.3208 4.05379 16.1029L3.96967 16.0303C3.7034 15.7641 3.6792 15.3474 3.89705 15.0538L3.96967 14.9697L8.939 10L3.96967 5.03033C3.7034 4.76406 3.6792 4.3474 3.89705 4.05379L3.96967 3.96967L3.89705 4.05379Z" fill="currentColor"/>
                </svg>
              </button>
              <PatientHistory patientIds={selectedPatientIds} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPatient;