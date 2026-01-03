import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import {
  initializeSEALClient,
  encryptData,
  initializeEncryptorFromKey,
} from "../utils/heClient";
import { uploadCiphertext } from "../API/he";
import type { UploadPayload } from "../API/he";
import { imageFileToNormalizedVector } from "../utils/imageProcessing";
import { toast, Toaster } from "react-hot-toast";

const IMAGE_HE_SIZE = 36;

const DataUploadPage: React.FC = () => {
  const { secretKeyBase64 } = useSelector((state: RootState) => state.auth);

  // Form State
  const [dataType, setDataType] = useState<"text" | "image">("text");
  const [rawData, setRawData] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dataId, setDataId] = useState("");
  const [isReady, setIsReady] = useState(false);

  // 1. Sync Encryption Engine
  useEffect(() => {
    const setup = async () => {
      try {
        await initializeSEALClient();
        if (secretKeyBase64) {
          await initializeEncryptorFromKey(secretKeyBase64);
          setIsReady(true);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to initialize encryption engine.");
      }
    };
    setup();
  }, [secretKeyBase64]);

  // 2. Image Preview Effect
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  // 3. Mutation using your requested style
  const { mutateAsync: uploadMutate, isPending: uploadPending } = useMutation({
    mutationKey: ["UploadCiphertext"],
    mutationFn: (payload: UploadPayload) => uploadCiphertext(payload), // Remove 'token' argument
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return toast.error("Encryption not initialized.");

    try {
      let numericVector: number[] = [];
      let metadata: any = {
        type: dataType,
        uploadedAt: new Date().toISOString(),
      };

      // 1. --- Processing Logic ---
      if (dataType === "text") {
        numericVector = Array.from(rawData).map((c) => c.charCodeAt(0));
        metadata.charCount = rawData.length;
        metadata.format = "text-sequence";
      } else if (dataType === "image" && imageFile) {
        // Using IMAGE_HE_SIZE = 26
        numericVector = await imageFileToNormalizedVector(
          imageFile,
          IMAGE_HE_SIZE
        );

        // Verification: 36 * 36 * 3 = 2028
        metadata.resolution = `${IMAGE_HE_SIZE}x${IMAGE_HE_SIZE}`;
        metadata.channels = "RGB";
        metadata.format = "color-vector";
        metadata.pixelCount = IMAGE_HE_SIZE * IMAGE_HE_SIZE;
      }

      // 2. --- Strict Capacity Validation (For polyModulusDegree: 4096) ---
      // Inside handleUpload in DataUploadPage.tsx
      const MAX_SLOTS = 4096; // 8192 / 2 = 4096 slots available

      if (numericVector.length > MAX_SLOTS) {
        throw new Error(
          `Data size (${numericVector.length}) exceeds ${MAX_SLOTS} limit.`
        );
      }

      if (numericVector.length === 0) throw new Error("No data provided");

      // if (numericVector.length > MAX_SLOTS) {
      //   throw new Error(
      //     `Data size (${numericVector.length}) exceeds 2048 limit. ` +
      //       `Current RGB 26x26 uses 2028 slots.`
      //   );
      // }

      // 3. --- Encryption with Typed Array ---
      // Converting to Float64Array here prevents the std::invalid_argument error
      const floatArray = new Float64Array(numericVector);
      const ciphertextBase64 = encryptData(floatArray);

      // 4. --- Calculate Ciphertext Storage Size ---
      // This allows the dashboard to show the KB size before downloading
      const sizeInBytes = Math.floor(ciphertextBase64.length * (3 / 4));
      metadata.sizeBytes = sizeInBytes;

      const payload: UploadPayload = {
        dataId,
        ciphertextBase64,
        scheme: "ckks",
        metadata,
      };

      // 5. --- Execution ---
      await uploadMutate(payload);

      toast.success(
        `Securely uploaded ${dataType} (${Math.round(sizeInBytes / 1024)} KB)`
      );

      // Reset Form
      setRawData("");
      setImageFile(null);
      setDataId("");
    } catch (err: any) {
      console.error("Upload Error:", err);
      toast.error(err.message || "Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center items-center">
      <Toaster position="top-right" />
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <h1 className="text-2xl font-bold">Secure Data Upload</h1>
          <p className="text-slate-400 text-sm">
            Your data never leaves this browser unencrypted.
          </p>
        </div>

        <form onSubmit={handleUpload} className="p-8 space-y-6">
          {/* Unique Data ID Input */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
              Unique Data ID
            </label>
            <input
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. medical_record_001"
              value={dataId}
              onChange={(e) => setDataId(e.target.value)}
            />
          </div>

          {/* Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            {(["text", "image"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDataType(type)}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                  dataType === type
                    ? "bg-white shadow text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Upload/Input Area */}
          <div className="min-h-[200px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col justify-center items-center p-4 bg-slate-50/50">
            {dataType === "text" ? (
              <textarea
                required
                className="w-full h-40 bg-transparent outline-none resize-none font-mono text-sm p-2"
                placeholder="Enter character sequence..."
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
              />
            ) : (
              <div className="text-center w-full">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-40 w-40 object-cover rounded-lg shadow-md border-4 border-white"
                    />
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs shadow-lg hover:bg-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer py-10 block group">
                    <span className="text-blue-600 font-bold underline group-hover:text-blue-700">
                      Select Image
                    </span>
                    <p className="text-slate-400 text-xs mt-2">
                      JPG, PNG supported (Auto-resized to 26x26)
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) =>
                        setImageFile(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* NEW: Live Encryption Metadata Summary */}
          {(rawData || imageFile) && (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 space-y-3">
              <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
                Pre-Encryption Summary
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-blue-600 font-medium">
                    Vector Length
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {dataType === "text" ? rawData.length : 26 * 26 * 3}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-blue-600 font-medium">
                    Slot Capacity
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {Math.round(
                      ((dataType === "text" ? rawData.length : 2028) / 2048) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-blue-600 font-medium">
                    Resolution
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {dataType === "image" ? "26 × 26" : "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-blue-600 font-medium">
                    Color Mode
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {dataType === "image" ? "RGB" : "UTF-8"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploadPending || !isReady}
            className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all transform active:scale-[0.98] ${
              uploadPending || !isReady
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:shadow-xl"
            }`}
          >
            {uploadPending ? "ENCRYPTING DATA..." : "PROTECT & UPLOAD"}
          </button>

          <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Powered by Microsoft SEAL • CKKS Scheme
          </p>
        </form>
      </div>
    </div>
  );
};

export default DataUploadPage;
