import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import Catalog from './pages/Catalog';
import CourseDetail from './pages/CourseDetail';
import MyCourses from './pages/MyCourses';

const Placeholder = ({ title }) => (
  <div className="bg-white shadow rounded-lg p-6 text-center mt-8 max-w-2xl mx-auto">
    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
    <p className="mt-2 text-gray-500">This feature will be implemented in a future task.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route element={<AppShell />}>
            <Route 
              path="/catalog" 
              element={
                <ProtectedRoute allowedRoles={['INSTRUCTOR', 'LEARNER']}>
                  <Catalog />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/courses/:id" 
              element={
                <ProtectedRoute allowedRoles={['INSTRUCTOR', 'LEARNER']}>
                  <CourseDetail />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/my-courses" 
              element={
                <ProtectedRoute allowedRoles={['INSTRUCTOR', 'LEARNER']}>
                  <MyCourses />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                  <Placeholder title="Instructor Dashboard" />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/alerts" 
              element={
                <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                  <Placeholder title="Inactivity Alerts" />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Route>

          <Route path="/" element={<Navigate to="/catalog" replace />} />
          <Route path="*" element={<Navigate to="/catalog" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
