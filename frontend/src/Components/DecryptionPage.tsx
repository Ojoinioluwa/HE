// src/components/DecryptionPage.tsx

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
// Assuming fetchCiphertextContent is added to your src/api/he.ts
import { fetchCiphertextContent } from "../API/he.ts";
// Assuming decryptCiphertext is added to your src/utils/heClient.ts
import { decryptCiphertext } from "../utils/heClient";

interface DecryptionPageProps {
  token: string;
  dataId: string; // The ID of the ciphertext to decrypt (e.g., Q4_Sales_2025 or SUM_RESULT)
  // CRITICAL: The user's private key, passed down from the HE Context
  secretKeyBase64: string;
}

const DecryptionPage: React.FC<DecryptionPageProps> = ({
  token,
  dataId,
  secretKeyBase64,
}) => {
  const [decryptedData, setDecryptedData] = useState<number[] | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  // 1. Fetch the Encrypted Data Content (Ciphertext Base64) from the server
  const {
    data: ciphertextData,
    isLoading: isLoadingCiphertext,
    isError: isErrorCiphertext,
    error: ciphertextError,
  } = useQuery({
    queryKey: ["ciphertextContent", dataId],
    queryFn: () => fetchCiphertextContent(token, dataId),
    enabled: !!token && !!dataId, // Only run if we have a token and dataId
    staleTime: Infinity, // Ciphertext won't change unless re-uploaded
  });

  const handleDecrypt = () => {
    setDecryptionError(null);
    setDecryptedData(null);

    if (!ciphertextData?.ciphertextBase64) {
      setDecryptionError("No ciphertext data available to decrypt.");
      return;
    }

    if (!secretKeyBase64) {
      setDecryptionError(
        "Secret Key is missing. You must initialize the HE system first."
      );
      return;
    }

    try {
      // 2. Perform Decryption client-side using the local Secret Key
      const decryptedArray = decryptCiphertext(
        ciphertextData.ciphertextBase64,
        secretKeyBase64
      );

      setDecryptedData(decryptedArray);
    } catch (e: any) {
      console.error("Decryption failed:", e);
      // Display an informative error message
      setDecryptionError(
        `Decryption failed: ${e.message}. The ciphertext might be corrupted or the Secret Key is incorrect.`
      );
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-2xl space-y-6">
        <h2 className="text-3xl font-bold text-blue-700">
          Decrypt Data:{" "}
          <span className="text-gray-800 font-normal">{dataId}</span> 🔒
        </h2>
        <p className="text-gray-600">
          This process uses your locally stored **Secret Key** to securely
          reveal the private data from the server's encrypted result.
        </p>

        {/* Status Section */}
        <div className="border p-4 rounded-lg space-y-2 bg-yellow-50 border-yellow-300">
          <p className="text-sm font-medium text-gray-800">Current Status:</p>
          <p className="text-xs text-gray-600">
            **Ciphertext Fetch:**{" "}
            {isLoadingCiphertext ? (
              "Loading..."
            ) : isErrorCiphertext ? (
              <span className="text-red-500">
                Error: {ciphertextError?.message}
              </span>
            ) : (
              `Ready. Size: ${Math.round(
                ciphertextData!.ciphertextBase64.length / 1024
              )} KB`
            )}
          </p>
          <p className="text-xs text-gray-600">
            **Secret Key:**{" "}
            {secretKeyBase64 ? (
              <span className="text-green-600">Loaded locally.</span>
            ) : (
              <span className="text-red-500">MISSING. Cannot decrypt.</span>
            )}
          </p>
        </div>

        {/* Decrypt Button */}
        <button
          onClick={handleDecrypt}
          disabled={
            isLoadingCiphertext ||
            isErrorCiphertext ||
            !secretKeyBase64 ||
            !ciphertextData
          }
          className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition duration-200 ${
            isLoadingCiphertext || !secretKeyBase64 || !ciphertextData
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          Perform Local Decryption
        </button>

        {/* Results and Error Display */}
        {decryptionError && (
          <div className="bg-red-100 p-3 rounded-lg text-red-700 text-sm font-medium">
            {decryptionError}
          </div>
        )}

        {decryptedData && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-300 space-y-3">
            <h4 className="font-semibold text-green-700 text-lg">
              Decryption Successful!
            </h4>

            <label className="block text-sm font-medium text-gray-700">
              Decrypted Vector Data (showing first 10 values):
            </label>
            <code className="block whitespace-pre-wrap text-sm text-gray-800 bg-white p-3 rounded border font-mono">
              [
              {decryptedData
                .slice(0, 10)
                .map((n) => n.toFixed(4))
                .join(", ")}
              {decryptedData.length > 10 ? ", ..." : ""}]
            </code>
            <p className="text-xs text-gray-600">
              Total Decrypted Vector Size: **{decryptedData.length}**
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DecryptionPage;
