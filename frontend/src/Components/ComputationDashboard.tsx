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
import ShowChartIcon from "@mui/icons-material/ShowChart";

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
    // Match based on the internal _id
    return records.find((r) => r._id === selectedIds[0]) || null;
  }, [selectedIds, records]);

  const handleSelect = (record: CiphertextRecord) => {
    // Check selection using the unique _id
    if (selectedIds.includes(record._id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== record._id));
      return;
    }

    // Security check: ensure same scheme (CKKS/BFV) across the selection batch
    if (activeConstraint && record.scheme !== activeConstraint.scheme) {
      toast.error(
        `Scheme Mismatch: Cannot mix ${record.scheme} with ${activeConstraint.scheme}`
      );
      return;
    }

    setSelectedIds((prev) => [...prev, record._id]);
  };

  const onExecute = async (type: "sum" | "average" | "regression") => {
    if (selectedIds.length === 0) return;

    setIsProcessing(true);
    const loadingId = toast.loading(`WASM Computing: ${type.toUpperCase()}...`);

    try {
      const result = await executeHomomorphicComputation(
        type,
        selectedIds,
        activeConstraint?.scheme || "ckks"
      );

      if (result.success) {
        toast.success("Computation Successful!", { id: loadingId });
        queryClient.invalidateQueries({ queryKey: ["ciphertexts"] });
        setSelectedIds([]);
        // Result IDs from the backend use the database identifier for fetching
        navigate(`/dashboard`);
      }
    } catch (error: any) {
      toast.error(error.message || "Computation failed", { id: loadingId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Asset Selection */}
        <div className="lg:col-span-8 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                COMPUTATION LAB
              </h1>
              <p className="text-slate-500 text-sm font-medium">
                Select ciphertexts to process in the local HE engine.
              </p>
            </div>
            {selectedIds.length > 0 && (
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl flex items-center gap-1"
              >
                <CloseIcon sx={{ fontSize: 14 }} /> CLEAR
              </button>
            )}
          </header>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-4xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records?.map((record) => {
                const isSelected = selectedIds.includes(record._id);
                const isDisabled =
                  activeConstraint && record.scheme !== activeConstraint.scheme;
                return (
                  <div
                    key={record._id}
                    onClick={() => !isDisabled && handleSelect(record)}
                    className={`p-6 rounded-4xl border-2 cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "bg-white border-blue-500 shadow-xl ring-4 ring-blue-50"
                        : isDisabled
                        ? "bg-slate-100 opacity-50 cursor-not-allowed border-transparent"
                        : "bg-white border-transparent hover:border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`p-3 rounded-2xl ${
                          isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <InventoryIcon />
                      </div>
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                          isSelected
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {record.scheme}
                      </span>
                    </div>
                    {/* Visual label is still dataId for readability, selection is _id */}
                    <h3 className="font-bold text-slate-800 truncate">
                      {record.dataId}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {record.metadata?.type || "Encrypted Data"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Execution Panel */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl sticky top-8 border border-slate-800">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-blue-500/20 p-3 rounded-2xl border border-blue-500/30">
                <CalculateIcon className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight uppercase">
                  HE Runner
                </h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Local Privacy Guard
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-3xl p-6 mb-8 border border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                Selected Assets ({selectedIds.length})
              </p>
              {selectedIds.length === 0 ? (
                <p className="text-slate-400 text-sm italic">
                  Click assets to begin...
                </p>
              ) : (
                <ul className="space-y-3">
                  {selectedIds.map((id) => {
                    const label =
                      records?.find((r) => r._id === id)?.dataId || id;
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-3 text-sm font-bold truncate"
                      >
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />{" "}
                        {label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-3">
              <OpBtn
                icon={<AddIcon />}
                label="Summation"
                sub="Addition"
                onClick={() => onExecute("sum")}
                disabled={selectedIds.length < 2 || isProcessing}
              />
              <OpBtn
                icon={<FunctionsIcon />}
                label="Average"
                sub="Mean"
                onClick={() => onExecute("average")}
                disabled={
                  selectedIds.length < 2 ||
                  isProcessing ||
                  activeConstraint?.scheme !== "ckks"
                }
              />
              <OpBtn
                icon={<ShowChartIcon />}
                label="Regression"
                sub="Inference"
                onClick={() => onExecute("regression")}
                disabled={
                  selectedIds.length !== 1 ||
                  isProcessing ||
                  activeConstraint?.scheme !== "ckks"
                }
              />
            </div>

            {isProcessing && (
              <div className="mt-8 flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent animate-spin rounded-full" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  WASM Thread Active...
                </span>
              </div>
            )}
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
    className={`w-full flex items-center justify-between p-5 rounded-4xl transition-all border-2 ${
      disabled
        ? "bg-slate-800/30 border-transparent text-slate-600 cursor-not-allowed"
        : "bg-slate-800 border-slate-700 text-white hover:bg-blue-600 hover:border-blue-400"
    }`}
  >
    <div className="flex items-center gap-4 text-left">
      <div className={disabled ? "text-slate-600" : "text-blue-400"}>
        {icon}
      </div>
      <div>
        <p className="font-black text-sm">{label}</p>
        <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">
          {sub}
        </p>
      </div>
    </div>
  </button>
);

export default ComputationPage;
