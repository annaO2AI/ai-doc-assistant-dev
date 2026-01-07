import React, { useState, useEffect, useCallback } from "react";
import { APIService } from "@/app/mediNote-ai/service/api";
import Image from 'next/image';
import { ActivationResponse, User, UserResponse, UserUpdateData } from "@/app/mediNote-ai/types";

// Toast Notification Component
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type];

  const textColor = {
    success: 'text-green-100',
    error: 'text-red-100',
    info: 'text-blue-100'
  }[type];

  const icon = {
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  }[type];

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md w-full ${bgColor} ${textColor} rounded-lg shadow-lg p-4 transition-all duration-300 transform translate-y-0 opacity-100`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={onClose}
              className="inline-flex rounded-md p-1.5 hover:bg-opacity-30 hover:bg-white focus:outline-none"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Role badge styling
const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-[#0975BB] text-white shadow-md';
    case 'CLINIC_ADMIN':
      return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md';
    case 'DOCTOR':
      return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md';
    default:
      return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-md';
  }
};

// Status badge styling
const getStatusBadgeStyle = (isActive: boolean) => {
  return isActive 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchId, setSearchId] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [totalUsers, setTotalUsers] = useState<number>(0);
  
  // Modal states
  const [openModal, setOpenModal] = useState<'edit' | 'view' | null>(null);
  const [editingUser, setEditingUser] = useState<UserUpdateData | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // Hide toast notification
  const hideToast = () => {
    setToast(null);
  };

  // Fetch all users
  const fetchAllUsers = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data: UserResponse = await APIService.getUsers();
      
      if (data && data.users) {
        setAllUsers(data.users);
        setUsers(data.users);
        setTotalUsers(data.total);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      setError(err instanceof Error ? `Failed to fetch users: ${err.message}` : "Failed to fetch users");
      showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single user details
  const fetchUserDetails = useCallback(async (userId: number): Promise<void> => {
    try {
      const data: User = await APIService.getUserById(userId);
      setSelectedUser(data);
      setOpenModal('view');
    } catch (err) {
      console.error("Fetch user details error:", err);
      setError(err instanceof Error ? `Failed to fetch user details: ${err.message}` : "Failed to fetch user details");
      showToast('Failed to fetch user details', 'error');
    }
  }, []);

  // Initial fetch on component mount
  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Client-side filtering
  useEffect(() => {
    const queryLower = searchQuery.trim().toLowerCase();
    
    const filtered = allUsers.filter((user) => {
      const matchesQuery = searchQuery.trim()
        ? user.name.toLowerCase().includes(queryLower) ||
          user.email.toLowerCase().includes(queryLower) ||
          user.role.toLowerCase().includes(queryLower) ||
          (user.clinic_id && user.clinic_id.toLowerCase().includes(queryLower))
        : true;

      const matchesId = searchId.trim()
        ? user.id.toString().includes(searchId)
        : true;

      return matchesQuery && matchesId;
    });

    setUsers(filtered);
  }, [searchQuery, searchId, allUsers]);

  // Handle user selection
  const handleSelectUser = (user: User): void => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  // Handle edit user
  const handleEditUser = (user: User): void => {
    setSelectedUser(user);
    setEditingUser({
      email: user.email,
      name: user.name,
      role: user.role,
      clinic_id: user.clinic_id,
      doctor_id: user.doctor_id,
      is_active: user.is_active,
      azure_oid: user.azure_oid
    });
    setOpenModal('edit');
  };

  // Handle view user details
  const handleViewUser = (user: User): void => {
    fetchUserDetails(user.id);
  };

  // Handle back to list
  const handleBackToList = (): void => {
    setShowUserDetails(false);
    setSelectedUser(null);
    setOpenModal(null);
  };

  // Handle close modal
  const handleCloseModal = (): void => {
    setOpenModal(null);
    setEditingUser(null);
    setSaveError(null);
  };

  // Handle save user
  const handleSaveUser = async (): Promise<void> => {
    if (!selectedUser || !editingUser) return;
    
    try {
      setSaving(true);
      setSaveError(null);
      
      const response = await APIService.updateUser(selectedUser.id, editingUser);
      
      if (response) {
        // Refresh the user list
        await fetchAllUsers();
        
        // Update the selected user if it's the same
        if (selectedUser.id === response.id) {
          setSelectedUser(response);
        }
        
        setOpenModal(null);
        setEditingUser(null);
        showToast('User updated successfully', 'success');
      }
    } catch (err) {
      console.error("Update failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Update failed";
      setSaveError(errorMessage);
      showToast(`Failed to update user: ${errorMessage}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle clear filters
  const handleClearFilters = (): void => {
    setSearchQuery("");
    setSearchId("");
  };

  // Handle activate user
  const handleActivateUser = async (userId: number): Promise<void> => {
    try {
      setStatusUpdating(userId);
      const response: ActivationResponse = await APIService.activateUser(userId);
      
      if (response) {
        // Show success message
        showToast(response.message, 'success');
        
        // Refresh the user list
        await fetchAllUsers();
        
        // Update the selected user if it's the same
        if (selectedUser && selectedUser.id === userId) {
          const updatedUser = await APIService.getUserById(userId);
          setSelectedUser(updatedUser);
        }
      }
    } catch (err) {
      console.error("Activation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to activate user";
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setStatusUpdating(null);
    }
  };

  // Handle deactivate user
  const handleDeactivateUser = async (userId: number): Promise<void> => {
    try {
      setStatusUpdating(userId);
      const response: ActivationResponse = await APIService.deactivateUser(userId);
      
      if (response) {
        // Show success message
        showToast(response.message, 'success');
        
        // Refresh the user list
        await fetchAllUsers();
        
        // Update the selected user if it's the same
        if (selectedUser && selectedUser.id === userId) {
          const updatedUser = await APIService.getUserById(userId);
          setSelectedUser(updatedUser);
        }
      }
    } catch (err) {
      console.error("Deactivation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to deactivate user";
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setStatusUpdating(null);
    }
  };

  // Handle toggle user status
  const handleToggleStatus = async (user: User): Promise<void> => {
    if (user.is_active) {
      await handleDeactivateUser(user.id);
    } else {
      await handleActivateUser(user.id);
    }
  };

  // User Details View
  const renderUserDetails = () => {
    if (!selectedUser) return null;

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-[#0975bb] hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </button>
          <div className="flex space-x-4">
            <button
              onClick={() => handleEditUser(selectedUser)}
              className="px-4 py-2 bg-[#0975bb] text-white rounded-md hover:bg-blue-700"
            >
              Edit User
            </button>
            <button
              onClick={() => handleToggleStatus(selectedUser)}
              disabled={statusUpdating === selectedUser.id}
              className={`px-4 py-2 rounded-md ${
                selectedUser.is_active
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {statusUpdating === selectedUser.id ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {selectedUser.is_active ? 'Deactivating...' : 'Activating...'}
                </span>
              ) : (
                selectedUser.is_active ? 'Deactivate' : 'Activate'
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800 text-2xl font-semibold">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedUser.name}
                </h2>
                <p className="text-gray-600">User ID: {selectedUser.id}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-lg text-gray-900">{selectedUser.email}</p>
              </div>
              
              <div className="flex space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Role</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${getRoleBadgeStyle(selectedUser.role)}`}>
                    {selectedUser.role.replace('_', ' ')}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${getStatusBadgeStyle(selectedUser.is_active)}`}>
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {selectedUser.clinic_id && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Clinic ID</label>
                <p className="mt-1 text-lg text-gray-900">{selectedUser.clinic_id}</p>
              </div>
            )}
            
            {selectedUser.doctor_id && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Doctor ID</label>
                <p className="mt-1 text-lg text-gray-900">{selectedUser.doctor_id}</p>
              </div>
            )}

            {selectedUser.azure_oid && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Azure Object ID</label>
                <p className="mt-1 text-lg text-gray-900 font-mono text-sm">
                  {selectedUser.azure_oid}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Card View
  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {users.map((user: User) => (
        <div
          key={user.id}
          className="rounded-lg shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow duration-200"
          onClick={() => handleSelectUser(user)}
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-800 text-lg font-semibold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {user.name}
                  </h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeStyle(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeStyle(user.is_active)}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                      ID: {user.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Table View
  const renderTableView = () => (
    <div className="overflow-x-auto rounded-[10px]">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user: User) => (
            <tr
              key={user.id}
              className="hover:bg-gray-50"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-semibold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyle(user.role)}`}>
                  {user.role.replace('_', ' ')}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(user.is_active)}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectUser(user);
                    }}
                    className="text-[#0975bb] hover:text-blue-900"
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditUser(user);
                    }}
                    className="text-green-600 hover:text-green-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(user);
                    }}
                    disabled={statusUpdating === user.id}
                    className={`${user.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {statusUpdating === user.id ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {user.is_active ? 'Deactivating...' : 'Activating...'}
                      </span>
                    ) : (
                      user.is_active ? 'Deactivate' : 'Activate'
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Edit Modal
  const EditUserModal: React.FC = () => {
    if (!selectedUser || !editingUser) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
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
              Edit User - {selectedUser.name}
            </h2>
            <p className="text-sm text-gray-600">User ID: {selectedUser.id}</p>
          </div>

          {saveError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{saveError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="CLINIC_ADMIN">Clinic Admin</option>
                <option value="DOCTOR">Doctor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic ID</label>
              <input
                type="text"
                value={editingUser.clinic_id || ''}
                onChange={(e) => setEditingUser({ ...editingUser, clinic_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor ID</label>
              <input
                type="number"
                value={editingUser.doctor_id || ''}
                onChange={(e) => setEditingUser({ ...editingUser, doctor_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={editingUser.is_active}
                onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                className="h-4 w-4 text-[#0975bb] focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active User
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveUser}
              disabled={saving}
              className="px-4 py-2 bg-[#0975bb] text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // User List View
  const renderUserList = () => {
    const hasSearch = searchQuery.trim() || searchId.trim();

    return (
      <>
        {/* Filters & Actions Row */}
        <div className="flex justify-between mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[380px] max-w-[400px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search users by name, email, or role"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <input
              type="text"
              className="w-[90px] px-3 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search ID"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />

            <button
              onClick={handleClearFilters}
              className="px-2 py-2 text-[#fff] rounded-lg"
            >
              Clear Filter
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 justify-end">
            <div className="flex bg-[#0c9bcf] rounded-md p-1 justify-center items-center h-[48px]">
              <button
                onClick={() => setViewMode('card')}
                className={`px-4 py-2 mr-2 rounded-md h-[42px] ${viewMode === 'card' ? 'bg-[#0975bb] text-white' : 'text-gray-700'}`}
              >
                <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.20225 9.28961C6.64904 9.28961 7.01124 9.66393 7.01124 10.1257V16.1639C7.01124 16.6257 6.64904 17 6.20225 17H0.808989C0.362197 17 3.0577e-07 16.6257 0 16.1639V10.1257L0.000263343 10.1041C0.0113442 9.65232 0.369182 9.28961 0.808989 9.28961H6.20225ZM15.191 9.28961C15.6378 9.28961 16 9.66393 16 10.1257V16.1639C16 16.6257 15.6378 17 15.191 17H9.79775C9.35096 17 8.98876 16.6257 8.98876 16.1639V10.1257C8.98876 9.66393 9.35096 9.28961 9.79775 9.28961H15.191ZM10.6067 15.3279H14.382V10.9617H10.6067V15.3279ZM1.61798 15.3279H5.39326V10.9617H1.61798V15.3279ZM6.20225 0C6.64904 1.14918e-07 7.01124 0.374319 7.01124 0.836066V6.87433C7.01124 7.33607 6.64904 7.71039 6.20225 7.71039H0.808989C0.3622 7.71039 4.86447e-06 7.33607 0 6.87433V0.836066L0.000263343 0.814484C0.0113398 0.362712 0.369179 0 0.808989 0H6.20225ZM15.191 0C15.6378 0 16 0.374319 16 0.836066V6.87433C16 7.33607 15.6378 7.71039 15.191 7.71039H9.79775C9.35096 7.71039 8.98876 7.33606 8.98876 6.87433V0.836066C8.98876 0.374322 9.35096 4.71129e-06 9.79775 0H15.191ZM10.6067 6.03826H14.382V1.67213H10.6067V6.03826ZM1.61798 6.03826H5.39326V1.67213H1.61798V6.03826Z" fill="white"/>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md h-[42px] ${viewMode === 'table' ? 'bg-[#0975bb] text-white' : 'text-gray-700'}`}
              >
                <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.81849 2.18194C5.81849 0.976889 4.8416 0 3.63656 0H2.18194C0.976889 0 0 0.976889 0 2.18194V3.63656C0 4.8416 0.976889 5.81849 2.18194 5.81849H3.63656C4.8416 5.81849 5.81849 4.8416 5.81849 3.63656V2.18194ZM4.36387 2.18194C4.36387 1.78026 4.03824 1.45462 3.63656 1.45462H2.18194C1.78026 1.45462 1.45462 1.78026 1.45462 2.18194V3.63656C1.45462 4.03824 1.78026 4.36387 2.18194 4.36387H3.63656C4.03824 4.36387 4.36387 4.03824 4.36387 3.63656V2.18194Z" fill="white"/>
                  <path d="M7.27344 2.90895C7.27344 2.50727 7.59906 2.18164 8.00075 2.18164H15.2739C15.6756 2.18164 16.0012 2.50727 16.0012 2.90895C16.0012 3.31063 15.6756 3.63626 15.2739 3.63626H8.00075C7.59906 3.63626 7.27344 3.31063 7.27344 2.90895Z" fill="white"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.81849 9.45537C5.81849 8.25029 4.8416 7.27344 3.63656 7.27344H2.18194C0.976889 7.27344 0 8.25029 0 9.45537V10.91C0 12.1151 0.976889 13.0919 2.18194 13.0919H3.63656C4.8416 13.0919 5.81849 12.1151 5.81849 10.91V9.45537ZM4.36387 9.45537C4.36387 9.05368 4.03824 8.72806 3.63656 8.72806H2.18194C1.78026 8.72806 1.45462 9.05368 1.45462 9.45537V10.91C1.45462 11.3117 1.78026 11.6373 2.18194 11.6373H3.63656C4.03824 11.6373 4.36387 11.3117 4.36387 10.91V9.45537Z" fill="white"/>
                  <path d="M7.27344 10.1824C7.27344 9.7807 7.59906 9.45508 8.00075 9.45508H15.2739C15.6756 9.45508 16.0012 9.7807 16.0012 10.1824C16.0012 10.5841 15.6756 10.9097 15.2739 10.9097H8.00075C7.59906 10.9097 7.27344 10.5841 7.27344 10.1824Z" fill="white"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-[#ffffffb3]">Loading users...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        {!loading && !error && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-[#fff]">
                {hasSearch ? "Search Results" : "All Users"}
              </h2>
              {users.length > 0 && (
                <div className="text-white">
                  <span className="font-semibold">{users.length}</span> of{" "}
                  <span className="font-semibold">{totalUsers}</span> users
                </div>
              )}
            </div>
            
            {users.length > 0 ? (
              viewMode === 'card' ? renderCardView() : renderTableView()
            ) : (
              !hasSearch ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="mb-4">
                    <Image
                      src="/File searching.gif"
                      alt="Search for users"
                      width={200}
                      height={200}
                      className="mx-auto"
                      priority
                    />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">
                    No Users Found
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    There are no users in the system.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No users found
                  </h3>
                  <p className="text-gray-500">
                    No users match your search criteria. Try different keywords.
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      <div className="mx-auto px-16 py-16 mt-1 transcription-welcommassege-main rounded-[20px] w-[88%]">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold text-[#fff] text-left">
            User Management
          </h1>

          {showUserDetails && selectedUser ? renderUserDetails() : renderUserList()}

          {/* Edit User Modal */}
          {openModal === 'edit' && <EditUserModal />}
        </div>
      </div>
    </>
  );
};

export default UserManagement;