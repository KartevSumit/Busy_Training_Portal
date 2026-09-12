import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { ArrowLeft, CheckCircle, Clock, BookOpen, AlertTriangle } from 'lucide-react';

const EnrollmentStatusBadge = ({ status }) => {
  const styles = {
    NOT_STARTED: 'bg-gray-100 text-gray-800 border-gray-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200'
  };
  const labels = { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' };
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

const CourseStatusBadge = ({ status }) => {
  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PUBLISHED: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-red-100 text-red-800'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
};

export default function CourseDetailLearner() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [lessons, setLessons] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  const fetchCourseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.course);
      setEnrollment(res.enrollment || null);
      
      if (res.enrollment) {
        const lessonsRes = await api.get(`/courses/${id}/lessons`);
        setLessons(lessonsRes.lessons || []);
      }
    } catch (err) {
      if (err.status === 404) {
        setError('Course not found or unavailable.');
      } else {
        setError(err.message || 'Failed to load course details.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  const handleEnroll = async () => {
    if (enrolling) return;
    setEnrolling(true);
    try {
      const res = await api.post(`/courses/${id}/enroll`);
      setEnrollment(res.enrollment);
      const lessonsRes = await api.get(`/courses/${id}/lessons`);
      setLessons(lessonsRes.lessons || []);
    } catch (err) {
      if (err.status === 409 || err.code === 'ALREADY_ENROLLED') {
        fetchCourseData();
      } else {
        alert(err.message);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleCompleteLesson = async (lessonId) => {
    if (completingId) return;
    setCompletingId(lessonId);
    try {
      const res = await api.post(`/lessons/${lessonId}/complete`);
      setEnrollment(res.enrollment);
      setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, isCompleted: true } : l));
    } catch (err) {
      alert(err.message);
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto mt-8 p-6 animate-pulse bg-white rounded-xl shadow-sm h-64 border border-gray-200"></div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-red-50 rounded-xl border border-red-100">
        <h3 className="text-lg font-medium text-red-800 mb-2 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" /> Error
        </h3>
        <p className="text-red-700 mb-4">{error}</p>
        <div className="space-x-4">
          <button onClick={fetchCourseData} className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition">Retry</button>
          <Link to="/catalog" className="text-red-800 underline hover:text-red-900">Back to Catalog</Link>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const completedCount = lessons.filter(l => l.isCompleted).length;
  const totalCount = lessons.length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <Link to="/catalog" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2 transition-colors">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Catalog
      </Link>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {course.category}
                </span>
                <CourseStatusBadge status={course.status} />
                {enrollment && <EnrollmentStatusBadge status={enrollment.status} />}
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            </div>
            
            {!enrollment && course.status === 'PUBLISHED' && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {enrolling ? 'Enrolling...' : 'Enroll Now'}
              </button>
            )}
          </div>
          
          <div className="prose max-w-none text-gray-600">
            {course.description ? <p>{course.description}</p> : <p className="italic text-gray-400">No description provided.</p>}
          </div>
          
          {!enrollment && course.status !== 'PUBLISHED' && (
            <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm border border-yellow-200">
              This course is currently unavailable for new enrollments.
            </div>
          )}
        </div>
      </div>

      {enrollment && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Your Progress</h2>
              <p className="text-sm text-gray-500">
                {completedCount} of {totalCount} lessons complete
              </p>
            </div>
            <div className="w-full sm:w-1/2 bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">Course Lessons</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {lessons.length === 0 ? (
                <li className="p-6 text-center text-gray-500">No lessons available yet.</li>
              ) : (
                lessons.map((lesson, index) => (
                  <li key={lesson.id} className="p-6 flex flex-col sm:flex-row gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {lesson.isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-lg font-medium ${lesson.isCompleted ? 'text-gray-900' : 'text-gray-900'}`}>{lesson.title}</h4>
                      <p className="mt-1 text-sm text-gray-600">{lesson.content}</p>
                    </div>
                    <div className="flex-shrink-0 mt-4 sm:mt-0 self-start sm:self-center">
                      {lesson.isCompleted ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                          Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCompleteLesson(lesson.id)}
                          disabled={completingId === lesson.id}
                          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          {completingId === lesson.id ? 'Saving...' : 'Mark Complete'}
                        </button>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
