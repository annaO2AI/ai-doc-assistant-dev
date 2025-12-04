import React from "react";
import { patient } from "../types";

interface UserCardProps {
  user: patient;
  onAddNew: () => void; // Changed from onUpdate to onAddNew
  onShowObjective: () => void;
  isSelected: boolean;
  onSelect: (patientId: number) => void;
  onCardClick: (patientId: number) => void;
}

const UserCard: React.FC<UserCardProps> = (props) => {
  const {
    user,
    onAddNew, // Changed from onUpdate
    onShowObjective,
    isSelected,
    onSelect,
    onCardClick
  } = props;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect(user.id);
  };

  const handleCardClick = () => {
    onCardClick(user.id);
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300 cursor-pointer border-2 ${
        isSelected ? "border-blue-500 border-2" : "border-transparent"
      }`}
      onClick={handleCardClick}
    >
      {/* Patient Name and Basic Info */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-1">
          {user.first_name} {user.last_name}
        </h3>
        <p className="text-gray-600 text-sm mb-1">SSN: ••••{user.ssn_last4}</p>
        <p className="text-gray-500 text-sm">
          {user.date_of_birth 
            ? new Date(user.date_of_birth).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'DOB not specified'}
        </p>
      </div>
      <div className="text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded mb-4">
        ID: {user.id}
      </div>

      {/* Contact Information */}
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
          <span className="text-gray-700 text-sm truncate">{user.email}</span>
        </div>
        
        {user.phone && (
          <div className="flex items-center mb-2">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span className="text-gray-700 text-sm">{user.phone}</span>
          </div>
        )}
        
        {user.address && (
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700 text-sm truncate">{user.address}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* View Objective Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowObjective();
          }}
          className="flex-1 min-w-[120px] px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all duration-200 flex items-center justify-center"
          title="View Objective Data (Vital Signs & Physical Exam)"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          View Objective
        </button>

        {/* Add New Button (replaces Update) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddNew();
          }}
          className="flex-1 min-w-[100px] px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-md hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-300 transition-all duration-200 flex items-center justify-center"
          title="Add New Objective Data"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Update
        </button>
      </div>
    </div>
  );
};

export default UserCard;