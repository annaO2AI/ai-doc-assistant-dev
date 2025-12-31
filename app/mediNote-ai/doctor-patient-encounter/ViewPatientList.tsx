import React, { useState } from "react";

interface PatientCardProps {
  patient_id: number;
  name: string;
  voice_file: string;
  exists: boolean;
}

interface ViewPatientListProps {
  patients: PatientCardProps[];
  handleStartCon: (id: number) => void;
  selectedPatientIds: number[]; // Added prop
  onPatientSelect: (patientId: number) => void; // Added prop
}

const ViewPatientList = ({
  patients,
  handleStartCon,
  selectedPatientIds,
  onPatientSelect,
}: ViewPatientListProps) => {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  return (
    <div className="patient-list space-y-4">
      {patients.map((patient) => {
        const handlePlayAudio = () => {
          const audio = new Audio(patient.voice_file);
          audio.play().catch((error) => console.error("Error playing audio:", error));
        };

        const initials = patient.name
          .split(" ")
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase())
          .slice(0, 2)
          .join("");

        return (
          <div
            key={patient.patient_id}
            className="rounded-lg shadow-sm bg-white cursor-pointer handleSelectPatent relative"
            onClick={() => handleStartCon(patient.patient_id)}
          >
            <div className="px-4 py-2">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-center">
                    {/* Three dot menu */}
                    

                    <div className="flex items-center justify-center min-w-10 w-10 h-10 rounded-full bg-indigo-600 text-white text-sm font-semibold docterAvatar">
                      {initials}
                    </div>
                    <div className="text-gray-800 mb-2">
                      <div className="font-bold text-lg">{patient.name}</div>
                      <div className="text-[14px] osubtitle font-normal">
                        <span className="ot-title font-bold">Patient ID: </span>
                        <span className="osubtitle">{patient.patient_id}</span>
                      </div>
                    </div>
                    
                  </div>
                  <div className="flex gap-2 items-center">
                    {patient.exists ? (
                      <span className="status patent-active"></span>
                    ) : (
                      <span className="status patent-inactive"></span>
                    )}
                    <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(
                              openMenuId === patient.patient_id ? null : patient.patient_id
                            );
                          }}
                          className="p-1 rounded hover:bg-[#192B69]"
                          aria-label="Patient actions"
                        >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="5" r="2" fill="currentColor" />
                          <circle cx="12" cy="12" r="2" fill="currentColor" />
                          <circle cx="12" cy="19" r="2" fill="currentColor" />
                        </svg>

                        </button>

                        {openMenuId === patient.patient_id && (
                          <div
                            className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-md z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className=" text-[#34334B] w-full px-3 py-2 text-left text-sm hover:bg-gray-300"
                              onClick={() => {
                                onPatientSelect(patient.patient_id);
                                setOpenMenuId(null);
                              }}
                            >
                              View History
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ViewPatientList;
