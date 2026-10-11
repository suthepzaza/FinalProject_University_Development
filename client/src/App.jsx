import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import API from './api';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import AdvisorDashboard from './pages/AdvisorDashboard';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ role, children }) {
  const token = localStorage.getItem('token');
  const [account, setAccount] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    if (token) API.get('/auth/me').then(({ data }) => { if (active) setAccount(data); }).catch(() => {
      if (active) { localStorage.removeItem('token'); localStorage.removeItem('user'); setFailed(true); }
    });
    return () => { active = false; };
  }, [token]);
  if (!token || failed) return <Navigate to="/login" replace />;
  if (!account) return <main>Checking login?</main>;
  if (account.role !== role) return <Navigate to={'/' + account.role} replace />;
  return children;
}
export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
    <Route path="/advisor" element={<ProtectedRoute role="advisor"><AdvisorDashboard /></ProtectedRoute>} />
    <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes></BrowserRouter>;
}
