import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Layout } from './components/layout/Layout.jsx';
import { 
  Login, 
  Register, 
  Trending, 
  Products, 
  Availability, 
  Chat, 
  Profile, 
  Insights 
} from './pages/index.js';
import { ROUTES } from './utils/constants.js';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path={ROUTES.LOGIN} 
        element={
          isAuthenticated ? <Navigate to={ROUTES.TRENDING} replace /> : <Login />
        } 
      />
      <Route 
        path={ROUTES.REGISTER} 
        element={
          isAuthenticated ? <Navigate to={ROUTES.TRENDING} replace /> : <Register />
        } 
      />

      {/* Protected routes */}
      <Route 
        path={ROUTES.HOME} 
        element={<Navigate to={ROUTES.TRENDING} replace />} 
      />
      <Route path={ROUTES.TRENDING} element={<Trending />} />
      <Route path={ROUTES.PRODUCTS} element={<Products />} />
      <Route path={ROUTES.AVAILABILITY} element={<Availability />} />
      <Route path={ROUTES.CHAT} element={<Chat />} />
      <Route path={ROUTES.PROFILE} element={<Profile />} />
      <Route path={ROUTES.INSIGHTS} element={<Insights />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to={ROUTES.TRENDING} replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <AppRoutes />
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
