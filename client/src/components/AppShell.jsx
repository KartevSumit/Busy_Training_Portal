import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, BookOpen, GraduationCap, LayoutDashboard, Bell, Shield } from 'lucide-react';

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <span className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-indigo-600" />
                Training Portal
              </span>
              
              <div className="hidden md:flex space-x-4">
                {user?.role === 'INSTRUCTOR' && (
                  <>
                    <Link to="/catalog" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Catalog
                    </Link>
                    <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link to="/alerts" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" /> Alerts
                    </Link>
                  </>
                )}

                {user?.role === 'LEARNER' && (
                  <>
                    <Link to="/catalog" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Catalog
                    </Link>
                    <Link to="/my-courses" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" /> My Courses
                    </Link>
                  </>
                )}

                {user?.role === 'ADMIN' && (
                  <Link to="/admin" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Admin Console
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {user?.email} ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 focus:outline-none transition"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
