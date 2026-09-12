import { useAuth } from '../contexts/AuthContext';
import CourseDetailInstructor from './CourseDetailInstructor';

const PlaceholderLearner = () => (
  <div className="bg-white shadow rounded-lg p-6 text-center mt-8 max-w-2xl mx-auto">
    <h2 className="text-2xl font-bold text-gray-800">Learner Course Detail</h2>
    <p className="mt-2 text-gray-500">This feature will be implemented in a future task (U4).</p>
  </div>
);

export default function CourseDetail() {
  const { user } = useAuth();

  if (user?.role === 'INSTRUCTOR') {
    return <CourseDetailInstructor />;
  }

  return <PlaceholderLearner />;
}
