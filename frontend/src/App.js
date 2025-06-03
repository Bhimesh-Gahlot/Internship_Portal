import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './components/Home';
import Login from './components/Login';
import StudentDashboard from './components/dashboard/StudentDashboard';
import MentorDashboard from './components/dashboard/MentorDashboard';
import StudentDetailsPage from './components/dashboard/StudentDetailsPage';
import ReportSubmission from './components/reports/ReportSubmission';
import AdminDashboard from './components/dashboard/AdminDashboard';
import AdminPanel from './components/AdminPanel';
import { isAuthenticated, getUserRole, setupAxiosInterceptors } from './utils/auth';

// Import Ant Design styles
import 'antd/dist/reset.css';

// Set up axios interceptors for auth
setupAxiosInterceptors();

// Simple protected route component
const ProtectedRoute = ({ children, role }) => {
  const authenticated = isAuthenticated();
  const userRole = getUserRole();
  
  // Debug information for protected routes
  console.log(`Protected route check - Role required: ${role}, User role: ${userRole}, Authenticated: ${authenticated}`);
  
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (role && userRole !== role) {
    // Redirect to login if role doesn't match - this allows the user to log in with the correct role
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            
            {/* Student routes */}
            <Route 
              path="/student/dashboard" 
              element={
                <ProtectedRoute role="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Mentor routes */}
            <Route 
              path="/mentor/dashboard" 
              element={
                <ProtectedRoute role="mentor">
                  <MentorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/mentor-dashboard" 
              element={
                <Navigate to="/mentor/dashboard" replace />
              } 
            />
            
            {/* Student details page */}
            <Route
              path="/student-details/:registrationNumber"
              element={
                <ProtectedRoute role="mentor">
                  <StudentDetailsPage />
                </ProtectedRoute>
              }
            />
            
            {/* Keep the existing route for backward compatibility */}
            <Route
              path="/student-details"
              element={
                <ProtectedRoute role="mentor">
                  <StudentDetailsPage />
                </ProtectedRoute>
              }
            />
            
            {/* Report routes */}
            <Route 
              path="/report/submit" 
              element={
                <ProtectedRoute role="student">
                  <ReportSubmission />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            
            {/* Default route for unknown paths */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App; 