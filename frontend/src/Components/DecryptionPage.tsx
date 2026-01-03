import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCiphertextById } from "../API/he.ts";
import { decryptCiphertext } from "../utils/heClient";
import { Toaster, toast } from "react-hot-toast";

// MUI Icons
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import TerminalIcon from "@mui/icons-material/Terminal";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

import type { CiphertextRecord } from "../types/heTypes.ts";

interface DecryptionPageProps {
  secretKeyBase64: string;
}

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

  // 1. Fetch Ciphertext
  const { data: record, isSuccess } = useQuery<CiphertextRecord>({
    queryKey: ["ciphertext", id],
    queryFn: () => getCiphertextById(id!),
    enabled: !!id,
    staleTime: Infinity,
  });

  // 2. Image Reconstruction logic
  const renderImage = useCallback((vector: Float64Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // 1. Calculate the real size (now 64x64)
    const sourceSize = Math.floor(Math.sqrt(vector.length / 3));
    const displaySize = 512;

    // 2. Create raw pixel buffer
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sourceSize;
    tempCanvas.height = sourceSize;
    const tempCtx = tempCanvas.getContext("2d")!;
    const imageData = tempCtx.createImageData(sourceSize, sourceSize);

    for (let i = 0; i < sourceSize * sourceSize; i++) {
      const vIdx = i * 3;
      const canvasIdx = i * 4;
      // We add a Math.round and clamp to ensure colors are crisp
      imageData.data[canvasIdx] = Math.max(
        0,
        Math.min(255, Math.round(vector[vIdx] * 255))
      );
      imageData.data[canvasIdx + 1] = Math.max(
        0,
        Math.min(255, Math.round(vector[vIdx + 1] * 255))
      );
      imageData.data[canvasIdx + 2] = Math.max(
        0,
        Math.min(255, Math.round(vector[vIdx + 2] * 255))
      );
      imageData.data[canvasIdx + 3] = 255;
    }
    tempCtx.putImageData(imageData, 0, 0);

    // 3. Sharp Scaling
    canvas.width = displaySize;
    canvas.height = displaySize;

    // Set to FALSE to keep the edges sharp if you want it to look "Exact"
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      tempCanvas,
      0,
      0,
      sourceSize,
      sourceSize,
      0,
      0,
      displaySize,
      displaySize
    );
  }, []);

  // 3. EFFECT: Watch for completion to draw on Canvas
  useEffect(() => {
    if (
      processStep === "complete" &&
      decryptedResult?.type === "image" &&
      decryptedResult.content
    ) {
      // Use requestAnimationFrame or a tiny timeout to ensure the canvas ref is bound
      const timeout = setTimeout(() => {
        renderImage(decryptedResult.content);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [processStep, decryptedResult, renderImage]);

  const downloadDecryptedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary link element
    const link = document.createElement("a");
    link.download = `decrypted_vault_${id?.slice(-6)}.png`;

    // Convert canvas to DataURL (PNG)
    link.href = canvas.toDataURL("image/png");

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Image exported to downloads");
  };

  // 4. Main Decryption Logic
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
          secretKeyBase64
        );

        setProcessStep("reconstructing");
        await new Promise((r) => setTimeout(r, 600));

        const dataType = record.metadata?.type || "text";

        if (dataType === "image") {
          // Store vector so the canvas effect can pick it up
          setDecryptedResult({ type: "image", content: vector });
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
        console.error("Decryption error:", err);
        toast.error("Process Failed: " + (err.message || "Unknown Error"));
        setProcessStep("idle");
      }
    };

    executeFullSequence();
  }, [isSuccess, record, secretKeyBase64, processStep]);

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

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100">
          {/* Header */}
          <div className="bg-slate-900 p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                <TerminalIcon className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
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

          {/* Progress Section */}
          <div className="px-8 pt-8">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
              <span>System Sequence</span>
              <span>
                {processStep === "complete" ? "100%" : "Processing..."}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-out ${
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
            <p className="text-xs font-bold text-slate-500 mt-3 flex items-center gap-2">
              {processStep !== "complete" && (
                <AutorenewIcon
                  className="animate-spin text-blue-600"
                  sx={{ fontSize: 14 }}
                />
              )}
              {processStep === "complete" && (
                <CheckCircleOutlineIcon
                  className="text-emerald-500"
                  sx={{ fontSize: 14 }}
                />
              )}
              <span className="uppercase">{processStep}:</span>{" "}
              <span className="text-slate-900 font-mono capitalize">
                {processStep === "fetching"
                  ? "Downloading Ciphertext"
                  : processStep === "decrypting"
                  ? "Solving CKKS Polynomials"
                  : "Reconstructing Original Buffer"}
              </span>
            </p>
          </div>

          {/* Main Display Area */}
          <div className="p-8">
            <div className="min-h-[350px] bg-slate-50 rounded-[2rem] border border-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none font-mono text-[8px] break-all p-4 leading-tight">
                {record?.ciphertextBase64.slice(0, 2000)}
              </div>

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
                      <div className="p-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                        <canvas
                          ref={canvasRef}
                          /* Width and Height are set dynamically in renderImage */
                          className="w-full max-w-[400px] aspect-square rounded-lg bg-slate-900"
                          style={{
                            display: "block",
                            imageRendering: "auto", // Change from pixelated to auto
                          }}
                        />
                      </div>

                      <button
                        onClick={downloadDecryptedImage}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                      >
                        <InsertDriveFileIcon sx={{ fontSize: 16 }} />
                        EXPORT HIGH-RES PNG
                      </button>
                    </div>
                  )}

                  {decryptedResult?.type === "text" && (
                    <div className="w-full max-w-lg mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {decryptedResult.content}
                      </p>
                    </div>
                  )}

                  {decryptedResult?.type === "audio" && (
                    <div className="w-full max-w-md mx-auto bg-slate-900 p-8 rounded-3xl shadow-2xl text-white">
                      <div className="flex items-end justify-center gap-0.5 h-24 mb-6">
                        {Array.from(decryptedResult.content)
                          .slice(0, 40)
                          .map((val: any, i: number) => (
                            <div
                              key={i}
                              className="w-2 bg-blue-500 rounded-full"
                              style={{
                                height: `${Math.max(5, Math.abs(val) * 100)}%`,
                                opacity: 0.3 + i / 40,
                              }}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Stats */}
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
