import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Layout } from './components/Layout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { HouseholdFormPage } from './pages/HouseholdFormPage.jsx';
import { ResidentsPage } from './pages/ResidentsPage.jsx';
import { MasterlistsPage } from './pages/MasterlistsPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { HomePage } from './pages/HomePage.jsx';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={user?.role === 'ADMIN' ? '/users' : '/'} replace />;
  }

  return children;
}

function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'ADMIN') return <Navigate to="/users" replace />;
  return <HomePage />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Layout />}>
              <Route
                path="/households/new"
                element={
                  <ProtectedRoute allowedRoles={['BHW']}>
                    <HouseholdFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/residents"
                element={
                  <ProtectedRoute allowedRoles={['BHW', 'MIDWIFE']}>
                    <ResidentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/masterlists"
                element={
                  <ProtectedRoute allowedRoles={['BHW', 'MIDWIFE']}>
                    <MasterlistsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<HomeRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
export default App;
