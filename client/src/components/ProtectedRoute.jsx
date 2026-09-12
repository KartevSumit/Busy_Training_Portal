import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-500 font-medium">Loading session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">403 Forbidden</h1>
        <p className="text-gray-600 mb-6 text-center">
          You do not have the required permissions to access this page.
        </p>
        <button
          onClick={() => window.history.back()}
          className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return children;
}
