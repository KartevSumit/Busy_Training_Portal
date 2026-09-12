import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '../lib/apiClient';
import PasswordInput from '../components/PasswordInput';

const AdminDashboard = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProvision = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/auth/provision-instructor', { email, password });
      setMessage(`Instructor ${email} provisioned successfully!`);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-xl divide-y divide-gray-200 max-w-lg mx-auto mt-8">
      <div className="px-4 py-5 sm:px-6 flex items-center bg-gray-50/50">
        <UserPlus className="h-5 w-5 text-indigo-500 mr-2" />
        <h3 className="text-lg leading-6 font-semibold text-gray-900">Provision Instructor</h3>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <form onSubmit={handleProvision} className="space-y-4">
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              type="email"
              required
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
              placeholder="instructor@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <PasswordInput
              required
              disabled={isSubmitting}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Provisioning...' : 'Create Instructor'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
