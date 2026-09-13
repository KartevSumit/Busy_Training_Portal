import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient';
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Edit2, Trash2 } from 'lucide-react';
import ConfirmationModal from '../ConfirmationModal';

export default function LessonList({ courseId }) {
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedId, setExpandedId] = useState(null);

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', content: '' });
  const [addError, setAddError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [editError, setEditError] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchLessons = useCallback(async () => {
    try {
      const data = await api.get(`/courses/${courseId}/lessons`);
      setLessons(data.lessons);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleReorder = async (lessonId, currentPosition, direction) => {
    if (actionLoading) return;
    const newPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1;
    setActionLoading(true);
    try {
      await api.patch(`/lessons/${lessonId}/reorder`, { newPosition });
      await fetchLessons();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (lesson) => {
    setLessonToDelete(lesson);
  };

  const confirmDelete = async () => {
    if (!lessonToDelete) return;
    setActionLoading(true);
    try {
      await api.delete(`/lessons/${lessonToDelete.id}`);
      await fetchLessons();
      setLessonToDelete(null);
    } catch (err) {
      alert(err.message);
      setLessonToDelete(null);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelDelete = () => {
    setLessonToDelete(null);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setAddError(null);
    try {
      await api.post(`/courses/${courseId}/lessons`, addForm);
      setAddForm({ title: '', content: '' });
      setIsAdding(false);
      await fetchLessons();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e, lessonId) => {
    e.preventDefault();
    setActionLoading(true);
    setEditError(null);
    try {
      await api.patch(`/lessons/${lessonId}`, editForm);
      setEditingId(null);
      await fetchLessons();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (lesson) => {
    setEditingId(lesson.id);
    setEditForm({ title: lesson.title, content: lesson.content });
    setExpandedId(lesson.id);
  };

  if (loading) {
    return <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-32 animate-pulse"></div>;
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-red-600">
        Error loading lessons: {error}
      </div>
    );
  }

  return (
    <>
      <ConfirmationModal
        isOpen={!!lessonToDelete}
        title="Delete Lesson"
        message={lessonToDelete ? `Are you sure you want to delete "${lessonToDelete.title}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Lessons</h2>

      <div className="space-y-4">
        {lessons.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No lessons yet.</p>
        ) : (
          lessons.map((lesson, index) => {
            const isFirst = index === 0;
            const isLast = index === lessons.length - 1;
            const isExpanded = expandedId === lesson.id;
            const isEditingThis = editingId === lesson.id;

            return (
              <div key={lesson.id} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-gray-400 font-mono text-sm w-6">{index + 1}.</span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : lesson.id)}
                      className="font-medium text-gray-900 flex-1 text-left flex items-center gap-2 hover:text-indigo-600"
                    >
                      {lesson.title}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleReorder(lesson.id, lesson.position, 'up')}
                      disabled={isFirst || actionLoading}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(lesson.id, lesson.position, 'down')}
                      disabled={isLast || actionLoading}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                    <button
                      onClick={() => startEdit(lesson)}
                      disabled={actionLoading}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(lesson)}
                      disabled={actionLoading}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-gray-50">
                    {isEditingThis ? (
                      <form onSubmit={(e) => handleEditSubmit(e, lesson.id)} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            required
                            value={editForm.title}
                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Content</label>
                          <textarea
                            required
                            rows={4}
                            value={editForm.content}
                            onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm sm:text-sm"
                          />
                        </div>
                        {editError && <div className="text-red-600 text-sm">{editError}</div>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={actionLoading} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded">Save</button>
                          <button type="button" disabled={actionLoading} onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="prose prose-sm max-w-none text-gray-700">
                        {lesson.content.split('\n').map((para, i) => <p key={i}>{para}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-gray-400 hover:text-gray-700"
          >
            + Add New Lesson
          </button>
        ) : (
          <form onSubmit={handleAddSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Add New Lesson</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                value={addForm.title}
                onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Content</label>
              <textarea
                required
                rows={4}
                value={addForm.content}
                onChange={e => setAddForm({ ...addForm, content: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm sm:text-sm"
              />
            </div>
            {addError && <div className="text-red-600 text-sm">{addError}</div>}
            <div className="flex gap-2">
              <button type="submit" disabled={actionLoading} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded font-medium">Add Lesson</button>
              <button type="button" disabled={actionLoading} onClick={() => { setIsAdding(false); setAddError(null); }} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded font-medium">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
    </>
  );
}
