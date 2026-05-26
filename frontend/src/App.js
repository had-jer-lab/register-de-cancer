import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PatientProvider } from './context/PatientContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/global.css';

import AdminDashboard from './pages/AdminDashboard';
import AuthPage       from './pages/AuthPage';
import Dashboard      from './pages/Dashboard';
import ImportData     from './pages/ImportData';
import DiscussionRCP  from './pages/DiscussionRCP';
import PatientDossier from './pages/PatientDossier';
import EditPatient    from './pages/EditPatient';
import PatientFormPage from './pages/PatientPublicForm'; // ✅ صفحة QR ط§ظ„ط¹ط§ظ…ة
import Page1 from './pages/Page1';
import Page2 from './pages/Page2';
import Page3 from './pages/Page3';
import Page4 from './pages/Page4';
import Page5 from './pages/Page5';
import Page6 from './pages/Page6'; // ✅ ظ…ظ† ط§ظ„ظ…ظ„ف 1
import Statistics from './pages/Statistics';
import PatientArchive from './pages/PatientArchive';
export default function App() {
  return (
    <AuthProvider>
      <PatientProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"     element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected */}
            <Route path="/admin"      element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/import"     element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
            <Route path="/rcp"        element={<ProtectedRoute><DiscussionRCP /></ProtectedRoute>} />

            {/* ✅ Route publique QR — ط¨ط¯ظˆظ† ProtectedRoute */}
            <Route path="/patient-form/:token" element={<PatientFormPage />} />

            {/* Formulaire patient */}
            <Route path="/page1" element={<ProtectedRoute><Page1 /></ProtectedRoute>} />
            <Route path="/page2" element={<ProtectedRoute><Page2 /></ProtectedRoute>} />
            <Route path="/page3" element={<ProtectedRoute><Page3 /></ProtectedRoute>} />
            <Route path="/page4" element={<ProtectedRoute><Page4 /></ProtectedRoute>} />
            <Route path="/page5" element={<ProtectedRoute><Page5 /></ProtectedRoute>} />
            <Route path="/page6" element={<ProtectedRoute><Page6 /></ProtectedRoute>} />
            <Route path="/patient-archive" element={<PatientArchive />} />


            {/* Patient */}
            <Route path="/patient/:id"      element={<ProtectedRoute><PatientDossier /></ProtectedRoute>} />
            <Route path="/patient/:id/edit" element={<ProtectedRoute><EditPatient /></ProtectedRoute>} />

            <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </BrowserRouter>
      </PatientProvider>
    </AuthProvider>
  );
}