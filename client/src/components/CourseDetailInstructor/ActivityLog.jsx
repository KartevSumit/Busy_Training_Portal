import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient';

export default function ActivityLog({ courseId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState(null);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await api.get(`/courses/${courseId}/activity`);
      setActivities(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentLoading(true);
    setCommentError(null);
    try {
      await api.post(`/courses/${courseId}/comments`, { text: commentText });
      setCommentText('');
      await fetchActivity();
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const renderActionText = (activity) => {
    switch (activity.actionType) {
      case 'COURSE_CREATED': return 'Created the course';
      case 'COURSE_UPDATED': return 'Updated course details';
      case 'COURSE_PUBLISHED': return 'Published the course';
      case 'COURSE_ARCHIVED': return 'Archived the course';
      case 'COURSE_RESTORED': return 'Restored the course';
      case 'COMMENT_ADDED': return activity.detail?.text || 'Added a comment';
      default: return activity.actionType;
    }
  };

  if (loading) {
    return <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-64 animate-pulse"></div>;
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-red-600">
        Error loading activity log: {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full max-h-[800px]">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Activity Log</h2>
      </div>
      
      <div className="p-4 overflow-y-auto flex-1 space-y-6 bg-gray-50">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-4">No activity yet.</p>
        ) : (
          activities.map(act => (
            <div key={act.id} className="relative pl-4 border-l-2 border-indigo-200">
              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-500"></div>
              <div className="text-sm text-gray-900 font-medium">
                {act.actor?.email} <span className="text-gray-500 font-normal text-xs ml-1">({act.actor?.role})</span>
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {renderActionText(act)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(act.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
        <form onSubmit={handleAddComment} className="flex flex-col gap-2">
          <textarea
            rows={2}
            required
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          ></textarea>
          {commentError && <div className="text-red-600 text-sm">{commentError}</div>}
          <button
            type="submit"
            disabled={commentLoading}
            className="self-end px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {commentLoading ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      </div>
    </div>
  );
}
