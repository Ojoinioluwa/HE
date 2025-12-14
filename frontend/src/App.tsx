// src/App.tsx (Updated for Redux)

import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  Router,
} from "react-router-dom";
import { useAppSelector } from "./redux/slice/hook.ts"; // Import the typed selector hook
// Import your components
import LoginPage from "./Components/LoginPage.tsx";
import RegistrationPage from "./Components/RegistrationPage";
import DataUploadPage from "./Components/DataUploadPage";
import DataDashboard from "./Components/DataDashboard";
import DecryptionPage from "./Components/DecryptionPage";
import ComputationDashboard from "./Components/ComputationDashboard";

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
  const { dataId } = useParams<{ dataId: string }>();

  // Read required state from Redux
  const token = useAppSelector((state) => state.auth.token);
  const secretKeyBase64 = useAppSelector((state) => state.auth.secretKeyBase64);

  if (!dataId || !token || !secretKeyBase64) {
    // Handle cases where data is missing (e.g., direct navigation without key)
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DecryptionPage
      token={token}
      secretKeyBase64={secretKeyBase64}
      dataId={dataId}
    />
  );
};

const App: React.FC = () => {
  // Use the selector to manage overall routing logic
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Public Routes (Auth) */}
        {/* LoginPage and RegistrationPage will dispatch the setAuth action directly */}
        <Route
          path="/login"
          element={<LoginPage onSwitchToRegister={() => {}} />}
        />
        <Route
          path="/register"
          element={<RegistrationPage onSwitchToLogin={() => {}} />}
        />

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
          path="/decrypt/:dataId"
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
  const token = useAppSelector((state) => state.auth.token);
  return <DataUploadPage token={token!} />;
};

const DataDashboardWrapper: React.FC = () => {
  const token = useAppSelector((state) => state.auth.token);
  // In DataDashboard, we need the actual navigation function for decryption.
  // Assuming navigation happens via useNavigate and the path is constructed there.
  const handleViewCiphertext = (dataId: string) => {
    // Logic to navigate, e.g., using useNavigate hook from 'react-router-dom'
    console.log(`Navigating to /decrypt/${dataId}`);
    // This logic will be fully implemented inside DataDashboard.tsx
  };
  return (
    <DataDashboard token={token!} onViewCiphertext={handleViewCiphertext} />
  );
};

const ComputationDashboardWrapper: React.FC = () => {
  const token = useAppSelector((state) => state.auth.token);
  return <ComputationDashboard token={token!} />;
};
