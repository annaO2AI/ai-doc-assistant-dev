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
              ? 'fixed top-0 right-0 h-full w-[800px] max-w-screen-lg  shadow-2xl z-50 aside-style-left'
              : fullWidth 
                ? 'bg-white shadow-lg rounded-lg transcription-welcommassege-main w-[88%] mx-auto rounded-[20px] autopharmacySearch-min relative'
                : 'w-[800px] max-w-screen-lg bg-white shadow-lg rounded-lg'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 ">
            <h3 className="text-xl font-semibold text-[#fff]">Pharmacy Search </h3>
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
            <div className="mb-6 w-full relative z-[2]">
              <div className="flex border-b border-gray-200 mb-3">
                {["Pharmacy Search", "Search Drug By ID", "Search Drug By NDC"]?.map((label: string, index) => (
                  <button
                    key={index}
                    className={`px-4 py-2 -mb-px text-sm  ${
                      tab !== index 
                        ? "text-[#d2e6ff] border-transparent border-b-2" 
                        : "text-[#fff] border-b-2 border-blue-600 focus:outline-none font-medium"
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
      )}
    </>
  )
}

export default PharmacyGenerator