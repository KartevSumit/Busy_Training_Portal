import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';

export default function LessonDiscussion({ lessonId, courseId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let isMounted = true;
    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/lessons/${lessonId}/comments`);
        if (isMounted) setComments(res);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchComments();
    return () => { isMounted = false; };
  }, [lessonId, expanded]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/courses/${courseId}/comments`, { text, lessonId });
      setComments(prev => [...prev, res.comment]);
      setText('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        {expanded ? 'Hide Discussion' : 'Show Discussion'}
      </button>
      
      {expanded && (
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading comments...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <>
              {comments.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No comments yet. Be the first to start the discussion!</div>
              ) : (
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                      <div className="font-semibold text-gray-900 mb-1">{c.author?.email}</div>
                      <div className="text-gray-700 whitespace-pre-wrap">{c.text}</div>
                    </div>
                  ))}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                <input 
                  type="text" 
                  value={text} 
                  onChange={e => setText(e.target.value)} 
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button 
                  type="submit" 
                  disabled={submitting || !text.trim()} 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Post
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
