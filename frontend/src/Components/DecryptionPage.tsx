import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCiphertextById } from "../API/he.ts";
import { decryptCiphertext } from "../utils/heClient";
import { Toaster, toast } from "react-hot-toast";
import Upscaler from "upscaler";

// MUI Icons
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TerminalIcon from "@mui/icons-material/Terminal";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloudDoneIcon from "@mui/icons-material/CloudDone";

import type { CiphertextRecord } from "../types/heTypes.ts";

interface DecryptionPageProps {
  secretKeyBase64: string;
}

const upscaler = new Upscaler();

const DecryptionPage: React.FC<DecryptionPageProps> = ({ secretKeyBase64 }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [processStep, setProcessStep] = useState<
    "idle" | "fetching" | "decrypting" | "reconstructing" | "complete"
  >("idle");

  const [decryptedResult, setDecryptedResult] = useState<{
    type: string;
    content: any;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const { data: record, isSuccess } = useQuery<CiphertextRecord>({
    queryKey: ["ciphertext", id],
    queryFn: () => getCiphertextById(id!),
    enabled: !!id,
    staleTime: Infinity,
  });

  const uploadToCloudinary = async (canvas: HTMLCanvasElement) => {
    // 1. Safety check: Ensure we have the record and dataId
    if (!record?.dataId || isSyncing) return;

    // 2. Predictive URL Check:
    // If the metadata already has a displayUrl, we don't need to do anything.
    if (record.metadata?.displayUrl) return;

    setIsSyncing(true);
    const syncToast = toast.loading(
      `Vaulting "${record.dataId}" to Cloudinary...`,
    );

    try {
      // 3. Prepare the Image Blob from the Decrypted/Upscaled Canvas
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      );

      const formData = new FormData();
      formData.append("file", blob);
      formData.append("upload_preset", "ml_default");

      /** * USE THE SCHEMA'S dataId
       * This sets the filename in Cloudinary to match your DB's dataId exactly.
       */
      formData.append("public_id", record.dataId);

      // 4. Upload to Cloudinary
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/drzpz8suu/image/upload`,
        { method: "POST", body: formData },
      );

      const cloudData = await res.json();

      if (cloudData.secure_url) {
        // 5. Update local React Query cache so the UI switches to the Cloud version immediately
        queryClient.setQueryData(["ciphertext", id], (old: any) => ({
          ...old,
          metadata: {
            ...old.metadata,
            displayUrl: cloudData.secure_url,
          },
        }));
      }
    } catch (err) {
      console.error("Cloudinary Sync Error:", err);
      toast.error("Cloud sync failed, showing local HE render", {
        id: syncToast,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const renderImage = useCallback(
    async (vector: Float64Array) => {
      const canvas = canvasRef.current;
      if (!canvas || !vector) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      const isAverage = record?.metadata?.operation === "average";
      const divisor =
        record?.metadata?.averageCount ||
        record?.metadata?.sourceDataIds?.length ||
        1;

      const size = 36;
      const totalPixels = size * size;

      canvas.width = size;
      canvas.height = size;
      const imageData = ctx.createImageData(size, size);

      for (let i = 0; i < totalPixels; i++) {
        const vIdx = i * 3;
        const canvasIdx = i * 4;
        if (vIdx + 2 >= vector.length) break;

        const r = isAverage ? vector[vIdx] / divisor : vector[vIdx];
        const g = isAverage ? vector[vIdx + 1] / divisor : vector[vIdx + 1];
        const b = isAverage ? vector[vIdx + 2] / divisor : vector[vIdx + 2];

        imageData.data[canvasIdx] = Math.min(
          255,
          Math.max(0, Math.round(r * 255)),
        );
        imageData.data[canvasIdx + 1] = Math.min(
          255,
          Math.max(0, Math.round(g * 255)),
        );
        imageData.data[canvasIdx + 2] = Math.min(
          255,
          Math.max(0, Math.round(b * 255)),
        );
        imageData.data[canvasIdx + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);

      try {
        await new Promise((r) => setTimeout(r, 10));
        const upscaledDataUrl = await upscaler.upscale(canvas);

        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            canvas.width = 512;
            canvas.height = 512;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, 512, 512);
            resolve(true);
          };
          img.onerror = reject;
          img.src = upscaledDataUrl;
        });

        toast.success("Image Quality Enhanced");

        // TRIGGER CLOUD SYNC: Only if displayUrl doesn't exist
        if (!record?.metadata?.displayUrl) {
          uploadToCloudinary(canvas);
        }
      } catch (e) {
        console.error("Upscaling failed", e);
        canvas.style.width = "512px";
        canvas.style.height = "512px";
      }
    },
    [record, id, queryClient],
  );

  useEffect(() => {
    if (
      processStep === "complete" &&
      decryptedResult?.type === "image" &&
      decryptedResult.content
    ) {
      const timeout = setTimeout(
        () => renderImage(decryptedResult.content),
        50,
      );
      return () => clearTimeout(timeout);
    }
  }, [processStep, decryptedResult, renderImage]);

  useEffect(() => {
    if (!isSuccess || !record || !secretKeyBase64 || processStep !== "idle")
      return;

    const executeFullSequence = async () => {
      try {
        setProcessStep("fetching");
        await new Promise((r) => setTimeout(r, 800));

        setProcessStep("decrypting");
        const vector = await decryptCiphertext(
          record.ciphertextBase64,
          secretKeyBase64,
        );

        setProcessStep("reconstructing");
        await new Promise((r) => setTimeout(r, 600));

        const dataType = record.metadata?.type || "text";
        if (dataType === "image") {
          setDecryptedResult({ type: "image", content: vector });
        } else if (
          record.metadata?.format === "numeric-vector" ||
          record.metadata?.operation
        ) {
          // ... (Numeric logic stays the same)
          const rawNumbers = Array.from(vector).filter(
            (n) => Math.abs(n) > 0.0001,
          );
          setDecryptedResult({
            type: "numeric-vector",
            content: rawNumbers.slice(0, 1),
          });
        } else {
          const text = Array.from(vector)
            .map((c) => String.fromCharCode(Math.round(c)))
            .join("")
            .replace(/\0/g, "");
          setDecryptedResult({ type: "text", content: text });
        }

        setProcessStep("complete");
        toast.success("Security Layer Decoupled");
      } catch (err: any) {
        toast.error("Process Failed");
        setProcessStep("idle");
      }
    };

    executeFullSequence();
  }, [isSuccess, record, secretKeyBase64, processStep]);

  const downloadDecryptedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `decrypted_${id?.slice(-6)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const stats = [
    { label: "Security Scheme", value: record?.scheme || "CKKS" },
    { label: "Payload Type", value: record?.metadata?.type || "Generic" },
    {
      label: "Storage Path",
      value: record?.metadata?.displayUrl ? "Cloudinary" : "WASM Local",
    },
    { label: "Identity Status", value: "Verified", color: "text-emerald-600" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 font-sans">
      <Toaster position="bottom-center" />
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all"
        >
          <ArrowBackIcon
            sx={{ fontSize: 18 }}
            className="group-hover:-translate-x-1 transition-transform"
          />
          EXIT SECURE VAULT
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
          <div className="bg-slate-900 p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                <TerminalIcon className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">
                  {record?.dataId}{" "}
                  <span className="text-slate-500 text-xs font-mono">
                    [{id?.slice(-6)}]
                  </span>
                </h1>
                <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mt-1">
                  Client-Side Decryption Active
                </p>
              </div>
            </div>
            <div
              className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${processStep === "complete" ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-blue-500/10 border-blue-500/50 text-blue-400"}`}
            >
              {record?.metadata?.displayUrl ? (
                <CloudDoneIcon fontSize="small" />
              ) : (
                <LockOpenIcon fontSize="small" />
              )}
              <span className="text-xs font-black uppercase tracking-tighter">
                {record?.metadata?.displayUrl
                  ? "Synced"
                  : processStep === "complete"
                    ? "Unlocked"
                    : "Encrypted"}
              </span>
            </div>
          </div>

          <div className="px-8 pt-8">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${processStep === "complete" ? "bg-emerald-500" : "bg-blue-600"}`}
                style={{
                  width:
                    processStep === "complete"
                      ? "100%"
                      : processStep === "reconstructing"
                        ? "75%"
                        : processStep === "decrypting"
                          ? "50%"
                          : "25%",
                }}
              />
            </div>
          </div>

          <div className="p-8">
            <div className="min-h-[350px] bg-slate-50 rounded-4xl border border-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
              {processStep !== "complete" ? (
                <div className="text-center z-10">
                  <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-4 mx-auto">
                    <InsertDriveFileIcon
                      className="text-slate-300 animate-pulse"
                      fontSize="large"
                    />
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Awaiting HE Reveal
                  </p>
                </div>
              ) : (
                <div className="w-full z-10">
                  {decryptedResult?.type === "image" && (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative group overflow-hidden rounded-lg shadow-2xl bg-slate-900 border-4 border-white w-full max-w-[400px]">
                        {record?.metadata?.displayUrl ? (
                          <div className="relative">
                            <img
                              src={record.metadata.displayUrl}
                              alt="Cloud Sync"
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <canvas
                              ref={canvasRef}
                              style={{
                                imageRendering: "pixelated",
                                width: "100%",
                              }}
                              className="aspect-square"
                            />
                            <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-tighter">
                              HE Decrypted
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={downloadDecryptedImage}
                          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-blue-600 transition-colors"
                        >
                          <InsertDriveFileIcon sx={{ fontSize: 16 }} /> EXPORT
                          PNG
                        </button>
                      </div>
                    </div>
                  )}
                  {/* ... other result types (numeric/text) */}
                  {decryptedResult?.type === "numeric-vector" && (
                    <div className="text-center">
                      <span className="font-mono font-black text-blue-600 text-5xl">
                        {decryptedResult.content[0]}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-100 divide-x divide-slate-100">
            {stats.map((stat, i) => (
              <div key={i} className="p-6 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {stat.label}
                </p>
                <p
                  className={`text-sm font-bold uppercase ${stat.color || "text-slate-700"}`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecryptionPage;
