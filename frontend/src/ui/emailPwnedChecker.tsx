import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckEMailBreachAPI } from "../services/password/passwordServices";
import Loading from "../State/Loading";
import { toast } from "react-toastify";

interface Breach {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  AddedDate: string;
  Description: string;
  DataClasses: string[];
  IsVerified: boolean;
  IsSensitive: boolean;
  IsSpamList: boolean;
}

const EmailPwnedChecker: React.FC = () => {
  const [email, setEmail] = useState("");
  const API_KEY_AVAILABLE = false; // Set to true when API key is available

  const {
    data: breaches,
    error,
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["breach-check", email],
    queryFn: () => CheckEMailBreachAPI({ email }),
    enabled: false,
    retry: false,
  });

  const handleCheck = () => {
    if (!email) return;
    refetch();
  };

  if (!API_KEY_AVAILABLE) {
    return (
      <div className="text-yellow-600 text-center mt-6">
        ⚠️ This feature requires an API key. Coming soon!
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="w-full h-screen">
        <Loading />
      </div>
    );
  }

  if (isError) {
    toast.error("an error occurred please try again later");
    return <div className="h-screen w-full">{error.message}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md space-y-6">
      <h2 className="text-3xl font-bold text-center">
        🔍 Email Breach Checker
      </h2>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-500"
      />

      <button
        onClick={handleCheck}
        disabled={isFetching || !email}
        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isFetching ? "Checking..." : "Check if Pwned"}
      </button>

      {isError && (
        <p className="text-red-600 text-center">
          Something went wrong. Please try again later.
        </p>
      )}

      {breaches && breaches.length > 0 && (
        <div className="bg-red-50 border border-red-400 text-red-800 p-4 rounded-md space-y-4">
          <h3 className="text-xl font-semibold text-red-700">
            ⚠️ Your email was found in {breaches.length} breach
            {breaches.length > 1 ? "es" : ""}:
          </h3>
          {breaches.map((breach: Breach, index: number) => (
            <div key={index} className="border-t border-red-300 pt-3">
              <h4 className="font-bold text-lg">{breach.Title}</h4>
              <p>
                <strong>Domain:</strong> {breach.Domain}
              </p>
              <p>
                <strong>Breach Date:</strong> {breach.BreachDate}
              </p>
              <p>
                <strong>Added to HIBP:</strong> {breach.AddedDate}
              </p>
              <p>
                <strong>Verified:</strong> {breach.IsVerified ? "Yes" : "No"}
              </p>
              <p>
                <strong>Exposed Data:</strong> {breach.DataClasses.join(", ")}
              </p>
              <p
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: breach.Description }}
              />
            </div>
          ))}
        </div>
      )}

      {breaches && breaches.length === 0 && (
        <div className="bg-green-50 border border-green-400 text-green-800 p-4 rounded-md">
          <h3 className="text-lg font-semibold">
            ✅ Good news — this email has not been found in any known data
            breaches.
          </h3>
        </div>
      )}
    </div>
  );
};

export default EmailPwnedChecker;
