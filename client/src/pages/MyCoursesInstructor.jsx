import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import CourseCard from '../components/Catalog/CourseCard';
import Pagination from '../components/Catalog/Pagination';

export default function MyCoursesInstructor() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, pageSize: 20 });
  const [sort, setSort] = useState('created_at');

  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', category: '' });
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  const fetchMyCourses = useCallback(async (currentPage, currentSort) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        instructor: user.id,
        page: currentPage.toString(),
        pageSize: '20',
        sort: currentSort
      });
      const res = await api.get(`/courses?${query.toString()}`);
      setCourses(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load your courses');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchMyCourses(page, sort);
  }, [fetchMyCourses, page, sort]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      await api.post('/courses', createForm);
      setCreateForm({ title: '', description: '', category: '' });
      setIsCreating(false);
      
      if (page !== 1 || sort !== 'created_at') {
        setSort('created_at');
        setPage(1);
      } else {
        await fetchMyCourses(1, 'created_at');
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="mt-1 text-sm text-gray-500">Courses you manage</p>
        </div>
        <div className="flex gap-4 items-center">
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="created_at">Newest First</option>
            <option value="title">Alphabetical (A-Z)</option>
            <option value="enrollment_count">Most Learners</option>
          </select>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {isCreating ? 'Cancel' : '+ New Course'}
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Course</h2>
          <form onSubmit={handleCreateSubmit} className="max-w-2xl space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                value={createForm.title}
                onChange={e => setCreateForm({...createForm, title: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input
                type="text"
                required
                value={createForm.category}
                onChange={e => setCreateForm({...createForm, category: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                value={createForm.description}
                onChange={e => setCreateForm({...createForm, description: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {createLoading ? 'Creating...' : 'Create Course'}
            </button>
          </form>
        </div>
      )}

      {error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading courses</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <button 
                onClick={() => fetchMyCourses(page, sort)}
                className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : loading && courses.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first course.</p>
          <div className="mt-6">
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              + New Course
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(course => (
              <CourseCard key={course.id} course={course} role="INSTRUCTOR" />
            ))}
          </div>
          
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
