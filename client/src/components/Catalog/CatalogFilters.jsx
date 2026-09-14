import { Search } from 'lucide-react';

export default function CatalogFilters({
  role,
  filters,
  categories = [],
  instructors = [],
  onFilterChange,
  onSearchSubmit
}) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit();
    }
  };

  const handleClearSearch = () => {
    onFilterChange({ q: '' });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">

      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          name="q"
          value={filters.q}
          onChange={handleInputChange}
          onKeyDown={handleSearchKey}
          placeholder="Search courses..."
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {filters.q && (
          <button
            type="button"
            onClick={() => {
              handleClearSearch();
              setTimeout(() => onSearchSubmit(), 0);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        )}
      </div>

      <div className="sm:w-auto">
        <button
          type="button"
          onClick={onSearchSubmit}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition"
        >
          Search
        </button>
      </div>

      <div className="sm:w-48">
        <select aria-label="Category"
          name="category"
          value={filters.category}
          onChange={(e) => {
            handleInputChange(e);
            setTimeout(() => onSearchSubmit(), 0);
          }}
          className="mt-1 sm:mt-0 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {role === 'INSTRUCTOR' && (
        <>
          <div className="sm:w-40">
            <select aria-label="Status"
              name="status"
              value={filters.status}
              onChange={(e) => {
                handleInputChange(e);
                setTimeout(() => onSearchSubmit(), 0);
              }}
              className="mt-1 sm:mt-0 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="sm:w-48">
            <select aria-label="Instructor"
              name="instructor"
              value={filters.instructor || ''}
              onChange={(e) => {
                handleInputChange(e);
                setTimeout(() => onSearchSubmit(), 0);
              }}
              className="mt-1 sm:mt-0 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Instructors</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.email}</option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="sm:w-48">
        <select aria-label="Sort"
          name="sort"
          value={filters.sort}
          onChange={(e) => {
            handleInputChange(e);
            setTimeout(() => onSearchSubmit(), 0);
          }}
          className="mt-1 sm:mt-0 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="title">Sort by Title (A-Z)</option>
          <option value="created_at">Sort by Date (Newest)</option>
          <option value="enrollment_count">Sort by Popularity</option>
        </select>
      </div>

    </div>
  );
}
