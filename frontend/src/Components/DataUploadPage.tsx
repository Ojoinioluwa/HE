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
import SyncIcon from "@mui/icons-material/Sync";
import { useNavigate } from "react-router-dom";

// const IMAGE_HE_SIZE = 32;

const DataUploadPage: React.FC = () => {
  const { secretKeyBase64 } = useSelector((state: RootState) => state.auth);

  // Form State
  const [dataType, setDataType] = useState<"text" | "image">("text");
  const [rawData, setRawData] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dataId, setDataId] = useState("");
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  // Helper to determine if text is actually a CSV of numbers
  const getProcessedNumericVector = (
    text: string,
  ): { vector: number[]; format: string } => {
    // Check if the string contains numbers separated by commas
    const parts = text.split(",").map((p) => p.trim());
    const isNumericCsv =
      parts.length > 1 &&
      parts.every((p) => !isNaN(parseFloat(p)) && isFinite(Number(p)));

    if (isNumericCsv) {
      return {
        vector: parts.map((p) => parseFloat(p)),
        format: "numeric-vector",
      };
    } else {
      return {
        vector: Array.from(text).map((c) => c.charCodeAt(0)),
        format: "text-sequence",
      };
    }
  };

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

  // 3. Mutation
  const { mutateAsync: uploadMutate, isPending: uploadPending } = useMutation({
    mutationKey: ["UploadCiphertext"],
    mutationFn: (payload: UploadPayload) => uploadCiphertext(payload),
  });

  // 1. Update the size to match your decryption logic
  const IMAGE_HE_SIZE = 36;

  // ... (Inside DataUploadPage component)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return toast.error("Encryption not initialized.");

    try {
      let numericVector: number[] = [];
      const metadata: any = {
        type: dataType,
        uploadedAt: new Date().toISOString(),
        project: "Homomorphic Encryption Dashboard",
        operation: "source", // Explicitly set for raw uploads
      };

      // --- STEP 1: CLOUDINARY UPLOAD ---
      if (dataType === "image" && imageFile) {
        const cloudFormData = new FormData();
        cloudFormData.append("file", imageFile);
        cloudFormData.append("upload_preset", "ml_default");
        cloudFormData.append("api_key", "244376938292441");

        // Use your unique dataId as the public_id in Cloudinary
        // This ensures the URL contains your unique ID
        cloudFormData.append("public_id", dataId);

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/drzpz8suu/image/upload`,
          { method: "POST", body: cloudFormData },
        );

        const cloudData = await cloudRes.json();
        if (cloudData.error)
          throw new Error(`Cloudinary: ${cloudData.error.message}`);

        // Store the high-res URL and use dataId for the filename record
        metadata.displayUrl = cloudData.secure_url;
        metadata.fileName = `${dataId}.${cloudData.format}`; // e.g., "my_unique_id.jpg"
      }

      // --- STEP 2: VECTORIZATION & ENCRYPTION ---
      if (dataType === "text") {
        const { vector, format } = getProcessedNumericVector(rawData);
        numericVector = vector;
        metadata.format = format;
        metadata.charCount =
          format === "text-sequence" ? rawData.length : undefined;
      } else if (dataType === "image" && imageFile) {
        numericVector = await imageFileToNormalizedVector(
          imageFile,
          IMAGE_HE_SIZE,
        );
        metadata.format = "color-vector";
        metadata.channels = 3;
        metadata.width = IMAGE_HE_SIZE;
        metadata.height = IMAGE_HE_SIZE;
        metadata.vectorLength = numericVector.length;
      }

      // Capacity Check (Standard for 8192 degree)
      if (numericVector.length > 4096)
        throw new Error("Data exceeds slot limit.");
      if (numericVector.length === 0) throw new Error("No data provided");

      const floatArray = new Float64Array(numericVector);
      const ciphertextBase64 = encryptData(floatArray);

      // Final Payload
      metadata.sizeBytes = Math.floor(ciphertextBase64.length * (3 / 4));

      const payload: UploadPayload = {
        dataId,
        ciphertextBase64,
        scheme: "ckks",
        metadata,
      };

      await uploadMutate(payload);

      toast.success(`Securely uploaded ${dataType}!`);

      // Reset
      setRawData("");
      setImageFile(null);
      setDataId("");
    } catch (err: any) {
      console.error("Upload Error:", err);
      toast.error(err.message || "Upload failed");
    }
  };

  // UI Calculations for the summary box
  const summaryInfo = (() => {
    if (dataType === "image") {
      return {
        length: IMAGE_HE_SIZE * IMAGE_HE_SIZE * 3,
        mode: "RGB (Vectorized)",
      };
    }
    if (!rawData) return { length: 0, mode: "Waiting..." };

    const { vector, format } = getProcessedNumericVector(rawData);
    return {
      length: vector.length,
      mode: format === "numeric-vector" ? "Numeric CSV" : "UTF-8 Text",
    };
  })();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center items-center">
      <Toaster position="top-right" />
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <h1 className="text-2xl font-bold">Secure Data Upload</h1>
          <p className="text-slate-400 text-sm">
            Your data is converted to vectors and encrypted locally before
            upload.
          </p>
        </div>

        <div className="px-8 pt-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
          >
            <SyncIcon sx={{ fontSize: 18 }} /> Go to Dashboard
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
              Unique Data ID
            </label>
            <input
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. sensor_data_alpha"
              value={dataId}
              onChange={(e) => setDataId(e.target.value)}
            />
          </div>

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

          <div className="min-h-[200px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col justify-center items-center p-4 bg-slate-50/50">
            {dataType === "text" ? (
              <textarea
                required
                className="w-full h-40 bg-transparent outline-none resize-none font-mono text-sm p-2"
                placeholder="Enter text OR comma-separated numbers (e.g. 10, 25.5, 30)..."
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
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs shadow-lg"
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
                      JPG, PNG (Auto-resized to {IMAGE_HE_SIZE}x{IMAGE_HE_SIZE})
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
                    {summaryInfo.length}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-blue-600 font-medium">
                    Slot Usage
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {Math.round((summaryInfo.length / 4096) * 100)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-blue-600 font-medium">
                    Data Mode
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {summaryInfo.mode}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-blue-600 font-medium">
                    HE Scheme
                  </span>
                  <span className="text-sm font-bold text-slate-900">CKKS</span>
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
