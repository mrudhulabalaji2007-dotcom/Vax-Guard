import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { DashboardLayout } from './layouts/DashboardLayout.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Shipments } from './pages/Shipments.js';
import { ShipmentDetails } from './pages/ShipmentDetails.js';
import { TemperatureMonitoring } from './pages/TemperatureMonitoring.js';
import { RoutePlanner } from './pages/RoutePlanner.js';
import { Warehouses } from './pages/Warehouses.js';
import { Alerts } from './pages/Alerts.js';
import { Reports } from './pages/Reports.js';
import { ProfileSettings } from './pages/ProfileSettings.js';
import { FleetMap } from './pages/FleetMap.js';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-xs text-slate-400">Loading VAXGUARD Cold-Chain System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="map" element={<FleetMap />} />
            <Route path="shipments" element={<Shipments />} />
            <Route path="shipments/:id" element={<ShipmentDetails />} />
            <Route path="temperature" element={<TemperatureMonitoring />} />
            <Route path="routes" element={<RoutePlanner />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="warehouses/:id" element={<Warehouses />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
