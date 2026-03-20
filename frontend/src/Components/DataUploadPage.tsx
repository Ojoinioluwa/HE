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
import { useNavigate } from "react-router-dom";

// MUI Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import ImageIcon from "@mui/icons-material/Image";
import LockIcon from "@mui/icons-material/Lock";

const IMAGE_HE_SIZE = 36;

const DataUploadPage: React.FC = () => {
  const { secretKeyBase64 } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  // Form State
  const [dataType, setDataType] = useState<"text" | "image">("text");
  const [rawData, setRawData] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dataId, setDataId] = useState(""); // Now auto-populated
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
        toast.error("Encryption engine offline.");
        console.error(err);
      }
    };
    setup();
  }, [secretKeyBase64]);

  // 2. Auto-generate Data ID based on input with duplicate prevention
  useEffect(() => {
    if (dataType === "image" && imageFile) {
      // 1. Get base name: "my_cat.jpg" -> "my_cat"
      const baseName = imageFile.name
        .split(".")[0]
        .replace(/[^a-zA-Z0-9]/g, "_");

      // 2. Add a unique suffix (Timestamp + Random string)
      // Example output: "my_cat_170845"
      const uniqueSuffix =
        Date.now().toString().slice(-4) +
        Math.random().toString(36).substring(2, 4);

      setDataId(`${baseName}_${uniqueSuffix}`);
    } else if (dataType === "text" && rawData.length > 0) {
      // For text, we generate a new ID only if the box was previously empty
      if (!dataId) {
        setDataId(`text_${Math.random().toString(36).substring(2, 8)}`);
      }
    } else if (!rawData && !imageFile) {
      setDataId("");
    }
  }, [imageFile, rawData, dataType, dataId]);

  // Image Preview
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const { mutateAsync: uploadMutate, isPending: uploadPending } = useMutation({
    mutationKey: ["UploadCiphertext"],
    mutationFn: (payload: UploadPayload) => uploadCiphertext(payload),
  });

  const getProcessedNumericVector = (text: string) => {
    const parts = text.split(",").map((p) => p.trim());
    const isNumericCsv =
      parts.length > 1 && parts.every((p) => !isNaN(parseFloat(p)));

    return isNumericCsv
      ? { vector: parts.map((p) => parseFloat(p)), format: "numeric-vector" }
      : {
          vector: Array.from(text).map((c) => c.charCodeAt(0)),
          format: "text-sequence",
        };
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return toast.error("Encryption not initialized.");

    const loadingToast = toast.loading("Encrypting and uploading...");

    try {
      let numericVector: number[] = [];
      const metadata: any = {
        type: dataType,
        uploadedAt: new Date().toISOString(),
        operation: "source",
      };

      if (dataType === "image" && imageFile) {
        const cloudFormData = new FormData();
        cloudFormData.append("file", imageFile);
        cloudFormData.append("upload_preset", "ml_default");
        cloudFormData.append("public_id", dataId);

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/drzpz8suu/image/upload`,
          { method: "POST", body: cloudFormData },
        );
        const cloudData = await cloudRes.json();

        metadata.displayUrl = cloudData.secure_url;
        metadata.fileName = `${dataId}.${cloudData.format}`;

        numericVector = await imageFileToNormalizedVector(
          imageFile,
          IMAGE_HE_SIZE,
        );
        metadata.format = "color-vector";
        metadata.channels = 3;
        metadata.width = metadata.height = IMAGE_HE_SIZE;
      } else {
        const { vector, format } = getProcessedNumericVector(rawData);
        numericVector = vector;
        metadata.format = format;
      }

      if (numericVector.length > 4096)
        throw new Error("Data too large for encryption slots.");

      const ciphertextBase64 = encryptData(new Float64Array(numericVector));
      metadata.sizeBytes = Math.floor(ciphertextBase64.length * 0.75);

      await uploadMutate({
        dataId,
        ciphertextBase64,
        scheme: "ckks",
        metadata,
      });

      toast.dismiss(loadingToast);
      toast.success("Data secured and uploaded!");
      setRawData("");
      setImageFile(null);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 font-sans selection:bg-blue-100">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="max-w-2xl mx-auto">
        {/* Top Navigation */}
        <button
          onClick={() => navigate("/dashboard")}
          className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm mb-6 transition-colors"
        >
          <ArrowBackIcon
            sx={{ fontSize: 18 }}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back to Vault
        </button>

        <div className="bg-white rounded-4xl shadow-2xl shadow-blue-900/5 border border-slate-100 overflow-hidden">
          {/* Hero Header */}
          <div className="bg-linear-to-r from-slate-900 to-slate-800 p-10 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <LockIcon className="text-blue-400" />
                <span className="text-blue-400 font-black text-xs uppercase tracking-[0.2em]">
                  Zero Knowledge Upload
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Protect Your Data
              </h1>
              <p className="text-slate-400 text-sm mt-2 max-w-md">
                Data is vectorized and encrypted using the CKKS scheme locally.
                We never see your raw information.
              </p>
            </div>
            <CloudUploadIcon
              className="absolute -right-4 -bottom-4 text-white/5"
              sx={{ fontSize: 160 }}
            />
          </div>

          <form onSubmit={handleUpload} className="p-8 space-y-8">
            {/* Toggle Switch */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full max-w-[300px] mx-auto">
              <button
                type="button"
                onClick={() => setDataType("text")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all ${
                  dataType === "text"
                    ? "bg-white shadow-lg text-blue-600"
                    : "text-slate-500"
                }`}
              >
                <TextFieldsIcon sx={{ fontSize: 16 }} /> TEXT/CSV
              </button>
              <button
                type="button"
                onClick={() => setDataType("image")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all ${
                  dataType === "image"
                    ? "bg-white shadow-lg text-blue-600"
                    : "text-slate-500"
                }`}
              >
                <ImageIcon sx={{ fontSize: 16 }} /> IMAGE
              </button>
            </div>

            {/* Main Input Area */}
            <div className="relative group">
              <div
                className={`min-h-[260px] border-2 border-dashed rounded-4xl transition-all duration-300 flex flex-col items-center justify-center p-6 ${
                  rawData || imageFile
                    ? "border-blue-500 bg-blue-50/30"
                    : "border-slate-200 bg-slate-50/50 hover:border-blue-300"
                }`}
              >
                {dataType === "text" ? (
                  <textarea
                    required
                    className="w-full h-48 bg-transparent outline-none resize-none font-mono text-sm p-4 text-slate-700 placeholder:text-slate-300"
                    placeholder="Paste CSV numbers (10, 20.5...) or raw text to encrypt..."
                    value={rawData}
                    onChange={(e) => setRawData(e.target.value)}
                  />
                ) : (
                  <div className="text-center">
                    {imagePreview ? (
                      <div className="relative group/preview">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-48 w-48 object-cover rounded-3xl shadow-2xl border-4 border-white"
                        />
                        <button
                          type="button"
                          onClick={() => setImageFile(null)}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full h-8 w-8 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block group/label">
                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover/label:scale-110 transition-transform">
                          <CloudUploadIcon sx={{ fontSize: 32 }} />
                        </div>
                        <span className="text-blue-600 font-black text-sm uppercase tracking-wider">
                          Select Image
                        </span>
                        <p className="text-slate-400 text-[10px] mt-2 font-bold">
                          PNG, JPG (AUTO-NORMALIZED TO 36x36)
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
            </div>

            {/* Auto-Generated Data ID View */}
            {dataId && (
              <div className="flex items-center justify-between px-6 py-3 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Target Data ID
                </span>
                <span className="text-sm font-mono font-bold text-blue-400">
                  {dataId}
                </span>
              </div>
            )}

            {/* Technical Breakdown Card */}
            {(rawData || imageFile) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                    Vector Size
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    {dataType === "image"
                      ? IMAGE_HE_SIZE * IMAGE_HE_SIZE * 3
                      : getProcessedNumericVector(rawData).vector.length}
                  </p>
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                    Slot Load
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    {Math.min(
                      100,
                      Math.round(
                        ((dataType === "image"
                          ? 3888
                          : getProcessedNumericVector(rawData).vector.length) /
                          4096) *
                          100,
                      ),
                    )}
                    %
                  </p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={uploadPending || !isReady || (!rawData && !imageFile)}
              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all transform active:scale-[0.98] shadow-2xl ${
                uploadPending || !isReady || (!rawData && !imageFile)
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              }`}
            >
              {uploadPending
                ? "Processing Cryptography..."
                : "Securely Encrypt & Upload"}
            </button>

            <div className="flex items-center justify-center gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
              <div className="h-px bg-slate-300 w-8" />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Microsoft SEAL JS • AES-256 Cloud Storage
              </p>
              <div className="h-px bg-slate-300 w-8" />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DataUploadPage;
