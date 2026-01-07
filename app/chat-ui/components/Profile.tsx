// components/Profile.tsx (or wherever your Profile modal is)
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import Image from "next/image";
import { APIService } from "../../mediNote-ai/service/api";

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
  displayName?: string;
  initials?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export default function Profile({
  isOpen,
  onClose,
  displayName,
  initials = "",
  firstName,
  lastName,
  email,
  phone,
  role,
}: ProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"profile" | "enrollVoice">("profile");
  const router = useRouter();

const handleLogout = async () => {
  setIsLoading(true);
  try {
    // Call backend logout API
    await APIService.logout();

    // Set logout flag cookie (short-lived)
    document.cookie = "just_logged_out=1; path=/; max-age=10; SameSite=Lax";
    
    // Clear access token
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    
    // Clear auth redirected cookie
    document.cookie = "auth_redirected=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    
    // Wait a moment for cookies to be set
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Force redirect to homepage (middleware will catch and redirect to login)
    window.location.href = "/";
    
  } catch (error) {
    console.error("Logout error:", error);
    
    // Even if API fails, clear cookies and redirect
    document.cookie = "just_logged_out=1; path=/; max-age=10; SameSite=Lax";
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "auth_redirected=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    
    await new Promise(resolve => setTimeout(resolve, 100));
    window.location.href = "/";
  } finally {
    setIsLoading(false);
  }
};

  const handleEnrollVoice = () => {
    setActiveSection("enrollVoice");
  };

  const handleProfileClick = () => {
    setActiveSection("profile");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[900px] bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 border-custome-profile">
        <div className="flex items-stretch">
          {/* Left Sidebar */}
          <div className="gradintProfile w-[280px] rounded-l-3xl flex flex-col gap-3 justify-evenly px-6 py-16 items-center relative">
            <div className="flex flex-col gap-3 items-center">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
                <div className="text-white font-semibold text-2xl">
                  {initials || ""}
                </div>
              </div>
              <div className="text-white text-lg font-semibold text-center w-40">
                {firstName || ""}
              </div>
            </div>

            <div className="flex flex-col gap-3 items-center w-full">
              <button
                onClick={handleProfileClick}
                className={clsx(
                  "w-full px-6 py-2 rounded-md shadow-lg text-center",
                  activeSection === "profile"
                    ? "bg-gradient-to-r from-orange-500 to-pink-500"
                    : "bg-white/20 backdrop-blur-sm border border-white/30"
                )}
              >
                <span className="text-white font-semibold text-sm">Profile</span>
              </button>

              <button
                onClick={handleEnrollVoice}
                className={clsx(
                  "w-full px-4 py-2 rounded-md",
                  activeSection === "enrollVoice"
                    ? "bg-gradient-to-r from-orange-500 to-pink-500"
                    : "bg-white/20 backdrop-blur-sm border border-white/30"
                )}
              >
                <span className="text-white text-sm">Enroll Doctor Voice</span>
              </button>
            </div>

            {/* Decorative SVG */}
            <div className="absolute top-0 right-0">
              <svg width="45" height="524" viewBox="0 0 45 524" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g filter="url(#filter0_f_3543_99779)">
                  <ellipse cx="43" cy="265.5" rx="17" ry="239.5" fill="black" fillOpacity="0.4"/>
                </g>
                <defs>
                  <filter id="filter0_f_3543_99779" x="0.6" y="0.6" width="84.8" height="529.8" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="12.7" result="effect1_foregroundBlur_3543_99779"/>
                  </filter>
                </defs>
              </svg>
            </div>
          </div>

          {/* Main Content */}
          <div className="pl-12 pr-12 py-8 relative w-full garadiantProfile-details">
            {activeSection === "profile" ? (
              <>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">My Profile</h2>
                    <p className="text-gray-300 text-sm">Manage your account information.</p>
                  </div>
                  <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6 mb-6 mt-6 pb-6 pt-6">
                  <div className="flex justify-between items-center">
                    <div className="w-[50%]">
                      <span className="text-white opacity-75 text-sm">First name</span>
                      <p className="text-white font-semibold text-base">{firstName || "-"}</p>
                    </div>
                    <div className="w-[50%]">
                      <span className="text-white opacity-75 text-sm">Last name</span>
                      <p className="text-white font-semibold text-base">{lastName || "-"}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="w-[50%]">
                      <span className="text-white opacity-75 text-sm">Email</span>
                      <p className="text-white font-semibold text-sm">{email || "-"}</p>
                    </div>
                    <div className="w-[50%]">
                      <span className="text-white opacity-75 text-sm">Role</span>
                      <p className="text-white font-semibold text-sm">{role || "-"}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-white opacity-75 text-sm">Mobile Number</span>
                      <p className="text-white font-semibold text-sm">{phone || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-white font-normal text-xl mb-4">Application Integration</h3>
                  <div className="flex gap-3 flex-wrap">
                    <Image src="/epic-logo.png" alt="Epic" width={66} height={50} />
                    <Image src="/dragon-logo.png" alt="Dragon" width={90} height={50} />
                    <Image src="/capsule-logo.png" alt="Capsule" width={111} height={50} />
                    <Image src="/qxMD-logo.png" alt="QxMD" width={86} height={50} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all border",
                      isLoading
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300"
                        : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:shadow-md"
                    )}
                  >
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                      <path d="M7.87389 1.00815C7.87407 0.524906 7.48251 0.133005 6.99924 0.132813C6.51598 0.132629 6.12407 0.524223 6.12389 1.00746L6.12109 8.01044C6.12092 8.4937 6.51257 8.88561 6.99583 8.88578C7.47901 8.88596 7.87092 8.49431 7.87109 8.01114L7.87389 1.00815Z" fill="#D73524"/>
                      <path d="M0 8.86772C0 6.93469 0.783484 5.18477 2.05019 3.91803L3.28764 5.15546C2.33761 6.10551 1.75 7.41795 1.75 8.86772C1.75 11.7672 4.1005 14.1177 7 14.1177C9.89949 14.1177 12.25 11.7672 12.25 8.86772C12.25 7.41795 11.6623 6.10545 10.7123 5.1554L11.9497 3.91797C13.2165 5.18471 14 6.93469 14 8.86772C14 12.7336 10.866 15.8677 7 15.8677C3.134 15.8677 0 12.7336 0 8.86772Z" fill="#D73524"/>
                    </svg>
                    <span>{isLoading ? "Logging out..." : "Log Out"}</span>
                  </button>
                </div>
              </>
            ) : (
              // Enroll Voice Section (unchanged)
              <>
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-2xl font-bold text-white">Enroll Doctor Voice</h2>
                  <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-col gap-6 text-center items-center p-12">
                  <Image
                    src="/enrollDoctorVoice-click-btn.svg"
                    alt="Record Voice"
                    width={367}
                    height={100}
                    priority
                  />
                  <span className="text-white">Tap to record</span>
                  <p className="text-white max-w-md">
                    Press the O2AI button by saying “Hey O2AI, I agree to enable voice recognition”
                  </p>
                  <button className="px-8 py-3 bg-white text-gray-800 rounded-lg font-bold hover:bg-gray-100">
                    Submit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}