// src/components/DataDashboard.tsx

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCiphertextList } from "../API/he.ts";
import type { CiphertextSummary } from "../API/he.ts";

interface DataDashboardProps {
  token: string;
  // Assuming you have a routing function to navigate to the decryption page
  onViewCiphertext: (dataId: string) => void;
}

const DataDashboard: React.FC<DataDashboardProps> = ({
  token,
  onViewCiphertext,
}) => {
  const {
    data: ciphertexts,
    isLoading,
    isError,
    error,
  } = useQuery<CiphertextSummary[], Error>({
    queryKey: ["ciphertexts"],
    queryFn: () => fetchCiphertextList(token),
    // Refresh data every 5 minutes (300000 ms)
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-blue-50 p-8">
        <p className="text-blue-600 font-semibold text-lg">
          Loading Encrypted Data... 🔄
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-blue-50 p-8">
        <p className="text-red-600 text-lg">
          Error fetching data: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-2xl space-y-6">
        <h2 className="text-3xl font-bold text-blue-700">
          Encrypted Data Management 🗄️
        </h2>
        <p className="text-gray-600">
          These ciphertexts are stored on the server. Select an item to initiate
          local decryption.
        </p>

        {ciphertexts && ciphertexts.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">
              No encrypted data uploaded yet. Use the 'Data Upload' page to
              start.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ciphertexts?.map((ct) => (
              <div
                key={ct.id}
                className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-100 transition duration-150 cursor-pointer"
                onClick={() => onViewCiphertext(ct.dataId)}
              >
                <div className="space-y-0.5">
                  <p className="text-lg font-semibold text-gray-800">
                    {ct.dataId}
                  </p>
                  <p className="text-sm text-gray-500">
                    Scheme:{" "}
                    <span className="font-medium text-blue-600">
                      {ct.scheme.toUpperCase()}
                    </span>{" "}
                    | Size: {Math.round(ct.ciphertextLength / 1024)} KB
                  </p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition duration-150">
                  View & Decrypt →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataDashboard;
