import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  computeSum,
  computeAverage,
  computeMultiply,
  computeLinearRegression,
} from "../API/he.ts";

// Helper component for common form structure
interface ComputationFormProps {
  title: string;
  description: string;
  mutation: ReturnType<typeof useMutation>;
  children: (handleSubmit: (e: React.FormEvent) => void) => React.ReactNode;
}

const ComputationForm: React.FC<ComputationFormProps> = ({
  title,
  description,
  mutation,
  children,
}) => {
  return (
    <div className="border p-5 rounded-xl shadow-md bg-white">
      <h3 className="text-2xl font-semibold text-blue-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 text-sm">{description}</p>

      <form onSubmit={children} className="space-y-4">
        {mutation.isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded text-sm">
            Error: {mutation.error.message}
          </div>
        )}

        {mutation.isSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded text-sm font-medium">
            ✅ Success! Result ID:{" "}
            <code className="font-bold">{mutation.data?.resultId}</code>. Ready
            for decryption.
          </div>
        )}

        <div className="space-y-4">
          {children(() => {
            /* empty submit handler */
          })}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className={`w-full py-2 px-4 rounded-lg text-white font-semibold transition duration-200 ${
            mutation.isPending
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {mutation.isPending ? "Computing..." : `Run ${title}`}
        </button>
      </form>
    </div>
  );
};

// Main Dashboard Component
const ComputationDashboard: React.FC<{ token: string }> = ({ token }) => {
  const queryClient = useQueryClient();

  // --- State for Forms ---
  const [sumForm, setSumForm] = useState({
    dataIds: "",
    resultId: "SUM_RESULT",
  });
  const [multForm, setMultForm] = useState({
    dataId_A: "",
    dataId_B: "",
    resultId: "MULT_RESULT",
  });
  const [linRegForm, setLinRegForm] = useState({
    dataId_X: "",
    dataId_Y: "",
    resultId: "LINREG_RESULT",
  });

  // --- Mutations ---

  const sumMutation = useMutation({
    mutationFn: () =>
      computeSum({
        token,
        dataIds: sumForm.dataIds
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id),
        resultId: sumForm.resultId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciphertexts"] });
    },
  });

  const avgMutation = useMutation({
    mutationFn: () =>
      computeAverage({
        token,
        dataIds: sumForm.dataIds
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id),
        resultId: `AVG_${sumForm.resultId}`, // Use a distinct ID for average
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciphertexts"] });
    },
  });

  const multMutation = useMutation({
    mutationFn: () =>
      computeMultiply({
        token,
        dataId_A: multForm.dataId_A.trim(),
        dataId_B: multForm.dataId_B.trim(),
        resultId: multForm.resultId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciphertexts"] });
    },
  });

  const linRegMutation = useMutation({
    mutationFn: () =>
      computeLinearRegression({
        token,
        dataId_X: linRegForm.dataId_X.trim(),
        dataId_Y: linRegForm.dataId_Y.trim(),
        resultId: linRegForm.resultId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciphertexts"] });
    },
  });

  // --- Handlers ---
  const handleSumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sumMutation.mutate();
  };
  const handleAvgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    avgMutation.mutate();
  };
  const handleMultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    multMutation.mutate();
  };
  const handleLinRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    linRegMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h2 className="text-3xl font-bold text-blue-700 text-center">
          Homomorphic Computation Dashboard 🧠
        </h2>
        <p className="text-center text-gray-600">
          Request the server to compute new, encrypted results from your
          uploaded ciphertexts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {/* Sum and Average Form */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 border p-6 rounded-xl shadow-lg bg-white space-y-6">
            <h3 className="text-2xl font-semibold text-blue-800">
              Homomorphic Sum & Average
            </h3>
            <p className="text-gray-600 text-sm">
              Operate on a list of ciphertexts (e.g., aggregating monthly sales
              figures).
            </p>

            <div>
              <label
                htmlFor="sumDataIds"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Input Ciphertext IDs (Comma-Separated)
              </label>
              <input
                type="text"
                id="sumDataIds"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={sumForm.dataIds}
                onChange={(e) =>
                  setSumForm({ ...sumForm, dataIds: e.target.value })
                }
                placeholder="e.g., Q1_SALES, Q2_SALES, Q3_SALES"
              />
            </div>

            <div>
              <label
                htmlFor="sumResultId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Result ID (for Sum)
              </label>
              <input
                type="text"
                id="sumResultId"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={sumForm.resultId}
                onChange={(e) =>
                  setSumForm({ ...sumForm, resultId: e.target.value })
                }
                placeholder="e.g., TOTAL_SALES"
              />
            </div>

            {/* Sum Button */}
            <button
              onClick={handleSumSubmit}
              disabled={sumMutation.isPending || sumForm.dataIds.length === 0}
              className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition duration-200 ${
                sumMutation.isPending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {sumMutation.isPending ? "Summing..." : "Run Homomorphic Sum"}
            </button>
            {sumMutation.isSuccess && (
              <p className="text-green-600 text-sm font-medium text-center">
                Sum Result ID: {sumMutation.data?.resultId}
              </p>
            )}

            <div className="h-px bg-gray-200" />

            {/* Average Button */}
            <button
              onClick={handleAvgSubmit}
              disabled={avgMutation.isPending || sumForm.dataIds.length === 0}
              className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition duration-200 ${
                avgMutation.isPending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {avgMutation.isPending
                ? "Averaging..."
                : "Run Homomorphic Average"}
            </button>
            {avgMutation.isSuccess && (
              <p className="text-green-600 text-sm font-medium text-center">
                Average Result ID: AVG_{sumMutation.data?.resultId}
              </p>
            )}

            {(sumMutation.isError || avgMutation.isError) && (
              <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded text-sm">
                Error:{" "}
                {sumMutation.error?.message || avgMutation.error?.message}
              </div>
            )}
          </div>

          {/* Multiplication Form */}
          <ComputationForm
            title="Homomorphic Multiplication"
            description="Compute CT_A * CT_B. Requires two ciphertexts and RelinKeys."
            mutation={multMutation}
          >
            {(handleSubmit) => (
              <>
                <div>
                  <label
                    htmlFor="multDataId_A"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Input CT ID (A)
                  </label>
                  <input
                    type="text"
                    id="multDataId_A"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={multForm.dataId_A}
                    onChange={(e) =>
                      setMultForm({ ...multForm, dataId_A: e.target.value })
                    }
                    placeholder="e.g., Vector_X"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="multDataId_B"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Input CT ID (B)
                  </label>
                  <input
                    type="text"
                    id="multDataId_B"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={multForm.dataId_B}
                    onChange={(e) =>
                      setMultForm({ ...multForm, dataId_B: e.target.value })
                    }
                    placeholder="e.g., Vector_Y"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="multResultId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Result ID
                  </label>
                  <input
                    type="text"
                    id="multResultId"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={multForm.resultId}
                    onChange={(e) =>
                      setMultForm({ ...multForm, resultId: e.target.value })
                    }
                    placeholder="e.g., PRODUCT_XY"
                    required
                  />
                </div>
                <button
                  type="submit"
                  onClick={handleMultSubmit}
                  style={{ display: "none" }}
                ></button>
              </>
            )}
          </ComputationForm>

          {/* Linear Regression Form */}
          <ComputationForm
            title="Homomorphic Linear Regression"
            description="Compute encrypted coefficients (slope, intercept) from features (X) and targets (Y)."
            mutation={linRegMutation}
          >
            {(handleSubmit) => (
              <>
                <div>
                  <label
                    htmlFor="linRegDataId_X"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Features CT ID (X)
                  </label>
                  <input
                    type="text"
                    id="linRegDataId_X"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={linRegForm.dataId_X}
                    onChange={(e) =>
                      setLinRegForm({ ...linRegForm, dataId_X: e.target.value })
                    }
                    placeholder="e.g., Features_Vector"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="linRegDataId_Y"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Targets CT ID (Y)
                  </label>
                  <input
                    type="text"
                    id="linRegDataId_Y"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={linRegForm.dataId_Y}
                    onChange={(e) =>
                      setLinRegForm({ ...linRegForm, dataId_Y: e.target.value })
                    }
                    placeholder="e.g., Target_Vector"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="linRegResultId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Result ID
                  </label>
                  <input
                    type="text"
                    id="linRegResultId"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={linRegForm.resultId}
                    onChange={(e) =>
                      setLinRegForm({ ...linRegForm, resultId: e.target.value })
                    }
                    placeholder="e.g., REGRESSION_COEFS"
                    required
                  />
                </div>
                <button
                  type="submit"
                  onClick={handleLinRegSubmit}
                  style={{ display: "none" }}
                ></button>
              </>
            )}
          </ComputationForm>
        </div>
      </div>
    </div>
  );
};

export default ComputationDashboard;
