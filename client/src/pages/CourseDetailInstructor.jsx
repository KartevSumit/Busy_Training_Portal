import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, downloadCsv } from '../lib/apiClient';

import CourseHeader from '../components/CourseDetailInstructor/CourseHeader';
import LessonList from '../components/CourseDetailInstructor/LessonList';
import BulkEnrollment from '../components/CourseDetailInstructor/BulkEnrollment';
import ActivityLog from '../components/CourseDetailInstructor/ActivityLog';

export default function CourseDetailInstructor() {
  const { id } = useParams();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourse = async () => {
    try {
      const data = await api.get(`/courses/${id}`);
      if (data.course.instructorId !== user.id) {
        setError('This is not your course.');
        return;
      }
      setCourse(data.course);
    } catch (err) {
      if (err.status === 403) {
        setError('This is not your course.');
      } else {
        setError(err.message || 'Failed to load course details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [id, user.id]);

  const handleExportCsv = async () => {
    try {
      await downloadCsv(`/courses/${id}/progress-export.csv`);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto mt-8 p-6 animate-pulse bg-white rounded-xl shadow-sm h-64 border border-gray-200"></div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-red-50 text-red-700 rounded-xl shadow-sm border border-red-200">
        <h2 className="text-xl font-bold">Unauthorized / Error</h2>
        <p className="mt-2">{error}</p>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <CourseHeader course={course} onCourseUpdated={setCourse} />

      <div className="flex justify-end">
        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition shadow-sm"
        >
          Export Progress CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <LessonList courseId={course.id} />
          <BulkEnrollment courseId={course.id} />
        </div>

        <div className="lg:col-span-1">
          <ActivityLog courseId={course.id} />
        </div>
      </div>
    </div>
  );
}
