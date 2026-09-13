import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Bell, UserX, Check } from 'lucide-react';

export default function InstructorAlerts() {
  const { setAlertCount } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissing, setDismissing] = useState({});

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDismiss = async (courseId, learnerId) => {
    const key = `${courseId}-${learnerId}`;
    if (dismissing[key]) return;
    
    setDismissing(prev => ({ ...prev, [key]: true }));
    try {
      await api.post(`/courses/${courseId}/alerts/${learnerId}/dismiss`);
      setAlerts(prev => prev.filter(a => !(a.courseId === courseId && a.learnerId === learnerId)));
      setAlertCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      alert(err.message || 'Failed to dismiss alert.');
      setDismissing(prev => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="w-full animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
        {[1,2,3].map(i => <div key={i} className="bg-gray-100 h-24 rounded-lg"></div>)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-50 p-4 rounded-md border border-red-100">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading alerts</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <button onClick={fetchAlerts} className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline">
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 space-y-8 w-full">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inactivity Alerts</h1>
        <p className="mt-1 text-sm text-gray-500">Review learners who have been inactive for more than 14 days.</p>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Bell className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No inactive learners right now</h3>
          <p className="mt-1 text-sm text-gray-500">All your learners are currently active or completed their courses.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {alerts.map((alert) => {
              const key = `${alert.courseId}-${alert.learnerId}`;
              const isDismissing = dismissing[key];
              
              return (
                <li key={key} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <UserX className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{alert.learnerEmail}</h4>
                      <p className="text-sm text-gray-600">{alert.courseTitle}</p>
                      <div className="mt-2 flex items-center text-sm font-medium text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full inline-flex border border-red-100">
                        {alert.inactiveDays} days inactive
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 w-full sm:w-auto">
                    <button
                      onClick={() => handleDismiss(alert.courseId, alert.learnerId)}
                      disabled={isDismissing}
                      className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 transition-colors"
                    >
                      {isDismissing ? 'Dismissing...' : (
                        <>
                          <Check className="mr-2 h-4 w-4 text-gray-400" />
                          Dismiss
                        </>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
