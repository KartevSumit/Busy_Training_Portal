import { useState } from 'react';
import { api } from '../../lib/apiClient';

export default function BulkEnrollment({ courseId }) {
  const [emailsRaw, setEmailsRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const emails = emailsRaw
      .split('\n')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emails.length === 0) {
      setError('Please provide at least one email address.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.post(`/courses/${courseId}/enroll-bulk`, { emails });
      setResults(data.results);
      setEmailsRaw('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getOutcomeStyle = (outcome) => {
    switch (outcome) {
      case 'enrolled':
        return 'bg-green-100 text-green-800';
      case 'already_enrolled':
        return 'bg-yellow-100 text-yellow-800';
      case 'unknown':
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getOutcomeText = (outcome) => {
    switch (outcome) {
      case 'enrolled': return 'Enrolled';
      case 'already_enrolled': return 'Already Enrolled';
      case 'unknown': return 'Unknown Learner';
      default: return outcome;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Bulk Enrollment</h2>
      <p className="text-sm text-gray-500 mb-4">
        Enter one learner email address per line. Only registered learners can be enrolled.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          rows={5}
          value={emailsRaw}
          onChange={e => setEmailsRaw(e.target.value)}
          placeholder="learner1@example.com&#10;learner2@example.com"
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
        ></textarea>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Enroll Learners'}
        </button>
      </form>

      {results && results.length > 0 && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Enrollment Results</h3>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Email</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {results.map((result, idx) => (
                  <tr key={idx}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {result.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOutcomeStyle(result.outcome)}`}>
                        {getOutcomeText(result.outcome)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
