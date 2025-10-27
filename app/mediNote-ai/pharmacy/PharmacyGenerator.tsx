import React, { useState } from "react"
import { X } from 'lucide-react';
import SearchPharmacy from "./SearchPharmacy";
import SearchDrugById, { IdResponseData } from "./SearchDrugById";
import SearchDrugByNdc, { DrugInfoNDC } from "./SearchDrugByNdc";

type Ingredient = {
  name: string
  strength: string
}

type Packaging = {
  package_ndc: string
  description: string
  marketing_start_date: string
}

type Product = {
  generic_name: string
  brand_name?: string
  labeler_name: string
  dosage_form: string
  active_ingredients: Ingredient[]
  packaging: Packaging[]
}

export type MedicationResponse = {
  query: string
  openfda_ndc?: Product[]
}

interface PharmacyGeneratorProps {
  fullWidth?: boolean
  showButton?: boolean
  defaultOpen?: boolean
}

const PharmacyGenerator = ({ 
  fullWidth = false, 
  showButton = false,
  defaultOpen = true 
}: PharmacyGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [data, setData] = useState<MedicationResponse | null>(null)
  const [drugIdData, setDrugIdData] = useState<IdResponseData | null>(null)
  const [ndcData, setNdcData] = useState<DrugInfoNDC | null>(null)
  const [tab, setTab] = useState(0)

  return (
    <>
      {showButton && (
        <button
          className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          onClick={() => setIsOpen(true)}
          disabled={isOpen}
        >
          Generate Pharmacy
        </button>
      )}
      
      {/* Main Content */}
      {isOpen && (
        <div
          className={`${
            showButton 
              ? 'fixed top-0 right-0 h-full w-[800px] max-w-screen-lg bg-white shadow-2xl z-50'
              : fullWidth 
                ? 'w-full bg-white shadow-lg rounded-lg'
                : 'w-[800px] max-w-screen-lg bg-white shadow-lg rounded-lg'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800">Pharmacy Search</h3>
            {showButton && (
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Tabs and Content */}
          <div className={`${showButton ? 'p-6 overflow-y-auto h-[calc(100%-80px)]' : 'p-6'}`}>
            <div className="mb-6 w-full">
              <div className="flex border-b border-gray-200 mb-3">
                {["Pharmacy Search", "Search Drug By ID", "Search Drug By NDC"]?.map((label: string, index) => (
                  <button
                    key={index}
                    className={`px-4 py-2 -mb-px text-sm font-medium ${
                      tab !== index 
                        ? "text-gray-500 border-transparent border-b-2 hover:text-blue-600 hover:border-blue-300" 
                        : "text-blue-600 border-b-2 border-blue-600 focus:outline-none"
                    }`}
                    onClick={() => setTab(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              {/* Tab content */}
              {tab === 0 && (
                <SearchPharmacy 
                  setData={setData}
                  data={data}
                  id="while-recording"
                />
              )}
              {tab === 1 && (
                <SearchDrugById 
                  data={drugIdData}
                  setData={setDrugIdData}                
                />
              )}
              {tab === 2 && (
                <SearchDrugByNdc 
                  data={ndcData}
                  setData={setNdcData}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PharmacyGenerator