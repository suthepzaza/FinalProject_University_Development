import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import AdvisorDashboard from './pages/AdvisorDashboard';
import AdminDashboard from './pages/AdminDashboard';

// ProtectedRoute component to enforce authentication and role access
function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required and doesn't match:
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'advisor') return <Navigate to="/advisor" replace />;
    if (user.role === 'student') return <Navigate to="/student" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Login & Register */}
        <Route path="/login" element={<LoginPage initialSignUp={false} />} />
        <Route path="/register" element={<LoginPage initialSignUp={true} />} />

        {/* Student Dashboard */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Advisor Dashboard */}
        <Route
          path="/advisor"
          element={
            <ProtectedRoute allowedRole="advisor">
              <AdvisorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}