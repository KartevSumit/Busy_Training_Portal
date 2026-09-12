import { useState } from 'react';
import { api } from '../../lib/apiClient';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-red-100 text-red-800'
};

export default function CourseHeader({ course, onCourseUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: course.title,
    description: course.description || '',
    category: course.category,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transitionError, setTransitionError] = useState(null);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.patch(`/courses/${course.id}`, editForm);
      onCourseUpdated(data.course);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (action) => {
    setTransitionError(null);
    setLoading(true);
    try {
      const data = await api.post(`/courses/${course.id}/${action}`);
      onCourseUpdated(data.course);
    } catch (err) {
      setTransitionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTransitionButtons = () => {
    if (course.status === 'DRAFT') {
      return (
        <button onClick={() => handleTransition('publish')} disabled={loading} className="px-3 py-1.5 border border-transparent text-sm font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
          Publish
        </button>
      );
    }
    if (course.status === 'PUBLISHED') {
      return (
        <button onClick={() => handleTransition('archive')} disabled={loading} className="px-3 py-1.5 border border-transparent text-sm font-medium rounded text-red-700 bg-red-100 hover:bg-red-200">
          Archive
        </button>
      );
    }
    if (course.status === 'ARCHIVED') {
      return (
        <button onClick={() => handleTransition('restore')} disabled={loading} className="px-3 py-1.5 border border-transparent text-sm font-medium rounded text-green-700 bg-green-100 hover:bg-green-200">
          Restore
        </button>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[course.status]}`}>
            {course.status}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {course.category}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {renderTransitionButtons()}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              Edit Course
            </button>
          )}
        </div>
      </div>

      {transitionError && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {transitionError}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              required
              value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              required
              value={editForm.category}
              onChange={e => setEditForm({ ...editForm, category: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setIsEditing(false);
                setEditForm({
                  title: course.title,
                  description: course.description || '',
                  category: course.category
                });
                setError(null);
              }}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
          <p className="text-gray-600">{course.description || 'No description provided.'}</p>
        </div>
      )}
    </div>
  );
}
