import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import CourseCard from '../components/Catalog/CourseCard';
import CatalogFilters from '../components/Catalog/CatalogFilters';
import Pagination from '../components/Catalog/Pagination';

export default function Catalog() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
    instructor: searchParams.get('instructor') || '',
    sort: searchParams.get('sort') || 'title',
  });

  const [categories, setCategories] = useState([]);
  const [instructors, setInstructors] = useState([]);

  useEffect(() => {
    api.get('/courses/categories')
      .then(data => setCategories(data.categories || []))
      .catch(err => console.error('Failed to load categories', err));

    if (user?.role === 'INSTRUCTOR') {
      api.get('/courses/instructors')
        .then(data => setInstructors(data.instructors || []))
        .catch(err => console.error('Failed to load instructors', err));
    }
  }, [user?.role]);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();

      if (searchParams.get('q')) query.append('q', searchParams.get('q'));
      if (searchParams.get('category')) query.append('category', searchParams.get('category'));

      if (user?.role === 'INSTRUCTOR') {
        if (searchParams.get('status')) query.append('status', searchParams.get('status'));
        if (searchParams.get('instructor')) query.append('instructor', searchParams.get('instructor'));
      }

      if (searchParams.get('sort')) query.append('sort', searchParams.get('sort'));

      query.append('page', searchParams.get('page') || '1');
      query.append('pageSize', '9');

      const data = await api.get(`/courses?${query.toString()}`);
      setCourses(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [searchParams, user?.role]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const applyFiltersToUrl = () => {
    const newParams = new URLSearchParams(searchParams);

    if (filters.q) newParams.set('q', filters.q);
    else newParams.delete('q');

    if (filters.category) newParams.set('category', filters.category);
    else newParams.delete('category');

    if (user?.role === 'INSTRUCTOR') {
      if (filters.status) newParams.set('status', filters.status);
      else newParams.delete('status');

      if (filters.instructor) newParams.set('instructor', filters.instructor);
      else newParams.delete('instructor');
    }

    if (filters.sort !== 'title') newParams.set('sort', filters.sort);
    else newParams.delete('sort');

    newParams.set('page', '1');

    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  const handleEnrollSuccess = (courseId) => {
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Course Catalog</h1>
        <p className="mt-2 text-gray-600">
          {user?.role === 'INSTRUCTOR'
            ? 'Manage all courses, including drafts and archived content.'
            : 'Explore and enroll in our available published courses.'}
        </p>
      </div>

      <CatalogFilters
        role={user?.role}
        filters={filters}
        categories={categories}
        instructors={instructors}
        onFilterChange={handleFilterChange}
        onSearchSubmit={applyFiltersToUrl}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchCatalog} className="text-sm font-medium underline">Try Again</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse"></div>
          ))}
        </div>
      ) : !error && courses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
          <h2 className="text-lg font-medium text-gray-900 mb-1">No courses found</h2>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          <button
            onClick={() => {
              setFilters({ q: '', category: '', status: '', sort: 'title' });
              setSearchParams({});
            }}
            className="mt-4 text-indigo-600 font-medium hover:text-indigo-800"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                role={user?.role}
                userId={user?.id}
                onEnrollSuccess={handleEnrollSuccess}
              />
            ))}
          </div>

          <div className="mt-auto pt-8">
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
