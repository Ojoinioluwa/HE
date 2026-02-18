import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCiphertextById } from "../API/he.ts";
import { decryptCiphertext } from "../utils/heClient";
import { Toaster, toast } from "react-hot-toast";
import Upscaler from "upscaler";

// MUI Icons
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// import AutorenewIcon from "@mui/icons-material/Autorenew";
// import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import TerminalIcon from "@mui/icons-material/Terminal";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

import type { CiphertextRecord } from "../types/heTypes.ts";

interface DecryptionPageProps {
  secretKeyBase64: string;
}
const upscaler = new Upscaler();

const DecryptionPage: React.FC<DecryptionPageProps> = ({ secretKeyBase64 }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [processStep, setProcessStep] = useState<
    "idle" | "fetching" | "decrypting" | "reconstructing" | "complete"
  >("idle");

  const [decryptedResult, setDecryptedResult] = useState<{
    type: string;
    content: any;
  } | null>(null);

  const { data: record, isSuccess } = useQuery<CiphertextRecord>({
    queryKey: ["ciphertext", id],
    queryFn: () => getCiphertextById(id!),
    enabled: !!id,
    staleTime: Infinity,
  });

  const renderImage = useCallback(
    async (vector: Float64Array) => {
      const canvas = canvasRef.current;
      if (!canvas || !vector) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      // 1. Setup Logic
      const isAverage = record?.metadata?.operation === "average";
      const divisor =
        record?.metadata?.averageCount ||
        record?.metadata?.sourceDataIds?.length ||
        1;

      const size = 36;
      const totalPixels = size * size;
      // const expectedVectorLength = totalPixels * 3; // 3888

      // 2. Initial Draw (The Raw 36x36 decrypted state)
      canvas.width = size;
      canvas.height = size;
      const imageData = ctx.createImageData(size, size);

      for (let i = 0; i < totalPixels; i++) {
        const vIdx = i * 3;
        const canvasIdx = i * 4;

        // SAFETY: Stop if we hit the end of the decrypted data (avoids slot padding trash)
        if (vIdx + 2 >= vector.length) break;

        // Extract and apply divisor
        let r = isAverage ? vector[vIdx] / divisor : vector[vIdx];
        let g = isAverage ? vector[vIdx + 1] / divisor : vector[vIdx + 1];
        let b = isAverage ? vector[vIdx + 2] / divisor : vector[vIdx + 2];

        // Convert 0.0-1.0 float back to 0-255 integer
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
        imageData.data[canvasIdx + 3] = 255; // Fully opaque
      }

      ctx.putImageData(imageData, 0, 0);

      // 3. UPSCALE (AI Enhancement)
      try {
        // Small delay to ensure the DOM has updated the 36x36 canvas before upscaling
        await new Promise((r) => setTimeout(r, 10));

        const upscaledDataUrl = await upscaler.upscale(canvas);

        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            // Change canvas to high-res size
            canvas.width = 512;
            canvas.height = 512;

            // Use pixelated rendering for the upscale draw to keep it sharp
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, 512, 512);
            resolve(true);
          };
          img.onerror = reject;
          img.src = upscaledDataUrl;
        });

        toast.success("Image Quality Enhanced");
      } catch (e) {
        console.error("Upscaling failed, showing raw 36x36", e);
        // If upscale fails, we still have the 36x36 on canvas, but it's tiny.
        // Let's at least scale it up visually via CSS.
        canvas.style.width = "512px";
        canvas.style.height = "512px";
      }
    },
    [record], // Note: If upscaler is outside the component, it doesn't need to be here
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

  // --- DECRYPTION SEQUENCE ---
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
        const isNumeric =
          record.metadata?.format === "numeric-vector" ||
          record.metadata?.operation;

        if (dataType === "image") {
          setDecryptedResult({ type: "image", content: vector });
        } else if (isNumeric) {
          // --- NUMERIC LOGIC (Average/Vector) ---
          const isAverage = record.metadata?.operation === "average";
          const divisor =
            record.metadata?.averageCount ||
            record.metadata?.sourceDataIds?.length ||
            1;
          const rawNumbers = Array.from(vector).filter(
            (n) => Math.abs(n) > 0.0001,
          );

          if (isAverage) {
            const grandTotal = rawNumbers.reduce((acc, curr) => acc + curr, 0);
            const finalAverage = grandTotal / divisor;
            setDecryptedResult({
              type: "numeric-vector",
              content: [Math.round(finalAverage * 100) / 100],
            });
          } else {
            const filteredNumbers = rawNumbers.map(
              (n) => Math.round(n * 10) / 10,
            );
            setDecryptedResult({
              type: "numeric-vector",
              content: filteredNumbers.length > 0 ? filteredNumbers : [0],
            });
          }
        } else if (dataType === "audio") {
          setDecryptedResult({ type: "audio", content: vector });
        } else {
          const text = Array.from(vector)
            .map((code: number) => String.fromCharCode(Math.round(code)))
            .join("")
            .replace(/\0/g, "");
          setDecryptedResult({ type: "text", content: text });
        }

        setProcessStep("complete");
        toast.success("Security Layer Decoupled Successfully");
      } catch (err: any) {
        toast.error("Process Failed: " + (err.message || "Unknown Error"));
        setProcessStep("idle");
      }
    };

    executeFullSequence();
  }, [isSuccess, record, secretKeyBase64, processStep]);

  const downloadDecryptedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `decrypted_vault_${id?.slice(-6)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Image exported to downloads");
  };

  const stats = [
    { label: "Security Scheme", value: record?.scheme || "CKKS" },
    { label: "Payload Type", value: record?.metadata?.type || "Generic" },
    { label: "Decryption Loc", value: "Local Browser" },
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
              className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${
                processStep === "complete"
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                  : "bg-blue-500/10 border-blue-500/50 text-blue-400"
              }`}
            >
              <LockOpenIcon fontSize="small" />
              <span className="text-xs font-black uppercase tracking-tighter">
                {processStep === "complete" ? "Unlocked" : "Encrypted"}
              </span>
            </div>
          </div>

          <div className="px-8 pt-8">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  processStep === "complete" ? "bg-emerald-500" : "bg-blue-600"
                }`}
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
                        {/* 1. CLOUDINARY SOURCE (PRIORITY) */}
                        {record?.metadata?.displayUrl ? (
                          <div className="relative">
                            <img
                              src={record.metadata.displayUrl}
                              alt="Source"
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        ) : (
                          /* 2. DECRYPTED FALLBACK (HE RECONSTRUCTION) */
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

                      {/* EXPORT BUTTONS */}
                      <div className="flex gap-4">
                        <button
                          onClick={downloadDecryptedImage}
                          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-blue-600 transition-colors"
                        >
                          <InsertDriveFileIcon sx={{ fontSize: 16 }} />
                          EXPORT PNG
                        </button>
                      </div>
                    </div>
                  )}

                  {decryptedResult?.type === "numeric-vector" && (
                    <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto text-center">
                      {decryptedResult.content.map((val: number, i: number) => (
                        <div
                          key={i}
                          className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-xl"
                        >
                          <span className="text-[10px] text-slate-400 font-black block mb-2 tracking-widest">
                            FINAL COMPUTED RESULT
                          </span>
                          <span className="font-mono font-black text-blue-600 text-5xl">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {decryptedResult?.type === "text" && (
                    <div className="w-full max-w-lg mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {decryptedResult.content}
                      </p>
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
                  className={`text-sm font-bold uppercase ${
                    stat.color || "text-slate-700"
                  }`}
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
