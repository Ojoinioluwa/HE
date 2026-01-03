import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyUploads } from "../API/he.ts";
import type { CiphertextSummary } from "../API/he.ts";

// MUI Icons
import StorageIcon from "@mui/icons-material/Storage";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import SyncIcon from "@mui/icons-material/Sync";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useNavigate } from "react-router-dom";

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
        <p className="text-slate-600 font-medium">Accessing Secure Vault...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 p-6">
        <ErrorOutlineIcon className="text-red-500 mb-2" sx={{ fontSize: 48 }} />
        <h3 className="text-lg font-bold text-slate-900">Fetch Failed</h3>
        <p className="text-slate-500 mb-6 text-center">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white">
              <StorageIcon fontSize="large" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Encrypted Explorer
              </h1>
              <p className="text-slate-500 text-sm">
                Secure cloud storage protected by CKKS encryption.
              </p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
          >
            <SyncIcon sx={{ fontSize: 18 }} /> Refresh
          </button>
        </div>

        {/* List or Empty State */}
        {ciphertexts?.map((ct) => (
          <div
            key={ct._id}
            onClick={() => onViewCiphertext(ct.dataId)}
            className="group bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-5">
              {/* Icon based on metadata type */}
              <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                {ct.metadata?.type === "image" ? (
                  <ImageIcon sx={{ fontSize: 28 }} />
                ) : (
                  <DescriptionIcon sx={{ fontSize: 28 }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 truncate">
                  {ct.dataId}
                </h3>

                {/* METADATA INFO ROW */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* File Type Tag */}
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-black uppercase tracking-wider border border-blue-100">
                    {ct.metadata?.type || "Data"}
                  </span>

                  {/* Conditional Detail: Resolution for Images, Char Count for Text */}
                  {ct.metadata?.type === "image" ? (
                    <span className="text-xs text-slate-500 font-medium">
                      {ct.metadata?.resolution || "32x32"} •{" "}
                      {ct.metadata?.channels || "RGB"}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">
                      {ct.metadata?.charCount || "0"} characters
                    </span>
                  )}
                </div>

                {/* SYSTEM INFO ROW */}
                <div className="flex flex-wrap items-center gap-x-3 mt-1 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1 uppercase font-bold text-slate-500">
                    {ct.scheme}
                  </span>
                  <span className="flex items-center gap-1">
                    <AccessTimeIcon sx={{ fontSize: 14 }} />
                    {ct.metadata?.uploadedAt
                      ? new Date(ct.metadata.uploadedAt).toLocaleDateString()
                      : new Date().toLocaleDateString()}
                  </span>
                  <span className="font-bold text-slate-600">
                    {ct.metadata?.sizeBytes
                      ? `${(ct.metadata.sizeBytes / 1024).toFixed(2)} KB`
                      : `${((ct.ciphertextLength || 0) / 1024).toFixed(2)} KB`}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0 border-t sm:border-0 border-slate-50">
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevents double-triggering if the parent div also has an onClick
                  navigate(`/decrypt/${ct._id}`); // Redirects to the decryption page with the DB ID
                }}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-md shadow-slate-200"
              >
                <VisibilityIcon sx={{ fontSize: 18 }} />
                <span>View & Decrypt</span>
              </button>
            </div>
          </div>
        ))}

        <div className="mt-12 border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 uppercase font-bold tracking-widest gap-4">
          <p>© 2025 SEAL-JS CLOUD ENVIRONMENT</p>
          <div className="flex gap-6">
            <span>End-to-End Encrypted</span>
            <span>Zero Knowledge Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDashboard;
