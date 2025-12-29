import { Loader2, Search } from 'lucide-react'
import React, { useState, useEffect, useCallback } from 'react'
import { MedicationResponse } from './PharmacyGenerator';
import { APIService } from '../service/api';

const SearchPharmacy = ({
  data,
  setData,
  id,
  setSelectedItem
}: {
  data: MedicationResponse | null,
  setData: (e: MedicationResponse | null) => void,
  id?: string
  setSelectedItem?: (e: any) => void
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    q: '',
    limit: 10,
    source: 'combined'
  });
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(formData.q);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [formData.q]);

  // Perform search when debounced query changes
  const handleSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setData(null);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    setLoading(true);
    setSearchError(null);
    setHasSearched(true);
    
    try {
      const res = await APIService?.searchPharmacy(debouncedQuery, formData.limit, formData.source);
      if (res) {
        setData(res);
      } else {
        setData(null);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Failed to search medications');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, formData.limit, formData.source, setData]);

  // Trigger search when debounced query changes
  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'limit' ? parseInt(value) || 1 : value
    }));
  };

  const handleItemSelect = (item: any) => {
    if (id === 'summary' && setSelectedItem) {
      setSelectedItem({ ...item, source: formData.source });
    }
  };

  // Safe data access helper functions
  const getActiveIngredients = (item: any) => {
    if (!item.active_ingredients || !Array.isArray(item.active_ingredients)) {
      return [];
    }
    return item.active_ingredients;
  };

  const getRxCUI = (item: any) => {
    if (!item.openfda?.rxcui || !Array.isArray(item.openfda.rxcui)) {
      return [];
    }
    return item.openfda.rxcui;
  };

  const getPackaging = (item: any) => {
    if (!item.packaging || !Array.isArray(item.packaging)) {
      return [];
    }
    return item.packaging.slice(0, 2);
  };

  return (
    <>
      {/* Query Input */}
      <div>
        <label htmlFor="q" className="block text-sm font-medium text-[#fff] mb-2">
          Search Medications <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            id="q"
            name="q"
            value={formData.q}
            onChange={handleInputChange}
            required
            minLength={1}
            placeholder="Type medication name (e.g., amoxicillin)..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {loading ? (
              <Loader2 size={20} className="text-gray-700 animate-spin" />
            ) : (
              <Search size={20} className="text-gray-700 " />
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-[#ffffffb3]">
          {loading ? 'Searching...' : 'Start typing to search medications automatically'}
        </p>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        {/* Limit Selection */}
        <div>
          <label htmlFor="limit" className="block text-sm font-medium text-[#fff] mb-2">
            Results Limit
          </label>
          <select
            id="limit"
            name="limit"
            value={formData.limit}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          >
            {[...Array(50)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[#ffffffb3]">Number of results to show</p>
        </div>

        {/* Source Selection */}
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-[#fff] mb-2">
            Data Source
          </label>
          <select
            id="source"
            name="source"
            value={formData.source}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          >
            <option value="combined">Combined</option>
            <option value="rxnorm">RxNorm</option>
            <option value="openfda">OpenFDA</option>
          </select>
          <p className="mt-1 text-xs text-[#ffffffb3]">Data source for search</p>
        </div>
      </div>

      {/* Error Message */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Search Error</h3>
              <p className="text-sm text-red-700 mt-1">{searchError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Single Loader for entire search */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={48} className="animate-spin text-indigo-600 mb-4" />
          <p className="text-lg text-[#fff]">Searching for medications...</p>
          <p className="text-sm text-[#ffffffb3] mt-2">
            Looking for {debouncedQuery}
          </p>
        </div>
      )}

      {/* Results Section - Only show when not loading and there&apos;s something to display */}
      {!loading && !searchError && (hasSearched || data) && (
        <div className="mx-auto mt-6">
          <h2 className="text-2xl font-bold mb-6 text-[#fff]">
            {data?.query ? `Results for ${data.query}` : 'Search Results'}
          </h2>

          {data?.openfda_ndc && data.openfda_ndc.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {data.openfda_ndc.map((item: any, idx: number) => (
                <button
                  key={idx}
                  disabled={id !== 'summary'}
                  className="w-full text-left h-full transition-transform hover:scale-[1.02] disabled:hover:scale-100"
                  onClick={() => handleItemSelect(item)}
                >
                  <div className={`bg-white rounded-lg shadow p-4 h-full flex flex-col justify-between border-2 transition-colors ${
                    id === 'summary' 
                      ? 'hover:border-indigo-500 border-gray-200' 
                      : 'border-gray-200'
                  }`}>
                    <h2 className="text-xl font-semibold text-blue-700 mb-2">
                      {item.generic_name || 'Unknown Medication'}
                    </h2>

                    <p className="text-sm text-gray-700">
                      <strong>Brand Name:</strong> {item.brand_name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Manufacturer:</strong> {item.labeler_name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Dosage Form:</strong> {item.dosage_form || 'N/A'}
                    </p>

                    {/* Active Ingredients */}
                    <div className="mt-2">
                      <strong className="text-sm text-[#ffffffb3]">Ingredients:</strong>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {getActiveIngredients(item).length > 0 ? (
                          getActiveIngredients(item).map((ing: any, index: number) => (
                            <li key={index}>
                              {ing.name} – {ing.strength}
                            </li>
                          ))
                        ) : (
                          <li className="text-[#ffffffb3]">No ingredients listed</li>
                        )}
                      </ul>
                    </div>

                    {/* RxCUI Info */}
                    <div className="mt-2">
                      <strong className="text-sm text-gray-800">RxCUI:</strong>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {getRxCUI(item).length > 0 ? (
                          getRxCUI(item).map((rxcui: string, index: number) => (
                            <li key={index}>{rxcui}</li>
                          ))
                        ) : (
                          <li className="text-[#ffffffb3]">N/A</li>
                        )}
                      </ul>
                    </div>

                    {/* Packaging Info */}
                    <div className="mt-2">
                      <strong className="text-sm text-gray-800">Packaging:</strong>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {getPackaging(item).length > 0 ? (
                          getPackaging(item).map((pack: any, index: number) => (
                            <li key={index}>{pack.description || 'N/A'}</li>
                          ))
                        ) : (
                          <li className="text-[#ffffffb3]">No packaging information</li>
                        )}
                      </ul>
                    </div>

                    {id === 'summary' && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                          Click to select
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search size={48} className="mx-auto opacity-100" />
              </div>
              <p className="text-[#fff] text-lg mb-2">
                No medications found {debouncedQuery && `for &quot;${debouncedQuery}&quot;`}
              </p>
              <p className="text-sm text-[#ffffffb3]">
                {debouncedQuery ? 'Try a different search term or check the spelling' : 'Start typing to search for medications'}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default SearchPharmacy