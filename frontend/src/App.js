import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PatientProvider } from './context/PatientContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/global.css';

import AdminDashboard from './pages/AdminDashboard';
import AuthPage   from './pages/AuthPage';
import Dashboard  from './pages/Dashboard';
import ImportData from './pages/ImportData';
import DiscussionRCP from './pages/DiscussionRCP';
import EditPatient from './pages/EditPatient';
import Page1 from './pages/Page1';
import Page2 from './pages/Page2';
import Page3 from './pages/Page3';
import Page4 from './pages/Page4';
import Page5 from './pages/Page5';
import Statistics from './pages/Statistics';
import PatientDossier from './pages/PatientDossier';
import PatientFormPage from './pages/PatientPublicForm'; // الصفحة العامة للمريض


export default function App() {
  return (
    <AuthProvider>
      <PatientProvider>
        <BrowserRouter>
          <Routes>
            {/* Point d'entrée → Créer compte / Connexion */}
            <Route path="/"          element={<Navigate to="/auth" replace />} />
            <Route path="/auth"      element={<AuthPage />} />

            {/* Protected Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

            {/* Dashboard principal */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/import"    element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
            <Route path="/rcp"       element={<ProtectedRoute><DiscussionRCP /></ProtectedRoute>} />
            <Route path="/patient-form/:token" element={<PatientFormPage />} />
            {/* Formulaire patient en 5 étapes */}
            <Route path="/page1"     element={<ProtectedRoute><Page1 /></ProtectedRoute>} />
            <Route path="/page2"     element={<ProtectedRoute><Page2 /></ProtectedRoute>} />
            <Route path="/page3"     element={<ProtectedRoute><Page3 /></ProtectedRoute>} />
            <Route path="/page4"     element={<ProtectedRoute><Page4 /></ProtectedRoute>} />
            <Route path="/page5"     element={<ProtectedRoute><Page5 /></ProtectedRoute>} />
            <Route path="/patient/:id/edit" element={<ProtectedRoute><EditPatient /></ProtectedRoute>} />
            <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
            <Route path="/patient/:id" element={<ProtectedRoute><PatientDossier /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*"          element={<Navigate to="/auth" replace />} />
          </Routes>
        </BrowserRouter>
      </PatientProvider>
    </AuthProvider>
  );
}
