"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get("token");
      const next = searchParams.get("next") || "/";

      if (!token) {
        setError("No authentication token received");
        // Redirect back to login after 2 seconds
        setTimeout(() => {
          const apiBase = "https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net";
          window.location.href = `${apiBase}/auth/login?redirect_uri=${encodeURIComponent(window.location.origin + "/auth/callback")}`;
        }, 2000);
        return;
      }

      // Set the access token cookie
      document.cookie = `access_token=${token}; path=/; samesite=strict; max-age=28800${
        process.env.NODE_ENV === "production" ? "; secure" : ""
      }`;

      // Clear any auth redirect guard
      document.cookie = "auth_redirected=; path=/; max-age=0";

      // Small delay to ensure cookie is set
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to intended destination
      router.replace(next);
    };

    handleAuth();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Completing login...</p>
    </div>
  );
}