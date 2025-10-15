import React from "react";

interface PatientCardProps {
  patient_id: number;
  name: string;
  voice_file: string;
  exists: boolean;
}

interface ViewPatientListProps {
  patients: PatientCardProps[];
  handleStartCon: (id: number) => void;
}

const ViewPatientList = ({ patients, handleStartCon }: ViewPatientListProps) => {
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
            className="rounded-lg shadow-sm bg-white cursor-pointer handleSelectPatent"
            onClick={() => handleStartCon(patient.patient_id)}
          >
            <div className="px-4 py-2">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white text-sm font-semibold">
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
                   {patient.exists ? (
                      <span className="status patent-active"></span>
                      ) : (
                      <span className="status patent-inactive"></span>
                   )}
                </div>
                {/* <div className="text-gray-600 text-sm py-1">
                  <span className="ot-title font-bold">Patient ID: </span>
                  <span className="osubtitle">{patient.patient_id}</span>
                </div>
                <div className="text-gray-600 text-sm py-1">
                  <span className="ot-title font-bold">Patient Voice Exists: </span>
                  <span className="osubtitle">{patient.exists ? "Exists" : "Not exists"}</span>
                </div> */}
              </div>
              {/*<div className="flex justify-between items-center">
                 <span
                  className={`inline-block px-0 py-1 text-md font-semibold ${
                    patient.exists ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {patient.exists ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => handleStartCon(patient.patient_id)}
                  className="text-white bg-blue-500 inline-block rounded-full px-4 py-2 text-sm font-normal mt-2"
                >
                  Start Session
                </button> 
              </div>*/}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ViewPatientList;