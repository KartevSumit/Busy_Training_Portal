import { useState } from 'react';
import { api } from '../lib/apiClient';

export default function LearnerQuiz({ activeQuiz, onBack }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submitQuiz = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/quizzes/${activeQuiz.id}/submit`, { answers });
      setResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h4 className="text-xl font-bold mb-4">{activeQuiz.title}</h4>
      {result ? (
        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200">
          <div className="text-3xl font-bold text-green-700 mb-2">
            {result.score} / {result.total}
          </div>
          <p className="text-green-800">Quiz completed successfully!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeQuiz.questions?.length === 0 ? (
            <p className="text-gray-500">No questions available.</p>
          ) : (
            activeQuiz.questions?.map((q, idx) => (
              <div key={q.id} className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900 mb-3">{idx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <label key={opt} className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`question-${q.id}`}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers({...answers, [q.id]: opt})}
                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-gray-700">{q[`option${opt}`]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
          {activeQuiz.questions?.length > 0 && (
            <div className="flex justify-end">
              <button 
                onClick={submitQuiz}
                disabled={submitting || Object.keys(answers).length !== activeQuiz.questions.length}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Answers'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
