import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import LearnerQuiz from './LearnerQuiz';

export default function LearnerQuizList({ courseId, isEnrolled }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeQuiz, setActiveQuiz] = useState(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await api.get(`/courses/${courseId}/quizzes`);
        setQuizzes(res);
      } catch (err) {
        if (err.status !== 403) setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (isEnrolled) {
      fetchQuizzes();
    } else {
      setLoading(false);
    }
  }, [courseId, isEnrolled]);

  const loadQuiz = async (quizId) => {
    try {
      const res = await api.get(`/quizzes/${quizId}`);
      setActiveQuiz(res);
    } catch (err) {
      alert(err.message);
    }
  };

  if (!isEnrolled || loading) return null;
  if (quizzes.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Quizzes</h3>
        {activeQuiz && (
          <button onClick={() => setActiveQuiz(null)} className="text-sm text-indigo-600 hover:text-indigo-800">
            Back to Quiz List
          </button>
        )}
      </div>
      
      {!activeQuiz ? (
        <ul className="divide-y divide-gray-200">
          {quizzes.map(q => (
            <li key={q.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <span className="font-medium text-gray-900">{q.title}</span>
              <button 
                onClick={() => loadQuiz(q.id)}
                className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-50"
              >
                Start Quiz
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <LearnerQuiz activeQuiz={activeQuiz} onBack={() => setActiveQuiz(null)} />
      )}
    </div>
  );
}
