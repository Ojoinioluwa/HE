// src/components/DataUploadPage.tsx (Modified to support Image Upload)

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAppDispatch } from "../redux/slice/hook.ts"; // Assuming you use Redux
import { setSecretKey } from "../redux/slice/authSlice"; // To save the secret key
import {
  initializeSEALClient,
  generateHEInitPayload,
  encryptData,
} from "../utils/heClient";
import { initializeHEContext, uploadCiphertext } from "../API/he.ts";
import { imageFileToNormalizedVector } from "../utils/imageProcessing"; // <-- NEW IMPORT

interface DataUploadPageProps {
  token: string;
}

const IMAGE_HE_SIZE = 32; // Forces image to 32x32 pixels (3072 vector size, safe for 4096 slots)

const DataUploadPage: React.FC<DataUploadPageProps> = ({ token }) => {
  const dispatch = useAppDispatch();

  // Form State
  const [dataType, setDataType] = useState<"text" | "image">("text");
  const [rawData, setRawData] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null); // NEW STATE
  const [dataId, setDataId] = useState("");

  // ... (initMutation remains the same, but update onSuccess to dispatch secret key) ...
  const initMutation = useMutation({
    mutationFn: async () => {
      await initializeSEALClient();
      const { keysAndParams, secretKeyBase64 } = generateHEInitPayload();
      console.log(keysAndParams);

      // 3. Dispatch Secret Key to Redux store (CRITICAL)
      dispatch(setSecretKey(secretKeyBase64));

      return initializeHEContext(token, keysAndParams);
    },
    onSuccess: () => {
      alert("HE System Initialized and Keys Exchanged successfully!");
    },
    onError: (error: Error) => {
      alert(`Initialization Failed: ${error.message}`);
    },
  });

  // --- STEP 3: Encrypt and Upload Data ---
  const uploadMutation = useMutation({
    mutationFn: async ({
      dataId,
      dataArray,
      metadata,
    }: {
      dataId: string;
      dataArray: number[];
      metadata: any;
    }) => {
      const ciphertextBase64 = encryptData(dataArray);

      const uploadPayload = {
        dataId: dataId,
        ciphertextBase64: ciphertextBase64,
        scheme: "ckks",
        metadata: metadata,
      };
      return uploadCiphertext(token, uploadPayload);
    },
    onSuccess: (data) => {
      alert(`Ciphertext uploaded successfully! ID: ${data.id}`);
      setRawData("");
      setImageFile(null);
      setDataId("");
    },
    onError: (error: Error) => {
      alert(`Upload Failed: ${error.message}`);
    },
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dataId) {
      alert("Please provide a unique Data ID.");
      return;
    }

    let dataArray: number[] = [];
    let metadata = {};

    try {
      if (dataType === "text") {
        // Handle comma-separated text data
        dataArray = rawData
          .split(",")
          .map((s) => parseFloat(s.trim()))
          .filter((n) => !isNaN(n));
        metadata = { sourceType: "vector", vectorSize: dataArray.length };
      } else if (dataType === "image" && imageFile) {
        // Handle image file data
        dataArray = await imageFileToNormalizedVector(imageFile, IMAGE_HE_SIZE);
        metadata = {
          sourceType: "image",
          imageSize: `${IMAGE_HE_SIZE}x${IMAGE_HE_SIZE}`,
          vectorSize: dataArray.length,
        };
      }
    } catch (error: any) {
      alert(`Data Conversion Error: ${error.message}`);
      return;
    }

    if (dataArray.length === 0) {
      alert("Input data is invalid or empty.");
      return;
    }

    if (!initMutation.isSuccess) {
      alert("ERROR: Please initialize the HE system (Step 1) first.");
      return;
    }

    uploadMutation.mutate({ dataId, dataArray, metadata });
  };

  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-2xl space-y-8">
        <h2 className="text-3xl font-bold text-blue-700">
          Homomorphic Data Upload 🛡️
        </h2>

        {/* --- Step 1: Initialization (Same as before) --- */}
        <div className="border p-5 rounded-lg border-blue-200 bg-blue-50">
          <h3 className="text-xl font-semibold text-blue-600 mb-3">
            Step 1: Initialize HE Context & Exchange Keys
          </h3>
          <button
            onClick={() => initMutation.mutate()}
            disabled={initMutation.isPending}
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition duration-200 ${
              initMutation.isPending
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {initMutation.isPending
              ? "Initializing SEAL..."
              : "Initialize HE System & Exchange Keys"}
          </button>
          {/* ... (Success/Error messages) ... */}
        </div>

        {/* --- Step 2: Encrypt and Upload Data (Modified) --- */}
        <div
          className={`border p-5 rounded-lg ${
            initMutation.isSuccess ? "border-green-300" : "border-gray-300"
          }`}
        >
          <h3 className="text-xl font-semibold text-green-700 mb-3">
            Step 2: Encrypt & Upload Data
          </h3>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="dataId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Unique Data Identifier
              </label>
              <input
                type="text"
                id="dataId"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={dataId}
                onChange={(e) => setDataId(e.target.value)}
                placeholder="e.g., Cat_Image_1 or Q4_Sales"
                required
                disabled={!initMutation.isSuccess}
              />
            </div>

            {/* Data Type Selector */}
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <input
                  type="radio"
                  name="dataType"
                  value="text"
                  checked={dataType === "text"}
                  onChange={() => setDataType("text")}
                  disabled={!initMutation.isSuccess}
                />
                Raw Vector Data
              </label>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <input
                  type="radio"
                  name="dataType"
                  value="image"
                  checked={dataType === "image"}
                  onChange={() => setDataType("image")}
                  disabled={!initMutation.isSuccess}
                />
                Encrypt Image
              </label>
            </div>

            {/* Conditional Input Field */}
            {dataType === "text" && (
              <div>
                <label
                  htmlFor="rawData"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Raw Data (Comma-Separated Numbers)
                </label>
                <textarea
                  id="rawData"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono"
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  placeholder="e.g., 100.5, 20.3, 55.7, 88.0"
                  required
                  disabled={!initMutation.isSuccess}
                />
              </div>
            )}

            {dataType === "image" && (
              <div className="border-l-4 border-yellow-500 pl-3">
                <label
                  htmlFor="imageFile"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Image File (Will be resized to {IMAGE_HE_SIZE}x{IMAGE_HE_SIZE}
                  )
                </label>
                <input
                  type="file"
                  id="imageFile"
                  accept="image/*"
                  onChange={(e) =>
                    setImageFile(e.target.files ? e.target.files[0] : null)
                  }
                  className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  required
                  disabled={!initMutation.isSuccess}
                />
                {imageFile && (
                  <p className="mt-2 text-xs text-gray-500">
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={uploadMutation.isPending || !initMutation.isSuccess}
              className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition duration-200 ${
                uploadMutation.isPending || !initMutation.isSuccess
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {uploadMutation.isPending
                ? "Encrypting & Uploading..."
                : "Encrypt Data & Store on Server"}
            </button>
          </form>
          {/* ... (Success/Error messages) ... */}
        </div>
      </div>
    </div>
  );
};

export default DataUploadPage;
