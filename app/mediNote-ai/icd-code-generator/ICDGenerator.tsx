import React, { useState, useEffect, useCallback } from 'react';

// Define the props interface
interface ICDGeneratorProps {
  sessionId: number;
  patientId?: string;
  transcriptionEnd?: boolean;
  fullWidth?: boolean;
  showButton?: boolean;
  defaultOpen?: boolean;
  editMode?: boolean; // New prop for edit mode
}

// Define the API response interface for search
interface ICDCode {
  system: string;
  code: string;
  title: string;
}

interface SearchAPIResponse {
  system: string;
  results: ICDCode[];
}

// Define the API response interface for summary
interface SummaryAPIResponse {
  summary_id: number;
  session_id: number;
  summary_text: string;
  icd_system: string;
  icd_codes: string[];
}

// Enhanced interface for stored ICD codes
interface StoredICDCode {
  id: string;
  system: string;
  code: string;
  title: string;
  selectedAt: string;
}

interface ICDSelection {
  system: string;
  items: StoredICDCode[];
  updatedAt: string;
}

const ICDGenerator: React.FC<ICDGeneratorProps> = ({ 
  sessionId, 
  fullWidth = false, 
  showButton = false,
  defaultOpen = true,
  editMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // State for search form inputs
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchSystem, setSearchSystem] = useState<string>('');
  const [searchLimit, setSearchLimit] = useState<string>('10');
  const [icdCodes, setIcdCodes] = useState<ICDCode[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // State for summary form inputs and response
  const [summaryText, setSummaryText] = useState<string>('');
  const [summarySystem, setSummarySystem] = useState<string>('');
  const [summaryResponse, setSummaryResponse] = useState<SummaryAPIResponse | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);

  // Enhanced state management for selected items
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [persistentICDCodes, setPersistentICDCodes] = useState<StoredICDCode[]>([]);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Helper function to create a clean, unique ID for each ICD code
  const createItemId = (code: ICDCode): string => {
    const cleanCode = code.code.replace(/[&%]/g, '').trim();
    return `${code.system}-${cleanCode}`;
  };

  // Helper function to clean and format ICD codes for display
  const cleanCodeForDisplay = (code: string): string => {
    return code.replace(/[&%]/g, '').trim();
  };

  // Load persistent ICD codes from localStorage on component mount
  const loadPersistentICDCodes = useCallback(() => {
    try {
      const stored = localStorage.getItem(`icdSelection:${sessionId}`);
      if (stored) {
        const parsed: ICDSelection = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.items)) {
          setPersistentICDCodes(parsed.items);
          // Set the system from persistent data
          if (parsed.system && !searchSystem) {
            setSearchSystem(parsed.system);
          }
          return parsed.items;
        }
      }
    } catch (error) {
      console.error('Failed to load persistent ICD codes:', error);
    }
    return [];
  }, [sessionId, searchSystem]);

  // Save persistent ICD codes to localStorage
  const savePersistentICDCodes = useCallback((codes: StoredICDCode[], system: string) => {
    try {
      const payload: ICDSelection = {
        system,
        items: codes,
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(`icdSelection:${sessionId}`, JSON.stringify(payload));
      
      // Dispatch event for Summary Generator
      if (typeof window !== 'undefined') {
        const sectionText = codes.length > 0 
          ? `\n\n## ICD Codes \n${codes.map(code => `- ${code.code}: ${code.title} - (${system})`).join('\n')}\n`
          : '';
        
        window.dispatchEvent(
          new CustomEvent('icdSelectionUpdated', {
            detail: {
              sessionId: Number(sessionId),
              system,
              items: codes,
              sectionText,
            },
          })
        );
      }
    } catch (error) {
      console.error('Failed to save persistent ICD codes:', error);
    }
  }, [sessionId]);

  // Initialize persistent codes on mount
  useEffect(() => {
    loadPersistentICDCodes();
  }, [loadPersistentICDCodes]);

  // Update selected items when persistent codes change
  useEffect(() => {
    const selectedIds = new Set(persistentICDCodes.map(code => code.id));
    setSelectedItems(selectedIds);
  }, [persistentICDCodes]);

  // Listen for edit mode changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const sync = () => {
      try {
        const flag = localStorage.getItem(`visitSummaryEdit:${sessionId}`) === 'true';
        setIsEditMode(flag);
      } catch (error) {
        console.error('Failed to sync edit mode:', error);
      }
    };
    
    sync();
    
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sessionId: number; isEdit: boolean } | undefined;
      if (!detail || detail.sessionId !== Number(sessionId)) {
        sync();
        return;
      }
      setIsEditMode(detail.isEdit);
    };
    
    window.addEventListener('visitSummaryEditToggle', handler as EventListener);
    return () => window.removeEventListener('visitSummaryEditToggle', handler as EventListener);
  }, [sessionId]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      const code = icdCodes.find(c => createItemId(c) === itemId);
      
      if (!code) return newSet;
      
      if (newSet.has(itemId)) {
        // Remove from selection and persistent storage
        newSet.delete(itemId);
        const updatedPersistent = persistentICDCodes.filter(pc => pc.id !== itemId);
        setPersistentICDCodes(updatedPersistent);
        savePersistentICDCodes(updatedPersistent, searchSystem);
      } else {
        // Add to selection and persistent storage
        newSet.add(itemId);
        const storedCode: StoredICDCode = {
          id: itemId,
          system: code.system,
          code: cleanCodeForDisplay(code.code),
          title: code.title.trim(),
          selectedAt: new Date().toISOString()
        };
        
        // Check if already exists in persistent storage (avoid duplicates)
        const existingIndex = persistentICDCodes.findIndex(pc => pc.id === itemId);
        let updatedPersistent: StoredICDCode[];
        
        if (existingIndex >= 0) {
          // Update existing
          updatedPersistent = [...persistentICDCodes];
          updatedPersistent[existingIndex] = storedCode;
        } else {
          // Add new
          updatedPersistent = [...persistentICDCodes, storedCode];
        }
        
        setPersistentICDCodes(updatedPersistent);
        savePersistentICDCodes(updatedPersistent, searchSystem);
      }
      
      return newSet;
    });
  };

  // Clear all selected items
  const clearAllSelections = () => {
    setSelectedItems(new Set());
    setPersistentICDCodes([]);
    savePersistentICDCodes([], searchSystem);
  };

  // Remove specific item from persistent storage
  const removeFromPersistent = (itemId: string) => {
    const updatedPersistent = persistentICDCodes.filter(code => code.id !== itemId);
    setPersistentICDCodes(updatedPersistent);
    savePersistentICDCodes(updatedPersistent, searchSystem);
    
    // Also remove from current selection if present
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  // Function to fetch ICD codes (GET /icd/search)
  const fetchIcdCodes = async () => {
    setSearchLoading(true);
    setSearchError(null);
    setIcdCodes([]);
    
    try {
      const response = await fetch(
        `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/icd/search?q=${encodeURIComponent(
          searchQuery
        )}&system=${searchSystem}&limit=${searchLimit}`,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SearchAPIResponse = await response.json();
      
      // Remove any duplicate codes that might come from the API
      const uniqueCodes = data.results.reduce((acc, code) => {
        const key = `${code.system}-${cleanCodeForDisplay(code.code)}`;
        if (!acc.some(existing => `${existing.system}-${cleanCodeForDisplay(existing.code)}` === key)) {
          acc.push(code);
        }
        return acc;
      }, [] as ICDCode[]);
      
      setIcdCodes(uniqueCodes);
    } catch (err) {
      setSearchError('Failed to fetch ICD codes. Please try again.');
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search button click
  const handleSearch = () => {
    if (searchQuery && searchSystem && searchLimit) {
      fetchIcdCodes();
    } else {
      setSearchError('Please fill in all search fields.');
    }
  };

  // Function to generate summary (POST /icd/finalize-summary)
  const generateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryResponse(null);
    try {
      const response = await fetch(
        'https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/icd/finalize-summary',
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: Number(sessionId),
            summary_text: summaryText,
            icd_system: summarySystem,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SummaryAPIResponse = await response.json();
      setSummaryResponse(data);
    } catch (err) {
      setSummaryError('Failed to generate summary. Please try again.');
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Handle generate summary button click
  const handleGenerateSummary = () => {
    if (summaryText && summarySystem) {
      generateSummary();
    } else {
      setSummaryError('Please fill in all summary fields.');
    }
  };

  // Handle close button click
  const handleClose = () => {
    if (showButton) {
    setIsOpen(false);
    }
    window.dispatchEvent(new CustomEvent('icdGeneratorClose', { detail: { sessionId } }));
  };

  if (!isOpen) {
    return showButton ? (
      <button
        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        onClick={() => setIsOpen(true)}
      >
        Generate ICD Codes
      </button>
    ) : null;
  }

  return (
    <div
      className={`${
        showButton 
          ? 'fixed top-0 right-0 h-full w-[800px] max-w-screen-lg bg-white shadow-2xl z-50 '
          : fullWidth 
            ? 'transcription-welcommassege-main w-[84%] mx-auto  rounded-lg autopharmacySearch-min relative '
            : 'w-[800px] max-w-screen-lg bg-white shadow-lg rounded-lg'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#1b71a3]">
        <h3 className="text-xl font-semibold text-[#fff] ">ICD Code Generator</h3>
      </div>

      {/* Content */}
      <div className={`${showButton ? 'p-6 overflow-y-auto h-[calc(100%-80px)]' : 'p-6 z-[2] relative'}`}>
        <div className="space-y-4 mb-8">
            {/* Search Query Input */}
            <div>
              <label htmlFor="searchQuery" className="block text-sm font-medium text-[#fff] mb-1">
                Search ICD Code / Diagnostics
              </label>
              <input
                id="searchQuery"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., cholera"
              />
            </div>
            
            <div className='flex gap-3'>
              {/* Search System Dropdown */}
              <div className='w-full'>
                <label htmlFor="searchSystem" className="block text-sm font-medium text-[#fff] mb-1">
                  ICD Code System
                </label>
                <select
                  id="searchSystem"
                  value={searchSystem}
                  onChange={(e) => setSearchSystem(e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Select a system
                  </option>
                  <option value="ICD11">ICD11</option>
                  <option value="ICD10">ICD10</option>
                </select>
              </div>

              {/* Search Limit Input */}
              <div className='w-full'>
                <label htmlFor="searchLimit" className="block text-sm font-medium text-[#fff] mb-1 ">
                  Limit Results
                </label>
                <input
                  id="searchLimit"
                  type="number"
                  value={searchLimit}
                  onChange={(e) => setSearchLimit(e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                  min="1"
                  max="50"
                />
              </div>
            </div>
            
            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={searchLoading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>

            {/* Search Results */}
            {searchError && <p className="text-red-500 text-sm">{searchError}</p>}
            
            {icdCodes.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold mb-3 text-[#fff]">
                  Search Results
                </h4>
                <div className="space-y-3">
                  {icdCodes.map((code) => {
                    const itemId = createItemId(code);
                    const checkboxId = `${itemId}__select`;
                    const isSelected = selectedItems.has(itemId);
                    const displayCode = cleanCodeForDisplay(code.code);
                    const isPersistent = persistentICDCodes.some(pc => pc.id === itemId);
                    
                    return (
                      <div key={itemId} className={`border rounded-lg p-3 ${isPersistent ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                        {isEditMode ? (
                          <div className="flex items-start gap-3">
                            <input
                              id={checkboxId}
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(itemId)}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={checkboxId} className="cursor-pointer flex-1">
                              <div className="font-medium text-gray-900">
                                Code: {displayCode}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {code.title}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                System: {code.system}
                              </div>
                              {isPersistent && (
                                <div className="text-xs text-green-600 font-medium mt-1">
                                  Already selected
                                </div>
                              )}
                            </label>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-gray-900">
                              Code: {displayCode}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {code.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              System: {code.system}
                            </div>
                            {isPersistent && (
                              <div className="text-xs text-green-600 font-medium mt-1">
                                Selected
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>
        {editMode && !isEditMode && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Enable Edit Summary mode to select/deselect ICD codes.
          </p>
        </div>
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
  );
};

export default ICDGenerator;