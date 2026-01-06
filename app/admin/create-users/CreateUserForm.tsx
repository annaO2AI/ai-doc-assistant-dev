"use client";

import { useState } from "react";
import { UserCreationTypes } from "@/app/mediNote-ai/types";
import { APIService } from "@/app/mediNote-ai/service/api";
import Image from "next/image";

export default function CreateUserForm() {
    const [formData, setFormData] = useState<UserCreationTypes>({
        clinic_id: "",
        doctor_id: 0,
        email: "",
        name: "",
        role: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "doctor_id" ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        // Log the data being sent
        console.log("Submitting form data:", formData);
        console.log("JSON being sent:", JSON.stringify(formData));

        try {
            const response = await APIService.createUser(formData);
            console.log("API Response:", response);
            setSuccess(true);
            // Reset form on success
            setFormData({
                clinic_id: "",
                doctor_id: 0,
                email: "",
                name: "",
                role: "",
            });
        } catch (err: any) {
            // Enhanced error handling
            console.error("Error details:", err);
            
            let errorMessage = "User creation failed";
            
            if (err.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error("Response data:", err.response.data);
                console.error("Response status:", err.response.status);
                console.error("Response headers:", err.response.headers);
                
                errorMessage = `Server error (${err.response.status}): ${
                    err.response.data?.message || err.response.data?.error || "Unknown server error"
                }`;
            } else if (err.request) {
                // The request was made but no response was received
                console.error("No response received:", err.request);
                errorMessage = "No response from server. Please check your connection.";
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error("Error message:", err.message);
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setFormData({
            clinic_id: "",
            doctor_id: 0,
            email: "",
            name: "",
            role: "",
        });
        setSuccess(false);
        setError(null);
    };

    const handleClear = () => {
        setFormData({
            clinic_id: "",
            doctor_id: 0,
            email: "",
            name: "",
            role: "",
        });
        setError(null);
    };

    return (
        <div className="py-0 px-4">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
                Create User
            </h1>

            <div className="mx-auto bg-white shadow-xl overflow-hidden flex justify-center w-[65%] mt-6 transcription-welcommassege-main rounded-[1vw] relative">
                {!success ? (
                    <>
                        <div className="p-16 text-white relative z-10 w-[55%]">
                            <h2 className="text-2xl font-semibold mb-8">User Details</h2>
                            {error && (
                                <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
                                    <strong className="block font-bold mb-1">Error Details:</strong>
                                    {error}
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                                />

                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                                />

                                <input
                                    type="text"
                                    name="clinic_id"
                                    placeholder="Clinic ID"
                                    value={formData.clinic_id}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                                />

                                <input
                                    type="number"
                                    name="doctor_id"
                                    placeholder="Doctor ID"
                                    value={formData.doctor_id || ""}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                                />

                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-md"
                                >
                                    <option value="">Select Role</option>
                                    <option value="DOCTOR">Doctor</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                    <option value="CLINIC_ADMIN">Clinic Admin</option>
                                </select>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        className="flex-1 py-3 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition disabled:opacity-70"
                                    >
                                        {isSubmitting ? "Creating..." : "Create User"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Illustration or side panel */}
                        <div className="flex w-[45%] items-center justify-center">
                            <Image
                                src="/patentRegistration-ill.svg"
                                alt="User Management Illustration"
                                width={250}
                                height={170}
                                className=""
                            />
                        </div>
                    </>
                ) : (
                    <div className="p-16 text-white text-center w-full">
                        <div className="max-w-md mx-auto">
                            <div className="w-32 h-32 mx-auto mb-8 bg-green-500 rounded-full flex items-center justify-center shadow-2xl">
                                <Image
                                    src="/successsgully-yes.svg"
                                    alt="Success"
                                    width={80}
                                    height={80}
                                    className=""
                                />
                            </div>

                            <h2 className="text-4xl font-bold mb-3">User Created Successfully</h2>
                            <h3 className="text-2xl font-semibold mb-3">Account has been set up</h3>
                            <p className="text-lg opacity-90 mb-8 leading-relaxed">
                                The new user account has been created and is ready for use.
                            </p>

                            <button
                                onClick={handleReset}
                                className="mt-4 px-10 py-4 bg-white text-[#34334B] font-semibold rounded-lg hover:bg-gray-100 transition"
                            >
                                Create Another User
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Decorative SVG elements matching PatientForm */}
                <span className="rightlinerGrading">
                    <svg width="461" height="430" viewBox="0 0 461 430" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M261.412 0C341.45 8.67863e-05 413.082 35.9951 461.001 92.6807V429.783C460.94 429.856 460.878 429.928 460.816 430H289.244C370.46 416.708 432.435 346.208 432.435 261.232C432.435 166.779 355.865 90.2101 261.412 90.21C166.959 90.21 90.3887 166.779 90.3887 261.232C90.3887 346.208 152.364 416.707 233.579 430H62.0068C23.4388 384.476 0.179688 325.571 0.179688 261.232C0.179741 116.958 117.137 0 261.412 0Z" 
                        fill="#C2F5F9" fillOpacity="0.2"></path>
                    </svg>
                </span>
                <span className="bottomlinerGrading">
                    <svg width="289" height="199" viewBox="0 0 289 199" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M74.4604 14.9961C29.4945 21.2278 -3.5762 38.2063 -12.2914 45.6118L-26.7382 51.5987L-18.129 238.328L15.9938 288.05L59.727 287.301L185.831 257.872C186.478 228.034 237.253 176.817 262.56 154.938C307.047 107.868 284.151 58.3168 267.142 39.4252C236.04 -2.0024 184.942 -2.74081 158.943 2.76831C155.608 3.47505 152.272 4.08963 148.876 4.38837C134.405 5.6613 97.5463 9.50809 74.4604 14.9961Z" 
                        fill="url(#paint0_linear_3427_90583)" fillOpacity="0.4"></path>
                        <defs>
                            <linearGradient id="paint0_linear_3427_90583" x1="307.848" y1="2.45841" x2="-6.38578" y2="289.124" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#45CEF1"></stop>
                                <stop offset="1" stopColor="#219DF1"></stop>
                            </linearGradient>
                        </defs>
                    </svg>
                </span>
            </div>
        </div>
    );
}