import React from "react";
import { EpicPractitioner } from "../types";

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  specialization?: string;
}

interface DoctorProfileProps {
  doctor: EpicPractitioner | null;
  onEditClick: () => void;
}

export const DoctorProfile: React.FC<DoctorProfileProps> = ({ 
  doctor, 
  onEditClick 
}) => {
  if (!doctor) {
    return (
      <button
        className="flex gap-2 text-white items-center absolute top-6 right-6 w-[150px] z-40"
        onClick={onEditClick}
      >
        <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.8889 13.7143L18.9175 13.7147C19.5179 13.7303 20 14.2358 20 14.8572C20 15.4785 19.5179 15.984 18.9175 15.9996L18.8889 16H1.1111C0.497451 16 2.74887e-07 15.4883 0 14.8572C0 14.226 0.497451 13.7143 1.1111 13.7143H18.8889ZM18.8889 6.85715L18.9175 6.85752C19.5179 6.87316 20 7.37868 20 8C20 8.62132 19.5179 9.12684 18.9175 9.14248L18.8889 9.14285H1.1111C0.497451 9.14285 1.37443e-07 8.63118 0 8C0 7.36882 0.497451 6.85715 1.1111 6.85715H18.8889ZM18.8889 0L18.9175 0.000368304C19.5179 0.0160088 20 0.521523 20 1.14285C20 1.76417 19.5179 2.26969 18.9175 2.28533L18.8889 2.2857H1.1111C0.497451 2.2857 0 1.77403 0 1.14285C0 0.511664 0.497451 0 1.1111 0H18.8889Z" fill="white" />
        </svg>
        Search Doctor
      </button>
    );
  }

  return (
    <div
      className="flex gap-2 text-white items-center absolute top-6 right-6 w-[160px] z-10 cursor-pointer"
      onClick={onEditClick}
    >
      <span className="avatar flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-semibold">
        {doctor.full_name?.charAt(0).toUpperCase() || 'D'}
      </span>
      <span className="font-semibold text-white flex flex-col leading-[1]">
        <span className="text-white text-[16px]">
          {doctor.full_name || ``}
        </span>
        <span className="text-white text-[14px] font-normal">Doctor</span>
        {/* <span className="text-white text-[14px] font-normal">{doctor.id || ''}</span> */}
      </span>
      <span>
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.86603 7.5C5.48112 8.16667 4.51887 8.16667 4.13397 7.5L0.669873 1.5C0.284972 0.833333 0.766098 5.89981e-08 1.5359 1.26296e-07L8.4641 7.31979e-07C9.2339 7.99277e-07 9.71503 0.833334 9.33013 1.5L5.86603 7.5Z" fill="white"/>
        </svg>
      </span>
    </div>
  );
};