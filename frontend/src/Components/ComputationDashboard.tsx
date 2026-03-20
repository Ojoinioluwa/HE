import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyUploads } from "../API/he.ts";
import { executeHomomorphicComputation } from "../utils/heClient.ts";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// MUI Icons
import CalculateIcon from "@mui/icons-material/Calculate";
import AddIcon from "@mui/icons-material/Add";
import FunctionsIcon from "@mui/icons-material/Functions";
import CloseIcon from "@mui/icons-material/Close";
import InventoryIcon from "@mui/icons-material/Inventory";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack"; // Added for navigation
import DashboardIcon from "@mui/icons-material/Dashboard"; // Added for navigation

import type { CiphertextRecord } from "../types/heTypes.ts";

const ComputationPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: records, isLoading } = useQuery<CiphertextRecord[]>({
    queryKey: ["ciphertexts"],
    queryFn: getMyUploads,
  });

  const activeConstraint = useMemo(() => {
    if (selectedIds.length === 0 || !records) return null;
    return records.find((r) => r._id === selectedIds[0]) || null;
  }, [selectedIds, records]);

  const handleSelect = (record: CiphertextRecord) => {
    if (selectedIds.includes(record._id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== record._id));
      return;
    }

    if (activeConstraint && record.scheme !== activeConstraint.scheme) {
      toast.error(
        `Scheme Mismatch: Cannot mix ${record.scheme} with ${activeConstraint.scheme}`,
      );
      return;
    }

    setSelectedIds((prev) => [...prev, record._id]);
  };

  const onExecute = async (type: "sum" | "average") => {
    if (selectedIds.length === 0) return;

    setIsProcessing(true);
    const loadingId = toast.loading(`WASM Computing: ${type.toUpperCase()}...`);

    try {
      const result = await executeHomomorphicComputation(
        type,
        selectedIds,
        activeConstraint?.scheme || "ckks",
      );

      if (result.success) {
        toast.success("Computation Successful!", { id: loadingId });
        queryClient.invalidateQueries({ queryKey: ["ciphertexts"] });
        setSelectedIds([]);
        navigate(`/dashboard`);
      }
    } catch (error: any) {
      toast.error(error.message || "Computation failed", { id: loadingId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-12 font-sans selection:bg-blue-100">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb / Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all font-black text-[10px] uppercase tracking-widest mb-2"
        >
          <ArrowBackIcon
            sx={{ fontSize: 16 }}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Side: Asset Selection */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AutoAwesomeIcon
                    className="text-blue-600"
                    sx={{ fontSize: 18 }}
                  />
                  <span className="text-blue-600 font-black text-[10px] uppercase tracking-widest">
                    WASM-Powered Engine
                  </span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                  COMPUTATION LAB
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Select encrypted assets to perform zero-knowledge operations.
                </p>
              </div>
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-black text-red-500 hover:bg-red-50 px-4 py-2 rounded-2xl flex items-center gap-2 transition-all border border-transparent hover:border-red-100"
                >
                  <CloseIcon sx={{ fontSize: 14 }} /> CLEAR SELECTION
                </button>
              )}
            </header>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 bg-slate-200 rounded-[2.5rem]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {records?.map((record) => {
                  const isSelected = selectedIds.includes(record._id);
                  const isDisabled =
                    activeConstraint &&
                    record.scheme !== activeConstraint.scheme;
                  return (
                    <div
                      key={record._id}
                      onClick={() => !isDisabled && handleSelect(record)}
                      className={`group relative p-6 rounded-[2rem] border-2 transition-all duration-500 flex flex-col justify-between ${
                        isSelected
                          ? "bg-white border-blue-600 shadow-2xl shadow-blue-200 ring-1 ring-blue-600/20 -translate-y-1"
                          : isDisabled
                            ? "bg-slate-100 opacity-40 cursor-not-allowed border-transparent grayscale"
                            : "bg-white border-white hover:border-slate-200 shadow-sm hover:shadow-xl"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 text-blue-600 animate-bounce">
                          <CheckCircleIcon sx={{ fontSize: 24 }} />
                        </div>
                      )}

                      <div className="flex items-center gap-4 mb-6">
                        <div
                          className={`p-4 rounded-2xl transition-colors duration-300 ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                          }`}
                        >
                          <InventoryIcon />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-900 truncate leading-tight">
                            {record.dataId}
                          </h3>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                              isSelected
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {record.scheme}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          {record.metadata?.type || "Data Asset"}
                        </span>
                        <span className="text-[10px] text-slate-900 font-bold">
                          {((record.metadata?.sizeBytes || 0) / 1024).toFixed(
                            1,
                          )}{" "}
                          KB
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Side: Execution Panel */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] sticky top-12 border border-slate-800 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/10 blur-[100px] pointer-events-none" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                      <CalculateIcon />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight uppercase">
                        Runner
                      </h2>
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        Computation Core
                      </p>
                    </div>
                  </div>
                  {/* Secondary Dashboard Shortcut */}
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-500 hover:text-white transition-all"
                    title="Exit to Dashboard"
                  >
                    <DashboardIcon sx={{ fontSize: 20 }} />
                  </button>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 mb-10 border border-slate-800/50">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Selection Queue
                    </p>
                    <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">
                      {selectedIds.length} Files
                    </span>
                  </div>

                  {selectedIds.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                      <p className="text-slate-600 text-xs font-bold uppercase tracking-widest italic">
                        Waiting for Input...
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedIds.map((id) => {
                        const label =
                          records?.find((r) => r._id === id)?.dataId || id;
                        return (
                          <li
                            key={id}
                            className="flex items-center justify-between text-xs font-bold group/li"
                          >
                            <span className="truncate pr-4 text-slate-300">
                              / {label}
                            </span>
                            <span className="text-[9px] text-blue-500 opacity-0 group-hover/li:opacity-100 transition-opacity uppercase">
                              Ready
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="space-y-4">
                  <OpBtn
                    icon={<AddIcon />}
                    label="Summation"
                    sub="HOMOMORPHIC ADDITION"
                    onClick={() => onExecute("sum")}
                    disabled={selectedIds.length < 2 || isProcessing}
                  />
                  <OpBtn
                    icon={<FunctionsIcon />}
                    label="Average"
                    sub="MEAN (CKKS ONLY)"
                    onClick={() => onExecute("average")}
                    disabled={
                      selectedIds.length < 2 ||
                      isProcessing ||
                      activeConstraint?.scheme !== "ckks"
                    }
                  />
                </div>

                {isProcessing && (
                  <div className="mt-10 p-5 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500/20 rounded-full" />
                      <div className="absolute w-6 h-6 border-2 border-blue-400 border-t-transparent animate-spin rounded-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                        Execution in progress
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">
                        Results stored in vault
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OpBtn: React.FC<{
  icon: any;
  label: string;
  sub: string;
  onClick: () => void;
  disabled: boolean;
}> = ({ icon, label, sub, onClick, disabled }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`w-full group flex items-center justify-between p-6 rounded-[1.8rem] transition-all duration-300 border-2 active:scale-95 ${
      disabled
        ? "bg-slate-900/50 border-transparent text-slate-700 cursor-not-allowed"
        : "bg-slate-900 border-slate-800 text-white hover:bg-blue-600 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-900/40"
    }`}
  >
    <div className="flex items-center gap-4 text-left">
      <div
        className={`transition-colors ${disabled ? "text-slate-700" : "text-blue-400 group-hover:text-white"}`}
      >
        {icon}
      </div>
      <div>
        <p className="font-black text-sm uppercase tracking-tight leading-none">
          {label}
        </p>
        <p className="text-[8px] font-black uppercase tracking-[0.15em] opacity-40 mt-1">
          {sub}
        </p>
      </div>
    </div>
  </button>
);

export default ComputationPage;
