import { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import ConfirmationModal from '../ConfirmationModal';
import QuizQuestionForm from './QuizQuestionForm';

export default function QuizList({ courseId }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  
  const [expandedQuizId, setExpandedQuizId] = useState(null);
  const [quizData, setQuizData] = useState(null);
  
  const [questionForm, setQuestionForm] = useState({ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A' });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  const fetchQuizzes = async () => {
    try {
      const data = await api.get(`/courses/${courseId}/quizzes`);
      setQuizzes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, [courseId]);

  const handleAddQuiz = async (e) => {
    e.preventDefault();
    if (!addTitle.trim()) return;
    try {
      await api.post(`/courses/${courseId}/quizzes`, { title: addTitle });
      setAddTitle('');
      setIsAdding(false);
      fetchQuizzes();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteQuiz = async () => {
    try {
      await api.delete(`/quizzes/${quizToDelete.id}`);
      setQuizToDelete(null);
      if (expandedQuizId === quizToDelete.id) setExpandedQuizId(null);
      fetchQuizzes();
    } catch (err) { alert(err.message); }
  };

  const loadQuizQuestions = async (quizId) => {
    if (expandedQuizId === quizId) {
      setExpandedQuizId(null);
      return;
    }
    try {
      const data = await api.get(`/quizzes/${quizId}`);
      setQuizData(data);
      setExpandedQuizId(quizId);
    } catch (err) { alert(err.message); }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/quizzes/${expandedQuizId}/questions`, questionForm);
      setIsAddingQuestion(false);
      setQuestionForm({ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A' });
      loadQuizQuestions(expandedQuizId);
    } catch (err) { alert(err.message); }
  };

  const handleDeleteQuestion = async () => {
    try {
      await api.delete(`/quizzes/questions/${questionToDelete.id}`);
      setQuestionToDelete(null);
      loadQuizQuestions(expandedQuizId);
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div>Loading quizzes...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <ConfirmationModal isOpen={!!quizToDelete} title="Delete Quiz" message="Are you sure?" onConfirm={handleDeleteQuiz} onCancel={() => setQuizToDelete(null)} isDestructive />
      <ConfirmationModal isOpen={!!questionToDelete} title="Delete Question" message="Are you sure?" onConfirm={handleDeleteQuestion} onCancel={() => setQuestionToDelete(null)} isDestructive />

      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Quizzes</h3>
        <button onClick={() => setIsAdding(!isAdding)} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700">Add Quiz</button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddQuiz} className="p-6 border-b border-gray-200 bg-gray-50">
          <input required type="text" placeholder="Quiz Title" value={addTitle} onChange={e => setAddTitle(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mb-3" />
          <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium">Save Quiz</button>
        </form>
      )}

      <ul className="divide-y divide-gray-200">
        {quizzes.length === 0 ? <li className="p-6 text-center text-gray-500">No quizzes yet.</li> : quizzes.map((q) => (
          <li key={q.id} className="flex flex-col">
            <div className="p-6 flex items-center justify-between hover:bg-gray-50">
              <span className="font-medium">{q.title}</span>
              <div className="flex gap-2">
                <button onClick={() => loadQuizQuestions(q.id)} className="p-1.5 text-gray-500 hover:text-indigo-600 bg-white border border-gray-300 rounded shadow-sm">{expandedQuizId === q.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                <button onClick={() => setQuizToDelete(q)} className="p-1.5 text-red-500 hover:text-red-700 bg-white border border-gray-300 rounded shadow-sm"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {expandedQuizId === q.id && quizData && (
              <div className="bg-gray-50 p-6 border-t border-gray-200 pl-12">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Questions ({quizData.questions?.length || 0})</h4>
                  <button onClick={() => setIsAddingQuestion(!isAddingQuestion)} className="text-sm text-indigo-600">Add Question</button>
                </div>

                {isAddingQuestion && (
                  <QuizQuestionForm form={questionForm} setForm={setQuestionForm} onSubmit={handleAddQuestion} onCancel={() => setIsAddingQuestion(false)} />
                )}

                <div className="space-y-4">
                  {quizData.questions?.map((question, idx) => (
                    <div key={question.id} className="bg-white p-4 border rounded shadow-sm relative">
                      <button onClick={() => setQuestionToDelete(question)} className="absolute top-4 right-4 text-red-500"><Trash2 className="w-4 h-4" /></button>
                      <p className="font-medium mb-2">{idx + 1}. {question.question}</p>
                      <ul className="text-sm space-y-1 text-gray-600">
                        {['A','B','C','D'].map(opt => (
                          <li key={opt} className={question.correctOption === opt ? 'font-bold text-green-600' : ''}>
                            {opt}: {question[`option${opt}`]} {question.correctOption === opt && '(Correct)'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
