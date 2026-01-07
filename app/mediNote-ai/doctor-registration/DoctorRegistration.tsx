"use client"

import { useState } from "react"
import Image from "next/image"
import { DoctorCreationTypes } from "../types"
import { APIService } from "../service/api"
import { DoctorVoiceEnroll } from "../components/DoctorVoiceEnroll"

type Step = 1 | 2 | 3

export default function DoctorForm() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [formData, setFormData] = useState<DoctorCreationTypes>({
    first_name: "",
    last_name: "",
    email: "",
    areas_of_focus: "",
    awards: "",
    certifications: "",
    fellowship: "",
    is_license_active: true,
    license_expiry_date: "",
    license_type: "",
    medical_school: "",
    professional_memberships: "",
    residency: "",
    sex: "Male"
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registeredDoctorId, setRegisteredDoctorId] = useState<number | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Required field validation
    const requiredFields = [
      'first_name', 'last_name', 'email', 'license_type', 
      'medical_school', 'license_expiry_date'
    ]
    
    for (const field of requiredFields) {
      if (!formData[field as keyof DoctorCreationTypes]?.toString().trim()) {
        setError(`${field.replace('_', ' ')} is required`)
        setIsSubmitting(false)
        return
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await APIService.createDoctor(formData)
      if (!response?.id) throw new Error("Invalid response from server")

      setRegisteredDoctorId(response.id)
      setCurrentStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVoiceEnrollComplete = () => {
    setCurrentStep(3)
  }

  const handleStartOver = () => {
    setCurrentStep(1)
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      areas_of_focus: "",
      awards: "",
      certifications: "",
      fellowship: "",
      is_license_active: true,
      license_expiry_date: "",
      license_type: "",
      medical_school: "",
      professional_memberships: "",
      residency: "",
      sex: "Male"
    })
    setError(null)
    setRegisteredDoctorId(null)
  }

  return (
    <div className="">
      {/* Header */}
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8 pt-6">
        Doctor Registration
      </h1>
      {/* Progress Bar */}
      <div className="max-w-[400px] mx-auto mb-10">
        <div className="flex items-center justify-between mr-[-110px]">
          {["Registration", "Enroll Doctor Voice", "Completed Process"].map((label, index) => (
            <div key={index} className="flex items-center w-full">
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-500 ${
                    currentStep > index + 1
                      ? "bg-green-500 text-white"
                      : currentStep === index + 1
                      ? "bg-blue-600 text-white ring-4 ring-blue-200"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {currentStep > index + 1 ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-lg font-semibold">{index + 1}</span>
                  )}
                </div>
                <p className="absolute -bottom-6 text-xs font-medium text-gray-600 whitespace-nowrap">
                  {label}
                </p>
              </div>
              {index < 2 && (
                <div
                  className={`flex-1 h-1 transition-all duration-500 ${
                    currentStep > index + 1 ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="mx-auto bg-white rounded-2xl shadow-xl overflow-hidden flex justify-center w-[85%] mt-6 transcription-welcommassege-main  relative auto-hight-vr">
        {/* Step 1: Registration Form */}
        {currentStep === 1 && (
          <>
            <div className="py-10 px-14 text-white relative z-10 w-full flex flex-col">
              {error && (
                <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="flex gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6 pb-4 w-[60%]">
                    {/* Personal Information */}
                    <div className="space-y-4 ">
                      <h3 className="text-lg font-medium border-b border-[#1b71a3] pb-2 ">Personal Information</h3>
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-6 pb-4">
                        <input
                          type="text"
                          name="first_name"
                          placeholder="First Name *"
                          value={formData.first_name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                        <input
                          type="text"
                          name="last_name"
                          placeholder="Last Name *"
                          value={formData.last_name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                        <input
                          type="email"
                          name="email"
                          placeholder="Email *"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                        <select
                          name="sex"
                          value={formData.sex}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* License Information */}
                    <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b border-[#1b71a3] pb-2">License Information</h3>
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm mb-1 text-white/80">License*</label>
                          <input
                          type="text"
                          name="license_type"
                          placeholder="License Type (MD, DO, etc.) *"
                          value={formData.license_type}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                        </div>
                        
                        <div>
                          <label className="block text-sm mb-1 text-white/80">License Expiry Date *</label>
                          <input
                            type="date"
                            name="license_expiry_date"
                            value={formData.license_expiry_date}
                            onChange={handleChange}
                            required
                        className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-white/5 rounded-lg">
                        <input
                          type="checkbox"
                          name="is_license_active"
                          checked={formData.is_license_active}
                          onChange={handleChange}
                          className="w-5 h-5 rounded focus:ring-2 focus:ring-blue-400"
                        />
                        <label className="text-white">License Active</label>
                      </div>
                    </div>

                    {/* Education */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium border-b pb-2 border-[#1b71a3] ">Education</h3>
                      <div className="grid grid-cols-3 md:grid-cols-3 gap-6">
                        <input
                          type="text"
                          name="medical_school"
                          placeholder="Medical School *"
                          value={formData.medical_school}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                        <input
                          type="text"
                          name="residency"
                          placeholder="Residency (e.g., Internal Medicine - Johns Hopkins)"
                          value={formData.residency}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                        <input
                          type="text"
                          name="fellowship"
                          placeholder="Fellowship (e.g., Cardiology - Mayo Clinic)"
                          value={formData.fellowship}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                      </div>
                    </div>

                    {/* Professional Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium border-b pb-2 border-[#1b71a3]">Professional Details</h3>
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                        <textarea
                          name="areas_of_focus"
                          placeholder="Areas of Focus (e.g., Cardiology, Hypertension, Diabetes Management)"
                          value={formData.areas_of_focus}
                          onChange={handleChange}
                          rows={3}
                        className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                        <textarea
                          name="certifications"
                          placeholder="Certifications (e.g., Board Certified in Internal Medicine, ACLS Certified)"
                          value={formData.certifications}
                          onChange={handleChange}
                          rows={2}
                        className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                        <textarea
                          name="awards"
                          placeholder="Awards & Honors (e.g., Physician of the Year 2023)"
                          value={formData.awards}
                          onChange={handleChange}
                          rows={2}
                        className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                        <textarea
                          name="professional_memberships"
                          placeholder="Professional Memberships (e.g., American Medical Association, Egyptian Medical Syndicate)"
                          value={formData.professional_memberships}
                          onChange={handleChange}
                          rows={2}
                        className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        />
                      </div>
                    </div>
                     <div className="py-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({
                      first_name: "",
                      last_name: "",
                      email: "",
                      areas_of_focus: "",
                      awards: "",
                      certifications: "",
                      fellowship: "",
                      is_license_active: true,
                      license_expiry_date: "",
                      license_type: "",
                      medical_school: "",
                      professional_memberships: "",
                      residency: "",
                      sex: "Male"
                    })}
                    className="py-3 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition w-[250px]"
                  >
                    Clear All
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition disabled:opacity-70 w-[250px]"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Registration"}
                  </button>
                    </div>
                  </div>
                  <div className="w-[40%] flex justify-center h-[570px]">
                    <Image src="/Doctor-pana-Registration.svg" alt="Epic" width={400} height={400} />
                  </div>
                </div>

               
              </form>
            </div>
          </>
        )}

        {/* Step 2: Voice Enrollment */}
        {currentStep === 2 && registeredDoctorId && (
          <div className="p-8 text-white text-center relative z-10 w-full flex items-center justify-center">
            <DoctorVoiceEnroll
              isOpen={true}
              onClose={() => setCurrentStep(1)}
              id={registeredDoctorId}
              onSuccess={handleVoiceEnrollComplete}
            />
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && registeredDoctorId && (
          <div className="p-10 text-white text-center w-full flex items-center justify-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center shadow-2xl">
                <Image
                  src="/successsgully-yes.svg"
                  alt="Success"
                  width={90}
                  height={90}
                  className=""
                />
              </div>

              <h2 className="text-[34px] font-semibold mb-3">Doctor registered successfully</h2>
              <p className="text-[16px] opacity-90 mb-8 leading-relaxed">
                Thank you for your submission. We have received your information.
                Your doctor profile has been created
              </p>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
                  <span className="flex w-3 h-3 bg-green-500 rounded-full"></span>
                  <span>Voice Enrolled</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-lg">
                  <p className="text-sm opacity-80">Doctor ID</p>
                  <p className="text-2xl font-bold">{registeredDoctorId}</p>
                </div>
                
                <button
                  onClick={handleStartOver}
                  className="w-full py-4 bg-white text-[#34334B] font-semibold rounded-lg hover:bg-gray-100 transition shadow-lg"
                >
                  Register Another Doctor
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Background Decorative Elements */}
        <div className="absolute right-0 top-0 opacity-20">
          <svg width="300" height="300" viewBox="0 0 461 430" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M261.412 0C341.45 8.67863e-05 413.082 35.9951 461.001 92.6807V429.783C460.94 429.856 460.878 429.928 460.816 430H289.244C370.46 416.708 432.435 346.208 432.435 261.232C432.435 166.779 355.865 90.2101 261.412 90.21C166.959 90.21 90.3887 166.779 90.3887 261.232C90.3887 346.208 152.364 416.707 233.579 430H62.0068C23.4388 384.476 0.179688 325.571 0.179688 261.232C0.179741 116.958 117.137 0 261.412 0Z" 
              fill="#C2F5F9" />
          </svg>
        </div>
        <div className="absolute left-0 bottom-0 opacity-10">
          <svg width="200" height="140" viewBox="0 0 289 199" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M74.4604 14.9961C29.4945 21.2278 -3.5762 38.2063 -12.2914 45.6118L-26.7382 51.5987L-18.129 238.328L15.9938 288.05L59.727 287.301L185.831 257.872C186.478 228.034 237.253 176.817 262.56 154.938C307.047 107.868 284.151 58.3168 267.142 39.4252C236.04 -2.0024 184.942 -2.74081 158.943 2.76831C155.608 3.47505 152.272 4.08963 148.876 4.38837C134.405 5.6613 97.5463 9.50809 74.4604 14.9961Z" 
              fill="url(#paint0_linear_3427_90583)" />
            <defs>
              <linearGradient id="paint0_linear_3427_90583" x1="307.848" y1="2.45841" x2="-6.38578" y2="289.124" gradientUnits="userSpaceOnUse">
                <stop stopColor="#45CEF1" />
                <stop offset="1" stopColor="#219DF1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}