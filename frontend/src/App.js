import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import './i18n'; // Initialize i18n

// Pages
import LandingPage from '@/pages/LandingPage';
import BrowsePrograms from '@/pages/BrowsePrograms';
import ProgramDetail from '@/pages/ProgramDetail';
import StudentDashboard from '@/pages/StudentDashboard';
import SchoolDashboard from '@/pages/SchoolDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import InstructorDashboard from '@/pages/InstructorDashboard';
import SchoolRegistration from '@/pages/SchoolRegistration';
import PaymentSuccess from '@/pages/PaymentSuccess';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthContext = React.createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingSession, setProcessingSession] = useState(false);

  useEffect(() => {
    const sessionId = window.location.hash.match(/#session_id=([^&]+)/);
    
    if (sessionId && sessionId[1]) {
      setProcessingSession(true);
      handleSessionId(sessionId[1]);
    } else {
      checkAuth();
    }
  }, []);

  const handleSessionId = async (sessionId) => {
    try {
      await axios.post(
        `${API}/auth/session`,
        {},
        {
          headers: { 'X-Session-ID': sessionId },
          withCredentials: true
        }
      );
      
      // Fetch user data after OAuth session creation
      await checkAuth();
      
      // Clear hash from URL
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error) {
      console.error('Session creation failed:', error);
      setLoading(false);
      setProcessingSession(false);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      console.log('DEBUG checkAuth: User data from /auth/me:', response.data);
      setUser(response.data);
    } catch (error) {
      console.log('DEBUG checkAuth: Error fetching user:', error.response?.status, error.response?.data);
      setUser(null);
    } finally {
      setLoading(false);
      setProcessingSession(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading || processingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-700"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, checkAuth }}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/programs" element={<BrowsePrograms />} />
            <Route path="/programs/:id" element={<ProgramDetail />} />
            <Route path="/register-school" element={<SchoolRegistration />} />
            <Route path="/booking-success" element={<PaymentSuccess />} />
            
            {/* Direct dashboard routes for debugging */}
            <Route path="/admin-dashboard" element={user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/dashboard" />} />
            <Route path="/school-dashboard" element={user && user.role === 'school' ? <SchoolDashboard /> : <Navigate to="/dashboard" />} />
            <Route path="/instructor-dashboard" element={user && user.role === 'instructor' ? <InstructorDashboard /> : <Navigate to="/dashboard" />} />
            <Route path="/student-dashboard" element={user ? <StudentDashboard /> : <Navigate to="/" />} />
            
            <Route 
              path="/dashboard" 
              element={
                user ? (
                  <>
                    {console.log('DEBUG: User role:', user.role, 'Full user:', user)}
                    {user.role === 'admin' ? <AdminDashboard /> :
                     user.role === 'school' ? <SchoolDashboard /> :
                     user.role === 'instructor' ? <InstructorDashboard /> :
                     <StudentDashboard />}
                  </>
                ) : <Navigate to="/" />
              } 
            />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </AuthContext.Provider>
  );
}

export default App;
