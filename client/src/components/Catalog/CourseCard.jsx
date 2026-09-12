import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, BookOpen, CheckCircle } from 'lucide-react';
import { api } from '../../lib/apiClient';

export default function CourseCard({ course, role, onEnrollSuccess }) {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [localEnrolled, setLocalEnrolled] = useState(false);

  const isEnrolled = course.is_enrolled || localEnrolled;

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PUBLISHED: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-red-100 text-red-800'
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (isEnrolling || isEnrolled) return;
    
    setIsEnrolling(true);
    try {
      await api.post(`/courses/${course.id}/enroll`);
      setLocalEnrolled(true);
      if (onEnrollSuccess) onEnrollSuccess(course.id);
    } catch (err) {
      if (err.status === 409 || err.code === 'ALREADY_ENROLLED') {
        setLocalEnrolled(true);
      } else {
        alert(err.message);
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const CardContent = () => (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {course.category}
          </span>
          {role === 'INSTRUCTOR' && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[course.status]}`}>
              {course.status}
            </span>
          )}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
        <p className="text-gray-500 text-sm mb-4 flex-1 line-clamp-3">{course.description || 'No description provided.'}</p>
        
        <div className="mt-auto space-y-2 pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span>Created {new Date(course.createdAt).toLocaleDateString()}</span>
          </div>
          {(role === 'INSTRUCTOR' || course.enrollmentCount > 0) && (
            <div className="flex items-center text-sm text-gray-500">
              <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
              <span>{course.enrollmentCount} learner{course.enrollmentCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
      
      {role === 'LEARNER' && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          {isEnrolled ? (
            <button
              disabled
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 cursor-default"
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Enrolled / Continue
            </button>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={isEnrolling}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (role === 'INSTRUCTOR') {
    return (
      <Link to={`/courses/${course.id}`} className="block h-full">
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
}
