import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyUploads } from "../API/he.ts";
import type { CiphertextSummary } from "../API/he.ts";
import { useNavigate } from "react-router-dom";

// MUI Icons
import StorageIcon from "@mui/icons-material/Storage";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import SyncIcon from "@mui/icons-material/Sync";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloudUploadIcon from "@mui/icons-material/CloudUpload"; // More accurate for upload
import TerminalIcon from "@mui/icons-material/Terminal"; // More accurate for compute
import AddIcon from "@mui/icons-material/Add";

interface DataDashboardProps {
  onViewCiphertext: (dataId: string) => void;
}

const DataDashboard: React.FC<DataDashboardProps> = ({ onViewCiphertext }) => {
  const navigate = useNavigate();
  const {
    data: ciphertexts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CiphertextSummary[], Error>({
    queryKey: ["uploads"],
    queryFn: () => getMyUploads(),
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50">
        <SyncIcon
          className="animate-spin text-blue-600 mb-2"
          sx={{ fontSize: 40 }}
        />
        <p className="text-slate-600 font-medium italic">
          Opening Secure Vault...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 p-6">
        <ErrorOutlineIcon className="text-red-500 mb-2" sx={{ fontSize: 48 }} />
        <h3 className="text-lg font-bold text-slate-900">
          Vault Access Denied
        </h3>
        <p className="text-slate-500 mb-6 text-center">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const isEmpty = !ciphertexts || ciphertexts.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-3 rounded-2xl shadow-xl shadow-blue-200 text-white">
              <StorageIcon fontSize="large" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Secure Vault
              </h1>
              <p className="text-slate-500 text-sm font-medium">
                Homomorphic Encryption Explorer (CKKS)
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/upload")}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <CloudUploadIcon sx={{ fontSize: 20 }} /> Upload Data
            </button>
            <button
              onClick={() => navigate("/computeData")}
              className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95"
            >
              <TerminalIcon sx={{ fontSize: 20 }} /> Compute
            </button>
          </div>
        </div>

        {/* --- Main Content Area --- */}
        {isEmpty ? (
          /* Stylish Empty State */
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center">
            <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
              <CloudUploadIcon sx={{ fontSize: 48 }} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              No Encrypted Data Yet
            </h2>
            <p className="text-slate-500 max-w-sm mb-8">
              Your secure vault is currently empty. Start by uploading a dataset
              or an image to explore zero-knowledge computing.
            </p>
            <button
              onClick={() => navigate("/upload")}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-2xl hover:-translate-y-1"
            >
              <AddIcon /> Initialize First Upload
            </button>
          </div>
        ) : (
          /* The List */
          <div className="space-y-4">
            {ciphertexts.map((ct) => {
              const hasCloudinary =
                ct.metadata?.type === "image" && ct.metadata?.displayUrl;
              return (
                <div
                  key={ct._id}
                  onClick={() => onViewCiphertext(ct.dataId)}
                  className="group bg-white border border-slate-200 p-4 sm:p-6 rounded-[1.5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-900/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-slate-50 overflow-hidden text-slate-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 border border-slate-100">
                      {ct.metadata?.type === "image" ? (
                        <ImageIcon sx={{ fontSize: 32 }} />
                      ) : (
                        <DescriptionIcon sx={{ fontSize: 32 }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {ct.dataId}
                        </h3>
                        {hasCloudinary && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-black">
                            ENCRYPTED IMAGE
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 mt-2 text-xs font-semibold">
                        <span className="text-blue-600 uppercase tracking-tighter bg-blue-50 px-2 py-1 rounded">
                          {ct.scheme}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400 uppercase">
                          <AccessTimeIcon sx={{ fontSize: 14 }} />
                          {ct.metadata?.uploadedAt
                            ? new Date(
                                ct.metadata.uploadedAt,
                              ).toLocaleDateString()
                            : "Recent"}
                        </span>
                        <span className="text-slate-600">
                          {((ct.metadata?.sizeBytes || 0) / 1024).toFixed(2)} KB
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/decrypt/${ct._id}`);
                      }}
                      className="bg-slate-50 text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all border border-slate-200"
                    >
                      <VisibilityIcon sx={{ fontSize: 18, mr: 1 }} />
                      View Result
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 border-t border-slate-200 pt-8 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] gap-4">
          <p>© 2026 SEAL-JS SECURE ENVIRONMENT</p>
          <div className="flex gap-8">
            <span className="hover:text-blue-500 cursor-help transition-colors">
              E2EE Protected
            </span>
            <span className="hover:text-blue-500 cursor-help transition-colors">
              Zero Knowledge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDashboard;
