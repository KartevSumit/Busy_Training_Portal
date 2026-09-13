import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Clock, CheckCircle } from 'lucide-react';
import { api } from '../lib/apiClient';

const EnrollmentStatusBadge = ({ status }) => {
  const styles = {
    NOT_STARTED: 'bg-gray-100 text-gray-800 border-gray-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200'
  };

  const labels = {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed'
  };

  const icons = {
    NOT_STARTED: <Clock className="w-3.5 h-3.5 mr-1" />,
    IN_PROGRESS: <BookOpen className="w-3.5 h-3.5 mr-1" />,
    COMPLETED: <CheckCircle className="w-3.5 h-3.5 mr-1" />
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.NOT_STARTED}`}>
      {icons[status] || icons.NOT_STARTED}
      {labels[status] || status}
    </span>
  );
};

export default function MyCoursesLearner() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/me/enrollments');
      setEnrollments(res.enrollments);
    } catch (err) {
      setError(err.message || 'Failed to load your enrolled courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  return (
    <div className="flex flex-col flex-1 space-y-8 w-full">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
        <p className="mt-1 text-sm text-gray-500">Track your progress and continue learning.</p>
      </div>

      {error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading enrollments</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <button 
                onClick={() => fetchEnrollments()}
                className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <h3 className="mt-2 text-sm font-medium text-gray-900">You're not enrolled in any courses yet.</h3>
          <p className="mt-1 text-sm text-gray-500">Find a course that interests you and start learning.</p>
          <div className="mt-6">
            <Link
              to="/catalog"
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Browse Course Catalog
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => (
            <Link 
              key={enrollment.id} 
              to={`/courses/${enrollment.course.id}`}
              className="block h-full group"
            >
              <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 group-hover:shadow-md transition-shadow duration-200 overflow-hidden">
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {enrollment.course.category}
                    </span>
                    <EnrollmentStatusBadge status={enrollment.status} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {enrollment.course.title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4 flex-1 line-clamp-3">
                    {enrollment.course.description || 'No description provided.'}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <span>Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
