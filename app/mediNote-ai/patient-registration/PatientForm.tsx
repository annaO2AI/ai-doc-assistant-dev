"use client";

import { useEffect, useState } from "react";
import { PatientCreationTypes } from "../types";
import { APIService } from "../service/api";
import Image from "next/image";
import { PatientVoiceEnrollRegistration } from "../components/PatientVoiceEnrollRegistration";

type Step = 1 | 2 | 3;

export default function PatientForm() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const [formData, setFormData] = useState<PatientCreationTypes>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    ssn_last4: "",
    address: "",
    date_of_birth: "",
    age: 0,
    sex: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredPatientId, setRegisteredPatientId] = useState<number | null>(null);
  const [showVoiceEnroll, setShowVoiceEnroll] = useState(false);

  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "date_of_birth") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        age: calculateAge(value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
       const apiData = {
      first_name: formData.first_name || "",
      last_name: formData.last_name || "",
      email: formData.email || "",
      phone: formData.phone || "",
      ssn_last4: formData.ssn_last4 || "",
      address: formData.address || "",
      date_of_birth: formData.date_of_birth || "",
      age: formData.age || 0, // Ensure it's a number, not undefined
      sex: formData.sex || "",
    };


      const response = await APIService.registerPatient(apiData);
      if (!response?.id) throw new Error("Invalid response from server");

      setRegisteredPatientId(response.id);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceEnrollComplete = () => {
    setCurrentStep(3); // Final success step
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      ssn_last4: "",
      address: "",
      date_of_birth: "",
      age: 0,
      sex: "",
    });
    setError(null);
    setRegisteredPatientId(null);
  };

  return (
    <div className=" py-0 px-4">
      {/* Header */}
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
        Patient Registration
      </h1>

      {/* Progress Bar */}
      <div className="max-w-[400px] mx-auto mb-14">
        <div className="flex items-center justify-between mr-[-110px]">
          {["Registration", "Enroll Patient Voice", "Completed Process"].map((label, index) => (
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
      <div className="mx-auto bg-white rounded-2xl shadow-xl overflow-hidden flex justify-center Patient-resitation mx-auto w-[65%] mt-6 transcription-welcommassege-main rounded-[1vw] relative">
        {/* Step 1: Registration Form */}
        {currentStep === 1 && (
          <>
          <div className="p-16  text-white relative z-10  w-[55%]">
            <h2 className="text-2xl font-semibold mb-8">Registration</h2>
            {error && (
              <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <input
                type="text"
                name="first_name"
                placeholder="First Name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="col-span-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
              />
              <input
                type="text"
                name="last_name"
                placeholder="Last Name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="col-span-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                className="col-span-2 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
              />
              <div className="grid grid-cols-3 gap-4 col-span-2">
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                />
                <input
                  type="text"
                  name="ssn_last4"
                  placeholder="Last 4 digits of SSN"
                  value={formData.ssn_last4}
                  onChange={handleChange}
                  pattern="\d{4}"
                  maxLength={4}
                  required
                  className="px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                />
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  required
                  className="px-4 py-3 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 col-span-2">
                <input
                  type="date"
                  name="date_of_birth"
                  placeholder="Date of Birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  className="px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                />
                <input
                  type="number"
                  name="age"
                  placeholder="Age"
                  value={formData.age || ""}
                  onChange={handleChange}
                  min="0"
                  max="120"
                  className="px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                  readOnly={!!formData.date_of_birth}
                />
              </div>
              <input
                type="text"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                required
                className="col-span-2 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
              />

              <div className="col-span-2 flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setFormData({
                    first_name: "", 
                    last_name: "", 
                    email: "", 
                    phone: "", 
                    ssn_last4: "", 
                    address: "",
                    date_of_birth: "",
                    age: 0,
                    sex: "",
                  })}
                  className="flex-1 py-3 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition disabled:opacity-70"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
          <div className="flex w-[45%] items-center justify-center ">
            <Image
              src="/patentRegistration-ill.svg"
              alt="Doctor-Patient Illustration"
              width={250}
              height={170}
              className=""
            />
          </div>
        </>
        )}

       {/* Step 2: Voice Enrollment */}
      {currentStep === 2 && registeredPatientId && (
        <div className="p-10 text-white text-center relative z-10 w-full">
          <PatientVoiceEnrollRegistration
            isOpen={true}
            onClose={() => setCurrentStep(1)}  // Go back if needed
            id={registeredPatientId}
            onSuccess={handleVoiceEnrollComplete}  // This triggers Step 3
          />
        </div>
      )}

        {/* Step 3: Success */}
        {currentStep === 3 && registeredPatientId && (
          <div className="p-16 text-white text-center">
            <div className="max-w-md mx-auto">
              <div className="w-32 h-32 mx-auto mb-8 bg-green-500 rounded-full flex items-center justify-center shadow-2xl">
               
                 <Image
                  src="/successsgully-yes.svg"
                  alt="Doctor-Patient Illustration"
                  width={250}
                  height={170}
                  className=""
                />
              </div>

              <h2 className="text-4xl font-bold mb-3">O2 AI Is Ready</h2>
              <h3 className="text-2xl font-semibold mb-3">Patient registered successfully</h3>
              <p className="text-lg opacity-90 mb-8 leading-relaxed">
                Thank you for your submission. We have received your information.
                Your patient profile has been created
              </p>
              <div className="mb-4 flex items-center justify-center">
                <span className="flex gap-3 items-center">
                  <span className="flex w-[15px] h-[15px] bg-green-500 rounded-full"></span> Voice Exists
                </span>
              </div>

              <button
                onClick={handleStartOver}
                className="mt-4 px-10 py-4 bg-white text-[#34334B] font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Register Another Patient
              </button>
            </div>
          </div>
        )}
       
        <span className="rightlinerGrading"><svg width="461" height="430" viewBox="0 0 461 430" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M261.412 0C341.45 8.67863e-05 413.082 35.9951 461.001 92.6807V429.783C460.94 429.856 460.878 429.928 460.816 430H289.244C370.46 416.708 432.435 346.208 432.435 261.232C432.435 166.779 355.865 90.2101 261.412 90.21C166.959 90.21 90.3887 166.779 90.3887 261.232C90.3887 346.208 152.364 416.707 233.579 430H62.0068C23.4388 384.476 0.179688 325.571 0.179688 261.232C0.179741 116.958 117.137 0 261.412 0Z" fill="#C2F5F9" fill-opacity="0.2"></path></svg></span>
        <span className="bottomlinerGrading"><svg width="289" height="199" viewBox="0 0 289 199" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M74.4604 14.9961C29.4945 21.2278 -3.5762 38.2063 -12.2914 45.6118L-26.7382 51.5987L-18.129 238.328L15.9938 288.05L59.727 287.301L185.831 257.872C186.478 228.034 237.253 176.817 262.56 154.938C307.047 107.868 284.151 58.3168 267.142 39.4252C236.04 -2.0024 184.942 -2.74081 158.943 2.76831C155.608 3.47505 152.272 4.08963 148.876 4.38837C134.405 5.6613 97.5463 9.50809 74.4604 14.9961Z" fill="url(#paint0_linear_3427_90583)" fill-opacity="0.4"></path><defs><linearGradient id="paint0_linear_3427_90583" x1="307.848" y1="2.45841" x2="-6.38578" y2="289.124" gradientUnits="userSpaceOnUse"><stop stop-color="#45CEF1"></stop><stop offset="1" stop-color="#219DF1"></stop></linearGradient></defs></svg></span>
      </div>
    </div>
  );
}