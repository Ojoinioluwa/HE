// src/App.tsx (Updated for Redux)

import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { useAppSelector } from "./redux/slice/hook.ts"; // Import the typed selector hook
// Import your components
import LoginPage from "./Components/LoginPage.tsx";
import RegistrationPage from "./Components/RegistrationPage";
import DataDashboard from "./Components/DataDashboard";
import DecryptionPage from "./Components/DecryptionPage";
import ComputationDashboard from "./Components/ComputationDashboard";
import VerifyEmail from "./Components/VerifyEmail.tsx";
import DataUploadPage from "./Components/DataUploadPage.tsx";
import ComputationPage from "./Components/ComputationDashboard";

// Helper component to guard private routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // TODO: change the logic here later from the | true
  // Read authentication status from Redux
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children as React.ReactElement;
};

// Wrapper for DecryptionPage to handle URL parameters
const DecryptionPageWrapper: React.FC = () => {
  // Get the dynamic URL parameter (dataId)
  const { id } = useParams<{ id: string }>();

  // Read required state from Redux
  const token = useAppSelector((state) => state.auth.token);
  const secretKeyBase64 = useAppSelector((state) => state.auth.secretKeyBase64);

  if (!id || !token || !secretKeyBase64) {
    // Handle cases where data is missing (e.g., direct navigation without key)
    return <Navigate to="/dashboard" replace />;
  }

  return <DecryptionPage secretKeyBase64={secretKeyBase64} />;
};

const App: React.FC = () => {
  // Use the selector to manage overall routing logic
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Public Routes (Auth) */}
        {/* LoginPage and RegistrationPage will dispatch the setAuth action directly */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/computeData" element={<ComputationPage />} />

        {/* 2. Protected Routes (HE Functionality) */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <DataUploadPageWrapper />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DataDashboardWrapper />
            </ProtectedRoute>
          }
        />

        <Route
          path="/compute"
          element={
            <ProtectedRoute>
              <ComputationDashboardWrapper />
            </ProtectedRoute>
          }
        />

        <Route
          path="/decrypt/:id"
          element={
            <ProtectedRoute>
              <DecryptionPageWrapper />
            </ProtectedRoute>
          }
        />

        {/* 3. Default Route */}
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

// --- Helper Wrappers to retrieve state from Redux for Prop passing ---
// NOTE: We must create these wrappers because React Router components cannot directly use hooks
// like useParams and Redux selectors without being inside a Route context.

const DataUploadPageWrapper: React.FC = () => {
  return <DataUploadPage />;
};

const DataDashboardWrapper: React.FC = () => {
  const handleViewCiphertext = (dataId: string) => {
    // Logic to navigate, e.g., using useNavigate hook from 'react-router-dom'
    console.log(`Navigating to /decrypt/${dataId}`);
    // This logic will be fully implemented inside DataDashboard.tsx
  };
  return <DataDashboard onViewCiphertext={handleViewCiphertext} />;
};

const ComputationDashboardWrapper: React.FC = () => {
  // const token = useAppSelector((state) => state.auth.token);
  return <ComputationDashboard />;
};
